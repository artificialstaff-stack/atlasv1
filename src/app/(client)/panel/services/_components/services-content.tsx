"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { getFormByCode } from "@/lib/forms";
import { useClientGuidance } from "../../_components/client-guidance-provider";
import type { CustomerWorkspaceViewModel } from "@/lib/customer-workspace/types";
import { CustomerRequestsHubModal } from "@/components/hub/customer-requests-hub-modal";
import {
  AtlasActionCard,
  AtlasEmptySurface,
  AtlasHeroBoard,
  AtlasInsightCard,
  AtlasMetricSlab,
  AtlasSectionPanel,
  AtlasStackGrid,
  AtlasTableShell,
} from "@/components/portal/atlas-widget-kit";
import {
  getFormSubmissionStatusLabel,
  FORM_SUBMISSION_STATUS_COLORS,
  type FormSubmissionStatus,
} from "@/lib/forms/types";
import {
  Search,
  FileText,
  CheckCircle2,
  Clock,
  AlertTriangle,
  ListChecks,
  ChevronRight,
  Files,
  Workflow,
  Sparkles,
  BarChart3,
} from "lucide-react";
import { useI18n } from "@/i18n/provider";

interface FormSubmission {
  id: string;
  form_code: string;
  user_id: string;
  data: Record<string, unknown>;
  status: string;
  admin_notes: string | null;
  created_at: string;
  updated_at: string;
}

interface ProcessTask {
  id: string;
  user_id: string;
  task_name: string;
  task_category: string | null;
  task_status: string;
  sort_order: number;
  notes: string | null;
  form_submission_id: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}

type Translator = (key: string, params?: Record<string, string | number | null | undefined>) => string;

function getCatalogTone(status: string) {
  switch (status) {
    case "selected":
      return "success" as const;
    case "recommended":
      return "primary" as const;
    case "locked":
      return "warning" as const;
    default:
      return "neutral" as const;
  }
}

function getWorkstreamTone(status: string) {
  switch (status) {
    case "completed":
      return "success" as const;
    case "blocked":
      return "warning" as const;
    case "in_progress":
    case "ready":
      return "primary" as const;
    default:
      return "neutral" as const;
  }
}

function dedupeDisplayTasks(tasks: ProcessTask[]) {
  const latestByName = new Map<string, ProcessTask>();

  for (const task of tasks) {
    const key = task.task_name.trim().toLowerCase();
    const existing = latestByName.get(key);

    if (!existing) {
      latestByName.set(key, task);
      continue;
    }

    if (new Date(task.updated_at).getTime() > new Date(existing.updated_at).getTime()) {
      latestByName.set(key, task);
    }
  }

  return Array.from(latestByName.values());
}

function getServicesCopy(t: Translator) {
  return {
    pageBadge: t("portal.services.pageBadge"),
    viewBadge: t("portal.services.viewBadge"),
    title: t("portal.services.title"),
    description: t("portal.services.description"),
    waiting: t("portal.services.waiting"),
    waitingTitleActive: t("portal.services.waitingTitleActive"),
    waitingTitleIdle: t("portal.services.waitingTitleIdle"),
    atlas: t("portal.services.atlas"),
    atlasFallback: t("portal.services.atlasFallback"),
    requestsForms: t("portal.services.requestsForms"),
    documentsOutputs: t("portal.services.documentsOutputs"),
    processHistory: t("portal.services.processHistory"),
    formsLabel: t("portal.services.formsLabel"),
    activeTopics: t("portal.services.activeTopics"),
    visibleOutputs: t("portal.services.visibleOutputs"),
    historyCount: t("portal.services.historyCount"),
    totalApplications: t("portal.services.totalApplications"),
    taskProgress: t("portal.services.taskProgress"),
    activeService: t("portal.services.activeService"),
    completed: t("portal.services.completed"),
    summary: {
      waitingRequests: t("portal.services.summary.waitingRequests"),
      activeService: t("portal.services.summary.activeService"),
      tasks: t("portal.services.summary.tasks"),
      openRecords: t("portal.services.summary.openRecords"),
      openTasks: t("portal.services.summary.openTasks"),
      openSupportCenter: t("portal.services.summary.openSupportCenter"),
      workstreams: t("portal.services.summary.workstreams"),
      requestsDescription: t("portal.services.summary.requestsDescription"),
      documentsDescription: t("portal.services.summary.documentsDescription"),
      historyDescription: t("portal.services.summary.historyDescription"),
      totalApplicationsHint: t("portal.services.summary.totalApplicationsHint"),
      totalCompletedHint: t("portal.services.summary.totalCompletedHint"),
      latestDeliverable: t("portal.services.summary.latestDeliverable"),
      noDeliverable: t("portal.services.summary.noDeliverable"),
      visibleOutputEmpty: t("portal.services.summary.visibleOutputEmpty"),
      threadHint: t("portal.services.summary.threadHint"),
      standaloneTasks: t("portal.services.summary.standaloneTasks"),
      standaloneHint: t("portal.services.summary.standaloneHint"),
      noStandalone: t("portal.services.summary.noStandalone"),
      searchPlaceholder: t("portal.services.summary.searchPlaceholder"),
      statusPlaceholder: t("portal.services.summary.statusPlaceholder"),
      allStatuses: t("portal.services.summary.allStatuses"),
      priorityApplications: t("portal.services.summary.priorityApplications"),
      ongoingServices: t("portal.services.summary.ongoingServices"),
      completedApplications: t("portal.services.summary.completedApplications"),
      noApplications: t("portal.services.summary.noApplications"),
      taskProgressCompleted: t("portal.services.summary.taskProgressCompleted"),
      tasksPreparing: t("portal.services.summary.tasksPreparing"),
      tasksAppearAfterApproval: t("portal.services.summary.tasksAppearAfterApproval"),
      atlasNote: t("portal.services.summary.atlasNote"),
      waitingForAtlasInput: t("portal.services.summary.waitingForAtlasInput"),
      waitingForAtlasInputSummary: t("portal.services.summary.waitingForAtlasInputSummary"),
      activeServicesTracked: t("portal.services.summary.activeServicesTracked"),
      activeServicesTrackedSummary: t("portal.services.summary.activeServicesTrackedSummary"),
      noActiveServiceYet: t("portal.services.summary.noActiveServiceYet"),
      noActiveServiceYetSummary: t("portal.services.summary.noActiveServiceYetSummary"),
      serviceFlowTitle: t("portal.services.summary.serviceFlowTitle"),
      requestWaitingMessage: t("portal.services.summary.requestWaitingMessage"),
      noOpenThreads: t("portal.services.summary.noOpenThreads"),
      activeRecordsMessage: t("portal.services.summary.activeRecordsMessage"),
      noSubmissionYetWithSupport: t("portal.services.summary.noSubmissionYetWithSupport"),
      noServiceYet: t("portal.services.summary.noServiceYet"),
      noFilteredResults: t("portal.services.summary.noFilteredResults"),
      supportRequestsWaiting: t("portal.services.summary.supportRequestsWaiting"),
      serviceList: t("portal.services.summary.serviceList"),
      serviceListDescription: t("portal.services.summary.serviceListDescription"),
      performanceSummary: t("portal.services.summary.performanceSummary"),
    },
    openWorkspace: t("common.openWorkspace"),
    standaloneTasks: t("portal.services.summary.standaloneTasks"),
    serviceList: t("portal.services.summary.serviceList"),
    serviceListDescription: t("portal.services.summary.serviceListDescription"),
    performanceSummary: t("portal.services.summary.performanceSummary"),
    activeRecordCount: t("portal.services.activeRecordCount"),
    orderCount: t("portal.services.orderCount"),
    performanceAndSummary: t("portal.services.performanceAndSummary"),
    atlasWorkingSection: t("portal.services.atlasWorkingSection"),
    priorityApplications: t("portal.services.priorityApplications"),
    ongoingServices: t("portal.services.ongoingServices"),
    completedSection: t("portal.services.completedSection"),
    finishedServices: t("portal.services.finishedServices"),
    launchWorkstreams: t("portal.services.launchWorkstreams"),
    atlasActiveAreas: t("portal.services.atlasActiveAreas"),
    statuses: {
      pending: t("portal.services.statuses.pending"),
      in_progress: t("portal.services.statuses.in_progress"),
      completed: t("portal.services.statuses.completed"),
      blocked: t("portal.services.statuses.blocked"),
      submitted: t("portal.services.statuses.submitted"),
      under_review: t("portal.services.statuses.under_review"),
      approved: t("portal.services.statuses.approved"),
      rejected: t("portal.services.statuses.rejected"),
      needs_correction: t("portal.services.statuses.needs_correction"),
    },
  };
}

function SubmissionCard({
  submission,
  tasks,
  selectedSubmission,
  setSelectedSubmission,
  locale,
  copy,
}: {
  submission: FormSubmission;
  tasks: ProcessTask[];
  selectedSubmission: string | null;
  setSelectedSubmission: (value: string | null) => void;
  locale: "tr" | "en";
  copy: ReturnType<typeof getServicesCopy>;
}) {
  const formDef = getFormByCode(submission.form_code);
  const status = submission.status as FormSubmissionStatus;
  const statusColors = FORM_SUBMISSION_STATUS_COLORS[status] ?? "text-muted-foreground bg-muted";
  const isExpanded = selectedSubmission === submission.id;
  const completedTasks = tasks.filter((task) => task.task_status === "completed").length;
  const taskStatusConfig: Record<string, { label: string; color: string; icon: typeof Clock }> = {
    pending: { label: copy.statuses.pending, color: "text-amber-500 bg-amber-500/10", icon: Clock },
    in_progress: { label: copy.statuses.in_progress, color: "text-blue-500 bg-blue-500/10", icon: ListChecks },
    completed: { label: copy.statuses.completed, color: "text-emerald-500 bg-emerald-500/10", icon: CheckCircle2 },
    blocked: { label: copy.statuses.blocked, color: "text-red-500 bg-red-500/10", icon: AlertTriangle },
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="portal-surface-list overflow-hidden rounded-[1.45rem]"
    >
      <button
        onClick={() => setSelectedSubmission(isExpanded ? null : submission.id)}
        className="flex w-full items-center justify-between p-4 text-left transition-colors hover:bg-muted/15"
      >
        <div className="flex min-w-0 items-center gap-3">
          <Badge variant="outline" className="shrink-0 text-[10px] font-mono">
            {submission.form_code}
          </Badge>
          <div className="min-w-0">
            <p className="truncate text-sm font-medium">{formDef?.title ?? submission.form_code}</p>
            <p className="text-[10px] text-muted-foreground">
              {new Intl.DateTimeFormat(locale === "en" ? "en-US" : "tr-TR").format(new Date(submission.created_at))}
              {tasks.length > 0 ? <span className="ml-2">· {copy.summary.taskProgressCompleted.replace("{{done}}", String(completedTasks)).replace("{{total}}", String(tasks.length))}</span> : null}
            </p>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <Badge className={cn("text-[10px]", statusColors)}>
            {getFormSubmissionStatusLabel(status, locale) ?? status}
          </Badge>
          <ChevronRight
            className={cn("h-4 w-4 text-muted-foreground transition-transform", isExpanded && "rotate-90")}
          />
        </div>
      </button>

      {isExpanded ? (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: "auto", opacity: 1 }}
          className="space-y-4 border-t border-white/8 bg-muted/10 p-4"
        >
          {submission.admin_notes ? (
            <div className="rounded-2xl border border-blue-500/20 bg-blue-500/5 p-4">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-blue-300">{copy.summary.atlasNote}</p>
              <p className="mt-2 text-sm leading-6 text-slate-200/90">{submission.admin_notes}</p>
            </div>
          ) : null}

          {tasks.length > 0 ? (
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-2">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  {copy.taskProgress}
                </p>
                <span className="text-xs text-muted-foreground">
                  {completedTasks}/{tasks.length}
                </span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-emerald-500 transition-all"
                  style={{ width: `${tasks.length > 0 ? (completedTasks / tasks.length) * 100 : 0}%` }}
                />
              </div>
              <div className="space-y-2">
                {tasks
                  .sort((left, right) => left.sort_order - right.sort_order)
                  .map((task) => {
                    const configLocalized = taskStatusConfig[task.task_status] ?? taskStatusConfig.pending;
                    const Icon = configLocalized.icon;
                    return (
                      <div key={task.id} className="flex items-center gap-3 rounded-2xl bg-card p-3">
                        <div className={cn("rounded-full p-1.5", configLocalized.color)}>
                          <Icon className="h-3.5 w-3.5" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium">{task.task_name}</p>
                          {task.notes ? (
                            <p className="truncate text-[10px] text-muted-foreground">{task.notes}</p>
                          ) : null}
                        </div>
                        <Badge className={cn("shrink-0 text-[10px]", configLocalized.color)}>{configLocalized.label}</Badge>
                      </div>
                    );
                  })}
              </div>
            </div>
          ) : (
            <p className="py-2 text-center text-xs text-muted-foreground">
              {status === "approved"
                ? copy.summary.tasksPreparing
                : copy.summary.tasksAppearAfterApproval}
            </p>
          )}
        </motion.div>
      ) : null}
    </motion.div>
  );
}

export function ServicesContent({
  submissions,
  tasks,
  workspace,
  supportRequestCount,
}: {
  submissions: FormSubmission[];
  tasks: ProcessTask[];
  workspace: CustomerWorkspaceViewModel;
  supportRequestCount: number;
}) {
  const { locale, t } = useI18n();
  const copy = useMemo(() => getServicesCopy(t), [t]);
  const [hubOpen, setHubOpen] = useState(false);
  const [hubTab, setHubTab] = useState<"actions" | "forms" | "documents" | "history">("actions");
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selectedSubmission, setSelectedSubmission] = useState<string | null>(null);
  const visibleTasks = useMemo(() => dedupeDisplayTasks(tasks), [tasks]);

  const tasksBySubmission = useMemo(() => {
    const map: Record<string, ProcessTask[]> = {};
    for (const task of visibleTasks) {
      if (!task.form_submission_id) continue;
      if (!map[task.form_submission_id]) map[task.form_submission_id] = [];
      map[task.form_submission_id].push(task);
    }
    return map;
  }, [visibleTasks]);

  const standaloneTasks = useMemo(
    () => visibleTasks.filter((task) => !task.form_submission_id),
    [visibleTasks],
  );

  const filteredSubmissions = useMemo(() => {
    let result = submissions;

    if (statusFilter !== "all") {
      result = result.filter((submission) => submission.status === statusFilter);
    }

    if (searchQuery.length >= 2) {
      const query = searchQuery.toLowerCase();
      result = result.filter((submission) => {
        const form = getFormByCode(submission.form_code);
        return submission.form_code.toLowerCase().includes(query) || form?.title.toLowerCase().includes(query);
      });
    }

    return result;
  }, [searchQuery, statusFilter, submissions]);

  const stats = useMemo(
    () => ({
      total: submissions.length,
      active: submissions.filter((submission) => ["submitted", "under_review", "approved"].includes(submission.status)).length,
      completed: submissions.filter((submission) => submission.status === "completed").length,
      tasksDone: visibleTasks.filter((task) => task.task_status === "completed").length,
      tasksTotal: visibleTasks.length,
    }),
    [submissions, visibleTasks],
  );

  const prioritySubmissions = useMemo(
    () => filteredSubmissions.filter((submission) => submission.status !== "completed"),
    [filteredSubmissions],
  );
  const completedSubmissions = useMemo(
    () => filteredSubmissions.filter((submission) => submission.status === "completed"),
    [filteredSubmissions],
  );
  const activeWorkstreams = useMemo(
    () =>
      workspace.workstreams.filter((workstream) =>
        ["in_progress", "blocked", "ready", "completed"].includes(workstream.status),
      ),
    [workspace.workstreams],
  );
  const selectedServiceCount = useMemo(
    () => workspace.serviceCatalog.filter((item) => item.status === "selected").length,
    [workspace.serviceCatalog],
  );
  const effectiveActiveServiceCount = Math.max(
    stats.active,
    selectedServiceCount,
    activeWorkstreams.length > 0 ? 1 : 0,
  );
  const latestDeliverable = workspace.deliverables[0] ?? null;
  const pendingThreadCount = useMemo(
    () =>
      workspace.requestThreads.filter(
        (thread) => thread.status === "waiting_on_customer" || thread.status === "open",
      ).length,
    [workspace.requestThreads],
  );

  const guidanceMetrics = useMemo(
    () => [
      { label: copy.summary.waitingRequests, value: `${supportRequestCount}` },
      { label: copy.summary.activeService, value: `${effectiveActiveServiceCount}` },
      { label: copy.summary.tasks, value: `${stats.tasksDone}/${stats.tasksTotal}` },
    ],
    [copy, effectiveActiveServiceCount, stats.tasksDone, stats.tasksTotal, supportRequestCount],
  );

  const guidance = useMemo(() => {
    if (supportRequestCount > 0) {
      return {
        focusLabel: copy.summary.waitingForAtlasInput,
        summary: copy.summary.waitingForAtlasInputSummary,
      };
    }
    if (effectiveActiveServiceCount > 0) {
      return {
        focusLabel: copy.summary.activeServicesTracked,
        summary: copy.summary.activeServicesTrackedSummary,
      };
    }
    return {
      focusLabel: copy.summary.noActiveServiceYet,
      summary: copy.summary.noActiveServiceYetSummary,
    };
  }, [copy.summary.activeServicesTracked, copy.summary.activeServicesTrackedSummary, copy.summary.noActiveServiceYet, copy.summary.noActiveServiceYetSummary, copy.summary.waitingForAtlasInput, copy.summary.waitingForAtlasInputSummary, effectiveActiveServiceCount, supportRequestCount]);

  function openHub(tab: "actions" | "forms" | "documents" | "history") {
    setHubTab(tab);
    setHubOpen(true);
  }

  useClientGuidance(
    useMemo(
      () => ({
        ...guidance,
        pendingCount: supportRequestCount,
        metrics: guidanceMetrics,
      }),
      [guidance, guidanceMetrics, supportRequestCount],
    ),
  );

  return (
    <div className="space-y-6">
      <AtlasHeroBoard
        eyebrow={copy.pageBadge}
        title={copy.title}
        description={copy.description}
        badges={[copy.viewBadge, workspace.launchStageLabel]}
        metrics={[
          { label: copy.summary.waitingRequests, value: `${supportRequestCount}`, tone: "warning" },
          { label: copy.summary.activeService, value: `${effectiveActiveServiceCount}`, tone: "primary" },
          { label: copy.summary.tasks, value: `${stats.tasksDone}/${stats.tasksTotal}`, tone: "cobalt" },
        ]}
        primaryAction={{ label: copy.requestsForms, onClick: () => openHub("forms") }}
        secondaryAction={{ label: "Magaza modulune git", href: "/panel/store", variant: "outline" }}
        tone="primary"
      >
        <div className="rounded-2xl border border-white/8 bg-black/15 px-4 py-3 text-sm leading-6 text-slate-200/90">
          {guidance.summary}
        </div>
      </AtlasHeroBoard>

      <AtlasSectionPanel
        eyebrow="Launch Merkezi"
        title="Kurulum ve yonetim paketleri"
        description="Ilk adim LLC + EIN paketidir. Sonraki adimda secilen pazaryeri icin kurulum ve aylik yonetim paketi aktive edilir."
        action={{ label: "Magaza modulune git", href: "/panel/store", variant: "outline" }}
      >
        <AtlasStackGrid columns="three">
          {workspace.serviceCatalog.map((item) => (
            <AtlasInsightCard
              key={item.id}
              title={item.title}
              description={item.summary}
              badge={item.ctaLabel}
              tone={getCatalogTone(item.status)}
              metrics={[
                { label: "Kurulum", value: item.upfrontPrice > 0 ? `$${item.upfrontPrice.toFixed(0)}` : "-" },
                { label: "Aylik", value: item.recurringPrice ? `$${item.recurringPrice.toFixed(0)}/ay` : "-" },
              ]}
              className="h-full"
            >
              {item.lineItems?.length ? (
                <div className="flex flex-wrap gap-2">
                  {item.lineItems.map((lineItem) => (
                    <span
                      key={`${item.id}:${lineItem.label}`}
                      className="rounded-full border border-white/8 bg-white/[0.05] px-3 py-1 text-xs text-slate-200"
                    >
                      {lineItem.label}: ${lineItem.price.toFixed(0)}
                    </span>
                  ))}
                </div>
              ) : null}
              <div className="mt-3 flex flex-wrap gap-2">
                {item.includes.slice(0, 4).map((feature) => (
                  <span key={feature} className="rounded-full bg-white/[0.05] px-3 py-1 text-xs text-slate-300">
                    {feature}
                  </span>
                ))}
              </div>
            </AtlasInsightCard>
          ))}
        </AtlasStackGrid>
      </AtlasSectionPanel>

      <section className="grid gap-5 xl:grid-cols-[1.08fr_0.92fr]">
        <ServicesFocusPanel
          kicker={copy.waiting}
          title={supportRequestCount > 0 ? copy.waitingTitleActive : copy.waitingTitleIdle}
          summary={guidance.summary}
          accent="warning"
          metrics={[
            { label: copy.summary.waitingRequests, value: `${supportRequestCount}` },
            { label: copy.summary.openTasks, value: `${stats.tasksTotal - stats.tasksDone}` },
            { label: copy.summary.openRecords, value: `${prioritySubmissions.length}` },
          ]}
          primaryCta={{ label: copy.summary.openSupportCenter, onClick: () => openHub("actions") }}
          secondaryCta={{ label: copy.formsLabel, onClick: () => openHub("forms") }}
          icon={AlertTriangle}
        />
        <ServicesFocusPanel
          kicker={copy.atlas}
          title={activeWorkstreams[0]?.title ?? copy.summary.serviceFlowTitle}
          summary={
            activeWorkstreams[0]?.latestOutput ??
            activeWorkstreams[0]?.nextStep ??
            copy.atlasFallback
          }
          accent="primary"
          metrics={[
            { label: copy.summary.activeService, value: `${effectiveActiveServiceCount}` },
            { label: copy.completed, value: `${stats.completed}` },
            { label: copy.summary.workstreams, value: `${activeWorkstreams.length}` },
          ]}
          primaryCta={{ label: copy.documentsOutputs, onClick: () => openHub("documents") }}
          secondaryCta={{ label: copy.processHistory, onClick: () => openHub("history") }}
          icon={Workflow}
        />
      </section>

      <section className="grid gap-4 xl:grid-cols-3">
        <ServicesActionCard
          title={copy.requestsForms}
          value={copy.activeTopics.replace("{{count}}", String(workspace.requestCount))}
          description={copy.summary.requestsDescription}
          icon={FileText}
          onClick={() => openHub("forms")}
          openLabel={copy.openWorkspace}
        />
        <ServicesActionCard
          title={copy.documentsOutputs}
          value={copy.visibleOutputs.replace("{{count}}", String(workspace.deliverableCount))}
          description={copy.summary.documentsDescription}
          icon={Files}
          onClick={() => openHub("documents")}
          openLabel={copy.openWorkspace}
        />
        <ServicesActionCard
          title={copy.processHistory}
          value={copy.historyCount.replace("{{count}}", String(workspace.history.length))}
          description={copy.summary.historyDescription}
          icon={Workflow}
          onClick={() => openHub("history")}
          openLabel={copy.openWorkspace}
        />
      </section>

      <AtlasStackGrid columns="four">
        {[
          { label: copy.totalApplications, value: `${stats.total}`, tone: "neutral" as const },
          { label: copy.taskProgress, value: `${stats.tasksDone}/${stats.tasksTotal}`, tone: "primary" as const },
          { label: copy.activeService, value: `${effectiveActiveServiceCount}`, tone: "cobalt" as const },
          { label: copy.completed, value: `${stats.completed}`, tone: "success" as const },
        ].map((stat) => (
          <AtlasMetricSlab key={stat.label} label={stat.label} value={stat.value} tone={stat.tone} />
        ))}
      </AtlasStackGrid>

      <AtlasSectionPanel
        eyebrow={copy.performanceSummary}
        title={copy.performanceAndSummary}
        description={workspace.performance.summary}
      >
        <div className="grid gap-4 xl:grid-cols-3">
        <button
          type="button"
          onClick={() => openHub("forms")}
          className="portal-surface-secondary rounded-[1.45rem] p-5 text-left transition hover:border-primary/20"
        >
          <div className="flex items-start gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/12 text-primary">
              <Workflow className="h-5 w-5" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="atlas-kicker">{copy.requestsForms}</p>
              <h2 className="mt-2 text-lg font-semibold tracking-tight text-white">
                {copy.activeTopics.replace("{{count}}", String(workspace.requestCount))}
              </h2>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                {pendingThreadCount > 0
                  ? copy.summary.requestWaitingMessage.replace("{{count}}", String(pendingThreadCount))
                  : supportRequestCount > 0
                    ? copy.summary.supportRequestsWaiting.replace("{{count}}", String(supportRequestCount))
                    : prioritySubmissions.length > 0
                      ? copy.summary.activeRecordsMessage.replace("{{count}}", String(prioritySubmissions.length))
                      : copy.summary.noOpenThreads}
              </p>
              <div className="mt-4 inline-flex rounded-2xl border border-white/12 bg-background/30 px-4 py-2 text-sm text-white">
                {copy.requestsForms}
              </div>
            </div>
          </div>
        </button>

        <button
          type="button"
          onClick={() => openHub("documents")}
          className="portal-surface-secondary rounded-[1.45rem] p-5 text-left transition hover:border-primary/20"
        >
          <div className="flex items-start gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-500/12 text-emerald-300">
              <Files className="h-5 w-5" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="atlas-kicker">{copy.documentsOutputs}</p>
              <h2 className="mt-2 text-lg font-semibold tracking-tight text-white">
                {copy.visibleOutputs.replace("{{count}}", String(workspace.deliverableCount))}
              </h2>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                {latestDeliverable
                  ? latestDeliverable.summary
                  : copy.summary.visibleOutputEmpty}
              </p>
              <div className="mt-4 inline-flex rounded-2xl border border-white/12 bg-background/30 px-4 py-2 text-sm text-white">
                {copy.documentsOutputs}
              </div>
            </div>
          </div>
        </button>

        <button
          type="button"
          onClick={() => openHub("history")}
          className="portal-surface-secondary rounded-[1.45rem] p-5 text-left transition hover:border-primary/20"
        >
          <div className="flex items-start gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-cyan-500/12 text-cyan-300">
              <BarChart3 className="h-5 w-5" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="atlas-kicker">{copy.performanceSummary}</p>
              <h2 className="mt-2 text-lg font-semibold tracking-tight text-white">
                {copy.orderCount.replace("{{count}}", String(workspace.performance.ordersLast30Days))}
              </h2>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                {workspace.performance.summary}
              </p>
              <div className="mt-4 inline-flex rounded-2xl border border-white/12 bg-background/30 px-4 py-2 text-sm text-white">
                {copy.performanceAndSummary}
              </div>
            </div>
          </div>
        </button>
        </div>
      </AtlasSectionPanel>

      <AtlasTableShell
        eyebrow={copy.serviceList}
        title={copy.ongoingServices}
        description={copy.serviceListDescription}
        badge={
          supportRequestCount > 0
            ? copy.summary.supportRequestsWaiting.replace("{{count}}", String(supportRequestCount))
            : undefined
        }
      >
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative max-w-xs flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder={copy.summary.searchPlaceholder}
              className="pl-10"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder={copy.summary.statusPlaceholder} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{copy.summary.allStatuses}</SelectItem>
              <SelectItem value="submitted">{copy.statuses.submitted}</SelectItem>
              <SelectItem value="under_review">{copy.statuses.under_review}</SelectItem>
              <SelectItem value="approved">{copy.statuses.approved}</SelectItem>
              <SelectItem value="completed">{copy.statuses.completed}</SelectItem>
              <SelectItem value="rejected">{copy.statuses.rejected}</SelectItem>
              <SelectItem value="needs_correction">{copy.statuses.needs_correction}</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </AtlasTableShell>

      {filteredSubmissions.length === 0 ? (
        <div className="grid gap-4 xl:grid-cols-[1.15fr_0.85fr]">
          <AtlasEmptySurface
            title={submissions.length === 0 ? copy.summary.noServiceYet : copy.summary.noFilteredResults}
            description={
              submissions.length === 0
                ? supportRequestCount > 0
                  ? copy.summary.noSubmissionYetWithSupport
                  : copy.summary.noServiceYet
                : copy.summary.noFilteredResults
            }
            primaryAction={{ label: copy.summary.openSupportCenter, href: "/panel/support" }}
            secondaryAction={{ label: copy.requestsForms, href: "/panel/requests", variant: "outline" }}
            tone="primary"
          />

          <AtlasSectionPanel
            eyebrow={copy.atlasWorkingSection}
            title={copy.summary.serviceFlowTitle}
            description={copy.atlasFallback}
          >
            <div className="space-y-3">
              {activeWorkstreams.slice(0, 4).map((workstream) => (
                <AtlasInsightCard
                  key={workstream.key}
                  title={workstream.title}
                  description={workstream.nextStep}
                  badge={t(`workspace.statuses.${workstream.status}`)}
                  tone={getWorkstreamTone(workstream.status)}
                  className="rounded-[1.25rem]"
                />
              ))}
            </div>
          </AtlasSectionPanel>
        </div>
      ) : (
        <div className="space-y-6">
          {prioritySubmissions.length > 0 ? (
            <section className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="atlas-kicker">{copy.priorityApplications}</p>
                  <h2 className="mt-1 text-lg font-semibold tracking-tight text-white">
                    {copy.ongoingServices}
                  </h2>
                </div>
                <Badge variant="outline" className="border-white/10 bg-background/35">
                  {copy.activeRecordCount.replace("{{count}}", String(prioritySubmissions.length))}
                </Badge>
              </div>

              {prioritySubmissions.map((submission) => (
                <SubmissionCard
                  key={submission.id}
                  submission={submission}
                  tasks={tasksBySubmission[submission.id] ?? []}
                  selectedSubmission={selectedSubmission}
                  setSelectedSubmission={setSelectedSubmission}
                  locale={locale}
                  copy={copy}
                />
              ))}
            </section>
          ) : null}

          {completedSubmissions.length > 0 ? (
            <section className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="atlas-kicker">{copy.completedSection}</p>
                  <h2 className="mt-1 text-lg font-semibold tracking-tight text-white">
                    {copy.finishedServices}
                  </h2>
                </div>
                <Badge variant="outline" className="border-white/10 bg-background/35">
                  {copy.completed.replace("{{count}}", String(completedSubmissions.length))}
                </Badge>
              </div>

              {completedSubmissions.map((submission) => (
                <SubmissionCard
                  key={submission.id}
                  submission={submission}
                  tasks={tasksBySubmission[submission.id] ?? []}
                  selectedSubmission={selectedSubmission}
                  setSelectedSubmission={setSelectedSubmission}
                  locale={locale}
                  copy={copy}
                />
              ))}
            </section>
          ) : null}
        </div>
      )}

      {activeWorkstreams.length > 0 ? (
        <AtlasSectionPanel
          eyebrow={copy.launchWorkstreams}
          title={copy.atlasActiveAreas}
          description={copy.atlasFallback}
          badge={copy.activeRecordCount.replace("{{count}}", String(activeWorkstreams.length))}
        >
          <div className="grid gap-3 lg:grid-cols-2">
            {activeWorkstreams.slice(0, 6).map((workstream) => (
              <AtlasInsightCard
                key={workstream.key}
                title={workstream.title}
                description={workstream.latestOutput ?? workstream.adminAction}
                badge={t(`workspace.statuses.${workstream.status}`)}
                tone={getWorkstreamTone(workstream.status)}
                className="rounded-[1.35rem]"
              >
                <div className="flex flex-wrap gap-2">
                  <span className="rounded-full border border-white/8 bg-background/35 px-3 py-1.5 text-[11px] text-muted-foreground">
                    {workstream.ownerLabel}
                  </span>
                  {workstream.metrics.slice(0, 3).map((metric) => (
                    <span
                      key={`${workstream.key}-${metric.label}`}
                      className="rounded-full border border-white/8 bg-background/35 px-3 py-1.5 text-[11px] text-muted-foreground"
                    >
                      {metric.label}: {metric.value}
                    </span>
                  ))}
                </div>
              </AtlasInsightCard>
            ))}
          </div>
        </AtlasSectionPanel>
      ) : null}

      {standaloneTasks.length > 0 ? (
        <AtlasSectionPanel
          eyebrow={copy.standaloneTasks}
          title={copy.standaloneTasks}
          description={copy.summary.standaloneHint}
        >
          <div className="space-y-2">
            {standaloneTasks
              .sort((left, right) => left.sort_order - right.sort_order)
              .map((task) => {
                const standaloneStatusConfig: Record<string, { label: string; color: string; icon: typeof Clock }> = {
                  pending: { label: copy.statuses.pending, color: "text-amber-500 bg-amber-500/10", icon: Clock },
                  in_progress: { label: copy.statuses.in_progress, color: "text-blue-500 bg-blue-500/10", icon: ListChecks },
                  completed: { label: copy.statuses.completed, color: "text-emerald-500 bg-emerald-500/10", icon: CheckCircle2 },
                  blocked: { label: copy.statuses.blocked, color: "text-red-500 bg-red-500/10", icon: AlertTriangle },
                };
                const config = standaloneStatusConfig[task.task_status] ?? standaloneStatusConfig.pending;
                const Icon = config.icon;
                return (
                  <div key={task.id} className="portal-surface-list rounded-[1.35rem] p-3">
                    <div className="flex items-center gap-3">
                      <div className={cn("rounded-full p-1.5", config.color)}>
                        <Icon className="h-4 w-4" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium">{task.task_name}</p>
                        {task.notes ? (
                          <p className="truncate text-[10px] text-muted-foreground">{task.notes}</p>
                        ) : null}
                      </div>
                      <Badge className={cn("text-[10px]", config.color)}>{config.label}</Badge>
                    </div>
                  </div>
                );
              })}
          </div>
        </AtlasSectionPanel>
      ) : null}

      <CustomerRequestsHubModal
        workspace={workspace}
        open={hubOpen}
        onOpenChange={setHubOpen}
        initialTab={hubTab}
      />
    </div>
  );
}

function ServicesFocusPanel({
  kicker,
  title,
  summary,
  metrics,
  primaryCta,
  secondaryCta,
  icon: Icon,
  accent,
}: {
  kicker: string;
  title: string;
  summary: string;
  metrics: Array<{ label: string; value: string }>;
  primaryCta: { label: string; onClick: () => void };
  secondaryCta: { label: string; onClick: () => void };
  icon: typeof AlertTriangle;
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
      primaryAction={{ label: primaryCta.label, onClick: primaryCta.onClick }}
      secondaryAction={{ label: secondaryCta.label, onClick: secondaryCta.onClick, variant: "outline" }}
    />
  );
}

function ServicesActionCard({
  title,
  value,
  description,
  icon: Icon,
  onClick,
  openLabel,
}: {
  title: string;
  value: string;
  description: string;
  icon: typeof FileText;
  onClick: () => void;
  openLabel: string;
}) {
  return <AtlasActionCard title={title} value={value} description={description} icon={Icon} onClick={onClick} openLabel={openLabel} tone="primary" />;
}
