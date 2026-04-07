"use client";

import Link from "next/link";
import { useI18n } from "@/i18n/provider";
import type { CustomerWorkstreamViewModel } from "@/lib/customer-workspace/types";
import { PortalPageHero } from "./portal-page-hero";
import {
  AtlasActionDock,
  AtlasInsightCard,
  AtlasSectionPanel,
  AtlasStackGrid,
} from "@/components/portal/atlas-widget-kit";

export function ObserverWorkstreamContent({ workstream }: { workstream: CustomerWorkstreamViewModel }) {
  const { t } = useI18n();

  return (
    <div className="space-y-6">
      <PortalPageHero
        eyebrow={workstream.shortLabel}
        title={workstream.title}
        description={workstream.description}
        surfaceVariant="secondary"
        badges={[t(`workspace.statuses.${workstream.status}`)]}
        primaryAction={{
          id: `observer:${workstream.key}:requests`,
          label: t("portal.observer.openRequests"),
          href: "/panel/requests",
          description: t("portal.observer.openRequestsDescription"),
          kind: "open_support",
        }}
        secondaryAction={{
          id: `observer:${workstream.key}:services`,
          label: t("portal.nav.services"),
          href: "/panel/services",
          description: t("portal.observer.openServicesDescription"),
          kind: "open_services",
          emphasis: "secondary",
        }}
      />

      <div className="grid gap-4 xl:grid-cols-[1fr_1fr]">
        <AtlasInsightCard
          title={t("portal.observer.atlasAreaTitle")}
          description={t("portal.observer.atlasAreaDescription")}
          tone="cobalt"
        >
          <div className="space-y-3">
            <p className="text-sm leading-6 text-slate-300/82">{workstream.adminAction}</p>
            {workstream.latestOutput ? (
              <div className="rounded-2xl border border-white/8 bg-background/45 p-4 text-sm leading-6 text-muted-foreground">
                {t("portal.observer.latestOutput")}: {workstream.latestOutput}
              </div>
            ) : null}
          </div>
        </AtlasInsightCard>

        <AtlasInsightCard
          title={t("portal.observer.customerAreaTitle")}
          description={t("portal.observer.customerAreaDescription")}
          tone="primary"
        >
          <div className="space-y-3">
            <p className="text-sm leading-6 text-slate-300/82">{workstream.customerAction}</p>
            <div className="rounded-2xl border border-white/8 bg-background/45 p-4 text-sm leading-6 text-muted-foreground">
              {t("portal.observer.nextStep")}: {workstream.nextStep}
            </div>
            {workstream.blockerReason ? (
              <div className="rounded-2xl border border-amber-500/20 bg-amber-500/10 p-4 text-sm leading-6 text-amber-200">
                {t("portal.observer.blocker")}: {workstream.blockerReason}
              </div>
            ) : null}
            <AtlasActionDock
              primaryAction={{ label: t("portal.observer.openRequests"), href: "/panel/requests" }}
              secondaryAction={{ label: t("portal.nav.services"), href: "/panel/services", variant: "outline" }}
            />
          </div>
        </AtlasInsightCard>
      </div>

      <AtlasSectionPanel
        eyebrow={workstream.shortLabel}
        title={t("portal.observer.nextStep")}
        description={workstream.nextStep}
        badge={t(`workspace.statuses.${workstream.status}`)}
      >
        <AtlasStackGrid columns="two">
          <div className="rounded-[1.15rem] border border-white/8 bg-black/20 p-4 text-sm leading-6 text-slate-300/82">
            {workstream.description}
          </div>
          <div className="rounded-[1.15rem] border border-white/8 bg-black/20 p-4 text-sm leading-6 text-slate-300/82">
            <Link className="text-primary hover:underline" href={workstream.detailHref}>
              {t("portal.observer.openRequests")}
            </Link>
          </div>
        </AtlasStackGrid>
      </AtlasSectionPanel>
    </div>
  );
}
