"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, useTransition } from "react";
import {
  Activity,
  AlertCircle,
  Brain,
  CheckCircle2,
  Clock3,
  FileText,
  Loader2,
  Rocket,
  Send,
  ShieldCheck,
  Sparkles,
  Store,
  UserRound,
  Waypoints,
} from "lucide-react";
import { toast } from "sonner";
import { JarvisObserverPanel } from "@/components/ai/jarvis-observer-panel";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import type {
  CopilotCommandResponse,
  CopilotConversationRecord,
  CopilotConversationMemoryRecord,
  CopilotDashboardData,
  CopilotMode,
  CopilotOperatorAllowlistRule,
  CopilotOperatorJobRecord,
  CopilotRunRecord,
  CopilotScope,
  ProjectContext,
  ToolRegistrySummary,
  ToolSpec,
  WorkerTarget,
} from "@/lib/admin-copilot/types";
import type {
  BenchmarkGateStatus,
  BenchmarkMetaResponse,
  BenchmarkReleaseGate,
} from "@/lib/ai/benchmarks/types";
import type { AtlasJarvisDashboard } from "@/lib/jarvis";

type DashboardPayload = {
  dashboard: CopilotDashboardData;
  customerContext: Record<string, unknown> | null;
};

type JarvisDashboardPayload = {
  dashboard: AtlasJarvisDashboard;
  started?: boolean;
  running?: boolean;
};

type RegistryPayload = {
  summary: ToolRegistrySummary;
  tools: ToolSpec[];
};

type BenchmarkMeta = BenchmarkMetaResponse;
type ConversationPayload = {
  items: CopilotCommandResponse[];
};

type ConversationsPayload = {
  items: CopilotConversationRecord[];
};

type ConversationMemoryPayload = {
  memory: CopilotConversationMemoryRecord | null;
};

type ProjectsPayload = {
  projects: ProjectContext[];
};

type OperatorJobsPayload = {
  items: CopilotOperatorJobRecord[];
  allowlistRules: CopilotOperatorAllowlistRule[];
};

type BenchmarkResult = {
  suite: {
    id: string;
    name: string;
    description: string;
    taskCount: number;
  };
  provider: BenchmarkMeta["provider"];
  passRate: number;
  averageScore: number;
  completedTasks: number;
  failedTasks: number;
  totalDurationMs: number;
  taskResults: Array<{
    task: {
      id: string;
      title: string;
      description: string;
    };
    run: {
      success: boolean;
      finalAnswer: string;
      durationMs: number;
      verification: {
        passed: boolean;
        score: number;
        confidence: number;
        reasons: string[];
        missingCriteria: string[];
        suggestedNextStep?: string;
      };
    };
  }>;
};

type BenchmarkTraceItem = {
  id: string;
  title: string;
  detail?: string;
  tone: "info" | "success" | "warning" | "error";
};

type RunGeneration = "current" | "legacy";
type ChatThreadStatus = CopilotRunRecord["status"] | "pending";
type OperatorAction = "approve" | "pause" | "takeover" | "reject" | "complete" | "fail";

type ChatThreadItem = {
  localId: string;
  runId?: string;
  prompt: string;
  status: ChatThreadStatus;
  response: CopilotCommandResponse | null;
  error?: string | null;
  source: "live" | "history";
  createdAt: string;
};

async function fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  });
  const json = await response.json();
  if (!response.ok) {
    throw new Error(json.error ?? "İstek başarısız.");
  }
  return json as T;
}

function badgeVariant(status?: string) {
  if (status === "completed" || status === "approved" || status === "published") return "default";
  if (status === "failed" || status === "rejected") return "destructive";
  if (status === "awaiting_approval" || status === "pending") return "outline";
  return "secondary";
}

function getVisibleThreadStatus(item: ChatThreadItem, response: CopilotCommandResponse | null) {
  if (item.status === "pending") {
    return {
      label: "Dusunuyor",
      variant: "outline" as const,
      className: "border-white/10 text-slate-300",
    };
  }

  if (item.status === "awaiting_approval" || response?.approvals.some((approval) => approval.status === "pending")) {
    return {
      label: "Onay bekleniyor",
      variant: "outline" as const,
      className: "border-amber-400/20 bg-amber-500/10 text-amber-100",
    };
  }

  if ((response?.response.missingFields?.length ?? 0) > 0 || response?.run.metadata?.clarification === true) {
    return {
      label: "Devam etmek icin bilgi gerekiyor",
      variant: "outline" as const,
      className: "border-sky-400/20 bg-sky-500/10 text-sky-100",
    };
  }

  return null;
}

function createRequestId() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }

  return `req-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

const JARVIS_FRESH_SNAPSHOT_WINDOW_MS = 45 * 60 * 1000;

function getJarvisRunTimestamp(run?: AtlasJarvisDashboard["recentRuns"][number] | null) {
  if (!run) {
    return null;
  }

  const rawValue = run.completedAt ?? run.startedAt;
  const parsed = Date.parse(rawValue);
  return Number.isFinite(parsed) ? parsed : null;
}

function hasFreshJarvisSnapshot(dashboard: AtlasJarvisDashboard | null) {
  if (!dashboard) {
    return false;
  }

  const latestCompletedRun = dashboard.recentRuns.find((run) => run.status === "completed") ?? null;
  const latestTimestamp = getJarvisRunTimestamp(latestCompletedRun);
  if (!latestTimestamp) {
    return false;
  }

  return Date.now() - latestTimestamp <= JARVIS_FRESH_SNAPSHOT_WINDOW_MS;
}

function getBenchmarkGateVariant(status?: BenchmarkGateStatus) {
  if (status === "pass") return "default";
  if (status === "blocked") return "destructive";
  return "secondary";
}

function getRunQuality(run?: CopilotRunRecord | null) {
  const quality = run?.metadata?.quality;
  if (!quality || typeof quality !== "object") {
    return null;
  }

  const passed = (quality as { passed?: unknown }).passed;
  const score = (quality as { score?: unknown }).score;
  if (typeof passed !== "boolean" || typeof score !== "number") {
    return null;
  }

  return {
    passed,
    score,
  };
}

function getRunExecutionPath(run?: CopilotRunRecord | null) {
  const executionPath = run?.metadata?.executionPath;
  return typeof executionPath === "string" ? executionPath : null;
}

function getRunGeneration(run?: CopilotRunRecord | null): RunGeneration {
  const executionPath = getRunExecutionPath(run);
  const quality = getRunQuality(run);

  if (executionPath === "orchestrator-first" && quality?.passed) {
    return "current";
  }

  return "legacy";
}

function getRunGenerationLabel(generation: RunGeneration) {
  return generation === "current" ? "current" : "legacy";
}

type RunToolStats = {
  primaryWorkerTarget: WorkerTarget;
  workerTargets: WorkerTarget[];
  usedToolNames: string[];
  browserLane: boolean;
  readOnlyExploration: boolean;
};

function getRunToolStats(run?: CopilotRunRecord | null): RunToolStats | null {
  const toolStats = run?.metadata?.toolStats;
  if (!toolStats || typeof toolStats !== "object") {
    return null;
  }

  const primaryWorkerTarget = (toolStats as { primaryWorkerTarget?: unknown }).primaryWorkerTarget;
  const workerTargets = (toolStats as { workerTargets?: unknown }).workerTargets;
  const usedToolNames = (toolStats as { usedToolNames?: unknown }).usedToolNames;
  const browserLane = (toolStats as { browserLane?: unknown }).browserLane;
  const readOnlyExploration = (toolStats as { readOnlyExploration?: unknown }).readOnlyExploration;

  if (
    typeof primaryWorkerTarget !== "string"
    || !Array.isArray(workerTargets)
    || !Array.isArray(usedToolNames)
  ) {
    return null;
  }

  return {
    primaryWorkerTarget: primaryWorkerTarget as WorkerTarget,
    workerTargets: workerTargets.filter((value): value is WorkerTarget => typeof value === "string"),
    usedToolNames: usedToolNames.filter((value): value is string => typeof value === "string"),
    browserLane: browserLane === true,
    readOnlyExploration: readOnlyExploration === true,
  };
}

function getWorkerTargetLabel(target: WorkerTarget) {
  switch (target) {
    case "browser_local":
      return "browser local";
    case "browser_remote":
      return "browser remote";
    case "database":
      return "database";
    case "llm":
      return "llm";
    case "application":
    default:
      return "application";
  }
}

function formatToolName(toolName: string) {
  return toolName.replaceAll("_", " ");
}

function formatDelta(value: number | null | undefined) {
  if (typeof value !== "number" || Number.isNaN(value)) {
    return null;
  }

  return `${value > 0 ? "+" : ""}${value}`;
}

function formatThreadTime(value: string | undefined) {
  if (!value) {
    return "";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return new Intl.DateTimeFormat("tr-TR", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function formatConversationTime(value: string | undefined) {
  if (!value) {
    return "";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "";
  }

  const now = new Date();
  const sameDay = now.toDateString() === date.toDateString();

  return new Intl.DateTimeFormat("tr-TR", sameDay ? {
    hour: "2-digit",
    minute: "2-digit",
  } : {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function formatDateTime(value: string | undefined | null) {
  if (!value) {
    return "";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return new Intl.DateTimeFormat("tr-TR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function truncateConversationText(value: string | null | undefined, maxLength = 96) {
  const normalized = (value ?? "").replace(/\s+/g, " ").trim();
  if (!normalized) {
    return "";
  }

  return normalized.length > maxLength ? `${normalized.slice(0, maxLength - 1)}…` : normalized;
}

function formatOperatorJobStatus(status: CopilotOperatorJobRecord["status"]) {
  switch (status) {
    case "pending":
      return "onay bekliyor";
    case "approved":
      return "onaylandi";
    case "paused":
      return "duraklatildi";
    case "taken_over":
      return "takeover";
    case "rejected":
      return "reddedildi";
    case "failed":
      return "basarisiz";
    case "completed":
      return "tamamlandi";
    default:
      return status;
  }
}

function formatWorkspaceStatus(status: CopilotConversationMemoryRecord["workspaceStatus"]) {
  switch (status) {
    case "claimed":
      return "sahiplenildi";
    case "handoff_ready":
      return "handoff hazir";
    case "shared":
      return "paylasimli";
    case "unclaimed":
    default:
      return "sahipsiz";
  }
}

function getWorkspaceStatusVariant(status: CopilotConversationMemoryRecord["workspaceStatus"]) {
  if (status === "claimed") {
    return "default" as const;
  }

  if (status === "handoff_ready") {
    return "secondary" as const;
  }

  return "outline" as const;
}

function getOperatorAllowlistLabel(
  job: CopilotOperatorJobRecord,
  rules: CopilotOperatorAllowlistRule[],
) {
  if (!job.allowlistRuleId) {
    return job.allowlisted ? "allowlist" : "allowlist disi";
  }

  const rule = rules.find((item) => item.id === job.allowlistRuleId);
  return rule?.label ?? job.allowlistRuleId;
}

function getOperatorJobActions(job: CopilotOperatorJobRecord): Array<{
  action: OperatorAction;
  label: string;
  variant?: "default" | "outline" | "destructive";
}> {
  switch (job.status) {
    case "pending":
      return [
        { action: "approve", label: "AI devam etsin" },
        { action: "takeover", label: "Takeover", variant: "outline" },
        { action: "reject", label: "Reddet", variant: "destructive" },
      ];
    case "approved":
      return [
        { action: "pause", label: "Duraklat", variant: "outline" },
        { action: "takeover", label: "Takeover", variant: "outline" },
      ];
    case "paused":
      return [
        { action: "approve", label: "Devam ettir" },
        { action: "takeover", label: "Takeover", variant: "outline" },
        { action: "reject", label: "Iptal et", variant: "destructive" },
      ];
    case "taken_over":
      return [
        { action: "complete", label: "Tamamlandi" },
        { action: "fail", label: "Basarisiz", variant: "destructive" },
      ];
    default:
      return [];
  }
}

function getOperatorNotePlaceholder(job: CopilotOperatorJobRecord) {
  if (job.status === "taken_over") {
    return "Operator notu: ne yaptin, nereye kadar geldin, sonucu yaz.";
  }

  if (job.status === "paused") {
    return "Duraklatma nedeni veya sonraki operator notunu yaz.";
  }

  return "Opsiyonel not: AI'ya veya operator lane'e iletilecek kısa not.";
}

function buildChatThreadItem(response: CopilotCommandResponse, source: "live" | "history"): ChatThreadItem {
  return {
    localId: response.run.id,
    runId: response.run.id,
    prompt: response.run.commandText,
    status: response.run.status,
    response,
    source,
    createdAt: response.run.createdAt,
  };
}

function truncateThreadText(value: string | null | undefined, maxLength = 220) {
  const normalized = (value ?? "").replace(/\s+/g, " ").trim();
  if (!normalized) {
    return "";
  }

  return normalized.length > maxLength ? `${normalized.slice(0, maxLength - 1)}…` : normalized;
}

function buildClientConversationPreview(thread: ChatThreadItem[], nextPrompt: string) {
  const turns = thread
    .slice(-6)
    .map((item) => {
      const userTurn = truncateThreadText(item.prompt, 180);
      const assistantTurn = truncateThreadText(
        item.response?.response.details
          ?? item.response?.response.summary
          ?? item.error
          ?? "",
        220,
      );

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
    "Yakın sohbet geçmişi:",
    ...turns,
    `Yeni mesaj: ${truncateThreadText(nextPrompt, 220)}`,
  ].join("\n\n");
}

function resolveConversationScopeHint(thread: ChatThreadItem[]): CopilotScope | null {
  const lastScopedRun = [...thread]
    .reverse()
    .map((item) => item.response?.run ?? null)
    .find((run) => run && run.scopeType !== "global");

  if (!lastScopedRun || lastScopedRun.scopeType === "global") {
    return null;
  }

  return {
    type: lastScopedRun.scopeType,
    refId: lastScopedRun.scopeRefId ?? undefined,
    label:
      typeof lastScopedRun.metadata?.scopeLabel === "string"
        ? lastScopedRun.metadata.scopeLabel
        : null,
  };
}

function buildFriendlyFailureCopy(message: string, prompt: string) {
  if (/Unauthorized|401/i.test(message)) {
    return {
      summary: "Admin oturumu kapanmış görünüyor.",
      details: "Girişi yenileyin; ardından aynı mesajla kaldığımız yerden devam ederim.",
      suggestions: ["Aynı mesajı tekrar gönder"],
    };
  }

  if (/scope|eşleşmiyor|eslesmiyor/i.test(message)) {
    return {
      summary: "Bu istek seçili sohbet bağlamıyla çakıştı.",
      details: "İsterseniz mevcut bağlamla devam edelim ya da scope'u değiştirip yeni sohbet açalım.",
      suggestions: ["Bu bağlamla devam et", "Scope'u değiştirip tekrar sor"],
    };
  }

  if (/desteklenmiyor|unsupported|geçilemedi|gecilemedi|algılanamadı|algilanamadi/i.test(message)) {
    return {
      summary: "Mesajı aldım ama bu turda netleştirmem gereken bir nokta kaldı.",
      details: "Normal sohbetten devam edebiliriz. Hedef müşteri, görmek istediğiniz veri veya yapmak istediğiniz aksiyonu tek cümlede biraz daha açık yazmanız yeterli.",
      suggestions: ["Yusuf Keser için son formları oku", "Eksik bilgi bekleyen kayıtları listele", "Admin dashboard'u browser ile incele"],
    };
  }

  if (/migration|schema cache|Copilot tabloları eksik|run kaydı|oturumu oluşturulamadı|güncellenemedi/i.test(message)) {
    return {
      summary: "Arka planda geçici bir sistem sorunu var.",
      details: "İsteği kaydedemedim. Sayfayı yenileyip aynı mesajı tekrar gönderin; sürerse servis katmanını kontrol etmemiz gerekir.",
      suggestions: ["Aynı mesajı tekrar gönder", "Sayfayı yenile"],
    };
  }

  return {
    summary: "Bu isteği bu turda tamamlayamadım.",
    details: `Mesajı biraz daha daraltırsanız tekrar denerim. Son mesajınız: "${prompt}".`,
    suggestions: ["Aynı hedefi daha net yaz", "Bir müşteri adı ekle", "İstediğin çıktıyı tek cümlede belirt"],
  };
}

export function AtlasCopilot() {
  const mode: CopilotMode = "agent";
  const [commandText, setCommandText] = useState("");
  const [dashboard, setDashboard] = useState<CopilotDashboardData | null>(null);
  const [customerContext, setCustomerContext] = useState<Record<string, unknown> | null>(null);
  const [registrySummary, setRegistrySummary] = useState<ToolRegistrySummary | null>(null);
  const [prunedTools, setPrunedTools] = useState<ToolSpec[]>([]);
  const [activeRun, setActiveRun] = useState<CopilotCommandResponse | null>(null);
  const [thread, setThread] = useState<ChatThreadItem[]>([]);
  const [conversationId, setConversationId] = useState("");
  const [conversations, setConversations] = useState<CopilotConversationRecord[]>([]);
  const [conversationMemory, setConversationMemory] = useState<CopilotConversationMemoryRecord | null>(null);
  const [availableProjects, setAvailableProjects] = useState<ProjectContext[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState("");
  const [workingGoalDraft, setWorkingGoalDraft] = useState("");
  const [handoffNoteDraft, setHandoffNoteDraft] = useState("");
  const [handoffChecklistDraft, setHandoffChecklistDraft] = useState("");
  const [operatorJobs, setOperatorJobs] = useState<CopilotOperatorJobRecord[]>([]);
  const [operatorAllowlistRules, setOperatorAllowlistRules] = useState<CopilotOperatorAllowlistRule[]>([]);
  const [operatorNotes, setOperatorNotes] = useState<Record<string, string>>({});
  const [benchmarkMeta, setBenchmarkMeta] = useState<BenchmarkMeta | null>(null);
  const [benchmarkResult, setBenchmarkResult] = useState<BenchmarkResult | null>(null);
  const [selectedSuiteId, setSelectedSuiteId] = useState("atlas-ops-v1");
  const [benchmarkTaskLimit, setBenchmarkTaskLimit] = useState("1");
  const [benchmarkTrace, setBenchmarkTrace] = useState<BenchmarkTraceItem[]>([]);
  const [runningBenchmark, setRunningBenchmark] = useState(false);
  const [jarvisDashboard, setJarvisDashboard] = useState<AtlasJarvisDashboard | null>(null);
  const [loadingDashboard, startDashboardTransition] = useTransition();
  const [submitting, startSubmitTransition] = useTransition();
  const [acting, startActionTransition] = useTransition();
  const [loadingBenchmarkMeta, startBenchmarkMetaTransition] = useTransition();
  const [verifyingRegistry, startRegistryTransition] = useTransition();
  const [runningJarvisObserver, startJarvisObserverTransition] = useTransition();
  const [generatingJarvisBrief, startJarvisBriefTransition] = useTransition();
  const [preparingJarvisProposalId, setPreparingJarvisProposalId] = useState<string | null>(null);
  const [rejectingJarvisProposalId, setRejectingJarvisProposalId] = useState<string | null>(null);
  const [preparingJarvisProposal, startJarvisProposalTransition] = useTransition();
  const [jarvisAutoBooted, setJarvisAutoBooted] = useState(false);
  const [jarvisGreeted, setJarvisGreeted] = useState(false);
  const [jarvisPrevFindingCount, setJarvisPrevFindingCount] = useState<number | null>(null);
  const dashboardRecentRuns = dashboard?.recentRuns ?? [];
  const jarvisObservationActive = runningJarvisObserver || jarvisDashboard?.recentRuns[0]?.status === "running";
  const scope: CopilotScope = useMemo(() => ({ type: "global" }), []);
  const conversationStorageKey = "atlas-admin-chat:primary";

  const quickPrompts = [
    "Yusuf Keser tarafinda son formlari oku ve kisa ozet cikar.",
    "Eksik bilgi bekleyen kayitlari listele ve sira ver.",
    "Bugun en kritik operasyon blokajlarini cikar.",
    "Admin dashboard'u browser ile incele ve sorunlari ozetle.",
    "Jarvis observer queue'sundaki P0 issue'lari sirala ve cozum oner.",
    "Siz yokken bulunan en kritik UI/state sorunlarini launch etkisine gore ozetle.",
  ];

  useEffect(() => {
    startDashboardTransition(async () => {
      try {
        const payload = await fetchJson<DashboardPayload>("/api/admin/copilot/dashboard");
        setDashboard(payload.dashboard);
        setCustomerContext(payload.customerContext);
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Copilot dashboard yüklenemedi.");
      }
    });
  }, []);

  useEffect(() => {
    startDashboardTransition(async () => {
      try {
        const payload = await fetchJson<JarvisDashboardPayload>("/api/admin/copilot/jarvis/dashboard");
        setJarvisDashboard(payload.dashboard);
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Jarvis dashboard yüklenemedi.");
      }
    });
  }, []);

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      void fetchJson<JarvisDashboardPayload>("/api/admin/copilot/jarvis/dashboard")
        .then((payload) => {
          setJarvisDashboard(payload.dashboard);
        })
        .catch(() => undefined);
    }, 15000);

    return () => {
      window.clearInterval(intervalId);
    };
  }, []);

  useEffect(() => {
    if (!jarvisDashboard || jarvisObservationActive || jarvisAutoBooted) {
      return;
    }

    const freshSnapshot = hasFreshJarvisSnapshot(jarvisDashboard);
    const hasBrief = Boolean(jarvisDashboard.latestBrief);
    if (freshSnapshot && hasBrief) {
      return;
    }

    setJarvisAutoBooted(true);
    startJarvisObserverTransition(async () => {
      try {
        const payload = await fetchJson<JarvisDashboardPayload>("/api/admin/copilot/jarvis/observe", {
          method: "POST",
        });
        setJarvisDashboard(payload.dashboard);
        toast.info(
          payload.started === false
            ? "Jarvis mevcut sweep'i devraldı ve paneli canlı tutuyor."
            : "Jarvis panel açılışında otomatik canlı sweep başlattı.",
        );
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Jarvis otomatik sweep başlatılamadı.");
      }
    });
  }, [jarvisAutoBooted, jarvisDashboard, jarvisObservationActive]);

  // ─── Jarvis Proactive Greeter ─────────────────────────────────────────────
  // When the Jarvis dashboard loads for the first time, inject a welcome message
  // into the chat thread so the user immediately sees the system health status.
  useEffect(() => {
    if (jarvisGreeted || !jarvisDashboard) return;
    setJarvisGreeted(true);

    const open = jarvisDashboard.activeFindings ?? [];
    const p0 = open.filter((f) => f.severity === "p0").length;
    const p1 = open.filter((f) => f.severity === "p1").length;
    const p2 = open.filter((f) => f.severity === "p2").length;
    const total = open.length;
    const proposals = (jarvisDashboard.proposals ?? []).filter(
      (p) => p.status === "draft" || p.status === "prepared",
    ).length;
    const brief = jarvisDashboard.latestBrief;
    const isRunning = jarvisDashboard.recentRuns?.[0]?.status === "running";

    const lines: string[] = ["Merhaba! Ben Jarvis — Atlas platformunun canlı yapay zeka danışmanıyım."];

    if (isRunning) {
      lines.push("Şu an bir sweep çalışıyor, bulgular anlık olarak güncelleniyor.");
    }

    if (total > 0) {
      lines.push(
        `Sistemde **${total} açık bulgu** var: ${p0} P0 (kritik), ${p1} P1, ${p2} P2.`,
      );
      if (p0 > 0) {
        const topP0 = open.filter((f) => f.severity === "p0").slice(0, 2);
        lines.push(
          "En kritik sorunlar:",
          ...topP0.map((f) => `• **${f.title}** — ${f.route}`),
        );
      }
    } else {
      lines.push("Sistemde açık kritik bulgu yok. Her şey yolunda görünüyor.");
    }

    if (proposals > 0) {
      lines.push(`${proposals} hazır fix önerisi mevcut — "düzelt" diyerek uygulayabiliriz.`);
    }

    if (brief) {
      lines.push(`Son briefing: ${brief.headline}`);
    }

    lines.push(
      "",
      "Bana şunları sorabilirsiniz:",
      "• \"Sistemdeki açık sorunlar neler?\"",
      "• \"Tüm sistemi tara\"",
      "• \"En kritik sorunu düzelt\"",
      "• Veya herhangi bir Atlas operasyon sorusu",
    );

    setJarvisPrevFindingCount(total);

    const greeterItem: ChatThreadItem = {
      localId: `jarvis-greeter-${Date.now()}`,
      prompt: "",
      status: "completed",
      response: {
        run: {
          id: `jarvis-greeter-${Date.now()}`,
          sessionId: "",
          requesterUserId: "",
          mode: "agent",
          scopeType: "global",
          commandText: "",
          toolInput: {},
          status: "completed",
          requiresApproval: false,
          metadata: {},
          createdAt: new Date().toISOString(),
          summary: "Jarvis Karşılama",
          responseText: lines.join("\n"),
        },
        timeline: [],
        approvals: [],
        artifacts: [],
        deliveries: [],
        response: {
          summary: "Jarvis Karşılama",
          details: lines.join("\n"),
          nextSuggestions: [
            "Sistemdeki açık sorunlar neler?",
            "Tüm sistemi tara",
            "En kritik 3 sorunu ve çözümünü anlat",
          ],
        },
        customerContext: null,
      },
      source: "live",
      createdAt: new Date().toISOString(),
    };

    setThread((current) => {
      if (current.some((item) => item.localId.startsWith("jarvis-greeter-"))) return current;
      return [greeterItem, ...current];
    });
  }, [jarvisGreeted, jarvisDashboard]);

  // ─── Jarvis Sweep Notification ────────────────────────────────────────────
  // When polling detects new findings (count changed), inject a notification message.
  useEffect(() => {
    if (!jarvisDashboard || jarvisPrevFindingCount === null) return;

    const currentCount = jarvisDashboard.activeFindings?.length ?? 0;
    if (currentCount === jarvisPrevFindingCount) return;

    const diff = currentCount - jarvisPrevFindingCount;
    setJarvisPrevFindingCount(currentCount);

    if (diff <= 0) return; // findings resolved, no notification needed

    const p0 = jarvisDashboard.activeFindings.filter((f) => f.severity === "p0").length;
    const msg = diff === 1
      ? `Yeni 1 bulgu tespit edildi (toplam: ${currentCount}, ${p0} P0).`
      : `${diff} yeni bulgu tespit edildi (toplam: ${currentCount}, ${p0} P0).`;

    const notifItem: ChatThreadItem = {
      localId: `jarvis-notif-${Date.now()}`,
      prompt: "",
      status: "completed",
      response: {
        run: {
          id: `jarvis-notif-${Date.now()}`,
          sessionId: "",
          requesterUserId: "",
          mode: "agent",
          scopeType: "global",
          commandText: "",
          toolInput: {},
          status: "completed",
          requiresApproval: false,
          metadata: {},
          createdAt: new Date().toISOString(),
          summary: "Jarvis Güncelleme",
          responseText: `${msg} Detaylar için "açık bulgular neler?" diye sorabilirsiniz.`,
        },
        timeline: [],
        approvals: [],
        artifacts: [],
        deliveries: [],
        response: {
          summary: "Jarvis Güncelleme",
          details: `${msg} Detaylar için "açık bulgular neler?" diye sorabilirsiniz.`,
          nextSuggestions: ["Açık bulguları listele", "En kritik sorunu düzelt"],
        },
        customerContext: null,
      },
      source: "live",
      createdAt: new Date().toISOString(),
    };

    setThread((current) => [...current, notifItem]);
  }, [jarvisDashboard, jarvisPrevFindingCount]);

  useEffect(() => {
    startBenchmarkMetaTransition(async () => {
      try {
        await refreshBenchmarkMeta();
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Benchmark meta yüklenemedi.");
      }
    });
  }, []);

  async function refreshDashboard() {
    const payload = await fetchJson<DashboardPayload>("/api/admin/copilot/dashboard");
    setDashboard(payload.dashboard);
    setCustomerContext(payload.customerContext);
  }

  async function refreshBenchmarkMeta() {
    const payload = await fetchJson<BenchmarkMeta>("/api/ai/benchmarks");
    setBenchmarkMeta(payload);
  }

  async function refreshRegistrySummary() {
    const payload = await fetchJson<RegistryPayload>("/api/ai/registry");
    setRegistrySummary(payload.summary);
    setPrunedTools((payload.tools ?? []).filter((tool) => !tool.selectable).slice(0, 5));
  }

  async function verifyRegistrySummary() {
    const payload = await fetchJson<RegistryPayload>("/api/ai/registry", {
      method: "POST",
    });
    setRegistrySummary(payload.summary);
    setPrunedTools((payload.tools ?? []).filter((tool) => !tool.selectable).slice(0, 5));
  }

  async function refreshConversationList() {
    const payload = await fetchJson<ConversationsPayload>("/api/ai/conversations");
    setConversations(payload.items ?? []);
  }

  async function refreshConversationMemory(targetConversationId = conversationId) {
    if (!targetConversationId) {
      setConversationMemory(null);
      return;
    }

    const payload = await fetchJson<ConversationMemoryPayload>(`/api/ai/conversations/${targetConversationId}/memory`);
    setConversationMemory(payload.memory ?? null);
  }

  async function refreshProjects(targetScope?: CopilotScope | null) {
    const resolvedScope = targetScope ?? scope;
    const params = new URLSearchParams();
    params.set("scopeType", resolvedScope.type);
    if (resolvedScope.refId) {
      params.set("scopeRefId", resolvedScope.refId);
    }
    if (resolvedScope.label) {
      params.set("scopeLabel", resolvedScope.label);
    }

    const payload = await fetchJson<ProjectsPayload>(`/api/ai/projects?${params.toString()}`);
    setAvailableProjects(payload.projects ?? []);
  }

  async function refreshOperatorJobs() {
    const payload = await fetchJson<OperatorJobsPayload>("/api/ai/operator-jobs");
    setOperatorJobs(payload.items ?? []);
    setOperatorAllowlistRules(payload.allowlistRules ?? []);
  }

  function upsertThreadRun(
    response: CopilotCommandResponse,
    source: "live" | "history",
    options?: {
      pendingId?: string;
      moveToEnd?: boolean;
    },
  ) {
    setThread((current) => {
      const nextItem = buildChatThreadItem(response, source);
      const currentIndex = current.findIndex((item) =>
        item.runId === response.run.id
        || (options?.pendingId ? item.localId === options.pendingId : false),
      );

      if (currentIndex === -1) {
        return [...current, nextItem];
      }

      const existingItem = current[currentIndex];
      const mergedItem: ChatThreadItem = {
        ...existingItem,
        ...nextItem,
        localId: existingItem.localId,
        prompt: existingItem.prompt || nextItem.prompt,
        createdAt: existingItem.createdAt || nextItem.createdAt,
      };

      if (options?.moveToEnd) {
        const withoutCurrent = current.filter((_, index) => index !== currentIndex);
        return [...withoutCurrent, mergedItem];
      }

      const nextThread = [...current];
      nextThread[currentIndex] = mergedItem;
      return nextThread;
    });
  }

  function appendPendingThread(prompt: string, requestId: string) {
    setThread((current) => [
      ...current,
      {
        localId: requestId,
        prompt,
        status: "pending",
        response: null,
        source: "live",
        createdAt: new Date().toISOString(),
      },
    ]);
  }

  function markThreadFailure(requestId: string, prompt: string, message: string) {
    setThread((current) => {
      const currentIndex = current.findIndex((item) => item.localId === requestId);
      const failureItem: ChatThreadItem = {
        localId: requestId,
        prompt,
        status: "completed",
        response: null,
        error: message,
        source: "live",
        createdAt: new Date().toISOString(),
      };

      if (currentIndex === -1) {
        return [...current, failureItem];
      }

      const nextThread = [...current];
      nextThread[currentIndex] = {
        ...nextThread[currentIndex],
        ...failureItem,
        createdAt: nextThread[currentIndex].createdAt,
      };
      return nextThread;
    });
  }

  useEffect(() => {
    void refreshRegistrySummary().catch((error) => {
      toast.error(error instanceof Error ? error.message : "Registry yüklenemedi.");
    });
    void refreshConversationList().catch((error) => {
      toast.error(error instanceof Error ? error.message : "Sohbet listesi yüklenemedi.");
    });
    void refreshOperatorJobs().catch((error) => {
      toast.error(error instanceof Error ? error.message : "Operator queue yüklenemedi.");
    });
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const existing = window.localStorage.getItem(conversationStorageKey);
    if (existing) {
      setConversationId(existing);
      return;
    }

    const nextConversationId = createRequestId();
    window.localStorage.setItem(conversationStorageKey, nextConversationId);
    setConversationId(nextConversationId);
  }, []);

  useEffect(() => {
    setThread([]);
    setActiveRun(null);
    setConversationMemory(null);
    setAvailableProjects([]);
    setSelectedProjectId("");
    setWorkingGoalDraft("");
    setHandoffNoteDraft("");
    setHandoffChecklistDraft("");
  }, [conversationId]);

  useEffect(() => {
    setSelectedProjectId(conversationMemory?.projectId ?? "");
    setWorkingGoalDraft(conversationMemory?.workingGoal ?? "");
    setHandoffNoteDraft(conversationMemory?.handoffNote ?? "");
    setHandoffChecklistDraft((conversationMemory?.handoffChecklist ?? []).join("\n"));
  }, [conversationMemory]);

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      if (!conversationId) {
        return;
      }

      try {
        const params = new URLSearchParams();
        params.set("history", "1");
        params.set("scopeType", "global");
        params.set("conversationId", conversationId);
        const payload = await fetchJson<ConversationPayload>(`/api/ai/runs?${params.toString()}`);
        const memoryPayload = await fetchJson<ConversationMemoryPayload>(`/api/ai/conversations/${conversationId}/memory`);
        const bundles = payload.items ?? [];

        if (cancelled) {
          return;
        }

        setThread((current) => {
          const pending = current.filter((item) => item.status === "pending" && !item.runId);
          const historyItems = bundles.map((bundle) => buildChatThreadItem(bundle, "history"));
          return [...historyItems, ...pending];
        });

        setActiveRun((current) => current ?? bundles[bundles.length - 1] ?? null);
        setConversationMemory(memoryPayload.memory ?? null);
        setHandoffNoteDraft(memoryPayload.memory?.handoffNote ?? "");
        setHandoffChecklistDraft((memoryPayload.memory?.handoffChecklist ?? []).join("\n"));
      } catch (error) {
        if (!cancelled) {
          toast.error(error instanceof Error ? error.message : "Sohbet geçmişi yüklenemedi.");
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [conversationId]);

  useEffect(() => {
    const currentConversation = conversations.find((item) => item.conversationId === conversationId) ?? null;
    const activeScope: CopilotScope | null = conversationMemory
      ? {
          type: conversationMemory.scopeType,
          refId: conversationMemory.scopeRefId ?? undefined,
          label: conversationMemory.scopeLabel ?? null,
        }
      : currentConversation
        ? {
            type: currentConversation.scopeType,
            refId: currentConversation.scopeRefId ?? undefined,
            label: currentConversation.scopeLabel ?? null,
          }
        : scope;

    let cancelled = false;

    void (async () => {
      try {
        await refreshProjects(activeScope);
      } catch (error) {
        if (!cancelled) {
          toast.error(error instanceof Error ? error.message : "Workspace listesi yüklenemedi.");
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [
    conversationId,
    conversations,
    conversationMemory?.scopeLabel,
    conversationMemory?.scopeRefId,
    conversationMemory?.scopeType,
    scope,
  ]);

  function startNewConversation() {
    if (typeof window === "undefined") {
      return;
    }

    const nextConversationId = createRequestId();
    window.localStorage.setItem(conversationStorageKey, nextConversationId);
    setConversationId(nextConversationId);
    setThread([]);
    setActiveRun(null);
    setCommandText("");
  }

  function openConversation(item: CopilotConversationRecord) {
    if (typeof window !== "undefined") {
      window.localStorage.setItem(conversationStorageKey, item.conversationId);
    }

    setConversationId(item.conversationId);
    setActiveRun(null);
    setCommandText("");
  }

  function saveConversationMemory(workspaceAction?: "claim" | "release" | "handoff_ready" | "shared") {
    if (!conversationId) {
      return;
    }

    startActionTransition(async () => {
      try {
        const payload = await fetchJson<ConversationMemoryPayload>(`/api/ai/conversations/${conversationId}/memory`, {
          method: "PATCH",
          body: JSON.stringify({
            title: conversationMemory?.title ?? activeConversation?.title ?? null,
            projectId: selectedProjectId || null,
            workingGoal: workingGoalDraft,
            handoffNote: handoffNoteDraft,
            handoffChecklist: handoffChecklistDraft
              .split("\n")
              .map((item) => item.trim())
              .filter(Boolean),
            workspaceAction: workspaceAction ?? null,
          }),
        });
        setConversationMemory(payload.memory ?? null);
        setSelectedProjectId(payload.memory?.projectId ?? selectedProjectId);
        setWorkingGoalDraft(payload.memory?.workingGoal ?? workingGoalDraft);
        setHandoffNoteDraft(payload.memory?.handoffNote ?? handoffNoteDraft);
        setHandoffChecklistDraft((payload.memory?.handoffChecklist ?? []).join("\n"));
        await refreshConversationList();
        toast.success(
          workspaceAction === "claim"
            ? "Workspace sahiplenildi."
            : workspaceAction === "release"
              ? "Workspace sahipligi birakildi."
              : workspaceAction === "handoff_ready"
                ? "Workspace handoff hazir olarak isaretlendi."
                : "Sohbet hafızası güncellendi.",
        );
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Sohbet hafızası güncellenemedi.");
      }
    });
  }

  function handleSuggestionClick(suggestion: string) {
    submitCommand(suggestion);
  }

  function submitCommand(nextCommand?: string) {
    const prompt = (nextCommand ?? commandText).trim();
    const ensuredConversationId = conversationId || createRequestId();
    if (!conversationId && typeof window !== "undefined") {
      window.localStorage.setItem(conversationStorageKey, ensuredConversationId);
      setConversationId(ensuredConversationId);
    }

    const conversationScopeHint = resolveConversationScopeHint(thread);
    const conversationPreview = [
      workingGoalDraft.trim() ? `Çalışma hedefi: ${workingGoalDraft.trim()}` : null,
      buildClientConversationPreview(thread, prompt),
      handoffChecklistDraft.trim() ? `Handoff checklist:\n${handoffChecklistDraft.trim()}` : null,
      handoffNoteDraft.trim() ? `Handoff note: ${handoffNoteDraft.trim()}` : null,
    ]
      .filter((value): value is string => Boolean(value && value.trim().length > 0))
      .join("\n\n");
    const payload = {
      commandText: prompt,
      mode,
      scope,
      projectId: selectedProjectId || activeConversationMemory?.projectId || null,
      requestId: createRequestId(),
      conversationId: ensuredConversationId,
      conversationScopeHint,
      conversationPreview,
    };
    if (!payload.commandText) {
      toast.error("Mesaj gerekli.");
      return;
    }

    appendPendingThread(payload.commandText, payload.requestId);
    setCommandText("");

    startSubmitTransition(async () => {
      try {
        const response = await fetchJson<CopilotCommandResponse>("/api/ai/runs", {
          method: "POST",
          body: JSON.stringify(payload),
        });
        setActiveRun(response);
        upsertThreadRun(response, "live", { pendingId: payload.requestId });
        setCustomerContext(response.customerContext ?? null);
        await refreshDashboard();
        await refreshConversationList();
        await refreshConversationMemory(ensuredConversationId);
        await refreshOperatorJobs();
      } catch (error) {
        const message = error instanceof Error ? error.message : "Mesaj gönderilemedi.";
        markThreadFailure(payload.requestId, payload.commandText, message);
      }
    });
  }

  function handleApproval(id: string, decision: "approve" | "reject") {
    startActionTransition(async () => {
      try {
        const response = await fetchJson<CopilotCommandResponse>(`/api/ai/runs/${id}/${decision}`, {
          method: "POST",
          body: JSON.stringify({}),
        });
        setActiveRun(response);
        upsertThreadRun(response, "live");
        setCustomerContext(response.customerContext ?? null);
        await refreshDashboard();
        await refreshConversationList();
        await refreshConversationMemory();
        await refreshOperatorJobs();
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Approval işlemi başarısız.");
      }
    });
  }

  function handleOperatorJob(
    id: string,
    action: OperatorAction,
  ) {
    startActionTransition(async () => {
      try {
        const note = operatorNotes[id]?.trim();
        const response = await fetchJson<CopilotCommandResponse>(`/api/ai/operator-jobs/${id}/${action}`, {
          method: "POST",
          body: JSON.stringify(note ? { note } : {}),
        });
        setActiveRun(response);
        upsertThreadRun(response, "live");
        setCustomerContext(response.customerContext ?? null);
        setOperatorNotes((current) => {
          const next = { ...current };
          delete next[id];
          return next;
        });
        await refreshDashboard();
        await refreshConversationList();
        await refreshConversationMemory();
        await refreshOperatorJobs();
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Operator işi güncellenemedi.");
      }
    });
  }

  function loadRun(id: string) {
    startActionTransition(async () => {
      try {
        const response = await fetchJson<CopilotCommandResponse>(`/api/ai/runs/${id}`);
        setActiveRun(response);
        upsertThreadRun(response, "history", { moveToEnd: true });
        setCustomerContext(response.customerContext ?? null);
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Run yüklenemedi.");
      }
    });
  }

  function runBenchmark() {
    const maxTasks = Number(benchmarkTaskLimit);
    setBenchmarkTrace([]);
    setBenchmarkResult(null);
    setRunningBenchmark(true);

    void (async () => {
      try {
        const response = await fetch("/api/ai/benchmarks/stream", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            suiteId: selectedSuiteId,
            maxTasks: Number.isFinite(maxTasks) && maxTasks > 0 ? maxTasks : 3,
          }),
        });

        if (!response.ok) {
          const payload = await response.json().catch(() => null);
          throw new Error(payload?.error ?? "Benchmark stream başlatılamadı.");
        }

        if (!response.body) {
          throw new Error("Benchmark stream gövdesi alınamadı.");
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";

        const pushTrace = (item: Omit<BenchmarkTraceItem, "id">) => {
          setBenchmarkTrace((current) => [
            ...current,
            {
              id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
              ...item,
            },
          ].slice(-60));
        };

        const handleEvent = (event: { type: string; data: Record<string, unknown> }) => {
          if (event.type === "benchmark_start") {
            const suite = event.data.suite as { name: string; taskCount: number } | undefined;
            pushTrace({
              title: `${suite?.name ?? "Benchmark"} başlatıldı`,
              detail: `${suite?.taskCount ?? 0} görev canlı olarak çalıştırılıyor.`,
              tone: "info",
            });
            return;
          }

          if (event.type === "task_start") {
            pushTrace({
              title: `Görev başladı: ${String(event.data.title ?? "isimsiz görev")}`,
              detail: String(event.data.description ?? ""),
              tone: "info",
            });
            return;
          }

          if (event.type === "task_event") {
            const data = event.data as Record<string, unknown>;
            const eventType = String(data.type ?? "");

            if (eventType === "attempt_start") {
              pushTrace({
                title: `Deneme ${String(data.attempt ?? 1)}/${String(data.maxAttempts ?? 1)}`,
                detail: String(data.goal ?? ""),
                tone: "info",
              });
              return;
            }

            if (eventType === "step") {
              const step = data.step as { type?: string; content?: string; toolName?: string } | undefined;
              const stepType = step?.type ?? "step";
              const label =
                stepType === "thought" ? "Thought" :
                stepType === "action" ? `Action${step?.toolName ? ` · ${step.toolName}` : ""}` :
                stepType === "observation" ? "Observation" :
                stepType === "final_answer" ? "Final answer" :
                "Step";
              pushTrace({
                title: label,
                detail: String(step?.content ?? ""),
                tone: stepType === "observation" ? "success" : "info",
              });
              return;
            }

            if (eventType === "verification") {
              const verification = data.verification as { score?: number; passed?: boolean; suggestedNextStep?: string } | undefined;
              pushTrace({
                title: `Verifier skoru ${String(verification?.score ?? 0)}`,
                detail: verification?.suggestedNextStep
                  ? `İyileştirme: ${verification.suggestedNextStep}`
                  : verification?.passed
                    ? "Görev başarı kriterlerini geçti."
                    : "Görev henüz yeterli değil.",
                tone: verification?.passed ? "success" : "warning",
              });
              return;
            }

            if (eventType === "task_complete") {
              const result = data.result as { success?: boolean; verification?: { score?: number } } | undefined;
              pushTrace({
                title: result?.success ? "Görev tamamlandı" : "Görev başarısız kapandı",
                detail: `Skor ${String(result?.verification?.score ?? 0)}`,
                tone: result?.success ? "success" : "error",
              });
            }
            return;
          }

          if (event.type === "task_complete") {
            pushTrace({
              title: String(event.data.success ? "Görev tamamlandı" : "Görev düşük skorla kapandı"),
              detail: `Süre ${(Number(event.data.durationMs ?? 0) / 1000).toFixed(1)} sn`,
              tone: event.data.success ? "success" : "warning",
            });
            return;
          }

          if (event.type === "benchmark_warning") {
            pushTrace({
              title: "Benchmark uyarısı",
              detail: String(event.data.message ?? ""),
              tone: "warning",
            });
            return;
          }

          if (event.type === "benchmark_complete") {
            const result = event.data as unknown as BenchmarkResult;
            setBenchmarkResult(result);
            void refreshBenchmarkMeta();
            pushTrace({
              title: "Benchmark tamamlandı",
              detail: `Pass rate ${result.passRate}% · ortalama skor ${result.averageScore}`,
              tone: "success",
            });
            toast.success("Benchmark tamamlandı.");
            return;
          }

          if (event.type === "error") {
            const message = String(event.data.message ?? "Benchmark hatası");
            pushTrace({
              title: "Benchmark hatası",
              detail: message,
              tone: "error",
            });
            toast.error(message);
          }
        };

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const chunks = buffer.split("\n\n");
          buffer = chunks.pop() ?? "";

          for (const chunk of chunks) {
            const line = chunk
              .split("\n")
              .find((entry) => entry.startsWith("data: "));
            if (!line) continue;
            const raw = line.slice(6);
            const parsed = JSON.parse(raw) as { type: string; data: Record<string, unknown> };
            handleEvent(parsed);
          }
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : "Benchmark çalıştırılamadı.";
        setBenchmarkTrace((current) => [
          ...current,
          {
            id: `${Date.now()}-error`,
            title: "Benchmark hatası",
            detail: message,
            tone: "error",
          },
        ]);
        toast.error(message);
      } finally {
        setRunningBenchmark(false);
      }
    })();
  }

  const user = customerContext?.user as { first_name?: string; last_name?: string; email?: string; company_name?: string } | undefined;
  const companies = (customerContext?.companies as Array<{ id: string }> | undefined) ?? [];
  const marketplaces = (customerContext?.marketplaces as Array<{ id: string }> | undefined) ?? [];
  const tasks = (customerContext?.tasks as Array<{ id: string; task_status: string }> | undefined) ?? [];
  const openTasks = tasks.filter((task) => task.task_status !== "completed").length;
  const selectedSuite = benchmarkMeta?.suites.find((suite) => suite.id === selectedSuiteId) ?? null;
  const readySuites = (benchmarkMeta?.suites ?? []).filter((suite) => suite.status === "ready");
  const pendingSuites = (benchmarkMeta?.suites ?? []).filter((suite) => suite.status !== "ready");
  const benchmarkHealth: BenchmarkReleaseGate | null = benchmarkMeta?.health ?? null;
  const activeApprovals = dashboard?.pendingApprovals ?? [];
  const currentRuns = dashboardRecentRuns.filter((run) => getRunGeneration(run) === "current");
  const legacyRuns = dashboardRecentRuns.filter((run) => getRunGeneration(run) === "legacy");
  const activeConversation = conversations.find((item) => item.conversationId === conversationId) ?? null;
  const activeConversationMemory = conversationMemory ?? (activeConversation
    ? {
        conversationId: activeConversation.conversationId,
        sessionId: activeConversation.sessionId,
        title: activeConversation.title,
        scopeType: activeConversation.scopeType,
        scopeRefId: activeConversation.scopeRefId ?? null,
        scopeLabel: activeConversation.scopeLabel ?? null,
        projectId: activeConversation.projectId ?? null,
        projectName: activeConversation.projectName ?? null,
        workingGoal: activeConversation.workingGoal ?? null,
        memorySummary: activeConversation.memorySummary ?? null,
        memoryFacts: activeConversation.memoryFacts ?? [],
        handoffNote: activeConversation.handoffNote ?? null,
        handoffChecklist: activeConversation.handoffChecklist ?? [],
        workspaceStatus: activeConversation.workspaceStatus ?? "unclaimed",
        workspaceOwnerId: activeConversation.workspaceOwnerId ?? null,
        workspaceOwnerLabel: activeConversation.workspaceOwnerLabel ?? null,
        workspaceOwnerEmail: activeConversation.workspaceOwnerEmail ?? null,
        workspaceClaimedAt: activeConversation.workspaceClaimedAt ?? null,
        ownerIsCurrentAdmin: activeConversation.ownerIsCurrentAdmin ?? false,
        operatorJobStatus: activeConversation.operatorJobStatus ?? null,
        updatedAt: activeConversation.lastRunAt,
      }
    : null);
  const workspaceLockedByAnotherAdmin = Boolean(
    activeConversationMemory
    && activeConversationMemory.workspaceStatus === "claimed"
    && !activeConversationMemory.ownerIsCurrentAdmin,
  );
  const workspaceOwnerLabel =
    activeConversationMemory?.workspaceOwnerLabel
    ?? activeConversationMemory?.workspaceOwnerEmail
    ?? "başka bir admin";
  const recentArtifacts = activeRun?.artifacts?.length ? activeRun.artifacts : dashboard?.recentArtifacts ?? [];
  const activeOperatorJobs = (activeRun?.operatorJobs?.length ? activeRun.operatorJobs : operatorJobs)
    .filter((job) => ["pending", "approved", "paused", "taken_over"].includes(job.status));
  const runSuggestions = activeRun?.response.nextSuggestions ?? [];
  const missingFields = activeRun?.response.missingFields ?? [];
  const activeRunProjectName =
    typeof activeRun?.run.metadata?.projectName === "string" ? activeRun.run.metadata.projectName : null;
  const activeRunSkillNames = Array.isArray(activeRun?.run.metadata?.skillNames)
    ? activeRun?.run.metadata?.skillNames.filter((value): value is string => typeof value === "string")
    : [];
  const activeRunQuality = getRunQuality(activeRun?.run);
  const activeRunExecutionPath = getRunExecutionPath(activeRun?.run);
  const activeRunGeneration = activeRun ? getRunGeneration(activeRun.run) : null;
  const activeRunToolStats = getRunToolStats(activeRun?.run);
  const activeRunUsedTools = activeRunToolStats?.usedToolNames.slice(0, 6) ?? [];
  const activeConversationScope = useMemo(() => {
    if (activeRun?.run && activeRun.run.scopeType !== "global") {
      return {
        type: activeRun.run.scopeType,
        refId: activeRun.run.scopeRefId ?? undefined,
        label:
          typeof activeRun.run.metadata?.scopeLabel === "string"
            ? activeRun.run.metadata.scopeLabel
            : null,
      } satisfies CopilotScope;
    }

    return resolveConversationScopeHint(thread);
  }, [activeRun, thread]);
  const activeFocusLabel = activeConversationScope?.label ?? null;
  const visibleOperatorJobs = activeOperatorJobs
    .filter((job) => !conversationId || !job.conversationId || job.conversationId === conversationId)
    .sort((left, right) => new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime());
  const contextTitle =
    activeFocusLabel ||
    [user?.first_name, user?.last_name].filter(Boolean).join(" ") ||
    user?.company_name ||
    "Global görünüm";
  const contextSubtitle = activeFocusLabel
    ? "Bu sohbette Atlas ayni baglami koruyarak ilerliyor."
    : user?.email ?? "Seçili müşteri yok";
  const modeSummary = "Normal sohbet akisi. Baglami, araclari ve sonraki adimlari Atlas kendi secer";
  const autoScopeSummary =
    activeFocusLabel
    ? `${activeFocusLabel} baglaminda calisiyor; follow-up mesajlarda ayni isi surdurur.`
    : "Atlas mesajdan musteri, sirket, tool ve worker lane secimini kendisi cozer.";

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    if (visibleOperatorJobs.length === 0 && activeRun?.run.status !== "awaiting_approval") {
      return;
    }

    const intervalId = window.setInterval(() => {
      void refreshOperatorJobs().catch(() => undefined);
      void refreshConversationList().catch(() => undefined);

      if (activeRun?.run.id) {
        void fetchJson<CopilotCommandResponse>(`/api/ai/runs/${activeRun.run.id}`)
          .then((response) => {
            setActiveRun(response);
            upsertThreadRun(response, "history");
          })
          .catch(() => undefined);
      }
    }, 10000);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [activeRun?.run.id, activeRun?.run.status, visibleOperatorJobs.length]);

  function renderOperatorJobCard(job: CopilotOperatorJobRecord, surface: "thread" | "sidebar" = "sidebar") {
    const noteValue = operatorNotes[job.id] ?? "";
    const actions = getOperatorJobActions(job);
    const claimedByCompanion = job.metadata?.claimedBy === "companion";
    const companionLabel = typeof job.metadata?.companionLabel === "string" ? job.metadata.companionLabel : null;

    return (
      <div key={job.id} className="rounded-2xl border border-white/10 bg-white/[0.03] p-3.5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="text-sm font-medium text-slate-100">{job.title}</div>
            <div className="mt-1 text-xs leading-5 text-slate-400">{job.description}</div>
          </div>
          <Badge variant={badgeVariant(job.status)}>{formatOperatorJobStatus(job.status)}</Badge>
        </div>

        <div className="mt-3 flex flex-wrap gap-2">
          <Badge variant="outline" className="border-white/10 text-slate-300">
            {job.surface}
          </Badge>
          <Badge variant="outline" className="border-white/10 text-slate-300">
            {getWorkerTargetLabel(job.workerTarget)}
          </Badge>
          <Badge
            variant="outline"
            className={job.allowlisted ? "border-emerald-400/20 bg-emerald-500/10 text-emerald-100" : "border-rose-400/20 bg-rose-500/10 text-rose-100"}
          >
            {getOperatorAllowlistLabel(job, operatorAllowlistRules)}
          </Badge>
          {claimedByCompanion && companionLabel ? (
            <Badge variant="outline" className="border-sky-400/20 bg-sky-500/10 text-sky-100">
              {companionLabel}
            </Badge>
          ) : null}
        </div>

        <div className="mt-3 rounded-xl border border-white/10 bg-slate-950/45 px-3 py-3 text-xs leading-6 text-slate-300">
          <div><span className="text-slate-500">Hedef:</span> {job.target}</div>
                                  <div><span className="text-slate-500">İstek:</span> {job.commandText}</div>
          <div><span className="text-slate-500">Guncelleme:</span> {formatConversationTime(job.updatedAt)}</div>
        </div>

        <div className="mt-3">
          <Textarea
            value={noteValue}
            onChange={(event) => setOperatorNotes((current) => ({ ...current, [job.id]: event.target.value }))}
            placeholder={getOperatorNotePlaceholder(job)}
            className="min-h-[88px] border-white/10 bg-slate-950/40 text-sm text-slate-100 placeholder:text-slate-500"
          />
        </div>

        {job.decisionNote ? (
          <div className="mt-3 rounded-xl border border-white/10 bg-slate-950/40 px-3 py-3 text-xs leading-5 text-slate-400">
            Son not: {job.decisionNote}
          </div>
        ) : null}

        {actions.length > 0 ? (
          <div className={`mt-3 flex flex-wrap gap-2 ${surface === "thread" ? "" : "pt-1"}`}>
            {actions.map((item) => (
              <Button
                key={`${job.id}-${item.action}`}
                size="sm"
                variant={item.variant ?? "default"}
                className={item.variant === "outline" ? "border-white/10 bg-white/[0.04]" : undefined}
                onClick={() => handleOperatorJob(job.id, item.action)}
                disabled={acting}
              >
                {item.label}
              </Button>
            ))}
          </div>
        ) : (
          <div className="mt-3 text-xs text-slate-500">
            Bu operator isi acik aksiyon beklemiyor.
          </div>
        )}
      </div>
    );
  }

  function runJarvisObserver() {
    startJarvisObserverTransition(async () => {
      try {
        const payload = await fetchJson<JarvisDashboardPayload>("/api/admin/copilot/jarvis/observe", {
          method: "POST",
        });
        setJarvisDashboard(payload.dashboard);
        toast.success(
          payload.started === false
            ? "Jarvis taraması zaten çalışıyor."
            : "Jarvis observer taraması başlatıldı.",
        );
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Jarvis observer çalıştırılamadı.");
      }
    });
  }

  function refreshJarvisBrief() {
    startJarvisBriefTransition(async () => {
      try {
        const payload = await fetchJson<JarvisDashboardPayload>("/api/admin/copilot/jarvis/brief", {
          method: "POST",
        });
        setJarvisDashboard(payload.dashboard);
        toast.success("Jarvis sabah özeti güncellendi.");
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Jarvis özeti üretilemedi.");
      }
    });
  }

  function prepareJarvisProposal(proposalId: string) {
    setPreparingJarvisProposalId(proposalId);
    startJarvisProposalTransition(async () => {
      try {
        const payload = await fetchJson<JarvisDashboardPayload>(`/api/admin/copilot/jarvis/proposals/${proposalId}/prepare`, {
          method: "POST",
        });
        setJarvisDashboard(payload.dashboard);
        toast.success("Jarvis autofix branch/worktree hazırlandı.");
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Jarvis proposal hazırlanamadı.");
      } finally {
        setPreparingJarvisProposalId(null);
      }
    });
  }

  function rejectJarvisProposal(proposalId: string) {
    setRejectingJarvisProposalId(proposalId);
    startJarvisProposalTransition(async () => {
      try {
        const payload = await fetchJson<JarvisDashboardPayload>(`/api/admin/copilot/jarvis/proposals/${proposalId}/reject`, {
          method: "POST",
          body: JSON.stringify({ note: "Operator queue dışında bırakıldı." }),
        });
        setJarvisDashboard(payload.dashboard);
        toast.success("Jarvis proposal reddedildi.");
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Jarvis proposal reddedilemedi.");
      } finally {
        setRejectingJarvisProposalId(null);
      }
    });
  }

  return (
    <div className="flex h-full flex-col bg-[radial-gradient(circle_at_top_left,rgba(59,130,246,0.16),transparent_28%),radial-gradient(circle_at_82%_0%,rgba(16,185,129,0.10),transparent_22%),linear-gradient(180deg,#08101b_0%,#0b1220_58%,#070d16_100%)] text-slate-100">
      <div className="border-b border-white/10 px-6 py-6 xl:px-8">
        <div className="flex flex-wrap items-start justify-between gap-6">
          <div className="max-w-4xl space-y-4">
            <div className="flex items-start gap-4">
              <div className="rounded-[1.35rem] border border-sky-400/20 bg-sky-500/15 p-3 text-sky-200 shadow-[0_0_24px_rgba(56,189,248,0.16)]">
                <Sparkles className="h-5 w-5" />
              </div>
              <div className="space-y-2">
                <div className="atlas-kicker">Kalici Atlas sohbeti</div>
                <div className="flex flex-wrap items-center gap-3">
                  <h1 className="text-[2rem] font-semibold tracking-tight">Atlas</h1>
                  <Badge className="border-0 bg-emerald-500/15 text-emerald-200">tek ana sohbet</Badge>
                  <Badge variant="outline" className="border-white/10 text-slate-300">{modeSummary}</Badge>
                </div>
                <p className="max-w-3xl text-sm leading-6 text-slate-400">
                  Ne istediginizi normal dille yazin. Atlas sohbetin baglamini korur, gerekirse soru sorar,
                  tool, browser ve operator secimini kendi yapar; sonucu yine ayni sohbetten getirir.
                </p>
              </div>
            </div>
            </div>

          <div className="hidden min-w-[280px] gap-2 sm:grid-cols-2">
            <div className="atlas-workbench-panel rounded-2xl px-4 py-3">
              <div className="atlas-kicker">Provider</div>
              <div className="mt-2 text-sm font-medium">{benchmarkMeta?.provider.provider ?? "yukleniyor"}</div>
              <div className="text-xs text-slate-400">{benchmarkMeta?.provider.model ?? "model bekleniyor"}</div>
            </div>
            <div className="atlas-workbench-panel rounded-2xl px-4 py-3">
              <div className="atlas-kicker">Odak</div>
              <div className="mt-2 text-sm font-medium">{activeFocusLabel ?? "Auto scope"}</div>
              <div className="truncate text-xs text-slate-400">{autoScopeSummary}</div>
            </div>
            <div className="atlas-workbench-panel rounded-2xl px-4 py-3">
              <div className="atlas-kicker">Approvals</div>
              <div className="mt-2 text-sm font-medium">{activeApprovals.length} bekleyen kayit</div>
              <div className="text-xs text-slate-400">Mutasyonlar ve musteriye giden icerik onayli ilerler.</div>
            </div>
            <div className="atlas-workbench-panel rounded-2xl px-4 py-3">
              <div className="atlas-kicker">Runs</div>
              <div className="mt-2 text-sm font-medium">{currentRuns.length} current</div>
              <div className="text-xs text-slate-400">{legacyRuns.length} legacy · kalite gecmisi ayrik tutulur.</div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid min-h-0 flex-1 gap-6 px-6 py-6 lg:grid-cols-[minmax(0,1.45fr)_390px] xl:px-8">
        <div className="min-h-0 space-y-6">
          <Card className="atlas-workbench-panel-strong rounded-[1.75rem]">
            <CardHeader>
              <div className="flex flex-wrap items-center gap-2">
                  <Badge className="border-0 bg-sky-500/15 text-sky-200">conversation-first</Badge>
                  <Badge variant="outline" className="border-white/10 text-slate-300">Atlas karar verir</Badge>
                </div>
                <CardTitle className="pt-2">Yazin, Atlas ayni sohbetten ilerletsin</CardTitle>
                <CardDescription className="text-slate-400">
                  Komut yazmak zorunda degilsiniz. Hedefinizi anlatin; Atlas gerekirse planlar, sorar,
                  veri toplar, browser acar ve sonucu ayni konusmada surdurur.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="rounded-[1.45rem] border border-white/10 bg-slate-950/40 p-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="outline" className="border-white/10 text-slate-300">auto scope</Badge>
                    <Badge variant="outline" className="border-white/10 text-slate-300">sor, planla, yap, dogrula</Badge>
                    {activeFocusLabel ? (
                      <Badge className="border-0 bg-sky-500/15 text-sky-100">odak: {activeFocusLabel}</Badge>
                    ) : null}
                  </div>
                <Textarea
                  value={commandText}
                  onChange={(event) => setCommandText(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" && !event.shiftKey) {
                      event.preventDefault();
                      submitCommand();
                    }
                  }}
                  placeholder="Ornek: Yusuf Keser tarafinda neler eksik kaldi, bana kisa kisa cikar. Gerekirse Atlas kendi ekranlarina bakip devam etsin."
                  className="mt-4 min-h-[180px] resize-none border-white/10 bg-slate-950/60 text-base leading-7"
                />
              </div>

              <div className="hidden flex-wrap gap-2">
                {quickPrompts.slice(0, 4).map((prompt) => (
                  <button
                    key={prompt}
                    type="button"
                    onClick={() => submitCommand(prompt)}
                    className="rounded-full border border-sky-500/20 bg-sky-500/10 px-3 py-1.5 text-xs text-sky-200 transition hover:border-sky-400/40 hover:bg-sky-500/20"
                  >
                    {prompt}
                  </button>
                ))}
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs text-slate-400">
                  <Clock3 className="h-4 w-4" />
                  Atlas gerekiyorsa sizden onay ister; aksi halde sohbet akisini kendi ilerletir.
                </div>
                <Button
                  onClick={() => submitCommand()}
                  disabled={submitting}
                  className="min-w-[180px] rounded-2xl bg-primary text-primary-foreground shadow-[0_14px_32px_rgba(59,130,246,0.28)]"
                >
                  {submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
                  Gonder
                </Button>
              </div>

              <details className="rounded-[1.4rem] border border-white/10 bg-white/[0.03] px-4 py-3">
                <summary className="cursor-pointer list-none text-sm font-medium text-slate-200">
                  Atlas nasil karar veriyor
                </summary>
                <div className="mt-4 space-y-3 text-sm leading-6 text-slate-400">
                  <p>
                    Bu yüzey tek sohbet olarak çalışır. Proje, skill, scope, tool ve worker lane seçimini siz yapmazsınız;
                    Atlas mesajı ve yakın sohbet geçmişini okuyup kendisi belirler.
                  </p>
                  <p>
                    Bir müşteri adı geçerse Atlas o bağlamı çözer. Follow-up mesajlarda aynı işi sürdürür. Sadece
                    mutasyon, müşteriye gönderim veya etkileşimli operator işi gerekiyorsa sizden onay ister.
                  </p>
                </div>
              </details>
            </CardContent>
          </Card>

          <Card className="atlas-workbench-panel rounded-[1.75rem]">
            <CardContent className="p-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <div className="atlas-kicker">Sohbet akisi</div>
                  <div className="mt-1 text-xl font-semibold tracking-tight">Mesajlar, trace ve teslim ayni yerde</div>
                  <div className="mt-1 text-sm text-slate-400">
                    Burasi tek ana akis. Gerekli trace, approval ve teslim ayrintilari cevap kartlarinin icinde acilir.
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Badge variant="outline" className="border-white/10 text-slate-300">
                    {thread.length} tur
                  </Badge>
                  <Badge variant="outline" className="border-white/10 text-slate-300">
                    {activeRun ? "aktif cevap secili" : "yeni sohbet"}
                  </Badge>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="border-white/10 bg-white/[0.04]"
                    onClick={startNewConversation}
                  >
                    Yeni sohbet
                  </Button>
                </div>
              </div>

              <div className="mt-4 rounded-[1.5rem] border border-white/10 bg-slate-950/35 p-4">
                <ScrollArea className="h-[760px] pr-4">
                  <div className="space-y-6">
                    {thread.length > 0 ? (
                      thread.map((item) => {
                        const response = item.response;
                        const run = response?.run ?? null;
                        const isActiveRun = Boolean(item.runId && item.runId === activeRun?.run.id);
                        const failureCopy = item.error ? buildFriendlyFailureCopy(item.error, item.prompt) : null;
                        const visibleStatus = getVisibleThreadStatus(item, response);

                        return (
                          <div key={item.localId} className="space-y-3">
                            <div className="flex justify-end">
                              <div className="max-w-[86%] rounded-[1.6rem] rounded-br-md border border-sky-400/20 bg-sky-500/15 px-4 py-3">
                                <div className="flex items-center justify-between gap-3 text-xs text-sky-100/80">
                                  <div className="flex items-center gap-2">
                                    <UserRound className="h-4 w-4" />
                                    Siz
                                  </div>
                                  <span>{formatThreadTime(item.createdAt)}</span>
                                </div>
                                <div className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-50">{item.prompt}</div>
                              </div>
                            </div>

                            <div className="flex justify-start">
                              <div className={`max-w-[92%] rounded-[1.75rem] rounded-tl-md border px-4 py-4 ${
                                isActiveRun
                                  ? "border-emerald-400/25 bg-emerald-500/10"
                                  : "border-white/10 bg-white/[0.03]"
                              }`}>
                                <div className="flex flex-wrap items-center justify-between gap-3">
                                  <div className="flex flex-wrap items-center gap-2">
                                    <div className="flex items-center gap-2 rounded-full border border-white/10 bg-slate-950/45 px-3 py-1 text-xs text-slate-200">
                                      <Sparkles className="h-3.5 w-3.5 text-sky-300" />
                                      Atlas
                                    </div>
                                    {visibleStatus ? (
                                      <Badge variant={visibleStatus.variant} className={visibleStatus.className}>
                                        {visibleStatus.label}
                                      </Badge>
                                    ) : null}
                                  </div>
                                  <div className="text-xs text-slate-500">{formatThreadTime(response?.run.createdAt ?? item.createdAt)}</div>
                                </div>

                                {item.status === "pending" && !response ? (
                                  <div className="mt-4 flex items-center gap-3 rounded-2xl border border-white/10 bg-slate-950/45 px-4 py-4 text-sm text-slate-300">
                                    <Loader2 className="h-4 w-4 animate-spin text-sky-300" />
                                    Atlas dusunuyor, gerekiyorsa tool ve browser lane secimini yapiyor.
                                  </div>
                                ) : null}

                                {failureCopy ? (
                                  <div className="mt-4 space-y-3 rounded-2xl border border-amber-400/20 bg-amber-500/10 px-4 py-4">
                                    <div className="text-base font-medium leading-7 text-amber-50">{failureCopy.summary}</div>
                                    <p className="text-sm leading-6 text-amber-100/90">{failureCopy.details}</p>
                                    <div className="flex flex-wrap gap-2">
                                      {failureCopy.suggestions.map((suggestion) => (
                                        <button
                                          key={suggestion}
                                          type="button"
                                          onClick={() => handleSuggestionClick(suggestion)}
                                          className="rounded-full border border-amber-300/25 bg-amber-500/10 px-3 py-1.5 text-xs text-amber-50 transition hover:border-amber-200/40 hover:bg-amber-500/20"
                                        >
                                          {suggestion}
                                        </button>
                                      ))}
                                    </div>
                                  </div>
                                ) : null}

                                {response ? (
                                  <div className="mt-4 space-y-4">
                                    <div>
                                      <div className="text-base font-medium leading-7 text-slate-100">{response.response.summary}</div>
                                      {response.response.details ? (
                                        <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-300">
                                          {response.response.details}
                                        </p>
                                      ) : null}
                                    </div>

                                    {(response.response.missingFields ?? []).length > 0 ? (
                                      <div className="flex flex-wrap gap-2">
                                        {(response.response.missingFields ?? []).map((field) => (
                                          <Badge key={field} variant="outline" className="border-amber-400/30 bg-amber-500/10 text-amber-100">
                                            {field}
                                          </Badge>
                                        ))}
                                      </div>
                                    ) : null}

                                    {response.response.nextSuggestions.length > 0 ? (
                                      <div className="space-y-2">
                                        <div className="atlas-kicker">Devam sorulari</div>
                                        <div className="flex flex-wrap gap-2">
                                          {response.response.nextSuggestions.map((suggestion) => (
                                            <button
                                              key={suggestion}
                                              type="button"
                                              onClick={() => handleSuggestionClick(suggestion)}
                                              className="rounded-full border border-sky-400/20 bg-sky-500/10 px-3 py-1.5 text-xs text-sky-100 transition hover:border-sky-300/40 hover:bg-sky-500/20"
                                            >
                                              {suggestion}
                                            </button>
                                          ))}
                                        </div>
                                      </div>
                                    ) : null}

                                    {response.operatorJobs?.some((job) => ["pending", "approved", "paused", "taken_over"].includes(job.status)) ? (
                                      <details className="rounded-2xl border border-white/10 bg-slate-950/40 p-3" open>
                                        <summary className="cursor-pointer list-none text-sm font-medium text-slate-100">
                                          Operator queue
                                        </summary>
                                        <div className="mt-3 space-y-3">
                                          {response.operatorJobs
                                            .filter((job) => ["pending", "approved", "paused", "taken_over"].includes(job.status))
                                            .map((job) => renderOperatorJobCard(job, "thread"))}
                                        </div>
                                      </details>
                                    ) : null}

                                    {response.timeline.length > 0 ? (
                                      <details className="rounded-2xl border border-white/10 bg-slate-950/40 p-3">
                                        <summary className="cursor-pointer list-none text-sm font-medium text-slate-100">
                                          Trace ve ajan adimlari
                                        </summary>
                                        <div className="mt-3 space-y-3">
                                          {response.timeline.map((step) => (
                                            <div key={step.id} className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
                                              <div className="flex items-center justify-between gap-3">
                                                <div className="flex items-center gap-2">
                                                  {step.status === "completed" ? <CheckCircle2 className="h-4 w-4 text-emerald-400" /> : step.status === "failed" || step.status === "rejected" ? <AlertCircle className="h-4 w-4 text-rose-400" /> : <Clock3 className="h-4 w-4 text-amber-300" />}
                                                  <span className="text-sm font-medium text-slate-100">{step.title}</span>
                                                </div>
                                                <Badge variant={badgeVariant(step.status)}>{step.status}</Badge>
                                              </div>
                                              {step.detail ? <div className="mt-2 text-sm leading-6 text-slate-400">{step.detail}</div> : null}
                                            </div>
                                          ))}
                                        </div>
                                      </details>
                                    ) : null}

                                    {response.approvals.length > 0 ? (
                                      <details className="rounded-2xl border border-white/10 bg-slate-950/40 p-3">
                                        <summary className="cursor-pointer list-none text-sm font-medium text-slate-100">
                                          Approvals
                                        </summary>
                                        <div className="mt-3 space-y-3">
                                          {response.approvals.map((approval) => (
                                            <div key={approval.id} className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
                                              <div className="flex flex-wrap items-center justify-between gap-3">
                                                <div>
                                                  <div className="text-sm font-medium text-slate-100">{approval.title}</div>
                                                  <div className="mt-1 text-xs leading-5 text-slate-400">{approval.description}</div>
                                                </div>
                                                <Badge variant={badgeVariant(approval.status)}>{approval.status}</Badge>
                                              </div>
                                              {approval.status === "pending" ? (
                                                <div className="mt-3 flex gap-2">
                                                  <Button size="sm" onClick={() => handleApproval(approval.id, "approve")} disabled={acting}>
                                                    Onayla
                                                  </Button>
                                                  <Button size="sm" variant="outline" className="border-white/10 bg-white/5" onClick={() => handleApproval(approval.id, "reject")} disabled={acting}>
                                                    Reddet
                                                  </Button>
                                                </div>
                                              ) : null}
                                            </div>
                                          ))}
                                        </div>
                                      </details>
                                    ) : null}

                                    {(response.artifacts.length > 0 || response.deliveries.length > 0) ? (
                                      <details className="rounded-2xl border border-white/10 bg-slate-950/40 p-3">
                                        <summary className="cursor-pointer list-none text-sm font-medium text-slate-100">
                                          Artifacts ve iç inceleme
                                        </summary>
                                        <div className="mt-3 space-y-3">
                                          {response.artifacts.map((artifact) => (
                                            <div key={artifact.id} className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
                                              <div className="flex items-center justify-between gap-3">
                                                <div className="flex items-center gap-2 text-sm font-medium text-slate-100">
                                                  <FileText className="h-4 w-4 text-sky-300" />
                                                  {artifact.title}
                                                </div>
                                                <Badge variant={badgeVariant(artifact.status)}>{artifact.status}</Badge>
                                              </div>
                                              <div className="mt-2 text-xs text-slate-400">{artifact.artifactType} · {artifact.channel}</div>
                                              <div className="mt-3 rounded-xl border border-white/10 bg-slate-950/50 px-3 py-2 text-xs leading-5 text-slate-400">
                                                Admin-only stabil modda otomatik portal teslimi kapalı. Artifact burada iç taslak
                                                olarak değerlendirilir.
                                              </div>
                                            </div>
                                          ))}

                                          {response.deliveries.map((delivery) => (
                                            <div key={delivery.id} className="rounded-xl border border-white/10 bg-white/[0.03] px-3 py-3">
                                              <div className="flex items-center justify-between gap-3">
                                                <span className="text-sm font-medium text-slate-100">{delivery.targetType}</span>
                                                <Badge variant={badgeVariant(delivery.status)}>{delivery.status}</Badge>
                                              </div>
                                              <div className="mt-1 text-xs text-slate-400">{delivery.targetRef ?? "Hedef referansı yok"}</div>
                                            </div>
                                          ))}
                                        </div>
                                      </details>
                                    ) : null}
                                  </div>
                                ) : null}
                              </div>
                            </div>
                          </div>
                        );
                      })
                    ) : (
                      <div className="rounded-[1.5rem] border border-dashed border-white/10 px-6 py-10 text-center">
                        <div className="text-base font-medium text-slate-200">Sohbet henüz başlamadı</div>
                        <p className="mx-auto mt-2 max-w-xl text-sm text-slate-500">
                          İlk mesajı yazın. Atlas gerekirse bağlamı çözer, soru sorar ve cevabı aynı sohbet akışında tutar.
                        </p>
                      </div>
                    )}
                  </div>
                </ScrollArea>
              </div>
            </CardContent>
          </Card>

          <Card className="hidden atlas-workbench-panel rounded-[1.75rem]">
            <CardContent className="p-5">
              <Tabs defaultValue={activeRun ? "overview" : "timeline"} className="gap-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <div className="atlas-kicker">Run Surface</div>
                    <div className="mt-1 text-xl font-semibold tracking-tight">Çıktı, trace ve teslim katmanı</div>
                    <div className="mt-1 text-sm text-slate-400">
                      Özet, kayıt etkisi, timeline ve artifact katmanını tek mission-control yüzeyinde toplayın.
                    </div>
                  </div>
                  <TabsList variant="line" className="bg-transparent">
                    <TabsTrigger value="overview">Overview</TabsTrigger>
                    <TabsTrigger value="timeline">Trace</TabsTrigger>
                    <TabsTrigger value="assets">Artifacts</TabsTrigger>
                  </TabsList>
                </div>

                <TabsContent value="overview" className="space-y-4">
                  {activeRun ? (
                    <>
                      <div className="rounded-[1.5rem] border border-emerald-500/20 bg-emerald-500/10 p-4">
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div className="max-w-3xl">
                            <div className="flex items-center gap-2">
                              <Badge className="border-0 bg-emerald-500/15 text-emerald-200">Run Summary</Badge>
                              <Badge variant={badgeVariant(activeRun.run.status)}>{activeRun.run.status}</Badge>
                              <Badge variant="outline" className="border-white/10 text-slate-300">
                                {getRunGenerationLabel(activeRunGeneration ?? "legacy")}
                              </Badge>
                              {activeRunExecutionPath ? (
                                <Badge variant="outline" className="border-white/10 text-slate-300">
                                  {activeRunExecutionPath}
                                </Badge>
                              ) : null}
                              {activeRunToolStats ? (
                                <Badge variant="outline" className="border-white/10 text-slate-300">
                                  {getWorkerTargetLabel(activeRunToolStats.primaryWorkerTarget)}
                                </Badge>
                              ) : null}
                              {activeRunQuality ? (
                                <Badge
                                  variant={activeRunQuality.passed ? "default" : "destructive"}
                                  className={activeRunQuality.passed ? "border-0 bg-emerald-500/15 text-emerald-200" : undefined}
                                >
                                  quality {activeRunQuality.score}/100
                                </Badge>
                              ) : null}
                              {activeRunProjectName ? (
                                <Badge variant="outline" className="border-white/10 text-slate-300">
                                  {activeRunProjectName}
                                </Badge>
                              ) : null}
                            </div>
                            {activeRunSkillNames.length > 0 ? (
                              <div className="mt-2 flex flex-wrap gap-2">
                                {activeRunSkillNames.map((skillName) => (
                                  <Badge key={skillName} variant="outline" className="border-sky-400/20 bg-sky-500/10 text-sky-100">
                                    {skillName}
                                  </Badge>
                                ))}
                              </div>
                            ) : null}
                            <div className="mt-3 text-base font-medium">{activeRun.response.summary}</div>
                            {activeRun.response.details ? (
                              <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-300">
                                {activeRun.response.details}
                              </p>
                            ) : null}
                          </div>
                          <div className="grid min-w-[220px] gap-3 sm:grid-cols-2">
                            <div className="rounded-2xl border border-white/10 bg-slate-950/30 px-3 py-3">
                              <div className="atlas-kicker">Affected</div>
                              <div className="mt-2 text-xl font-semibold">{activeRun.response.affectedRecords?.length ?? 0}</div>
                            </div>
                            <div className="rounded-2xl border border-white/10 bg-slate-950/30 px-3 py-3">
                              <div className="atlas-kicker">Suggestions</div>
                              <div className="mt-2 text-xl font-semibold">{runSuggestions.length}</div>
                            </div>
                            <div className="rounded-2xl border border-white/10 bg-slate-950/30 px-3 py-3">
                              <div className="atlas-kicker">Generation</div>
                              <div className="mt-2 text-xl font-semibold">{getRunGenerationLabel(activeRunGeneration ?? "legacy")}</div>
                            </div>
                            <div className="rounded-2xl border border-white/10 bg-slate-950/30 px-3 py-3">
                              <div className="atlas-kicker">Quality</div>
                              <div className="mt-2 text-xl font-semibold">
                                {activeRunQuality ? `${activeRunQuality.score}/100` : "unrated"}
                              </div>
                            </div>
                            <div className="rounded-2xl border border-white/10 bg-slate-950/30 px-3 py-3">
                              <div className="atlas-kicker">Worker Lane</div>
                              <div className="mt-2 text-xl font-semibold">
                                {activeRunToolStats ? getWorkerTargetLabel(activeRunToolStats.primaryWorkerTarget) : "n/a"}
                              </div>
                            </div>
                            <div className="rounded-2xl border border-white/10 bg-slate-950/30 px-3 py-3">
                              <div className="atlas-kicker">Tools</div>
                              <div className="mt-2 text-xl font-semibold">
                                {activeRunToolStats ? activeRunToolStats.usedToolNames.length : 0}
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
                        <div className="space-y-4">
                          <div className="rounded-[1.35rem] border border-white/10 bg-slate-950/40 p-4">
                            <div className="atlas-kicker">Affected Records</div>
                            <div className="mt-3 grid gap-2">
                              {(activeRun.response.affectedRecords ?? []).length > 0 ? (
                                (activeRun.response.affectedRecords ?? []).map((record) => (
                                  <div key={`${record.type}-${record.id}`} className="flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2.5">
                                    <div>
                                      <div className="text-sm font-medium text-slate-100">{record.label ?? record.type}</div>
                                      <div className="text-xs text-slate-400">{record.id}</div>
                                    </div>
                                    <Badge variant="outline">{record.type}</Badge>
                                  </div>
                                ))
                              ) : (
                                <div className="rounded-xl border border-dashed border-white/10 px-4 py-5 text-sm text-slate-500">
                                  Bu run henüz veri mutasyonu üretmedi.
                                </div>
                              )}
                            </div>
                          </div>

                          <div className="rounded-[1.35rem] border border-white/10 bg-slate-950/40 p-4">
                            <div className="atlas-kicker">Missing Fields</div>
                            <div className="mt-3 flex flex-wrap gap-2">
                              {missingFields.length > 0 ? (
                                missingFields.map((field) => (
                                  <Badge key={field} variant="outline" className="border-amber-400/20 bg-amber-500/10 text-amber-100">
                                    {field}
                                  </Badge>
                                ))
                              ) : (
                                <span className="text-sm text-slate-500">Eksik slot yok.</span>
                              )}
                            </div>
                          </div>

                          <div className="rounded-[1.35rem] border border-white/10 bg-slate-950/40 p-4">
                            <div className="atlas-kicker">Worker & Tools</div>
                            <div className="mt-3 flex flex-wrap gap-2">
                              {activeRunToolStats ? (
                                <>
                                  <Badge variant="outline" className="border-white/10 text-slate-300">
                                    {getWorkerTargetLabel(activeRunToolStats.primaryWorkerTarget)}
                                  </Badge>
                                  {activeRunToolStats.browserLane ? (
                                    <Badge variant="outline" className="border-sky-400/20 bg-sky-500/10 text-sky-100">
                                      browser lane
                                    </Badge>
                                  ) : null}
                                  {activeRunToolStats.readOnlyExploration ? (
                                    <Badge variant="outline" className="border-emerald-400/20 bg-emerald-500/10 text-emerald-100">
                                      read-only exploration
                                    </Badge>
                                  ) : null}
                                </>
                              ) : (
                                <span className="text-sm text-slate-500">Tool/worker metadata kaydi yok.</span>
                              )}
                            </div>
                            {activeRunUsedTools.length > 0 ? (
                              <div className="mt-3 flex flex-wrap gap-2">
                                {activeRunUsedTools.map((toolName) => (
                                  <Badge
                                    key={toolName}
                                    variant="outline"
                                    className="border-sky-400/20 bg-sky-500/10 text-sky-100"
                                  >
                                    {formatToolName(toolName)}
                                  </Badge>
                                ))}
                              </div>
                            ) : null}
                          </div>
                        </div>

                        <div className="rounded-[1.35rem] border border-white/10 bg-slate-950/40 p-4">
                          <div className="atlas-kicker">Next Best Actions</div>
                          <div className="mt-3 space-y-2">
                            {runSuggestions.length > 0 ? (
                              runSuggestions.map((suggestion) => (
                                <button
                                  key={suggestion}
                                  type="button"
                                  onClick={() => handleSuggestionClick(suggestion)}
                                  className="flex w-full items-start rounded-xl border border-white/10 bg-white/[0.03] px-3 py-3 text-left transition hover:border-sky-400/30 hover:bg-sky-500/10"
                                >
                                  <Sparkles className="mt-0.5 mr-2 h-4 w-4 shrink-0 text-sky-300" />
                                  <span className="text-sm text-slate-100">{suggestion}</span>
                                </button>
                              ))
                            ) : (
                              <div className="rounded-xl border border-dashed border-white/10 px-4 py-5 text-sm text-slate-500">
                                Bu run için otomatik sonraki aksiyon önerisi yok.
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </>
                  ) : (
                    <div className="rounded-[1.5rem] border border-dashed border-white/10 px-6 py-10 text-center">
                      <div className="text-base font-medium text-slate-200">Henüz bir run seçilmedi</div>
                      <p className="mx-auto mt-2 max-w-xl text-sm text-slate-500">
                        Sohbetten doğal dil mesajı yazın ya da sağ dock&apos;taki son run&apos;lardan birini açın.
                      </p>
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="timeline">
                  <div className="rounded-[1.35rem] border border-white/10 bg-slate-950/35 p-4">
                    <ScrollArea className="h-[520px] pr-4">
                      <div className="space-y-3">
                        {(activeRun?.timeline ?? []).length > 0 ? (
                          (activeRun?.timeline ?? []).map((step) => (
                            <div key={step.id} className="rounded-2xl border border-white/10 bg-white/[0.03] p-3.5">
                              <div className="flex items-center justify-between gap-3">
                                <div className="flex items-center gap-2">
                                  {step.status === "completed" ? <CheckCircle2 className="h-4 w-4 text-emerald-400" /> : step.status === "failed" || step.status === "rejected" ? <AlertCircle className="h-4 w-4 text-rose-400" /> : <Clock3 className="h-4 w-4 text-amber-300" />}
                                  <span className="text-sm font-medium text-slate-100">{step.title}</span>
                                </div>
                                <Badge variant={badgeVariant(step.status)}>{step.status}</Badge>
                              </div>
                              {step.detail ? <div className="mt-2 text-sm leading-6 text-slate-400">{step.detail}</div> : null}
                              {typeof step.payload?.toolName === "string" ? (
                                <div className="mt-3">
                                  <Badge variant="outline" className="border-sky-400/20 bg-sky-500/10 text-sky-100">
                                    {step.payload.toolName}
                                  </Badge>
                                </div>
                              ) : null}
                              {typeof step.payload?.content === "string" ? (
                                <div className="mt-3 rounded-xl border border-white/10 bg-slate-950/45 px-3 py-3 text-xs leading-6 text-slate-300">
                                  {step.payload.content}
                                </div>
                              ) : null}
                            </div>
                          ))
                        ) : (
                          <div className="rounded-xl border border-dashed border-white/10 px-4 py-5 text-center text-sm text-slate-500">
                            Timeline henüz akmadı.
                          </div>
                        )}
                      </div>
                    </ScrollArea>
                  </div>
                </TabsContent>

                <TabsContent value="assets">
                  <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
                    <div className="rounded-[1.35rem] border border-white/10 bg-slate-950/35 p-4">
                      <div className="atlas-kicker">Artifacts</div>
                      <div className="mt-2 rounded-xl border border-white/10 bg-slate-950/45 px-3 py-2 text-xs leading-5 text-slate-400">
                        Bu yüzey şu an admin-only. Portal teslimi ve müşteriye bildirim gönderimi burada kapalı.
                      </div>
                      <ScrollArea className="mt-3 h-[440px] pr-4">
                        <div className="space-y-3">
                          {recentArtifacts.length > 0 ? (
                            recentArtifacts.map((artifact) => (
                              <div key={artifact.id} className="rounded-2xl border border-white/10 bg-white/[0.03] p-3.5">
                                <div className="flex items-center justify-between gap-3">
                                  <div className="flex items-center gap-2 text-sm font-medium text-slate-100">
                                    <FileText className="h-4 w-4 text-sky-300" />
                                    {artifact.title}
                                  </div>
                                  <Badge variant={badgeVariant(artifact.status)}>{artifact.status}</Badge>
                                </div>
                                <div className="mt-2 text-xs text-slate-400">{artifact.artifactType} · {artifact.channel}</div>
                                <div className="mt-3 rounded-xl border border-white/10 bg-slate-950/50 px-3 py-2 text-xs leading-5 text-slate-400">
                                  İç inceleme bekliyor. Müşteriye teslim aksiyonu bu ekranda kapalı.
                                </div>
                              </div>
                            ))
                          ) : (
                            <div className="rounded-xl border border-dashed border-white/10 px-4 py-5 text-center text-sm text-slate-500">
                              Henüz artifact yok.
                            </div>
                          )}
                        </div>
                      </ScrollArea>
                    </div>

                    <div className="rounded-[1.35rem] border border-white/10 bg-slate-950/35 p-4">
                      <div className="atlas-kicker">Delivery log</div>
                      <div className="mt-2 text-xs leading-5 text-slate-500">
                        Sadece geçmiş teslim kayıtları görünür. Yeni portal teslimi admin-only stabil modda kapalı.
                      </div>
                      <div className="mt-3 space-y-2">
                        {(activeRun?.deliveries ?? []).length > 0 ? (
                          activeRun?.deliveries.map((delivery) => (
                            <div key={delivery.id} className="rounded-xl border border-white/10 bg-white/[0.03] px-3 py-3">
                              <div className="flex items-center justify-between gap-3">
                                <span className="text-sm font-medium text-slate-100">{delivery.targetType}</span>
                                <Badge variant={badgeVariant(delivery.status)}>{delivery.status}</Badge>
                              </div>
                              <div className="mt-1 text-xs text-slate-400">{delivery.targetRef ?? "Hedef referansı yok"}</div>
                            </div>
                          ))
                        ) : (
                          <div className="rounded-xl border border-dashed border-white/10 px-4 py-5 text-sm text-slate-500">
                            Bu run için teslim kaydı oluşmadı.
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </div>

        <aside className="min-h-0 space-y-6">
            <JarvisObserverPanel
              dashboard={jarvisDashboard}
              loading={loadingDashboard}
              runningObserver={jarvisObservationActive}
              generatingBrief={generatingJarvisBrief}
              preparingProposalId={preparingJarvisProposal ? preparingJarvisProposalId : null}
              rejectingProposalId={preparingJarvisProposal ? rejectingJarvisProposalId : null}
              onRunObserver={runJarvisObserver}
              onRefreshBrief={refreshJarvisBrief}
              onPrepareProposal={prepareJarvisProposal}
              onRejectProposal={rejectJarvisProposal}
            />

            <Card className="atlas-workbench-panel rounded-[1.65rem]">
              <CardHeader>
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <CardTitle>Hafiza</CardTitle>
                    <CardDescription className="text-slate-400">
                      Ana akis solda. Burasi sadece kalici sohbet hafizasi ve operator durumu.
                    </CardDescription>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="border-white/10 text-slate-300">
                      {conversations.length}
                    </Badge>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="border-white/10 bg-white/[0.04]"
                      onClick={startNewConversation}
                    >
                      Yeni sohbet
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="rounded-2xl border border-white/10 bg-slate-950/40 px-3 py-3 text-xs leading-5 text-slate-400">
                  {activeFocusLabel
                    ? `Bu sohbet şu an ${activeFocusLabel} üzerinde devam ediyor.`
                    : "Odak otomatik. Atlas mesajdan müşteri, şirket ve gerekli aracı kendi seçer."}
                </div>
                <details className="mt-4 rounded-2xl border border-white/10 bg-slate-950/35 p-3">
                  <summary className="cursor-pointer list-none text-sm font-medium text-slate-100">
                    Sohbet gecmisi ve onceki threadler
                  </summary>
                  <ScrollArea className="mt-3 h-[480px] pr-4">
                    <div className="space-y-3">
                      {conversations.map((item) => (
                        <button
                          key={`${item.id}-${item.conversationId}`}
                          type="button"
                          onClick={() => openConversation(item)}
                          className={`w-full rounded-2xl border p-3 text-left transition ${
                            item.conversationId === conversationId
                              ? "border-sky-400/35 bg-sky-500/10"
                              : "border-white/10 bg-slate-950/40 hover:border-sky-400/25 hover:bg-sky-500/10"
                          }`}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <div className="truncate text-sm font-medium text-slate-100">
                                {truncateConversationText(item.title, 72)}
                              </div>
                              <div className="mt-1 text-xs text-slate-500">
                                {item.scopeLabel ?? item.scopeType}
                              </div>
                            </div>
                            <div className="flex flex-col items-end gap-2">
                              <Badge variant={item.generation === "current" ? "default" : "outline"}>
                                {item.generation}
                              </Badge>
                              <span className="text-[11px] text-slate-500">{formatConversationTime(item.lastRunAt)}</span>
                            </div>
                          </div>
                          <div className="mt-3 text-xs leading-5 text-slate-400">
                            {truncateConversationText(item.preview ?? item.lastCommandText ?? "Henüz cevap yok.", 140)}
                          </div>
                        </button>
                      ))}
                      {conversations.length === 0 ? (
                        <div className="rounded-2xl border border-dashed border-white/10 p-6 text-center text-sm text-slate-500">
                          Henüz kalıcı sohbet yok.
                        </div>
                      ) : null}
                    </div>
                  </ScrollArea>
                </details>
                {activeConversation ? (
                  <div className="mt-3 rounded-2xl border border-white/10 bg-slate-950/40 px-3 py-3 text-xs text-slate-400">
                    Aktif sohbet: <span className="font-medium text-slate-200">{truncateConversationText(activeConversation.title, 96)}</span>
                  </div>
                ) : null}
                {activeConversationMemory ? (
                  <div className="mt-3 rounded-2xl border border-white/10 bg-slate-950/40 p-3">
                    <div className="atlas-kicker">Conversation Memory</div>
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      <div className="text-sm font-medium text-slate-100">
                        {activeConversationMemory.projectName ?? activeConversationMemory.title}
                      </div>
                      <Badge variant={getWorkspaceStatusVariant(activeConversationMemory.workspaceStatus)}>
                        {formatWorkspaceStatus(activeConversationMemory.workspaceStatus)}
                      </Badge>
                      {activeConversationMemory.ownerIsCurrentAdmin ? (
                        <Badge variant="outline" className="border-emerald-400/20 bg-emerald-500/10 text-emerald-100">
                          sende
                        </Badge>
                      ) : null}
                    </div>
                    <div className="mt-2 text-xs leading-5 text-slate-400">
                      {activeConversationMemory.memorySummary ?? "Bu sohbet için kalıcı hafıza henüz oluşmadı."}
                    </div>
                    <div className="mt-3 rounded-2xl border border-white/10 bg-white/[0.03] px-3 py-3 text-xs leading-5 text-slate-400">
                      <div>
                        Workspace sahibi: <span className="font-medium text-slate-200">{activeConversationMemory.workspaceStatus === "unclaimed" ? "henüz yok" : workspaceOwnerLabel}</span>
                      </div>
                      {activeConversationMemory.workspaceClaimedAt ? (
                        <div className="mt-1 text-slate-500">
                          Son sahiplenme: {formatDateTime(activeConversationMemory.workspaceClaimedAt)}
                        </div>
                      ) : null}
                      {workspaceLockedByAnotherAdmin ? (
                        <div className="mt-2 rounded-xl border border-amber-400/20 bg-amber-500/10 px-3 py-2 text-amber-100">
                          Bu thread şu an {workspaceOwnerLabel} tarafından aktif olarak tutuluyor. Okuyabilirsin ama düzenlemek için handoff veya release beklemelisin.
                        </div>
                      ) : (
                        <div className="mt-2 text-slate-500">
                          Claim edersen bu thread senin çalışma alanın olur. Handoff hazır işaretlersen başka admin devralabilir.
                        </div>
                      )}
                    </div>
                    {activeConversationMemory.memoryFacts.length > 0 ? (
                      <div className="mt-3 space-y-1.5 text-xs text-slate-400">
                        {activeConversationMemory.memoryFacts.map((fact) => (
                          <div key={fact} className="rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2">
                            {fact}
                          </div>
                        ))}
                      </div>
                    ) : null}
                    <div className="mt-3 space-y-3">
                      <div className="space-y-2">
                        <div className="text-[11px] font-medium uppercase tracking-[0.18em] text-slate-500">
                          Workspace
                        </div>
                        <select
                          value={selectedProjectId}
                          onChange={(event) => setSelectedProjectId(event.target.value)}
                          className="w-full rounded-xl border border-white/10 bg-slate-950/60 px-3 py-2 text-sm text-slate-100 outline-none"
                        >
                          <option value="">Atlas otomatik secsin</option>
                          {availableProjects.map((project) => (
                            <option key={project.id} value={project.id}>
                              {project.name}
                            </option>
                          ))}
                        </select>
                        <div className="text-xs leading-5 text-slate-500">
                          Workspace pinlersen Atlas bu thread icinde ayni hedef ve skill setiyle devam eder.
                        </div>
                      </div>
                      <div className="grid gap-2 sm:grid-cols-2">
                        <Button
                          type="button"
                          size="sm"
                          variant={activeConversationMemory.ownerIsCurrentAdmin ? "secondary" : "outline"}
                          className="border-white/10 bg-white/[0.04]"
                          onClick={() => saveConversationMemory("claim")}
                          disabled={acting || submitting || !conversationId || workspaceLockedByAnotherAdmin}
                        >
                          Threadi sahiplen
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          className="border-white/10 bg-white/[0.04]"
                          onClick={() => saveConversationMemory("release")}
                          disabled={acting || submitting || !conversationId || !activeConversationMemory.ownerIsCurrentAdmin}
                        >
                          Sahipligi birak
                        </Button>
                      </div>
                      <div className="space-y-2">
                        <div className="text-[11px] font-medium uppercase tracking-[0.18em] text-slate-500">
                          Calisma hedefi
                        </div>
                        <Textarea
                          value={workingGoalDraft}
                          onChange={(event) => setWorkingGoalDraft(event.target.value)}
                          rows={3}
                          className="border-white/10 bg-slate-950/60 text-sm text-slate-100"
                          placeholder="Bu thread'in ana hedefi: ornegin launch planini bitir, eksik formlari tara, admin ic notu veya teslim taslagi hazirla..."
                          disabled={workspaceLockedByAnotherAdmin}
                        />
                      </div>
                      <div className="space-y-2">
                        <div className="text-[11px] font-medium uppercase tracking-[0.18em] text-slate-500">
                          Handoff checklist
                        </div>
                        <Textarea
                          value={handoffChecklistDraft}
                          onChange={(event) => setHandoffChecklistDraft(event.target.value)}
                          rows={4}
                          className="border-white/10 bg-slate-950/60 text-sm text-slate-100"
                          placeholder={"Bir satira bir madde yaz.\nOrnek: Eksik EIN alanini kontrol et\nForm ATL-102 statusunu dogrula"}
                          disabled={workspaceLockedByAnotherAdmin}
                        />
                      </div>
                      <div className="space-y-2">
                        <div className="text-[11px] font-medium uppercase tracking-[0.18em] text-slate-500">
                          Handoff note
                        </div>
                        <Textarea
                          value={handoffNoteDraft}
                          onChange={(event) => setHandoffNoteDraft(event.target.value)}
                          rows={4}
                          className="border-white/10 bg-slate-950/60 text-sm text-slate-100"
                          placeholder="Bu sohbette bir sonraki adminin bilmesi gereken kısa özet..."
                          disabled={workspaceLockedByAnotherAdmin}
                        />
                      </div>
                      <div className="grid gap-2 sm:grid-cols-2">
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          className="border-white/10 bg-white/[0.04]"
                          onClick={() => saveConversationMemory()}
                          disabled={acting || submitting || !conversationId || workspaceLockedByAnotherAdmin}
                        >
                          Workspace hafizasini kaydet
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          className="border-white/10 bg-white/[0.04]"
                          onClick={() => saveConversationMemory("handoff_ready")}
                          disabled={acting || submitting || !conversationId || workspaceLockedByAnotherAdmin}
                        >
                          Handoff hazir
                        </Button>
                      </div>
                    </div>
                  </div>
                ) : null}
              </CardContent>
            </Card>

            <Card className="atlas-workbench-panel rounded-[1.65rem]">
              <CardHeader>
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <CardTitle>Tool Health</CardTitle>
                    <CardDescription className="text-slate-400">
                      Ajan sadece saglikli toollari secsin. Registry bu panelden dogrulanir.
                    </CardDescription>
                  </div>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="border-white/10 bg-white/[0.04]"
                    onClick={() => {
                      startRegistryTransition(async () => {
                        try {
                          await verifyRegistrySummary();
                          toast.success("Tool registry saglik kontrolu guncellendi.");
                        } catch (error) {
                          toast.error(error instanceof Error ? error.message : "Tool health dogrulanamadi.");
                        }
                      });
                    }}
                    disabled={verifyingRegistry}
                  >
                    {verifyingRegistry ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ShieldCheck className="mr-2 h-4 w-4" />}
                    Dogrula
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="outline" className="border-white/10 text-slate-300">
                    {registrySummary?.total ?? 0} tool
                  </Badge>
                  <Badge variant="outline" className="border-emerald-400/20 bg-emerald-500/10 text-emerald-100">
                    {registrySummary?.selectable ?? 0} selectable
                  </Badge>
                  <Badge variant="outline" className="border-rose-400/20 bg-rose-500/10 text-rose-100">
                    {registrySummary?.pruned ?? 0} pruned
                  </Badge>
                  <Badge variant="default">
                    {registrySummary?.healthy ?? 0} healthy
                  </Badge>
                  <Badge variant="secondary">
                    {registrySummary?.unknown ?? 0} unknown
                  </Badge>
                  <Badge variant="outline" className="border-amber-400/20 bg-amber-500/10 text-amber-100">
                    {registrySummary?.degraded ?? 0} degraded
                  </Badge>
                  <Badge variant="destructive">
                    {registrySummary?.unhealthy ?? 0} unhealthy
                  </Badge>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="rounded-2xl border border-white/10 bg-slate-950/35 px-3 py-3">
                    <div className="atlas-kicker">Read only</div>
                    <div className="mt-2 text-xl font-semibold">{registrySummary?.readOnly ?? 0}</div>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-slate-950/35 px-3 py-3">
                    <div className="atlas-kicker">Browser lane</div>
                    <div className="mt-2 text-xl font-semibold">{registrySummary?.browserTools ?? 0}</div>
                  </div>
                </div>

                {prunedTools.length > 0 ? (
                  <div className="rounded-2xl border border-rose-400/20 bg-rose-500/10 px-4 py-4">
                    <div className="atlas-kicker text-rose-100">Pruned tools</div>
                    <div className="mt-2 space-y-2">
                      {prunedTools.map((tool) => (
                        <div key={tool.id} className="rounded-xl border border-white/10 bg-slate-950/45 px-3 py-3">
                          <div className="flex flex-wrap items-center gap-2">
                            <div className="text-sm font-medium text-slate-100">{tool.name}</div>
                            <Badge variant="outline" className="border-white/10 text-slate-300">
                              {tool.source}
                            </Badge>
                            <Badge variant="outline" className="border-white/10 text-slate-300">
                              {tool.healthStatus}
                            </Badge>
                          </div>
                          <div className="mt-2 text-xs leading-5 text-slate-300">
                            {tool.selectabilityReason ?? tool.healthSummary ?? "Bu tool secim disi."}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : null}

                <div className="rounded-2xl border border-white/10 bg-slate-950/40 px-4 py-4 text-sm text-slate-300">
                  {registrySummary?.pruned
                    ? "Prune kapisi aktif. Unknown ve unhealthy tool'lar secim disi; ajan sadece healthy veya degraded tool secer."
                    : "Secim kapisi aktif. Ajan sadece doğrulanmış tool'lari route eder."}
                  <div className="mt-2 text-xs text-slate-500">
                    Son dogrulama: {formatDateTime(registrySummary?.verifiedAt) || "henüz dogrulanmadi"}
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="atlas-workbench-panel rounded-[1.65rem]">
              <CardHeader>
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <CardTitle>Operator Queue</CardTitle>
                    <CardDescription className="text-slate-400">
                      Etkilesimli browser isleri burada bekler. Atlas tek sohbetten devam eder, ama karar sizdedir.
                    </CardDescription>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="border-white/10 text-slate-300">
                      {visibleOperatorJobs.length}
                    </Badge>
                    <Button asChild type="button" size="sm" variant="outline" className="border-white/10 bg-white/[0.04]">
                      <Link href="/admin/ai/operator">Workspace</Link>
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {visibleOperatorJobs.length > 0 ? (
                  visibleOperatorJobs.map((job) => renderOperatorJobCard(job))
                ) : (
                  <div className="rounded-2xl border border-dashed border-white/10 px-4 py-5 text-sm text-slate-500">
                    Bekleyen operator isi yok. Read-only browser lane dogrudan Atlas tarafinda yurutulur; etkileşimli isler burada görünür.
                  </div>
                )}

                <details className="rounded-2xl border border-white/10 bg-slate-950/35 p-3">
                  <summary className="cursor-pointer list-none text-sm font-medium text-slate-100">
                    Allowlist ve paired lane notlari
                  </summary>
                  <div className="mt-3 space-y-2 text-xs leading-6 text-slate-400">
                    {operatorAllowlistRules.map((rule) => (
                      <div key={rule.id} className="rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2.5">
                        <div className="font-medium text-slate-200">{rule.label}</div>
                        <div>{rule.description}</div>
                        <div className="text-slate-500">{rule.pattern}</div>
                      </div>
                    ))}
                  </div>
                </details>
              </CardContent>
            </Card>

            <Card className="atlas-workbench-panel rounded-[1.65rem]">
              <CardHeader>
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <CardTitle>Release Gate</CardTitle>
                    <CardDescription className="text-slate-400">
                      Benchmark ve kalite sinyali. Atlas burada gecmisi degil, cikis kalitesini gecerli kapi olarak kullanir.
                    </CardDescription>
                  </div>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="border-white/10 bg-white/[0.04]"
                    onClick={() => {
                      startBenchmarkMetaTransition(async () => {
                        try {
                          await refreshBenchmarkMeta();
                        } catch (error) {
                          toast.error(error instanceof Error ? error.message : "Release gate yenilenemedi.");
                        }
                      });
                    }}
                    disabled={loadingBenchmarkMeta}
                  >
                    {loadingBenchmarkMeta ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Activity className="mr-2 h-4 w-4" />}
                    Yenile
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant={getBenchmarkGateVariant(benchmarkHealth?.status)}>
                    {benchmarkHealth?.label ?? "degerlendiriliyor"}
                  </Badge>
                  {benchmarkMeta?.provider.provider ? (
                    <Badge variant="outline" className="border-white/10 text-slate-300">
                      {benchmarkMeta.provider.provider}
                    </Badge>
                  ) : null}
                  {benchmarkMeta?.provider.model ? (
                    <Badge variant="outline" className="border-white/10 text-slate-300">
                      {benchmarkMeta.provider.model}
                    </Badge>
                  ) : null}
                </div>

                <div className="rounded-2xl border border-white/10 bg-slate-950/40 px-4 py-4">
                  <div className="text-sm font-medium text-slate-100">
                    {benchmarkHealth?.summary ?? "Benchmark release gate yukleniyor."}
                  </div>
                  {benchmarkHealth?.freshnessHours != null ? (
                    <div className="mt-2 text-xs text-slate-400">
                      Son anchor kosu tazeligi: {benchmarkHealth.freshnessHours.toFixed(1)} saat
                    </div>
                  ) : null}
                </div>

                {benchmarkHealth?.reasons?.length ? (
                  <div className="space-y-2">
                    {benchmarkHealth.reasons.slice(0, 3).map((reason) => (
                      <div key={reason} className="rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2.5 text-xs leading-5 text-slate-400">
                        {reason}
                      </div>
                    ))}
                  </div>
                ) : null}

                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="rounded-2xl border border-white/10 bg-slate-950/35 px-3 py-3">
                    <div className="atlas-kicker">Ready suites</div>
                    <div className="mt-2 text-xl font-semibold">{readySuites.length}</div>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-slate-950/35 px-3 py-3">
                    <div className="atlas-kicker">Needs config</div>
                    <div className="mt-2 text-xl font-semibold">{pendingSuites.length}</div>
                  </div>
                </div>
              </CardContent>
            </Card>
        </aside>
      </div>

    </div>
  );
}
