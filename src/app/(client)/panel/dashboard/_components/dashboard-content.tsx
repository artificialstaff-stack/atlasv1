"use client";

import { useMemo, useState } from "react";
import {
  AlertTriangle,
  ArrowUpRight,
  CheckCircle2,
  Clock3,
  FileText,
  FolderOpen,
  History,
  Package,
  Sparkles,
  Truck,
  Workflow,
} from "lucide-react";

import { motion } from "framer-motion";

import { CustomerRequestsHubModal } from "@/components/hub/customer-requests-hub-modal";
import {
  AtlasActionCard,
  AtlasHeroBoard,
  AtlasInsightCard,
  AtlasMetricSlab,
  AtlasSectionPanel,
  AtlasTimelineRail,
} from "@/components/portal/atlas-widget-kit";
import { useI18n } from "@/i18n/provider";
import { useClientGuidance } from "../../_components/client-guidance-provider";
import type {
  CustomerHubModalTab,
  CustomerWorkspaceViewModel,
  LaunchJourneyStage,
} from "@/lib/customer-workspace/types";

interface DashboardData {
  totalProducts: number;
  totalStockTR: number;
  totalStockUS: number;
  activeOrders: number;
  totalOrders: number;
  completionPct: number;
  completedTasks: number;
  totalTasks: number;
  recentOrders: { id: string; status: string; platform_order_id?: string | null }[];
  monthlyTrends: { name: string; siparis: number; stok: number }[];
  openSupportRequests: number;
  workspace: CustomerWorkspaceViewModel;
}

function getStageIcon(status: LaunchJourneyStage["status"]) {
  switch (status) {
    case "completed":
      return CheckCircle2;
    case "blocked":
      return AlertTriangle;
    default:
      return Clock3;
  }
}

function getStatusLabel(
  t: (key: string, params?: Record<string, string | number>) => string,
  status: LaunchJourneyStage["status"],
) {
  try {
    return t(`workspace.statuses.${status}`);
  } catch {
    return status;
  }
}

function toCustomerHubTab(tab: string | null | undefined, fallback: CustomerHubModalTab): CustomerHubModalTab {
  if (tab === "actions" || tab === "forms" || tab === "documents" || tab === "history") {
    return tab;
  }

  return fallback;
}

export function DashboardContent({ data }: { data: DashboardData }) {
  const { t } = useI18n();
  const [hubOpen, setHubOpen] = useState(false);
  const [hubTab, setHubTab] = useState<CustomerHubModalTab>(data.workspace.hubStateDefaults.activeTab);
  const launchCopy = useMemo(
    () => ({
      guidanceWaiting: t("portal.dashboardLaunch.guidance.waiting"),
      guidanceFlowing: t("portal.dashboardLaunch.guidance.flowing"),
      guidanceActiveArea: t("portal.dashboardLaunch.guidance.activeArea"),
      heroBadge: t("portal.dashboardLaunch.hero.badge"),
      heroEyebrow: t("portal.dashboardLaunch.hero.eyebrow"),
      heroTitle: t("portal.dashboardLaunch.hero.title", { name: data.workspace.displayName }),
      heroDescription: t("portal.dashboardLaunch.hero.description"),
      heroCenterButton: t("portal.dashboardLaunch.hero.centerButton"),
      waitingKicker: t("portal.dashboardLaunch.cards.waiting.kicker"),
      waitingFallback: t("portal.dashboardLaunch.cards.waiting.fallback"),
      waitingPending: t("portal.dashboardLaunch.cards.waiting.metrics.pendingActions"),
      waitingSupport: t("portal.dashboardLaunch.cards.waiting.metrics.openSupport"),
      waitingForms: t("portal.dashboardLaunch.cards.waiting.metrics.formRecords"),
      waitingOpenActions: t("portal.dashboardLaunch.cards.waiting.primaryOpenActions"),
      waitingViewServices: t("portal.dashboardLaunch.cards.waiting.primaryViewServices"),
      waitingSupportCenter: t("portal.dashboardLaunch.cards.waiting.secondarySupport"),
      atlasKicker: t("portal.dashboardLaunch.cards.atlas.kicker"),
      atlasActive: t("portal.dashboardLaunch.cards.atlas.metrics.activeWorkstream"),
      atlasBlocked: t("portal.dashboardLaunch.cards.atlas.metrics.blockedArea"),
      atlasDeliverables: t("portal.dashboardLaunch.cards.atlas.metrics.visibleDeliverable"),
      atlasDocuments: t("portal.dashboardLaunch.cards.atlas.primaryDocuments"),
      atlasHistory: t("portal.dashboardLaunch.cards.atlas.secondaryHistory"),
      stageTitle: t("portal.dashboardLaunch.stage.title"),
      progressLabel: t("portal.dashboardLaunch.stage.metrics.progress"),
      activeOrdersLabel: t("portal.dashboardLaunch.stage.metrics.activeOrders"),
      productsLabel: t("portal.dashboardLaunch.stage.metrics.products"),
      totalStockLabel: t("portal.dashboardLaunch.stage.metrics.totalStock"),
      nextStepsTitle: t("portal.dashboardLaunch.stage.nextSteps"),
      formsTitle: t("portal.dashboardLaunch.quickLinks.forms.title"),
      formsDescription: t("portal.dashboardLaunch.quickLinks.forms.description"),
      documentsTitle: t("portal.dashboardLaunch.quickLinks.documents.title"),
      documentsDescription: t("portal.dashboardLaunch.quickLinks.documents.description"),
      historyTitle: t("portal.dashboardLaunch.quickLinks.history.title"),
      historyDescription: t("portal.dashboardLaunch.quickLinks.history.description"),
      summaryEyebrow: t("portal.dashboardLaunch.summary.eyebrow"),
      summaryTitle: t("portal.dashboardLaunch.summary.title"),
      summaryButton: t("portal.dashboardLaunch.summary.button"),
      workstreamTitle: t("portal.dashboardLaunch.summary.workstream.title"),
      workstreamDefaultDescription: t("portal.dashboardLaunch.summary.workstream.defaultDescription"),
      deliverableTitle: t("portal.dashboardLaunch.summary.deliverable.title"),
      deliverableDefaultDescription: t("portal.dashboardLaunch.summary.deliverable.defaultDescription"),
      deliverableEmptyValue: t("portal.dashboardLaunch.summary.deliverable.emptyValue"),
      tasksTitle: t("portal.dashboardLaunch.summary.tasks.title"),
      ordersTitle: t("portal.dashboardLaunch.summary.orders.title"),
      historyEyebrow: t("portal.dashboardLaunch.history.eyebrow"),
      historySectionTitle: t("portal.dashboardLaunch.history.title"),
      historyButton: t("portal.dashboardLaunch.history.button"),
      historyEmpty: t("portal.dashboardLaunch.history.empty"),
    }),
    [data.workspace.displayName, t],
  );

  const nextAction = data.workspace.actionItems[0] ?? null;
  const nextDeliverable = data.workspace.documents[0] ?? null;
  const recentHistory = data.workspace.history.slice(0, 4);
  const activeWorkstream =
    data.workspace.workstreams.find((stream) => ["blocked", "in_progress", "ready"].includes(stream.status)) ??
    data.workspace.workstreams[0] ??
    null;
  const currentStage =
    data.workspace.launchJourney.find((stage) => ["blocked", "in_progress", "ready"].includes(stage.status)) ??
    data.workspace.launchJourney[0] ??
    null;
  const checklist = data.workspace.launchJourney.slice(0, 4);

  useClientGuidance(
    useMemo(
        () => ({
          focusLabel: nextAction ? launchCopy.guidanceWaiting : launchCopy.guidanceFlowing,
          summary: nextAction?.summary ?? data.workspace.atlasActivityPanel.summary,
          pendingCount: data.workspace.actionItems.length,
          metrics: [
            {
              label: t("common.pendingActions"),
            value: nextAction ? String(data.workspace.actionItems.length) : "0",
          },
          {
            label: launchCopy.guidanceActiveArea,
            value: String(data.workspace.activeWorkstreamCount),
          },
          {
            label: t("common.progress"),
            value: `%${data.completionPct}`,
          },
        ],
      }),
      [data.completionPct, data.openSupportRequests, data.workspace, launchCopy, nextAction, t],
    ),
  );

  function openHub(tab: CustomerHubModalTab) {
    setHubTab(tab);
    setHubOpen(true);
  }

  return (
    <div className="space-y-6">
      <AtlasHeroBoard
        eyebrow={launchCopy.heroBadge}
        title={launchCopy.heroTitle}
        description={launchCopy.heroDescription}
        badges={[data.workspace.launchStageLabel, launchCopy.heroEyebrow]}
        metrics={[
          { label: t("common.pendingActions"), value: String(data.workspace.actionItems.length), tone: "warning" },
          { label: launchCopy.guidanceActiveArea, value: String(data.workspace.activeWorkstreamCount), tone: "primary" },
          { label: t("common.progress"), value: `%${data.completionPct}`, tone: "cobalt" },
        ]}
        primaryAction={
          data.workspace.customerFocusPanel.primaryAction
            ? {
                label: data.workspace.customerFocusPanel.primaryAction.title,
                onClick: () => openHub(toCustomerHubTab(data.workspace.customerFocusPanel.primaryAction?.tab, "actions")),
              }
            : undefined
        }
        secondaryAction={{
          label: launchCopy.heroCenterButton,
          onClick: () => openHub("history"),
          variant: "outline",
        }}
        tone="primary"
      >
        <div className="rounded-2xl border border-white/8 bg-black/15 px-4 py-3 text-sm leading-6 text-slate-200/90">
          {data.workspace.customerFocusPanel.detail}
        </div>
      </AtlasHeroBoard>

      <section className="grid gap-4 xl:grid-cols-[1.02fr_1.02fr_0.96fr]">
        <LaunchCard
          kicker={launchCopy.waitingKicker}
          title={nextAction?.title ?? launchCopy.waitingFallback}
          description={nextAction?.summary ?? data.workspace.customerFocusPanel.detail}
          badge={data.workspace.customerFocusPanel.statusLabel}
          tone={nextAction ? "warning" : "default"}
          metrics={[
            { label: launchCopy.waitingPending, value: String(data.workspace.actionItems.length) },
            { label: launchCopy.waitingSupport, value: String(data.openSupportRequests) },
            { label: launchCopy.waitingForms, value: String(data.workspace.submittedForms.length) },
          ]}
          primaryLabel={nextAction ? launchCopy.waitingOpenActions : launchCopy.waitingViewServices}
          onPrimary={() => openHub(nextAction ? "actions" : "forms")}
          secondaryLabel={launchCopy.waitingSupportCenter}
          onSecondary={() => openHub("forms")}
          icon={AlertTriangle}
        />

        <LaunchCard
          kicker={launchCopy.atlasKicker}
          title={activeWorkstream?.title ?? data.workspace.atlasActivityPanel.headline}
          description={activeWorkstream?.nextStep ?? data.workspace.atlasActivityPanel.detail}
          badge={data.workspace.atlasActivityPanel.statusLabel}
          tone="primary"
          metrics={[
            { label: launchCopy.atlasActive, value: String(data.workspace.activeWorkstreamCount) },
            { label: launchCopy.atlasBlocked, value: String(data.workspace.blockedWorkstreamCount) },
            { label: launchCopy.atlasDeliverables, value: String(data.workspace.deliverableCount) },
          ]}
          primaryLabel={launchCopy.atlasDocuments}
          onPrimary={() => openHub("documents")}
          secondaryLabel={launchCopy.atlasHistory}
          onSecondary={() => openHub("history")}
          icon={Workflow}
        />

        <div className="space-y-4">
          <AtlasSectionPanel
            eyebrow={launchCopy.stageTitle}
            title={currentStage?.title ?? data.workspace.launchStageLabel}
            description={currentStage?.expectedDeliverable ?? data.workspace.summary}
          >
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
              <MetricPill title={launchCopy.progressLabel} value={`%${data.completionPct}`} />
              <MetricPill title={launchCopy.activeOrdersLabel} value={String(data.activeOrders)} />
              <MetricPill title={launchCopy.productsLabel} value={String(data.totalProducts)} />
              <MetricPill title={launchCopy.totalStockLabel} value={String(data.totalStockTR + data.totalStockUS)} />
            </div>
          </AtlasSectionPanel>

        <AtlasSectionPanel
          eyebrow={launchCopy.nextStepsTitle}
          title={t("portal.dashboardLaunch.stage.title")}
          description={data.workspace.summary}
        >
            <AtlasTimelineRail
              items={checklist.map((stage) => ({
                id: stage.key,
                title: stage.title,
                description: stage.customerAction,
                badge: getStatusLabel(t, stage.status),
                tone:
                  stage.status === "completed"
                    ? "success"
                    : stage.status === "blocked"
                      ? "warning"
                      : stage.status === "ready" || stage.status === "in_progress"
                        ? "primary"
                        : "neutral",
                icon: getStageIcon(stage.status),
              }))}
            />
          </AtlasSectionPanel>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        <QuickLinkCard
          title={launchCopy.formsTitle}
          value={t("portal.dashboardLaunch.quickLinks.forms.value", { count: data.workspace.submittedForms.length })}
          description={launchCopy.formsDescription}
          icon={FileText}
          onOpen={() => openHub("forms")}
        />
        <QuickLinkCard
          title={launchCopy.documentsTitle}
          value={t("portal.dashboardLaunch.quickLinks.documents.value", { count: data.workspace.documents.length })}
          description={launchCopy.documentsDescription}
          icon={FolderOpen}
          onOpen={() => openHub("documents")}
        />
        <QuickLinkCard
          title={launchCopy.historyTitle}
          value={t("portal.dashboardLaunch.quickLinks.history.value", { count: data.workspace.history.length })}
          description={launchCopy.historyDescription}
          icon={History}
          onOpen={() => openHub("history")}
        />
      </section>

      <section className="grid gap-4 xl:grid-cols-[1.02fr_0.98fr]">
        <AtlasSectionPanel
          eyebrow={launchCopy.summaryEyebrow}
          title={launchCopy.summaryTitle}
          description={data.workspace.summary}
          action={{ label: launchCopy.summaryButton, href: "/panel/services", variant: "outline", icon: ArrowUpRight }}
        >
          <div className="mt-5 grid gap-3 md:grid-cols-2">
            <SummaryPanel
              title={launchCopy.workstreamTitle}
              description={activeWorkstream?.description ?? launchCopy.workstreamDefaultDescription}
              value={activeWorkstream?.shortLabel ?? data.workspace.launchStageLabel}
              icon={Truck}
            />
            <SummaryPanel
              title={launchCopy.deliverableTitle}
              description={nextDeliverable?.summary ?? launchCopy.deliverableDefaultDescription}
              value={nextDeliverable?.title ?? launchCopy.deliverableEmptyValue}
              icon={Sparkles}
            />
            <SummaryPanel
              title={launchCopy.tasksTitle}
              description={t("portal.dashboardLaunch.summary.tasks.description", {
                completed: data.completedTasks,
                total: data.totalTasks,
              })}
              value={`%${data.completionPct}`}
              icon={Workflow}
            />
            <SummaryPanel
              title={launchCopy.ordersTitle}
              description={t("portal.dashboardLaunch.summary.orders.description", {
                total: data.totalOrders,
                active: data.activeOrders,
              })}
              value={String(data.activeOrders)}
              icon={Package}
            />
          </div>
        </AtlasSectionPanel>

        <AtlasSectionPanel
          eyebrow={launchCopy.historyEyebrow}
          title={launchCopy.historySectionTitle}
          description={data.workspace.summary}
          action={{ label: launchCopy.historyButton, onClick: () => openHub("history"), variant: "ghost" }}
        >
          <div className="mt-5 space-y-3">
            {recentHistory.length > 0 ? (
              recentHistory.map((item, index) => (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.35, delay: index * 0.05 }}
                  className="rounded-[1.2rem] border border-white/8 bg-background/35 p-4"
                >
                  <p className="text-sm font-medium text-white">{item.title}</p>
                  <p className="mt-2 text-xs leading-5 text-muted-foreground">{item.description}</p>
                </motion.div>
              ))
            ) : (
              <div className="rounded-[1.2rem] border border-dashed border-white/10 bg-background/20 px-4 py-8 text-sm text-muted-foreground">
                {launchCopy.historyEmpty}
              </div>
            )}
          </div>
        </AtlasSectionPanel>
      </section>

      <CustomerRequestsHubModal
        workspace={data.workspace}
        open={hubOpen}
        onOpenChange={setHubOpen}
        initialTab={hubTab}
      />
    </div>
  );
}

function LaunchCard({
  kicker,
  title,
  description,
  badge,
  tone,
  metrics,
  primaryLabel,
  secondaryLabel,
  onPrimary,
  onSecondary,
  icon: Icon,
}: {
  kicker: string;
  title: string;
  description: string;
  badge: string;
  tone: "default" | "primary" | "warning";
  metrics: Array<{ label: string; value: string }>;
  primaryLabel: string;
  secondaryLabel: string;
  onPrimary: () => void;
  onSecondary: () => void;
  icon: typeof AlertTriangle;
}) {
  return (
    <AtlasInsightCard
      eyebrow={kicker}
      title={title}
      description={description}
      badge={badge}
      tone={tone === "warning" ? "warning" : tone === "primary" ? "primary" : "neutral"}
      icon={Icon}
      metrics={metrics}
      primaryAction={{ label: primaryLabel, onClick: onPrimary }}
      secondaryAction={{ label: secondaryLabel, onClick: onSecondary, variant: "outline" }}
    />
  );
}

function MetricPill({ title, value }: { title: string; value: string }) {
  return <AtlasMetricSlab label={title} value={value} />;
}

function QuickLinkCard({
  title,
  value,
  description,
  icon: Icon,
  onOpen,
}: {
  title: string;
  value: string;
  description: string;
  icon: typeof FileText;
  onOpen: () => void;
}) {
  return <AtlasActionCard title={title} value={value} description={description} icon={Icon} onClick={onOpen} openLabel={title} tone="primary" />;
}

function SummaryPanel({
  title,
  description,
  value,
  icon: Icon,
}: {
  title: string;
  description: string;
  value: string;
  icon: typeof Sparkles;
}) {
  return (
    <AtlasInsightCard
      eyebrow={title}
      title={value}
      description={description}
      icon={Icon}
      tone="neutral"
      className="rounded-[1.2rem]"
    />
  );
}
