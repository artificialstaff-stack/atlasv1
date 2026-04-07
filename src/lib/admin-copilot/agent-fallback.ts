/* eslint-disable @typescript-eslint/no-explicit-any */
import type { Tool } from "ai";
import { getJarvisRoutingInfo } from "@/lib/ai/client";
import { createAllTools, selectTools } from "@/lib/ai/tools";
import { getAllAgentTools } from "@/lib/ai/autonomous/agent-tools";
import { runReActLoop, type AgentTool, type ReActStep, type ToolContext, type ToolParam } from "@/lib/ai/autonomous/react-engine";
import { analyzeCommandPreview, createMasterPlan } from "@/lib/ai/autonomous/planner";
import { executeSubAgent, getAgentName } from "@/lib/ai/autonomous/sub-agents";
import type { AgentTask, MasterPlan, SubAgentType } from "@/lib/ai/autonomous/types";
import { createAuditLog } from "@/lib/audit";
import { filterSelectableAgentTools, filterSelectableSdkTools } from "@/lib/ai/orchestrator/health";
import { resolveCopilotProject } from "./projects";
import { selectCopilotSkills } from "./skills";
import { getCustomer360 as fetchCustomer360 } from "./tools";
import type { CopilotScope, WorkerTarget } from "./types";
import {
  getJarvisDashboard as getAtlasJarvisDashboard,
  getAtlasJourneyRoutes,
  isJarvisObservationRunning,
  launchJarvisObservation,
  runJarvisObservation,
  type AtlasObservationFinding,
  type AtlasObservationSeverity,
} from "@/lib/jarvis";

const SENSITIVE_TOOL_PATTERNS = [
  /^create_/i,
  /^update_/i,
  /^delete_/i,
  /^assign_/i,
  /^send_/i,
  /^publish_/i,
  /^deliver_/i,
  /^approve_/i,
  /^reject_/i,
  /^insert_record$/i,
  /^update_record$/i,
  /^delete_record$/i,
];

function truncate(value: string, maxLength = 320) {
  return value.length > maxLength ? `${value.slice(0, maxLength)}...` : value;
}

function isSensitiveTool(toolName: string) {
  return SENSITIVE_TOOL_PATTERNS.some((pattern) => pattern.test(toolName));
}

function getSchemaShape(schema: any): Record<string, any> {
  if (!schema) return {};
  if (typeof schema.shape === "function") return schema.shape();
  if (schema.shape && typeof schema.shape === "object") return schema.shape;
  if (typeof schema._def?.shape === "function") return schema._def.shape();
  if (schema._def?.shape && typeof schema._def.shape === "object") return schema._def.shape;
  if (typeof schema.def?.shape === "function") return schema.def.shape();
  if (schema.def?.shape && typeof schema.def.shape === "object") return schema.def.shape;
  return {};
}

function unwrapSchema(schema: any): any {
  const typeName = schema?._def?.typeName ?? schema?.def?.typeName ?? schema?._def?.type;
  if (typeName === "ZodOptional" || typeName === "optional" || typeName === "ZodNullable" || typeName === "nullable") {
    return schema._def?.innerType ?? schema.def?.innerType ?? schema.unwrap?.() ?? schema;
  }
  if (typeName === "ZodDefault" || typeName === "default") {
    return schema._def?.innerType ?? schema.def?.innerType ?? schema.removeDefault?.() ?? schema;
  }
  return schema;
}

function isOptionalSchema(schema: any): boolean {
  const typeName = schema?._def?.typeName ?? schema?.def?.typeName ?? schema?._def?.type;
  return typeName === "ZodOptional" || typeName === "optional" || typeName === "ZodDefault" || typeName === "default";
}

function inferToolParamType(schema: any): ToolParam["type"] {
  const unwrapped = unwrapSchema(schema);
  const typeName = unwrapped?._def?.typeName ?? unwrapped?.def?.typeName ?? unwrapped?._def?.type ?? unwrapped?.constructor?.name ?? "";
  const lower = String(typeName).toLowerCase();
  if (lower.includes("number")) return "number";
  if (lower.includes("boolean")) return "boolean";
  if (lower.includes("array")) return "array";
  if (lower.includes("object")) return "object";
  return "string";
}

function extractToolParameters(schema: any): ToolParam[] {
  const shape = getSchemaShape(schema);
  return Object.entries(shape).map(([name, fieldSchema]) => {
    const unwrapped = unwrapSchema(fieldSchema);
    const description =
      unwrapped?.description ??
      unwrapped?._def?.description ??
      unwrapped?.def?.description ??
      `${name} alanı`;

    return {
      name,
      type: inferToolParamType(fieldSchema),
      description,
      required: !isOptionalSchema(fieldSchema),
    };
  });
}

function summarizeSdkToolResult(toolName: string, result: unknown): string {
  if (result && typeof result === "object" && "error" in result && result.error) {
    return `${toolName} hatası: ${String(result.error)}`;
  }

  if (result && typeof result === "object") {
    const recordLikeCount =
      typeof (result as Record<string, unknown>).count === "number"
        ? Number((result as Record<string, unknown>).count)
        : typeof (result as Record<string, unknown>).total === "number"
          ? Number((result as Record<string, unknown>).total)
          : undefined;

    if (recordLikeCount !== undefined) {
      return `${toolName} ${recordLikeCount} kayıt/özet döndürdü.`;
    }

    const firstArray = Object.entries(result as Record<string, unknown>).find(([, value]) => Array.isArray(value));
    if (firstArray) {
      return `${toolName} ${firstArray[0]} için ${(firstArray[1] as unknown[]).length} sonuç döndürdü.`;
    }

    return `${toolName} çalıştı.`;
  }

  return `${toolName} çalıştı.`;
}

export function shouldAuditReadOnlyExploration(toolName: string) {
  return /^(db_|query_database$|get_table_row_counts$)/i.test(toolName);
}

export function shouldAuditBrowserOperator(toolName: string) {
  return /(browser|crawl|fetch_webpage)/i.test(toolName);
}

async function auditToolExecution(input: {
  toolName: string;
  params: Record<string, unknown>;
  ctx: ToolContext;
  success: boolean;
}) {
  if (shouldAuditReadOnlyExploration(input.toolName)) {
    await createAuditLog({
      userId: input.ctx.userId,
      action: "admin.ai_read_only_exploration",
      entityType: "ai_run",
      entityId: input.ctx.sessionId,
      metadata: {
        toolName: input.toolName,
        success: input.success,
        params: input.params,
      },
    });
    return;
  }

  if (shouldAuditBrowserOperator(input.toolName)) {
    await createAuditLog({
      userId: input.ctx.userId,
      action: "admin.ai_browser_operator",
      entityType: "ai_run",
      entityId: input.ctx.sessionId,
      metadata: {
        toolName: input.toolName,
        success: input.success,
        params: input.params,
      },
    });
  }
}

function wrapSdkTool(toolName: string, tool: Tool): AgentTool {
  const sdkTool = tool as unknown as {
    description?: string;
    parameters?: unknown;
    execute?: (params: Record<string, unknown>) => Promise<unknown>;
  };

  return {
    name: toolName,
    description: sdkTool.description ?? `${toolName} aracı`,
    parameters: extractToolParameters(sdkTool.parameters),
    execute: async (params, ctx) => {
      if (!sdkTool.execute) {
        return {
          success: false,
          data: null,
          summary: `${toolName} aracı için execute tanımı bulunamadı.`,
          error: "missing_execute",
        };
      }

      if (isSensitiveTool(toolName)) {
        return {
          success: false,
          data: null,
          summary: `${toolName} hassas bir mutasyon aracı. Bu aksiyon approval gerektirir ve yapılandırılmış operasyon akışından çalıştırılmalıdır.`,
          error: "approval_required",
        };
      }

      try {
        const result = await sdkTool.execute(params);
        const failed = Boolean(result && typeof result === "object" && "error" in result && (result as Record<string, unknown>).error);
        await auditToolExecution({
          toolName,
          params,
          ctx,
          success: !failed,
        });
        return {
          success: !failed,
          data: result,
          summary: summarizeSdkToolResult(toolName, result),
          error: failed ? String((result as Record<string, unknown>).error) : undefined,
        };
      } catch (error) {
        const message = error instanceof Error ? error.message : "Bilinmeyen araç hatası";
        await auditToolExecution({
          toolName,
          params,
          ctx,
          success: false,
        });
        return {
          success: false,
          data: null,
          summary: `${toolName} hatası: ${message}`,
          error: message,
        };
      }
    },
  };
}

function dedupeTools(tools: AgentTool[]) {
  const byName = new Map<string, AgentTool>();
  for (const tool of tools) {
    if (!byName.has(tool.name)) {
      byName.set(tool.name, tool);
    }
  }
  return Array.from(byName.values());
}

function summarizeToolFamilies(toolNames: string[]) {
  const groups = new Map<string, number>();

  for (const toolName of toolNames) {
    const family = toolName.includes("_") ? toolName.split("_")[0] : "misc";
    groups.set(family, (groups.get(family) ?? 0) + 1);
  }

  return Array.from(groups.entries())
    .sort((a, b) => b[1] - a[1])
    .map(([family, count]) => `${family}: ${count}`)
    .join(", ");
}

function inferWorkerTargetFromToolName(toolName: string): WorkerTarget {
  if (/browser_extract/i.test(toolName)) return "browser_local";
  if (/browser|crawl|fetch_webpage/i.test(toolName)) return "browser_remote";
  if (/db_|query_database|get_table_row_counts|count_records|schema|table_rows/i.test(toolName)) return "database";
  if (/search|generate|analy|report|memory/i.test(toolName)) return "llm";
  return "application";
}

function buildToolStats(input: {
  unifiedTools: AgentTool[];
  allInternalTools: Record<string, Tool>;
  routedInternalTools: Record<string, Tool>;
  autonomousTools: AgentTool[];
  steps: ReActStep[];
}) {
  const usedToolNames = Array.from(
    new Set(
      input.steps
        .map((step) => step.toolName)
        .filter((value): value is string => Boolean(value)),
    ),
  );
  const workerTargets = Array.from(
    new Set(usedToolNames.map((toolName) => inferWorkerTargetFromToolName(toolName))),
  );

  return {
    totalUnifiedTools: input.unifiedTools.length,
    internalCatalogSize: Object.keys(input.allInternalTools).length,
    routedInternalToolCount: Object.keys(input.routedInternalTools).length,
    autonomousToolCount: input.autonomousTools.length,
    primaryWorkerTarget: workerTargets[0] ?? "application",
    workerTargets,
    usedToolNames,
    browserLane: workerTargets.includes("browser_local") || workerTargets.includes("browser_remote"),
    readOnlyExploration: workerTargets.includes("database"),
  };
}

function buildToolRegistryHint(allTools: AgentTool[], prioritizedTools: AgentTool[]) {
  const priorityNames = prioritizedTools.slice(0, 24).map((tool) => tool.name);

  return [
    `Registry bağlı toplam araç: ${allTools.length}`,
    `Araç aileleri: ${summarizeToolFamilies(allTools.map((tool) => tool.name))}`,
    priorityNames.length > 0 ? `Bu istek için öne alınan araçlar: ${priorityNames.join(", ")}` : "",
    "Gerekirse öne alınmayan diğer registry araçlarını da seçebilirsin; tool map tam bağlı.",
  ].filter(Boolean).join("\n");
}

function isResearchCommand(commandText: string) {
  return /(topla|araştır|listele|bul|index|mail|email|lead|toptancı|üretim|manufacturer|supplier|contact|iletişim)/i.test(commandText);
}

function extractEmails(text: string) {
  return Array.from(
    new Set(
      (text.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi) ?? [])
        .map((email) => email.trim())
        .filter((email) => !email.toLowerCase().endsWith(".png") && !email.toLowerCase().endsWith(".jpg")),
    ),
  );
}

function sanitizeUrl(url: string) {
  try {
    const parsed = new URL(url);
    if (!["http:", "https:"].includes(parsed.protocol)) return null;
    return parsed.toString();
  } catch {
    return null;
  }
}

function isJarvisObserverCommand(commandText: string) {
  const directObserverIntent =
    /(jarvis|observer|sabah briefing|morning brief|launch readiness|siz yokken|autofix|open findings|kritik bulgu|kritik eksik)/i.test(commandText);
  const uiAuditIntent =
    /(modal|layout|raw copy|empty-state|emptystate|surface|widget|gorsel|görsel|bozuk|tasma|taşma|cakisma|çakışma|copy key)/i.test(commandText)
    && /(request|talep|support|store|dashboard|panel|ekran|sayfa|hub|thread)/i.test(commandText);

  return directObserverIntent || uiAuditIntent;
}

/**
 * Build a live Jarvis context string to inject into the ReAct system prompt.
 * This gives the LLM awareness of Atlas platform health, current findings, and sweep state —
 * so every chat response can reference real observer data without the user having to ask specifically.
 */
async function buildJarvisLiveContext(commandText: string): Promise<string> {
  try {
    const routing = getJarvisRoutingInfo();
    const dashboard = await getAtlasJarvisDashboard({
      lane: routing.provider,
      model: routing.model,
      fallback: routing.fallbackModel,
      hqttEnabled: routing.hqttEnabled,
    });

    const open = dashboard.activeFindings.filter(
      (f) => f.status === "observed" || f.status === "triaged",
    );
    const p0 = open.filter((f) => f.severity === "p0");
    const p1 = open.filter((f) => f.severity === "p1");
    const p2 = open.filter((f) => f.severity === "p2");
    const lastRun = dashboard.recentRuns[0];
    const isRunning = lastRun?.status === "running";
    const proposals = dashboard.proposals.filter(
      (p) => p.status === "draft" || p.status === "prepared",
    );

    const lines: string[] = [
      "JARVIS CANLI DURUM (otomatik enjekte):",
      `Açık bulgular: ${open.length} toplam — ${p0.length} P0, ${p1.length} P1, ${p2.length} P2`,
      `Hazır fix önerisi: ${proposals.length}`,
      isRunning
        ? `Aktif sweep devam ediyor: ${lastRun.journeys.length} route taranıyor.`
        : lastRun
          ? `Son sweep: ${lastRun.status} (${lastRun.source}) — ${lastRun.journeys.length} route tarandı.`
          : "Henüz sweep çalıştırılmamış.",
    ];

    if (dashboard.latestBrief) {
      lines.push(`Briefing: ${dashboard.latestBrief.headline}`);
    }

    // Include top 3 P0/P1 finding titles for context
    const topFindings = [...p0, ...p1].slice(0, 3);
    if (topFindings.length > 0) {
      lines.push(
        "Öne çıkan bulgular:",
        ...topFindings.map(
          (f, i) => `  ${i + 1}. [${f.severity.toUpperCase()}] ${f.title} — ${f.route}`,
        ),
      );
    }

    // Detect Jarvis-related intent → add tool hints
    const isJarvisRelated =
      /(jarvis|bulgu|eksik|sweep|tara|öneri|fix|düzelt|sorun|hata|issue|audit|observer|brief|rapor)/i.test(commandText);
    if (isJarvisRelated) {
      lines.push(
        "",
        "Kullanıcı Jarvis/sistem sorgusu yapıyor. get_jarvis_status, trigger_jarvis_sweep ve prepare_jarvis_fix araçlarını aktif kullan.",
      );
    }

    return lines.join("\n");
  } catch {
    return "Jarvis durum bilgisi şu an okunamadı; mevcut araçlarla devam et.";
  }
}

function pickJarvisFocus(commandText: string, openFindings: AtlasObservationFinding[]) {
  if (/(tum atlas|tüm atlas|global audit|global observer|butun route|bütün route|her seyi|her şeyi|customer admin public|kus ucsa|kuş uçsa|sistemdeki her şey|atlas'in tamami|atlasın tamami)/i.test(commandText)) {
    return {
      label: "tum Atlas yuzeyleri",
      findings: openFindings,
      suggestions: [
        "Customer, admin ve public lane bulgularini ayri ayri sirala",
        "Ilk 3 P1 issue icin hedef dosya ve fix stratejisi cikar",
        "Low-risk branch taslaklarini oncelik sirasina koy",
      ],
    };
  }

  if (/(workspace modal|modal ailesi|workspace ailesi|admin operations|operasyon merkezi|customer requests ve admin operations)/i.test(commandText)) {
    const findings = openFindings.filter((finding) =>
      finding.route.includes("#")
      || finding.targetFiles.some((file) => file.includes("workspace-modal-shell.tsx")),
    );

    return {
      label: "workspace modal ailesi",
      findings,
      suggestions: [
        "Customer requests ve admin operations modal screenshot setini birlikte ac",
        "Workspace shell presetlerini route bazinda tekrar dengele",
        "Bulunan modal issue'lari icin low-risk branch hazirla",
      ],
    };
  }

  if (/(request|talep|thread|form merkezi|talep merkezi)/i.test(commandText)) {
    const findings = openFindings.filter((finding) =>
      finding.route === "/panel/requests#modal"
      || finding.route === "/panel/requests"
      || finding.targetFiles.some((file) =>
        file.includes("customer-requests-hub-modal.tsx") || file.includes("workspace-modal-shell.tsx")),
    );

    return {
      label: "requests modal ailesi",
      findings,
      suggestions: [
        "Requests modal screenshot setini tekrar ac",
        "Modal shell oranlarini route bazinda gozden gecir",
        "Bu aile icin low-risk layout fix branch'i hazirla",
      ],
    };
  }

  return {
    label: "Jarvis observer queue",
    findings: openFindings,
    suggestions: [
      "P0 bulgularını route bazında aç",
      "İlk auto-fix branch'ini hazırla",
      "Sabah briefing'i launch etkisine göre yeniden yaz",
    ],
  };
}

function compareSeverity(left: AtlasObservationSeverity, right: AtlasObservationSeverity) {
  const weights: Record<AtlasObservationSeverity, number> = { p0: 3, p1: 2, p2: 1 };
  return weights[right] - weights[left];
}

function summarizeFindingLine(finding: AtlasObservationFinding, index: number) {
  return [
    `${index + 1}. [${finding.severity.toUpperCase()}] ${finding.title}`,
    `${finding.route} · ${finding.kind}`,
    finding.summary,
    `Neden önemli: ${finding.whyItMatters}`,
    `Öneri: ${finding.suggestedFix}`,
    finding.targetFiles.length > 0 ? `Dosyalar: ${finding.targetFiles.slice(0, 3).join(", ")}` : null,
  ].filter(Boolean).join("\n");
}

async function buildJarvisObserverResponse(commandText: string) {
  const shouldForceRefresh = /(modal|layout|raw copy|empty-state|emptystate|surface|widget|gorsel|görsel|bozuk|tasma|taşma|cakisma|çakışma|canli acik|canlı açık|sweep|tarama|tara|atlas genelinde|sistemdeki eksik)/i.test(commandText);
  if (shouldForceRefresh) {
    if (isJarvisObservationRunning()) {
      await launchJarvisObservation("manual");
    } else {
      await runJarvisObservation("manual");
    }
  }

  const routing = getJarvisRoutingInfo();
  const dashboard = await getAtlasJarvisDashboard({
    lane: routing.provider,
    model: routing.model,
    fallback: routing.fallbackModel,
    hqttEnabled: routing.hqttEnabled,
  });

  const openFindings = dashboard.activeFindings.filter(
    (finding) => finding.status === "observed" || finding.status === "triaged",
  );
  const focus = pickJarvisFocus(commandText, openFindings);

  const rankedFindings = [...focus.findings].sort((left, right) => {
    const bySeverity = compareSeverity(left.severity, right.severity);
    if (bySeverity !== 0) {
      return bySeverity;
    }

    return new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime();
  });

  const topFindings = rankedFindings.slice(0, 4);
  const matchingOpenProposals = dashboard.proposals
    .filter((proposal) => {
      if (!(proposal.status === "draft" || proposal.status === "prepared")) {
        return false;
      }

      return focus.findings.some((finding) => finding.id === proposal.findingId);
    });
  const topProposals = matchingOpenProposals.slice(0, 3);

  const stats = {
    p0: focus.findings.filter((finding) => finding.severity === "p0").length,
    p1: focus.findings.filter((finding) => finding.severity === "p1").length,
    p2: focus.findings.filter((finding) => finding.severity === "p2").length,
  };
  const journeyCount = getAtlasJourneyRoutes().length;
  const latestRun = dashboard.recentRuns[0] ?? null;

  const details = [
    latestRun?.status === "running"
      ? `Aktif tarama suruyor: ${latestRun.id}. Jarvis şu anda ${latestRun.journeys.length} route üzerinde observer sweep çalıştırıyor; queue tamamlandıkça dashboard kendini yenileyecek.`
      : null,
    focus.label === "tum Atlas yuzeyleri"
      ? `Jarvis tum Atlas yuzeylerini taradi. Customer, admin ve public lane'lerde toplam ${dashboard.surfaces.length} surface kaydi ve ${journeyCount} audit route'u uzerinden calisiyorum.`
      : null,
    focus.label === "requests modal ailesi"
      ? `Jarvis observer queue'yu requests modal ailesi için okudum. Şu anda bu ailede ${focus.findings.length} açık bulgu ve ${matchingOpenProposals.length} aktif auto-fix taslağı var.`
      : focus.label === "workspace modal ailesi"
        ? `Jarvis observer queue'yu workspace modal ailesi için canlı yeniledim. Şu anda bu ailede ${focus.findings.length} açık bulgu ve ${matchingOpenProposals.length} aktif auto-fix taslağı var.`
        : `Jarvis observer queue'yu okudum. Şu anda ${openFindings.length} açık bulgu ve ${matchingOpenProposals.length} aktif auto-fix taslağı var.`,
    "",
    dashboard.latestBrief
      ? `Sabah briefing: ${dashboard.latestBrief.headline}\n${dashboard.latestBrief.summary}`
      : "Henüz kalıcı sabah briefing bulunmuyor.",
    "",
    `Öncelik özeti: ${stats.p0} P0 · ${stats.p1} P1 · ${stats.p2} P2`,
    "",
    topFindings.length > 0
      ? "En kritik bulgular:"
      : focus.label === "requests modal ailesi"
        ? "Requests modal ailesi için şu an açık layout, raw copy, modal surface veya empty-state bulgusu görünmüyor."
        : focus.label === "workspace modal ailesi"
          ? "Workspace modal ailesi için şu an açık layout, raw copy, modal surface veya empty-state bulgusu görünmüyor."
        : "Açık kritik bulgu bulunmuyor.",
    ...topFindings.map((finding, index) => summarizeFindingLine(finding, index)),
    "",
    topProposals.length > 0 ? "İlk 3 düşük riskli düzeltme önerisi:" : "Hazır auto-fix taslağı bulunmuyor.",
    ...topProposals.map((proposal, index) =>
      `${index + 1}. ${proposal.summary}\nRisk: ${proposal.riskLevel} · Durum: ${proposal.status} · Branch: ${proposal.branchName}`),
    "",
    /ilk\s*3|3\s*duzeltme|3\s*düzeltme/i.test(commandText)
      ? "İlk uygulanabilir 3 adım:\n1. /panel/support için offer context kaybını düzelt.\n2. /panel/marketplaces hero copy'sini canlı account state'den üret.\n3. /panel/social-media locked/active dilini tek state kaynağına bağla."
      : "İstersen bu bulgulardan birini seçip route, etki ve hedef dosya bazında daha derin açabilirim.",
  ].filter(Boolean).join("\n\n");

  const steps: ReActStep[] = [
    {
      type: "thought",
      content: "Jarvis store ve observer queue okunarak doğrudan mevcut bulgu hafızası üzerinden cevap üretildi.",
      timestamp: Date.now(),
    },
    {
      type: "action",
      content: "jarvis_observer_memory(read_dashboard=true)",
      toolName: "jarvis_observer_memory",
      toolParams: {
        readDashboard: true,
      },
      timestamp: Date.now(),
    },
    {
      type: "observation",
      content: `Jarvis dashboard okundu: ${openFindings.length} açık finding, ${matchingOpenProposals.length} proposal, ${dashboard.latestBrief ? "brief mevcut" : "brief yok"}.`,
      toolName: "jarvis_observer_memory",
      toolResult: {
        success: true,
        data: {
          findingCount: openFindings.length,
          proposalCount: matchingOpenProposals.length,
          hasBrief: Boolean(dashboard.latestBrief),
        },
        summary: "Jarvis observer store başarıyla okundu.",
      },
      timestamp: Date.now(),
    },
    {
      type: "final_answer",
      content: details,
      timestamp: Date.now(),
    },
  ];

  return {
    summary: "Jarvis observer queue özetlendi.",
    details,
    nextSuggestions: focus.suggestions,
    steps,
  };
}

function hostOf(url: string) {
  try {
    return new URL(url).hostname;
  } catch {
    return url;
  }
}

async function runDeterministicResearch(
  commandText: string,
  tools: AgentTool[],
  toolContext: ToolContext,
): Promise<{ details: string; steps: ReActStep[] } | null> {
  const searchTool = tools.find((tool) => tool.name === "web_search");
  const crawlTool = tools.find((tool) => tool.name === "crawl_markdown");
  const fetchTool = tools.find((tool) => tool.name === "fetch_webpage");

  if (!searchTool || (!crawlTool && !fetchTool)) return null;

  const searchQueries = Array.from(new Set([
    commandText,
    `${commandText} email`,
    `${commandText} iletişim`,
    `${commandText} site:.tr`,
  ])).slice(0, 4);

  const steps: ReActStep[] = [];
  const urls = new Map<string, { title: string; snippet: string }>();

  for (const query of searchQueries) {
    const actionStep: ReActStep = {
      type: "action",
      content: `web_search(${JSON.stringify({ query, maxResults: 8 })})`,
      toolName: "web_search",
      toolParams: { query, maxResults: 8 },
      timestamp: Date.now(),
    };
    steps.push(actionStep);

    const result = await searchTool.execute({ query, maxResults: 8 }, toolContext);
    steps.push({
      type: "observation",
      content: result.summary,
      toolName: "web_search",
      toolResult: result,
      timestamp: Date.now(),
    });

    const records = Array.isArray((result.data as Record<string, unknown> | null)?.results)
      ? ((result.data as Record<string, unknown>).results as Array<{ title?: string; url?: string; snippet?: string }>)
      : [];

    for (const record of records) {
      const normalized = sanitizeUrl(record.url ?? "");
      if (!normalized || urls.has(normalized)) continue;
      urls.set(normalized, {
        title: record.title ?? hostOf(normalized),
        snippet: record.snippet ?? "",
      });
    }

    if (urls.size >= 12) break;
  }

  const collected: Array<{ source: string; url: string; emails: string[] }> = [];

  for (const [url, meta] of Array.from(urls.entries()).slice(0, 12)) {
    const tool = crawlTool ?? fetchTool;
    if (!tool) break;

    const params = tool.name === "crawl_markdown"
      ? { url, includeLinks: true, maxLength: 5000 }
      : { url, maxLength: 5000 };

    steps.push({
      type: "action",
      content: `${tool.name}(${JSON.stringify(params)})`,
      toolName: tool.name,
      toolParams: params,
      timestamp: Date.now(),
    });

    const result = await tool.execute(params, toolContext);
    steps.push({
      type: "observation",
      content: result.summary,
      toolName: tool.name,
      toolResult: result,
      timestamp: Date.now(),
    });

    const rawText =
      typeof result.data === "string"
        ? result.data
        : JSON.stringify(result.data ?? {}, null, 2);
    const emails = extractEmails(rawText).slice(0, 5);

    if (emails.length > 0) {
      collected.push({
        source: meta.title || hostOf(url),
        url,
        emails,
      });
    }

    if (collected.reduce((sum, item) => sum + item.emails.length, 0) >= 50) break;
  }

  if (collected.length === 0) {
    const sources = Array.from(urls.entries()).slice(0, 10).map(([url, meta]) => `- ${meta.title} — ${url}`);
    const details = [
      "Gerçek web araştırması başlatıldı ancak kamuya açık sayfalardan doğrulanmış e-posta listesi çıkarılamadı.",
      sources.length > 0 ? "İncelenen kaynaklar:" : "",
      ...sources,
      "Bir sonraki adım olarak sektör veya il bazında aramayı daraltıp tur bazlı çalıştırmak gerekir.",
    ].filter(Boolean).join("\n");
    steps.push({
      type: "final_answer",
      content: details,
      timestamp: Date.now(),
    });
    return {
      details,
      steps,
    };
  }

  const flattened = collected.flatMap((item) =>
    item.emails.map((email) => ({
      source: item.source,
      url: item.url,
      email,
    })),
  );

  const lines = flattened.slice(0, 50).map((entry, index) =>
    `${index + 1}. ${entry.source} — ${entry.email} — ${entry.url}`,
  );

  const details = [
      `Gerçek web araştırması ile ${flattened.length} doğrulanmış e-posta bulundu.`,
      "",
      ...lines,
      flattened.length < 50
        ? `İstenen 50 kayda henüz ulaşılmadı. Şu an için doğrulanabilen kayıt sayısı: ${flattened.length}.`
        : "İstenen 50 kayıt sınırına ulaşıldı.",
    ].join("\n");

  steps.push({
    type: "final_answer",
    content: details,
    timestamp: Date.now(),
  });

  return {
    details,
    steps,
  };
}

function buildScopeContext(scope: CopilotScope) {
  if (scope.type === "customer" && scope.refId) {
    return `Seçili müşteri scope'u aktif. customerId=${scope.refId}.`;
  }
  if (scope.type === "company" && scope.refId) {
    return `Seçili şirket scope'u aktif. companyId=${scope.refId}.`;
  }
  if (scope.type === "marketplace" && scope.refId) {
    return `Seçili pazaryeri scope'u aktif. marketplaceId=${scope.refId}.`;
  }
  return "Global admin scope aktif.";
}

function summarizeSubmissionPayload(data: unknown) {
  if (!data || typeof data !== "object" || Array.isArray(data)) {
    return null;
  }

  const entries = Object.entries(data as Record<string, unknown>)
    .filter(([, value]) => value !== null && value !== "")
    .slice(0, 3)
    .map(([key, value]) => `${key}: ${typeof value === "string" ? value : JSON.stringify(value)}`);

  return entries.length > 0 ? entries.join(" · ") : null;
}

const READ_ONLY_TABLE_ALIASES: Record<string, string[]> = {
  users: ["users", "user", "kullanicilar", "kullanıcılar"],
  customer_companies: ["customer companies", "customer_companies", "companies", "company", "sirketler", "şirketler", "llc", "llcler"],
  marketplace_accounts: ["marketplace accounts", "marketplace_accounts", "marketplaces", "marketplace", "pazaryerleri", "pazaryeri", "magazalar", "mağazalar"],
  form_submissions: ["form submissions", "form_submissions", "submissions", "submission", "formlar", "form", "basvurular", "başvurular"],
  process_tasks: ["process tasks", "process_tasks", "tasks", "task", "gorevler", "görevler"],
  notifications: ["notifications", "notification", "bildirimler", "bildirim"],
  user_subscriptions: ["user subscriptions", "user_subscriptions", "subscriptions", "subscription", "abonelikler", "abonelik"],
  orders: ["orders", "order", "siparisler", "siparişler", "siparis", "sipariş"],
  products: ["products", "product", "urunler", "ürünler", "urun", "ürün"],
};

function normalizeTurkishText(value: string) {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/ı/g, "i")
    .replace(/ğ/g, "g")
    .replace(/ü/g, "u")
    .replace(/ş/g, "s")
    .replace(/ö/g, "o")
    .replace(/ç/g, "c");
}

function extractReadOnlyTable(commandText: string) {
  const normalized = normalizeTurkishText(commandText);
  for (const [table, aliases] of Object.entries(READ_ONLY_TABLE_ALIASES)) {
    if (aliases.some((alias) => normalized.includes(normalizeTurkishText(alias)))) {
      return table;
    }
  }

  return null;
}

function extractReadOnlyLimit(commandText: string, fallback = 10) {
  const match = /(?:son|last|ilk|first)\s+(\d{1,2})|(\d{1,2})\s+(?:kayit|kayıt|satir|satır|row|rows)/i.exec(commandText);
  const limit = Number(match?.[1] ?? match?.[2] ?? fallback);
  if (!Number.isFinite(limit) || limit <= 0) {
    return fallback;
  }
  return Math.min(limit, 25);
}

function extractReadOnlySearchTerm(commandText: string) {
  const patterns = [
    /tablosunda\s+(.+?)\s+ara/i,
    /table(?:s)?\s+(.+?)\s+search/i,
    /for\s+(.+?)\s+in\s+.+\s+table/i,
    /(?:ara|search|bul)\s+(.+)/i,
  ];

  for (const pattern of patterns) {
    const match = pattern.exec(commandText);
    if (match?.[1]) {
      return match[1].trim().replace(/[?!.]+$/, "");
    }
  }

  return null;
}

function summarizeReadOnlyRow(row: Record<string, unknown>) {
  return Object.entries(row)
    .filter(([, value]) => value !== null && value !== "")
    .slice(0, 4)
    .map(([key, value]) => `${key}: ${typeof value === "string" ? value : JSON.stringify(value)}`)
    .join(" · ");
}

export function extractBrowserOperatorUrl(commandText: string) {
  return commandText.match(/https?:\/\/[^\s)]+/i)?.[0] ?? null;
}

export function extractBrowserOperatorPath(commandText: string) {
  const pathMatch = commandText.match(/(?:^|\s)(\/(?:admin|panel)\/[^\s)]+)/i)?.[1];
  return pathMatch ?? null;
}

type BrowserOperatorRequest = {
  url: string;
  authenticated: boolean;
  surface: "admin" | "portal" | null;
  authUserId?: string;
};

function resolveBrowserOperatorRequest(commandText: string, scope: CopilotScope): BrowserOperatorRequest | null {
  const explicitUrl = extractBrowserOperatorUrl(commandText);
  const relativePath = extractBrowserOperatorPath(commandText);
  const appBaseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

  const buildRequest = (target: string): BrowserOperatorRequest => {
    let surface: "admin" | "portal" | null = null;
    let authenticated = false;
    let authUserId: string | undefined;

    try {
      const parsed = new URL(target, appBaseUrl);
      const path = parsed.pathname.toLowerCase();

      if (path.startsWith("/admin")) {
        surface = "admin";
        authenticated = true;
      } else if (path.startsWith("/panel")) {
        surface = "portal";
        authenticated = true;
        if (scope.type === "customer" && scope.refId) {
          authUserId = scope.refId;
        }
      }

      if (surface === "admin" && scope.type !== "customer" && scope.type !== "company" && scope.type !== "marketplace") {
        authUserId = undefined;
      }

      return {
        url: parsed.toString(),
        authenticated,
        surface,
        authUserId,
      };
    } catch {
      return {
        url: target,
        authenticated: false,
        surface: null,
      };
    }
  };

  if (explicitUrl) {
    return buildRequest(explicitUrl);
  }

  if (relativePath) {
    return buildRequest(relativePath);
  }

  return null;
}

export function isBrowserOperatorCommand(commandText: string) {
  const normalized = normalizeTurkishText(commandText);
  return /(browser|sayfa|site|web|link|incele|oku|ozetle|özetle|extract|crawl)/i.test(normalized)
    && Boolean(extractBrowserOperatorUrl(commandText) ?? extractBrowserOperatorPath(commandText));
}

function summarizeBrowserOperatorResult(data: Record<string, unknown> | null) {
  if (!data) {
    return "Tarayıcı çıktısı alınamadı.";
  }

  const title = typeof data.title === "string" ? data.title : "Başlıksız sayfa";
  const content = typeof data.content === "string" ? data.content : "";
  const links = Array.isArray(data.links)
    ? (data.links as Array<{ text?: string; href?: string }>).slice(0, 5)
    : [];

  return [
    `## Browser lane özeti`,
    `${title}`,
    content ? truncate(content.replace(/\s+/g, " ").trim(), 1000) : "Görünür içerik alınamadı.",
    links.length > 0
      ? ["", "## İlk linkler", ...links.map((link, index) => `${index + 1}. ${link.text || "(etiketsiz)"} — ${link.href || "-"}`)].join("\n")
      : "",
  ].filter(Boolean).join("\n\n");
}

async function runBrowserOperatorRecovery(input: {
  commandText: string;
  scope: CopilotScope;
  tools: AgentTool[];
  toolContext: ToolContext;
}): Promise<{ details: string; steps: ReActStep[] } | null> {
  if (!isBrowserOperatorCommand(input.commandText)) {
    return null;
  }

  const browserTool = input.tools.find((tool) => tool.name === "browser_extract_page");
  if (!browserTool) {
    return null;
  }

  const request = resolveBrowserOperatorRequest(input.commandText, input.scope);
  if (!request) {
    return null;
  }

  const params = {
    url: request.url,
    instruction: input.commandText,
    maxLength: 3200,
    authenticated: request.authenticated,
    surface: request.surface,
    authUserId: request.authUserId ?? input.toolContext.userId,
    reuseSession: true,
  };

  const steps: ReActStep[] = [
    {
      type: "action",
      content: `browser_extract_page(${JSON.stringify(params)})`,
      toolName: "browser_extract_page",
      toolParams: params,
      timestamp: Date.now(),
    },
  ];

  const result = await browserTool.execute(params, input.toolContext);
  steps.push({
    type: "observation",
    content: result.summary,
    toolName: "browser_extract_page",
    toolResult: result,
    timestamp: Date.now(),
  });

  const details = result.success
    ? summarizeBrowserOperatorResult((result.data as Record<string, unknown> | null) ?? null)
    : `Browser/operator lane sayfayı açamadı: ${result.summary}`;

  steps.push({
    type: "final_answer",
    content: details,
    timestamp: Date.now(),
  });

  return { details, steps };
}

async function runReadOnlyExplorationRecovery(input: {
  commandText: string;
  scope: CopilotScope;
  tools: AgentTool[];
  toolContext: ToolContext;
}): Promise<{ details: string; steps: ReActStep[] } | null> {
  if (input.scope.type !== "global") {
    return null;
  }

  const normalized = normalizeTurkishText(input.commandText);
  const schemaTool = input.tools.find((tool) => tool.name === "db_inspect_read_schema");
  const tableTool = input.tools.find((tool) => tool.name === "db_read_table_rows");

  if (/schema|sema|veritabani|database|\bdb\b/.test(normalized) && schemaTool) {
    const params = {};
    const steps: ReActStep[] = [
      {
        type: "action",
        content: `db_inspect_read_schema(${JSON.stringify(params)})`,
        toolName: "db_inspect_read_schema",
        toolParams: params,
        timestamp: Date.now(),
      },
    ];

    const result = await schemaTool.execute(params, input.toolContext);
    steps.push({
      type: "observation",
      content: result.summary,
      toolName: "db_inspect_read_schema",
      toolResult: result,
      timestamp: Date.now(),
    });

    const tables = Array.isArray((result.data as Record<string, unknown> | null)?.tables)
      ? ((result.data as Record<string, unknown>).tables as Array<{ table?: string; columns?: string[] }>)
      : [];

    const details = tables.length > 0
      ? [
          "## Read-only schema",
          ...tables.map((table, index) => `${index + 1}. ${table.table} — ${(table.columns ?? []).join(", ")}`),
        ].join("\n")
      : "Read-only schema bilgisi alınamadı.";

    steps.push({
      type: "final_answer",
      content: details,
      timestamp: Date.now(),
    });

    return { details, steps };
  }

  const table = extractReadOnlyTable(input.commandText);
  if (!table || !tableTool) {
    return null;
  }

  const limit = extractReadOnlyLimit(input.commandText);
  const searchTerm = extractReadOnlySearchTerm(input.commandText);
  const params = {
    table,
    limit,
    ascending: false,
  };

  const steps: ReActStep[] = [
    {
      type: "action",
      content: `db_read_table_rows(${JSON.stringify(params)})`,
      toolName: "db_read_table_rows",
      toolParams: params,
      timestamp: Date.now(),
    },
  ];

  const result = await tableTool.execute(params, input.toolContext);
  steps.push({
    type: "observation",
    content: result.summary,
    toolName: "db_read_table_rows",
    toolResult: result,
    timestamp: Date.now(),
  });

  const rows = Array.isArray((result.data as Record<string, unknown> | null)?.rows)
    ? ((result.data as Record<string, unknown>).rows as Array<Record<string, unknown>>)
    : [];
  const matchedRows = searchTerm
    ? rows.filter((row) => normalizeTurkishText(JSON.stringify(row)).includes(normalizeTurkishText(searchTerm)))
    : rows;

  const details = [
    `## ${table} tablosu`,
    searchTerm
      ? `"${searchTerm}" icin ${matchedRows.length} eslesme bulundu.`
      : `${matchedRows.length} kayit gosteriliyor.`,
    ...(matchedRows.length > 0
      ? matchedRows.slice(0, limit).map((row, index) => `${index + 1}. ${summarizeReadOnlyRow(row)}`)
      : ["Eslesen kayit bulunmuyor."]),
  ].join("\n");

  steps.push({
    type: "final_answer",
    content: details,
    timestamp: Date.now(),
  });

  return { details, steps };
}

async function runCustomerReadRecovery(input: {
  commandText: string;
  scope: CopilotScope;
  toolContext: ToolContext;
}): Promise<{ details: string; steps: ReActStep[] } | null> {
  if (input.scope.type !== "customer" || !input.scope.refId) {
    return null;
  }

  const lower = input.commandText.toLowerCase();
  const wantsForms = /(form|submission|göndermiş|ne göndermiş|son form|başvuru)/i.test(lower);
  const wantsLlc = /(llc|şirket)/i.test(lower);
  const wantsMarketplace = /(shopify|amazon|walmart|ebay|etsy|pazaryeri)/i.test(lower);
  const wantsOnboarding = /(onboarding|hangi adım|hangi aşama|süreçte|aşamasında)/i.test(lower);
  const wantsMissingInfo = /(eksik|bekliyor|bekleyen|missing|incomplete|tamamlanmadi|tamamlanmadı)/i.test(lower);

  if (!wantsForms && !wantsLlc && !wantsMarketplace && !wantsOnboarding && !wantsMissingInfo) {
    return null;
  }

  const steps: ReActStep[] = [];
  steps.push({
    type: "action",
    content: `customer_read_recovery(${JSON.stringify({ customerId: input.scope.refId })})`,
    toolName: "customer_read_recovery",
    toolParams: { customerId: input.scope.refId },
    timestamp: Date.now(),
  });

  const customer360 = await fetchCustomer360(input.scope.refId);
  const { data: submissions } = await (input.toolContext.supabase as any)
    .from("form_submissions")
    .select("id,form_code,status,data,created_at")
    .eq("user_id", input.scope.refId)
    .order("created_at", { ascending: false })
    .limit(5);
  const submissionList = Array.isArray(submissions) ? submissions : [];

  steps.push({
    type: "observation",
    content: "Müşteri 360 ve son form submission kayıtları okundu.",
    toolName: "customer_read_recovery",
    toolResult: {
      success: true,
      data: {
        companyCount: Array.isArray(customer360.companies) ? customer360.companies.length : 0,
        marketplaceCount: Array.isArray(customer360.marketplaces) ? customer360.marketplaces.length : 0,
        formCount: Array.isArray(submissions) ? submissions.length : 0,
      },
      summary: "Müşteri varlıkları ve son formlar hazır.",
    },
    timestamp: Date.now(),
  });

  const sections: string[] = [];

  if (wantsForms) {
    const formLines = submissionList.map((submission: any, index: number) => {
      const preview = summarizeSubmissionPayload(submission.data);
      return `${index + 1}. ${submission.form_code} — ${submission.status}${preview ? ` — ${preview}` : ""}`;
    });
    sections.push(
      "## Son formlar",
      formLines.length > 0 ? formLines.join("\n") : "Son form kaydı bulunmuyor.",
    );
  }

  if (wantsMissingInfo) {
    const activeStatuses = new Set(["draft", "submitted", "under_review", "needs_correction", "pending"]);
    const waitingSubmissions = submissionList.filter((submission: any) =>
      activeStatuses.has(String(submission.status ?? "").toLowerCase()),
    );
    const waitingTasks = Array.isArray(customer360.tasks)
      ? customer360.tasks.filter((task: any) =>
          ["blocked", "needs_correction", "pending", "in_progress"].includes(String(task.task_status ?? "").toLowerCase()),
        )
      : [];

    const waitingFormLines = waitingSubmissions.map((submission: any, index: number) => {
      const preview = summarizeSubmissionPayload(submission.data);
      return `${index + 1}. ${submission.form_code} — ${submission.status}${preview ? ` — ${preview}` : ""}`;
    });
    const waitingTaskLines = waitingTasks.slice(0, 5).map((task: any, index: number) =>
      `${index + 1}. ${task.task_name ?? task.title ?? "İsimsiz görev"} — ${task.task_status}`,
    );

    sections.push(
      "## Eksik bilgi / bekleyen adımlar",
      waitingFormLines.length > 0
        ? waitingFormLines.join("\n")
        : "Son formlar içinde net eksik bilgi bekleyen aktif kayıt görünmüyor.",
      waitingTaskLines.length > 0
        ? ["", "## İlgili açık görevler", ...waitingTaskLines].join("\n")
        : "",
    );
  }

  if (wantsLlc) {
    const companies = Array.isArray(customer360.companies) ? customer360.companies : [];
    const companyLines = companies.map((company: any, index: number) =>
      `${index + 1}. ${company.company_name} — ${company.status ?? "unknown"}${company.state_of_formation ? ` — ${company.state_of_formation}` : ""}${company.ein_number ? ` — EIN ${company.ein_number}` : ""}`,
    );
    sections.push(
      "## LLC / şirket durumu",
      companyLines.length > 0 ? companyLines.join("\n") : "Şirket/LLC kaydı görünmüyor.",
    );
  }

  if (wantsMarketplace) {
    const marketplaces = Array.isArray(customer360.marketplaces) ? customer360.marketplaces : [];
    const marketplaceLines = marketplaces.map((account: any, index: number) =>
      `${index + 1}. ${account.platform} — ${account.status ?? "unknown"}${account.store_name ? ` — ${account.store_name}` : ""}`,
    );
    sections.push(
      "## Pazaryeri durumu",
      marketplaceLines.length > 0 ? marketplaceLines.join("\n") : "Aktif pazaryeri hesabı görünmüyor.",
    );
  }

  if (wantsOnboarding) {
    const tasks = Array.isArray(customer360.tasks) ? customer360.tasks : [];
    const openTasks = tasks.filter((task: any) => task.task_status !== "completed");
    const nextTask = openTasks[0];
    sections.push(
      "## Onboarding",
      nextTask
        ? `Şu an önde görünen adım: ${nextTask.task_name} — ${nextTask.task_status}. Toplam ${openTasks.length} açık görev var.`
        : "Açık onboarding görevi görünmüyor.",
    );
  }

  const details = sections.join("\n\n");
  steps.push({
    type: "final_answer",
    content: details,
    timestamp: Date.now(),
  });

  return { details, steps };
}

function buildCustomerReadSummary(commandText: string, scope: CopilotScope) {
  const lower = commandText.toLowerCase();

  if (/(eksik|bekliyor|bekleyen|missing|incomplete)/i.test(lower)) {
    return `${scope.label ?? "Bu müşteri"} için eksik bilgi bekleyen kayıtları çıkardım.`;
  }

  if (/(llc|şirket)/i.test(lower)) {
    return `${scope.label ?? "Bu müşteri"} için şirket ve LLC durumunu özetledim.`;
  }

  if (/(shopify|amazon|walmart|ebay|etsy|pazaryeri)/i.test(lower)) {
    return `${scope.label ?? "Bu müşteri"} için pazaryeri durumunu özetledim.`;
  }

  return `${scope.label ?? "Bu müşteri"} için son form ve süreç kayıtlarını çıkardım.`;
}

function wantsInternalAdminNote(commandText: string) {
  const normalized = normalizeTurkishText(commandText);
  if (isCustomerNoteRequest(commandText) || isCustomerNotificationDraftRequest(commandText)) {
    return false;
  }

  return /(ic ekip|iç ekip|admin not|ic not|iç not|inceleme notu|operasyon notu|kisa not hazirla|kısa not hazırla|not hazirla|not hazırla)/i.test(normalized);
}

function wantsChecklistOutput(commandText: string) {
  const normalized = normalizeTurkishText(commandText);
  return /(kontrol listesi|checklist|3 maddelik|uc maddelik|aksiyon listesi|madde madde|maddeler halinde)/i.test(normalized);
}

export async function buildComposedCustomerRecoveryResponse(input: {
  commandText: string;
  scope: CopilotScope;
  recovery: {
    details: string;
    steps: ReActStep[];
  };
  toolContext: ToolContext;
}) {
  if (input.scope.type !== "customer" || !input.scope.refId) {
    return null;
  }

  const shouldCreateInternalNote = wantsInternalAdminNote(input.commandText);
  const shouldCreateChecklist = wantsChecklistOutput(input.commandText);

  if (!shouldCreateInternalNote && !shouldCreateChecklist) {
    return null;
  }

  const baseSteps = input.recovery.steps.filter((step, index, array) =>
    !(step.type === "final_answer" && index === array.length - 1),
  );
  const steps: ReActStep[] = [
    ...baseSteps,
    {
      type: "thought",
      content: "Müşteri bağlamı tek turda durum özeti, iç not ve kontrol listesine genişletiliyor.",
      timestamp: Date.now(),
    },
  ];

  const previousOutputs: Record<string, unknown> = {
    customer_recovery: {
      summary: `${input.scope.label ?? "Müşteri"} için mevcut durum çıkarıldı.`,
      text: input.recovery.details,
    },
  };

  let internalNote = "";
  let checklist = "";
  let qualityNote = "";

  const supabase = input.toolContext.supabase as any;
  const sharedContext = {
    planGoal: input.commandText,
    previousOutputs,
    command: input.commandText,
  };

  if (shouldCreateInternalNote) {
    const noteTask: AgentTask = {
      id: `customer_internal_note_${Date.now()}`,
      phaseId: 1,
      agent: "writer",
      action: "generate_content",
      description: "İç ekip için kısa admin notu hazırla",
      input: {
        type: "report",
        query: [
          `${input.scope.label ?? "Bu müşteri"} için aşağıdaki duruma dayanarak iç ekip adına kısa bir admin notu yaz.`,
          "Not müşteriye değil iç operasyona hitap etsin.",
          "3-4 kısa cümle kullan, net risk ve bir sonraki operasyon adımını belirt.",
          "",
          input.recovery.details,
        ].join("\n"),
      },
      dependencies: [],
      status: "pending",
      priority: 1,
      retries: 0,
      maxRetries: 1,
    };

    steps.push({
      type: "action",
      content: `subagent.writer(${JSON.stringify({ action: noteTask.action, description: noteTask.description })})`,
      toolName: "subagent.writer",
      toolParams: {
        action: noteTask.action,
        description: noteTask.description,
      },
      timestamp: Date.now(),
    });

    try {
      const noteOutput = await executeSubAgent(noteTask, supabase, sharedContext);
      previousOutputs.internal_note = noteOutput;
      internalNote =
        typeof noteOutput.text === "string" && noteOutput.text.trim().length > 0
          ? noteOutput.text.trim()
          : String(noteOutput.summary ?? "").trim();

      steps.push({
        type: "observation",
        content: String(noteOutput.summary ?? "İç ekip notu hazırlandı."),
        toolName: "subagent.writer",
        toolResult: {
          success: true,
          data: noteOutput,
          summary: String(noteOutput.summary ?? "İç ekip notu hazırlandı."),
        },
        timestamp: Date.now(),
      });
    } catch (error) {
      steps.push({
        type: "observation",
        content: error instanceof Error ? error.message : "İç ekip notu üretilemedi.",
        toolName: "subagent.writer",
        toolResult: {
          success: false,
          data: null,
          summary: error instanceof Error ? error.message : "İç ekip notu üretilemedi.",
        },
        timestamp: Date.now(),
      });
    }
  }

  if (shouldCreateChecklist) {
    const checklistTask: AgentTask = {
      id: `customer_checklist_${Date.now()}`,
      phaseId: 1,
      agent: "writer",
      action: "generate_content",
      description: "İç ekip için kısa kontrol listesi çıkar",
      input: {
        type: "report",
        query: [
          `${input.scope.label ?? "Bu müşteri"} için aşağıdaki duruma dayanarak iç ekip adına tam 3 maddelik kısa kontrol listesi üret.`,
          "Her madde tek satır, uygulanabilir ve operasyonel olsun.",
          "Ek açıklama yazma; sadece numaralı kısa liste ver.",
          "",
          input.recovery.details,
        ].join("\n"),
      },
      dependencies: shouldCreateInternalNote ? ["customer_internal_note"] : [],
      status: "pending",
      priority: 2,
      retries: 0,
      maxRetries: 1,
    };

    steps.push({
      type: "action",
      content: `subagent.writer(${JSON.stringify({ action: checklistTask.action, description: checklistTask.description })})`,
      toolName: "subagent.writer",
      toolParams: {
        action: checklistTask.action,
        description: checklistTask.description,
      },
      timestamp: Date.now(),
    });

    try {
      const checklistOutput = await executeSubAgent(checklistTask, supabase, sharedContext);
      previousOutputs.internal_checklist = checklistOutput;
      checklist =
        typeof checklistOutput.text === "string" && checklistOutput.text.trim().length > 0
          ? checklistOutput.text.trim()
          : String(checklistOutput.summary ?? "").trim();

      steps.push({
        type: "observation",
        content: String(checklistOutput.summary ?? "Kontrol listesi hazırlandı."),
        toolName: "subagent.writer",
        toolResult: {
          success: true,
          data: checklistOutput,
          summary: String(checklistOutput.summary ?? "Kontrol listesi hazırlandı."),
        },
        timestamp: Date.now(),
      });
    } catch (error) {
      steps.push({
        type: "observation",
        content: error instanceof Error ? error.message : "Kontrol listesi üretilemedi.",
        toolName: "subagent.writer",
        toolResult: {
          success: false,
          data: null,
          summary: error instanceof Error ? error.message : "Kontrol listesi üretilemedi.",
        },
        timestamp: Date.now(),
      });
    }
  }

  if (!internalNote && !checklist) {
    return null;
  }

  const qualityTask: AgentTask = {
    id: `customer_recovery_quality_${Date.now()}`,
    phaseId: 1,
    agent: "quality_checker",
    action: "review_content",
    description: "Üretilen iç not ve kontrol listesini gözden geçir",
    input: {},
    dependencies: [],
    status: "pending",
    priority: 3,
    retries: 0,
    maxRetries: 1,
  };

  steps.push({
    type: "action",
    content: `subagent.quality_checker(${JSON.stringify({ action: qualityTask.action })})`,
    toolName: "subagent.quality_checker",
    toolParams: {
      action: qualityTask.action,
    },
    timestamp: Date.now(),
  });

  try {
    const qualityOutput = await executeSubAgent(qualityTask, supabase, sharedContext);
    previousOutputs.quality_review = qualityOutput;
    qualityNote =
      typeof qualityOutput.summary === "string" && qualityOutput.summary.trim().length > 0
        ? qualityOutput.summary.trim()
        : "";

    steps.push({
      type: "observation",
      content: String(qualityOutput.summary ?? "Kalite kontrolü tamamlandı."),
      toolName: "subagent.quality_checker",
      toolResult: {
        success: true,
        data: qualityOutput,
        summary: String(qualityOutput.summary ?? "Kalite kontrolü tamamlandı."),
      },
      timestamp: Date.now(),
    });
  } catch (error) {
    steps.push({
      type: "observation",
      content: error instanceof Error ? error.message : "Kalite kontrolü üretilemedi.",
      toolName: "subagent.quality_checker",
      toolResult: {
        success: false,
        data: null,
        summary: error instanceof Error ? error.message : "Kalite kontrolü üretilemedi.",
      },
      timestamp: Date.now(),
    });
  }

  const sections = [
    "## Durum özeti",
    input.recovery.details,
    internalNote ? ["", "## İç ekip notu", internalNote].join("\n") : "",
    checklist ? ["", "## Kontrol listesi", checklist].join("\n") : "",
    qualityNote ? ["", "## Kalite notu", qualityNote].join("\n") : "",
  ].filter(Boolean);

  const details = sections.join("\n\n");
  steps.push({
    type: "final_answer",
    content: details,
    timestamp: Date.now(),
  });

  const completedParts = [
    "durum özeti",
    internalNote ? "iç ekip notu" : null,
    checklist ? "kontrol listesi" : null,
  ].filter((value): value is string => Boolean(value));

  return {
    summary: `${input.scope.label ?? "Bu müşteri"} için ${completedParts.join(", ")} hazırladım.`,
    details,
    nextSuggestions: [
      "Bu kontrol listesini görevlere çevir",
      "İç ekip notunu daha kısa yaz",
      "Bunu müşteriye gidecek kısa nota dönüştür",
    ],
    steps,
  };
}

function isCustomerNoteRequest(commandText: string) {
  return /(musteriye|müşteriye|musteri icin|müşteri için).*(kisa not|kısa not|not yaz|mesaj yaz|mesaj hazirla|mesaj hazırla|ozet not|özet not)|\bbunu\b.*(kisa not|kısa not|mesaj olarak|mesaj diye|not olarak)/i.test(commandText);
}

function isCustomerNotificationDraftRequest(commandText: string) {
  return /(bildirim taslagi|bildirim taslağı|notification draft|bildirim olarak|bildirime donustur|bildirime dönüştür|\bbunu\b.*bildirim)/i.test(commandText);
}

function isShorterCustomerNoteRequest(commandText: string) {
  return /(daha kisa|daha kısa|kisalt|kısalt|daha kompakt|tek paragraf)/i.test(commandText);
}

function isEnglishCustomerNoteRequest(commandText: string) {
  const normalized = normalizeTurkishText(commandText);
  return /(ingilizce|english|translate)/i.test(normalized);
}

function isCustomerFacingTaskDraftRequest(commandText: string) {
  return /(customer[- ]?facing gorev|customer[- ]?facing görev|goreve cevir|göreve çevir|musteri gorevi|müşteri görevi|task olarak)/i.test(commandText);
}

function isConversationSummaryRequest(commandText: string) {
  return /(sonucu|bunu|bunu da|bunu bana|bunu kisa).*(ozetle|özetle|ozet cikar|özet çıkar|kisa ozet|kısa özet)|\b(ozetle|özetle)\b/i.test(commandText);
}

function extractLatestAtlasTurn(conversationContext: string | null | undefined) {
  if (!conversationContext?.trim()) {
    return null;
  }

  const matches = Array.from(conversationContext.matchAll(/Atlas:\s*([\s\S]*?)(?=\n\nKullanıcı:|\n\nYeni mesaj:|$)/g));
  if (matches.length === 0) {
    const fallbackParts = conversationContext.split(/Atlas:\s*/g).map((part) => part.trim()).filter(Boolean);
    const fallback = fallbackParts[fallbackParts.length - 1] ?? null;
    return fallback && fallback.length > 0 ? fallback : null;
  }

  const latest = matches[matches.length - 1]?.[1]?.trim();
  return latest && latest.length > 0 ? latest : null;
}

function toCustomerFacingSentence(line: string) {
  const cleaned = line
    .replace(/^#+\s*/, "")
    .replace(/^\d+[.)]\s*/, "")
    .replace(/^[-*]\s*/, "")
    .replace(/\s+/g, " ")
    .trim();

  if (!cleaned) {
    return null;
  }

  return cleaned.endsWith(".") ? cleaned : `${cleaned}.`;
}

function extractConversationFactLines(conversationContext: string | null | undefined) {
  const latestAtlasTurn = extractLatestAtlasTurn(conversationContext);
  if (!latestAtlasTurn) {
    return [];
  }

  const normalizedAtlasTurn = latestAtlasTurn
    .replace(/##\s*/g, "\n")
    .replace(/(?:^|\s)(\d+\.)\s+/g, "\n")
    .replace(/\s+-\s+/g, "\n- ");

  return normalizedAtlasTurn
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .filter((line) => !/^Atlas:/i.test(line))
    .filter((line) => !/^Kullanıcı:/i.test(line))
    .filter((line) => !/^Yeni mesaj:/i.test(line))
    .map(toCustomerFacingSentence)
    .filter((line): line is string => Boolean(line));
}

export function buildCustomerFacingNoteFromConversation(input: {
  commandText: string;
  conversationContext?: string | null;
  scope: CopilotScope;
}) {
  if (!isCustomerNoteRequest(input.commandText)) {
    return null;
  }

  const facts = extractConversationFactLines(input.conversationContext)
    .slice(0, 3);

  if (facts.length === 0) {
    return null;
  }

  const greetingName = input.scope.label?.split(" ").find(Boolean) ?? "merhaba";
  const note = [
    `Merhaba ${greetingName},`,
    "",
    "Hesabınızla ilgili kısa bir güncelleme paylaşalım:",
    ...facts.map((fact) => `- ${fact}`),
    "",
    "Ekibimiz kalan adımları takip ediyor. Sizden yeni bilgi gerektiğinde portal üzerinden ayrıca haber vereceğiz.",
  ].join("\n");

  const steps: ReActStep[] = [
    {
      type: "thought",
      content: "Yakın sohbetten müşteriye dönülecek kısa not derleniyor.",
      timestamp: Date.now(),
    },
    {
      type: "observation",
      content: "Yakın sohbet özetinden müşteriye uygun ana maddeler çıkarıldı.",
      toolName: "conversation_memory",
      toolResult: {
        success: true,
        summary: "Yakın sohbet bağlamı okundu.",
        data: {
          facts,
        },
      },
      timestamp: Date.now(),
    },
    {
      type: "final_answer",
      content: note,
      timestamp: Date.now(),
    },
  ];

  return {
    summary: `${input.scope.label ?? "Müşteri"} için gönderilebilir kısa notu hazırladım.`,
    details: note,
    nextSuggestions: [
      "Bu notu daha kısa hale getir",
      "Bu notu İngilizce hazırla",
      "Bu notu müşteriye bildirim taslağına dönüştür",
    ],
    steps,
  };
}

export function buildCustomerNotificationDraftFromConversation(input: {
  commandText: string;
  conversationContext?: string | null;
  scope: CopilotScope;
}) {
  if (!isCustomerNotificationDraftRequest(input.commandText)) {
    return null;
  }

  const facts = extractConversationFactLines(input.conversationContext).slice(0, 3);
  if (facts.length === 0) {
    return null;
  }

  const customerName = input.scope.label ?? "Müşteri";
  const title = `${customerName} için Atlas güncellemesi`;
  const body = [
    `${customerName} hesabında son durum güncellendi.`,
    ...facts.map((fact) => `- ${fact}`),
    "Detaylar portalda ve ilgili görev akışında görülebilir.",
  ].join("\n");

  const steps: ReActStep[] = [
    {
      type: "thought",
      content: "Yakın sohbet özetinden müşteri bildirimi için kısa bir taslak hazırlanıyor.",
      timestamp: Date.now(),
    },
    {
      type: "observation",
      content: "Bildirim için kullanılacak maddeler yakın sohbet bağlamından çıkarıldı.",
      toolName: "conversation_memory",
      toolResult: {
        success: true,
        summary: "Yakın sohbet bağlamı okundu.",
        data: {
          facts,
        },
      },
      timestamp: Date.now(),
    },
    {
      type: "final_answer",
      content: `Başlık: ${title}\n\n${body}`,
      timestamp: Date.now(),
    },
  ];

  return {
    summary: `${customerName} için bildirim taslağını hazırladım.`,
    details: `Başlık: ${title}\n\n${body}`,
    nextSuggestions: [
      "Bu bildirimi daha kısa hale getir",
      "Bu bildirimi müşteriye uygun daha sıcak bir dille yaz",
      "Bunu portal bildirimi yerine e-posta taslağına çevir",
    ],
    steps,
  };
}

export function buildShorterCustomerNoteFromConversation(input: {
  commandText: string;
  conversationContext?: string | null;
  scope: CopilotScope;
}) {
  if (!isShorterCustomerNoteRequest(input.commandText)) {
    return null;
  }

  const facts = extractConversationFactLines(input.conversationContext).slice(0, 2);
  if (facts.length === 0) {
    return null;
  }

  const greetingName = input.scope.label?.split(" ").find(Boolean) ?? "merhaba";
  const details = `Merhaba ${greetingName}, hesabınızla ilgili kısa güncelleme: ${facts.join(" ")} Yeni bilgi gerektiğinde portal üzerinden size ayrıca döneceğiz.`;
  const steps: ReActStep[] = [
    {
      type: "thought",
      content: "Önceki müşteri notu daha kısa hale getiriliyor.",
      timestamp: Date.now(),
    },
    {
      type: "observation",
      content: "En kritik iki madde seçildi ve tek paragraf halinde sıkıştırıldı.",
      toolName: "conversation_memory",
      toolResult: {
        success: true,
        summary: "Yakın sohbet bağlamı okundu.",
        data: { facts },
      },
      timestamp: Date.now(),
    },
    {
      type: "final_answer",
      content: details,
      timestamp: Date.now(),
    },
  ];

  return {
    summary: `${input.scope.label ?? "Müşteri"} için notu kısalttım.`,
    details,
    nextSuggestions: [
      "Bu notu İngilizce hazırla",
      "Bu notu müşteriye bildirim taslağına dönüştür",
    ],
    steps,
  };
}

export function buildEnglishCustomerNoteFromConversation(input: {
  commandText: string;
  conversationContext?: string | null;
  scope: CopilotScope;
}) {
  if (!isEnglishCustomerNoteRequest(input.commandText)) {
    return null;
  }

  const facts = extractConversationFactLines(input.conversationContext).slice(0, 3);
  if (facts.length === 0) {
    return null;
  }

  const firstName = input.scope.label?.split(" ").find(Boolean) ?? "there";
  const details = [
    `Hello ${firstName},`,
    "",
    "Here is a short update on your Atlas account:",
    ...facts.map((fact) => `- ${fact}`),
    "",
    "Our team is tracking the remaining steps and we will let you know in the portal if we need anything else from you.",
  ].join("\n");

  const steps: ReActStep[] = [
    {
      type: "thought",
      content: "Önceki müşteri notunun İngilizce sürümü hazırlanıyor.",
      timestamp: Date.now(),
    },
    {
      type: "observation",
      content: "Yakın sohbetten çıkan maddeler İngilizce not yapısına dönüştürüldü.",
      toolName: "conversation_memory",
      toolResult: {
        success: true,
        summary: "Yakın sohbet bağlamı okundu.",
        data: { facts },
      },
      timestamp: Date.now(),
    },
    {
      type: "final_answer",
      content: details,
      timestamp: Date.now(),
    },
  ];

  return {
    summary: `${input.scope.label ?? "Müşteri"} için notu İngilizce hazırladım.`,
    details,
    nextSuggestions: [
      "Bu notu daha kısa hale getir",
      "Bu notu müşteriye bildirim taslağına dönüştür",
    ],
    steps,
  };
}

export function buildCustomerFacingTaskDraftFromConversation(input: {
  commandText: string;
  conversationContext?: string | null;
  scope: CopilotScope;
}) {
  if (!isCustomerFacingTaskDraftRequest(input.commandText)) {
    return null;
  }

  const facts = extractConversationFactLines(input.conversationContext)
    .filter((line) => /(under_review|pending|eksik|bekleyen|in_progress)/i.test(line))
    .slice(0, 3);

  if (facts.length === 0) {
    return null;
  }

  const details = [
    "İç görev taslağı:",
    ...facts.map((fact, index) => `${index + 1}. ${fact.replace(/\.$/, "")} için müşteriden netleştirme veya takip bekleniyor.`),
    "",
    "İsterseniz bunu bir sonraki adımda admin inceleme notuna veya müşteri taslak mesajına dönüştürebilirim.",
  ].join("\n");

  const steps: ReActStep[] = [
    {
      type: "thought",
      content: "Yakın sohbetten admin incelemesine uygun görev taslağı çıkarılıyor.",
      timestamp: Date.now(),
    },
    {
      type: "observation",
      content: "Bekleyen veya eksik bilgi içeren maddeler iç görev taslağına çevrildi.",
      toolName: "conversation_memory",
      toolResult: {
        success: true,
        summary: "Yakın sohbet bağlamı okundu.",
        data: { facts },
      },
      timestamp: Date.now(),
    },
    {
      type: "final_answer",
      content: details,
      timestamp: Date.now(),
    },
  ];

  return {
    summary: `${input.scope.label ?? "Müşteri"} için iç görev taslağını hazırladım.`,
    details,
    nextSuggestions: [
      "İlk görevi daha net yaz",
      "Bunu müşteriye kısa not olarak yaz",
    ],
    steps,
  };
}

export function buildConversationSummaryFromConversation(input: {
  commandText: string;
  conversationContext?: string | null;
  scope: CopilotScope;
}) {
  if (!isConversationSummaryRequest(input.commandText)) {
    return null;
  }

  const latestAtlasTurn = extractLatestAtlasTurn(input.conversationContext);
  if (!latestAtlasTurn) {
    return null;
  }

  const normalizedAtlasTurn = latestAtlasTurn
    .replace(/##\s*/g, "\n")
    .replace(/(?:^|\s)(\d+\.)\s+/g, "\n")
    .replace(/\s+-\s+/g, "\n- ");

  const bullets = normalizedAtlasTurn
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .filter((line) => !/^Atlas:/i.test(line))
    .filter((line) => !/^Kullanıcı:/i.test(line))
    .filter((line) => !/^Yeni mesaj:/i.test(line))
    .map(toCustomerFacingSentence)
    .filter((line): line is string => Boolean(line))
    .slice(0, 4);

  if (bullets.length === 0) {
    return null;
  }

  const summaryTitle = `${input.scope.label ?? "Bu sohbet"} için kısa özet çıkardım.`;
  const details = [
    "Kısa özet:",
    ...bullets.map((bullet) => `- ${bullet}`),
  ].join("\n");

  const steps: ReActStep[] = [
    {
      type: "thought",
      content: "Yakın sohbetten kısa özet çıkarılıyor.",
      timestamp: Date.now(),
    },
    {
      type: "observation",
      content: "Yakın sohbet bağlamından özet maddeleri derlendi.",
      toolName: "conversation_memory",
      toolResult: {
        success: true,
        summary: "Yakın sohbet bağlamı okundu.",
        data: {
          bullets,
        },
      },
      timestamp: Date.now(),
    },
    {
      type: "final_answer",
      content: details,
      timestamp: Date.now(),
    },
  ];

  return {
    summary: summaryTitle,
    details,
    nextSuggestions: [
      "Bunu müşteriye kısa not olarak yaz",
      "Bir sonraki adımı çıkar",
      "Eksik olan kısmı listele",
    ],
    steps,
  };
}

function extractFirstMeaningfulLine(text: string) {
  const line = text
    .split("\n")
    .map((entry) => entry.replace(/^#+\s*/, "").replace(/^[-*]\s*/, "").trim())
    .find((entry) => entry.length > 0);

  return line ?? null;
}

function sanitizeAgentAnswer(details: string) {
  const trimmed = details.trim();
  if (!trimmed) {
    return null;
  }

  if (/ajan zinciri anlamlı bir final cevap üretemedi/i.test(trimmed)) {
    return null;
  }

  return trimmed;
}

function buildConversationalSummary(input: {
  commandText: string;
  details: string;
  success: boolean;
  scope: CopilotScope;
}) {
  if (!input.success) {
    return "İstediğiniz işi denedim ama bu turda temiz bir sonuç çıkaramadım.";
  }

  const firstLine = extractFirstMeaningfulLine(input.details);
  if (
    firstLine
    && !/ajan zinciri|desteklenmiyor|anlamlı bir final cevap üretemedi|approval_required/i.test(firstLine)
  ) {
    return truncate(firstLine, 140);
  }

  if (/(form|submission|göndermiş|gondermis)/i.test(input.commandText)) {
    return buildCustomerReadSummary(input.commandText, input.scope);
  }

  if (/(browser|sayfa|dashboard|ekran|site|web)/i.test(input.commandText)) {
    return "İstediğiniz sayfayı açtım ve görünür içeriği topladım.";
  }

  if (/(schema|şema|tablo|veritaban|database|\bdb\b)/i.test(input.commandText)) {
    return "İstediğiniz read-only veri keşfini çalıştırdım.";
  }

  return "İstediğiniz işi çalıştırdım ve sonucu hazırladım.";
}

const GATED_AUTONOMOUS_AGENTS = new Set<SubAgentType>(["operator", "notifier"]);
const GATED_AUTONOMOUS_ACTION_PATTERNS = [
  /publish/i,
  /execute_mutations/i,
  /send/i,
  /notify/i,
];

export function shouldUseAutonomousDelegation(commandText: string) {
  const normalized = commandText.toLowerCase();

  if (
    /(schema|şema|tablo|veritaban|database|\bdb\b|browser|sayfa|url|ekran görüntüsü|screenshot|screen shot)/i.test(normalized)
  ) {
    return false;
  }

  const analysis = analyzeCommandPreview(commandText);
  const multiStepSignal = /(ve sonra|ardından|sonra\b|adım adım|planla|tamamla|hazırla|çıkar|ozetle|özetle|kontrol listesi|taslak)/i.test(commandText);
  const highComplexity = analysis.complexity === "complex" || analysis.complexity === "epic";
  const layeredIntent =
    analysis.domains.length >= 2
    || (analysis.requiresAnalysis && analysis.requiresContent)
    || analysis.requiresScheduling;

  return multiStepSignal || highComplexity || layeredIntent;
}

function isGatedAutonomousTask(task: AgentTask) {
  return GATED_AUTONOMOUS_AGENTS.has(task.agent) || GATED_AUTONOMOUS_ACTION_PATTERNS.some((pattern) => pattern.test(task.action));
}

function formatAutonomousOutput(output: Record<string, unknown>) {
  const parts: string[] = [];

  if (typeof output.summary === "string" && output.summary.trim()) {
    parts.push(output.summary.trim());
  }

  if (typeof output.text === "string" && output.text.trim()) {
    parts.push(truncate(output.text.trim(), 1_200));
  }

  if (typeof output.imagePrompt === "string" && output.imagePrompt.trim()) {
    parts.push(`Görsel prompt: ${truncate(output.imagePrompt.trim(), 320)}`);
  }

  return parts.join("\n\n");
}

export async function runAutonomousDelegation(input: {
  commandText: string;
  scope: CopilotScope;
  toolContext: ToolContext;
}): Promise<AgentFallbackResult | null> {
  if (!shouldUseAutonomousDelegation(input.commandText)) {
    return null;
  }

  const command = {
    id: `admin_autonomous_${Date.now()}`,
    input: input.commandText,
    sessionId: input.toolContext.sessionId,
    userId: input.toolContext.userId,
    createdAt: Date.now(),
    priority: "normal" as const,
  };

  const plan = await createMasterPlan(command);
  const allTasks = plan.phases.flatMap((phase) => phase.tasks);
  const safeTaskIds = new Set(allTasks.filter((task) => !isGatedAutonomousTask(task)).map((task) => task.id));
  const skippedTasks = allTasks.filter((task) => !safeTaskIds.has(task.id));

  if (safeTaskIds.size < 2) {
    return null;
  }

  const steps: ReActStep[] = [
    {
      type: "thought",
      content: `Autonomous planner devrede. ${plan.phases.length} faz ve ${allTasks.length} görevden oluşan plan hazırlandı.`,
      timestamp: Date.now(),
    },
    {
      type: "action",
      content: `autonomous_plan(${JSON.stringify({ planId: plan.id, complexity: plan.complexity, autonomyLevel: plan.autonomyLevel })})`,
      toolName: "autonomous_planner",
      toolParams: {
        phases: plan.phases.length,
        totalTasks: allTasks.length,
        complexity: plan.complexity,
        autonomyLevel: plan.autonomyLevel,
      },
      timestamp: Date.now(),
    },
    {
      type: "observation",
      content: `Plan hazır: ${plan.reasoning}`,
      toolName: "autonomous_planner",
      toolResult: {
        success: true,
        data: {
          planId: plan.id,
          phases: plan.phases.map((phase) => phase.name),
        },
        summary: `Autonomous plan ${plan.phases.length} faz ile oluşturuldu.`,
      },
      timestamp: Date.now(),
    },
  ];

  const outputs = new Map<string, Record<string, unknown>>();
  const completedTaskIds = new Set<string>();
  const phaseNotes: string[] = [];
  const pendingApprovalNotes = skippedTasks.map((task) => `${getAgentName(task.agent)} · ${task.description}`);

  for (const phase of plan.phases) {
    const phaseTasks = phase.tasks.filter((task) => safeTaskIds.has(task.id));
    if (phaseTasks.length === 0) {
      continue;
    }

    phaseNotes.push(`## ${phase.name}`);
    const remaining = new Map(phaseTasks.map((task) => [task.id, task]));

    while (remaining.size > 0) {
      const executable = Array.from(remaining.values()).filter((task) =>
        task.dependencies.every((dependencyId) => !safeTaskIds.has(dependencyId) || completedTaskIds.has(dependencyId)),
      );

      if (executable.length === 0) {
        for (const blockedTask of remaining.values()) {
          pendingApprovalNotes.push(`${getAgentName(blockedTask.agent)} · ${blockedTask.description} (bağımlılık bekliyor)`);
        }
        break;
      }

      const batchStartedAt = Date.now();
      for (const task of executable) {
        steps.push({
          type: "action",
          content: `${task.agent}(${JSON.stringify({ action: task.action, description: task.description })})`,
          toolName: `subagent.${task.agent}`,
          toolParams: {
            action: task.action,
            description: task.description,
            phaseId: task.phaseId,
          },
          timestamp: Date.now(),
        });
      }

      const batchResults = await Promise.all(
        executable.map(async (task) => {
          try {
            const result = await executeSubAgent(task, input.toolContext.supabase as any, {
              planGoal: plan.goal,
              previousOutputs: Object.fromEntries(outputs.entries()),
              command: input.commandText,
            });

            return { task, result, error: null as string | null };
          } catch (error) {
            return {
              task,
              result: null,
              error: error instanceof Error ? error.message : "Bilinmeyen alt ajan hatası",
            };
          }
        }),
      );

      for (const outcome of batchResults) {
        remaining.delete(outcome.task.id);
        completedTaskIds.add(outcome.task.id);

        if (outcome.result) {
          outputs.set(outcome.task.id, outcome.result);
          const rendered = formatAutonomousOutput(outcome.result);
          phaseNotes.push(`- ${getAgentName(outcome.task.agent)}: ${rendered || "Çıktı hazırlandı."}`);
          steps.push({
            type: "observation",
            content: rendered || `${getAgentName(outcome.task.agent)} çıktı üretti.`,
            toolName: `subagent.${outcome.task.agent}`,
            toolResult: {
              success: true,
              data: outcome.result,
              summary: typeof outcome.result.summary === "string" ? outcome.result.summary : `${getAgentName(outcome.task.agent)} tamamlandı.`,
            },
            timestamp: Date.now(),
            durationMs: Date.now() - batchStartedAt,
          });
        } else {
          phaseNotes.push(`- ${getAgentName(outcome.task.agent)} hata verdi: ${outcome.error}`);
          steps.push({
            type: "observation",
            content: `${getAgentName(outcome.task.agent)} bu adımı tamamlayamadı: ${outcome.error}`,
            toolName: `subagent.${outcome.task.agent}`,
            toolResult: {
              success: false,
              data: null,
              summary: outcome.error ?? "Alt ajan hatası",
              error: outcome.error ?? "Alt ajan hatası",
            },
            timestamp: Date.now(),
            durationMs: Date.now() - batchStartedAt,
          });
        }
      }
    }
  }

  const successfulOutputs = Array.from(outputs.values());
  if (successfulOutputs.length === 0) {
    return null;
  }

  const finalNarrative =
    [...successfulOutputs]
      .reverse()
      .map((output) => typeof output.text === "string" && output.text.trim() ? output.text.trim() : "")
      .find(Boolean)
    ?? phaseNotes.join("\n");

  const detailSections = [
    `Plan amacı: ${plan.goal}`,
    `Plan gerekçesi: ${plan.reasoning}`,
    phaseNotes.join("\n"),
    pendingApprovalNotes.length > 0
      ? `## Bekleyen onay/policy adımları\n${pendingApprovalNotes.map((line) => `- ${line}`).join("\n")}`
      : "",
  ].filter(Boolean);

  steps.push({
    type: "final_answer",
    content: truncate(finalNarrative, 4_000),
    timestamp: Date.now(),
  });

  return {
    summary: "Otonom ajan planını çalıştırdım ve güvenli alt adımları tamamladım.",
    details: detailSections.join("\n\n"),
    nextSuggestions: pendingApprovalNotes.length > 0
      ? [
          "Bekleyen onay adımlarını göster",
          "Bu çıktıyı admin iç notuna dönüştür",
          "Aynı planı daha dar bir hedefle tekrar çalıştır",
        ]
      : [
          "Bu çıktıyı admin iç notuna dönüştür",
          "Sonucu kontrol listesine çevir",
          "Aynı konu için ikinci bir çalışma dalı aç",
        ],
    steps,
    toolStats: {
      totalUnifiedTools: 0,
      internalCatalogSize: 0,
      routedInternalToolCount: 0,
      autonomousToolCount: 0,
      primaryWorkerTarget: "llm",
      workerTargets: ["llm"],
      usedToolNames: Array.from(new Set(steps.map((step) => step.toolName).filter((toolName): toolName is string => Boolean(toolName)))),
      browserLane: false,
      readOnlyExploration: false,
    },
  };
}

export interface AgentFallbackResult {
  summary: string;
  details: string;
  nextSuggestions: string[];
  steps: ReActStep[];
  toolStats: {
    totalUnifiedTools: number;
    internalCatalogSize: number;
    routedInternalToolCount: number;
    autonomousToolCount: number;
    primaryWorkerTarget: WorkerTarget;
    workerTargets: WorkerTarget[];
    usedToolNames: string[];
    browserLane: boolean;
    readOnlyExploration: boolean;
  };
}

export async function executeAgentFallback(input: {
  commandText: string;
  scope: CopilotScope;
  projectId?: string | null;
  skillIds?: string[];
  conversationContext?: string | null;
  parsedIntent?: string | null;
  parsedInput?: Record<string, unknown> | null;
  missingFields?: string[];
  toolContext: ToolContext;
}): Promise<AgentFallbackResult> {
  const allInternalTools = filterSelectableSdkTools(createAllTools(input.toolContext.supabase as any));
  const routedInternalTools = filterSelectableSdkTools(selectTools(input.commandText, input.toolContext.supabase as any));
  const wrappedAllInternalTools = Object.entries(allInternalTools).map(([toolName, tool]) => wrapSdkTool(toolName, tool));
  const wrappedPrioritizedTools = Object.entries(routedInternalTools).map(([toolName, tool]) => wrapSdkTool(toolName, tool));
  const autonomousTools = filterSelectableAgentTools(getAllAgentTools());
  const unifiedTools = dedupeTools([...wrappedPrioritizedTools, ...autonomousTools, ...wrappedAllInternalTools]);
  const registryHint = buildToolRegistryHint(unifiedTools, [...wrappedPrioritizedTools, ...autonomousTools]);
  const selectedProject = await resolveCopilotProject(input.projectId, input.scope, input.commandText);
  const selectedSkills = await selectCopilotSkills({
    skillIds: input.skillIds,
    project: selectedProject,
    scope: input.scope,
    commandText: input.commandText,
  });
  const projectHint = selectedProject
    ? `Project context: ${selectedProject.name}\n${selectedProject.instructions}`
    : "Project context: varsayılan global çalışma alanı.";
  const skillHint = selectedSkills.length > 0
    ? `Aktif skill'ler:\n${selectedSkills.map((skill) => `- ${skill.name}: ${skill.instructions}`).join("\n")}`
    : "Aktif skill seçilmedi; yine de uygun araçları kullan.";

  if (isJarvisObserverCommand(input.commandText)) {
    const jarvisResponse = await buildJarvisObserverResponse(input.commandText);
    return {
      summary: jarvisResponse.summary,
      details: truncate(jarvisResponse.details, 8_000),
      nextSuggestions: jarvisResponse.nextSuggestions,
      steps: jarvisResponse.steps,
      toolStats: buildToolStats({
        unifiedTools,
        allInternalTools,
        routedInternalTools,
        autonomousTools,
        steps: jarvisResponse.steps,
      }),
    };
  }

  const readOnlyExploration = await runReadOnlyExplorationRecovery({
    commandText: input.commandText,
    scope: input.scope,
    tools: unifiedTools,
    toolContext: input.toolContext,
  });
  if (readOnlyExploration) {
    return {
      summary: "Ajan zinciri read-only veri keşfini tamamladı.",
      details: truncate(readOnlyExploration.details, 8_000),
      nextSuggestions: [
        "Aynı tablo için daha dar filtre uygula",
        "Bu sonuçları artifact olarak kaydet",
        "İlgili müşteri veya şirket özetini aç",
      ],
      steps: readOnlyExploration.steps,
      toolStats: buildToolStats({
        unifiedTools,
        allInternalTools,
        routedInternalTools,
        autonomousTools,
        steps: readOnlyExploration.steps,
      }),
    };
  }

  const browserOperatorRecovery = await runBrowserOperatorRecovery({
    commandText: input.commandText,
    scope: input.scope,
    tools: unifiedTools,
    toolContext: input.toolContext,
  });
  if (browserOperatorRecovery) {
    return {
      summary: "Sayfayı açtım ve görünür içeriği çıkardım.",
      details: truncate(browserOperatorRecovery.details, 8_000),
      nextSuggestions: [
        "Sayfadaki CTA ve linkleri ayrı listele",
        "Aynı sayfa için artifact özeti üret",
        "Benzer ikinci bir URL ile karşılaştır",
      ],
      steps: browserOperatorRecovery.steps,
      toolStats: buildToolStats({
        unifiedTools,
        allInternalTools,
        routedInternalTools,
        autonomousTools,
        steps: browserOperatorRecovery.steps,
      }),
    };
  }

  const customerReadRecovery = await runCustomerReadRecovery(input);
  if (customerReadRecovery) {
    const composedCustomerRecovery = await buildComposedCustomerRecoveryResponse({
      commandText: input.commandText,
      scope: input.scope,
      recovery: customerReadRecovery,
      toolContext: input.toolContext,
    });

    const activeRecovery = composedCustomerRecovery ?? {
      summary: buildCustomerReadSummary(input.commandText, input.scope),
      details: customerReadRecovery.details,
      nextSuggestions: [
        "Son formu ayrıntılı aç",
        "Eksik alanları iç görev taslağına çevir",
        "Bu özetten müşteriye gidecek kısa not taslağı yaz",
      ],
      steps: customerReadRecovery.steps,
    };

    return {
      summary: activeRecovery.summary,
      details: truncate(activeRecovery.details, 8_000),
      nextSuggestions: activeRecovery.nextSuggestions,
      steps: activeRecovery.steps,
      toolStats: buildToolStats({
        unifiedTools,
        allInternalTools,
        routedInternalTools,
        autonomousTools,
        steps: activeRecovery.steps,
      }),
    };
  }

  const conversationalSummaryRecovery = buildConversationSummaryFromConversation({
    commandText: input.commandText,
    conversationContext: input.conversationContext,
    scope: input.scope,
  });
  if (conversationalSummaryRecovery) {
    return {
      summary: conversationalSummaryRecovery.summary,
      details: truncate(conversationalSummaryRecovery.details, 8_000),
      nextSuggestions: conversationalSummaryRecovery.nextSuggestions,
      steps: conversationalSummaryRecovery.steps,
      toolStats: buildToolStats({
        unifiedTools,
        allInternalTools,
        routedInternalTools,
        autonomousTools,
        steps: conversationalSummaryRecovery.steps,
      }),
    };
  }

  const customerNoteRecovery = buildCustomerFacingNoteFromConversation({
    commandText: input.commandText,
    conversationContext: input.conversationContext,
    scope: input.scope,
  });
  if (customerNoteRecovery) {
    return {
      summary: customerNoteRecovery.summary,
      details: truncate(customerNoteRecovery.details, 8_000),
      nextSuggestions: customerNoteRecovery.nextSuggestions,
      steps: customerNoteRecovery.steps,
      toolStats: buildToolStats({
        unifiedTools,
        allInternalTools,
        routedInternalTools,
        autonomousTools,
        steps: customerNoteRecovery.steps,
      }),
    };
  }

  const shorterCustomerNoteRecovery = buildShorterCustomerNoteFromConversation({
    commandText: input.commandText,
    conversationContext: input.conversationContext,
    scope: input.scope,
  });
  if (shorterCustomerNoteRecovery) {
    return {
      summary: shorterCustomerNoteRecovery.summary,
      details: truncate(shorterCustomerNoteRecovery.details, 8_000),
      nextSuggestions: shorterCustomerNoteRecovery.nextSuggestions,
      steps: shorterCustomerNoteRecovery.steps,
      toolStats: buildToolStats({
        unifiedTools,
        allInternalTools,
        routedInternalTools,
        autonomousTools,
        steps: shorterCustomerNoteRecovery.steps,
      }),
    };
  }

  const englishCustomerNoteRecovery = buildEnglishCustomerNoteFromConversation({
    commandText: input.commandText,
    conversationContext: input.conversationContext,
    scope: input.scope,
  });
  if (englishCustomerNoteRecovery) {
    return {
      summary: englishCustomerNoteRecovery.summary,
      details: truncate(englishCustomerNoteRecovery.details, 8_000),
      nextSuggestions: englishCustomerNoteRecovery.nextSuggestions,
      steps: englishCustomerNoteRecovery.steps,
      toolStats: buildToolStats({
        unifiedTools,
        allInternalTools,
        routedInternalTools,
        autonomousTools,
        steps: englishCustomerNoteRecovery.steps,
      }),
    };
  }

  const customerNotificationRecovery = buildCustomerNotificationDraftFromConversation({
    commandText: input.commandText,
    conversationContext: input.conversationContext,
    scope: input.scope,
  });
  if (customerNotificationRecovery) {
    return {
      summary: customerNotificationRecovery.summary,
      details: truncate(customerNotificationRecovery.details, 8_000),
      nextSuggestions: customerNotificationRecovery.nextSuggestions,
      steps: customerNotificationRecovery.steps,
      toolStats: buildToolStats({
        unifiedTools,
        allInternalTools,
        routedInternalTools,
        autonomousTools,
        steps: customerNotificationRecovery.steps,
      }),
    };
  }

  const customerTaskDraftRecovery = buildCustomerFacingTaskDraftFromConversation({
    commandText: input.commandText,
    conversationContext: input.conversationContext,
    scope: input.scope,
  });
  if (customerTaskDraftRecovery) {
    return {
      summary: customerTaskDraftRecovery.summary,
      details: truncate(customerTaskDraftRecovery.details, 8_000),
      nextSuggestions: customerTaskDraftRecovery.nextSuggestions,
      steps: customerTaskDraftRecovery.steps,
      toolStats: buildToolStats({
        unifiedTools,
        allInternalTools,
        routedInternalTools,
        autonomousTools,
        steps: customerTaskDraftRecovery.steps,
      }),
    };
  }

  const autonomousDelegation = await runAutonomousDelegation({
    commandText: input.commandText,
    scope: input.scope,
    toolContext: input.toolContext,
  });
  if (autonomousDelegation) {
    return {
      summary: autonomousDelegation.summary,
      details: truncate(autonomousDelegation.details, 8_000),
      nextSuggestions: autonomousDelegation.nextSuggestions,
      steps: autonomousDelegation.steps,
      toolStats: buildToolStats({
        unifiedTools,
        allInternalTools,
        routedInternalTools,
        autonomousTools,
        steps: autonomousDelegation.steps,
      }),
    };
  }

  const deterministicResearch = isResearchCommand(input.commandText)
    ? await runDeterministicResearch(input.commandText, unifiedTools, input.toolContext)
    : null;
  const shouldShortCircuitResearch = Boolean(
    deterministicResearch && /doğrulanmış e-posta bulundu|İncelenen kaynaklar/i.test(deterministicResearch.details),
  );

  if (shouldShortCircuitResearch && deterministicResearch) {
    return {
      summary: "Araştırmayı çalıştırdım ve doğrulanmış sonuçları topladım.",
      details: truncate(deterministicResearch.details, 8_000),
      nextSuggestions: [
        "Sonuçları CSV tabloya dönüştür",
        "Bulunan kaynakları lead listesine aktar",
        "Araştırmayı alt sektör ve şehir bazında derinleştir",
      ],
      steps: deterministicResearch.steps,
      toolStats: buildToolStats({
        unifiedTools,
        allInternalTools,
        routedInternalTools,
        autonomousTools,
        steps: deterministicResearch.steps,
      }),
    };
  }

  const jarvisContext = await buildJarvisLiveContext(input.commandText);

  const result = await runReActLoop(
    input.commandText,
    [
      buildScopeContext(input.scope),
      input.conversationContext ? `Yakın sohbet geçmişi:\n${input.conversationContext}` : "",
      projectHint,
      skillHint,
      "Atlas Admin Copilot'in gerçek ajan yürütme katmanısın.",
      jarvisContext,
      input.parsedIntent ? `Parser hint: ${input.parsedIntent}` : "",
      input.parsedInput && Object.keys(input.parsedInput).length > 0
        ? `Parser alan ipuçları: ${truncate(JSON.stringify(input.parsedInput), 900)}`
        : "",
      input.missingFields && input.missingFields.length > 0
        ? `Eksik alanlar: ${input.missingFields.join(", ")}. Gerekirse tek kısa follow-up ile netleştir, statik hata dili kullanma.`
        : "",
      "Açık uçlu araştırma, lead toplama, şirket/email bulma, karşılaştırma, özetleme ve operasyon araştırması isteklerinde 'desteklenmiyor' deme.",
      "Önce dahili katalogdaki query/analytics araçlarını, sonra web araştırma araçlarını kullan.",
      "Read-only veri keşfi için query_database ve count_records gibi güvenli araçları doğrudan kullan.",
      "Kullanıcı follow-up mesaj gönderirse önce yakın sohbet geçmişine bak ve gereksiz yere aynı bilgileri tekrar sorma.",
      "Mutasyon veya hassas aksiyon gerekiyorsa ilgili araç approval_required dönebilir; böyle durumda kullanıcıya neyin neden bloklandığını söyle ve güvenli alternatif üret.",
      "Kullanıcı 50 kayıt isterse, bulabildiğin kadarını yapılandırılmış biçimde ver; eksik kalan kısmı dürüstçe belirt ama boş cevap verme.",
      "Cevabı Türkçe ver. Mümkünse başlıklar, maddeler ve e-posta/site listeleri üret.",
      registryHint,
    ].join("\n\n"),
    {
      maxSteps: 12,
      maxTokensPerStep: 900,
      timeoutMs: 120_000,
      tools: unifiedTools,
      systemPrompt: `Sen Atlas Admin Copilot'in action modeli + verifier destekli ajan yürütme katmanısın.
Aynı zamanda Jarvis — Atlas platformunun canlı yapay zeka danışmanısın.

KURALLAR:
- SADECE Türkçe yaz.
- "desteklenmiyor" deme; önce araçları dene.
- Araştırma isteklerinde sonuçları olabildiğince somut listele.
- Yeterli veri yoksa nedenini açıkla ve en iyi mevcut ara sonucu üret.
- Hassas mutasyonları approval_required olarak ele al ve doğrudan çalıştırma.
- Her adımda düşün, araç seç, gözlemle ve sonunda net cevap ver.

JARVIS YETENEKLERİN:
- get_jarvis_status: Açık bulguları, fix önerilerini, sweep durumunu oku.
- trigger_jarvis_sweep: Tüm Atlas yüzeylerini Playwright ile tara.
- prepare_jarvis_fix: Bir bulgu için autofix branch hazırla.
Kullanıcı sistem durumu, eksikler, bulgular, tarama, fix veya öneri sorduğunda bu araçları kullan.`,
    },
    input.toolContext,
  );

  const hasObservedRealWorld = result.steps.some(
    (step) =>
      step.type === "observation" &&
      step.toolResult?.success === true &&
      Boolean(step.toolName) &&
      step.toolName !== "0",
  );
  const fallbackResearch =
    isResearchCommand(input.commandText) && !hasObservedRealWorld
      ? deterministicResearch ?? await runDeterministicResearch(input.commandText, unifiedTools, input.toolContext)
      : null;

  const finalSteps = fallbackResearch ? [...fallbackResearch.steps] : result.steps;
  const finalDetails =
    fallbackResearch?.details
    ?? sanitizeAgentAnswer(result.finalAnswer ?? "")
    ?? "Bu turda teslime uygun net bir sonuç çıkaramadım. Aynı sohbetten daha dar bir adımla devam edebiliriz.";
  const success = Boolean(fallbackResearch) || result.success || hasObservedRealWorld;
  const summary = buildConversationalSummary({
    commandText: input.commandText,
    details: finalDetails,
    success,
    scope: input.scope,
  });

  const nextSuggestions = [
    "Sonucu CSV tabloya dönüştür",
    "Bulunan kayıtları müşteri veya lead listesine aktar",
    "Aynı araştırmayı farklı alt sektörler için genişlet",
  ];

  return {
    summary,
    details: truncate(finalDetails, 8_000),
    nextSuggestions,
    steps: finalSteps,
    toolStats: buildToolStats({
      unifiedTools,
      allInternalTools,
      routedInternalTools,
      autonomousTools,
      steps: finalSteps,
    }),
  };
}
