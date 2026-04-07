import { existsSync, readFileSync } from "node:fs";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { createAdminClient } from "@/lib/supabase/admin";
import { createAllTools } from "@/lib/ai/tools";
import { getAllAgentTools } from "@/lib/ai/autonomous/agent-tools";
import { resolveAtlasOutputPath } from "@/lib/runtime-paths";
import type {
  ToolHealthRecord,
  ToolHealthStatus,
  ToolRegistrySummary,
  ToolSource,
  ToolSpec,
} from "@/lib/admin-copilot/types";

type ToolHealthStore = {
  verifiedAt?: string | null;
  tools: Record<string, ToolHealthRecord>;
};

type ToolHealthSnapshot = {
  tools: ToolSpec[];
  verifiedAt?: string | null;
};

type ToolHealthVerificationResult = {
  verifiedAt: string;
  tools: ToolHealthRecord[];
  summary: Pick<ToolRegistrySummary, "healthy" | "degraded" | "unhealthy" | "unknown" | "verifiedAt" | "selectable" | "pruned">;
};

function getToolHealthStorePath() {
  const customPath = process.env.ATLAS_TOOL_HEALTH_STORE_PATH?.trim();
  if (customPath) {
    return path.resolve(customPath);
  }

  return resolveAtlasOutputPath("tool-health", "registry-health.json");
}

async function ensureToolHealthStoreDirectory() {
  await mkdir(path.dirname(getToolHealthStorePath()), { recursive: true });
}

function readToolHealthStoreSync(): ToolHealthStore {
  const storePath = getToolHealthStorePath();
  if (!existsSync(storePath)) {
    return { tools: {} };
  }

  try {
    const raw = readFileSync(storePath, "utf8");
    if (!raw.trim()) {
      return { tools: {} };
    }
    const parsed = JSON.parse(raw) as Partial<ToolHealthStore>;
    return {
      verifiedAt: typeof parsed.verifiedAt === "string" ? parsed.verifiedAt : null,
      tools: parsed.tools && typeof parsed.tools === "object" ? parsed.tools : {},
    };
  } catch {
    return { tools: {} };
  }
}

async function writeToolHealthStore(store: ToolHealthStore) {
  await ensureToolHealthStoreDirectory();
  await writeFile(getToolHealthStorePath(), JSON.stringify(store, null, 2), "utf8");
}

function summarizeDefaultHealth(tool: ToolSpec) {
  if (!tool.enabled) {
    return "Tool devre dışı.";
  }

  if (tool.workerTarget === "browser_local") {
    return "Browser lane kayıtlı, doğrulama bekliyor.";
  }

  if (tool.approvalClass !== "read_only") {
    return "Mutating/operator tool; otomatik smoke-run bekleniyor.";
  }

  return "Read-only tool kayıtlı.";
}

export function getDefaultToolHealth(tool: ToolSpec): ToolHealthRecord {
  let status: ToolHealthStatus = "unknown";

  if (!tool.enabled) {
    status = "unhealthy";
  } else if (tool.approvalClass === "read_only") {
    status = tool.workerTarget === "browser_local" ? "degraded" : "healthy";
  }

  return {
    toolId: tool.id,
    status,
    summary: summarizeDefaultHealth(tool),
    checks: [
      `source:${tool.source}`,
      `worker:${tool.workerTarget}`,
      `approval:${tool.approvalClass}`,
    ],
    lastVerifiedAt: null,
  };
}

function applyHealthRecord(tool: ToolSpec, record: ToolHealthRecord | null | undefined) {
  const resolved = record ?? getDefaultToolHealth(tool);
  const selectability = getToolSelectability(tool, resolved);
  return {
    ...tool,
    healthStatus: resolved.status,
    healthSummary: resolved.summary,
    healthChecks: resolved.checks,
    lastVerifiedAt: resolved.lastVerifiedAt ?? null,
    selectable: selectability.selectable,
    selectabilityReason: selectability.reason,
  };
}

export function applyPersistedToolHealth(tools: ToolSpec[]): ToolHealthSnapshot {
  const store = readToolHealthStoreSync();
  return {
    verifiedAt: store.verifiedAt ?? null,
    tools: tools.map((tool) => applyHealthRecord(tool, store.tools[tool.id])),
  };
}

function getToolStatusCounts(tools: ToolSpec[]) {
  return tools.reduce(
    (counts, tool) => {
      counts[tool.healthStatus] += 1;
      return counts;
    },
    {
      healthy: 0,
      degraded: 0,
      unhealthy: 0,
      unknown: 0,
    } as Record<ToolHealthStatus, number>,
  );
}

function getToolSelectability(tool: Pick<ToolSpec, "enabled" | "approvalClass" | "workerTarget">, record: Pick<ToolHealthRecord, "status" | "summary">) {
  if (!tool.enabled) {
    return {
      selectable: false,
      reason: "Tool devre dışı.",
    };
  }

  if (record.status === "unhealthy") {
    return {
      selectable: false,
      reason: record.summary || "Runtime doğrulaması başarısız.",
    };
  }

  if (record.status === "unknown") {
    return {
      selectable: false,
      reason: "Tool doğrulaması eksik; prune edildi.",
    };
  }

  if (record.status === "degraded") {
    return {
      selectable: true,
      reason: tool.approvalClass === "read_only"
        ? "Degraded ama fallback ile kullanılabilir."
        : "Degraded ama approval/policy ile kullanılabilir.",
    };
  }

  return {
    selectable: true,
    reason: null,
  };
}

async function probeReadOnlyDatabase() {
  try {
    const supabase = createAdminClient();
    const { error } = await supabase.from("users").select("id").limit(1);
    return !error;
  } catch {
    return false;
  }
}

async function probePlaywright() {
  try {
    await import("@playwright/test");
    return true;
  } catch {
    return false;
  }
}

function buildVerificationRecord(input: {
  tool: ToolSpec;
  sdkToolNames: Set<string>;
  agentToolNames: Set<string>;
  databaseReadOk: boolean;
  playwrightAvailable: boolean;
}) {
  const { tool, sdkToolNames, agentToolNames, databaseReadOk, playwrightAvailable } = input;
  const checks: string[] = [
    `source:${tool.source}`,
    `worker:${tool.workerTarget}`,
    `approval:${tool.approvalClass}`,
  ];
  let status: ToolHealthStatus = tool.approvalClass === "read_only" ? "healthy" : "degraded";
  let summary = tool.approvalClass === "read_only"
    ? "Tool doğrulandı."
    : "Mutation/operator tool runtime'da mevcut; smoke-run güvenlik nedeniyle atlandı.";

  const toolExists = tool.source === "sdk"
    ? sdkToolNames.has(tool.name)
    : agentToolNames.has(tool.name);

  if (!tool.enabled) {
    status = "unhealthy";
    summary = "Tool devre dışı.";
    checks.push("enabled:false");
  } else if (!toolExists) {
    status = "unhealthy";
    summary = "Tool registry kaydında var ama runtime'da bulunamadı.";
    checks.push("runtime:missing");
  } else if (tool.workerTarget === "database") {
    if (databaseReadOk) {
      status = tool.approvalClass === "read_only" ? "healthy" : "degraded";
      summary = tool.approvalClass === "read_only"
        ? "Read-only Supabase smoke-run geçti."
        : "Database mutation tool kayıtlı; approval ile kullanılabilir.";
      checks.push("database:probe-ok");
    } else {
      status = "degraded";
      summary = tool.approvalClass === "read_only"
        ? "Runtime mevcut ama Supabase read probe başarısız."
        : "Mutation tool kayıtlı ama Supabase probe başarısız; fallback gerekebilir.";
      checks.push("database:probe-failed");
    }
  } else if (tool.workerTarget === "browser_local") {
    if (playwrightAvailable) {
      status = tool.approvalClass === "read_only" ? "healthy" : "degraded";
      summary = tool.approvalClass === "read_only"
        ? "Playwright browser lane kullanılabilir."
        : "Interactive browser lane kullanılabilir; operator onayı gerekir.";
      checks.push("browser:playwright-ok");
    } else {
      status = "unhealthy";
      summary = "Playwright bulunamadı; browser lane çalışamaz.";
      checks.push("browser:playwright-missing");
    }
  } else if (tool.workerTarget === "browser_remote") {
    if (typeof fetch === "function") {
      status = tool.approvalClass === "read_only" ? "healthy" : "degraded";
      summary = "Remote web lane kullanılabilir.";
      checks.push("browser:fetch-ok");
    } else {
      status = "degraded";
      summary = "Fetch kullanılamıyor; remote web lane riskli.";
      checks.push("browser:fetch-missing");
    }
  } else if (tool.approvalClass === "read_only") {
    status = "healthy";
    summary = tool.source === "agent"
      ? "Read-only agent tool doğrulandı."
      : "Read-only SDK tool doğrulandı.";
    checks.push("runtime:present");
  } else {
    status = "degraded";
    summary = "Mutation/operator tool kayıtlı; runtime mevcut, smoke-run atlandı.";
    checks.push("runtime:present");
  }

  return {
    toolId: tool.id,
    status,
    summary,
    checks,
    lastVerifiedAt: null,
  } satisfies ToolHealthRecord;
}

export async function verifyToolRegistryHealth(tools: ToolSpec[]): Promise<ToolHealthVerificationResult> {
  const verifiedAt = new Date().toISOString();
  const supabase = createAdminClient();
  const sdkToolNames = new Set(Object.keys(createAllTools(supabase)));
  const agentToolNames = new Set(getAllAgentTools().map((tool) => tool.name));
  const [databaseReadOk, playwrightAvailable] = await Promise.all([
    probeReadOnlyDatabase(),
    probePlaywright(),
  ]);

  const records = tools.map((tool) => {
    const record = buildVerificationRecord({
      tool,
      sdkToolNames,
      agentToolNames,
      databaseReadOk,
      playwrightAvailable,
    });
    return {
      ...record,
      lastVerifiedAt: verifiedAt,
    };
  });

  const store: ToolHealthStore = {
    verifiedAt,
    tools: Object.fromEntries(records.map((record) => [record.toolId, record])),
  };
  await writeToolHealthStore(store);

  const counts = records.reduce(
    (accumulator, record) => {
      accumulator[record.status] += 1;
      return accumulator;
    },
    {
      healthy: 0,
      degraded: 0,
      unhealthy: 0,
      unknown: 0,
    } as Record<ToolHealthStatus, number>,
  );

  return {
    verifiedAt,
    tools: records,
    summary: {
      ...counts,
      selectable: records.filter((record) => record.status === "healthy" || record.status === "degraded").length,
      pruned: records.length - records.filter((record) => record.status === "healthy" || record.status === "degraded").length,
      verifiedAt,
    },
  };
}

export function isToolSelectable(source: ToolSource, toolName: string) {
  const store = readToolHealthStoreSync();
  const toolId = `${source}:${toolName}`;
  const record = store.tools[toolId];
  if (!record) {
    return true;
  }

  return record.status === "healthy" || record.status === "degraded";
}

export function filterSelectableSdkTools<T>(tools: Record<string, T>) {
  return Object.fromEntries(
    Object.entries(tools).filter(([toolName]) => isToolSelectable("sdk", toolName)),
  ) as Record<string, T>;
}

export function filterSelectableAgentTools<T extends { name: string }>(tools: T[]) {
  return tools.filter((tool) => isToolSelectable("agent", tool.name));
}

export function enrichToolRegistrySummary(summary: Omit<ToolRegistrySummary, "healthy" | "degraded" | "unhealthy" | "unknown" | "verifiedAt">, tools: ToolSpec[], verifiedAt?: string | null): ToolRegistrySummary {
  const counts = getToolStatusCounts(tools);
  return {
    ...summary,
    selectable: tools.filter((tool) => tool.selectable).length,
    pruned: tools.filter((tool) => !tool.selectable).length,
    healthy: counts.healthy,
    degraded: counts.degraded,
    unhealthy: counts.unhealthy,
    unknown: counts.unknown,
    verifiedAt: verifiedAt ?? null,
  };
}
