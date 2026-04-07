import type { Tool } from "ai";
import { createAdminClient } from "@/lib/supabase/admin";
import { createAllTools } from "@/lib/ai/tools";
import { getAllAgentTools } from "@/lib/ai/autonomous/agent-tools";
import { applyPersistedToolHealth, enrichToolRegistrySummary, getDefaultToolHealth } from "./health";
import type {
  ApprovalClass,
  CopilotSkillDomain,
  ToolRegistrySummary,
  ToolRisk,
  ToolSource,
  ToolSpec,
  WorkerTarget,
} from "@/lib/admin-copilot/types";

const DOMAIN_KEYWORDS: Array<{ domain: CopilotSkillDomain; patterns: RegExp[] }> = [
  { domain: "customer", patterns: [/user/i, /customer/i, /company/i, /llc/i, /profile/i] },
  { domain: "catalog", patterns: [/product/i, /order/i, /inventory/i, /warehouse/i, /marketplace/i, /store/i, /shipment/i] },
  { domain: "finance", patterns: [/finance/i, /invoice/i, /payment/i, /billing/i, /revenue/i, /profit/i] },
  { domain: "operations", patterns: [/workflow/i, /task/i, /support/i, /ticket/i, /notification/i, /form/i, /schema/i, /database/i, /query/i] },
  { domain: "research", patterns: [/benchmark/i, /analysis/i, /search/i, /fetch/i, /crawl/i, /browser/i, /memory/i, /report/i] },
];

function getSchemaShape(schema: unknown): Record<string, unknown> {
  if (!schema || typeof schema !== "object") return {};
  const candidate = schema as {
    shape?: Record<string, unknown> | (() => Record<string, unknown>);
    _def?: { shape?: Record<string, unknown> | (() => Record<string, unknown>) };
    def?: { shape?: Record<string, unknown> | (() => Record<string, unknown>) };
  };

  if (typeof candidate.shape === "function") return candidate.shape();
  if (candidate.shape && typeof candidate.shape === "object") return candidate.shape;
  if (typeof candidate._def?.shape === "function") return candidate._def.shape();
  if (candidate._def?.shape && typeof candidate._def.shape === "object") return candidate._def.shape;
  if (typeof candidate.def?.shape === "function") return candidate.def.shape();
  if (candidate.def?.shape && typeof candidate.def.shape === "object") return candidate.def.shape;
  return {};
}

function getSdkToolInputs(tool: Tool) {
  const sdkTool = tool as unknown as { parameters?: unknown };
  return Object.keys(getSchemaShape(sdkTool.parameters));
}

function inferDomain(name: string, description: string): CopilotSkillDomain {
  const haystack = `${name} ${description}`;
  for (const candidate of DOMAIN_KEYWORDS) {
    if (candidate.patterns.some((pattern) => pattern.test(haystack))) {
      return candidate.domain;
    }
  }
  return "global";
}

function inferApprovalClass(name: string, workerTarget: WorkerTarget): ApprovalClass {
  if (workerTarget === "browser_local" || workerTarget === "browser_remote") {
    return "browser_operator";
  }
  if (/publish|deliver|notification|email/i.test(name)) {
    return "content_delivery";
  }
  if (/finance|invoice|payment|billing/i.test(name)) {
    return "financial_change";
  }
  if (/create|update|delete|insert|approve|reject|send/i.test(name)) {
    return "data_mutation";
  }
  return "read_only";
}

function inferWorkerTarget(name: string): WorkerTarget {
  if (/browser_extract|browser|crawl|fetch_webpage/i.test(name)) {
    return /browser_extract/i.test(name) ? "browser_local" : "browser_remote";
  }
  if (/query|db_|schema|table|record/i.test(name)) {
    return "database";
  }
  if (/generate|analyze|memory|report|search/i.test(name)) {
    return "llm";
  }
  return "application";
}

function inferRisk(approvalClass: ApprovalClass): ToolRisk {
  if (approvalClass === "browser_operator" || approvalClass === "financial_change") return "high";
  if (approvalClass === "data_mutation" || approvalClass === "content_delivery") return "medium";
  return "low";
}

function buildSpec(input: {
  source: ToolSource;
  name: string;
  description: string;
  inputSchema: string[];
}): ToolSpec {
  const workerTarget = inferWorkerTarget(input.name);
  const approvalClass = inferApprovalClass(input.name, workerTarget);
  const baseTool: ToolSpec = {
    id: `${input.source}:${input.name}`,
    name: input.name,
    description: input.description,
    domain: inferDomain(input.name, input.description),
    source: input.source,
    approvalClass,
    risk: inferRisk(approvalClass),
    workerTarget,
    enabled: true,
    requiredContext: approvalClass === "read_only" ? [] : ["approval_or_policy"],
    inputSchema: input.inputSchema,
    healthStatus: "unknown",
    healthSummary: null,
    healthChecks: [],
    lastVerifiedAt: null,
    selectable: false,
    selectabilityReason: "Tool doğrulaması bekleniyor.",
  };
  const defaultHealth = getDefaultToolHealth(baseTool);

  return {
    ...baseTool,
    healthStatus: defaultHealth.status,
    healthSummary: summarizeDefaultHealthForSpec(input.source, input.name, input.description, approvalClass, workerTarget),
    healthChecks: [
      `source:${input.source}`,
      `worker:${workerTarget}`,
      `approval:${approvalClass}`,
    ],
    selectable: defaultHealth.status === "healthy" || defaultHealth.status === "degraded",
    selectabilityReason:
      defaultHealth.status === "healthy" || defaultHealth.status === "degraded"
        ? null
        : "Tool doğrulaması bekleniyor.",
  };
}

function summarizeDefaultHealthForSpec(
  source: ToolSource,
  name: string,
  description: string,
  approvalClass: ApprovalClass,
  workerTarget: WorkerTarget,
) {
  return getDefaultToolHealth({
    id: `${source}:${name}`,
    name,
    description,
    domain: inferDomain(name, description),
    source,
    approvalClass,
    risk: inferRisk(approvalClass),
    workerTarget,
    enabled: true,
    requiredContext: approvalClass === "read_only" ? [] : ["approval_or_policy"],
    inputSchema: [],
    healthStatus: "unknown",
    healthSummary: null,
    healthChecks: [],
    lastVerifiedAt: null,
    selectable: false,
    selectabilityReason: "Tool doğrulaması bekleniyor.",
  }).summary;
}

export function getUnifiedToolRegistry(): ToolSpec[] {
  const supabase = createAdminClient();
  const sdkTools = Object.entries(createAllTools(supabase)).map(([name, tool]) =>
    buildSpec({
      source: "sdk",
      name,
      description: (tool as unknown as { description?: string }).description ?? `${name} SDK aracı`,
      inputSchema: getSdkToolInputs(tool),
    }),
  );

  const agentTools = getAllAgentTools().map((tool) =>
    buildSpec({
      source: "agent",
      name: tool.name,
      description: tool.description,
      inputSchema: tool.parameters.map((parameter) => parameter.name),
    }),
  );

  const tools = [...sdkTools, ...agentTools].sort((left, right) => left.name.localeCompare(right.name, "tr"));
  return applyPersistedToolHealth(tools).tools;
}

export function getUnifiedToolRegistrySummary(tools = getUnifiedToolRegistry()): ToolRegistrySummary {
  const baseSummary = {
    total: tools.length,
    enabled: tools.filter((tool) => tool.enabled).length,
    selectable: 0,
    pruned: 0,
    readOnly: tools.filter((tool) => tool.approvalClass === "read_only").length,
    mutating: tools.filter((tool) => tool.approvalClass !== "read_only").length,
    browserTools: tools.filter((tool) => tool.workerTarget === "browser_local" || tool.workerTarget === "browser_remote").length,
    sources: {
      sdk: 0,
      agent: 0,
    },
    domains: {
      customer: 0,
      catalog: 0,
      finance: 0,
      operations: 0,
      research: 0,
      global: 0,
    },
  };

  for (const tool of tools) {
    baseSummary.sources[tool.source] += 1;
    baseSummary.domains[tool.domain] += 1;
  }

  const verifiedAt = tools
    .map((tool) => tool.lastVerifiedAt ?? null)
    .filter((value): value is string => typeof value === "string")
    .sort((left, right) => new Date(right).getTime() - new Date(left).getTime())[0] ?? null;

  return enrichToolRegistrySummary(baseSummary, tools, verifiedAt);
}
