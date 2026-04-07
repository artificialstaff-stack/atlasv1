import { existsSync } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { resolveAtlasOutputPath } from "@/lib/runtime-paths";
import type {
  AtlasAutofixProposal,
  AtlasJarvisDashboard,
  AtlasJarvisStoreShape,
  AtlasMorningBrief,
  AtlasObservationDecision,
  AtlasObservationFinding,
  AtlasObservationRun,
} from "./types";
import { getAtlasJourneyRoutes, listAtlasSurfaces } from "./surfaces";

function getJarvisStorePath() {
  return resolveAtlasOutputPath("jarvis", "store.json");
}

function getJarvisRunTimeoutMs() {
  const minutes = Number(process.env.ATLAS_JARVIS_RUN_TIMEOUT_MINUTES ?? "35");
  return Number.isFinite(minutes) && minutes > 0 ? minutes * 60 * 1000 : 35 * 60 * 1000;
}

async function ensureJarvisDirectory() {
  await mkdir(resolveAtlasOutputPath("jarvis"), { recursive: true });
}

function emptyStore(): AtlasJarvisStoreShape {
  return {
    recentRuns: [],
    activeFindings: [],
    proposals: [],
    briefs: [],
    decisions: [],
  };
}

function normalizeRecentRuns(runs: AtlasObservationRun[]) {
  const now = Date.now();
  const timeoutMs = getJarvisRunTimeoutMs();
  const sortedRuns = [...runs].sort(
    (left, right) => new Date(right.startedAt).getTime() - new Date(left.startedAt).getTime(),
  );
  let changed = false;
  let activeRunningRunSeen = false;

  const normalizedRuns = sortedRuns.map((run) => {
    if (run.status !== "running") {
      return run;
    }

    const startedAt = new Date(run.startedAt).getTime();
    const ageMs = Number.isFinite(startedAt) ? now - startedAt : timeoutMs + 1;

    if (ageMs > timeoutMs) {
      changed = true;
      return {
        ...run,
        status: "failed" as const,
        completedAt: run.completedAt ?? new Date(now).toISOString(),
        error: run.error ?? "Jarvis observer run zaman aşımına uğradı.",
        summary: "Jarvis observer run zaman aşımı nedeniyle kapatıldı.",
      };
    }

    if (activeRunningRunSeen) {
      changed = true;
      return {
        ...run,
        status: "failed" as const,
        completedAt: run.completedAt ?? new Date(now).toISOString(),
        error: run.error ?? "Jarvis observer run daha yeni bir sweep tarafından gölgelendi.",
        summary: "Jarvis observer run daha yeni bir sweep tarafından gölgelendi.",
      };
    }

    activeRunningRunSeen = true;
    return run;
  });

  return {
    changed,
    runs: normalizedRuns,
  };
}

function severityRank(severity: AtlasObservationFinding["severity"]) {
  switch (severity) {
    case "p0":
      return 0;
    case "p1":
      return 1;
    default:
      return 2;
  }
}

function looksInvalidStoredBrief(value: string | null | undefined) {
  const normalized = value?.trim();
  if (!normalized) {
    return true;
  }

  const lowered = normalized.toLocaleLowerCase("tr-TR");
  return (
    lowered.includes("prompt_workspace") ||
    lowered.includes("styles.css") ||
    lowered.includes("app.js") ||
    lowered.includes("index.html") ||
    lowered.includes("workspace/") ||
    lowered.includes("i changed") ||
    lowered.includes("istenen değişikliği için") ||
    lowered.includes("doğrulama da geçti")
  );
}

function buildRepairedBrief(store: AtlasJarvisStoreShape): AtlasMorningBrief {
  const findings = [...store.activeFindings].sort((left, right) => severityRank(left.severity) - severityRank(right.severity));
  const p0 = findings.filter((finding) => finding.severity === "p0").length;
  const p1 = findings.filter((finding) => finding.severity === "p1").length;
  const p2 = findings.filter((finding) => finding.severity === "p2").length;

  return {
    id: `jarvis-brief-repaired-${Date.now()}`,
    createdAt: new Date().toISOString(),
    headline: p0 > 0 ? `Jarvis ${p0} kritik launch blokajı buldu` : "Jarvis gece taramasını tamamladı",
    summary: `Siz yokken ${getAtlasJourneyRoutes().length} yüzeyi taradım. ${p0} P0, ${p1} P1 ve ${p2} P2 issue var. ${store.proposals.length} düşük riskli düzeltme adayı branch için hazırlandı.`,
    topFindings: findings.slice(0, 4).map((finding) => finding.title),
    proposedActions: [
      "Support/request/store context zincirini tek kaynakta sabitle.",
      "Modal içinde page-only surface açılan aileleri surface contract ile kapat.",
      "Düşük riskli copy/layout düzeltmelerini ayrı Jarvis branch’lerinde hazırla.",
    ],
    stats: {
      journeysRun: getAtlasJourneyRoutes().length,
      p0,
      p1,
      p2,
      proposals: store.proposals.length,
    },
  };
}

const OPEN_FINDING_STATUSES = new Set<AtlasObservationFinding["status"]>(["observed", "triaged"]);

function isOpenFinding(finding: AtlasObservationFinding) {
  return OPEN_FINDING_STATUSES.has(finding.status);
}

function briefOutOfSync(
  brief: AtlasMorningBrief | null,
  findings: AtlasObservationFinding[],
  proposals: AtlasAutofixProposal[],
) {
  if (!brief) {
    return true;
  }

  const p0 = findings.filter((finding) => finding.severity === "p0").length;
  const p1 = findings.filter((finding) => finding.severity === "p1").length;
  const p2 = findings.filter((finding) => finding.severity === "p2").length;
  const visibleTitles = new Set(findings.map((finding) => finding.title));

  return (
    brief.stats.journeysRun !== getAtlasJourneyRoutes().length
    ||
    brief.stats.p0 !== p0
    || brief.stats.p1 !== p1
    || brief.stats.p2 !== p2
    || brief.stats.proposals !== proposals.length
    || brief.topFindings.some((title) => !visibleTitles.has(title))
  );
}

async function readStore(): Promise<AtlasJarvisStoreShape> {
  const storePath = getJarvisStorePath();
  if (!existsSync(storePath)) {
    return emptyStore();
  }

  const raw = await readFile(storePath, "utf8");
  if (!raw.trim()) {
    return emptyStore();
  }

  const parsed = JSON.parse(raw) as Partial<AtlasJarvisStoreShape>;
  const store = {
    recentRuns: Array.isArray(parsed.recentRuns) ? parsed.recentRuns : [],
    activeFindings: Array.isArray(parsed.activeFindings) ? parsed.activeFindings : [],
    proposals: Array.isArray(parsed.proposals) ? parsed.proposals : [],
    briefs: Array.isArray(parsed.briefs) ? parsed.briefs : [],
    decisions: Array.isArray(parsed.decisions) ? parsed.decisions : [],
  };

  const normalizedRuns = normalizeRecentRuns(store.recentRuns);
  if (normalizedRuns.changed) {
    store.recentRuns = normalizedRuns.runs;
    await ensureJarvisDirectory();
    await writeFile(storePath, JSON.stringify(store, null, 2), "utf8");
  }

  return store;
}

async function writeStore(store: AtlasJarvisStoreShape) {
  await ensureJarvisDirectory();
  await writeFile(getJarvisStorePath(), JSON.stringify(store, null, 2), "utf8");
}

export async function getJarvisStore() {
  return readStore();
}

export async function saveObservationRun(run: AtlasObservationRun) {
  const store = await readStore();
  const remainingRuns = store.recentRuns.filter((item) => item.id !== run.id);
  store.recentRuns = [run, ...remainingRuns].slice(0, 24);
  await writeStore(store);
}

export async function saveObservationFindings(findings: AtlasObservationFinding[]) {
  const store = await readStore();
  const incomingSignatures = new Set(findings.map((finding) => finding.duplicateSignature));
  const replaceableStatuses = new Set<AtlasObservationFinding["status"]>(["observed", "triaged"]);

  store.activeFindings = store.activeFindings.filter((finding) => {
    if (!replaceableStatuses.has(finding.status)) {
      return true;
    }

    return incomingSignatures.has(finding.duplicateSignature);
  });

  const existingBySignature = new Map(store.activeFindings.map((finding) => [finding.duplicateSignature, finding]));
  const canonicalFindings: AtlasObservationFinding[] = [];

  for (const finding of findings) {
    const existing = existingBySignature.get(finding.duplicateSignature);
    if (existing) {
      existing.updatedAt = finding.updatedAt;
      existing.summary = finding.summary;
      existing.whyItMatters = finding.whyItMatters;
      existing.suggestedFix = finding.suggestedFix;
      existing.confidence = Math.max(existing.confidence, finding.confidence);
      existing.artifacts = finding.artifacts.length > 0 ? finding.artifacts : existing.artifacts;
      existing.targetFiles = finding.targetFiles.length > 0 ? finding.targetFiles : existing.targetFiles;
      existing.riskLevel = finding.riskLevel;
      existing.status = existing.status === "verified" ? existing.status : finding.status;
      existing.source = finding.source;
      canonicalFindings.push(existing);
      continue;
    }

    store.activeFindings.unshift(finding);
    existingBySignature.set(finding.duplicateSignature, finding);
    canonicalFindings.push(finding);
  }

  store.activeFindings = store.activeFindings
    .sort((left, right) => new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime())
    .slice(0, 200);

  await writeStore(store);
  return canonicalFindings;
}

export async function saveAutofixProposals(proposals: AtlasAutofixProposal[]) {
  const store = await readStore();
  const existing = new Map(store.proposals.map((proposal) => [proposal.findingId, proposal]));
  for (const proposal of proposals) {
    const current = existing.get(proposal.findingId);
    if (current && (current.status === "prepared" || current.status === "verified")) {
      existing.set(proposal.findingId, {
        ...proposal,
        id: current.id,
        branchName: current.branchName,
        worktreePath: current.worktreePath,
        status: current.status,
        createdAt: current.createdAt,
        preparedAt: current.preparedAt ?? proposal.preparedAt,
        verifiedAt: current.verifiedAt ?? proposal.verifiedAt,
        lastNote: current.lastNote ?? proposal.lastNote,
      });
      continue;
    }

    existing.set(proposal.findingId, proposal);
  }
  const validFindingIds = new Set(store.activeFindings.map((finding) => finding.id));
  store.proposals = Array.from(existing.values())
    .filter((proposal) => validFindingIds.has(proposal.findingId))
    .sort((left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime())
    .slice(0, 80);
  await writeStore(store);
}

export async function upsertAutofixProposal(proposal: AtlasAutofixProposal) {
  const store = await readStore();
  const existing = new Map(store.proposals.map((item) => [item.id, item]));
  existing.set(proposal.id, proposal);
  store.proposals = Array.from(existing.values())
    .sort((left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime())
    .slice(0, 80);
  await writeStore(store);
}

export async function saveMorningBrief(brief: AtlasMorningBrief) {
  const store = await readStore();
  store.briefs = [brief, ...store.briefs.filter((item) => item.id !== brief.id)].slice(0, 20);
  await writeStore(store);
}

export async function saveObservationDecision(decision: AtlasObservationDecision) {
  const store = await readStore();
  store.decisions = [decision, ...store.decisions].slice(0, 400);
  await writeStore(store);
}

export async function updateFindingStatus(
  findingId: string,
  patch: Partial<Pick<AtlasObservationFinding, "status" | "updatedAt" | "suggestedFix" | "summary">>,
) {
  const store = await readStore();
  store.activeFindings = store.activeFindings.map((finding) =>
    finding.id === findingId
      ? {
          ...finding,
          ...patch,
          updatedAt: patch.updatedAt ?? finding.updatedAt,
        }
      : finding,
  );
  await writeStore(store);
}

export async function getAutofixProposalById(proposalId: string) {
  const store = await readStore();
  return store.proposals.find((proposal) => proposal.id === proposalId) ?? null;
}

export async function getFindingById(findingId: string) {
  const store = await readStore();
  return store.activeFindings.find((finding) => finding.id === findingId) ?? null;
}

export async function getJarvisDashboard(provider: AtlasJarvisDashboard["provider"]): Promise<AtlasJarvisDashboard> {
  const store = await readStore();
  const openFindings = store.activeFindings.filter(isOpenFinding);
  const validFindingIds = new Set(openFindings.map((finding) => finding.id));
  const openFindingIds = new Set(openFindings.map((finding) => finding.id));
  const openProposals = store.proposals.filter((proposal) => validFindingIds.has(proposal.findingId) && openFindingIds.has(proposal.findingId));
  const latestBrief = store.briefs[0] ?? null;
  let repairedBrief = latestBrief;

  if (
    !latestBrief
    || looksInvalidStoredBrief(latestBrief.headline)
    || looksInvalidStoredBrief(latestBrief.summary)
    || briefOutOfSync(latestBrief, openFindings, openProposals)
  ) {
    repairedBrief = buildRepairedBrief({
      ...store,
      activeFindings: openFindings,
      proposals: openProposals,
    });
    store.briefs = [repairedBrief, ...store.briefs.filter((item) => item.id !== repairedBrief?.id)].slice(0, 20);
    await writeStore(store);
  }

  return {
    surfaces: listAtlasSurfaces(),
    recentRuns: store.recentRuns,
    activeFindings: openFindings,
    proposals: openProposals,
    latestBrief: repairedBrief,
    provider,
  };
}
