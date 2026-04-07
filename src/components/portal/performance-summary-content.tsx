"use client";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useMemo } from "react";
import { PortalPageHero } from "@/components/portal/portal-page-hero";
import type { CustomerWorkspaceViewModel } from "@/lib/customer-workspace/types";
import { useClientGuidance } from "@/app/(client)/panel/_components/client-guidance-provider";

export function PerformanceSummaryContent({
  workspace,
  title = "Performance",
  eyebrow = "Executive Summary",
  description = "Detay operator raporu yerine Atlas ekibinin yorumladigi karar-verici seviyesinde performans ozeti burada sunulur.",
}: {
  workspace: CustomerWorkspaceViewModel;
  title?: string;
  eyebrow?: string;
  description?: string;
}) {
  const performance = workspace.performance;

  useClientGuidance(
    useMemo(
      () => ({
        focusLabel: title === "Raporlar" ? "Yonetim raporu" : "Executive performans ozeti",
        summary: "Detay operator paneli yerine Atlas tarafinin yorumladigi ozet performans sinyallerini goruyorsunuz.",
        metrics: [
          { label: "Siparis", value: `${performance.ordersLast30Days}` },
          { label: "Gelir", value: `$${Math.round(performance.revenueLast30Days)}` },
          { label: "Canli kanal", value: `${performance.liveMarketplaceCount}` },
        ],
      }),
      [performance.liveMarketplaceCount, performance.ordersLast30Days, performance.revenueLast30Days, title],
    ),
  );

  return (
    <div className="space-y-6">
      <PortalPageHero
        eyebrow={eyebrow}
        title={title}
        description={description}
        surfaceVariant="secondary"
        badges={["Executive summary", workspace.launchStageLabel]}
        metrics={[
          { label: "Siparis", value: `${performance.ordersLast30Days}` },
          { label: "Gelir", value: `$${Math.round(performance.revenueLast30Days)}` },
          { label: "Kampanya", value: `${performance.activeCampaignCount}` },
        ]}
        primaryAction={{
          id: "performance:reports",
          label: "Raporlar",
          href: "/panel/reports",
          description: "Yonetim ozetine geri don.",
          kind: "open_reports",
        }}
        secondaryAction={{
          id: "performance:services",
          label: "Hizmetlerim",
          href: "/panel/services",
          description: "Performansin bagli oldugu hizmet akisini ac.",
          kind: "open_services",
          emphasis: "secondary",
        }}
      >
        <div className="rounded-2xl border border-white/8 bg-background/35 px-4 py-3 text-sm leading-6 text-slate-200/90">
          {performance.summary}
        </div>
      </PortalPageHero>

      <div className="rounded-[1.7rem] border border-white/8 bg-card/85 p-6">
        <h2 className="text-2xl font-semibold tracking-tight">{performance.headline}</h2>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">{performance.summary}</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card className="rounded-[1.4rem] border-white/8 bg-card/85">
          <CardHeader><CardTitle className="text-sm">Sipariş</CardTitle></CardHeader>
          <CardContent><p className="text-3xl font-semibold">{performance.ordersLast30Days}</p></CardContent>
        </Card>
        <Card className="rounded-[1.4rem] border-white/8 bg-card/85">
          <CardHeader><CardTitle className="text-sm">Gelir</CardTitle></CardHeader>
          <CardContent><p className="text-3xl font-semibold">${Math.round(performance.revenueLast30Days)}</p></CardContent>
        </Card>
        <Card className="rounded-[1.4rem] border-white/8 bg-card/85">
          <CardHeader><CardTitle className="text-sm">Aktif kampanya</CardTitle></CardHeader>
          <CardContent><p className="text-3xl font-semibold">{performance.activeCampaignCount}</p></CardContent>
        </Card>
        <Card className="rounded-[1.4rem] border-white/8 bg-card/85">
          <CardHeader><CardTitle className="text-sm">Canlı kanal</CardTitle></CardHeader>
          <CardContent><p className="text-3xl font-semibold">{performance.liveMarketplaceCount}</p></CardContent>
        </Card>
      </div>

      <div className="grid gap-4 xl:grid-cols-[1fr_1fr]">
        <Card className="rounded-[1.5rem] border-white/8 bg-card/85">
          <CardHeader>
            <CardTitle>Trend özeti</CardTitle>
            <CardDescription>Atlas ekibinin yorumladığı temel değişim sinyalleri.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="rounded-2xl border border-white/8 bg-background/45 p-4">
              <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">Sipariş değişimi</p>
              <p className="mt-2 text-2xl font-semibold">
                {performance.monthOverMonthOrderDeltaPct === null ? "Yeni veri" : `%${performance.monthOverMonthOrderDeltaPct}`}
              </p>
            </div>
            <div className="rounded-2xl border border-white/8 bg-background/45 p-4">
              <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">Gelir değişimi</p>
              <p className="mt-2 text-2xl font-semibold">
                {performance.monthOverMonthRevenueDeltaPct === null ? "Yeni veri" : `%${performance.monthOverMonthRevenueDeltaPct}`}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-[1.5rem] border-white/8 bg-card/85">
          <CardHeader>
            <CardTitle>Öne çıkan kanallar</CardTitle>
            <CardDescription>Detay panel değil, yönetim özeti.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {performance.topChannels.length > 0 ? (
              performance.topChannels.map((channel) => (
                <div
                  key={channel.label}
                  className="flex items-center justify-between rounded-2xl border border-white/8 bg-background/45 px-4 py-3"
                >
                  <span className="text-sm">{channel.label}</span>
                  <Badge variant="outline">{channel.value}</Badge>
                </div>
              ))
            ) : (
              <div className="rounded-2xl border border-dashed border-white/10 bg-background/35 p-5 text-sm text-muted-foreground">
                Canlı performans verisi oluştuğunda burada özetlenecek.
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
