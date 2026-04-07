"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import Link from "next/link";
import { useI18n } from "@/i18n/provider";
import {
  ArrowUpRight,
  FolderOpen,
  Loader2,
  Send,
  ShieldAlert,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { WorkspaceModalShell, type WorkspaceRailTab } from "@/components/hub/workspace-modal-shell";
import { AtlasEmptySurface, AtlasInsightCard, AtlasStackGrid } from "@/components/portal/atlas-widget-kit";
import {
  type AdminHubModalTab,
  type CustomerWorkspaceViewModel,
  type CustomerWorkstreamKey,
} from "@/lib/customer-workspace/types";
import type { Tables } from "@/types/database";
import {
  getTaskCategoryLabel,
  getTaskStatusLabel,
  type TaskCategory,
  type TaskStatus,
} from "@/types/enums";

type MissingField = {
  key: string;
  label: string;
  description: string;
};

type WorkspaceResponse = {
  workspace?: CustomerWorkspaceViewModel;
  error?: string;
};

type SelectedAdminState = Record<AdminHubModalTab, string | null>;

function buildSelectedState(workspace: CustomerWorkspaceViewModel | null, adminTasks: Tables<"process_tasks">[]): SelectedAdminState {
  return {
    waiting_on_customer: workspace?.actionItems[0]?.id ?? null,
    sent_to_customer: workspace?.submittedForms[0]?.id ?? null,
    internal_operations: adminTasks[0]?.id ?? null,
    deliverables: workspace?.deliverables[0]?.id ?? null,
  };
}

export function AdminOperationsHubModal({
  open,
  onOpenChange,
  customerId,
  customerName,
  adminTasks,
  missingFields,
  loadingMissingFields,
  requestingMissingFields,
  onRequestMissingFields,
  requestableForms,
  selectedFormCode,
  onSelectedFormCodeChange,
  requestMessage,
  onRequestMessageChange,
  requestingForm,
  onRequestForm,
  initialTab = "waiting_on_customer",
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  customerId: string;
  customerName: string;
  adminTasks: Tables<"process_tasks">[];
  missingFields: MissingField[];
  loadingMissingFields: boolean;
  requestingMissingFields: boolean;
  onRequestMissingFields: () => Promise<void>;
  requestableForms: Array<{ code: string; title: string }>;
  selectedFormCode: string;
  onSelectedFormCodeChange: (value: string) => void;
  requestMessage: string;
  onRequestMessageChange: (value: string) => void;
  requestingForm: boolean;
  onRequestForm: () => Promise<void>;
  initialTab?: AdminHubModalTab;
}) {
  const { t, locale, formatDate } = useI18n();
  const [workspace, setWorkspace] = useState<CustomerWorkspaceViewModel | null>(null);
  const [loadingWorkspace, setLoadingWorkspace] = useState(false);
  const [tab, setTab] = useState<AdminHubModalTab>(initialTab);
  const [selected, setSelected] = useState<SelectedAdminState>(() => buildSelectedState(null, adminTasks));
  const [title, setTitle] = useState("");
  const [summary, setSummary] = useState("");
  const [artifactUrl, setArtifactUrl] = useState("");
  const [artifactLabel, setArtifactLabel] = useState("");
  const [workstreamKey, setWorkstreamKey] = useState<CustomerWorkstreamKey>("catalog_intake");
  const [submittingDeliverable, setSubmittingDeliverable] = useState(false);

  const workstreamOptions = useMemo(
    () =>
      ([
        "company_setup",
        "catalog_intake",
        "website",
        "marketplaces",
        "ads",
        "social",
        "seo",
        "fulfillment",
      ] as CustomerWorkstreamKey[]).map((value) => ({
        value,
        label: t(`workspace.workstreams.${value}.title`),
      })),
    [locale, t],
  );

  async function loadWorkspace() {
    setLoadingWorkspace(true);
    try {
      const response = await fetch(`/api/admin/customers/${customerId}/workspace`, {
        cache: "no-store",
      });
      const payload = (await response.json().catch(() => null)) as WorkspaceResponse | null;
      if (!response.ok || !payload?.workspace) {
        throw new Error(payload?.error ?? t("admin.operationsHub.loadError"));
      }
      setWorkspace(payload.workspace);
      setSelected(buildSelectedState(payload.workspace, adminTasks));
    } catch (error) {
      toast.error(t("admin.operationsHub.loadErrorTitle"), {
        description: error instanceof Error ? error.message : t("admin.operationsHub.loadErrorDescription"),
      });
    } finally {
      setLoadingWorkspace(false);
    }
  }

  async function handleCreateDeliverable() {
    const trimmedTitle = title.trim();
    const trimmedSummary = summary.trim();
    if (!trimmedTitle || !trimmedSummary) {
      toast.error(t("admin.operationsHub.deliverableMissing"));
      return;
    }

    setSubmittingDeliverable(true);
    try {
      const response = await fetch(`/api/admin/customers/${customerId}/deliverables`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: trimmedTitle,
          summary: trimmedSummary,
          workstreamKey,
          artifactUrl: artifactUrl.trim() || null,
          artifactLabel: artifactLabel.trim() || null,
        }),
      });
      const payload = (await response.json().catch(() => null)) as { error?: string } | null;
      if (!response.ok) {
        throw new Error(payload?.error ?? t("admin.operationsHub.deliverableSaveError"));
      }

      toast.success(t("admin.operationsHub.deliverableSaved"));
      setTitle("");
      setSummary("");
      setArtifactUrl("");
      setArtifactLabel("");
      await loadWorkspace();
    } catch (error) {
      toast.error(t("admin.operationsHub.deliverableAddError"), {
        description: error instanceof Error ? error.message : t("admin.operationsHub.context.unexpectedError"),
      });
    } finally {
      setSubmittingDeliverable(false);
    }
  }

  useEffect(() => {
    if (!open) return;
    setTab(initialTab);
    void loadWorkspace();
  }, [customerId, initialTab, open]);

  const waitingOnCustomer = useMemo(() => workspace?.actionItems ?? [], [workspace]);

  const tabs = useMemo<WorkspaceRailTab[]>(
    () => [
      {
        value: "waiting_on_customer",
        label: t("admin.operationsHub.tabs.waitingOnCustomer.label"),
        hint: t("admin.operationsHub.tabs.waitingOnCustomer.hint"),
        count: waitingOnCustomer.length,
        icon: ShieldAlert,
      },
      {
        value: "sent_to_customer",
        label: t("admin.operationsHub.tabs.sentToCustomer.label"),
        hint: t("admin.operationsHub.tabs.sentToCustomer.hint"),
        count: workspace?.submittedForms.length ?? 0,
        icon: Send,
      },
      {
        value: "internal_operations",
        label: t("admin.operationsHub.tabs.internalOperations.label"),
        hint: t("admin.operationsHub.tabs.internalOperations.hint"),
        count: adminTasks.length,
        icon: Sparkles,
      },
      {
        value: "deliverables",
        label: t("admin.operationsHub.tabs.deliverables.label"),
        hint: t("admin.operationsHub.tabs.deliverables.hint"),
        count: workspace?.deliverables.length ?? 0,
        icon: FolderOpen,
      },
    ],
    [adminTasks.length, t, waitingOnCustomer.length, workspace],
  );

  return (
    <WorkspaceModalShell
      open={open}
      onOpenChange={onOpenChange}
      workspacePreset="dense"
      title={t("admin.operationsHub.title")}
      description={t("admin.operationsHub.description", { customerName })}
      badge={t("admin.operationsHub.badge")}
      status={workspace?.launchStageLabel ?? t("admin.operationsHub.context.workspaceSummary")}
      meta={[
        customerName,
        t("admin.operationsHub.context.internalTaskCount", { count: adminTasks.length }),
        t("admin.operationsHub.context.missingFieldCount", { count: missingFields.length }),
      ]}
      metrics={[
        { label: t("admin.operationsHub.tabs.waitingOnCustomer.label"), value: String(waitingOnCustomer.length), tone: waitingOnCustomer.length > 0 ? "warning" : "default" },
        { label: t("admin.operationsHub.tabs.sentToCustomer.label"), value: String(workspace?.submittedForms.length ?? 0), tone: "primary" },
        { label: t("admin.operationsHub.tabs.internalOperations.label"), value: String(adminTasks.length) },
        { label: t("admin.operationsHub.tabs.deliverables.label"), value: String(workspace?.deliverables.length ?? 0), tone: "success" },
      ]}
      tabs={tabs}
      activeTab={tab}
      onTabChange={(value) => setTab(value as AdminHubModalTab)}
      topActions={
        <>
          <Button variant="outline" className="rounded-2xl border-white/10 bg-white/[0.03] text-slate-200 hover:bg-white/[0.06]" onClick={() => void loadWorkspace()}>
            {t("admin.operationsHub.refresh")}
          </Button>
          <Button asChild className="rounded-2xl">
            <Link href={`/admin/customers/${customerId}`}>{t("admin.operationsHub.customerScreen")}</Link>
          </Button>
        </>
      }
      mainContent={
        loadingWorkspace ? (
          <div className="rounded-[1.4rem] border border-white/8 bg-white/[0.03] p-8 text-sm text-muted-foreground">
            <Loader2 className="mb-3 h-4 w-4 animate-spin" />
            {t("admin.operationsHub.loading")}
          </div>
        ) : workspace ? (
          renderMainPane({
            tab,
            workspace,
            adminTasks,
            selected,
            locale,
            t,
            formatDate,
            onSelect: (id) => setSelected((current) => ({ ...current, [tab]: id })),
          })
        ) : (
          <div className="rounded-[1.4rem] border border-dashed border-white/10 bg-white/[0.03] p-8 text-sm text-muted-foreground">
            {t("admin.operationsHub.loadError")}
          </div>
        )
      }
      contextContent={renderAdminContext({
        tab,
        workspace,
        t,
        missingFields,
        loadingMissingFields,
        requestingMissingFields,
        onRequestMissingFields,
        requestableForms,
        selectedFormCode,
        onSelectedFormCodeChange,
        requestMessage,
        onRequestMessageChange,
        requestingForm,
        onRequestForm,
        title,
        onTitleChange: setTitle,
        summary,
        onSummaryChange: setSummary,
        artifactUrl,
        onArtifactUrlChange: setArtifactUrl,
        artifactLabel,
        onArtifactLabelChange: setArtifactLabel,
        workstreamKey,
        onWorkstreamKeyChange: setWorkstreamKey,
        workstreamOptions,
        submittingDeliverable,
        onCreateDeliverable: handleCreateDeliverable,
      })}
    />
  );
}

function renderMainPane({
  tab,
  workspace,
  adminTasks,
  selected,
  locale,
  t,
  formatDate,
  onSelect,
}: {
  tab: AdminHubModalTab;
  workspace: CustomerWorkspaceViewModel;
  adminTasks: Tables<"process_tasks">[];
  selected: SelectedAdminState;
  locale: "tr" | "en";
  t: (key: string, params?: Record<string, string | number>) => string;
  formatDate: (value: Date | string | number, options?: Intl.DateTimeFormatOptions) => string;
  onSelect: (id: string) => void;
}) {
  if (tab === "waiting_on_customer") {
    return (
      <AdminEntityWorkspace
        kicker={t("admin.operationsHub.tabs.waitingOnCustomer.label")}
        title={t("admin.operationsHub.tabs.waitingOnCustomer.title")}
        description={t("admin.operationsHub.tabs.waitingOnCustomer.description")}
        list={workspace.actionItems}
        selectedId={selected.waiting_on_customer}
        onSelect={onSelect}
        empty={t("admin.operationsHub.tabs.waitingOnCustomer.empty")}
        emptyDescription={t("admin.operationsHub.tabs.waitingOnCustomer.description")}
        renderListItem={(item, active) => (
          <HubListItem
            active={active}
            title={item.title}
            summary={item.summary}
            metaLeft={item.sourceLabel}
            metaRight={item.status}
            tone={item.status === "blocked" ? "warning" : "primary"}
          />
        )}
        renderDetail={(item) => (
          <DetailBlock
            title={item.title}
            summary={item.summary}
            badges={[
              { label: item.sourceLabel, tone: "primary" },
              { label: item.status, tone: item.status === "blocked" ? "warning" : "default" },
            ]}
            tiles={[
              { label: t("admin.operationsHub.detail.linkedArea"), value: item.workstreamLabel ?? t("admin.operationsHub.detail.generalTopic") },
              { label: t("admin.operationsHub.detail.createdAt"), value: formatDate(item.createdAt) },
            ]}
            body={t("admin.operationsHub.detail.waitingBody")}
            href={item.href}
            hrefLabel={t("admin.operationsHub.context.customerView")}
          />
        )}
      />
    );
  }

  if (tab === "sent_to_customer") {
    return (
      <AdminEntityWorkspace
        kicker={t("admin.operationsHub.tabs.sentToCustomer.label")}
        title={t("admin.operationsHub.tabs.sentToCustomer.title")}
        description={t("admin.operationsHub.tabs.sentToCustomer.description")}
        list={workspace.submittedForms}
        selectedId={selected.sent_to_customer}
        onSelect={onSelect}
        empty={t("admin.operationsHub.tabs.sentToCustomer.empty")}
        emptyDescription={t("admin.operationsHub.tabs.sentToCustomer.description")}
        renderListItem={(item, active) => (
          <HubListItem
            active={active}
            title={item.title}
            summary={item.summary}
            metaLeft={item.formCode}
            metaRight={item.status}
            tone="primary"
          />
        )}
        renderDetail={(item) => (
          <DetailBlock
            title={item.title}
            summary={item.summary}
            badges={[
              { label: item.formCode, tone: "default" },
              { label: item.status, tone: "primary" },
            ]}
            tiles={[
              { label: t("admin.operationsHub.detail.sentAt"), value: formatDate(item.submittedAt) },
              { label: t("admin.operationsHub.detail.updatedAt"), value: formatDate(item.updatedAt) },
            ]}
            note={item.adminNotes ?? undefined}
            noteLabel={t("admin.operationsHub.detail.atlasNote")}
            href={item.href}
            hrefLabel={t("admin.customerDetail.openCustomerDetail")}
          />
        )}
      />
    );
  }

  if (tab === "internal_operations") {
    return (
      <AdminEntityWorkspace
        kicker={t("admin.operationsHub.tabs.internalOperations.label")}
        title={t("admin.operationsHub.tabs.internalOperations.title")}
        description={t("admin.operationsHub.tabs.internalOperations.description")}
        list={adminTasks}
        selectedId={selected.internal_operations}
        onSelect={onSelect}
        empty={t("admin.operationsHub.tabs.internalOperations.empty")}
        emptyDescription={t("admin.operationsHub.tabs.internalOperations.description")}
        renderListItem={(item, active) => (
          <HubListItem
            active={active}
            title={item.task_name}
            summary={item.notes ?? t("admin.operationsHub.detail.noOperationNote")}
            metaLeft={getTaskCategoryLabel(item.task_category as TaskCategory, locale) ?? item.task_category ?? t("admin.customerDetail.noCategory")}
            metaRight={getTaskStatusLabel(item.task_status as TaskStatus, locale) ?? item.task_status}
            tone={item.task_status === "blocked" ? "warning" : "default"}
          />
        )}
        renderDetail={(item) => (
          <DetailBlock
            title={item.task_name}
            summary={item.notes ?? t("admin.operationsHub.detail.noTaskNote")}
            badges={[
              {
                label: getTaskCategoryLabel(item.task_category as TaskCategory, locale) ?? item.task_category ?? t("admin.customerDetail.noCategory"),
                tone: "default",
              },
              {
                label: getTaskStatusLabel(item.task_status as TaskStatus, locale) ?? item.task_status,
                tone: item.task_status === "blocked" ? "warning" : "primary",
              },
            ]}
            tiles={[
              { label: t("admin.operationsHub.detail.updateAt"), value: formatDate(item.updated_at) },
              { label: t("admin.operationsHub.detail.completedAt"), value: item.completed_at ? formatDate(item.completed_at) : t("admin.operationsHub.detail.notYet") },
            ]}
            body={t("admin.operationsHub.detail.internalBody")}
          />
        )}
      />
    );
  }

  return (
    <AdminEntityWorkspace
      kicker={t("admin.operationsHub.tabs.deliverables.label")}
      title={t("admin.operationsHub.tabs.deliverables.title")}
      description={t("admin.operationsHub.tabs.deliverables.description")}
      list={workspace.deliverables}
      selectedId={selected.deliverables}
      onSelect={onSelect}
      empty={t("admin.operationsHub.tabs.deliverables.empty")}
      emptyDescription={t("admin.operationsHub.tabs.deliverables.description")}
      renderListItem={(item, active) => (
        <HubListItem
          active={active}
          title={item.title}
          summary={item.summary}
          metaLeft={item.deliverableType}
          metaRight={item.status}
          tone="success"
        />
      )}
      renderDetail={(item) => (
        <DetailBlock
          title={item.title}
          summary={item.summary}
          badges={[
            { label: item.deliverableType, tone: "success" },
            { label: item.status, tone: "default" },
          ]}
          tiles={[
            { label: t("common.createdAt"), value: formatDate(item.createdAt) },
            { label: t("admin.operationsHub.detail.approvedAt"), value: item.approvedAt ? formatDate(item.approvedAt) : t("admin.operationsHub.detail.notWaiting") },
          ]}
          href={item.artifactUrl ?? undefined}
          hrefLabel={item.artifactLabel ?? t("admin.operationsHub.detail.openOutput")}
        />
      )}
    />
  );
}

function renderAdminContext({
  tab,
  workspace,
  t,
  missingFields,
  loadingMissingFields,
  requestingMissingFields,
  onRequestMissingFields,
  requestableForms,
  selectedFormCode,
  onSelectedFormCodeChange,
  requestMessage,
  onRequestMessageChange,
  requestingForm,
  onRequestForm,
  title,
  onTitleChange,
  summary,
  onSummaryChange,
  artifactUrl,
  onArtifactUrlChange,
  artifactLabel,
  onArtifactLabelChange,
  workstreamKey,
  onWorkstreamKeyChange,
  workstreamOptions,
  submittingDeliverable,
  onCreateDeliverable,
}: {
  tab: AdminHubModalTab;
  workspace: CustomerWorkspaceViewModel | null;
  t: (key: string, params?: Record<string, string | number>) => string;
  missingFields: MissingField[];
  loadingMissingFields: boolean;
  requestingMissingFields: boolean;
  onRequestMissingFields: () => Promise<void>;
  requestableForms: Array<{ code: string; title: string }>;
  selectedFormCode: string;
  onSelectedFormCodeChange: (value: string) => void;
  requestMessage: string;
  onRequestMessageChange: (value: string) => void;
  requestingForm: boolean;
  onRequestForm: () => Promise<void>;
  title: string;
  onTitleChange: (value: string) => void;
  summary: string;
  onSummaryChange: (value: string) => void;
  artifactUrl: string;
  onArtifactUrlChange: (value: string) => void;
  artifactLabel: string;
  onArtifactLabelChange: (value: string) => void;
  workstreamKey: CustomerWorkstreamKey;
  onWorkstreamKeyChange: (value: CustomerWorkstreamKey) => void;
  workstreamOptions: Array<{ value: CustomerWorkstreamKey; label: string }>;
  submittingDeliverable: boolean;
  onCreateDeliverable: () => Promise<void>;
}) {
  return (
    <div className="space-y-4">
      <ContextCard
        title={t("admin.operationsHub.context.workspaceSummary")}
        body={
          workspace
            ? `${workspace.launchStageLabel} · ${workspace.activeWorkstreamCount} ${t("admin.customerDetail.activeArea")} · ${workspace.blockedWorkstreamCount} ${t("admin.customerDetail.blockedLabel")}`
            : t("admin.operationsHub.context.workspaceLoading")
        }
        chips={workspace ? [
          t("admin.operationsHub.context.requestCount", { count: workspace.requestCount }),
          t("admin.operationsHub.context.deliverableCount", { count: workspace.deliverableCount }),
        ] : undefined}
      />
      {(tab === "waiting_on_customer" || tab === "sent_to_customer") && (
        <div className="rounded-[1.4rem] border border-white/8 bg-white/[0.03] p-4">
          <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">{t("admin.operationsHub.context.customerActions")}</p>
          {tab === "waiting_on_customer" ? (
            <div className="mt-4 space-y-3">
              <div className="rounded-2xl border border-white/8 bg-background/25 p-3">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-medium text-white">{t("admin.operationsHub.context.missingFields")}</p>
                  <Badge variant="outline" className="border-white/10 bg-white/[0.03]">
                    {loadingMissingFields ? "..." : t("admin.operationsHub.context.fieldCount", { count: missingFields.length })}
                  </Badge>
                </div>
                <div className="mt-3 space-y-2">
                  {loadingMissingFields ? (
                    <p className="text-sm text-muted-foreground">{t("admin.operationsHub.context.readingMissingFields")}</p>
                  ) : missingFields.length > 0 ? (
                    missingFields.slice(0, 6).map((field) => (
                      <div key={field.key} className="rounded-xl border border-white/8 bg-background/30 px-3 py-2.5">
                        <p className="text-sm font-medium text-white">{field.label}</p>
                        <p className="mt-1 text-xs leading-5 text-muted-foreground">{field.description}</p>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-emerald-300">{t("admin.operationsHub.context.noMissingFields")}</p>
                  )}
                </div>
              </div>
              <Button
                type="button"
                className="w-full justify-between rounded-2xl"
                disabled={requestingMissingFields || loadingMissingFields || missingFields.length === 0}
                onClick={() => void onRequestMissingFields()}
              >
                {requestingMissingFields ? t("admin.operationsHub.context.requestingMissingFields") : t("admin.operationsHub.context.requestMissingFields")}
                <ArrowUpRight className="h-4 w-4" />
              </Button>
            </div>
          ) : (
            <div className="mt-4 space-y-3">
              <Select value={selectedFormCode} onValueChange={onSelectedFormCodeChange}>
                <SelectTrigger>
                  <SelectValue placeholder={t("admin.operationsHub.context.selectForm")} />
                </SelectTrigger>
                <SelectContent>
                  {requestableForms.map((form) => (
                    <SelectItem key={form.code} value={form.code}>
                      {form.code} — {form.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Textarea
                value={requestMessage}
                onChange={(event) => onRequestMessageChange(event.target.value)}
                placeholder={t("admin.operationsHub.context.requestMessagePlaceholder")}
                className="min-h-[120px]"
              />
              <Button
                type="button"
                className="w-full justify-between rounded-2xl"
                disabled={requestingForm || !selectedFormCode}
                onClick={() => void onRequestForm()}
              >
                {requestingForm ? t("admin.operationsHub.context.requestingForm") : t("admin.operationsHub.context.requestSelectedForm")}
                <ArrowUpRight className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>
      )}

      {tab === "deliverables" && (
        <div className="rounded-[1.4rem] border border-white/8 bg-white/[0.03] p-4">
          <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">{t("admin.operationsHub.context.addDeliverable")}</p>
          <div className="mt-4 space-y-3">
            <Input placeholder={t("admin.operationsHub.context.deliverableTitleField")} value={title} onChange={(event) => onTitleChange(event.target.value)} />
            <Textarea
              placeholder={t("admin.operationsHub.context.deliverableSummary")}
              value={summary}
              onChange={(event) => onSummaryChange(event.target.value)}
              className="min-h-[120px]"
            />
            <Select value={workstreamKey} onValueChange={(value) => onWorkstreamKeyChange(value as CustomerWorkstreamKey)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {workstreamOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Input placeholder={t("admin.operationsHub.context.deliverableUrl")} value={artifactUrl} onChange={(event) => onArtifactUrlChange(event.target.value)} />
            <Input placeholder={t("admin.operationsHub.context.deliverableLabel")} value={artifactLabel} onChange={(event) => onArtifactLabelChange(event.target.value)} />
            <Button
              type="button"
              className="w-full justify-between rounded-2xl"
              disabled={submittingDeliverable}
              onClick={() => void onCreateDeliverable()}
            >
              {submittingDeliverable ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {t("admin.operationsHub.context.saving")}
                  </>
                ) : (
                  <>
                    {t("admin.operationsHub.context.saveDeliverable")}
                    <ArrowUpRight className="h-4 w-4" />
                  </>
                )}
            </Button>
          </div>
        </div>
      )}

      <div className="rounded-[1.4rem] border border-white/8 bg-white/[0.03] p-4">
        <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">{t("admin.operationsHub.context.launchWorkstreams")}</p>
        <div className="mt-4 space-y-3">
          {workspace?.workstreams.slice(0, 4).map((workstream) => (
            <div key={workstream.key} className="rounded-2xl border border-white/8 bg-background/25 px-3 py-3">
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-medium text-white">{workstream.title}</p>
                <Badge variant="outline" className="border-white/10 bg-white/[0.03] text-[10px]">
                  {workstream.status}
                </Badge>
              </div>
              <p className="mt-2 text-xs leading-5 text-muted-foreground">{workstream.nextStep}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function AdminEntityWorkspace<T extends { id: string }>({
  kicker,
  title,
  description,
  list,
  selectedId,
  onSelect,
  empty,
  emptyDescription,
  renderListItem,
  renderDetail,
}: {
  kicker: string;
  title: string;
  description: string;
  list: T[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  empty: string;
  emptyDescription: string;
  renderListItem: (item: T, active: boolean) => ReactNode;
  renderDetail: (item: T) => ReactNode;
}) {
  const selectedItem = list.find((item) => item.id === selectedId) ?? list[0] ?? null;

  return (
    <div className="space-y-5">
      <div>
        <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">{kicker}</p>
        <h3 className="mt-2 text-[1.45rem] font-semibold tracking-tight text-white">{title}</h3>
        <p className="mt-2 max-w-3xl text-sm leading-7 text-slate-300/85">{description}</p>
      </div>

      {list.length > 0 ? (
        <div className="grid gap-4 2xl:grid-cols-[minmax(0,0.86fr)_minmax(0,1.14fr)]">
          <div className="space-y-3">
            {list.map((item) => {
              const active = item.id === (selectedItem?.id ?? null);
              return (
                <button key={item.id} type="button" onClick={() => onSelect(item.id)} className="block w-full text-left">
                  {renderListItem(item, active)}
                </button>
              );
            })}
          </div>
          <div className="rounded-[1.5rem] border border-white/8 bg-[linear-gradient(180deg,rgba(12,18,33,0.84),rgba(9,14,26,0.78))] p-5">
            {selectedItem ? renderDetail(selectedItem) : null}
          </div>
        </div>
      ) : (
        <div className="space-y-4" data-jarvis-empty-surface>
          <AtlasEmptySurface
            title={empty}
            description={emptyDescription}
            tone="cobalt"
          />
          <AtlasStackGrid columns="two">
            <AtlasInsightCard
              eyebrow="Sonraki adım"
              title="Talep veya çıktı üret"
              description="Bu boşluk çoğu zaman operatör akışının henüz başlatılmadığını gösterir. Form talebi, eksik alan isteği veya deliverable oluşturma ile yüzeyi canlı hale getirin."
              tone="cobalt"
              className="h-full"
            />
            <AtlasInsightCard
              eyebrow="Durum"
              title="Boş ama açıklamalı alan"
              description="Modül boş kaldığında çıplak dashed kutu yerine operatöre hangi lane'in açılması gerektiğini söyleyen görev odaklı yüzey kullanılır."
              tone="neutral"
              className="h-full"
            />
          </AtlasStackGrid>
        </div>
      )}
    </div>
  );
}

function HubListItem({
  active,
  title,
  summary,
  metaLeft,
  metaRight,
  tone = "default",
}: {
  active: boolean;
  title: string;
  summary: string;
  metaLeft: string;
  metaRight: string;
  tone?: "default" | "primary" | "warning" | "success";
}) {
  return (
    <div
      className={[
        "rounded-[1.3rem] border border-white/8 bg-white/[0.03] px-4 py-4 transition-all",
        active ? "border-primary/25 bg-primary/10 shadow-[inset_0_0_0_1px_rgba(79,140,255,0.1)]" : "",
        tone === "warning" && active ? "border-amber-300/25 bg-amber-500/8 shadow-[inset_0_0_0_1px_rgba(251,191,36,0.08)]" : "",
        tone === "success" && active ? "border-emerald-400/20 bg-emerald-500/8 shadow-[inset_0_0_0_1px_rgba(16,185,129,0.08)]" : "",
      ].join(" ")}
    >
      <p className="text-sm font-semibold tracking-tight text-white">{title}</p>
      <p className="mt-2 line-clamp-2 text-sm leading-6 text-slate-300/82">{summary}</p>
      <div className="mt-3 flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
        <span className="rounded-full border border-white/8 bg-background/25 px-2.5 py-1">{metaLeft}</span>
        <span>{metaRight}</span>
      </div>
    </div>
  );
}

function DetailBlock({
  title,
  summary,
  badges,
  tiles,
  body,
  note,
  noteLabel,
  href,
  hrefLabel,
}: {
  title: string;
  summary: string;
  badges: Array<{ label: string; tone?: "default" | "primary" | "warning" | "success" }>;
  tiles: Array<{ label: string; value: string }>;
  body?: string;
  note?: string;
  noteLabel?: string;
  href?: string | null;
  hrefLabel?: string;
}) {
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-2">
        {badges.map((badge) => (
          <Badge
            key={`${badge.label}-${badge.tone ?? "default"}`}
            className={
              badge.tone === "primary"
                ? "border-0 bg-primary/14 text-primary"
                : badge.tone === "warning"
                  ? "border-0 bg-amber-500/15 text-amber-300"
                  : badge.tone === "success"
                    ? "border-0 bg-emerald-500/14 text-emerald-300"
                    : "border border-white/10 bg-white/[0.03] text-slate-200"
            }
          >
            {badge.label}
          </Badge>
        ))}
      </div>
      <div>
        <h4 className="text-[1.55rem] font-semibold tracking-tight text-white">{title}</h4>
        <p className="mt-3 text-sm leading-7 text-slate-300/85">{summary}</p>
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        {tiles.map((tile) => (
          <div key={tile.label} className="rounded-[1.15rem] border border-white/8 bg-white/[0.03] px-4 py-3">
            <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">{tile.label}</p>
            <p className="mt-2 text-sm font-medium text-white">{tile.value}</p>
          </div>
        ))}
      </div>
      {body ? (
        <div className="rounded-[1.25rem] border border-white/8 bg-white/[0.03] p-4 text-sm leading-6 text-muted-foreground">
          {body}
        </div>
      ) : null}
      {note ? (
        <div className="rounded-[1.25rem] border border-primary/20 bg-primary/8 p-4">
          <p className="text-[11px] uppercase tracking-[0.18em] text-primary">{noteLabel}</p>
          <p className="mt-3 text-sm leading-7 text-slate-200/90">{note}</p>
        </div>
      ) : null}
      {href ? (
        <Button asChild className="rounded-2xl">
          <Link href={href}>
            {hrefLabel}
            <ArrowUpRight className="ml-2 h-4 w-4" />
          </Link>
        </Button>
      ) : null}
    </div>
  );
}

function ContextCard({
  title,
  body,
  chips,
}: {
  title: string;
  body: string;
  chips?: string[];
}) {
  return (
    <div className="rounded-[1.4rem] border border-white/8 bg-white/[0.03] p-4">
      <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">{title}</p>
      <p className="mt-3 text-sm leading-6 text-slate-300/88">{body}</p>
      {chips?.length ? (
        <div className="mt-4 flex flex-wrap gap-2">
          {chips.map((chip) => (
            <span
              key={chip}
              className="rounded-full border border-white/8 bg-background/25 px-2.5 py-1 text-[11px] text-muted-foreground"
            >
              {chip}
            </span>
          ))}
        </div>
      ) : null}
    </div>
  );
}
