"use client";

import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/shared/page-header";
import type { CustomerWorkspaceViewModel } from "@/lib/customer-workspace/types";
import { formatDate } from "@/lib/utils";

export function ObserverDashboardContent({ workspace }: { workspace: CustomerWorkspaceViewModel }) {
  const highlightedWorkstreams = workspace.workstreams.slice(0, 4);
  const highlightedDeliverables = workspace.deliverables.slice(0, 3);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Dashboard"
        description="Atlas operasyonunun sizin için yürüttüğü launch planını ve sonraki gerekli adımları buradan izleyin."
      >
        <div className="flex flex-wrap items-center gap-2">
          <Badge className="border-0 bg-primary/15 text-primary">Observer cockpit</Badge>
          <Badge variant="outline">{workspace.launchStageLabel}</Badge>
        </div>
      </PageHeader>

      <div className="rounded-[1.8rem] border border-primary/15 bg-[radial-gradient(circle_at_top_left,rgba(59,130,246,0.18),transparent_38%),rgba(10,15,29,0.94)] p-6 shadow-[0_28px_90px_rgba(2,8,23,0.45)]">
        <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
          <div className="max-w-3xl space-y-3">
            <Badge className="border-0 bg-white/10 text-white/85">Launch to first sale</Badge>
            <div>
              <h2 className="text-[2rem] font-semibold tracking-tight">{workspace.headline}</h2>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">{workspace.summary}</p>
            </div>
            <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
              <span className="rounded-full border border-white/8 bg-background/45 px-3 py-1.5">
                Aktif workstream: {workspace.activeWorkstreamCount}
              </span>
              <span className="rounded-full border border-white/8 bg-background/45 px-3 py-1.5">
                Açık request: {workspace.requestCount}
              </span>
              <span className="rounded-full border border-white/8 bg-background/45 px-3 py-1.5">
                Deliverable: {workspace.deliverableCount}
              </span>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-3 xl:min-w-[440px]">
            <div className="rounded-2xl border border-white/8 bg-background/45 p-4">
              <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">Journey</p>
              <p className="mt-2 text-3xl font-semibold tracking-tight">%{workspace.journey.progressPct}</p>
              <p className="mt-1 text-xs text-muted-foreground">
                {workspace.journey.completedCount}/{workspace.journey.totalCount} adım tamamlandı.
              </p>
            </div>
            <div className="rounded-2xl border border-white/8 bg-background/45 p-4">
              <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">Blocker</p>
              <p className="mt-2 text-3xl font-semibold tracking-tight text-amber-300">
                {workspace.blockedWorkstreamCount}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">Müşteri girdisi bekleyen alanlar.</p>
            </div>
            <div className="rounded-2xl border border-white/8 bg-background/45 p-4">
              <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">Son 30 gün</p>
              <p className="mt-2 text-3xl font-semibold tracking-tight">
                {workspace.performance.ordersLast30Days}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">Sipariş · {workspace.performance.summary}</p>
            </div>
          </div>
        </div>

        <div className="mt-5 flex flex-wrap gap-3">
          {workspace.primaryAction ? (
            <Button asChild size="lg" className="rounded-2xl">
              <Link href={workspace.primaryAction.href}>{workspace.primaryAction.label}</Link>
            </Button>
          ) : null}
          <Button asChild size="lg" variant="outline" className="rounded-2xl">
            <Link href="/panel/process">Launch Journey</Link>
          </Button>
          <Button asChild size="lg" variant="outline" className="rounded-2xl">
            <Link href="/panel/requests">Requests & Forms</Link>
          </Button>
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.25fr_0.75fr]">
        <Card className="rounded-[1.55rem] border-white/8 bg-card/85">
          <CardHeader>
            <CardTitle>Aktif workstream’ler</CardTitle>
            <CardDescription>
              Atlas ekibinin şu an üzerinde çalıştığı launch alanları burada görünür.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3 md:grid-cols-2">
            {highlightedWorkstreams.map((workstream) => (
              <Link
                key={workstream.key}
                href={workstream.detailHref}
                className="rounded-2xl border border-white/8 bg-background/45 p-4 transition hover:border-primary/25"
              >
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium">{workstream.title}</p>
                    <p className="mt-1 text-xs text-muted-foreground">{workstream.description}</p>
                  </div>
                  <Badge variant="outline">{workstream.status}</Badge>
                </div>
                <p className="mt-3 text-xs leading-5 text-muted-foreground">
                  {workstream.blockerReason ?? workstream.nextStep}
                </p>
              </Link>
            ))}
          </CardContent>
        </Card>

        <Card className="rounded-[1.55rem] border-white/8 bg-card/85">
          <CardHeader>
            <CardTitle>Son deliverable’lar</CardTitle>
            <CardDescription>
              Atlas ekibinin sizin için hazırladığı görünür çıktılar.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {highlightedDeliverables.length > 0 ? (
              highlightedDeliverables.map((deliverable) => (
                <div
                  key={deliverable.id}
                  className="rounded-2xl border border-white/8 bg-background/45 p-4"
                >
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-medium">{deliverable.title}</p>
                    <Badge variant="outline">{deliverable.status}</Badge>
                  </div>
                  <p className="mt-2 text-xs leading-5 text-muted-foreground">{deliverable.summary}</p>
                  <p className="mt-3 text-[11px] text-muted-foreground">
                    {formatDate(deliverable.createdAt)}
                  </p>
                </div>
              ))
            ) : (
              <div className="rounded-2xl border border-dashed border-white/10 bg-background/35 p-5 text-sm text-muted-foreground">
                Deliverable oluştukça burada göreceksiniz.
              </div>
            )}
            <Button asChild variant="outline" className="w-full rounded-2xl">
              <Link href="/panel/deliverables">Tüm deliverable’ları aç</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
