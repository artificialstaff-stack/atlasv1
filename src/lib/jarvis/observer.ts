import { createHash, randomUUID } from "node:crypto";
import { existsSync } from "node:fs";
import { readFile, stat } from "node:fs/promises";
import { generateText } from "ai";
import { getJarvisModelForSlot, getJarvisRoutingInfo } from "@/lib/ai/client";
import { resolveAtlasOutputPath } from "@/lib/runtime-paths";
import { listAtlasSurfaces, getAtlasJourneyRoutes } from "./surfaces";
import { getJarvisDashboard, saveAutofixProposals, saveMorningBrief, saveObservationFindings, saveObservationRun } from "./store";
import { buildJarvisBranchName, buildJarvisWorktreePath } from "./autofix";
import { runJarvisModalAudit } from "./modal-audit";
import { runJarvisRouteAudit } from "./route-audit";
import type {
  AtlasAutofixProposal,
  AtlasJarvisDashboard,
  AtlasMorningBrief,
  AtlasObservationFinding,
  AtlasObservationRun,
  AtlasObservationSeverity,
  AtlasObservationKind,
} from "./types";

let activeObservationPromise: Promise<AtlasJarvisDashboard> | null = null;

type LiveAuditEntry = {
  route: string;
  screenshot?: string | null;
  error?: string | null;
};

type LiveAuditShape = {
  customer?: LiveAuditEntry[];
  admin?: LiveAuditEntry[];
  marketing?: LiveAuditEntry[];
};

type RouteAuditShape = {
  status: "ok" | "failed";
  issues?: Array<{
    route: string;
    kind: AtlasObservationKind;
    severity: AtlasObservationSeverity;
    title: string;
    summary: string;
    screenshot?: string | null;
    detail?: string | null;
  }>;
  error?: string | null;
};

type StateConsistencyShape = {
  consistency?: Array<{
    surface: string;
    state: string;
    status: string;
  }>;
};

function nowIso() {
  return new Date().toISOString();
}

function severityRank(severity: AtlasObservationSeverity) {
  switch (severity) {
    case "p0":
      return 0;
    case "p1":
      return 1;
    default:
      return 2;
  }
}

async function safeReadJson<T>(filePath: string): Promise<T | null> {
  if (!existsSync(filePath)) {
    return null;
  }
  const raw = await readFile(filePath, "utf8");
  if (!raw.trim()) {
    return null;
  }
  return JSON.parse(raw) as T;
}

async function safeReadText(filePath: string) {
  if (!existsSync(filePath)) {
    return "";
  }
  return readFile(filePath, "utf8");
}

function getArtifactMaxAgeMs() {
  const minutes = Number(process.env.ATLAS_JARVIS_ARTIFACT_MAX_AGE_MINUTES ?? "90");
  return Number.isFinite(minutes) && minutes > 0 ? minutes * 60 * 1000 : 90 * 60 * 1000;
}

async function isFreshArtifact(filePath: string) {
  if (!existsSync(filePath)) {
    return false;
  }

  try {
    const metadata = await stat(filePath);
    return Date.now() - metadata.mtime.getTime() <= getArtifactMaxAgeMs();
  } catch {
    return false;
  }
}

async function safeReadFreshJson<T>(filePath: string): Promise<T | null> {
  if (!(await isFreshArtifact(filePath))) {
    return null;
  }

  return safeReadJson<T>(filePath);
}

async function safeReadFreshText(filePath: string) {
  if (!(await isFreshArtifact(filePath))) {
    return "";
  }

  return safeReadText(filePath);
}

function inferPersona(route: string) {
  if (route.startsWith("/admin/")) return "admin" as const;
  if (route.startsWith("/panel/")) return "customer" as const;
  return "public" as const;
}

function inferSurface(route: string) {
  return listAtlasSurfaces().find((surface) => surface.route === route) ?? null;
}

function buildDuplicateSignature(kind: AtlasObservationKind, route: string, title: string) {
  return createHash("sha256")
    .update(`${kind}:${route}:${title}`.toLocaleLowerCase("tr-TR"))
    .digest("hex");
}

function createFinding(input: {
  runId: string;
  route: string;
  kind: AtlasObservationKind;
  severity: AtlasObservationSeverity;
  title: string;
  summary: string;
  whyItMatters: string;
  suggestedFix: string;
  source: AtlasObservationFinding["source"];
  artifacts?: AtlasObservationFinding["artifacts"];
}) {
  const createdAt = nowIso();
  const surface = inferSurface(input.route);
  const duplicateSignature = buildDuplicateSignature(input.kind, input.route, input.title);
  const riskLevel =
    input.severity === "p0"
      ? "review-required"
      : input.kind === "copy_conflict" || input.kind === "empty_surface" || input.kind === "widget_hierarchy_gap"
        ? "auto-safe"
        : "review-required";

  return {
    id: `jarvis-finding-${randomUUID()}`,
    runId: input.runId,
    route: input.route,
    surfaceId: surface?.id ?? null,
    persona: inferPersona(input.route),
    kind: input.kind,
    severity: input.severity,
    confidence: input.severity === "p0" ? 0.9 : 0.72,
    title: input.title,
    summary: input.summary,
    whyItMatters: input.whyItMatters,
    suggestedFix: input.suggestedFix,
    duplicateSignature,
    status: "observed" as const,
    riskLevel,
    targetFiles: surface?.targetFiles ?? [],
    artifacts: input.artifacts ?? [],
    source: input.source,
    createdAt,
    updatedAt: createdAt,
  } satisfies AtlasObservationFinding;
}

function parseBacklogFindings(markdown: string, runId: string) {
  const findings: AtlasObservationFinding[] = [];
  let currentSeverity: AtlasObservationSeverity = "p2";

  for (const rawLine of markdown.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line) continue;
    if (/^##\s+P0/i.test(line)) currentSeverity = "p0";
    else if (/^##\s+P1/i.test(line)) currentSeverity = "p1";
    else if (/^##\s+P2/i.test(line)) currentSeverity = "p2";
    else if (line.startsWith("- ")) {
      const text = line.slice(2).trim();
      const lowered = text.toLocaleLowerCase("tr-TR");
      const route = lowered.includes("store")
        ? "/panel/store"
        : lowered.includes("support")
          ? "/panel/support"
          : lowered.includes("marketplace")
            ? "/panel/marketplaces"
            : lowered.includes("dashboard")
              ? "/panel/dashboard"
              : "/panel/services";
      const kind: AtlasObservationKind = lowered.includes("context")
        ? "cta_context_loss"
        : lowered.includes("copy")
          ? "copy_conflict"
          : lowered.includes("widget")
            ? "widget_hierarchy_gap"
            : "state_transition_mismatch";
      findings.push(createFinding({
        runId,
        route,
        kind,
        severity: currentSeverity,
        title: text,
        summary: text,
        whyItMatters: "Launch öncesi kullanıcı akışı, güven ve karar netliği bu issue’den etkileniyor.",
        suggestedFix: "İlgili route, CTA context ve surface contract eşlemesini aynı kaynaktan üret.",
        source: "demo_backlog",
        artifacts: [{
          kind: "report",
          path: resolveAtlasOutputPath("demo-audit", "improvement-backlog.md"),
          detail: `Severity ${currentSeverity.toUpperCase()}`,
        }],
      }));
    }
  }

  return findings;
}

function parseLiveAuditFindings(liveAudit: LiveAuditShape | null, runId: string) {
  if (!liveAudit) {
    return [] as AtlasObservationFinding[];
  }

  const findings: AtlasObservationFinding[] = [];
  const groups = [
    ...(liveAudit.customer ?? []),
    ...(liveAudit.admin ?? []),
    ...(liveAudit.marketing ?? []),
  ];

  for (const entry of groups) {
    if (!entry.error) {
      continue;
    }
    findings.push(createFinding({
      runId,
      route: entry.route,
      kind: "console_or_performance_regression",
      severity: "p0",
      title: `${entry.route} route audit failed`,
      summary: entry.error,
      whyItMatters: "Observer route’u kendi başına stabil açamıyorsa gece taraması güvenilmez hale gelir.",
      suggestedFix: "Route error, auth edge veya render exception kaynağını kapat ve ilgili journey testini stabilize et.",
      source: "playwright_audit",
      artifacts: [
        entry.screenshot ? { kind: "screenshot", path: entry.screenshot, detail: entry.route } : null,
        { kind: "report", path: resolveAtlasOutputPath("playwright", "live-audit-summary.json"), detail: entry.route },
      ].filter(Boolean) as AtlasObservationFinding["artifacts"],
    }));
  }

  return findings;
}

function parseRouteAuditFindings(routeAudit: RouteAuditShape | null, runId: string) {
  if (!routeAudit) {
    return [] as AtlasObservationFinding[];
  }

  if (routeAudit.status === "failed") {
    return [
      createFinding({
        runId,
        route: "/admin/ai",
        kind: "console_or_performance_regression",
        severity: "p0",
        title: "Full Atlas route audit failed",
        summary: routeAudit.error ?? "Jarvis route audit Atlas surface ailesini tamamlayamadi.",
        whyItMatters: "Atlas route taramasinin patlamasi, sistem genelindeki regressions ve state bozukluklarinin sessizce kacmasina neden olur.",
        suggestedFix: "Route audit login, navigation ve diagnostics zincirini stabilize et; customer, admin ve public lane'lerde audit surekliligini garanti altina al.",
        source: "playwright_audit",
        artifacts: [{
          kind: "report",
          path: resolveAtlasOutputPath("jarvis", "route-audit-summary.json"),
          detail: routeAudit.error ?? "route_audit_failed",
        }],
      }),
    ];
  }

  return (routeAudit.issues ?? []).map((issue) =>
    createFinding({
      runId,
      route: issue.route,
      kind: issue.kind,
      severity: issue.severity,
      title: issue.title,
      summary: issue.summary,
      whyItMatters:
        issue.kind === "console_or_performance_regression"
          ? "Route seviyesinde error veya request failure olması Atlas'in saglikli calistigi izlenimini dogrudan bozar."
          : issue.kind === "copy_conflict"
            ? "Ham copy veya translation sızıntısı ürün kalitesini ve güven hissini zedeler."
            : issue.kind === "empty_surface"
              ? "Boş yüzey sonraki adımı anlatmıyorsa kullanıcı ve operatör yönünü kaybeder."
              : issue.kind === "modal_surface_violation"
                ? "Route ve modal surface contract bozulursa bilgi mimarisi dağılır."
                : issue.kind === "widget_hierarchy_gap"
                  ? "Widget yoğunluğu ve başlık hiyerarşisi bozulduğunda sayfa profesyonel görünmez."
                  : "Layout bozukluğu taranabilir yüzey kalitesini ve okunabilirliği düşürür.",
      suggestedFix:
        issue.kind === "console_or_performance_regression"
          ? "Route seviyesindeki error, failed request veya render crash kaynağını kapat ve audit zincirini temiz tekrar koştur."
          : issue.kind === "copy_conflict"
            ? "İlgili route copy’sini kanonik i18n veya doğrulanmış UI metni ile yeniden hizala."
            : issue.kind === "empty_surface"
              ? "Empty state’e açık yön ve anlamlı CTA ekle; çıplak boş kutu bırakma."
              : issue.kind === "modal_surface_violation"
                ? "Surface contract ve giriş noktalarını route/page/modal ayrımıyla yeniden sabitle."
                : issue.kind === "widget_hierarchy_gap"
                  ? "Başlık, metric ve secondary card kompozisyonunu sadeleştir; aynı şeyi anlatan paralel blokları kaldır."
                  : "Spacing, width ve overflow davranışını widget kit contract’ına yeniden hizala.",
      source: "playwright_audit",
      artifacts: [
        issue.screenshot ? { kind: "screenshot", path: issue.screenshot, detail: issue.route } : null,
        {
          kind: "report",
          path: resolveAtlasOutputPath("jarvis", "route-audit-summary.json"),
          detail: issue.detail ?? issue.route,
        },
      ].filter(Boolean) as AtlasObservationFinding["artifacts"],
    }),
  );
}

function parseModalAuditFindings(
  modalAudit: Awaited<ReturnType<typeof runJarvisModalAudit>>,
  runId: string,
) {
  if (!modalAudit) {
    return [] as AtlasObservationFinding[];
  }

  if (modalAudit.status === "failed") {
    return [
      createFinding({
        runId,
        route: "/panel/requests#modal",
        kind: "console_or_performance_regression",
        severity: "p1",
        title: "Workspace modal audit failed",
        summary: modalAudit.error ?? "Jarvis modal audit istenen workspace modal ailesini tamamlayamadi.",
        whyItMatters: "Observer modal taramasinin patlamasi, bu ailedeki gorsel bozukluklarin sessizce kacmasina neden olur.",
        suggestedFix: "Modal audit scriptini stabil hale getir, hem customer hem admin workspace modal ailesini screenshot ve finding ile tamamla.",
        source: "playwright_audit",
        artifacts: [{
          kind: "report",
          path: resolveAtlasOutputPath("jarvis", "modal-audit-summary.json"),
          detail: modalAudit.error ?? "modal_audit_failed",
        }],
      }),
    ];
  }

  if (!modalAudit.issues?.length) {
    return [] as AtlasObservationFinding[];
  }

  return modalAudit.issues.map((issue) =>
    createFinding({
      runId,
      route: issue.route,
      kind: issue.kind,
      severity: issue.severity,
      title: issue.title,
      summary: issue.summary,
      whyItMatters:
        issue.kind === "modal_surface_violation"
          ? "Aşırı geniş modal ve zayıf içerik oranı, profesyonel kalite algısını ve okunabilirliği doğrudan düşürür."
          : issue.kind === "empty_surface"
            ? "Boş durumda kullanıcı yönünü kaybederse modal görev paneli gibi değil, bitmemiş bir yüzey gibi görünür."
            : issue.kind === "widget_hierarchy_gap"
              ? "Tekrarlayan başlıklar ve aşırı yoğun rail kartları, modalin görev odaklı yapısını bozup karmaşa hissi yaratır."
            : "Modal içinde copy ya da layout bozulması doğrudan launch kalitesini ve güven duygusunu zedeler.",
      suggestedFix:
        issue.kind === "modal_surface_violation"
          ? "Workspace modal genişliğini, rail oranlarını ve yoğun header metriklerini daha kontrollü bir düzene çek."
          : issue.kind === "empty_surface"
            ? "Boş state için centered action surface ve ikinci katman guidance kartları kullan; ölü alanı görev odaklı hale getir."
            : issue.kind === "widget_hierarchy_gap"
              ? "Section başlığı, empty-state mesajı ve rail hint copy’sini tekrar etmeyen daha sade bir modal kompozisyonuna hizala."
            : "İlgili modal shell, typography ve section spacing yapısını surface contract ile yeniden hizala.",
      source: "playwright_audit",
      artifacts: [
        issue.screenshot ? { kind: "screenshot", path: issue.screenshot, detail: `${issue.tab} tab` } : null,
        {
          kind: "report",
          path: resolveAtlasOutputPath("jarvis", "modal-audit-summary.json"),
          detail: issue.detail ?? issue.tab,
        },
      ].filter(Boolean) as AtlasObservationFinding["artifacts"],
    }),
  );
}

function routeFromConsistencySurface(surface: string) {
  if (surface.includes("dashboard")) return "/panel/dashboard";
  if (surface.includes("store")) return "/panel/store";
  if (surface.includes("marketplace")) return "/panel/marketplaces";
  if (surface.includes("social")) return "/panel/social-media";
  if (surface.includes("support")) return "/panel/support";
  if (surface.includes("admin")) return "/admin/customers";
  return "/panel/services";
}

function parseConsistencyFindings(matrix: StateConsistencyShape | null, runId: string) {
  if (!matrix?.consistency?.length) {
    return [] as AtlasObservationFinding[];
  }

  return matrix.consistency
    .filter((item) => item.status === "mismatch")
    .map((item) => createFinding({
      runId,
      route: routeFromConsistencySurface(item.surface),
      kind: "state_transition_mismatch",
      severity: item.surface.includes("support") ? "p0" : "p1",
      title: `${item.surface} state mismatch`,
      summary: item.state,
      whyItMatters: "Aynı müşteri hikâyesinin farklı yüzeylerde farklı anlatılması güven ve kullanım kalitesini düşürür.",
      suggestedFix: "State kaynağını tek view-model veya canonical surface contract üzerinden yeniden hizala.",
      source: "manual_rule",
      artifacts: [{
        kind: "report",
        path: resolveAtlasOutputPath("demo-audit", "state-consistency-matrix.json"),
        detail: item.surface,
      }],
    }));
}

function buildAutofixProposals(findings: AtlasObservationFinding[]) {
  return findings
    .filter((finding) => finding.riskLevel === "auto-safe")
    .slice(0, 8)
    .map((finding) => {
      const id = `jarvis-proposal-${randomUUID()}`;
      const branchName = buildJarvisBranchName(finding.route, id);
      return {
      id,
      findingId: finding.id,
      branchName,
      worktreePath: buildJarvisWorktreePath(branchName, id),
      status: "draft" as const,
      riskLevel: finding.riskLevel,
      summary: `Düşük riskli düzeltme adayI: ${finding.title}`,
      targetFiles: finding.targetFiles,
      verificationSuite: ["npm run typecheck", "npm run build", "jarvis screenshot diff"],
      createdAt: nowIso(),
      } satisfies AtlasAutofixProposal;
    });
}

function fallbackBrief(findings: AtlasObservationFinding[], proposals: AtlasAutofixProposal[]): AtlasMorningBrief {
  const p0 = findings.filter((finding) => finding.severity === "p0").length;
  const p1 = findings.filter((finding) => finding.severity === "p1").length;
  const p2 = findings.filter((finding) => finding.severity === "p2").length;
  const sorted = [...findings].sort((left, right) => severityRank(left.severity) - severityRank(right.severity));

  return {
    id: `jarvis-brief-${randomUUID()}`,
    createdAt: nowIso(),
    headline: p0 > 0
      ? `Jarvis ${p0} kritik launch blokajı buldu`
      : `Jarvis gece taramasını tamamladı`,
    summary: `Siz yokken ${getAtlasJourneyRoutes().length} yüzeyi taradım. ${p0} P0, ${p1} P1 ve ${p2} P2 issue var. ${proposals.length} düşük riskli düzeltme adayı branch için hazırlandı.`,
    topFindings: sorted.slice(0, 4).map((finding) => finding.title),
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
      proposals: proposals.length,
    },
  };
}

function normalizeBriefLine(line: string) {
  return line
    .replace(/^[*\-•\d.\s:]+/, "")
    .replace(/^headline\s*[:：-]\s*/i, "")
    .replace(/^summary\s*[:：-]\s*/i, "")
    .trim();
}

function looksInvalidBriefText(value: string) {
  const normalized = value.trim();
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

function safeBriefActions(lines: string[], fallback: AtlasMorningBrief) {
  const cleaned = lines
    .map(normalizeBriefLine)
    .filter(Boolean)
    .filter((line) => !looksInvalidBriefText(line))
    .filter((line) => line.length >= 12)
    .slice(0, 3);

  return cleaned.length > 0 ? cleaned : fallback.proposedActions;
}

async function synthesizeBrief(findings: AtlasObservationFinding[], proposals: AtlasAutofixProposal[]) {
  const fallback = fallbackBrief(findings, proposals);
  if (findings.length === 0) {
    return fallback;
  }

  try {
    const result = await generateText({
      model: getJarvisModelForSlot("research"),
      prompt: [
        "Sen Atlas Jarvis morning brief engine'sin.",
        "Aşağıdaki issue listesinden kısa, yönetici okunabilir ama teknik olarak isabetli bir sabah özeti üret.",
        "Türkçe yaz. 1 kısa headline, 1 kısa summary ve en önemli 3 aksiyon cümlesi üret.",
        "Issue listesi:",
        ...findings.slice(0, 8).map((finding) =>
          `- [${finding.severity.toUpperCase()}] ${finding.route}: ${finding.title} | ${finding.summary}`),
      ].join("\n"),
      maxOutputTokens: 340,
    });

    const lines = result.text.split(/\r?\n/).map(normalizeBriefLine).filter(Boolean);
    const headline = lines[0];
    const summary = lines.slice(1, 3).join(" ");

    if (looksInvalidBriefText(headline) || looksInvalidBriefText(summary)) {
      return fallback;
    }

    return {
      ...fallback,
      headline: headline ?? fallback.headline,
      summary: summary || fallback.summary,
      proposedActions: safeBriefActions(lines.slice(3, 8), fallback),
    } satisfies AtlasMorningBrief;
  } catch {
    return fallback;
  }
}

export async function runJarvisObservation(source: AtlasObservationRun["source"] = "manual") {
  const runId = `jarvis-run-${randomUUID()}`;
  const providerInfo = getJarvisRoutingInfo();
  const dashboardProvider = {
    lane: providerInfo.provider,
    model: providerInfo.model,
    fallback: `${providerInfo.fallbackProvider}:${providerInfo.fallbackModel}`,
    hqttEnabled: providerInfo.hqttEnabled,
  };
  const run: AtlasObservationRun = {
    id: runId,
    startedAt: nowIso(),
    status: "running",
    source,
    provider: providerInfo.provider,
    model: providerInfo.model,
    journeys: getAtlasJourneyRoutes(),
    findingIds: [],
    summary: "Jarvis observer taramayı başlattı.",
    error: null,
  };

  await saveObservationRun(run);

  const checkpoint = async (summary: string) => {
    run.summary = summary;
    await saveObservationRun({ ...run });
  };

  try {
    await checkpoint("Modal audit başlatıldı.");
    const modalAudit = await runJarvisModalAudit({
      onScenarioAudited: async (progress) => {
        await checkpoint(
          `Modal audit: ${progress.completed}/${progress.total} · ${progress.label} · ${progress.issueCount} bulgu`,
        );
      },
    });

    await checkpoint("Route audit başlatıldı.");
    const routeAudit = await runJarvisRouteAudit({
      onSurfaceAudited: async (progress) => {
        const ownerLabel =
          progress.owner === "customer"
            ? "customer"
            : progress.owner === "admin"
              ? "admin"
              : "public";

        await checkpoint(
          `Route audit: ${progress.completed}/${progress.total} · ${ownerLabel} · ${progress.route} · ${progress.issueCount} bulgu`,
        );
      },
    });

    await checkpoint("Atlas artefaktları ve state matrisleri toplanıyor.");
    const liveAudit = await safeReadFreshJson<LiveAuditShape>(resolveAtlasOutputPath("playwright", "live-audit-summary.json"));
    const backlog = await safeReadFreshText(resolveAtlasOutputPath("demo-audit", "improvement-backlog.md"));
    const matrix = await safeReadFreshJson<StateConsistencyShape>(resolveAtlasOutputPath("demo-audit", "state-consistency-matrix.json"));

    await checkpoint("Bulgular birleştiriliyor ve normalize ediliyor.");
    const findings = [
      ...parseRouteAuditFindings(routeAudit, runId),
      ...parseModalAuditFindings(modalAudit, runId),
      ...parseLiveAuditFindings(liveAudit, runId),
      ...parseBacklogFindings(backlog, runId),
      ...parseConsistencyFindings(matrix, runId),
    ];

    const canonicalFindings = await saveObservationFindings(findings);
    await checkpoint(`Canonical finding seti yazıldı: ${canonicalFindings.length} bulgu.`);
    const proposals = buildAutofixProposals(canonicalFindings);
    const brief = await synthesizeBrief(canonicalFindings, proposals);

    await saveAutofixProposals(proposals);
    await saveMorningBrief(brief);

    run.status = "completed";
    run.completedAt = nowIso();
    run.findingIds = canonicalFindings.map((finding) => finding.id);
    run.summary = brief.summary;
    await saveObservationRun(run);

    return getJarvisDashboard(dashboardProvider);
  } catch (error) {
    run.status = "failed";
    run.completedAt = nowIso();
    run.error = error instanceof Error ? error.message : "Jarvis observer failed.";
    run.summary = run.error;
    await saveObservationRun(run);
    throw error;
  }
}

export async function launchJarvisObservation(source: AtlasObservationRun["source"] = "manual") {
  const providerInfo = getJarvisRoutingInfo();
  const provider = {
    lane: providerInfo.provider,
    model: providerInfo.model,
    fallback: `${providerInfo.fallbackProvider}:${providerInfo.fallbackModel}`,
    hqttEnabled: providerInfo.hqttEnabled,
  };

  if (!activeObservationPromise) {
    activeObservationPromise = runJarvisObservation(source).finally(() => {
      activeObservationPromise = null;
    });

    return {
      dashboard: await getJarvisDashboard(provider),
      started: true,
      running: true,
    };
  }

  return {
    dashboard: await getJarvisDashboard(provider),
    started: false,
    running: true,
  };
}

export function isJarvisObservationRunning() {
  return activeObservationPromise !== null;
}

export async function refreshJarvisBrief() {
  const providerInfo = getJarvisRoutingInfo();
  const dashboard = await getJarvisDashboard({
    lane: providerInfo.provider,
    model: providerInfo.model,
    fallback: `${providerInfo.fallbackProvider}:${providerInfo.fallbackModel}`,
    hqttEnabled: providerInfo.hqttEnabled,
  });
  const brief = await synthesizeBrief(dashboard.activeFindings, dashboard.proposals);
  await saveMorningBrief(brief);
  return getJarvisDashboard({
    lane: providerInfo.provider,
    model: providerInfo.model,
    fallback: `${providerInfo.fallbackProvider}:${providerInfo.fallbackModel}`,
    hqttEnabled: providerInfo.hqttEnabled,
  });
}

export async function getJarvisControlTower(): Promise<AtlasJarvisDashboard> {
  const providerInfo = getJarvisRoutingInfo();
  return getJarvisDashboard({
    lane: providerInfo.provider,
    model: providerInfo.model,
    fallback: `${providerInfo.fallbackProvider}:${providerInfo.fallbackModel}`,
    hqttEnabled: providerInfo.hqttEnabled,
  });
}
