"use client";

import Link from "next/link";
import { AlertTriangle, Bot, Loader2, MoonStar, Radar, Sparkles, Wrench } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { AtlasJarvisDashboard } from "@/lib/jarvis";

type JarvisObserverPanelProps = {
  dashboard: AtlasJarvisDashboard | null;
  loading?: boolean;
  runningObserver?: boolean;
  generatingBrief?: boolean;
  preparingProposalId?: string | null;
  rejectingProposalId?: string | null;
  onRunObserver: () => void;
  onRefreshBrief: () => void;
  onPrepareProposal: (proposalId: string) => void;
  onRejectProposal: (proposalId: string) => void;
};

function severityStyles(severity: string) {
  if (severity === "p0") {
    return "border-rose-400/20 bg-rose-500/10 text-rose-100";
  }
  if (severity === "p1") {
    return "border-amber-400/20 bg-amber-500/10 text-amber-100";
  }
  return "border-sky-400/20 bg-sky-500/10 text-sky-100";
}

function getNavigableRoute(route: string) {
  if (route.includes("[")) {
    const dynamicIndex = route.indexOf("/[");
    if (dynamicIndex > 0) {
      return route.slice(0, dynamicIndex);
    }

    return "/admin/dashboard";
  }

  return route.split("#")[0] || route;
}

function formatJarvisTimestamp(value?: string | null) {
  if (!value) {
    return null;
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return date.toLocaleString("tr-TR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function JarvisObserverPanel({
  dashboard,
  loading = false,
  runningObserver = false,
  generatingBrief = false,
  preparingProposalId = null,
  rejectingProposalId = null,
  onRunObserver,
  onRefreshBrief,
  onPrepareProposal,
  onRejectProposal,
}: JarvisObserverPanelProps) {
  const latestBrief = dashboard?.latestBrief ?? null;
  const findings = (dashboard?.activeFindings ?? []).filter(
    (finding) => finding.status === "observed" || finding.status === "triaged",
  );
  const proposals = dashboard?.proposals ?? [];
  const latestRun = dashboard?.recentRuns[0] ?? null;
  const latestCompletedRun = dashboard?.recentRuns.find((run) => run.status === "completed") ?? null;
  const activeSweep = runningObserver || latestRun?.status === "running";

  return (
    <Card className="atlas-workbench-panel rounded-[1.65rem]">
      <CardHeader>
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <CardTitle>Jarvis Observer</CardTitle>
              <Badge className="border-0 bg-sky-500/15 text-sky-100">
                {dashboard?.provider.hqttEnabled ? "HQTT brain" : "fallback brain"}
              </Badge>
            </div>
            <CardDescription className="text-slate-400">
              Atlas siz yokken journey tarar, issue queue üretir ve sabah briefing bırakır.
            </CardDescription>
          </div>
          <div className="flex gap-2">
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="border-white/10 bg-white/[0.04]"
              onClick={onRefreshBrief}
              disabled={loading || generatingBrief}
            >
              {generatingBrief ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <MoonStar className="mr-2 h-4 w-4" />}
              Brief
            </Button>
            <Button
              type="button"
              size="sm"
              className="rounded-2xl"
              onClick={onRunObserver}
              disabled={loading || runningObserver}
            >
              {runningObserver ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Radar className="mr-2 h-4 w-4" />}
              Taramayi Calistir
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-4">
          <div className="rounded-2xl border border-white/10 bg-slate-950/35 px-3 py-3">
            <div className="atlas-kicker">Surfaces</div>
            <div className="mt-2 text-xl font-semibold">{dashboard?.surfaces.length ?? 0}</div>
          </div>
          <div className="rounded-2xl border border-white/10 bg-slate-950/35 px-3 py-3">
            <div className="atlas-kicker">Open findings</div>
            <div className="mt-2 text-xl font-semibold">{findings.length}</div>
          </div>
          <div className="rounded-2xl border border-white/10 bg-slate-950/35 px-3 py-3">
            <div className="atlas-kicker">Autofix drafts</div>
            <div className="mt-2 text-xl font-semibold">{proposals.length}</div>
          </div>
          <div className="rounded-2xl border border-white/10 bg-slate-950/35 px-3 py-3">
            <div className="atlas-kicker">Lane</div>
            <div className="mt-2 text-sm font-semibold uppercase tracking-[0.18em] text-slate-200">
              {dashboard?.provider.lane ?? "loading"}
            </div>
          </div>
        </div>

        {latestBrief ? (
          <div className="rounded-[1.45rem] border border-sky-400/15 bg-sky-500/10 p-4">
            <div className="flex items-center gap-2 text-sm font-medium text-sky-100">
              <Bot className="h-4 w-4" />
              Sabah briefing
            </div>
            <div className="mt-2 text-base font-semibold text-slate-50">{latestBrief.headline}</div>
            <p className="mt-2 text-sm leading-6 text-slate-300">{latestBrief.summary}</p>
            <div className="mt-3 flex flex-wrap gap-2 text-xs text-slate-300">
              <Badge variant="outline" className="border-white/10 text-slate-300">
                {latestBrief.stats.p0} P0
              </Badge>
              <Badge variant="outline" className="border-white/10 text-slate-300">
                {latestBrief.stats.p1} P1
              </Badge>
              <Badge variant="outline" className="border-white/10 text-slate-300">
                {latestBrief.stats.proposals} proposal
              </Badge>
            </div>
            {latestBrief.proposedActions.length > 0 ? (
              <div className="mt-4 space-y-2">
                {latestBrief.proposedActions.slice(0, 3).map((action) => (
                  <div key={action} className="rounded-xl border border-white/10 bg-slate-950/35 px-3 py-2 text-xs leading-5 text-slate-300">
                    {action}
                  </div>
                ))}
              </div>
            ) : null}
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed border-white/10 px-4 py-5 text-sm text-slate-500">
            Jarvis henüz briefing üretmedi. İlk tarama ile observer queue oluşacak.
          </div>
        )}

        {activeSweep ? (
          <div className="rounded-[1.35rem] border border-emerald-400/15 bg-emerald-500/[0.08] p-4">
            <div className="flex items-center gap-2 text-sm font-medium text-emerald-100">
              <Radar className="h-4 w-4" />
              Aktif observer sweep
            </div>
            <p className="mt-2 text-sm leading-6 text-slate-200/86">
              Jarvis şu anda Atlas yüzeylerini yeniden tarıyor. Bu panel otomatik yenilenir; brief ve finding queue tamamlandıkça güncellenir.
            </p>
            {latestRun?.id ? (
              <div className="mt-2 text-xs text-emerald-100/80">{latestRun.id}</div>
            ) : null}
            {latestRun?.summary ? (
              <div className="mt-3 rounded-xl border border-emerald-400/15 bg-slate-950/30 px-3 py-2 text-xs leading-5 text-emerald-50/90">
                {latestRun.summary}
              </div>
            ) : null}
          </div>
        ) : null}

        {!activeSweep && latestCompletedRun ? (
          <div className="rounded-[1.2rem] border border-white/10 bg-slate-950/35 px-4 py-3 text-sm text-slate-300">
            Son tamamlanan sweep:{" "}
            <span className="font-medium text-slate-100">
              {formatJarvisTimestamp(latestCompletedRun.completedAt ?? latestCompletedRun.startedAt) ?? latestCompletedRun.id}
            </span>
          </div>
        ) : null}

        <div className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm font-medium text-slate-200">
              <AlertTriangle className="h-4 w-4 text-amber-300" />
              Kritik bulgular
            </div>
            {findings.slice(0, 4).map((finding) => (
              <div key={finding.id} className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="outline" className={severityStyles(finding.severity)}>
                    {finding.severity.toUpperCase()}
                  </Badge>
                  <Badge variant="outline" className="border-white/10 text-slate-300">
                    {finding.route}
                  </Badge>
                  <Badge variant="outline" className="border-white/10 text-slate-300">
                    {finding.kind}
                  </Badge>
                </div>
                <div className="mt-2 text-sm font-medium text-slate-100">{finding.title}</div>
                <div className="mt-1 text-xs leading-5 text-slate-400">{finding.summary}</div>
                <div className="mt-3">
                  <Button asChild type="button" size="sm" variant="outline" className="border-white/10 bg-white/[0.04]">
                    <Link href={getNavigableRoute(finding.route)}>Hedefi ac</Link>
                  </Button>
                </div>
              </div>
            ))}
            {findings.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-white/10 px-4 py-5 text-sm text-slate-500">
                Açık Jarvis finding görünmüyor.
              </div>
            ) : null}
          </div>

          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm font-medium text-slate-200">
              <Wrench className="h-4 w-4 text-emerald-300" />
              Low-risk auto-fix taslakları
            </div>
            {proposals.slice(0, 3).map((proposal) => (
              <div key={proposal.id} className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="outline" className="border-emerald-400/20 bg-emerald-500/10 text-emerald-100">
                    {proposal.riskLevel}
                  </Badge>
                  <Badge variant="outline" className="border-white/10 text-slate-300">
                    {proposal.status}
                  </Badge>
                  <Badge variant="outline" className="border-white/10 text-slate-300">
                    {proposal.branchName}
                  </Badge>
                </div>
                <div className="mt-2 text-sm font-medium text-slate-100">{proposal.summary}</div>
                <div className="mt-1 text-xs leading-5 text-slate-400">
                  {proposal.targetFiles.slice(0, 2).join(" • ") || "Hedef dosya henüz çıkarılmadı."}
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="border-white/10 bg-white/[0.04]"
                    onClick={() => onPrepareProposal(proposal.id)}
                    disabled={
                      proposal.status !== "draft" ||
                      loading ||
                      preparingProposalId === proposal.id ||
                      rejectingProposalId === proposal.id
                    }
                  >
                    {preparingProposalId === proposal.id ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : proposal.status === "prepared" ? (
                      <Sparkles className="mr-2 h-4 w-4" />
                    ) : (
                      <Wrench className="mr-2 h-4 w-4" />
                    )}
                    {proposal.status === "prepared" ? "Worktree hazir" : "Branch hazirla"}
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    className="text-slate-300 hover:text-white"
                    onClick={() => onRejectProposal(proposal.id)}
                    disabled={
                      proposal.status === "rejected" ||
                      loading ||
                      preparingProposalId === proposal.id ||
                      rejectingProposalId === proposal.id
                    }
                  >
                    {rejectingProposalId === proposal.id ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <AlertTriangle className="mr-2 h-4 w-4" />
                    )}
                    Reddet
                  </Button>
                </div>
                {proposal.status === "prepared" ? (
                  <div className="mt-2 text-[11px] leading-5 text-emerald-200/80">
                    Worktree: {proposal.worktreePath}
                  </div>
                ) : null}
              </div>
            ))}
            {latestRun ? (
              <div className="rounded-2xl border border-white/10 bg-slate-950/40 px-4 py-4">
                <div className="flex items-center gap-2 text-sm font-medium text-slate-200">
                  <Sparkles className="h-4 w-4 text-sky-300" />
                  Son tarama
                </div>
                <div className="mt-2 text-sm text-slate-300">{latestRun.summary}</div>
              </div>
            ) : null}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
