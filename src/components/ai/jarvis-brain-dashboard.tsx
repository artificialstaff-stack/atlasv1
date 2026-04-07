"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Brain,
  Activity,
  AlertTriangle,
  CheckCircle,
  Play,
  Square,
  RefreshCw,
  Zap,
  Shield,
  Eye,
  MemoryStick,
  TrendingUp,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

// ──────────────────────────────────────
// Types (mirror brain-types for client)
// ──────────────────────────────────────

interface HealthSnapshot {
  status: string;
  uptimeSeconds: number;
  hqttConnected: boolean;
  hqttStubMode?: boolean;
  hqttLatencyMs: number | null;
  activeProvider: string;
  fallbackProvider: string;
  tools: Array<{ id: string; name: string; status: string; successRate: number; avgLatencyMs: number }>;
  lastObserverRun: string | null;
  memoryStats: { threadMessages: number; userFacts: number; episodes: number; procedures: number };
}

interface SelfReport {
  generatedAt: string;
  health: HealthSnapshot;
  activeCapabilities: string[];
  disabledTools: string[];
  recentFailures: Array<{ runId: string; error: string; timestamp: string }>;
  recurringFailureMotifs: Array<{ pattern: string; count: number; lastSeen: string }>;
  confidenceLevel: number;
  pendingRepairs: Array<{ id: string; description: string; severity: string; proposedAt: string }>;
  learnedNotes: string[];
  brainGrowth: Record<string, number> | null;
  physiology: Record<string, number> | null;
  residency: Record<string, number> | null;
}

interface GapReport {
  generatedAt: string;
  unauditedSurfaces: string[];
  failingTests: Array<{ id: string; title: string; severity: string; description: string }>;
  degradedTools: Array<{ id: string; title: string; severity: string; description: string }>;
  performanceRegressions: Array<{ id: string; title: string; severity: string; description: string }>;
  codeQualityIssues: Array<{ id: string; title: string; severity: string; description: string }>;
  accessibilityIssues: Array<{ id: string; title: string; severity: string; description: string }>;
  securityFindings: Array<{ id: string; title: string; severity: string; description: string }>;
  suggestedImprovements: Array<{ id: string; title: string; severity: string; description: string }>;
  totalGapCount: number;
}

interface LoopState {
  running: boolean;
  currentTask: string | null;
  lastCycleAt: string | null;
  cycleCount: number;
  queuedTasks: string[];
  idleSince: string | null;
  findingsThisCycle: number;
}

// ──────────────────────────────────────
// Fetch helpers
// ──────────────────────────────────────

async function fetchJson<T>(url: string, init?: RequestInit): Promise<T | null> {
  try {
    const res = await fetch(url, init);
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

// ──────────────────────────────────────
// Sub-components
// ──────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { variant: "default" | "secondary" | "destructive" | "outline"; label: string }> = {
    healthy: { variant: "default", label: "Healthy" },
    degraded: { variant: "secondary", label: "Degraded" },
    unhealthy: { variant: "destructive", label: "Unhealthy" },
    unknown: { variant: "outline", label: "Unknown" },
  };
  const cfg = map[status] ?? map.unknown!;
  return <Badge variant={cfg.variant}>{cfg.label}</Badge>;
}

function SeverityBadge({ severity }: { severity: string }) {
  const map: Record<string, "destructive" | "secondary" | "outline" | "default"> = {
    critical: "destructive",
    high: "destructive",
    medium: "secondary",
    low: "outline",
    info: "default",
  };
  return <Badge variant={map[severity] ?? "outline"}>{severity}</Badge>;
}

function formatUptime(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

function GapSection({
  title,
  icon,
  items,
}: {
  title: string;
  icon: React.ReactNode;
  items: Array<{ id: string; title: string; severity: string; description: string }>;
}) {
  if (items.length === 0) return null;
  return (
    <div className="space-y-2">
      <h4 className="flex items-center gap-2 text-sm font-medium text-white/70">
        {icon} {title}
        <Badge variant="outline">{items.length}</Badge>
      </h4>
      <div className="space-y-1">
        {items.map((item) => (
          <div key={item.id} className="flex items-start gap-2 rounded-md bg-white/5 px-3 py-2 text-sm">
            <SeverityBadge severity={item.severity} />
            <div>
              <p className="font-medium text-white/90">{item.title}</p>
              <p className="text-white/50">{item.description}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ──────────────────────────────────────
// Main Dashboard
// ──────────────────────────────────────

export function JarvisBrainDashboard() {
  const [selfReport, setSelfReport] = useState<SelfReport | null>(null);
  const [gapReport, setGapReport] = useState<GapReport | null>(null);
  const [loopState, setLoopState] = useState<LoopState | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    const [sr, gr, ls] = await Promise.all([
      fetchJson<{ report: SelfReport }>("/api/admin/copilot/jarvis/brain/self-report"),
      fetchJson<{ report: GapReport }>("/api/admin/copilot/jarvis/brain/gap-report"),
      fetchJson<{ state: LoopState }>("/api/admin/copilot/jarvis/brain/loop"),
    ]);
    setSelfReport(sr?.report ?? null);
    setGapReport(gr?.report ?? null);
    setLoopState(ls?.state ?? null);
    setLoading(false);
  }, []);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      void refresh();
    }, 0);
    const interval = setInterval(refresh, 30_000);
    return () => {
      window.clearTimeout(timeout);
      clearInterval(interval);
    };
  }, [refresh]);

  const toggleLoop = async (action: "start" | "stop") => {
    await fetchJson("/api/admin/copilot/jarvis/brain/loop", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action }),
    });
    await refresh();
  };

  const health = selfReport?.health;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Brain className="h-7 w-7 text-purple-400" />
          <div>
            <h2 className="text-xl font-bold text-white">Jarvis Living Brain</h2>
            <p className="text-sm text-white/50">Self-aware AI system dashboard</p>
          </div>
        </div>
        <button
          onClick={refresh}
          disabled={loading}
          className="flex items-center gap-2 rounded-lg bg-white/10 px-3 py-1.5 text-sm text-white/70 transition hover:bg-white/20 disabled:opacity-50"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </button>
      </div>

      {/* Health & Status Row */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        <Card className="border-white/10 bg-white/5">
          <CardHeader className="pb-2">
            <CardDescription className="text-white/50">System Status</CardDescription>
          </CardHeader>
          <CardContent>
            {health ? <StatusBadge status={health.status} /> : <Badge variant="outline">Loading...</Badge>}
          </CardContent>
        </Card>

        <Card className="border-white/10 bg-white/5">
          <CardHeader className="pb-2">
            <CardDescription className="text-white/50">HQTT Brain</CardDescription>
          </CardHeader>
          <CardContent className="flex items-center gap-2">
            <div className={`h-2 w-2 rounded-full ${health?.hqttConnected ? (health.hqttStubMode ? "bg-yellow-400" : "bg-green-400") : "bg-red-400"}`} />
            <span className="text-sm text-white/70">
              {health?.hqttConnected
                ? health.hqttStubMode
                  ? "Stub Mode (no real HQTT)"
                  : `Connected (${health.hqttLatencyMs}ms)`
                : "Disconnected"}
            </span>
          </CardContent>
        </Card>

        <Card className="border-white/10 bg-white/5">
          <CardHeader className="pb-2">
            <CardDescription className="text-white/50">Confidence</CardDescription>
          </CardHeader>
          <CardContent>
            <span className="text-lg font-bold text-white">
              {selfReport ? `${(selfReport.confidenceLevel * 100).toFixed(0)}%` : "—"}
            </span>
          </CardContent>
        </Card>

        <Card className="border-white/10 bg-white/5">
          <CardHeader className="pb-2">
            <CardDescription className="text-white/50">Uptime</CardDescription>
          </CardHeader>
          <CardContent>
            <span className="text-sm text-white/70">
              {health ? formatUptime(health.uptimeSeconds) : "—"}
            </span>
          </CardContent>
        </Card>
      </div>

      {/* Background Loop */}
      <Card className="border-white/10 bg-white/5">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2 text-white">
                <Activity className="h-5 w-5 text-blue-400" />
                Background Brain Loop
              </CardTitle>
              <CardDescription className="text-white/50">
                Autonomous scanning & analysis cycle
              </CardDescription>
            </div>
            {loopState?.running ? (
              <button
                onClick={() => toggleLoop("stop")}
                className="flex items-center gap-2 rounded-lg bg-red-500/20 px-3 py-1.5 text-sm text-red-300 transition hover:bg-red-500/30"
              >
                <Square className="h-4 w-4" /> Stop
              </button>
            ) : (
              <button
                onClick={() => toggleLoop("start")}
                className="flex items-center gap-2 rounded-lg bg-green-500/20 px-3 py-1.5 text-sm text-green-300 transition hover:bg-green-500/30"
              >
                <Play className="h-4 w-4" /> Start
              </button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {loopState ? (
            <div className="grid grid-cols-2 gap-4 text-sm md:grid-cols-4">
              <div>
                <p className="text-white/50">Status</p>
                <p className="font-medium text-white">{loopState.running ? "Running" : "Stopped"}</p>
              </div>
              <div>
                <p className="text-white/50">Current Task</p>
                <p className="font-medium text-white">{loopState.currentTask ?? "Idle"}</p>
              </div>
              <div>
                <p className="text-white/50">Cycles</p>
                <p className="font-medium text-white">{loopState.cycleCount}</p>
              </div>
              <div>
                <p className="text-white/50">Findings This Cycle</p>
                <p className="font-medium text-white">{loopState.findingsThisCycle}</p>
              </div>
            </div>
          ) : (
            <p className="text-sm text-white/50">Loading loop state...</p>
          )}
        </CardContent>
      </Card>

      {/* Memory Stats */}
      {health?.memoryStats && (
        <Card className="border-white/10 bg-white/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-white">
              <MemoryStick className="h-5 w-5 text-cyan-400" />
              Memory Layers
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4 text-sm md:grid-cols-4">
              <div>
                <p className="text-white/50">Thread Messages</p>
                <p className="text-lg font-bold text-white">{health.memoryStats.threadMessages}</p>
              </div>
              <div>
                <p className="text-white/50">User Facts</p>
                <p className="text-lg font-bold text-white">{health.memoryStats.userFacts}</p>
              </div>
              <div>
                <p className="text-white/50">Episodes</p>
                <p className="text-lg font-bold text-white">{health.memoryStats.episodes}</p>
              </div>
              <div>
                <p className="text-white/50">Procedures</p>
                <p className="text-lg font-bold text-white">{health.memoryStats.procedures}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Brain Growth + Physiology (HQTT) */}
      {selfReport?.brainGrowth && (
        <Card className="border-white/10 bg-white/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-white">
              <TrendingUp className="h-5 w-5 text-emerald-400" />
              Brain Growth (HQTT)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-3 text-sm md:grid-cols-5">
              {Object.entries(selfReport.brainGrowth).map(([key, value]) => (
                <div key={key}>
                  <p className="text-white/50">{key.replace(/([A-Z])/g, " $1").trim()}</p>
                  <p className="font-bold text-white">{value}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Physiology Signals */}
      {selfReport?.physiology && Object.keys(selfReport.physiology).length > 0 && (
        <Card className="border-white/10 bg-white/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-white">
              <Zap className="h-5 w-5 text-yellow-400" />
              HQTT Physiology Signals
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-3 text-sm md:grid-cols-5">
              {Object.entries(selfReport.physiology).map(([key, value]) => (
                <div key={key}>
                  <p className="text-white/50">{key.replace(/_/g, " ")}</p>
                  <div className="mt-1 h-2 w-full rounded-full bg-white/10">
                    <div
                      className="h-2 rounded-full bg-yellow-400/70"
                      style={{ width: `${Math.min((value as number) * 100, 100)}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Gap Report */}
      {gapReport && (
        <Card className="border-white/10 bg-white/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-white">
              <AlertTriangle className="h-5 w-5 text-orange-400" />
              Gap Report
              <Badge variant="secondary">{gapReport.totalGapCount} gaps</Badge>
            </CardTitle>
            <CardDescription className="text-white/50">
              {gapReport.unauditedSurfaces.length > 0 && (
                <span>{gapReport.unauditedSurfaces.length} unaudited surfaces · </span>
              )}
              Generated {new Date(gapReport.generatedAt).toLocaleString()}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <GapSection title="Failing Tests" icon={<AlertTriangle className="h-4 w-4 text-red-400" />} items={gapReport.failingTests} />
            <GapSection title="Degraded Tools" icon={<Activity className="h-4 w-4 text-orange-400" />} items={gapReport.degradedTools} />
            <GapSection title="Performance" icon={<TrendingUp className="h-4 w-4 text-yellow-400" />} items={gapReport.performanceRegressions} />
            <GapSection title="Code Quality" icon={<Eye className="h-4 w-4 text-blue-400" />} items={gapReport.codeQualityIssues} />
            <GapSection title="Accessibility" icon={<CheckCircle className="h-4 w-4 text-green-400" />} items={gapReport.accessibilityIssues} />
            <GapSection title="Security" icon={<Shield className="h-4 w-4 text-red-400" />} items={gapReport.securityFindings} />
            <GapSection title="Suggestions" icon={<Zap className="h-4 w-4 text-purple-400" />} items={gapReport.suggestedImprovements} />
            {gapReport.totalGapCount === 0 && (
              <p className="text-center text-sm text-white/50">
                {health?.hqttStubMode
                  ? "No gaps detected — HQTT is in stub mode, real audit data unavailable."
                  : "No gaps detected. System looks healthy."}
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Recent Failures */}
      {selfReport && selfReport.recentFailures.length > 0 && (
        <Card className="border-white/10 bg-white/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-white">
              <AlertTriangle className="h-5 w-5 text-red-400" />
              Recent Failures
              <Badge variant="destructive">{selfReport.recentFailures.length}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {selfReport.recentFailures.slice(0, 10).map((f, i) => (
                <div key={i} className="rounded-md bg-white/5 px-3 py-2 text-sm">
                  <p className="text-white/90">{f.error}</p>
                  <p className="text-white/40">{new Date(f.timestamp).toLocaleString()} · {f.runId}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Failure Motifs */}
      {selfReport && selfReport.recurringFailureMotifs.length > 0 && (
        <Card className="border-white/10 bg-white/5">
          <CardHeader>
            <CardTitle className="text-white">Recurring Failure Motifs</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {selfReport.recurringFailureMotifs.map((m, i) => (
                <div key={i} className="flex items-center justify-between rounded-md bg-white/5 px-3 py-2 text-sm">
                  <p className="text-white/80">{m.pattern}</p>
                  <Badge variant="secondary">×{m.count}</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Pending Repairs */}
      {selfReport && selfReport.pendingRepairs.length > 0 && (
        <Card className="border-white/10 bg-white/5">
          <CardHeader>
            <CardTitle className="text-white">Pending Repairs</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {selfReport.pendingRepairs.map((r) => (
                <div key={r.id} className="flex items-start gap-2 rounded-md bg-white/5 px-3 py-2 text-sm">
                  <SeverityBadge severity={r.severity} />
                  <div>
                    <p className="text-white/90">{r.description}</p>
                    <p className="text-white/40">{new Date(r.proposedAt).toLocaleString()}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
