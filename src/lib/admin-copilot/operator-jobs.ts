import { createHmac, randomUUID } from "node:crypto";
import { existsSync } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import type {
  CopilotOperatorAllowlistRule,
  CopilotOperatorCompanionRecord,
  CopilotOperatorJobRecord,
  CopilotOperatorJobStatus,
  CopilotRunRecord,
  CopilotScope,
  WorkerTarget,
} from "./types";
import { resolveAtlasOutputPath } from "@/lib/runtime-paths";

const DEFAULT_OPERATOR_RULES: CopilotOperatorAllowlistRule[] = [
  {
    id: "admin-internal",
    label: "Admin internal",
    description: "ATLAS Admin içindeki sayfalar yerel operator lane için izinli.",
    kind: "path_prefix",
    pattern: "/admin/",
  },
  {
    id: "portal-internal",
    label: "Portal internal",
    description: "ATLAS Portal içindeki sayfalar yerel operator lane için izinli.",
    kind: "path_prefix",
    pattern: "/panel/",
  },
  {
    id: "atlas-local-hosts",
    label: "Atlas local hosts",
    description: "Yerel Atlas hostları operator lane allowlist içindedir.",
    kind: "hostname",
    pattern: "admin.atlas.localhost,portal.atlas.localhost,localhost,127.0.0.1",
  },
];

const NATURAL_OPERATOR_TARGETS: Array<{
  path: string;
  patterns: RegExp[];
}> = [
  {
    path: "/admin/customers",
    patterns: [/(musteriler sayfasi|müşteriler sayfası|musteri listesi|müşteri listesi|customer list|customers page)/i],
  },
  {
    path: "/admin/dashboard",
    patterns: [/(admin dashboard|yonetim paneli|yönetim paneli|dashboard sayfasi|dashboard sayfası)/i],
  },
  {
    path: "/admin/forms",
    patterns: [/(formlar sayfasi|formlar sayfası|form listesi|forms page)/i],
  },
  {
    path: "/admin/workflows",
    patterns: [/(workflow sayfasi|workflow sayfası|surecler sayfasi|süreçler sayfası|workflows page)/i],
  },
  {
    path: "/admin/companies",
    patterns: [/(llc sayfasi|llc sayfası|sirketler sayfasi|şirketler sayfası|companies page)/i],
  },
  {
    path: "/panel/dashboard",
    patterns: [/(portal dashboard|musteri dashboard|müşteri dashboard|panel dashboard)/i],
  },
  {
    path: "/panel/process",
    patterns: [/(surec takibi|süreç takibi|process page|yapilacaklar akisi)/i],
  },
  {
    path: "/panel/documents",
    patterns: [/(belgeler sayfasi|belgeler sayfası|documents page)/i],
  },
];

type OperatorJobStoreShape = {
  jobs: CopilotOperatorJobRecord[];
  companions: CopilotOperatorCompanionRecord[];
};

type OperatorTargetMatch = {
  allowlisted: boolean;
  allowlistRuleId: string | null;
  surface: CopilotOperatorJobRecord["surface"];
  normalizedTarget: string;
};

export function normalizeOperatorCommand(commandText: string) {
  return commandText
    .toLocaleLowerCase("tr-TR")
    .replace(/\s+/g, " ")
    .trim();
}

export function extractOperatorTarget(commandText: string) {
  const explicitUrl = commandText.match(/https?:\/\/[^\s)]+/i)?.[0];
  if (explicitUrl) {
    return explicitUrl;
  }

  const internalPath = commandText.match(/(?:^|\s)(\/(?:admin|panel)\/[^\s)]+)/i)?.[1];
  if (internalPath) {
    return internalPath;
  }

  const normalized = normalizeOperatorCommand(commandText);
  const matchedNaturalTarget = NATURAL_OPERATOR_TARGETS.find((candidate) =>
    candidate.patterns.some((pattern) => pattern.test(normalized)),
  );

  return matchedNaturalTarget?.path ?? null;
}

export function shouldRequireOperatorJob(commandText: string) {
  const normalized = normalizeOperatorCommand(commandText);
  const hasTarget = Boolean(extractOperatorTarget(commandText));
  const hasBrowserContext = /(browser|sayfa|site|web|ekran|panel|dashboard|portal|admin)/i.test(normalized);
  const hasInteractiveVerb = /(tikla|tıkla|doldur|submit|gonder|gönder|kaydet|save|onayla|approve|reddet|reject|yayinla|yayınla|publish|sil|delete|olustur|oluştur|create|baglan|bağlan|login|giris|giriş|cikis|çıkış|upload|yukle|yükle|entegre et|ac|aç)/i.test(normalized);
  const isReadOnlyIntent = /(incele|oku|ozetle|özetle|kontrol et|bak|listele|goster|göster|extract|crawl)/i.test(normalized);

  return hasTarget && hasBrowserContext && hasInteractiveVerb && !isReadOnlyIntent;
}

function getOperatorStorePath() {
  const customPath = process.env.ATLAS_OPERATOR_JOB_STORE_PATH;
  if (customPath?.trim()) {
    return path.resolve(customPath.trim());
  }

  return resolveAtlasOutputPath("operator-jobs", "jobs.json");
}

async function ensureOperatorStoreDirectory() {
  await mkdir(path.dirname(getOperatorStorePath()), { recursive: true });
}

async function readOperatorStore(): Promise<OperatorJobStoreShape> {
  const storePath = getOperatorStorePath();
  if (!existsSync(storePath)) {
    return { jobs: [], companions: [] };
  }

  const raw = await readFile(storePath, "utf8");
  if (!raw.trim()) {
    return { jobs: [], companions: [] };
  }

  const parsed = JSON.parse(raw) as Partial<OperatorJobStoreShape>;
  return {
    jobs: Array.isArray(parsed.jobs) ? parsed.jobs : [],
    companions: Array.isArray(parsed.companions) ? parsed.companions : [],
  };
}

async function writeOperatorStore(store: OperatorJobStoreShape) {
  await ensureOperatorStoreDirectory();
  await writeFile(getOperatorStorePath(), JSON.stringify(store, null, 2), "utf8");
}

function getOperatorStaleMinutes() {
  const configured = Number.parseInt(process.env.ATLAS_OPERATOR_STALE_MINUTES ?? "", 10);
  if (Number.isFinite(configured) && configured > 0) {
    return configured;
  }

  return 30;
}

function getOperatorSignatureSecret() {
  return process.env.ATLAS_OPERATOR_JOB_SECRET ?? "atlas-operator-dev-secret";
}

function signOperatorPayload(payload: Record<string, unknown>) {
  return createHmac("sha256", getOperatorSignatureSecret())
    .update(JSON.stringify(payload))
    .digest("hex");
}

function matchOperatorTarget(target: string): OperatorTargetMatch {
  const normalizedTarget = target.trim();

  if (normalizedTarget.startsWith("/admin/")) {
    return {
      allowlisted: true,
      allowlistRuleId: "admin-internal",
      surface: "admin",
      normalizedTarget,
    };
  }

  if (normalizedTarget.startsWith("/panel/")) {
    return {
      allowlisted: true,
      allowlistRuleId: "portal-internal",
      surface: "portal",
      normalizedTarget,
    };
  }

  try {
    const parsed = new URL(normalizedTarget);
    const hostname = parsed.hostname.toLowerCase();
    const allowlistedHosts = new Set(["admin.atlas.localhost", "portal.atlas.localhost", "localhost", "127.0.0.1"]);
    const surface = parsed.pathname.startsWith("/admin")
      ? "admin"
      : parsed.pathname.startsWith("/panel")
        ? "portal"
        : "external";

    if (allowlistedHosts.has(hostname)) {
      return {
        allowlisted: true,
        allowlistRuleId: "atlas-local-hosts",
        surface,
        normalizedTarget: parsed.toString(),
      };
    }

    return {
      allowlisted: false,
      allowlistRuleId: null,
      surface,
      normalizedTarget: parsed.toString(),
    };
  } catch {
    return {
      allowlisted: false,
      allowlistRuleId: null,
      surface: normalizedTarget.startsWith("/admin/")
        ? "admin"
        : normalizedTarget.startsWith("/panel/")
          ? "portal"
          : "external",
      normalizedTarget,
    };
  }
}

function sortJobsDescending(left: CopilotOperatorJobRecord, right: CopilotOperatorJobRecord) {
  return new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime();
}

function sortCompanionsDescending(left: CopilotOperatorCompanionRecord, right: CopilotOperatorCompanionRecord) {
  return new Date(right.lastHeartbeatAt).getTime() - new Date(left.lastHeartbeatAt).getTime();
}

function getCompanionMetadataValue(job: CopilotOperatorJobRecord, key: string) {
  const value = job.metadata?.[key];
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null;
}

function syncCompanionClaimState(store: OperatorJobStoreShape, job: CopilotOperatorJobRecord) {
  const companionId = getCompanionMetadataValue(job, "companionId");
  if (!companionId) {
    return;
  }

  const companionIndex = store.companions.findIndex((companion) => companion.id === companionId);
  if (companionIndex === -1) {
    return;
  }

  const companion = store.companions[companionIndex];
  const claimedByCompanion = getCompanionMetadataValue(job, "claimedBy") === "companion" && job.status === "taken_over";

  store.companions[companionIndex] = {
    ...companion,
    status: claimedByCompanion ? "busy" : "online",
    claimedJobId: claimedByCompanion ? job.id : null,
    claimedRunId: claimedByCompanion ? job.runId : null,
    lastHeartbeatAt: claimedByCompanion ? companion.lastHeartbeatAt : new Date().toISOString(),
  };
}

function isOpenOperatorJob(job: CopilotOperatorJobRecord) {
  return ["pending", "approved", "paused", "taken_over"].includes(job.status);
}

function isStaleOperatorJob(job: CopilotOperatorJobRecord, now = new Date()) {
  if (!isOpenOperatorJob(job)) {
    return false;
  }

  const updatedAt = new Date(job.updatedAt);
  if (Number.isNaN(updatedAt.getTime())) {
    return false;
  }

  const staleAfterMs = getOperatorStaleMinutes() * 60 * 1000;
  return now.getTime() - updatedAt.getTime() >= staleAfterMs;
}

async function applyOperatorStoreMaintenance(store: OperatorJobStoreShape) {
  const now = new Date();
  const nowIso = now.toISOString();
  let mutated = false;

  store.jobs = store.jobs.map((job) => {
    if (!isStaleOperatorJob(job, now)) {
      return job;
    }

    mutated = true;
    const staleJob: CopilotOperatorJobRecord = {
      ...job,
      status: "failed",
      updatedAt: nowIso,
      decidedAt: nowIso,
      decidedBy: job.decidedBy ?? "system",
      decisionNote: "Stale operator işi otomatik kapatıldı.",
      metadata: {
        ...job.metadata,
        staleClosedAt: nowIso,
        staleClosedBy: "system",
      },
    };
    syncCompanionClaimState(store, staleJob);
    return staleJob;
  });

  if (mutated) {
    store.jobs.sort(sortJobsDescending);
    store.companions.sort(sortCompanionsDescending);
    await writeOperatorStore(store);
  }

  return store;
}

async function readOperatorStoreWithMaintenance() {
  const store = await readOperatorStore();
  return applyOperatorStoreMaintenance(store);
}

export function getOperatorAllowlistRules() {
  return DEFAULT_OPERATOR_RULES;
}

export async function listOperatorCompanions() {
  const store = await readOperatorStoreWithMaintenance();
  return store.companions.sort(sortCompanionsDescending);
}

export async function upsertOperatorCompanionHeartbeat(input: {
  companionId: string;
  label: string;
  platform?: string | null;
  version?: string | null;
  capabilities?: string[];
  metadata?: Record<string, unknown>;
}) {
  const store = await readOperatorStoreWithMaintenance();
  const now = new Date().toISOString();
  const index = store.companions.findIndex((companion) => companion.id === input.companionId);
  const currentClaim = index >= 0 ? store.companions[index] : null;

  const next: CopilotOperatorCompanionRecord = {
    id: input.companionId,
    label: input.label,
    platform: input.platform ?? currentClaim?.platform ?? null,
    version: input.version ?? currentClaim?.version ?? null,
    capabilities: input.capabilities ?? currentClaim?.capabilities ?? [],
    status: currentClaim?.claimedJobId ? "busy" : "online",
    claimedJobId: currentClaim?.claimedJobId ?? null,
    claimedRunId: currentClaim?.claimedRunId ?? null,
    lastHeartbeatAt: now,
    metadata: {
      ...(currentClaim?.metadata ?? {}),
      ...(input.metadata ?? {}),
    },
  };

  if (index === -1) {
    store.companions = [next, ...store.companions];
  } else {
    store.companions[index] = next;
  }

  store.companions.sort(sortCompanionsDescending);
  await writeOperatorStore(store);
  return next;
}

export async function claimNextOperatorJob(input: {
  companionId: string;
  label: string;
  platform?: string | null;
  version?: string | null;
  capabilities?: string[];
}) {
  const store = await readOperatorStore();
  const now = new Date().toISOString();
  const companion = await upsertOperatorCompanionHeartbeat({
    companionId: input.companionId,
    label: input.label,
    platform: input.platform,
    version: input.version,
    capabilities: input.capabilities,
  });

  const claimedCandidate = store.jobs.find((job) =>
    getCompanionMetadataValue(job, "companionId") === companion.id
    && getCompanionMetadataValue(job, "claimedBy") === "companion"
    && ["pending", "approved", "paused", "taken_over"].includes(job.status),
  );

  if (claimedCandidate) {
    const refreshedCompanion: CopilotOperatorCompanionRecord = {
      ...companion,
      status: "busy",
      claimedJobId: claimedCandidate.id,
      claimedRunId: claimedCandidate.runId,
      lastHeartbeatAt: now,
    };
    const nextStore = await readOperatorStoreWithMaintenance();
    const companionIndex = nextStore.companions.findIndex((item) => item.id === companion.id);
    if (companionIndex >= 0) {
      nextStore.companions[companionIndex] = refreshedCompanion;
      await writeOperatorStore(nextStore);
    }
    return {
      companion: refreshedCompanion,
      job: claimedCandidate,
    };
  }

  const nextIndex = store.jobs.findIndex((job) =>
    job.allowlisted
    && job.workerTarget === "browser_local"
    && ["pending", "approved", "paused"].includes(job.status)
    && !getCompanionMetadataValue(job, "companionId"),
  );

  if (nextIndex === -1) {
    const companionIndex = store.companions.findIndex((item) => item.id === companion.id);
    if (companionIndex >= 0) {
      store.companions[companionIndex] = {
        ...store.companions[companionIndex],
        status: "online",
        claimedJobId: null,
        claimedRunId: null,
        lastHeartbeatAt: now,
      };
      await writeOperatorStore(store);
      return {
        companion: store.companions[companionIndex],
        job: null,
      };
    }

    return {
      companion,
      job: null,
    };
  }

  const current = store.jobs[nextIndex];
  const updatedJob: CopilotOperatorJobRecord = {
    ...current,
    status: "taken_over",
    updatedAt: now,
    decidedAt: now,
    decidedBy: companion.id,
    decisionNote: `${input.label} işi claim etti.`,
    metadata: {
      ...current.metadata,
      companionId: companion.id,
      companionLabel: input.label,
      claimedAt: now,
      claimedBy: "companion",
    },
  };
  store.jobs[nextIndex] = updatedJob;

  const companionIndex = store.companions.findIndex((item) => item.id === companion.id);
  if (companionIndex >= 0) {
    store.companions[companionIndex] = {
      ...store.companions[companionIndex],
      status: "busy",
      claimedJobId: updatedJob.id,
      claimedRunId: updatedJob.runId,
      lastHeartbeatAt: now,
    };
  }

  store.jobs.sort(sortJobsDescending);
  store.companions.sort(sortCompanionsDescending);
  await writeOperatorStore(store);

  return {
    companion: companionIndex >= 0 ? store.companions[companionIndex] : companion,
    job: updatedJob,
  };
}

export async function listOperatorJobs(status?: CopilotOperatorJobStatus | "open") {
  const store = await readOperatorStoreWithMaintenance();
  const jobs = status === "open"
    ? store.jobs.filter((job) => isOpenOperatorJob(job))
    : status
      ? store.jobs.filter((job) => job.status === status)
      : store.jobs;

  return jobs.sort(sortJobsDescending);
}

export async function getOperatorJob(jobId: string) {
  const store = await readOperatorStoreWithMaintenance();
  return store.jobs.find((job) => job.id === jobId) ?? null;
}

export async function createOperatorJob(input: {
  run: CopilotRunRecord;
  scope: CopilotScope;
  requesterUserId: string;
  commandText: string;
  target: string;
  title: string;
  description: string;
  workerTarget?: WorkerTarget;
  metadata?: Record<string, unknown>;
}) {
  const store = await readOperatorStoreWithMaintenance();
  const now = new Date().toISOString();
  const targetMatch = matchOperatorTarget(input.target);
  const signature = signOperatorPayload({
    runId: input.run.id,
    sessionId: input.run.sessionId,
    commandText: input.commandText,
    target: targetMatch.normalizedTarget,
    allowlisted: targetMatch.allowlisted,
  });

  const job: CopilotOperatorJobRecord = {
    id: randomUUID(),
    runId: input.run.id,
    sessionId: input.run.sessionId,
    conversationId:
      typeof input.run.metadata?.conversationId === "string"
        ? input.run.metadata.conversationId
        : null,
    requesterUserId: input.requesterUserId,
    scopeType: input.scope.type,
    scopeRefId: input.scope.refId ?? null,
    surface: targetMatch.surface,
    workerTarget: input.workerTarget ?? "browser_local",
    title: input.title,
    description: input.description,
    commandText: input.commandText,
    target: targetMatch.normalizedTarget,
    status: "pending",
    allowlisted: targetMatch.allowlisted,
    allowlistRuleId: targetMatch.allowlistRuleId,
    signature,
    createdAt: now,
    updatedAt: now,
    metadata: {
      ...(input.metadata ?? {}),
      scopeLabel: input.scope.label ?? null,
      allowlistRuleId: targetMatch.allowlistRuleId,
    },
  };

  store.jobs = [job, ...store.jobs].sort(sortJobsDescending);
  await writeOperatorStore(store);
  return job;
}

export async function updateOperatorJobStatus(input: {
  jobId: string;
  status: CopilotOperatorJobStatus;
  decidedBy?: string | null;
  decisionNote?: string | null;
  metadata?: Record<string, unknown>;
}) {
  const store = await readOperatorStoreWithMaintenance();
  const index = store.jobs.findIndex((job) => job.id === input.jobId);
  if (index === -1) {
    throw new Error("Operator işi bulunamadı.");
  }

  const current = store.jobs[index];
  const now = new Date().toISOString();
  const updated: CopilotOperatorJobRecord = {
    ...current,
    status: input.status,
    updatedAt: now,
    decidedAt: input.status === "pending" ? current.decidedAt ?? null : now,
    decidedBy: input.decidedBy ?? current.decidedBy ?? null,
    decisionNote: input.decisionNote ?? current.decisionNote ?? null,
    metadata: {
      ...current.metadata,
      ...(input.metadata ?? {}),
    },
  };

  store.jobs[index] = updated;
  syncCompanionClaimState(store, updated);
  store.jobs.sort(sortJobsDescending);
  store.companions.sort(sortCompanionsDescending);
  await writeOperatorStore(store);
  return updated;
}
