"use client";

import { motion } from "framer-motion";
import {
  CheckCircle2,
  Clock,
  AlertCircle,
  Lock,
  Route,
  ShieldAlert,
  ArrowUpRight,
} from "lucide-react";
import { cn, formatDate } from "@/lib/utils";
import { getTaskCategoryLabel, type TaskCategory } from "@/types/enums";
import { BentoCell } from "@/components/shared/bento-grid";
import { StatusTransition } from "@/components/shared/status-transition";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  AtlasActionCard,
  AtlasHeroBoard,
  AtlasInsightCard,
  AtlasSectionPanel,
  AtlasTimelineRail,
} from "@/components/portal/atlas-widget-kit";
import { useClientGuidance } from "../../_components/client-guidance-provider";
import { useMemo, useState } from "react";
import type { CustomerWorkspaceViewModel } from "@/lib/customer-workspace/types";
import { CustomerRequestsHubModal } from "@/components/hub/customer-requests-hub-modal";
import { useI18n } from "@/i18n/provider";

interface Task {
  id: string;
  task_name: string;
  task_status: string;
  task_category?: string | null;
  notes?: string | null;
  completed_at?: string | null;
  sort_order?: number | null;
  updated_at?: string | null;
}

type Translator = (key: string, params?: Record<string, string | number | null | undefined>) => string;

function getStageIcon(status: CustomerWorkspaceViewModel["launchJourney"][number]["status"]) {
  switch (status) {
    case "completed":
      return CheckCircle2;
    case "blocked":
      return AlertCircle;
    default:
      return Clock;
  }
}

function getStatusLabel(
  t: Translator,
  status: CustomerWorkspaceViewModel["launchJourney"][number]["status"],
) {
  try {
    return t(`workspace.statuses.${status}`);
  } catch {
    return status;
  }
}

function getStatusConfig(t: Translator) {
  return {
    completed: {
      icon: CheckCircle2,
      color: "text-emerald-400",
      bg: "bg-emerald-400/10",
      ring: "ring-emerald-400/20",
      label: t("portal.process.completed"),
    },
    in_progress: {
      icon: Clock,
      color: "text-blue-400",
      bg: "bg-blue-400/10",
      ring: "ring-blue-400/20",
      label: t("portal.process.inProgress"),
    },
    pending: {
      icon: Lock,
      color: "text-muted-foreground",
      bg: "bg-muted",
      ring: "ring-border",
      label: t("portal.process.pending"),
    },
    blocked: {
      icon: AlertCircle,
      color: "text-red-400",
      bg: "bg-red-400/10",
      ring: "ring-red-400/20",
      label: t("portal.process.blocker"),
    },
  } as const;
}

type StatusKey = "completed" | "in_progress" | "pending" | "blocked";

const mapToTransitionStatus = (status: string) => {
  if (status === "completed") return "approved" as const;
  if (status === "in_progress") return "in_progress" as const;
  if (status === "blocked") return "crisis" as const;
  return "pending" as const;
};

function dedupeDisplayTasks(tasks: Task[]) {
  const latestByName = new Map<string, Task>();

  for (const task of tasks) {
    const key = task.task_name.trim().toLowerCase();
    const existing = latestByName.get(key);

    if (!existing) {
      latestByName.set(key, task);
      continue;
    }

    const currentTime = new Date(task.updated_at ?? task.completed_at ?? "").getTime();
    const existingTime = new Date(existing.updated_at ?? existing.completed_at ?? "").getTime();
    if (currentTime > existingTime) {
      latestByName.set(key, task);
    }
  }

  return Array.from(latestByName.values()).sort(
    (left, right) => Number(left.sort_order ?? 0) - Number(right.sort_order ?? 0),
  );
}

export function ProcessContent({
  tasks,
  workspace,
}: {
  tasks: Task[];
  workspace: CustomerWorkspaceViewModel;
}) {
  const { t, locale } = useI18n();
  const statusConfig = useMemo(() => getStatusConfig(t), [t]);
  const [hubOpen, setHubOpen] = useState(false);
  const [hubTab, setHubTab] = useState<"actions" | "forms" | "documents" | "history">("actions");
  const visibleTasks = useMemo(() => dedupeDisplayTasks(tasks), [tasks]);
  const totalTasks = visibleTasks.length;
  const completedTasks = visibleTasks.filter((task) => task.task_status === "completed").length;
  const inProgressTasks = visibleTasks.filter((task) => task.task_status === "in_progress").length;
  const blockedTasks = visibleTasks.filter((task) => task.task_status === "blocked").length;
  const pendingTasks = visibleTasks.filter((task) => task.task_status === "pending").length;
  const progressPct = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
  const nextTask = visibleTasks.find((task) => task.task_status !== "completed") ?? null;
  const launchFocusStage =
    workspace.launchJourney.find((stage) => ["blocked", "in_progress", "ready"].includes(stage.status)) ?? null;
  const focusTitle = launchFocusStage?.title ?? nextTask?.task_name ?? t("portal.process.waitingNoStep");
  const focusSummary =
    launchFocusStage?.blockerReason ??
    launchFocusStage?.customerAction ??
    nextTask?.notes ??
    t("portal.process.waitingFallback");

  const categories = visibleTasks.reduce(
    (accumulator, task) => {
      const category = task.task_category ?? "other";
      if (!accumulator[category]) accumulator[category] = { total: 0, completed: 0 };
      accumulator[category].total += 1;
      if (task.task_status === "completed") accumulator[category].completed += 1;
      return accumulator;
    },
    {} as Record<string, { total: number; completed: number }>,
  );

  const guidanceMetrics = useMemo(
    () => [
      { label: t("portal.process.waitingMetrics.progress"), value: `%${progressPct}` },
      { label: t("portal.process.waitingMetrics.inProgress"), value: `${inProgressTasks}` },
      { label: t("portal.process.waitingMetrics.blocker"), value: `${blockedTasks}` },
    ],
    [blockedTasks, inProgressTasks, progressPct, t],
  );

  function openHub(tab: "actions" | "forms" | "documents" | "history") {
    setHubTab(tab);
    setHubOpen(true);
  }

  useClientGuidance(
    useMemo(
        () => ({
          focusLabel: launchFocusStage?.status === "blocked" || blockedTasks > 0
            ? t("portal.process.blockerExists")
            : launchFocusStage || nextTask
              ? t("portal.process.nextMilestone")
              : t("portal.process.waitingDone"),
          summary:
            launchFocusStage?.blockerReason ??
            launchFocusStage?.customerAction ??
            (blockedTasks > 0
              ? t("portal.process.blockedSummary")
              : nextTask
                ? `${nextTask.task_name} ${t("portal.process.waitingFallback").toLowerCase()}`
                : t("portal.process.waitingFallback")),
          pendingCount: pendingTasks,
          metrics: guidanceMetrics,
        }),
      [blockedTasks, guidanceMetrics, launchFocusStage, nextTask, pendingTasks, t],
    ),
  );

  return (
    <div className="space-y-6">
      <AtlasHeroBoard
        eyebrow={t("portal.process.pageBadge")}
        title={t("portal.process.title")}
        description={t("portal.process.description")}
        badges={[t("portal.process.timelineBadge"), workspace.launchStageLabel]}
        metrics={[
          { label: t("portal.process.waitingMetrics.progress"), value: `%${progressPct}`, tone: "primary" },
          { label: t("portal.process.waitingMetrics.inProgress"), value: `${inProgressTasks}`, tone: "cobalt" },
          { label: t("portal.process.waitingMetrics.blocker"), value: `${blockedTasks}`, tone: "warning" },
        ]}
        primaryAction={{ label: t("portal.process.openHistory"), onClick: () => openHub("history") }}
        secondaryAction={{ label: t("portal.process.openDocuments"), onClick: () => openHub("documents"), variant: "outline" }}
      />

      <section className="grid gap-5 xl:grid-cols-[1.08fr_0.92fr]">
        <ProcessFocusPanel
          kicker={t("portal.process.waitingForYou")}
          title={focusTitle}
          summary={focusSummary}
          accent={launchFocusStage?.status === "blocked" || blockedTasks > 0 ? "warning" : "primary"}
          metrics={[
            { label: t("portal.process.waitingMetrics.progress"), value: `%${progressPct}` },
            { label: t("portal.process.waitingMetrics.pending"), value: `${pendingTasks}` },
            { label: t("portal.process.waitingMetrics.blocker"), value: `${blockedTasks}` },
          ]}
          primary={{ label: t("portal.process.waitingPrimaryAction"), onClick: () => openHub("actions") }}
          secondary={{ label: t("portal.process.waitingSecondaryAction"), onClick: () => openHub("forms") }}
          icon={Route}
        />

        <ProcessFocusPanel
          kicker={t("portal.process.atlasWorking")}
          title={workspace.launchStageLabel}
          summary={workspace.summary}
          accent="primary"
          metrics={[
            { label: t("portal.process.waitingMetrics.inProgress"), value: `${inProgressTasks}` },
            { label: t("portal.process.completed"), value: `${completedTasks}` },
            { label: t("portal.process.waitingMetrics.category"), value: `${Object.keys(categories).length}` },
          ]}
          primary={{ label: t("portal.process.openHistory"), onClick: () => openHub("history") }}
          secondary={{ label: t("portal.process.openDocuments"), onClick: () => openHub("documents") }}
          icon={ShieldAlert}
        />
      </section>

      <div className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
        <AtlasSectionPanel
          eyebrow={t("portal.process.launchTitle")}
          title={workspace.launchStageLabel}
          description={workspace.summary}
        >
          <AtlasTimelineRail
            items={workspace.launchJourney.map((stage) => ({
              id: stage.key,
              title: stage.title,
              description: stage.expectedDeliverable,
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

        <AtlasSectionPanel
          eyebrow={t("portal.process.quickWorkspaces")}
          title={workspace.headline}
          description={workspace.performance.summary}
        >
          <div className="space-y-3">
            <AtlasActionCard
              title={t("portal.process.requestThread")}
              value={`${workspace.requestCount}`}
              description={t("portal.process.requestThreadDescription")}
              icon={Route}
              onClick={() => openHub("forms")}
              openLabel={t("portal.process.openWorkspace")}
              tone="primary"
            />
            <AtlasActionCard
              title={t("portal.process.openDocuments")}
              value={`${workspace.deliverableCount}`}
              description={t("portal.process.deliverablesDescription")}
              icon={ShieldAlert}
              onClick={() => openHub("documents")}
              openLabel={t("portal.process.openDocuments")}
              tone="success"
            />
            <AtlasActionCard
              title={t("portal.process.firstSaleStatus")}
              value={workspace.headline}
              description={workspace.performance.summary}
              icon={ArrowUpRight}
              onClick={() => openHub("history")}
              openLabel={t("portal.process.openHistory")}
              tone="cobalt"
            />
          </div>
        </AtlasSectionPanel>
      </div>

      <BentoCell className="w-full">
        <h3 className="mb-4 text-sm font-medium text-muted-foreground">{t("portal.process.timelineTitle")}</h3>
        {visibleTasks.length > 0 ? (
          <div className="relative space-y-0">
            {visibleTasks.map((task, index) => {
              const config = statusConfig[task.task_status as StatusKey] ?? statusConfig.pending;
              const Icon = config.icon;
              const isLast = index === visibleTasks.length - 1;

              return (
                <motion.div
                  key={task.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{
                    duration: 0.35,
                    delay: index * 0.06,
                    ease: [0.4, 0, 0.2, 1] as const,
                  }}
                  className="flex gap-4"
                >
                  <div className="flex flex-col items-center">
                    <div
                      className={cn(
                        "flex h-8 w-8 shrink-0 items-center justify-center rounded-full ring-2",
                        config.bg,
                        config.ring,
                      )}
                    >
                      <Icon className={cn("h-4 w-4", config.color)} />
                    </div>
                    {!isLast ? <div className="min-h-[2rem] w-0.5 flex-1 bg-border/50" /> : null}
                  </div>

                  <div className="flex-1 pb-6">
                    <div className="flex flex-wrap items-center gap-2">
                      <h4 className="text-sm font-semibold">{task.task_name}</h4>
                      <StatusTransition status={mapToTransitionStatus(task.task_status)} label={config.label} size="sm" />
                      {task.task_category ? (
                        <Badge variant="secondary" className="text-xs">
                          {getTaskCategoryLabel(task.task_category as TaskCategory, locale)}
                        </Badge>
                      ) : null}
                    </div>
                    {task.notes ? <p className="mt-1.5 text-xs text-muted-foreground">{task.notes}</p> : null}
                    {task.completed_at ? (
                      <p className="mt-1 text-xs text-emerald-400">
                        {t("portal.process.completedAt", { date: formatDate(task.completed_at) })}
                      </p>
                    ) : null}
                  </div>
                </motion.div>
              );
            })}
          </div>
        ) : (
          <p className="py-8 text-center text-sm text-muted-foreground">{t("portal.process.noTasks")}</p>
        )}
      </BentoCell>

      <CustomerRequestsHubModal
        workspace={workspace}
        open={hubOpen}
        onOpenChange={setHubOpen}
        initialTab={hubTab}
      />
    </div>
  );
}

function ProcessFocusPanel({
  kicker,
  title,
  summary,
  metrics,
  primary,
  secondary,
  icon: Icon,
  accent,
}: {
  kicker: string;
  title: string;
  summary: string;
  metrics: Array<{ label: string; value: string }>;
  primary: { label: string; onClick: () => void };
  secondary: { label: string; onClick: () => void };
  icon: typeof Route;
  accent: "warning" | "primary";
}) {
  return (
    <AtlasInsightCard
      eyebrow={kicker}
      title={title}
      description={summary}
      tone={accent === "warning" ? "warning" : "primary"}
      icon={Icon}
      metrics={metrics}
      primaryAction={{ label: primary.label, onClick: primary.onClick }}
      secondaryAction={{ label: secondary.label, onClick: secondary.onClick, variant: "outline" }}
    />
  );
}
