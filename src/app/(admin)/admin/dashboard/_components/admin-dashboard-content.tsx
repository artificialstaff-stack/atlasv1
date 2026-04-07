"use client";

import Link from "next/link";
import {
  ArrowRight,
  Boxes,
  Building2,
  ClipboardList,
  CircleAlert,
  Package,
  ShoppingCart,
  TrendingUp,
  UserPlus,
  Users,
} from "lucide-react";
import {
  getOrderStatusLabel,
  getTaskCategoryLabel,
  getTaskStatusLabel,
  type TaskCategory,
  type TaskStatus,
} from "@/types/enums";
import { formatCurrency, formatRelativeTime, getStatusVariant } from "@/lib/utils";
import {
  AtlasHeroBoard,
  AtlasInsightCard,
  AtlasSectionPanel,
} from "@/components/portal/atlas-widget-kit";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
} from "@/components/ui/card";
import {
  type FormSubmissionStatus,
  getFormSubmissionStatusLabel,
} from "@/lib/forms/types";
import { useI18n } from "@/i18n/provider";

interface AdminDashboardData {
  customerCount: number;
  activeOrderCount: number;
  leadCount: number;
  taskCounts: {
    pending: number;
    inProgress: number;
    blocked: number;
  };
  submissionCounts: {
    submitted: number;
    underReview: number;
    needsCorrection: number;
  };
  lowStockProducts: { id: string; name: string; sku: string; stock_us: number }[];
  recentOrders: {
    id: string;
    platform: string | null;
    status: string;
    total_amount: number | null;
    created_at: string;
  }[];
  recentLeads: {
    id: string;
    name: string;
    email: string;
    company_name: string | null;
    status: string;
    created_at: string;
  }[];
  dailyTasks: {
    id: string;
    task_name: string;
    task_category: string | null;
    task_status: string;
    updated_at: string;
  }[];
  recentSubmissions: {
    id: string;
    form_code: string;
    status: string;
    created_at: string;
  }[];
}

function SummaryCard({
  title,
  value,
  helper,
  icon: Icon,
  tone = "default",
}: {
  title: string;
  value: string;
  helper: string;
  icon: typeof Users;
  tone?: "default" | "primary" | "warning" | "success";
}) {
  return (
    <AtlasInsightCard
      eyebrow={title}
      title={value}
      description={helper}
      icon={Icon}
      tone={tone === "warning" ? "warning" : tone === "success" ? "success" : tone === "primary" ? "primary" : "neutral"}
      className="h-full rounded-[1.35rem]"
    />
  );
}

function CompactListCard({
  title,
  description,
  icon: Icon,
  children,
}: {
  title: string;
  description: string;
  icon: typeof Package;
  children: React.ReactNode;
}) {
  return (
    <AtlasSectionPanel eyebrow={description} title={title} description={description} className="h-full rounded-[1.35rem]">
      <div className="mb-4 flex items-center gap-2 text-sm text-primary">
        <Icon className="h-4 w-4" />
        <span>{title}</span>
      </div>
      <div className="space-y-2.5">{children}</div>
    </AtlasSectionPanel>
  );
}

export function AdminDashboardContent({ data }: { data: AdminDashboardData }) {
  const { t, locale } = useI18n();
  const copy = {
    title: t("admin.dashboard.title"),
    description: t("admin.dashboard.description"),
    intakeCenter: t("admin.dashboard.intakeCenter"),
    processes: t("admin.dashboard.processes"),
    customers: t("admin.dashboard.customers"),
    dailyTasksBadge: t("admin.dashboard.dailyTasksBadge"),
    focusRecords: t("admin.dashboard.focusRecords"),
    dailyTasksEmptyTitle: t("admin.dashboard.dailyTasksEmptyTitle"),
    dailyTasksEmptyDescription: t("admin.dashboard.dailyTasksEmptyDescription"),
    dailyTasksAction: t("admin.dashboard.dailyTasksAction"),
    dailyTasksActiveTitle: t("admin.dashboard.dailyTasksActiveTitle"),
    dailyTasksActiveDescription: t("admin.dashboard.dailyTasksActiveDescription"),
    stockAttention: t("admin.dashboard.stockAttention"),
    queue: t("admin.dashboard.queue"),
    inProgress: t("admin.dashboard.inProgress"),
    blocked: t("admin.dashboard.blocked"),
    intakeTitle: t("admin.dashboard.intakeTitle"),
    intakeButton: t("admin.dashboard.intakeButton"),
    intakeNew: t("admin.dashboard.intakeNew"),
    intakeReview: t("admin.dashboard.intakeReview"),
    intakeCorrection: t("admin.dashboard.intakeCorrection"),
    intakeEmpty: t("admin.dashboard.intakeEmpty"),
    signalTitle: t("admin.dashboard.signalTitle"),
    stockSignal: t("admin.dashboard.stockSignal"),
    leadSignal: t("admin.dashboard.leadSignal"),
    noStockCritical: t("admin.dashboard.noStockCritical"),
    leadWaiting: t("admin.dashboard.leadWaiting"),
    leadEmpty: t("admin.dashboard.leadEmpty"),
    orderTempoTitle: t("admin.dashboard.orderTempoTitle"),
    orderTempoEmpty: t("admin.dashboard.orderTempoEmpty"),
    totalCustomers: t("admin.dashboard.totalCustomers"),
    activeOrders: t("admin.dashboard.activeOrders"),
    openLeads: t("admin.dashboard.openLeads"),
    openIntake: t("admin.dashboard.openIntake"),
    summaryCustomerHelper: t("admin.dashboard.summaryCustomerHelper"),
    summaryOrderHelper: t("admin.dashboard.summaryOrderHelper"),
    summaryLeadHelper: t("admin.dashboard.summaryLeadHelper"),
    summaryIntakeHelper: t("admin.dashboard.summaryIntakeHelper"),
    recentOrdersTitle: t("admin.dashboard.recentOrdersTitle"),
    recentOrdersDescription: t("admin.dashboard.recentOrdersDescription"),
    recentOrdersEmpty: t("admin.dashboard.recentOrdersEmpty"),
    recentLeadsTitle: t("admin.dashboard.recentLeadsTitle"),
    recentLeadsDescription: t("admin.dashboard.recentLeadsDescription"),
    recentLeadsEmpty: t("admin.dashboard.recentLeadsEmpty"),
    stockRiskTitle: t("admin.dashboard.stockRiskTitle"),
    stockRiskDescription: t("admin.dashboard.stockRiskDescription"),
    stockRiskEmpty: t("admin.dashboard.stockRiskEmpty"),
    openInventory: t("admin.dashboard.openInventory"),
    noOrderData: t("admin.dashboard.noOrderData"),
    noOrderValue: t("admin.dashboard.noOrderValue"),
    noPlatform: t("admin.dashboard.noPlatform"),
    noLeadCompany: t("admin.dashboard.noLeadCompany"),
    noPlan: t("admin.dashboard.noPlan"),
    review: t("admin.dashboard.review"),
    correction: t("admin.dashboard.correction"),
    completed: t("admin.dashboard.completed"),
  } as const;
  const lowStockCount = data.lowStockProducts.length;
  const orderStatuses = data.recentOrders.reduce<Record<string, number>>((acc, order) => {
    acc[order.status] = (acc[order.status] ?? 0) + 1;
    return acc;
  }, {});
  const highFocusCount =
    data.taskCounts.pending +
    data.taskCounts.inProgress +
    data.taskCounts.blocked +
    data.submissionCounts.submitted +
    data.submissionCounts.needsCorrection;

  return (
    <div className="space-y-4">
      <AtlasHeroBoard
        eyebrow={copy.intakeCenter}
        title={copy.title}
        description={copy.description}
        badges={[copy.processes, copy.customers]}
        metrics={[
          { label: copy.totalCustomers, value: String(data.customerCount), tone: "primary" },
          { label: copy.activeOrders, value: String(data.activeOrderCount), tone: "success" },
          { label: copy.openLeads, value: String(data.leadCount), tone: "warning" },
          {
            label: copy.openIntake,
            value: String(
              data.submissionCounts.submitted +
                data.submissionCounts.underReview +
                data.submissionCounts.needsCorrection,
            ),
            tone: "cobalt",
          },
        ]}
        primaryAction={{ label: copy.intakeCenter, href: "/admin/forms" }}
        secondaryAction={{ label: copy.processes, href: "/admin/workflows", variant: "outline" }}
        tone="primary"
      >
        <div className="rounded-2xl border border-white/8 bg-black/15 px-4 py-3 text-sm leading-6 text-slate-200/90">
          {highFocusCount > 0
            ? `${highFocusCount} ${copy.focusRecords}`
            : copy.dailyTasksEmptyDescription}
        </div>
      </AtlasHeroBoard>

      <div className="grid gap-4 xl:grid-cols-[1.2fr_1fr_0.9fr]">
        <Card className="atlas-workbench-panel-strong rounded-[1.55rem]">
          <CardContent className="p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                  <div className="flex flex-wrap items-center gap-2">
                  <Badge className="border-0 bg-primary/15 text-primary">{copy.dailyTasksBadge}</Badge>
                  <Badge className="border-0 bg-white/10 text-white/70">
                    {highFocusCount} {copy.focusRecords}
                  </Badge>
                </div>
                <h2 className="mt-3 text-[1.35rem] font-semibold tracking-tight">
                  {data.dailyTasks.length > 0
                    ? copy.dailyTasksActiveTitle
                    : copy.dailyTasksEmptyTitle}
                </h2>
                <p className="mt-1.5 text-sm text-muted-foreground">
                  {data.dailyTasks.length > 0
                    ? copy.dailyTasksActiveDescription
                    : copy.dailyTasksEmptyDescription}
                </p>
              </div>
              <Button asChild size="sm" variant="outline" className="shrink-0">
                <Link href="/admin/workflows">{copy.dailyTasksAction}</Link>
              </Button>
            </div>

            <div className="mt-4 grid gap-2 sm:grid-cols-3">
              <div className="rounded-xl border border-white/8 bg-background/45 px-3 py-2.5">
                <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">{copy.queue}</p>
                <p className="mt-1 text-xl font-semibold">{data.taskCounts.pending}</p>
              </div>
              <div className="rounded-xl border border-white/8 bg-background/45 px-3 py-2.5">
                <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">{copy.inProgress}</p>
                <p className="mt-1 text-xl font-semibold">{data.taskCounts.inProgress}</p>
              </div>
              <div className="rounded-xl border border-amber-500/15 bg-amber-500/5 px-3 py-2.5">
                <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">{copy.blocked}</p>
                <p className="mt-1 text-xl font-semibold">{data.taskCounts.blocked}</p>
              </div>
            </div>

            <div className="mt-4 space-y-2">
              {data.dailyTasks.length > 0 ? (
                data.dailyTasks.map((task) => (
                  <div
                    key={task.id}
                    className="flex items-center justify-between gap-3 rounded-xl border border-white/8 bg-background/40 px-3 py-3"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{task.task_name}</p>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {task.task_category
                          ? getTaskCategoryLabel(task.task_category as TaskCategory, locale)
                          : t("common.general")} · {formatRelativeTime(task.updated_at)}
                      </p>
                    </div>
                    <Badge variant={getStatusVariant(task.task_status)} className="shrink-0">
                      {getTaskStatusLabel(task.task_status as TaskStatus, locale)}
                    </Badge>
                  </div>
                ))
              ) : (
                <div className="rounded-xl border border-dashed border-white/10 px-4 py-5 text-sm text-muted-foreground">
                  {t("admin.dashboard.dailyTasksEmptyDescription")}
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="atlas-workbench-panel rounded-[1.55rem]">
          <CardContent className="p-4">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <ClipboardList className="h-4 w-4 text-primary" />
                <p className="text-sm font-medium">{copy.intakeTitle}</p>
              </div>
              <Button asChild size="sm" variant="ghost">
                <Link href="/admin/forms">{copy.intakeButton}</Link>
              </Button>
            </div>

            <div className="mt-4 grid gap-2 sm:grid-cols-3">
              <div className="rounded-xl border border-white/8 bg-background/45 px-3 py-3">
                <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">{copy.intakeNew}</p>
                <p className="mt-1 text-xl font-semibold">{data.submissionCounts.submitted}</p>
              </div>
              <div className="rounded-xl border border-primary/15 bg-primary/5 px-3 py-3">
                <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">{copy.intakeReview}</p>
                <p className="mt-1 text-xl font-semibold">{data.submissionCounts.underReview}</p>
              </div>
              <div className="rounded-xl border border-amber-500/15 bg-amber-500/5 px-3 py-3">
                <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">{copy.intakeCorrection}</p>
                <p className="mt-1 text-xl font-semibold">{data.submissionCounts.needsCorrection}</p>
              </div>
            </div>

            <div className="mt-4 space-y-2">
              {data.recentSubmissions.length > 0 ? (
                data.recentSubmissions.map((submission) => (
                  <div
                    key={submission.id}
                    className="flex items-center justify-between gap-3 rounded-xl border border-white/8 bg-background/40 px-3 py-3"
                  >
                    <div>
                      <p className="text-sm font-medium">{submission.form_code}</p>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {formatRelativeTime(submission.created_at)}
                      </p>
                    </div>
                    <Badge
                      className="shrink-0"
                      variant={getStatusVariant(submission.status)}
                    >
                      {getFormSubmissionStatusLabel(submission.status as FormSubmissionStatus, locale)}
                    </Badge>
                  </div>
                ))
              ) : (
                <div className="rounded-xl border border-dashed border-white/10 px-4 py-5 text-sm text-muted-foreground">
                  {copy.intakeEmpty}
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <div className="grid gap-4">
          <Card className="atlas-workbench-panel rounded-[1.55rem]">
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <CircleAlert className="h-4 w-4 text-primary" />
                <p className="text-sm font-medium">{copy.signalTitle}</p>
              </div>
              <div className="mt-3 space-y-2">
              <div className="rounded-xl border border-amber-500/15 bg-amber-500/5 px-3 py-3">
                  <p className="text-xs text-muted-foreground">{copy.stockSignal}</p>
                  <p className="mt-1 text-sm font-medium">
                    {lowStockCount > 0
                      ? copy.stockAttention.replace("{{count}}", String(lowStockCount))
                      : copy.noStockCritical}
                  </p>
                </div>
                <div className="rounded-xl border border-white/8 bg-background/50 px-3 py-3">
                  <p className="text-xs text-muted-foreground">{copy.leadSignal}</p>
                  <p className="mt-1 text-sm font-medium">
                    {data.leadCount > 0
                      ? copy.leadWaiting.replace("{{count}}", String(data.leadCount))
                      : copy.leadEmpty}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="atlas-workbench-panel rounded-[1.55rem]">
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-primary" />
                <p className="text-sm font-medium">{copy.orderTempoTitle}</p>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                {Object.entries(orderStatuses).length > 0 ? (
                  Object.entries(orderStatuses).map(([status, count]) => (
                    <Badge key={status} variant={getStatusVariant(status)} className="px-2.5 py-1">
                      {getOrderStatusLabel(status as Parameters<typeof getOrderStatusLabel>[0], locale)}: {count}
                    </Badge>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground">{copy.orderTempoEmpty}</p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-4">
        <SummaryCard
          title={copy.totalCustomers}
          value={String(data.customerCount)}
          helper={copy.summaryCustomerHelper}
          icon={Users}
          tone="primary"
        />
        <SummaryCard
          title={copy.activeOrders}
          value={String(data.activeOrderCount)}
          helper={copy.summaryOrderHelper}
          icon={ShoppingCart}
          tone={data.activeOrderCount > 0 ? "success" : "default"}
        />
        <SummaryCard
          title={copy.openLeads}
          value={String(data.leadCount)}
          helper={copy.summaryLeadHelper}
          icon={UserPlus}
          tone={data.leadCount > 0 ? "warning" : "default"}
        />
        <SummaryCard
          title={copy.openIntake}
          value={String(
            data.submissionCounts.submitted +
              data.submissionCounts.underReview +
              data.submissionCounts.needsCorrection,
          )}
          helper={copy.summaryIntakeHelper}
          icon={ClipboardList}
          tone={
            data.submissionCounts.submitted + data.submissionCounts.needsCorrection > 0
              ? "warning"
              : "default"
          }
        />
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.05fr_1.05fr_0.9fr]">
        <CompactListCard
          title={copy.recentOrdersTitle}
          description={copy.recentOrdersDescription}
          icon={ShoppingCart}
        >
          {data.recentOrders.length > 0 ? (
            data.recentOrders.slice(0, 5).map((order) => (
              <div key={order.id} className="flex items-center justify-between rounded-xl border border-white/8 bg-background/40 px-3 py-3">
                <div>
                  <p className="text-sm font-medium">{order.platform ?? copy.noPlatform}</p>
                  <p className="text-xs text-muted-foreground">{formatRelativeTime(order.created_at)}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium">
                    {order.total_amount ? formatCurrency(order.total_amount) : copy.noOrderValue}
                  </p>
                  <Badge variant={getStatusVariant(order.status)} className="mt-1">
                    {getOrderStatusLabel(
                      order.status as Parameters<typeof getOrderStatusLabel>[0],
                      locale,
                    ) ?? order.status}
                  </Badge>
                </div>
              </div>
            ))
          ) : (
            <div className="rounded-xl border border-dashed border-white/10 px-4 py-5 text-center text-sm text-muted-foreground">
              {copy.recentOrdersEmpty}
            </div>
          )}
        </CompactListCard>

        <CompactListCard
          title={copy.recentLeadsTitle}
          description={copy.recentLeadsDescription}
          icon={Building2}
        >
          {data.recentLeads.length > 0 ? (
            data.recentLeads.slice(0, 5).map((lead) => (
              <div key={lead.id} className="flex items-center justify-between rounded-xl border border-white/8 bg-background/40 px-3 py-3">
                <div>
                  <p className="text-sm font-medium">{lead.name}</p>
                  <p className="text-xs text-muted-foreground">{lead.company_name ?? lead.email}</p>
                </div>
                <div className="text-right">
                  <Badge variant={getStatusVariant(lead.status)}>{lead.status}</Badge>
                  <p className="mt-1 text-xs text-muted-foreground">{formatRelativeTime(lead.created_at)}</p>
                </div>
              </div>
            ))
          ) : (
            <div className="rounded-xl border border-dashed border-white/10 px-4 py-5 text-center text-sm text-muted-foreground">
              {copy.recentLeadsEmpty}
            </div>
          )}
        </CompactListCard>

        <CompactListCard
          title={copy.stockRiskTitle}
          description={copy.stockRiskDescription}
          icon={Boxes}
        >
          {data.lowStockProducts.length > 0 ? (
            data.lowStockProducts.slice(0, 5).map((product) => (
              <div key={product.id} className="flex items-center justify-between rounded-xl border border-destructive/15 bg-destructive/5 px-3 py-3">
                <div>
                  <p className="text-sm font-medium">{product.name}</p>
                  <p className="text-xs font-mono text-muted-foreground">{product.sku}</p>
                </div>
                <Badge variant="destructive">{product.stock_us} adet</Badge>
              </div>
            ))
          ) : (
            <div className="rounded-xl border border-dashed border-white/10 px-4 py-5 text-center text-sm text-muted-foreground">
              {copy.stockRiskEmpty}
            </div>
          )}
          <Button asChild variant="outline" className="mt-1 w-full justify-between">
            <Link href="/admin/inventory">
              {copy.openInventory}
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </CompactListCard>
      </div>
    </div>
  );
}
