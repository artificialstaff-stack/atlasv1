import { getModelRoutingInfo } from "@/lib/ai/client";
import { getCopilotProjects } from "@/lib/admin-copilot/projects";
import { getCopilotSkills } from "@/lib/admin-copilot/skills";
import { getCopilotDashboard, getCopilotRun, resolveCopilotApproval, submitCopilotCommand } from "@/lib/admin-copilot/service";
import type { ToolContextCookie } from "@/lib/ai/autonomous/react-engine";
import type {
  CopilotCommandResponse,
  CopilotMode,
  CopilotScope,
  ToolRegistrySummary,
  ToolSpec,
} from "@/lib/admin-copilot/types";
import { getUnifiedToolRegistry, getUnifiedToolRegistrySummary } from "./registry";
import { applyPersistedToolHealth, verifyToolRegistryHealth } from "./health";
import {
  UNIFIED_ORCHESTRATOR_ENGINE_ID,
  getLegacyFacadeDescriptor,
  type LegacyFacadeSource,
} from "./legacy-facade";

type LegacySource = LegacyFacadeSource;

type LegacySubmitInput = {
  source: LegacySource;
  requesterUserId: string;
  commandText: string;
  mode: CopilotMode;
  scope: CopilotScope;
  conversationScopeHint?: CopilotScope | null;
  conversationPreview?: string | null;
  projectId?: string | null;
  skillIds?: string[];
  requestId?: string | null;
  conversationId?: string | null;
  requestCookies?: ToolContextCookie[];
};

const REGISTRY_VERIFY_STALE_HOURS = 24;

function buildFallbackRegistrySnapshot() {
  const snapshot = applyPersistedToolHealth(getUnifiedToolRegistry());
  return {
    tools: snapshot.tools,
    summary: getUnifiedToolRegistrySummary(snapshot.tools),
  };
}

async function getSafeLegacyStatusData() {
  const dashboardPromise = getCopilotDashboard().catch((error) => {
    console.error("[atlas/orchestrator] legacy dashboard fallback", error);
    return {
      dashboard: {
        pendingApprovals: [],
        recentRuns: [],
      },
    };
  });

  const registryPromise = getUnifiedRegistrySnapshot().catch((error) => {
    console.error("[atlas/orchestrator] legacy registry fallback", error);
    return buildFallbackRegistrySnapshot();
  });

  const [{ dashboard }, registry] = await Promise.all([dashboardPromise, registryPromise]);
  return { dashboard, registry };
}

function chunkText(text: string, maxLength = 700) {
  if (!text) return [];
  const chunks: string[] = [];
  let cursor = 0;
  while (cursor < text.length) {
    chunks.push(text.slice(cursor, cursor + maxLength));
    cursor += maxLength;
  }
  return chunks;
}

function encodeSse(data: Record<string, unknown>) {
  return `data: ${JSON.stringify(data)}\n\n`;
}

function resolveLegacyMode(source: LegacySource, preferred?: string | null): CopilotMode {
  if (preferred === "chat" || preferred === "autonomous" || preferred === "agent") {
    return preferred;
  }
  if (source === "chat") return "chat";
  if (source === "autonomous" || source === "workflows") return "autonomous";
  return "agent";
}

function resolveLegacyCommandText(payload: Record<string, unknown>): string {
  if (typeof payload.commandText === "string" && payload.commandText.trim()) {
    return payload.commandText.trim();
  }
  if (typeof payload.input === "string" && payload.input.trim()) {
    return payload.input.trim();
  }
  if (typeof payload.description === "string" && payload.description.trim()) {
    return payload.description.trim();
  }
  if (Array.isArray(payload.messages)) {
    const lastUser = [...payload.messages]
      .reverse()
      .find((message) => message && typeof message === "object" && (message as { role?: string }).role === "user");
    const content = lastUser && typeof lastUser === "object" ? (lastUser as { content?: unknown }).content : null;
    if (typeof content === "string" && content.trim()) {
      return content.trim();
    }
  }
  return "";
}

function resolveLegacyScope(payload: Record<string, unknown>): CopilotScope {
  const providedScope = payload.scope;
  if (providedScope && typeof providedScope === "object") {
    const scopeCandidate = providedScope as CopilotScope;
    if (scopeCandidate.type) {
      return scopeCandidate;
    }
  }
  if (typeof payload.customerId === "string" && payload.customerId) {
    return { type: "customer", refId: payload.customerId, label: typeof payload.customerLabel === "string" ? payload.customerLabel : null };
  }
  if (typeof payload.companyId === "string" && payload.companyId) {
    return { type: "company", refId: payload.companyId, label: typeof payload.companyLabel === "string" ? payload.companyLabel : null };
  }
  if (typeof payload.marketplaceId === "string" && payload.marketplaceId) {
    return { type: "marketplace", refId: payload.marketplaceId, label: typeof payload.marketplaceLabel === "string" ? payload.marketplaceLabel : null };
  }
  return { type: "global" };
}

function resolveLegacyProjectId(payload: Record<string, unknown>) {
  return typeof payload.projectId === "string" && payload.projectId ? payload.projectId : null;
}

function resolveLegacySkillIds(payload: Record<string, unknown>) {
  if (!Array.isArray(payload.skillIds)) return [];
  return payload.skillIds.filter((value): value is string => typeof value === "string" && value.length > 0);
}

function buildLegacyCapabilities(source: LegacySource) {
  const base = [
    "unified-runs",
    "tool-orchestration",
    "projects",
    "skills",
    "approvals",
    "artifacts",
    "persistent-trace",
  ];
  if (source === "chat") return [...base, "chat-facade", "clarification"];
  if (source === "autonomous" || source === "workflows") return [...base, "autonomous-facade", "workflow-launch"];
  if (source === "react") return [...base, "react-facade", "tool-loop"];
  return [...base, "copilot-runtime-facade"];
}

export async function submitUnifiedRun(input: Omit<LegacySubmitInput, "source">) {
  return submitCopilotCommand({
    requesterUserId: input.requesterUserId,
    mode: input.mode,
    commandText: input.commandText,
    scope: input.scope,
    conversationScopeHint: input.conversationScopeHint ?? null,
    conversationPreview: input.conversationPreview ?? null,
    projectId: input.projectId ?? null,
    skillIds: input.skillIds ?? [],
    requestId: input.requestId ?? null,
    conversationId: input.conversationId ?? null,
    requestCookies: input.requestCookies ?? [],
  });
}

export async function submitLegacyRun(
  requesterUserId: string,
  source: LegacySource,
  payload: Record<string, unknown>,
  requestCookies: ToolContextCookie[] = [],
) {
  const commandText = resolveLegacyCommandText(payload);
  if (!commandText) {
    throw new Error("Komut gerekli.");
  }

  return submitUnifiedRun({
    requesterUserId,
    commandText,
    mode: resolveLegacyMode(source, typeof payload.mode === "string" ? payload.mode : null),
    scope: resolveLegacyScope(payload),
    projectId: resolveLegacyProjectId(payload),
    skillIds: resolveLegacySkillIds(payload),
    requestId: typeof payload.requestId === "string" ? payload.requestId : null,
    requestCookies,
  });
}

export function streamLegacyRun(response: CopilotCommandResponse, source: LegacySource) {
  const text = response.response.details ?? response.response.summary;
  const textChunks = chunkText(text);
  const timelineTotal = Math.max(response.timeline.length, 1);

  return new ReadableStream({
    start(controller) {
      const enqueue = (payload: Record<string, unknown>) => {
        controller.enqueue(new TextEncoder().encode(encodeSse(payload)));
      };

      enqueue({
        type: "agent",
        data: {
          role: source,
          label: "Unified Orchestrator",
          icon: "sparkles",
        },
      });
      enqueue({
        type: "context",
        data: {
          summary: `${response.run.scopeType} scope · ${response.run.mode} mode · ${source} facade`,
        },
      });
      enqueue({
        type: "intent",
        data: {
          intent: response.run.intent ?? "system.agent_task",
        },
      });

      response.timeline.forEach((step, index) => {
        enqueue({
          type: "status",
          data: {
            step: step.title,
            message: step.detail ?? step.title,
            progress: index + 1,
            total: timelineTotal,
          },
        });
      });

      textChunks.forEach((chunk) => {
        enqueue({
          type: "text",
          data: {
            content: chunk,
          },
        });
      });

      enqueue({
        type: "done",
        data: {
          runId: response.run.id,
          status: response.run.status,
          summary: response.response.summary,
          toolName: response.run.toolName,
          suggestions: response.response.nextSuggestions,
        },
      });
      controller.close();
    },
  });
}

export async function getLegacyRouteStatus(source: LegacySource) {
  const { dashboard, registry } = await getSafeLegacyStatusData();
  const engineInfo = getLegacyFacadeDescriptor(source);

  return {
    status: "active",
    source,
    architecture: UNIFIED_ORCHESTRATOR_ENGINE_ID,
    engine: engineInfo.id,
    engineInfo,
    executionPath: engineInfo.executionPath,
    provider: getModelRoutingInfo(),
    capabilities: buildLegacyCapabilities(source),
    registry,
    projects: getCopilotProjects({ type: "global" }),
    skills: getCopilotSkills(),
    recentRuns: dashboard.recentRuns.slice(0, 10),
    pendingApprovals: dashboard.pendingApprovals.length,
  };
}

export async function getUnifiedRegistrySnapshot(): Promise<{
  summary: ToolRegistrySummary;
  tools: ToolSpec[];
}> {
  const snapshot = applyPersistedToolHealth(getUnifiedToolRegistry());
  const tools = snapshot.tools;
  const summary = getUnifiedToolRegistrySummary(tools);
  const verifiedAt = summary.verifiedAt ? new Date(summary.verifiedAt).getTime() : Number.NaN;
  const isVerificationMissing = !summary.verifiedAt;
  const isVerificationStale = Number.isFinite(verifiedAt)
    ? (Date.now() - verifiedAt) / 3_600_000 > REGISTRY_VERIFY_STALE_HOURS
    : false;

  if (isVerificationMissing || isVerificationStale) {
    await verifyToolRegistryHealth(tools);
    const refreshed = applyPersistedToolHealth(getUnifiedToolRegistry());
    return {
      tools: refreshed.tools,
      summary: getUnifiedToolRegistrySummary(refreshed.tools),
    };
  }

  return {
    tools,
    summary,
  };
}

export async function verifyUnifiedRegistrySnapshot(): Promise<{
  summary: ToolRegistrySummary;
  tools: ToolSpec[];
}> {
  const tools = getUnifiedToolRegistry();
  const verification = await verifyToolRegistryHealth(tools);
  const refreshed = applyPersistedToolHealth(getUnifiedToolRegistry());

  return {
    tools: refreshed.tools,
    summary: {
      ...getUnifiedToolRegistrySummary(refreshed.tools),
      verifiedAt: verification.verifiedAt,
    },
  };
}

export async function getUnifiedRunBundle(runId: string) {
  return getCopilotRun(runId);
}

export async function resolveUnifiedApproval(input: {
  approvalId: string;
  decision: "approved" | "rejected";
  decidedBy: string;
  note?: string;
}) {
  return resolveCopilotApproval(input);
}
