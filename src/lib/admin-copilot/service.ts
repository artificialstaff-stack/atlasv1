/* eslint-disable @typescript-eslint/no-explicit-any */
import { createHash } from "node:crypto";
import { createAdminClient } from "@/lib/supabase/admin";
import { executeAgentFallback } from "./agent-fallback";
import {
  createOperatorJob,
  extractOperatorTarget,
  getOperatorJob,
  listOperatorJobs,
  shouldRequireOperatorJob,
  updateOperatorJobStatus,
} from "./operator-jobs";
import { parseCommand } from "./parser";
import { getToolPolicy } from "./policy";
import { resolveCopilotProject } from "./projects";
import { selectCopilotSkills } from "./skills";
import {
  appendRunStep,
  createApproval,
  createRun,
  ensureSession,
  getConversationMemory,
  getConversationRuns,
  getActiveSessionRuns,
  getDashboardData,
  getLatestSessionRun,
  getRecentConversations,
  getRunBundle,
  resolveApproval,
  updateConversationMemoryState,
  updateSessionConversationState,
  updateRun,
} from "./store";
import { deliverArtifactToCustomer, executeIntent, getCustomer360 } from "./tools";
import type {
  CommandParseResult,
  CommandIntent,
  CopilotArtifactRecord,
  CopilotCommandResponse,
  CopilotConversationMemoryRecord,
  CopilotDashboardData,
  CopilotMode,
  CopilotOperatorJobRecord,
  CopilotRunRecord,
  CopilotScope,
  CopilotTimelineStep,
  CopilotWorkspaceStatus,
} from "./types";
import type { ToolContextCookie } from "@/lib/ai/autonomous/react-engine";

function adminDb() {
  return createAdminClient() as any;
}

function buildIdempotencyKey(
  mode: CopilotMode,
  scope: CopilotScope,
  intent: CommandIntent,
  input: Record<string, unknown>,
  projectId?: string | null,
  skillIds?: string[],
  requestId?: string | null,
) {
  if (!requestId) {
    return null;
  }

  return createHash("sha256")
    .update(JSON.stringify({
      mode,
      scope,
      intent,
      input,
      projectId: projectId ?? null,
      skillIds: skillIds ?? [],
      requestId,
    }))
    .digest("hex");
}

function getCustomerIdFromInput(input: Record<string, unknown>): string | undefined {
  const candidate = input.userId ?? input.customerId;
  return typeof candidate === "string" ? candidate : undefined;
}

type CustomerDirectoryEntry = {
  id: string;
  email?: string | null;
  first_name?: string | null;
  last_name?: string | null;
  company_name?: string | null;
};

function condenseText(value: string | null | undefined, maxLength = 220) {
  const normalized = (value ?? "").replace(/\s+/g, " ").trim();
  if (!normalized) {
    return "";
  }

  return normalized.length > maxLength ? `${normalized.slice(0, maxLength - 1)}…` : normalized;
}

function buildConversationContext(runs: Pick<CopilotRunRecord, "commandText" | "summary" | "responseText">[], currentCommandText: string) {
  const turns = runs
    .slice(-6)
    .map((run) => {
      const userTurn = condenseText(run.commandText, 180);
      const assistantTurn = condenseText(run.responseText ?? run.summary ?? "", 220);

      if (!userTurn && !assistantTurn) {
        return null;
      }

      return [
        userTurn ? `Kullanıcı: ${userTurn}` : null,
        assistantTurn ? `Atlas: ${assistantTurn}` : null,
      ].filter(Boolean).join("\n");
    })
    .filter((turn): turn is string => Boolean(turn));

  if (turns.length === 0) {
    return null;
  }

  return [
    "Bu istek devam eden bir sohbetin parçası. Kullanıcı son turda tekrar etmese bile yakın geçmişi referans al.",
    ...turns,
    `Yeni mesaj: ${condenseText(currentCommandText, 220)}`,
  ].join("\n\n");
}

export function buildPersistedConversationMemoryContext(
  memory: Pick<
    CopilotConversationMemoryRecord,
    "projectName" | "workingGoal" | "memorySummary" | "memoryFacts" | "handoffNote" | "handoffChecklist" | "workspaceStatus" | "workspaceOwnerLabel"
  > | null | undefined,
) {
  if (!memory) {
    return null;
  }

  const sections: string[] = [];

  if (memory.projectName) {
    sections.push(`Pinned workspace: ${condenseText(memory.projectName, 140)}`);
  }

  if (memory.workingGoal) {
    sections.push(`Çalışma hedefi: ${condenseText(memory.workingGoal, 240)}`);
  }

  if (memory.memorySummary) {
    sections.push(`Kalıcı özet: ${condenseText(memory.memorySummary, 260)}`);
  }

  if (Array.isArray(memory.memoryFacts) && memory.memoryFacts.length > 0) {
    sections.push([
      "Kalıcı gerçekler:",
      ...memory.memoryFacts.slice(0, 6).map((fact) => `- ${condenseText(fact, 200)}`),
    ].join("\n"));
  }

  if (memory.handoffNote) {
    sections.push(`Handoff note: ${condenseText(memory.handoffNote, 240)}`);
  }

  if (memory.workspaceOwnerLabel && memory.workspaceStatus !== "unclaimed") {
    sections.push(`Workspace owner: ${condenseText(memory.workspaceOwnerLabel, 160)} (${memory.workspaceStatus})`);
  }

  if (Array.isArray(memory.handoffChecklist) && memory.handoffChecklist.length > 0) {
    sections.push([
      "Handoff checklist:",
      ...memory.handoffChecklist.slice(0, 6).map((item) => `- ${condenseText(item, 180)}`),
    ].join("\n"));
  }

  return sections.length > 0 ? sections.join("\n\n") : null;
}

type ConversationWorkspaceAction = "claim" | "release" | "handoff_ready" | "shared";

type ConversationWorkspaceActor = {
  id: string;
  email?: string | null;
};

function normalizeChecklist(items: string[] | null | undefined) {
  const unique = new Set<string>();
  const result: string[] = [];

  for (const item of items ?? []) {
    const normalized = item.replace(/\s+/g, " ").trim();
    if (!normalized) {
      continue;
    }

    const key = normalized.toLocaleLowerCase("tr-TR");
    if (unique.has(key)) {
      continue;
    }

    unique.add(key);
    result.push(normalized);
  }

  return result.slice(0, 8);
}

function buildWorkspaceOwnerLabel(actor: ConversationWorkspaceActor) {
  if (actor.email?.trim()) {
    return actor.email.trim();
  }

  return actor.id;
}

export function resolveConversationWorkspaceState(
  current: Pick<
    CopilotConversationMemoryRecord,
    "workspaceStatus" | "workspaceOwnerId" | "workspaceOwnerLabel" | "workspaceOwnerEmail" | "workspaceClaimedAt" | "handoffChecklist"
  > | null | undefined,
  input: {
    actor: ConversationWorkspaceActor;
    workspaceAction?: ConversationWorkspaceAction | null;
    handoffChecklist?: string[] | null;
    bypassOwnership?: boolean;
  },
) {
  const checklist = normalizeChecklist(input.handoffChecklist ?? current?.handoffChecklist ?? []);
  const actorId = input.actor.id;
  const actorEmail = input.actor.email?.trim() || null;
  const lockedByAnotherAdmin = Boolean(
    current?.workspaceOwnerId
    && current.workspaceOwnerId !== actorId
    && current.workspaceStatus === "claimed",
  );

  if (lockedByAnotherAdmin && !input.bypassOwnership) {
    throw new Error(`${current?.workspaceOwnerLabel ?? "Bu sohbet"} şu an başka bir admin tarafından sahiplenildi.`);
  }

  const now = new Date().toISOString();
  const workspaceAction = input.workspaceAction ?? null;
  const next = {
    workspaceStatus: (current?.workspaceStatus ?? "unclaimed") as CopilotWorkspaceStatus,
    workspaceOwnerId: current?.workspaceOwnerId ?? null,
    workspaceOwnerLabel: current?.workspaceOwnerLabel ?? null,
    workspaceOwnerEmail: current?.workspaceOwnerEmail ?? null,
    workspaceClaimedAt: current?.workspaceClaimedAt ?? null,
    handoffChecklist: checklist,
  };

  if (!workspaceAction) {
    return next;
  }

  if (workspaceAction === "release") {
    if (current?.workspaceOwnerId && current.workspaceOwnerId !== actorId && !input.bypassOwnership) {
      throw new Error("Bu sohbeti yalnız sahibi olan admin bırakabilir.");
    }

    return {
      workspaceStatus: "unclaimed" as CopilotWorkspaceStatus,
      workspaceOwnerId: null,
      workspaceOwnerLabel: null,
      workspaceOwnerEmail: null,
      workspaceClaimedAt: null,
      handoffChecklist: checklist,
    };
  }

  const ownerLabel = buildWorkspaceOwnerLabel(input.actor);
  const ownerChanged = next.workspaceOwnerId !== actorId;
  next.workspaceOwnerId = actorId;
  next.workspaceOwnerLabel = ownerLabel;
  next.workspaceOwnerEmail = actorEmail;
  next.workspaceClaimedAt = ownerChanged ? now : (next.workspaceClaimedAt ?? now);

  if (workspaceAction === "claim") {
    next.workspaceStatus = "claimed";
    return next;
  }

  if (workspaceAction === "handoff_ready") {
    next.workspaceStatus = "handoff_ready";
    return next;
  }

  next.workspaceStatus = "shared";
  return next;
}

function assertConversationWorkspaceAccess(
  memory: Pick<CopilotConversationMemoryRecord, "workspaceStatus" | "workspaceOwnerId" | "workspaceOwnerLabel"> | null | undefined,
  requesterUserId: string,
) {
  if (!memory) {
    return;
  }

  if (memory.workspaceStatus === "claimed" && memory.workspaceOwnerId && memory.workspaceOwnerId !== requesterUserId) {
    throw new Error(`${memory.workspaceOwnerLabel ?? "Bu thread"} şu an başka bir admin tarafından sahiplenildi. Handoff veya release bekleyin.`);
  }
}

async function syncConversationWorkspaceState(input: {
  requesterUserId: string;
  conversationId: string | null | undefined;
  actor: ConversationWorkspaceActor;
  workspaceAction?: ConversationWorkspaceAction | null;
  handoffChecklist?: string[] | null;
  handoffNote?: string | null;
  operatorJobStatus?: CopilotConversationMemoryRecord["operatorJobStatus"];
  bypassOwnership?: boolean;
}) {
  if (!input.conversationId) {
    return;
  }

  const currentMemory = await getConversationMemory(input.requesterUserId, input.conversationId);
  if (!currentMemory) {
    return;
  }

  const workspaceState = resolveConversationWorkspaceState(currentMemory, {
    actor: input.actor,
    workspaceAction: input.workspaceAction,
    handoffChecklist: input.handoffChecklist ?? currentMemory.handoffChecklist,
    bypassOwnership: input.bypassOwnership,
  });

  await updateConversationMemoryState({
    conversationId: input.conversationId,
    suggestedTitle: currentMemory.title,
    metadataPatch: {
      ...workspaceState,
      handoffNote: input.handoffNote ?? currentMemory.handoffNote ?? null,
      operatorJobStatus: input.operatorJobStatus ?? currentMemory.operatorJobStatus ?? null,
      memoryUpdatedAt: new Date().toISOString(),
    },
  });
}

function combineConversationContext(...parts: Array<string | null | undefined>) {
  const normalized = parts
    .map((part) => (part ?? "").trim())
    .filter((part, index, array) => part.length > 0 && array.indexOf(part) === index);

  return normalized.length > 0 ? normalized.join("\n\n") : null;
}

function normalizeSearchableText(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^\p{L}\p{N}@._-]+/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function scoreCustomerDirectoryMatch(commandText: string, entry: CustomerDirectoryEntry): number {
  const normalizedCommand = normalizeSearchableText(commandText);
  const fullName = [entry.first_name, entry.last_name].filter(Boolean).join(" ").trim();
  const normalizedFullName = fullName ? normalizeSearchableText(fullName) : "";
  const normalizedCompany = entry.company_name ? normalizeSearchableText(entry.company_name) : "";
  const normalizedEmail = entry.email ? normalizeSearchableText(entry.email) : "";

  let score = 0;

  if (normalizedEmail && normalizedCommand.includes(normalizedEmail)) {
    score = Math.max(score, 100);
  }

  if (normalizedFullName && normalizedCommand.includes(normalizedFullName)) {
    score = Math.max(score, 95);
  }

  if (normalizedCompany && normalizedCommand.includes(normalizedCompany)) {
    score = Math.max(score, 90);
  }

  const fullNameTokens = normalizedFullName.split(" ").filter((token) => token.length > 1);
  if (fullNameTokens.length >= 2 && fullNameTokens.every((token) => normalizedCommand.includes(token))) {
    score = Math.max(score, 80);
  }

  const companyTokens = normalizedCompany.split(" ").filter((token) => token.length > 2);
  if (companyTokens.length >= 2 && companyTokens.every((token) => normalizedCommand.includes(token))) {
    score = Math.max(score, 74);
  }

  return score;
}

export function resolveCustomerScopeFromDirectory(
  commandText: string,
  directory: CustomerDirectoryEntry[],
): CopilotScope | null {
  const ranked = directory
    .map((entry) => ({
      entry,
      score: scoreCustomerDirectoryMatch(commandText, entry),
    }))
    .filter((candidate) => candidate.score >= 74)
    .sort((left, right) => right.score - left.score);

  if (ranked.length === 0) {
    return null;
  }

  const [best, runnerUp] = ranked;
  if (runnerUp && best.score === runnerUp.score && best.entry.id !== runnerUp.entry.id) {
    return null;
  }

  const label =
    [best.entry.first_name, best.entry.last_name].filter(Boolean).join(" ").trim()
    || best.entry.company_name
    || best.entry.email
    || best.entry.id;

  return {
    type: "customer",
    refId: best.entry.id,
    label,
  };
}

async function resolveScopeForCommand(commandText: string, scope: CopilotScope): Promise<CopilotScope> {
  if (scope.type !== "global") {
    return scope;
  }

  const { data } = await adminDb()
    .from("users")
    .select("id,email,first_name,last_name,company_name")
    .order("created_at", { ascending: false })
    .limit(200);

  const resolvedScope = resolveCustomerScopeFromDirectory(
    commandText,
    (data ?? []) as CustomerDirectoryEntry[],
  );

  return resolvedScope ?? scope;
}

export function shouldClarifyUnsupportedCommand(commandText: string, scope: CopilotScope): boolean {
  const tokens = normalizeSearchableText(commandText).split(" ").filter(Boolean);
  const genericTokens = new Set([
    "ne",
    "kim",
    "hangi",
    "kaç",
    "göndermiş",
    "durum",
    "durumda",
    "durumu",
    "var",
    "mı",
    "mi",
    "mu",
    "mü",
    "oku",
    "okur",
    "okurmusun",
    "listele",
    "göster",
    "ozetle",
    "özetle",
  ]);
  const specificTokens = tokens.filter((token) => !genericTokens.has(token));

  if (scope.type === "global") {
    return specificTokens.length === 0;
  }

  return specificTokens.length === 0;
}

function isContextualFollowUpMessage(commandText: string) {
  const normalized = normalizeSearchableText(commandText);
  if (!normalized) {
    return false;
  }

  return /(devam et|peki|tamam|sonra|hangisi|neden|niye|ilkini|ikincisini|onu|bunu|bunlari|bunlari|detay ver|daha detay|daha kisa|daha kisa|gonder|gonderelim|portala gonder|musteriye gonder|paylas)/i.test(normalized);
}

export function shouldBypassConversationScopeInheritance(commandText: string) {
  const normalized = normalizeSearchableText(commandText);
  if (!normalized) {
    return false;
  }

  return /(schema|sema|şema|tablo|tables?|table|kolon|columns?|veritabani|veritabanı|database|db|sql|satir|satır|sütun|row)/i.test(normalized);
}

export function buildChatMemoryPreview(
  runs: Pick<CopilotRunRecord, "commandText" | "summary" | "responseText">[],
  currentCommandText: string,
) {
  return buildConversationContext(runs, currentCommandText);
}

export function inheritConversationScope(
  requestedScope: CopilotScope,
  resolvedScope: CopilotScope,
  conversationRuns: CopilotRunRecord[],
): CopilotScope {
  if (requestedScope.type !== "global" || resolvedScope.type !== "global" || conversationRuns.length === 0) {
    return resolvedScope;
  }

  const previousRun = conversationRuns[conversationRuns.length - 1];
  if (!previousRun || previousRun.scopeType === "global") {
    return resolvedScope;
  }

  return {
    type: previousRun.scopeType,
    refId: previousRun.scopeRefId ?? undefined,
    label: typeof previousRun.metadata?.scopeLabel === "string" ? previousRun.metadata.scopeLabel : null,
  };
}

async function applyConversationPreviewScope(
  requestedScope: CopilotScope,
  resolvedScope: CopilotScope,
  conversationPreview?: string | null,
): Promise<CopilotScope> {
  if (requestedScope.type !== "global" || resolvedScope.type !== "global" || !conversationPreview?.trim()) {
    return resolvedScope;
  }

  return resolveScopeForCommand(conversationPreview, resolvedScope);
}

function applyConversationScopeHint(
  requestedScope: CopilotScope,
  resolvedScope: CopilotScope,
  conversationScopeHint?: CopilotScope | null,
): CopilotScope {
  if (requestedScope.type !== "global" || resolvedScope.type !== "global" || !conversationScopeHint || conversationScopeHint.type === "global") {
    return resolvedScope;
  }

  return conversationScopeHint;
}

function normalizeInputForScope(scope: CopilotScope, input: Record<string, unknown>): Record<string, unknown> {
  if (scope.type === "customer" && scope.refId) {
    const next = { ...input };
    if (!next.userId) next.userId = scope.refId;
    if (!next.customerId) next.customerId = scope.refId;

    return next;
  }

  if (scope.type === "company" && scope.refId && !input.companyId) {
    return { ...input, companyId: scope.refId };
  }

  if (scope.type === "marketplace" && scope.refId && !input.marketplaceId) {
    return { ...input, marketplaceId: scope.refId };
  }

  return input;
}

function detectScopeConflict(scope: CopilotScope, input: Record<string, unknown>) {
  if (scope.type === "customer" && scope.refId) {
    const targetCustomerId = getCustomerIdFromInput(input);
    if (targetCustomerId && targetCustomerId !== scope.refId) {
      return {
        type: "customer" as const,
        targetRefId: targetCustomerId,
      };
    }
  }

  if (scope.type === "company" && scope.refId) {
    const companyId = typeof input.companyId === "string" ? input.companyId : null;
    if (companyId && companyId !== scope.refId) {
      return {
        type: "company" as const,
        targetRefId: companyId,
      };
    }
  }

  if (scope.type === "marketplace" && scope.refId) {
    const marketplaceId = typeof input.marketplaceId === "string" ? input.marketplaceId : null;
    if (marketplaceId && marketplaceId !== scope.refId) {
      return {
        type: "marketplace" as const,
        targetRefId: marketplaceId,
      };
    }
  }

  return null;
}

function buildScopeConflictConversation(scope: CopilotScope) {
  if (scope.type === "customer") {
    return {
      summary: `Şu an ${scope.label ?? "seçili müşteri"} sohbetindesiniz.`,
      details: "İsterseniz bu müşteri için devam edeyim ya da scope'u değiştirip diğer kayıtla yeni sohbet açın.",
      nextSuggestions: ["Bu müşteri için son formları oku", "Bu müşteri için açık görevleri listele", "Scope'u değiştirip tekrar sor"],
    };
  }

  if (scope.type === "company") {
    return {
      summary: `Şu an ${scope.label ?? "seçili şirket"} bağlamındasınız.`,
      details: "Bu isteği seçili şirket için sürdürebilirim. Başka bir şirket kastediyorsanız önce scope'u değiştirin.",
      nextSuggestions: ["Bu şirket için durumu özetle", "Bu şirketin belgelerini göster", "Scope'u değiştirip tekrar sor"],
    };
  }

  return {
    summary: `Şu an ${scope.label ?? "seçili pazaryeri"} bağlamındasınız.`,
    details: "İsterseniz seçili hesap üzerinden devam edeyim. Farklı bir hesap için önce scope'u değiştirin.",
    nextSuggestions: ["Bu hesabın durumunu özetle", "Bu hesap için açık görevleri göster", "Scope'u değiştirip tekrar sor"],
  };
}

function extractContinuationEmail(input: string) {
  const match = /\b([A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,})\b/i.exec(input);
  return match?.[1]?.trim();
}

function extractContinuationState(input: string) {
  const match = /\b(Alabama|Alaska|Arizona|Arkansas|California|Colorado|Connecticut|Delaware|Florida|Georgia|Hawaii|Idaho|Illinois|Indiana|Iowa|Kansas|Kentucky|Louisiana|Maine|Maryland|Massachusetts|Michigan|Minnesota|Mississippi|Missouri|Montana|Nebraska|Nevada|New Hampshire|New Jersey|New Mexico|New York|North Carolina|North Dakota|Ohio|Oklahoma|Oregon|Pennsylvania|Rhode Island|South Carolina|South Dakota|Tennessee|Texas|Utah|Vermont|Virginia|Washington|West Virginia|Wisconsin|Wyoming)\b/i.exec(input);
  return match?.[1]?.trim();
}

function extractContinuationPlatform(input: string) {
  const lower = input.toLowerCase();
  if (lower.includes("amazon")) return "amazon";
  if (lower.includes("walmart")) return "walmart";
  if (lower.includes("ebay")) return "ebay";
  if (lower.includes("etsy")) return "etsy";
  if (lower.includes("shopify")) return "shopify";
  if (lower.includes("instagram")) return "instagram";
  if (lower.includes("facebook")) return "facebook";
  if (lower.includes("linkedin")) return "linkedin";
  if (lower.includes("tiktok")) return "tiktok";
  return undefined;
}

function extractContinuationAmount(input: string) {
  const match = /([0-9]+(?:[.,][0-9]+)?)/.exec(input);
  if (!match?.[1]) {
    return undefined;
  }
  return match[1].replace(",", ".");
}

function extractContinuationName(input: string) {
  const sanitized = input.replace(/\b([A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,})\b/gi, "").trim();
  const segments = sanitized.split(/[,;\n]/).map((segment) => segment.trim()).filter(Boolean);
  const candidate = segments.find((segment) =>
    /^[\p{L}]+(?:\s+[\p{L}]+){1,2}$/u.test(segment)
    && !/(amazon|walmart|ebay|etsy|shopify|instagram|facebook|tiktok|linkedin|llc|wyoming|texas|california)/i.test(segment),
  );
  return candidate;
}

function extractContinuationCompany(input: string, consumed: string[] = []) {
  const sanitized = input
    .replace(/\b([A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,})\b/gi, "")
    .split(/[,;\n]/)
    .map((segment) => segment.trim())
    .filter(Boolean);

  return sanitized.find((segment) =>
    !consumed.includes(segment)
    && segment.length > 2
    && !/^(amazon|walmart|ebay|etsy|shopify|instagram|facebook|tiktok|linkedin|wyoming|texas|california)$/i.test(segment),
  );
}

function buildContinuationCommand(
  previousRun: CopilotRunRecord | null,
  message: string,
): string | null {
  const pendingIntent = typeof previousRun?.metadata?.pendingIntent === "string"
    ? previousRun.metadata.pendingIntent
    : null;
  const pendingInput = previousRun?.metadata?.pendingInput && typeof previousRun.metadata.pendingInput === "object"
    ? previousRun.metadata.pendingInput as Record<string, unknown>
    : {};

  if (!pendingIntent) {
    return null;
  }

  if (pendingIntent === "customer.create_account") {
    const email = extractContinuationEmail(message) ?? (typeof pendingInput.email === "string" ? pendingInput.email : undefined);
    const fullName = extractContinuationName(message);
    const firstName = fullName?.split(/\s+/)[0] ?? (typeof pendingInput.firstName === "string" ? pendingInput.firstName : undefined);
    const lastName = fullName ? fullName.split(/\s+/).slice(1).join(" ") : (typeof pendingInput.lastName === "string" ? pendingInput.lastName : undefined);
    const companyName = extractContinuationCompany(message, fullName ? [fullName] : []) ?? (typeof pendingInput.companyName === "string" ? pendingInput.companyName : undefined);
    return `Yeni müşteri ekle. isim: ${[firstName, lastName].filter(Boolean).join(" ").trim()}; email: ${email ?? ""}; şirket: ${companyName ?? ""}`;
  }

  if (pendingIntent === "company.create_llc") {
    const companyName = extractContinuationCompany(message) ?? (typeof pendingInput.companyName === "string" ? pendingInput.companyName : undefined);
    const state = extractContinuationState(message) ?? (typeof pendingInput.stateOfFormation === "string" ? pendingInput.stateOfFormation : "Wyoming");
    return `LLC oluştur. company: ${companyName ?? ""}; state: ${state}`;
  }

  if (pendingIntent === "marketplace.create_account") {
    const platform = extractContinuationPlatform(message) ?? (typeof pendingInput.platform === "string" ? pendingInput.platform : undefined);
    const storeName = extractContinuationCompany(message) ?? (typeof pendingInput.storeName === "string" ? pendingInput.storeName : undefined);
    return `Pazaryeri hesabı aç. ${platform ?? ""}; mağaza adı: ${storeName ?? ""}`;
  }

  if (pendingIntent === "social.create_account") {
    const platform = extractContinuationPlatform(message) ?? (typeof pendingInput.platform === "string" ? pendingInput.platform : undefined);
    const accountName = extractContinuationCompany(message) ?? (typeof pendingInput.accountName === "string" ? pendingInput.accountName : undefined);
    return `Sosyal medya hesabı oluştur. ${platform ?? ""}; hesap adı: ${accountName ?? ""}`;
  }

  if (pendingIntent === "finance.create_record_draft") {
    const amount = extractContinuationAmount(message) ?? (typeof pendingInput.amount === "number" ? String(pendingInput.amount) : undefined);
    return `Finans kaydı taslağı oluştur. amount: ${amount ?? ""}; açıklama: ${message}`;
  }

  return `${previousRun?.commandText ?? ""}. Ek bilgi: ${message}`.trim();
}

function extractDeliveryFollowUp(message: string) {
  const lower = message.toLowerCase();
  const wantsDelivery = /(gönder|gonder|yayınla|yayinla|publish|paylaş|paylas)/i.test(message);
  const wantsPortal = /(portal|müşteri hesabı|musteri hesabi)/i.test(lower);
  const wantsEmail = /\bemail\b|\bmail\b/i.test(lower);
  const wantsNotification = /(bildirim|notification|uyarı|uyari)/i.test(lower);

  if (!wantsDelivery && !wantsPortal && !wantsEmail && !wantsNotification) {
    return null;
  }

  if (wantsEmail) {
    return { verb: "Email ile gönder", channel: "email" as const };
  }

  if (wantsNotification) {
    return { verb: "Bildirim gönder", channel: "in_app" as const };
  }

  return { verb: "Portala gönder", channel: "portal" as const };
}

async function buildContextualFollowUpCommand(input: {
  previousRun: CopilotRunRecord | null;
  parsed: CommandParseResult;
  message: string;
}) {
  const continuation = buildContinuationCommand(input.previousRun, input.message);
  if (continuation) {
    return continuation;
  }

  const deliveryFollowUp = extractDeliveryFollowUp(input.message);
  if (!deliveryFollowUp || !input.previousRun?.id) {
    return null;
  }

  const bundle = await getRunBundle(input.previousRun.id);
  const latestArtifact = [...bundle.artifacts]
    .reverse()
    .find((artifact) => artifact.status === "draft" || artifact.status === "published");

  if (!latestArtifact) {
    return null;
  }

  const customerId =
    (typeof input.parsed.input.customerId === "string" ? input.parsed.input.customerId : null)
    ?? latestArtifact.customerId
    ?? (input.previousRun.scopeType === "customer" ? input.previousRun.scopeRefId ?? null : null);

  if (!customerId) {
    return null;
  }

  return `${deliveryFollowUp.verb}. artifactId: ${latestArtifact.id}; customerId: ${customerId}; channel: ${deliveryFollowUp.channel}`;
}

function buildMissingFieldConversation(
  parsedIntent: CommandIntent,
  missingFields: string[],
  scope: CopilotScope,
) {
  if (parsedIntent === "customer.create_account") {
    return {
      summary: "Bunu yapabilirim. Yeni müşteri kaydını açmak için birkaç bilgi daha gerekiyor.",
      details: "Tek mesajda ad soyad, e-posta ve şirket adını yazın. Örnek: 'Ali Kaya, ali@example.com, Kaya Labs'.",
      nextSuggestions: ["Ali Kaya, ali@example.com, Kaya Labs", "Ali Kaya - ali@example.com - Kaya Labs"],
    };
  }

  if (parsedIntent === "company.create_llc") {
    return {
      summary: "LLC açılışını başlatabilirim ama önce şirket adını netleştirmem gerekiyor.",
      details: scope.type === "global"
        ? "Hangi müşteri için olduğunu ve şirket adını yazın. Örnek: 'Yusuf Keser için Atlas Growth LLC'."
        : "Şirket adını yazın. Örnek: 'Atlas Growth LLC, Wyoming'.",
      nextSuggestions: scope.type === "global"
        ? ["Yusuf Keser için Atlas Growth LLC", "Yusuf Keser için Atlas Commerce LLC, Wyoming"]
        : ["Atlas Growth LLC, Wyoming", "Atlas Commerce LLC"],
    };
  }

  if (parsedIntent === "marketplace.create_account") {
    return {
      summary: "Pazaryeri açılışını hazırlayabilirim, sadece mağaza bilgisi eksik.",
      details: "Tek mesajda platform ve mağaza adını yazın. Örnek: 'Amazon için Atlas Home Store'.",
      nextSuggestions: ["Amazon için Atlas Home Store", "Walmart için Atlas Market House"],
    };
  }

  if (parsedIntent === "finance.create_record_draft") {
    return {
      summary: "Finans taslağını çıkarabilirim, tutar ya da müşteri bilgisi eksik.",
      details: "Örnek: 'Yusuf Keser için 1200 dolar gider kaydı'.",
      nextSuggestions: ["Yusuf Keser için 1200 dolar gider kaydı", "Müşteri id: <uuid>, amount: 1200"],
    };
  }

  return {
    summary: "Bunu yapabilirim, ama önce birkaç eksik bilgiyi tamamlamamız gerekiyor.",
    details: `Eksik alanlar: ${missingFields.join(", ")}.`,
    nextSuggestions: ["Eksik bilgileri tek mesajda yaz", "Daha net bir müşteri ve hedef belirt"],
  };
}

const TYPED_EXECUTION_INTENTS = new Set<CommandIntent>([
  "customer.create_account",
  "customer.update_profile",
  "customer.change_onboarding_status",
  "company.create_llc",
  "company.update_status",
  "marketplace.create_account",
  "marketplace.update_account",
  "social.create_account",
  "advertising.create_campaign_draft",
  "finance.create_record_draft",
  "artifact.publish_to_customer_portal",
  "notification.send_to_customer",
  "task.create_onboarding_tasks",
  "task.update_process_task",
  "document.request_or_attach",
]);

export function shouldPreferTypedExecution(intent: CommandIntent) {
  return TYPED_EXECUTION_INTENTS.has(intent);
}

function hasStructuredMutationFields(commandText: string) {
  return /[:=]|\b(customer|user|company|artifact|amount|state|channel|platform|store|email|phone|website)\b\s*[:=]/i.test(commandText);
}

function hasConversationalPlanningTone(commandText: string) {
  return /(\?|nasıl|nasil|neden|niye|hangi|hangisi|olur mu|misin|mısın|yardım|yardim|lütfen|lutfen|bana|ben|biz|atlas|gerekirse|sonra|ardından|ardindan|bakıp|bakip|inceleyip|kontrol edip|çıkarıp|cikarip|anlat|kısa kısa|kisa kisa|tek tek|aynı sohbette|ayni sohbette)/i.test(commandText);
}

function hasMultipleActionClauses(commandText: string) {
  return /(\bve\b.*\bsonra\b)|(\bsonra\b.*\bve\b)|(\bardından\b)|(\bardindan\b)|(\bgerekirse\b)|(\bbakıp\b)|(\bbakip\b)|(\binceleyip\b)|(\bkontrol edip\b)|[,;]/i.test(commandText);
}

export function shouldForceConversationalAgentFlow(input: {
  commandText: string;
  parsedIntent: CommandIntent;
  hasConversationContext: boolean;
  awaitingStructuredFollowUp?: boolean;
}) {
  if (input.awaitingStructuredFollowUp) {
    return false;
  }

  if (!shouldPreferTypedExecution(input.parsedIntent)) {
    return false;
  }

  const normalized = normalizeSearchableText(input.commandText);
  if (!normalized) {
    return false;
  }

  const tokenCount = normalized.split(" ").filter(Boolean).length;
  const structured = hasStructuredMutationFields(input.commandText);
  const conversational = hasConversationalPlanningTone(input.commandText);
  const multipleActions = hasMultipleActionClauses(input.commandText);
  const shortExplicitMutation = tokenCount <= 8 && !structured && !conversational && !multipleActions;

  if (shortExplicitMutation) {
    return false;
  }

  if (structured) {
    return false;
  }

  return conversational || multipleActions || (input.hasConversationContext && tokenCount >= 4);
}

export function shouldUseAgentFirstRouting(
  mode: CopilotMode,
  intent: CommandIntent,
  policyApproval: "auto" | "required" | "blocked",
) {
  if (intent === "system.agent_task") {
    return true;
  }

  if (policyApproval === "blocked") {
    return intent === "system.unsupported";
  }

  if (mode === "chat" || mode === "autonomous") {
    return true;
  }

  if (mode === "agent") {
    return true;
  }

  if (policyApproval === "required") {
    return false;
  }

  return intent === "system.unsupported" || !shouldPreferTypedExecution(intent);
}

export function shouldReturnPolicyBlock(
  policyApproval: "auto" | "required" | "blocked",
  delegatedToAgent: boolean,
) {
  return policyApproval === "blocked" && !delegatedToAgent;
}

function truncateConversationSnapshot(value: string | null | undefined, maxLength = 280) {
  const normalized = (value ?? "").replace(/\s+/g, " ").trim();
  if (!normalized) {
    return null;
  }

  return normalized.length > maxLength
    ? `${normalized.slice(0, maxLength - 1)}…`
    : normalized;
}

function createConversationTitle(commandText: string) {
  const normalized = commandText.replace(/\s+/g, " ").trim();
  if (!normalized) {
    return "Yeni sohbet";
  }

  return normalized.length > 72 ? `${normalized.slice(0, 71)}…` : normalized;
}

function buildConversationMemoryFacts(input: {
  run: CopilotRunRecord;
  response: CopilotCommandResponse["response"];
  operatorJobs: CopilotOperatorJobRecord[];
  artifactTitles: string[];
}) {
  const facts: string[] = [];
  const scopeLabel =
    typeof input.run.metadata?.scopeLabel === "string" && input.run.metadata.scopeLabel.trim().length > 0
      ? input.run.metadata.scopeLabel.trim()
      : input.run.scopeType;
  const projectName =
    typeof input.run.metadata?.projectName === "string" && input.run.metadata.projectName.trim().length > 0
      ? input.run.metadata.projectName.trim()
      : null;
  const skillNames = Array.isArray(input.run.metadata?.skillNames)
    ? input.run.metadata.skillNames.filter((value): value is string => typeof value === "string" && value.trim().length > 0)
    : [];
  const activeOperatorJob = input.operatorJobs.find((job) => ["pending", "approved", "paused", "taken_over"].includes(job.status));

  facts.push(`Bağlam: ${scopeLabel}`);

  if (projectName) {
    facts.push(`Çalışma alanı: ${projectName}`);
  }

  if (skillNames.length > 0) {
    facts.push(`Kullanılan skill: ${skillNames.slice(0, 2).join(", ")}`);
  }

  if (input.response.affectedRecords && input.response.affectedRecords.length > 0) {
    facts.push(`Etkilenen kayıt: ${input.response.affectedRecords[0]?.label ?? input.response.affectedRecords[0]?.id}`);
  }

  if (activeOperatorJob) {
    facts.push(`Operator işi: ${activeOperatorJob.status} / ${activeOperatorJob.target}`);
  }

  if (input.artifactTitles.length > 0) {
    facts.push(`Son artifact: ${input.artifactTitles[0]}`);
  }

  return facts.slice(0, 5);
}

async function syncConversationSnapshot(input: {
  bundle: Awaited<ReturnType<typeof getRunBundle>>;
  response: CopilotCommandResponse["response"];
  operatorJobs: CopilotOperatorJobRecord[];
}) {
  if (!input.bundle.run) {
    return;
  }

  const run = input.bundle.run;
  const latestArtifactTitles = [...input.bundle.artifacts]
    .slice(-2)
    .reverse()
    .map((artifact) => artifact.title)
    .filter((title) => typeof title === "string" && title.trim().length > 0);
  const activeOperatorJob = input.operatorJobs.find((job) => ["pending", "approved", "paused", "taken_over"].includes(job.status));
  const memorySummary = truncateConversationSnapshot(input.response.details ?? input.response.summary);
  const memoryFacts = buildConversationMemoryFacts({
    run,
    response: input.response,
    operatorJobs: input.operatorJobs,
    artifactTitles: latestArtifactTitles,
  });

  await updateSessionConversationState({
    sessionId: run.sessionId,
    suggestedTitle: createConversationTitle(run.commandText),
    lastRunAt: run.createdAt,
    metadataPatch: {
      conversationTitle: createConversationTitle(run.commandText),
      scopeLabel:
        typeof run.metadata?.scopeLabel === "string" && run.metadata.scopeLabel.trim().length > 0
          ? run.metadata.scopeLabel.trim()
          : run.scopeType,
      projectId: typeof run.metadata?.projectId === "string" ? run.metadata.projectId : null,
      projectName: typeof run.metadata?.projectName === "string" ? run.metadata.projectName : null,
      skillIds: Array.isArray(run.metadata?.skillIds) ? run.metadata.skillIds : [],
      skillNames: Array.isArray(run.metadata?.skillNames) ? run.metadata.skillNames : [],
      memorySummary,
      memoryFacts,
      lastCommandText: run.commandText,
      lastResponseSummary: input.response.summary,
      lastArtifactTitles: latestArtifactTitles,
      operatorJobStatus: activeOperatorJob?.status ?? (typeof run.metadata?.operatorJobStatus === "string" ? run.metadata.operatorJobStatus : null),
      handoffNote:
        activeOperatorJob?.decisionNote
        ?? (typeof run.metadata?.handoffNote === "string" ? run.metadata.handoffNote : undefined),
    },
  });
}

async function buildResponse(
  runId: string,
  response: CopilotCommandResponse["response"],
  customerContext?: Record<string, unknown> | null,
): Promise<CopilotCommandResponse> {
  const bundle = await getRunBundle(runId);
  if (!bundle.run) {
    throw new Error("Run bulunamadı.");
  }

  const operatorJobs = await listOperatorJobs().then((jobs) => jobs.filter((job) => job.runId === runId));
  await syncConversationSnapshot({
    bundle,
    response,
    operatorJobs,
  });

  return {
    run: bundle.run,
    timeline: bundle.timeline,
    approvals: bundle.approvals,
    operatorJobs,
    artifacts: bundle.artifacts,
    deliveries: bundle.deliveries,
    response,
    customerContext: customerContext ?? null,
  };
}

function buildOperatorQueueConversation(input: {
  job: CopilotOperatorJobRecord;
  scope: CopilotScope;
}) {
  const scopeLabel = input.scope.label ?? input.scope.type;

  return {
    summary: "Yerel operator işi kuyruga alindi.",
    details: [
      `Bu istek ${scopeLabel} baglaminda tarayicida etkileşimli adim gerektiriyor.`,
      `Hedef: ${input.job.target}`,
      input.job.allowlisted
        ? "Hedef allowlist icinde. AI devam etmeden once operator onayi veya takeover bekliyorum."
        : "Hedef allowlist disinda. Guvenlik nedeniyle operator onayi zorunlu.",
    ].join(" "),
    nextSuggestions: [
      "Operator isini onayla ve AI devam etsin",
      "Takeover ile manuel devam et",
      "Işi duraklat",
    ],
  };
}

export interface RunQualityAssessment {
  passed: boolean;
  score: number;
  reasons: string[];
  missingCriteria: string[];
  suggestedNextStep?: string;
}

function hasMetaPlanLanguage(value: string) {
  return /(İstek Analizi|Araç Seçimi|Eylem Planı|Uygulama|Örnek Sonuç|plan oluşturdum|oluşturacağım)/i.test(value);
}

function hasExecutionErrorLanguage(value: string) {
  return /(hatası:|error:|approval_required|invalid relation|bulunamadı|başarısız|çalıştırılamadı|açamadı|acamadi)/i.test(value);
}

export function assessRunOutputQuality(input: {
  mode: "typed" | "agent";
  summary?: string | null;
  details?: string | null;
  agentSteps?: Array<{
    type: "thought" | "action" | "observation" | "final_answer";
    toolResult?: { success?: boolean };
  }>;
  affectedRecords?: Array<{ type: string; id: string; label?: string }>;
}): RunQualityAssessment {
  const summary = (input.summary ?? "").trim();
  const details = (input.details ?? "").trim();
  const combined = [summary, details].filter(Boolean).join("\n");
  const safeCombined = combined.trim();
  const agentSteps = input.agentSteps ?? [];
  const actionCount = agentSteps.filter((step) => step.type === "action").length;
  const observationCount = agentSteps.filter((step) => step.type === "observation").length;
  const successfulObservations = agentSteps.filter(
    (step) => step.type === "observation" && step.toolResult?.success !== false,
  ).length;
  const hasFinalAnswer = agentSteps.some((step) => step.type === "final_answer") || safeCombined.length > 0;
  const affectedRecords = input.affectedRecords?.length ?? 0;

  let score = 0;
  const reasons: string[] = [];
  const missingCriteria: string[] = [];

  if (safeCombined.length >= 48) {
    score += 30;
    reasons.push("Çıktı boş değil ve yeterli açıklama içeriyor.");
  } else {
    missingCriteria.push("Yanıt çok kısa veya eksik.");
  }

  if (hasFinalAnswer) {
    score += 20;
    reasons.push("Kullanıcıya dönülecek final cevap üretildi.");
  } else {
    missingCriteria.push("Final cevap oluşmadı.");
  }

  if (input.mode === "agent") {
    if (successfulObservations > 0) {
      score += 30;
      reasons.push("Araç çalışması gözlem ile doğrulandı.");
    } else if (actionCount > 0 || observationCount > 0) {
      score -= 20;
      missingCriteria.push("Ajan araç zinciri oluştu ama başarılı gözlem üretmedi.");
    } else {
      score -= 20;
      missingCriteria.push("Ajan araç yürütmesi görünmüyor.");
    }
  } else if (affectedRecords > 0 || safeCombined.length >= 120) {
    score += 30;
    reasons.push("Typed tool çıktısı somut kayıt veya yeterli detay döndürdü.");
  } else {
    missingCriteria.push("Typed tool çıktısı somut etki göstermiyor.");
  }

  if (hasMetaPlanLanguage(safeCombined)) {
    score -= 35;
    missingCriteria.push("Yanıt meta-plan diline kaydı; doğrudan sonuç üretmedi.");
  } else {
    score += 20;
    reasons.push("Yanıt doğrudan sonuç üretiyor, meta-plan dump değil.");
  }

  if (hasExecutionErrorLanguage(safeCombined)) {
    score -= 35;
    missingCriteria.push("Yanıt hata metni içeriyor; teslim kalitesi yetersiz.");
  }

  const normalizedScore = Math.max(0, Math.min(100, score));
  const passed = normalizedScore >= 60 && missingCriteria.length <= 1;

  return {
    passed,
    score: normalizedScore,
    reasons,
    missingCriteria,
    suggestedNextStep: passed
      ? undefined
      : "Komutu daha net scope ile tekrar çalıştırın veya agentin kullandığı araç sonucunu doğrulayın.",
  };
}

function buildQualityStepPayload(assessment: RunQualityAssessment) {
  return {
    summary: assessment.passed
      ? `Kalite skoru ${assessment.score}/100. Çıktı teslim için yeterli.`
      : `Kalite skoru ${assessment.score}/100. Çıktı kalite eşiğinin altında kaldı.`,
    detail: assessment.passed
      ? assessment.reasons.join(" ")
      : [...assessment.missingCriteria, ...(assessment.suggestedNextStep ? [assessment.suggestedNextStep] : [])].join(" "),
    score: assessment.score,
    passed: assessment.passed,
    reasons: assessment.reasons,
    missingCriteria: assessment.missingCriteria,
    suggestedNextStep: assessment.suggestedNextStep,
  };
}

type ConversationRecovery = {
  summary: string;
  details: string;
  nextSuggestions: string[];
};

function buildScopeRecoverySuggestions(scope: CopilotScope, fallbackPrompt?: string | null) {
  const suggestions = fallbackPrompt ? [fallbackPrompt] : [];

  if (scope.type === "customer") {
    suggestions.push("Son formları oku", "Açık görevleri listele", "Bu müşteri için durumu özetle");
  } else if (scope.type === "company") {
    suggestions.push("Bu şirketin durumunu özetle", "Belgeleri göster", "Açık görevleri listele");
  } else if (scope.type === "marketplace") {
    suggestions.push("Bu hesabın durumunu özetle", "Son siparişleri göster", "Açık görevleri listele");
  } else {
    suggestions.push("Bir müşteri adı ile tekrar yaz", "İsteği tek cümlede daralt", "Önce görmek istediğin veriyi söyle");
  }

  return Array.from(new Set(suggestions)).slice(0, 3);
}

export function buildExecutionRecoveryConversation(input: {
  message: string;
  scope: CopilotScope;
  commandText: string;
  lane: "typed" | "agent";
}): ConversationRecovery {
  if (/rate limit|429|maxRetriesExceeded|retry after|tokens per day|model katmanı şu anda yoğun/i.test(input.message)) {
    return {
      summary: "İsteği anladım, ama model katmanı şu anda yoğun.",
      details: "Sohbet açık kaldı. Aynı hedefi birazdan yeniden deneyebiliriz ya da isteği daha dar bir alt adımla sürdürebiliriz.",
      nextSuggestions: buildScopeRecoverySuggestions(input.scope, input.commandText),
    };
  }

  if (/güvenli oturum katmanına erişemedi|refresh token|unauthorized|auth/i.test(input.message)) {
    return {
      summary: "Bu turda admin oturumu doğrulanamadı.",
      details: "Girişi yenileyin; ardından aynı sohbetten devam ederim ve isteği baştan kurmanız gerekmez.",
      nextSuggestions: ["Aynı mesajı tekrar gönder", "Sayfayı yenile"],
    };
  }

  return {
    summary: input.lane === "agent"
      ? "Bu turdaki ajan zinciri temiz bir sonuç çıkaramadı."
      : "Bu turdaki işlem akışı temiz bir sonuç çıkaramadı.",
    details: "Sohbeti kesmeden daha dar bir alt adımla devam edelim. Ne görmek ya da yapmak istediğinizi tek cümlede netleştirmeniz yeterli.",
    nextSuggestions: buildScopeRecoverySuggestions(input.scope, input.commandText),
  };
}

export function buildQualityRecoveryConversation(input: {
  quality: RunQualityAssessment;
  scope: CopilotScope;
  commandText: string;
  lane: "typed" | "agent";
}): ConversationRecovery {
  return {
    summary: input.lane === "agent"
      ? "Bu turdaki ajan cevabı teslim kalitesine ulaşmadı."
      : "Bu turdaki sonuç teslim kalitesine ulaşmadı.",
    details: "Ham plan, eksik gözlem veya kirli çıktı üretildiği için bunu son cevap olarak bırakmadım. Aynı sohbetten daha dar bir hedefle devam edelim.",
    nextSuggestions: buildScopeRecoverySuggestions(input.scope, input.commandText),
  };
}

function didRunPassDeliveryGate(run: CopilotRunRecord) {
  const quality = run.metadata?.quality;
  const qualityPassed =
    quality
    && typeof quality === "object"
    && (quality as { passed?: unknown }).passed === true;

  return run.status === "completed"
    && qualityPassed
    && run.metadata?.clarification !== true;
}

function getPersistedAgentStepStatus(step: {
  type: "thought" | "action" | "observation" | "final_answer";
}): CopilotTimelineStep["status"] {
  if (step.type === "thought" || step.type === "action" || step.type === "observation" || step.type === "final_answer") {
    return "completed";
  }

  return "completed";
}

async function executeRun(run: CopilotRunRecord, executorUserId: string): Promise<CopilotCommandResponse> {
  const runScope: CopilotScope = {
    type: run.scopeType,
    refId: run.scopeRefId,
    label: typeof run.metadata?.scopeLabel === "string" ? run.metadata.scopeLabel : undefined,
  };

  try {
    await appendRunStep({
      runId: run.id,
      stepOrder: 4,
      stepType: "execute",
      title: "Typed tool çalıştırılıyor",
      status: "completed",
      payload: { toolName: run.toolName },
    });

    const result = await executeIntent(run.toolName as CommandIntent, run.toolInput, {
      requesterUserId: executorUserId,
      scope: {
        type: run.scopeType,
        refId: run.scopeRefId,
      },
      runId: run.id,
    });

    const quality = assessRunOutputQuality({
      mode: "typed",
      summary: result.summary,
      details: result.details,
      affectedRecords: result.affectedRecords,
    });

    await appendRunStep({
      runId: run.id,
      stepOrder: 5,
      stepType: "quality",
      title: quality.passed ? "Çıktı kalitesi doğrulandı" : "Çıktı kalite kapısında yeniden çerçevelendi",
      status: "completed",
      payload: buildQualityStepPayload(quality),
    });

    if (!quality.passed) {
      const recovery = buildQualityRecoveryConversation({
        quality,
        scope: runScope,
        commandText: run.commandText,
        lane: "typed",
      });

      await updateRun(run.id, {
        status: "completed",
        summary: recovery.summary,
        responseText: recovery.details,
        metadata: {
          ...run.metadata,
          affectedRecords: result.affectedRecords,
          artifactIds: result.artifactIds ?? [],
          quality,
          clarification: true,
        },
      });

      return buildResponse(run.id, {
        summary: recovery.summary,
        details: recovery.details,
        affectedRecords: result.affectedRecords,
        nextSuggestions: recovery.nextSuggestions,
      }, result.customerContext);
    }

    await appendRunStep({
      runId: run.id,
      stepOrder: 6,
      stepType: "complete",
      title: "Run tamamlandı",
      status: "completed",
      payload: {
        summary: result.summary,
        affectedRecords: result.affectedRecords,
        artifactIds: result.artifactIds ?? [],
      },
    });

    await updateRun(run.id, {
      status: "completed",
      summary: result.summary,
      responseText: result.details ?? result.summary,
      metadata: {
        ...run.metadata,
        affectedRecords: result.affectedRecords,
        artifactIds: result.artifactIds ?? [],
        quality,
      },
    });

    return buildResponse(run.id, {
      summary: result.summary,
      details: result.details,
      affectedRecords: result.affectedRecords,
      nextSuggestions: result.nextSuggestions ?? [],
    }, result.customerContext);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Bilinmeyen hata";
    const recovery = buildExecutionRecoveryConversation({
      message,
      scope: runScope,
      commandText: run.commandText,
      lane: "typed",
    });
    await appendRunStep({
      runId: run.id,
      stepOrder: 5,
      stepType: "clarify",
      title: "İşlem sohbet akışına geri alındı",
      status: "completed",
      payload: { error: message },
    });
    await updateRun(run.id, {
      status: "completed",
      summary: recovery.summary,
      responseText: recovery.details,
      metadata: { ...run.metadata, error: message, clarification: true, internalError: message },
    });

    return buildResponse(run.id, {
      summary: recovery.summary,
      details: recovery.details,
      nextSuggestions: recovery.nextSuggestions,
    });
  }
}

async function executeAgentRun(
  run: CopilotRunRecord,
  executorUserId: string,
  requestCookies?: ToolContextCookie[],
): Promise<CopilotCommandResponse> {
  const runScope: CopilotScope = {
    type: run.scopeType,
    refId: run.scopeRefId,
    label: typeof run.metadata?.scopeLabel === "string" ? run.metadata.scopeLabel : undefined,
  };

  try {
    await appendRunStep({
      runId: run.id,
      stepOrder: 4,
      stepType: "delegate",
      title: "Mesaj birleşik agent zincirine devredildi",
      status: "completed",
      payload: {
        scopeType: run.scopeType,
        mode: run.mode,
      },
    });

    const agentResult = await executeAgentFallback({
      commandText: run.commandText,
      scope: {
        type: run.scopeType,
        refId: run.scopeRefId,
        label: typeof run.metadata?.scopeLabel === "string" ? run.metadata.scopeLabel : null,
      },
      projectId: typeof run.metadata?.projectId === "string" ? run.metadata.projectId : null,
      skillIds: Array.isArray(run.metadata?.skillIds)
        ? (run.metadata.skillIds.filter((value): value is string => typeof value === "string"))
        : [],
      conversationContext: typeof run.metadata?.conversationContext === "string"
        ? run.metadata.conversationContext
        : null,
      parsedIntent: typeof run.toolInput?.parsedIntent === "string" ? run.toolInput.parsedIntent : null,
      parsedInput: run.toolInput?.parsedInput && typeof run.toolInput.parsedInput === "object"
        ? run.toolInput.parsedInput as Record<string, unknown>
        : null,
      missingFields: Array.isArray(run.toolInput?.missingFields)
        ? run.toolInput.missingFields.filter((value): value is string => typeof value === "string")
        : [],
      toolContext: {
        supabase: adminDb(),
        userId: executorUserId,
        sessionId: run.sessionId,
        requestCookies: requestCookies ?? [],
      },
    });

    let stepOrder = 5;
    for (const step of agentResult.steps) {
      const title =
        step.type === "thought"
          ? "Ajan düşünce adımı"
          : step.type === "action"
            ? `Ajan aksiyonu${step.toolName ? ` · ${step.toolName}` : ""}`
            : step.type === "observation"
              ? `Ajan gözlemi${step.toolName ? ` · ${step.toolName}` : ""}`
              : "Ajan final cevabı";

      await appendRunStep({
        runId: run.id,
        stepOrder,
        stepType: step.type,
        title,
        status: getPersistedAgentStepStatus(step),
        payload: {
          content: step.content,
          toolName: step.toolName,
          toolParams: step.toolParams,
          toolSuccess: step.toolResult?.success,
          toolSummary: step.toolResult?.summary,
          durationMs: step.durationMs,
        },
      });
      stepOrder += 1;
    }

    const quality = assessRunOutputQuality({
      mode: "agent",
      summary: agentResult.summary,
      details: agentResult.details,
      agentSteps: agentResult.steps.map((step) => ({
        type: step.type,
        toolResult: step.toolResult ? { success: step.toolResult.success } : undefined,
      })),
    });

    await appendRunStep({
      runId: run.id,
      stepOrder,
      stepType: "quality",
      title: quality.passed ? "Çıktı kalitesi doğrulandı" : "Çıktı kalite kapısında yeniden çerçevelendi",
      status: "completed",
      payload: buildQualityStepPayload(quality),
    });
    stepOrder += 1;

    if (!quality.passed) {
      const recovery = buildQualityRecoveryConversation({
        quality,
        scope: runScope,
        commandText: run.commandText,
        lane: "agent",
      });

      await updateRun(run.id, {
        status: "completed",
        summary: recovery.summary,
        responseText: recovery.details,
        metadata: {
          ...run.metadata,
          delegatedToAgent: true,
          toolStats: agentResult.toolStats,
          executionPath: "orchestrator-first",
          quality,
          clarification: true,
        },
      });

      return buildResponse(run.id, {
        summary: recovery.summary,
        details: recovery.details,
        affectedRecords: [],
        nextSuggestions: recovery.nextSuggestions,
      });
    }

    await appendRunStep({
      runId: run.id,
      stepOrder,
      stepType: "complete",
      title: "Ajan run tamamlandı",
      status: "completed",
      payload: {
        toolStats: agentResult.toolStats,
      },
    });

    await updateRun(run.id, {
      status: "completed",
      summary: agentResult.summary,
      responseText: agentResult.details,
      metadata: {
        ...run.metadata,
        delegatedToAgent: true,
        toolStats: agentResult.toolStats,
        executionPath: "orchestrator-first",
        quality,
      },
    });

    return buildResponse(run.id, {
      summary: agentResult.summary,
      details: agentResult.details,
      affectedRecords: [],
      nextSuggestions: agentResult.nextSuggestions,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Bilinmeyen ajan hatası";
    const recovery = buildExecutionRecoveryConversation({
      message,
      scope: runScope,
      commandText: run.commandText,
      lane: "agent",
    });
    await appendRunStep({
      runId: run.id,
      stepOrder: 5,
      stepType: "clarify",
      title: "Ajan zinciri sohbet akışına geri alındı",
      status: "completed",
      payload: { error: message },
    });
    await updateRun(run.id, {
      status: "completed",
      summary: recovery.summary,
      responseText: recovery.details,
      metadata: { ...run.metadata, error: message, delegatedToAgent: true, clarification: true, internalError: message },
    });

    return buildResponse(run.id, {
      summary: recovery.summary,
      details: recovery.details,
      nextSuggestions: recovery.nextSuggestions,
    });
  }
}

export async function submitCopilotCommand(input: {
  requesterUserId: string;
  mode: CopilotMode;
  commandText: string;
  scope: CopilotScope;
  conversationScopeHint?: CopilotScope | null;
  conversationPreview?: string | null;
  projectId?: string | null;
  skillIds?: string[];
  requestId?: string | null;
  conversationId?: string | null;
  requestCookies?: ToolContextCookie[];
}): Promise<CopilotCommandResponse> {
  const conversationMemory = input.conversationId
    ? await getConversationMemory(input.requesterUserId, input.conversationId)
    : null;
  assertConversationWorkspaceAccess(conversationMemory, input.requesterUserId);
  const conversationRuns = input.conversationId
    ? await getConversationRuns(input.requesterUserId, input.conversationId, 12)
    : [];
  const persistedConversationContext = buildPersistedConversationMemoryContext(conversationMemory);
  const baseResolvedScope = await resolveScopeForCommand(input.commandText, input.scope);
  const shouldBypassConversationScope = input.scope.type === "global"
    && shouldBypassConversationScopeInheritance(input.commandText);
  const resolvedScope = shouldBypassConversationScope
    ? baseResolvedScope
    : applyConversationScopeHint(
        input.scope,
        await applyConversationPreviewScope(
          input.scope,
          inheritConversationScope(
            input.scope,
            baseResolvedScope,
            conversationRuns,
          ),
          input.conversationPreview,
        ),
        input.conversationScopeHint,
      );
  const sessionId = await ensureSession(input.requesterUserId, resolvedScope, input.conversationId ?? null);
  const recentRuns = input.conversationId
    ? conversationRuns
    : await getActiveSessionRuns(input.requesterUserId, resolvedScope, 8, input.conversationId ?? null);
  const previousRun = recentRuns[recentRuns.length - 1] ?? await getLatestSessionRun(sessionId);
  const initialParsed = parseCommand(input.commandText, resolvedScope);
  const continuationCommand =
    previousRun
    && (
      previousRun.metadata?.awaitingUserInput === true
      || initialParsed.intent === "artifact.publish_to_customer_portal"
      || initialParsed.intent === "notification.send_to_customer"
    )
      ? await buildContextualFollowUpCommand({
          previousRun,
          parsed: initialParsed,
          message: input.commandText,
        })
      : null;
  const continuedParsed = continuationCommand ? parseCommand(continuationCommand, resolvedScope) : null;
  const parsed = continuedParsed
    && (
      continuedParsed.intent !== "system.unsupported"
      || continuedParsed.missingFields.length < initialParsed.missingFields.length
    )
    ? continuedParsed
    : initialParsed;
  const inheritedProjectId =
    !input.projectId && typeof previousRun?.metadata?.projectId === "string"
      ? previousRun.metadata.projectId
      : !input.projectId && conversationMemory?.projectId
        ? conversationMemory.projectId
      : null;
  const inheritedSkillIds =
    (!input.skillIds || input.skillIds.length === 0) && Array.isArray(previousRun?.metadata?.skillIds)
      ? previousRun.metadata.skillIds.filter((value): value is string => typeof value === "string")
      : [];
  const project = await resolveCopilotProject(
    input.projectId ?? inheritedProjectId,
    resolvedScope,
    input.commandText,
  );
  const selectedSkills = await selectCopilotSkills({
    skillIds: input.skillIds?.length ? input.skillIds : inheritedSkillIds,
    project,
    scope: resolvedScope,
    commandText: input.commandText,
  });
  const policy = getToolPolicy(parsed.intent);
  const hasConversationContext = Boolean(
    previousRun
    || conversationRuns.length > 0
    || conversationMemory
    || input.conversationPreview?.trim()
    || input.conversationScopeHint,
  );
  const forceConversationalAgentFlow = shouldForceConversationalAgentFlow({
    commandText: input.commandText,
    parsedIntent: parsed.intent,
    hasConversationContext,
    awaitingStructuredFollowUp: Boolean(continuationCommand),
  });
  const forceClarification = input.mode !== "chat"
    && input.mode !== "autonomous"
    && parsed.intent === "system.unsupported"
    && shouldClarifyUnsupportedCommand(input.commandText, resolvedScope)
    && !(hasConversationContext && isContextualFollowUpMessage(input.commandText));
  const delegatedToAgent = !forceClarification
    && (forceConversationalAgentFlow || shouldUseAgentFirstRouting(input.mode, parsed.intent, policy.approval));
  const scopeConflict = !delegatedToAgent ? detectScopeConflict(resolvedScope, parsed.input) : null;
  const intent = delegatedToAgent ? "system.agent_task" : parsed.intent;
  const normalizedInput = delegatedToAgent
    ? {
        rawCommand: input.commandText,
        scopeType: resolvedScope.type,
        scopeRefId: resolvedScope.refId ?? null,
        parsedIntent: parsed.intent,
        parsedInput: parsed.input,
        missingFields: parsed.missingFields,
        projectId: project?.id ?? null,
        skillIds: selectedSkills.map((skill) => skill.id),
      }
    : normalizeInputForScope(resolvedScope, parsed.input);
  const executionPath = delegatedToAgent ? "orchestrator-first" : "typed-tool";
  const parseSummary = delegatedToAgent
    ? "Mesaj birleşik orchestrator zincirine alındı."
    : parsed.summary;
  const conversationContext =
    combineConversationContext(
      persistedConversationContext,
      buildConversationContext(
        recentRuns.filter((run) => run.commandText !== input.commandText),
        input.commandText,
      ),
      input.conversationPreview,
    );

  const run = await createRun({
    sessionId,
    requesterUserId: input.requesterUserId,
    mode: input.mode,
    scope: resolvedScope,
    commandText: input.commandText,
    intent,
    toolName: intent,
    toolInput: normalizedInput,
    requiresApproval: policy.approval === "required",
    metadata: {
      parseSummary,
      scopeLabel: resolvedScope.label ?? null,
      originalScopeType: input.scope.type,
      originalScopeRefId: input.scope.refId ?? null,
      delegatedToAgent,
      executionPath,
      projectId: project?.id ?? null,
      projectName: project?.name ?? null,
      skillIds: selectedSkills.map((skill) => skill.id),
      skillNames: selectedSkills.map((skill) => skill.name),
      continuationFromRunId: continuationCommand ? previousRun?.id ?? null : null,
      conversationId: input.conversationId ?? null,
      conversationContext,
      workingGoal: conversationMemory?.workingGoal ?? null,
    },
    idempotencyKey: buildIdempotencyKey(
      input.mode,
      resolvedScope,
      intent,
      normalizedInput,
      project?.id,
      selectedSkills.map((skill) => skill.id),
      input.requestId ?? undefined,
    ) ?? undefined,
  });

  await appendRunStep({
    runId: run.id,
    stepOrder: 1,
    stepType: "received",
    title: "Mesaj alındı",
    status: "completed",
    payload: { commandText: input.commandText, mode: input.mode },
  });
  await appendRunStep({
    runId: run.id,
    stepOrder: 2,
    stepType: "parse",
    title: delegatedToAgent ? "Intent ve orchestrator bağlamı çözüldü" : "Intent ve scope çözüldü",
    status: "completed",
    payload: {
      intent,
      toolInput: normalizedInput,
      missingFields: parsed.missingFields,
      delegatedToAgent,
      executionPath,
      resolvedScope,
      projectId: project?.id ?? null,
      projectName: project?.name ?? null,
      skillIds: selectedSkills.map((skill) => skill.id),
      skillNames: selectedSkills.map((skill) => skill.name),
    },
  });

  if (delegatedToAgent && shouldRequireOperatorJob(input.commandText)) {
    const operatorTarget = extractOperatorTarget(input.commandText);
    if (operatorTarget) {
      const operatorJob = await createOperatorJob({
        run,
        scope: resolvedScope,
        requesterUserId: input.requesterUserId,
        commandText: input.commandText,
        target: operatorTarget,
        title: "Yerel operator gorevi",
        description: "Tarayicida etkileşimli adim gerekiyor. AI devam etmeden once operator karari alinmali.",
        metadata: {
          executionPath,
          projectId: project?.id ?? null,
          projectName: project?.name ?? null,
          skillIds: selectedSkills.map((skill) => skill.id),
          skillNames: selectedSkills.map((skill) => skill.name),
        },
      });

      await appendRunStep({
        runId: run.id,
        stepOrder: 3,
        stepType: "operator_job",
        title: "Operator isi kuyruğa alindi",
        status: "awaiting_approval",
        payload: {
          operatorJobId: operatorJob.id,
          target: operatorJob.target,
          allowlisted: operatorJob.allowlisted,
          allowlistRuleId: operatorJob.allowlistRuleId,
          signature: operatorJob.signature,
        },
      });

      const operatorConversation = buildOperatorQueueConversation({
        job: operatorJob,
        scope: resolvedScope,
      });

      await updateRun(run.id, {
        status: "awaiting_approval",
        summary: operatorConversation.summary,
        responseText: operatorConversation.details,
        metadata: {
          ...run.metadata,
          operatorJobId: operatorJob.id,
          operatorJobStatus: operatorJob.status,
          operatorJobTarget: operatorJob.target,
          operatorJobSignature: operatorJob.signature,
          executionPath,
          delegatedToAgent: true,
        },
      });

      return buildResponse(run.id, {
        summary: operatorConversation.summary,
        details: operatorConversation.details,
        nextSuggestions: operatorConversation.nextSuggestions,
      });
    }
  }

  if (scopeConflict) {
    const clarification = buildScopeConflictConversation(resolvedScope);
    await appendRunStep({
      runId: run.id,
      stepOrder: 3,
      stepType: "clarify",
        title: "Seçili sohbet bağlamı ile istek çakışıyor",
      status: "completed",
      payload: {
        scopeType: scopeConflict.type,
        targetRefId: scopeConflict.targetRefId,
      },
    });
    await updateRun(run.id, {
      status: "completed",
      summary: clarification.summary,
      responseText: clarification.details,
      metadata: {
        ...run.metadata,
        clarification: true,
        awaitingUserInput: true,
        scopeConflict,
        pendingIntent: parsed.intent,
        pendingInput: parsed.input,
      },
    });

    return buildResponse(run.id, {
      summary: clarification.summary,
      details: clarification.details,
      nextSuggestions: clarification.nextSuggestions,
    });
  }

  if (parsed.intent === "system.unsupported" && !delegatedToAgent) {
    await appendRunStep({
      runId: run.id,
      stepOrder: 3,
      stepType: "clarify",
      title: "Sohbetten devam etmek için biraz daha bağlam gerekiyor",
      status: "completed",
      payload: {
        scopeType: resolvedScope.type,
      },
    });
    await updateRun(run.id, {
      status: "completed",
      summary: "Mesajı aldım, sadece biraz daha bağlam gerekiyor.",
      responseText: "Müşteri, şirket, görmek istediğiniz veri ya da yapmak istediğiniz aksiyonu bir cümle daha netleştirirseniz aynı sohbetten devam ederim.",
      metadata: {
        ...run.metadata,
        clarification: true,
        awaitingUserInput: true,
        pendingIntent: null,
        pendingInput: {},
      },
    });

    return buildResponse(run.id, {
      summary: resolvedScope.type === "global"
        ? "Kimi veya hangi alanı kastettiğinizi netleştirin."
        : "Mesaj için biraz daha net aksiyon gerekiyor.",
      details: resolvedScope.type === "global"
        ? "Örnek: 'Yusuf Keser den gelen son formları oku' veya 'Paket taleplerini listele'."
        : "Örnek: 'son formları oku', 'LLC ne durumda', 'açık görevleri listele'.",
      nextSuggestions: resolvedScope.type === "global"
        ? ["Yusuf Keser den gelen son formları oku", "Yusuf Keser LLC ne durumda", "Paket taleplerini listele"]
        : ["Son formları oku", "Açık görevleri listele", "LLC ne durumda"],
    });
  }

  if (shouldReturnPolicyBlock(policy.approval, delegatedToAgent)) {
    await appendRunStep({
      runId: run.id,
      stepOrder: 3,
      stepType: "clarify",
      title: "İstek güvenli sohbet akışına çevrildi",
      status: "completed",
      payload: { reason: policy.blockedReason },
    });
    await updateRun(run.id, {
      status: "completed",
      summary: "Atlas bu isteği doğrudan çalıştırmak yerine yeniden çerçevelemek istiyor.",
      responseText: policy.blockedReason,
      metadata: {
        ...run.metadata,
        blocked: true,
        clarification: true,
        awaitingUserInput: true,
        pendingIntent: null,
        pendingInput: {},
      },
    });

    return buildResponse(run.id, {
      summary: "Bu isteği biraz daha somutlaştırırsak devam edebilirim.",
      details: "Örneğin hedef müşteri, görmek istediğiniz veri ya da almak istediğiniz aksiyonu açıkça yazın.",
      nextSuggestions: ["Yusuf Keser son formları oku", "Paket taleplerini listele", "Açık görevleri özetle"],
    });
  }

  if (!delegatedToAgent && parsed.missingFields.length > 0) {
    await appendRunStep({
      runId: run.id,
      stepOrder: 3,
      stepType: "clarify",
      title: "Devam etmek için birkaç bilgi daha gerekiyor",
      status: "completed",
      payload: { missingFields: parsed.missingFields },
    });
    const clarification = buildMissingFieldConversation(parsed.intent, parsed.missingFields, resolvedScope);
    await updateRun(run.id, {
      status: "completed",
      summary: clarification.summary,
      responseText: clarification.details,
      metadata: {
        ...run.metadata,
        clarification: true,
        awaitingUserInput: true,
        missingFields: parsed.missingFields,
        pendingIntent: parsed.intent,
        pendingInput: parsed.input,
      },
    });

    return buildResponse(run.id, {
      summary: clarification.summary,
      details: clarification.details,
      missingFields: parsed.missingFields,
      nextSuggestions: clarification.nextSuggestions,
    });
  }

  const requiresApproval = policy.approval === "required" && parsed.missingFields.length === 0;

  await appendRunStep({
    runId: run.id,
    stepOrder: 3,
    stepType: requiresApproval ? "policy" : delegatedToAgent && parsed.missingFields.length > 0 ? "clarify" : "policy",
    title: requiresApproval
      ? "Approval gerekiyor"
      : delegatedToAgent && parsed.missingFields.length > 0
        ? "Ajan eksik bilgileri sohbetten netleştiriyor"
        : "Politika otomatik çalıştırmaya izin verdi",
    status: requiresApproval ? "awaiting_approval" : "completed",
    payload: {
      approval: requiresApproval ? "required" : policy.approval,
      missingFields: parsed.missingFields,
    },
  });

  if (requiresApproval) {
    const approvalToolName = delegatedToAgent ? parsed.intent : intent;
    await createApproval({
      runId: run.id,
      toolName: approvalToolName,
      scope: input.scope,
      approvalType: parsed.intent === "task.update_process_task"
        ? "task_update"
        : parsed.intent === "finance.create_record_draft"
          ? "financial_change"
            : parsed.intent === "artifact.publish_to_customer_portal" || parsed.intent === "notification.send_to_customer"
            ? "content_delivery"
            : "data_mutation",
      requestedBy: input.requesterUserId,
      title: `${approvalToolName} için onay`,
      description: parseSummary,
      payload: {
        toolInput: normalizedInput,
        commandText: input.commandText,
      },
    });

    await updateRun(run.id, {
      status: "awaiting_approval",
      summary: parseSummary,
      responseText: "Onay bekleniyor.",
      metadata: { ...run.metadata, awaitingApproval: true },
    });

    return buildResponse(run.id, {
      summary: parseSummary,
      details: "İşlem approval queue içine alındı. Onay verilmeden mutasyon çalışmayacak.",
      nextSuggestions: ["Onay ver", "Reddet", "Kapsamı yeniden gözden geçir"],
    });
  }

  if (delegatedToAgent) {
    return executeAgentRun(run, input.requesterUserId, input.requestCookies);
  }

  return executeRun(run, input.requesterUserId);
}

export async function resolveCopilotApproval(input: {
  approvalId: string;
  decision: "approved" | "rejected";
  decidedBy: string;
  note?: string;
}): Promise<CopilotCommandResponse> {
  const client = adminDb();
  const { data: approvalRow, error: approvalError } = await client
    .from("ai_approvals")
    .select("*")
    .eq("id", input.approvalId)
    .single();

  if (approvalError || !approvalRow) {
    throw new Error(approvalError?.message ?? "Approval bulunamadı.");
  }

  const { data: runRow, error: runError } = await client
    .from("ai_runs")
    .select("*")
    .eq("id", approvalRow.run_id)
    .single();

  if (runError || !runRow) {
    throw new Error(runError?.message ?? "Approval run kaydı bulunamadı.");
  }

  const approval = await resolveApproval(input.approvalId, input.decision, input.decidedBy, input.note);

  if (input.decision === "rejected") {
    await appendRunStep({
      runId: approval.runId,
      stepOrder: 4,
      stepType: "approval",
      title: "Approval reddedildi",
      status: "rejected",
      payload: { note: input.note ?? null },
    });
    await updateRun(approval.runId, {
      status: "rejected",
      summary: `${approval.title} reddedildi.`,
      responseText: input.note ?? "İşlem reddedildi.",
      metadata: {
        ...(runRow.metadata ?? {}),
        approvalDecision: "rejected",
        approvalNote: input.note ?? null,
      },
    });

    return buildResponse(approval.runId, {
      summary: `${approval.title} reddedildi.`,
      details: input.note ?? "Mutasyon çalıştırılmadı.",
      nextSuggestions: ["Mesajı biraz daha netleştirip tekrar gönder"],
    });
  }

  await appendRunStep({
    runId: approval.runId,
    stepOrder: 4,
    stepType: "approval",
    title: "Approval onaylandı",
    status: "completed",
    payload: { note: input.note ?? null },
  });
  await updateRun(approval.runId, {
    status: "running",
    summary: `${approval.title} onaylandı, çalıştırılıyor.`,
    responseText: "Approval verildi.",
    metadata: {
      ...(runRow.metadata ?? {}),
      approvalDecision: "approved",
      approvedBy: input.decidedBy,
    },
    completedAt: null,
  });

  const run: CopilotRunRecord = {
    id: runRow.id,
    sessionId: runRow.session_id,
    requesterUserId: runRow.requester_user_id,
    mode: runRow.mode,
    scopeType: runRow.scope_type,
    scopeRefId: runRow.scope_ref_id,
    commandText: runRow.command_text,
    intent: runRow.intent,
    toolName: runRow.tool_name,
    toolInput: runRow.tool_input ?? {},
    status: "running",
    requiresApproval: runRow.requires_approval,
    summary: runRow.summary,
    responseText: runRow.response_text,
    metadata: runRow.metadata ?? {},
    createdAt: runRow.created_at,
    completedAt: runRow.completed_at,
  };

  return executeRun(run, input.decidedBy);
}

export async function resolveCopilotOperatorJob(input: {
  jobId: string;
  action: "approve" | "pause" | "takeover" | "reject";
  decidedBy: string;
  decidedByEmail?: string | null;
  note?: string;
}): Promise<CopilotCommandResponse> {
  const job = await getOperatorJob(input.jobId);
  if (!job) {
    throw new Error("Operator işi bulunamadı.");
  }

  const bundle = await getRunBundle(job.runId);
  if (!bundle.run) {
    throw new Error("Operator işine ait run bulunamadı.");
  }

  const runScope: CopilotScope = {
    type: bundle.run.scopeType,
    refId: bundle.run.scopeRefId,
    label: typeof bundle.run.metadata?.scopeLabel === "string" ? bundle.run.metadata.scopeLabel : null,
  };
  const stepOrder = bundle.timeline.length + 1;

  if (input.action === "approve") {
    const updatedJob = await updateOperatorJobStatus({
      jobId: input.jobId,
      status: "approved",
      decidedBy: input.decidedBy,
      decisionNote: input.note ?? "AI operator lane icin onay verildi.",
    });

    await appendRunStep({
      runId: bundle.run.id,
      stepOrder,
      stepType: "operator_approved",
      title: "Operator isi onaylandi",
      status: "completed",
      payload: {
        operatorJobId: updatedJob.id,
        target: updatedJob.target,
        decidedBy: input.decidedBy,
      },
    });

    await updateRun(bundle.run.id, {
      status: "running",
      metadata: {
        ...bundle.run.metadata,
        operatorJobId: updatedJob.id,
        operatorJobStatus: updatedJob.status,
        operatorDecisionBy: input.decidedBy,
      },
    });

    await syncConversationWorkspaceState({
      requesterUserId: bundle.run.requesterUserId,
      conversationId: typeof bundle.run.metadata?.conversationId === "string" ? bundle.run.metadata.conversationId : null,
      actor: {
        id: input.decidedBy,
        email: input.decidedByEmail,
      },
      operatorJobStatus: updatedJob.status,
      bypassOwnership: true,
    });

    const response = await executeAgentRun(
      {
        ...bundle.run,
        status: "running",
        metadata: {
          ...bundle.run.metadata,
          operatorJobId: updatedJob.id,
          operatorJobStatus: updatedJob.status,
          operatorDecisionBy: input.decidedBy,
        },
      },
      input.decidedBy,
    );

    if (didRunPassDeliveryGate(response.run)) {
      await updateOperatorJobStatus({
        jobId: updatedJob.id,
        status: "completed",
        decidedBy: input.decidedBy,
        decisionNote: input.note ?? "Operator lane onaylandı ve AI görevi tamamladı.",
        metadata: {
          completedWithRunStatus: response.run.status,
          qualityPassed: true,
        },
      });

      return buildResponse(bundle.run.id, {
        summary: response.response.summary,
        details: response.response.details,
        affectedRecords: response.response.affectedRecords,
        nextSuggestions: response.response.nextSuggestions,
        missingFields: response.response.missingFields,
      }, response.customerContext ?? null);
    }

    const parkedJob = await updateOperatorJobStatus({
      jobId: updatedJob.id,
      status: "paused",
      decidedBy: input.decidedBy,
      decisionNote: input.note ?? "AI devam denemesi temiz bir sonuc uretmedi; is operator kuyruğunda kaldi.",
      metadata: {
        completedWithRunStatus: response.run.status,
        qualityPassed: false,
        clarification: response.run.metadata?.clarification === true,
      },
    });

    await appendRunStep({
      runId: bundle.run.id,
      stepOrder: stepOrder + 1,
      stepType: "operator_followup_required",
      title: "Operator isi yeniden insan kararina alindi",
      status: "completed",
      payload: {
        operatorJobId: parkedJob.id,
        target: parkedJob.target,
        decidedBy: input.decidedBy,
        qualityPassed: false,
      },
    });

    await updateRun(bundle.run.id, {
      metadata: {
        ...response.run.metadata,
        operatorJobId: parkedJob.id,
        operatorJobStatus: parkedJob.status,
        operatorDecisionBy: input.decidedBy,
        operatorNeedsFollowUp: true,
      },
    });

    return buildResponse(bundle.run.id, {
      summary: "Operator isi kuyrukta kaldi.",
      details: "AI devam denemesi temiz bir cikti uretmedi. Is operator kuyruğunda tutuldu; takeover ile manuel ilerleyebilir veya daha dar bir follow-up ile tekrar deneyebilirsiniz.",
      nextSuggestions: ["Takeover ile manuel devam et", "Istegi daha dar bir hedefle tekrar dene", ...response.response.nextSuggestions].slice(0, 3),
      missingFields: response.response.missingFields,
      affectedRecords: response.response.affectedRecords,
    }, response.customerContext ?? null);

  }

  if (input.action === "pause") {
    const updatedJob = await updateOperatorJobStatus({
      jobId: input.jobId,
      status: "paused",
      decidedBy: input.decidedBy,
      decisionNote: input.note ?? "Operator işi geçici olarak duraklatildi.",
    });

    await appendRunStep({
      runId: bundle.run.id,
      stepOrder,
      stepType: "operator_paused",
      title: "Operator isi duraklatildi",
      status: "completed",
      payload: {
        operatorJobId: updatedJob.id,
        note: updatedJob.decisionNote,
      },
    });

    await updateRun(bundle.run.id, {
      status: "awaiting_approval",
      summary: "Operator isi duraklatildi.",
      responseText: "Bu operator isi beklemeye alindi. Ayni sohbetten daha sonra kaldigi yerden devam edebiliriz.",
      metadata: {
        ...bundle.run.metadata,
        operatorJobId: updatedJob.id,
        operatorJobStatus: updatedJob.status,
      },
    });

    await syncConversationWorkspaceState({
      requesterUserId: bundle.run.requesterUserId,
      conversationId: typeof bundle.run.metadata?.conversationId === "string" ? bundle.run.metadata.conversationId : null,
      actor: {
        id: input.decidedBy,
        email: input.decidedByEmail,
      },
      workspaceAction: "handoff_ready",
      handoffNote: updatedJob.decisionNote,
      operatorJobStatus: updatedJob.status,
      bypassOwnership: true,
    });

    return buildResponse(bundle.run.id, {
      summary: "Operator isi duraklatildi.",
      details: "Bu operator isi beklemeye alindi. Hazir oldugunuzda ayni queue’dan yeniden acabilirsiniz.",
      nextSuggestions: ["Daha sonra tekrar onayla", "Takeover ile manuel devam et"],
    });
  }

  if (input.action === "takeover") {
    const updatedJob = await updateOperatorJobStatus({
      jobId: input.jobId,
      status: "taken_over",
      decidedBy: input.decidedBy,
      decisionNote: input.note ?? "Is manuel takeover moduna alindi.",
    });

    await appendRunStep({
      runId: bundle.run.id,
      stepOrder,
      stepType: "operator_takeover",
      title: "Operator isi manuel takeover moduna alindi",
      status: "completed",
      payload: {
        operatorJobId: updatedJob.id,
        target: updatedJob.target,
        decidedBy: input.decidedBy,
      },
    });

    await updateRun(bundle.run.id, {
      status: "awaiting_approval",
      summary: "Operator isi manuel takeover modunda.",
      responseText: "Bu run artik insan operator tarafindan surdurulecek. Is tamamlandiginda not dusulebilir veya run kapatilabilir.",
      metadata: {
        ...bundle.run.metadata,
        operatorJobId: updatedJob.id,
        operatorJobStatus: updatedJob.status,
      },
    });

    await syncConversationWorkspaceState({
      requesterUserId: bundle.run.requesterUserId,
      conversationId: typeof bundle.run.metadata?.conversationId === "string" ? bundle.run.metadata.conversationId : null,
      actor: {
        id: input.decidedBy,
        email: input.decidedByEmail,
      },
      workspaceAction: "claim",
      handoffNote: updatedJob.decisionNote,
      operatorJobStatus: updatedJob.status,
      bypassOwnership: true,
    });

    return buildResponse(bundle.run.id, {
      summary: "Operator isi manuel takeover moduna alindi.",
      details: `Hedef: ${updatedJob.target}. AI bu turda geri cekildi; operator notlariyla devam edebilirsiniz.`,
      nextSuggestions: ["Operator tamamlayinca yeni not ekle", "Ayni sohbette sonucu ozetle"],
    });
  }

  const updatedJob = await updateOperatorJobStatus({
    jobId: input.jobId,
    status: "rejected",
    decidedBy: input.decidedBy,
    decisionNote: input.note ?? "Operator isi reddedildi.",
  });

  await appendRunStep({
    runId: bundle.run.id,
    stepOrder,
    stepType: "operator_rejected",
    title: "Operator isi reddedildi",
    status: "completed",
    payload: {
      operatorJobId: updatedJob.id,
      target: updatedJob.target,
      decidedBy: input.decidedBy,
      note: updatedJob.decisionNote,
    },
  });

  await updateRun(bundle.run.id, {
    status: "rejected",
    summary: "Operator isi reddedildi.",
    responseText: "Bu istek guvenlik veya operasyon tercihi nedeniyle durduruldu. Isterseniz daha dar bir read-only hedefle yeniden deneyebilirim.",
    metadata: {
      ...bundle.run.metadata,
      operatorJobId: updatedJob.id,
      operatorJobStatus: updatedJob.status,
    },
  });

  await syncConversationWorkspaceState({
    requesterUserId: bundle.run.requesterUserId,
    conversationId: typeof bundle.run.metadata?.conversationId === "string" ? bundle.run.metadata.conversationId : null,
    actor: {
      id: input.decidedBy,
      email: input.decidedByEmail,
    },
    workspaceAction: "handoff_ready",
    handoffNote: updatedJob.decisionNote,
    operatorJobStatus: updatedJob.status,
    bypassOwnership: true,
  });

  return buildResponse(bundle.run.id, {
    summary: "Operator isi reddedildi.",
    details: `Hedef ${updatedJob.target} icin operator onayi verilmedi. Daha dar veya read-only bir gorevle devam edebiliriz.`,
    nextSuggestions: buildScopeRecoverySuggestions(runScope, bundle.run.commandText),
  });
}

export async function finalizeCopilotOperatorJob(input: {
  jobId: string;
  outcome: "completed" | "failed";
  decidedBy: string;
  decidedByEmail?: string | null;
  note?: string;
}): Promise<CopilotCommandResponse> {
  const job = await getOperatorJob(input.jobId);
  if (!job) {
    throw new Error("Operator işi bulunamadı.");
  }

  const bundle = await getRunBundle(job.runId);
  if (!bundle.run) {
    throw new Error("Operator işine ait run bulunamadı.");
  }

  const runScope: CopilotScope = {
    type: bundle.run.scopeType,
    refId: bundle.run.scopeRefId,
    label: typeof bundle.run.metadata?.scopeLabel === "string" ? bundle.run.metadata.scopeLabel : null,
  };
  const stepOrder = bundle.timeline.length + 1;
  const nextStatus = input.outcome === "completed" ? "completed" : "failed";
  const updatedJob = await updateOperatorJobStatus({
    jobId: input.jobId,
    status: nextStatus,
    decidedBy: input.decidedBy,
    decisionNote: input.note ?? (input.outcome === "completed" ? "Operator işi tamamlandı." : "Operator işi başarısız oldu."),
  });

  await appendRunStep({
    runId: bundle.run.id,
    stepOrder,
    stepType: input.outcome === "completed" ? "operator_completed" : "operator_failed",
    title: input.outcome === "completed" ? "Operator isi tamamlandi" : "Operator isi basarisiz oldu",
    status: input.outcome === "completed" ? "completed" : "failed",
    payload: {
      operatorJobId: updatedJob.id,
      target: updatedJob.target,
      decidedBy: input.decidedBy,
      note: updatedJob.decisionNote,
    },
  });

  if (input.outcome === "completed") {
    await updateRun(bundle.run.id, {
      status: "completed",
      summary: "Operator isi tamamlandi.",
      responseText: updatedJob.decisionNote ?? "Bu run paired operator lane uzerinden tamamlandi.",
      metadata: {
        ...bundle.run.metadata,
        operatorJobId: updatedJob.id,
        operatorJobStatus: updatedJob.status,
        operatorCompletedBy: input.decidedBy,
      },
    });

    await syncConversationWorkspaceState({
      requesterUserId: bundle.run.requesterUserId,
      conversationId: typeof bundle.run.metadata?.conversationId === "string" ? bundle.run.metadata.conversationId : null,
      actor: {
        id: input.decidedBy,
        email: input.decidedByEmail,
      },
      workspaceAction: "handoff_ready",
      handoffNote: updatedJob.decisionNote,
      operatorJobStatus: updatedJob.status,
      bypassOwnership: true,
    });

    return buildResponse(bundle.run.id, {
      summary: "Operator isi tamamlandi.",
      details: updatedJob.decisionNote ?? `Hedef ${updatedJob.target} paired operator lane uzerinden tamamlandi.`,
      nextSuggestions: ["Sonucu ozetle", "Ayni hedef icin yeni görev aç", "Run geçmişini aç"],
    });
  }

  await updateRun(bundle.run.id, {
    status: "failed",
    summary: "Operator isi başarısız oldu.",
    responseText: updatedJob.decisionNote ?? "Bu run operator lane üzerinde tamamlanamadı.",
    metadata: {
      ...bundle.run.metadata,
      operatorJobId: updatedJob.id,
      operatorJobStatus: updatedJob.status,
      operatorFailedBy: input.decidedBy,
    },
  });

  await syncConversationWorkspaceState({
    requesterUserId: bundle.run.requesterUserId,
    conversationId: typeof bundle.run.metadata?.conversationId === "string" ? bundle.run.metadata.conversationId : null,
    actor: {
      id: input.decidedBy,
      email: input.decidedByEmail,
    },
    workspaceAction: "handoff_ready",
    handoffNote: updatedJob.decisionNote,
    operatorJobStatus: updatedJob.status,
    bypassOwnership: true,
  });

  return buildResponse(bundle.run.id, {
    summary: "Operator isi başarısız oldu.",
    details: updatedJob.decisionNote ?? `Hedef ${updatedJob.target} icin operator lane görevi tamamlanamadı.`,
    nextSuggestions: buildScopeRecoverySuggestions(runScope, bundle.run.commandText),
  });
}

export async function getCopilotRun(runId: string): Promise<CopilotCommandResponse> {
  const bundle = await getRunBundle(runId);
  if (!bundle.run) {
    throw new Error("Run bulunamadı.");
  }

  const customerId = getCustomerIdFromInput(bundle.run.toolInput) ?? bundle.run.scopeRefId ?? undefined;
  const customerContext = customerId ? await getCustomer360(customerId).catch(() => null) : null;
  const operatorJobs = await listOperatorJobs().then((jobs) => jobs.filter((job) => job.runId === runId));

  return {
    run: bundle.run,
    timeline: bundle.timeline,
    approvals: bundle.approvals,
    operatorJobs,
    artifacts: bundle.artifacts,
    deliveries: bundle.deliveries,
    response: {
      summary: bundle.run.summary ?? "Run kaydı yüklendi.",
      details: bundle.run.responseText ?? undefined,
      nextSuggestions: [],
      affectedRecords: (bundle.run.metadata?.affectedRecords as Array<{ type: string; id: string; label?: string }> | undefined) ?? [],
    },
    customerContext,
  };
}

export async function getCopilotDashboard(customerId?: string): Promise<{
  dashboard: CopilotDashboardData;
  customerContext: Record<string, unknown> | null;
}> {
  const dashboard = await getDashboardData();
  const customerContext = customerId ? await getCustomer360(customerId).catch(() => null) : null;
  return { dashboard, customerContext };
}

export async function getCopilotConversation(input: {
  requesterUserId: string;
  scope: CopilotScope;
  conversationId?: string | null;
}): Promise<CopilotCommandResponse[]> {
  const runs = input.conversationId
    ? await getConversationRuns(input.requesterUserId, input.conversationId, 24)
    : await getActiveSessionRuns(input.requesterUserId, input.scope, 24, input.conversationId ?? null);
  if (runs.length === 0) {
    return [];
  }

  const bundles = await Promise.all(runs.map((run) => getCopilotRun(run.id)));
  return bundles;
}

export async function getCopilotConversations(input: {
  requesterUserId: string;
}) {
  return getRecentConversations(input.requesterUserId, 16);
}

export async function getCopilotConversationMemory(input: {
  requesterUserId: string;
  conversationId: string;
}) {
  return getConversationMemory(input.requesterUserId, input.conversationId);
}

export async function updateCopilotConversationMemory(input: {
  requesterUserId: string;
  conversationId: string;
  actor?: ConversationWorkspaceActor;
  title?: string | null;
  projectId?: string | null;
  workingGoal?: string | null;
  handoffNote?: string | null;
  handoffChecklist?: string[] | null;
  workspaceAction?: ConversationWorkspaceAction | null;
  bypassOwnership?: boolean;
}) {
  const memory = await getConversationMemory(input.requesterUserId, input.conversationId);
  if (!memory) {
    throw new Error("Sohbet hafızası bulunamadı.");
  }

  const scope: CopilotScope = {
    type: memory.scopeType,
    refId: memory.scopeRefId ?? undefined,
    label: memory.scopeLabel ?? null,
  };
  const project = input.projectId
    ? await resolveCopilotProject(input.projectId, scope, null)
    : null;
  const workspaceState = resolveConversationWorkspaceState(memory, {
    actor: input.actor ?? { id: input.requesterUserId },
    workspaceAction: input.workspaceAction,
    handoffChecklist: input.handoffChecklist,
    bypassOwnership: input.bypassOwnership,
  });

  await updateConversationMemoryState({
    conversationId: input.conversationId,
    suggestedTitle: input.title ?? memory.title,
    metadataPatch: {
      projectId: project?.id ?? null,
      projectName: project?.name ?? null,
      workingGoal: input.workingGoal ?? null,
      handoffNote: input.handoffNote ?? null,
      ...workspaceState,
      memoryUpdatedAt: new Date().toISOString(),
    },
  });

  return getConversationMemory(input.requesterUserId, input.conversationId);
}

export async function getCopilotOperatorJobs() {
  return listOperatorJobs("open");
}

export async function deliverCopilotArtifact(input: {
  artifactId: string;
  channel: "portal" | "in_app" | "email";
}): Promise<{
  artifact: CopilotArtifactRecord;
  deliveryIds: string[];
  customerId: string;
}> {
  const client = adminDb();
  const { data, error } = await client
    .from("ai_artifacts")
    .select("id,customer_id,run_id,title,content")
    .eq("id", input.artifactId)
    .single();

  if (error || !data?.customer_id) {
    throw new Error(error?.message ?? "Artifact müşteri bilgisiyle birlikte bulunamadı.");
  }

  const delivery = await deliverArtifactToCustomer({
    artifactId: input.artifactId,
    customerId: data.customer_id,
    channel: input.channel,
  }, {
    runId: data.run_id,
    title: data.title,
    content: data.content,
  });

  return {
    artifact: delivery.artifact,
    deliveryIds: delivery.deliveryIds,
    customerId: data.customer_id,
  };
}
