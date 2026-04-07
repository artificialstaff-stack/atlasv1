"use client";

import Link from "next/link";
import { useState } from "react";
import { useI18n } from "@/i18n/provider";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ModalWrapper } from "@/components/shared/modal-wrapper";
import { EmptyState } from "@/components/shared/empty-state";
import { PageHeader } from "@/components/shared/page-header";
import {
  TASK_CATEGORY,
  TASK_STATUS,
  getTaskStatusLabel,
  type TaskStatus,
  getTaskCategoryLabel,
  type TaskCategory,
} from "@/types/enums";
import { formatDate, getStatusVariant } from "@/lib/utils";
import { useCustomerList, useProcessTasks } from "@/features/queries";
import { useUpdateTaskStatus, useCreateTask } from "@/features/mutations";
import {
  AlertTriangle,
  ArrowRight,
  BriefcaseBusiness,
  Clock3,
  ListChecks,
  Plus,
  Search,
} from "lucide-react";
import type { Tables } from "@/types/database";

export default function AdminWorkflowsPage() {
  const { t, locale } = useI18n();
  const { data: tasksRaw = [], isLoading: loading } = useProcessTasks();
  const tasks = tasksRaw as Tables<"process_tasks">[];
  const { data: customers = [] } = useCustomerList();
  const updateTaskStatusMutation = useUpdateTaskStatus();
  const createTaskMutation = useCreateTask();

  const [selectedCustomer, setSelectedCustomer] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [statusView, setStatusView] = useState<string>("all");
  const [addModalOpen, setAddModalOpen] = useState(false);

  // Yeni görev state
  const [newTaskName, setNewTaskName] = useState("");
  const [newTaskCategory, setNewTaskCategory] = useState<string>("legal");
  const [newTaskCustomer, setNewTaskCustomer] = useState("");
  const [newTaskNotes, setNewTaskNotes] = useState("");

  function handleUpdateTaskStatus(taskId: string, newStatus: TaskStatus) {
    updateTaskStatusMutation.mutate({ taskId, status: newStatus });
  }

  function handleAddTask() {
    if (!newTaskCustomer || !newTaskName) {
      return;
    }

    // Sıra numarasını hesapla
    const customerTasks = tasks.filter((t) => t.user_id === newTaskCustomer);
    const maxOrder = customerTasks.reduce(
      (max, t) => Math.max(max, t.sort_order),
      0
    );

    createTaskMutation.mutate(
      {
        user_id: newTaskCustomer,
        task_name: newTaskName,
        task_category: newTaskCategory,
        notes: newTaskNotes || undefined,
        sort_order: maxOrder + 1,
      },
      {
        onSuccess: () => {
          setAddModalOpen(false);
          setNewTaskName("");
          setNewTaskNotes("");
        },
      },
    );
  }

  const customerIdSet = new Set(customers.map((customer) => customer.id));
  const customerMap = new Map(
    customers.map((customer) => [
      customer.id,
      {
        companyName: customer.company_name,
        fullName: `${customer.first_name} ${customer.last_name}`.trim(),
      },
    ])
  );

  const filteredTasks = tasks.filter((t) => {
    if (customers.length > 0 && !customerIdSet.has(t.user_id)) return false;
    if (selectedCustomer !== "all" && t.user_id !== selectedCustomer)
      return false;
    if (statusView !== "all" && t.task_status !== statusView) return false;
    if (search) {
      const s = search.toLowerCase();
      const companyName = customerMap.get(t.user_id)?.companyName?.toLowerCase() ?? "";
      const fullName = customerMap.get(t.user_id)?.fullName?.toLowerCase() ?? "";
      return (
        t.task_name.toLowerCase().includes(s) ||
        companyName.includes(s) ||
        fullName.includes(s) ||
        false
      );
    }
    return true;
  });

  const internalTasks = filteredTasks.filter((task) => task.visibility === "admin_internal");
  const customerVisibleTasks = filteredTasks.filter((task) => task.visibility !== "admin_internal");

  const stats = {
    total: internalTasks.length,
    pending: internalTasks.filter((task) => task.task_status === "pending").length,
    inProgress: internalTasks.filter((task) => task.task_status === "in_progress").length,
    blocked: internalTasks.filter((task) => task.task_status === "blocked").length,
    completed: internalTasks.filter((task) => task.task_status === "completed").length,
    customerVisible: customerVisibleTasks.length,
  };

  const focusTasks = internalTasks
    .filter((task) => task.task_status !== "completed")
    .slice(0, 4);

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("admin.workflows.title")}
        description={t("admin.workflows.description")}
      >
        <div className="flex flex-wrap items-center gap-2">
          <Button onClick={() => setAddModalOpen(true)} size="sm">
            <Plus className="mr-2 h-4 w-4" />
            {t("admin.workflows.newTask")}
          </Button>
          <Button asChild size="sm" variant="outline">
            <Link href="/admin/customers">{t("admin.workflows.customerList")}</Link>
          </Button>
        </div>
      </PageHeader>

      <div className="grid gap-4 xl:grid-cols-4">
        <Card className="atlas-workbench-panel rounded-[1.35rem]">
          <CardContent className="p-4">
            <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">{t("admin.workflows.stats.total")}</p>
            <p className="mt-1.5 text-[1.85rem] font-semibold tracking-tight">{stats.total}</p>
            <p className="mt-1 text-xs text-muted-foreground">{t("admin.workflows.stats.totalHelper")}</p>
          </CardContent>
        </Card>
        <Card className="atlas-workbench-panel rounded-[1.35rem] border-primary/20 bg-primary/5">
          <CardContent className="p-4">
            <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">{t("admin.workflows.stats.queue")}</p>
            <p className="mt-1.5 text-[1.85rem] font-semibold tracking-tight">{stats.pending}</p>
            <p className="mt-1 text-xs text-muted-foreground">{t("admin.workflows.stats.queueHelper")}</p>
          </CardContent>
        </Card>
        <Card className="atlas-workbench-panel rounded-[1.35rem] border-amber-500/20 bg-amber-500/5">
          <CardContent className="p-4">
            <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">{t("admin.workflows.stats.inProgress")}</p>
            <p className="mt-1.5 text-[1.85rem] font-semibold tracking-tight">{stats.inProgress}</p>
            <p className="mt-1 text-xs text-muted-foreground">{t("admin.workflows.stats.inProgressHelper")}</p>
          </CardContent>
        </Card>
        <Card className="atlas-workbench-panel rounded-[1.35rem] border-destructive/20 bg-destructive/5">
          <CardContent className="p-4">
            <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">{t("admin.workflows.stats.blocked")}</p>
            <p className="mt-1.5 text-[1.85rem] font-semibold tracking-tight">{stats.blocked}</p>
            <p className="mt-1 text-xs text-muted-foreground">{t("admin.workflows.stats.blockedHelper")}</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="atlas-workbench-panel flex flex-col gap-3 rounded-[1.25rem] p-3 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={t("admin.workflows.filters.searchPlaceholder")}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={selectedCustomer} onValueChange={setSelectedCustomer}>
          <SelectTrigger className="w-[220px]">
            <SelectValue placeholder={t("admin.workflows.filters.selectCustomer")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("admin.workflows.filters.allCustomers")}</SelectItem>
            {customers.map((c) => (
              <SelectItem key={c.id} value={c.id}>
                {c.company_name} — {c.first_name} {c.last_name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex flex-wrap gap-2">
        {[
          { value: "all", label: t("admin.workflows.filters.all") },
          { value: "pending", label: t("admin.workflows.filters.pending") },
          { value: "in_progress", label: t("admin.workflows.filters.inProgress") },
          { value: "blocked", label: t("admin.workflows.filters.blocked") },
          { value: "completed", label: t("admin.workflows.filters.completed") },
        ].map((item) => (
          <Button
            key={item.value}
            variant={statusView === item.value ? "default" : "outline"}
            size="sm"
            onClick={() => setStatusView(item.value)}
          >
            {item.label}
          </Button>
        ))}
      </div>

      <div className="grid items-start gap-4 xl:grid-cols-[1.45fr_0.85fr]">
        <Card className="atlas-workbench-panel-strong rounded-[1.55rem]">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">{t("admin.workflows.table.title")}</CardTitle>
            <CardDescription>
              {t("admin.workflows.table.description")}
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            {loading ? (
              <p className="py-12 text-center text-muted-foreground">{t("admin.workflows.table.loading")}</p>
            ) : internalTasks.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("admin.workflows.table.index")}</TableHead>
                    <TableHead>{t("admin.workflows.table.customer")}</TableHead>
                    <TableHead>{t("admin.workflows.table.task")}</TableHead>
                    <TableHead>{t("admin.workflows.table.category")}</TableHead>
                    <TableHead>{t("admin.workflows.table.layer")}</TableHead>
                    <TableHead>{t("admin.workflows.table.status")}</TableHead>
                    <TableHead>{t("admin.workflows.table.completion")}</TableHead>
                    <TableHead>{t("admin.workflows.table.action")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {internalTasks.map((task, idx) => (
                    <TableRow key={task.id}>
                      <TableCell className="text-sm text-muted-foreground">{idx + 1}</TableCell>
                        <TableCell>
                          <p className="text-sm font-medium">{customerMap.get(task.user_id)?.companyName ?? t("admin.workflows.table.noCustomer")}</p>
                          <p className="text-xs text-muted-foreground">
                            {customerMap.get(task.user_id)?.fullName ?? ""}
                          </p>
                        </TableCell>
                      <TableCell>
                        <p className="text-sm font-medium">{task.task_name}</p>
                        {task.notes && (
                          <p className="line-clamp-1 text-xs text-muted-foreground">{task.notes}</p>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {getTaskCategoryLabel(task.task_category as TaskCategory, locale) ??
                            task.task_category ??
                            t("admin.workflows.table.noCustomer")}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {task.task_kind === "followup"
                            ? t("admin.workflows.table.taskKindFollowup")
                            : t("admin.workflows.table.taskKindInternal")}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={getStatusVariant(task.task_status)}>
                          {getTaskStatusLabel(task.task_status as TaskStatus, locale) ?? task.task_status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {task.completed_at ? formatDate(task.completed_at) : t("admin.workflows.table.noCompletion")}
                      </TableCell>
                      <TableCell>
                        <Select
                          value={task.task_status}
                          onValueChange={(val) => handleUpdateTaskStatus(task.id, val as TaskStatus)}
                        >
                          <SelectTrigger className="h-8 w-[140px]">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {(Object.values(TASK_STATUS) as TaskStatus[]).map((val) => (
                              <SelectItem key={val} value={val}>
                                {getTaskStatusLabel(val, locale)}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="px-6 py-8">
                <div className="rounded-2xl border border-dashed border-white/10 bg-background/35 p-6">
                  <EmptyState
                    icon={<ListChecks className="h-10 w-10" />}
                    title={t("admin.workflows.table.emptyTitle")}
                    description={t("admin.workflows.table.emptyDescription")}
                  />
                  <div className="mt-4 flex flex-wrap justify-center gap-2">
                    <Button size="sm" onClick={() => setAddModalOpen(true)}>
                      {t("admin.workflows.newTask")}
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => setStatusView("all")}>
                      {t("admin.workflows.table.resetView")}
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <div className="grid gap-4">
          <Card className="atlas-workbench-panel rounded-[1.55rem]">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">{t("admin.workflows.focus.title")}</CardTitle>
              <CardDescription>
                {t("admin.workflows.focus.description")}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2.5">
              {focusTasks.length > 0 ? (
                focusTasks.map((task) => (
                  <div
                    key={task.id}
                    className="rounded-xl border border-white/8 bg-background/40 px-3 py-3"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">{task.task_name}</p>
                          <p className="mt-0.5 text-xs text-muted-foreground">
                            {customerMap.get(task.user_id)?.companyName ?? t("admin.workflows.focus.noCustomer")}
                          </p>
                      </div>
                      <Badge variant={getStatusVariant(task.task_status)}>
                        {getTaskStatusLabel(task.task_status as TaskStatus, locale) ?? task.task_status}
                      </Badge>
                    </div>
                  </div>
                ))
              ) : (
                <div className="rounded-xl border border-dashed border-white/10 px-4 py-5 text-sm text-muted-foreground">
                  {t("admin.workflows.focus.empty")}
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="atlas-workbench-panel rounded-[1.55rem]">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">{t("admin.workflows.signals.title")}</CardTitle>
              <CardDescription>
                {t("admin.workflows.signals.description")}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2.5">
              <div className="flex items-center justify-between rounded-xl border border-white/8 bg-background/40 px-3 py-3">
                <div className="flex items-center gap-2">
                  <Clock3 className="h-4 w-4 text-primary" />
                  <span className="text-sm">{t("admin.workflows.signals.queuePressure")}</span>
                </div>
                <span className="text-sm font-semibold">{stats.pending}</span>
              </div>
              <div className="flex items-center justify-between rounded-xl border border-amber-500/15 bg-amber-500/5 px-3 py-3">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-amber-400" />
                  <span className="text-sm">{t("admin.workflows.signals.blockedItems")}</span>
                </div>
                <span className="text-sm font-semibold">{stats.blocked}</span>
              </div>
              <div className="flex items-center justify-between rounded-xl border border-white/8 bg-background/40 px-3 py-3">
                <div className="flex items-center gap-2">
                  <BriefcaseBusiness className="h-4 w-4 text-primary" />
                  <span className="text-sm">{t("admin.workflows.signals.completed")}</span>
                </div>
                <span className="text-sm font-semibold">{stats.completed}</span>
              </div>
              <div className="flex items-center justify-between rounded-xl border border-sky-500/15 bg-sky-500/5 px-3 py-3">
                <div className="flex items-center gap-2">
                  <BriefcaseBusiness className="h-4 w-4 text-sky-300" />
                  <span className="text-sm">{t("admin.workflows.signals.customerVisible")}</span>
                </div>
                <span className="text-sm font-semibold">{stats.customerVisible}</span>
              </div>
              <Button asChild variant="outline" className="w-full justify-between">
                <Link href="/admin/customers">
                  {t("admin.workflows.signals.customerWorkbench")}
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Yeni Görev Modal */}
      <ModalWrapper
        open={addModalOpen}
        onOpenChange={setAddModalOpen}
        title={t("admin.workflows.modal.title")}
        description={t("admin.workflows.modal.description")}
        size="default"
      >
        <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">{t("admin.workflows.modal.customer")}</label>
                <Select value={newTaskCustomer} onValueChange={setNewTaskCustomer}>
                  <SelectTrigger>
                <SelectValue placeholder={t("admin.workflows.modal.customerPlaceholder")} />
              </SelectTrigger>
              <SelectContent>
                {customers.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.company_name} — {c.first_name} {c.last_name}
                    </SelectItem>
                  ))}
                </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">{t("admin.workflows.modal.taskName")}</label>
            <Input
              value={newTaskName}
              onChange={(e) => setNewTaskName(e.target.value)}
              placeholder={t("admin.workflows.modal.taskNamePlaceholder")}
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">{t("admin.workflows.modal.category")}</label>
            <Select value={newTaskCategory} onValueChange={setNewTaskCategory}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(Object.values(TASK_CATEGORY) as TaskCategory[]).map((val) => (
                  <SelectItem key={val} value={val}>
                    {getTaskCategoryLabel(val, locale)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">{t("admin.workflows.modal.notes")}</label>
            <Textarea
              value={newTaskNotes}
              onChange={(e) => setNewTaskNotes(e.target.value)}
              placeholder={t("admin.workflows.modal.notesPlaceholder")}
              rows={3}
            />
          </div>
          <Button className="w-full" onClick={handleAddTask}>
            {t("admin.workflows.modal.create")}
          </Button>
          <Button asChild variant="ghost" className="w-full justify-between">
            <Link href="/admin/customers">
              {t("admin.workflows.modal.backToWorkbench")}
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </div>
      </ModalWrapper>
    </div>
  );
}
