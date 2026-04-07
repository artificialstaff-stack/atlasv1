"use client";

import Link from "next/link";
import { useMemo, useState, type ReactNode } from "react";
import {
  AlertTriangle,
  ArrowUpRight,
  CalendarClock,
  FileText,
  FolderOpen,
  History,
  MessageSquareText,
  Sparkles,
  Workflow,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { WorkspaceModalShell, type WorkspaceRailTab } from "@/components/hub/workspace-modal-shell";
import { AtlasEmptySurface, AtlasInsightCard, AtlasStackGrid } from "@/components/portal/atlas-widget-kit";
import type {
  CustomerHubActionItem,
  CustomerHubDocumentItem,
  CustomerHubFormItem,
  CustomerHubHistoryItem,
  CustomerHubModalTab,
  CustomerWorkspaceViewModel,
} from "@/lib/customer-workspace/types";
import { cn } from "@/lib/utils";
import { useI18n } from "@/i18n/provider";

function getHubCopy(t: (key: string, params?: Record<string, string | number | null | undefined>) => string) {
  const tf = (key: string, fallback: string, params?: Record<string, string | number | null | undefined>) => {
    const value = t(key, params);
    return value === key ? fallback : value;
  };
  const activeAreasLabel = t("portal.requestsHub.context.activeAreas");
  const pendingRequestsLabel = t("common.pendingRequests");
  const visibleOutputsLabel = t("portal.dashboard.visibleOutputs");
  return {
    title: t("portal.requestsHub.title"),
    description: t("portal.requestsHub.description"),
    badge: t("portal.requestsHub.customerBadge"),
    activeAreas: (count: string | number) => `${count} ${activeAreasLabel.toLowerCase()}`,
    requestCount: (count: string | number) => `${count} ${pendingRequestsLabel.toLowerCase()}`,
    deliverableCount: (count: string | number) => `${count} ${visibleOutputsLabel.toLowerCase()}`,
    activeAreasTitle: activeAreasLabel,
    quickLinks: t("portal.requestsHub.context.quickLinks"),
    launchSummary: t("portal.requestsHub.context.launchSummary"),
    selectedContext: t("portal.requestsHub.context.selectedContext"),
    selectedContextBody: t("portal.requestsHub.context.selectedFallback"),
    selectedContextWorkstream: (workstream: string) =>
      t("portal.requestsHub.context.selectedWorkstream", { label: workstream }),
    blocked: (count: string | number) => t("portal.requestsHub.guidance.pendingActions", { count }),
    supportCenter: t("portal.requestsHub.supportCenter"),
    statusLabel: (status: string) => t(`workspace.statuses.${status}`),
    documents: t("portal.nav.documents"),
    services: t("portal.nav.services"),
    generalTopic: t("portal.requestsHub.context.generalTopic"),
    createdAt: t("common.createdAt"),
    submittedAt: t("common.sentAt"),
    updatedAt: t("common.updatedAt"),
    workstream: t("portal.requestsHub.detail.linkedArea"),
    nextStep: t("portal.requestsHub.detail.nextStep"),
    nextStepBody: tf(
      "portal.support.description",
      "Launch akışı dışındaki sorular ve gerekli düzeltme talepleri destek merkezi üzerinden Atlas ekibine aktarılır.",
    ),
    openTopic: t("portal.requestsHub.detail.openTopic"),
    atlasNote: t("portal.requestsHub.detail.atlasNote"),
    openForm: t("portal.requestsHub.detail.openFormDetail"),
    documentType: t("portal.requestsHub.detail.documentType"),
    addedAt: t("portal.requestsHub.detail.addedAt"),
    documentBody: t("portal.documents.description"),
    openDocument: t("portal.requestsHub.detail.openDocument"),
    historyBody: t("portal.requestsHub.tabs.history.description"),
    actionTitle: t("portal.requestsHub.tabs.actions.title"),
    actionDescription: t("portal.requestsHub.tabs.actions.description"),
    formTitle: t("portal.requestsHub.tabs.forms.title"),
    formDescription: t("portal.requestsHub.tabs.forms.description"),
    documentTitle: t("portal.requestsHub.tabs.documents.title"),
    documentDescription: t("portal.requestsHub.tabs.documents.description"),
    historyTitle: t("portal.requestsHub.tabs.history.title"),
    historyDescription: t("portal.requestsHub.tabs.history.description"),
    tabs: {
      actions: {
        label: t("portal.requestsHub.tabs.actions.label"),
        hint: t("portal.requestsHub.tabs.actions.hint"),
        empty: t("portal.requestsHub.tabs.actions.empty"),
        kicker: t("portal.requestsHub.tabs.actions.kicker"),
      },
      forms: {
        label: t("portal.requestsHub.tabs.forms.label"),
        hint: t("portal.requestsHub.tabs.forms.hint"),
        empty: t("portal.requestsHub.tabs.forms.empty"),
        kicker: t("portal.requestsHub.tabs.forms.kicker"),
      },
      documents: {
        label: t("portal.requestsHub.tabs.documents.label"),
        hint: t("portal.requestsHub.tabs.documents.hint"),
        empty: t("portal.requestsHub.tabs.documents.empty"),
        kicker: t("portal.requestsHub.tabs.documents.kicker"),
      },
      history: {
        label: t("portal.requestsHub.tabs.history.label"),
        hint: t("portal.requestsHub.tabs.history.hint"),
        empty: t("portal.requestsHub.tabs.history.empty"),
        kicker: t("portal.requestsHub.tabs.history.kicker"),
      },
    },
  };
}

type SelectedState = Record<CustomerHubModalTab, string | null>;

const TAB_ICONS: Record<CustomerHubModalTab, typeof Sparkles> = {
  actions: Sparkles,
  forms: FileText,
  documents: FolderOpen,
  history: History,
};

export function CustomerRequestsHubModal({
  workspace,
  open,
  onOpenChange,
  initialTab = "actions",
}: {
  workspace: CustomerWorkspaceViewModel;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialTab?: CustomerHubModalTab;
}) {
  const { t, formatDate } = useI18n();
  const copy = useMemo(() => getHubCopy(t), [t]);
  const [tabOverride, setTabOverride] = useState<CustomerHubModalTab | null>(null);
  const [selectedOverrides, setSelectedOverrides] = useState<Partial<SelectedState>>({});
  const tab = tabOverride ?? initialTab;
  const selected = useMemo<SelectedState>(
    () => ({
      actions: resolveSelectedId("actions", selectedOverrides.actions ?? null, workspace),
      forms: resolveSelectedId("forms", selectedOverrides.forms ?? null, workspace),
      documents: resolveSelectedId("documents", selectedOverrides.documents ?? null, workspace),
      history: resolveSelectedId("history", selectedOverrides.history ?? null, workspace),
    }),
    [selectedOverrides, workspace],
  );

  const tabs = useMemo<WorkspaceRailTab[]>(
    () => [
      {
        value: "actions",
        label: copy.tabs.actions.label,
        hint: copy.tabs.actions.hint,
        count: workspace.actionItems.length,
        icon: TAB_ICONS.actions,
      },
      {
        value: "forms",
        label: copy.tabs.forms.label,
        hint: copy.tabs.forms.hint,
        count: workspace.submittedForms.length,
        icon: TAB_ICONS.forms,
      },
      {
        value: "documents",
        label: copy.tabs.documents.label,
        hint: copy.tabs.documents.hint,
        count: workspace.documents.length,
        icon: TAB_ICONS.documents,
      },
      {
        value: "history",
        label: copy.tabs.history.label,
        hint: copy.tabs.history.hint,
        count: workspace.history.length,
        icon: TAB_ICONS.history,
      },
    ],
    [copy, workspace],
  );

  return (
    <WorkspaceModalShell
      open={open}
      title={copy.title}
      description={copy.description}
      workspacePreset="compact"
      badge={copy.badge}
      status={workspace.launchStageLabel}
      meta={[
        workspace.displayName,
        copy.activeAreas(workspace.activeWorkstreamCount),
        workspace.primaryAction?.label ?? workspace.summary,
      ]}
      metrics={[
        { label: copy.tabs.actions.label, value: String(workspace.actionItems.length), tone: workspace.actionItems.length > 0 ? "warning" : "default" },
        { label: copy.tabs.forms.label, value: String(workspace.submittedForms.length), tone: "primary" },
        { label: copy.tabs.documents.label, value: String(workspace.documents.length), tone: "success" },
        { label: copy.tabs.history.label, value: String(workspace.history.length) },
      ]}
      tabs={tabs}
      activeTab={tab}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) {
          setTabOverride(null);
          setSelectedOverrides({});
        }
        onOpenChange(nextOpen);
      }}
      onTabChange={(value) => setTabOverride(value as CustomerHubModalTab)}
      topActions={
        <>
          <Button asChild variant="outline" className="rounded-2xl border-white/10 bg-white/[0.03] text-slate-200 hover:bg-white/[0.06]">
            <Link href="/panel/support">{copy.supportCenter}</Link>
          </Button>
          <Button asChild className="rounded-2xl">
            <Link href={workspace.primaryAction?.href ?? "/panel/services"}>{workspace.primaryAction?.label ?? copy.services}</Link>
          </Button>
        </>
      }
      mainContent={renderMainContent({
        tab,
        workspace,
        selected,
        onSelect: (id) => setSelectedOverrides((current) => ({ ...current, [tab]: id })),
        copy,
        formatDate,
      })}
      contextContent={renderContextRail({ tab, workspace, selectedId: selected[tab], copy })}
    />
  );
}

function resolveSelectedId(
  tab: CustomerHubModalTab,
  selectedId: string | null,
  workspace: CustomerWorkspaceViewModel,
) {
  const list = getItemsForTab(tab, workspace);
  if (selectedId && list.some((item) => item.id === selectedId)) {
    return selectedId;
  }

  return list[0]?.id ?? null;
}

function getItemsForTab(tab: CustomerHubModalTab, workspace: CustomerWorkspaceViewModel) {
  switch (tab) {
    case "actions":
      return workspace.actionItems;
    case "forms":
      return workspace.submittedForms;
    case "documents":
      return workspace.documents;
    case "history":
      return workspace.history;
  }
}

function renderMainContent({
  tab,
  workspace,
  selected,
  onSelect,
  copy,
  formatDate,
}: {
  tab: CustomerHubModalTab;
  workspace: CustomerWorkspaceViewModel;
  selected: SelectedState;
  onSelect: (id: string) => void;
  copy: ReturnType<typeof getHubCopy>;
  formatDate: (value: string | number | Date, options?: Intl.DateTimeFormatOptions) => string;
}) {
  const selectedId = selected[tab];
  if (tab === "actions") {
    return (
      <CustomerEntityWorkspace
        kicker={copy.tabs.actions.kicker}
        title={copy.actionTitle}
        description={copy.actionDescription}
        list={workspace.actionItems}
        empty={copy.tabs.actions.empty}
        emptyDescription={copy.tabs.actions.hint}
        selectedId={selectedId}
        onSelect={onSelect}
        copy={copy}
        renderListItem={(item, active) => (
          <EntityListButton
            active={active}
            title={item.title}
            summary={item.summary}
            metaLeft={item.sourceLabel}
            metaRight={formatDate(item.createdAt)}
            tone={item.status === "blocked" ? "warning" : "primary"}
          />
        )}
        renderDetail={(item) => <ActionDetail item={item} copy={copy} formatDate={formatDate} />}
      />
    );
  }

  if (tab === "forms") {
    return (
      <CustomerEntityWorkspace
        kicker={copy.tabs.forms.kicker}
        title={copy.formTitle}
        description={copy.formDescription}
        list={workspace.submittedForms}
        empty={copy.tabs.forms.empty}
        emptyDescription={copy.tabs.forms.hint}
        selectedId={selectedId}
        onSelect={onSelect}
        copy={copy}
        renderListItem={(item, active) => (
          <EntityListButton
            active={active}
            title={item.title}
            summary={item.summary}
            metaLeft={item.formCode}
            metaRight={item.status}
            tone={item.status === "needs_correction" ? "warning" : "primary"}
          />
        )}
        renderDetail={(item) => <FormDetail item={item} copy={copy} formatDate={formatDate} />}
      />
    );
  }

  if (tab === "documents") {
    return (
      <CustomerEntityWorkspace
        kicker={copy.tabs.documents.kicker}
        title={copy.documentTitle}
        description={copy.documentDescription}
        list={workspace.documents}
        empty={copy.tabs.documents.empty}
        emptyDescription={copy.tabs.documents.hint}
        selectedId={selectedId}
        onSelect={onSelect}
        copy={copy}
        renderListItem={(item, active) => (
          <EntityListButton
            active={active}
            title={item.title}
            summary={item.summary}
            metaLeft={item.typeLabel}
            metaRight={formatDate(item.createdAt)}
            tone="success"
          />
        )}
        renderDetail={(item) => <DocumentDetail item={item} copy={copy} formatDate={formatDate} />}
      />
    );
  }

  return (
    <CustomerEntityWorkspace
      kicker={copy.tabs.history.kicker}
      title={copy.historyTitle}
      description={copy.historyDescription}
      list={workspace.history}
      empty={copy.tabs.history.empty}
      emptyDescription={copy.tabs.history.hint}
      selectedId={selectedId}
      onSelect={onSelect}
      copy={copy}
      renderListItem={(item, active) => (
        <EntityListButton
          active={active}
          title={item.title}
          summary={item.description}
          metaLeft={item.kind}
          metaRight={formatDate(item.createdAt)}
        />
      )}
        renderDetail={(item) => <HistoryDetail item={item} copy={copy} formatDate={formatDate} />}
    />
  );
}

function renderContextRail({
  tab,
  workspace,
  selectedId,
  copy,
}: {
  tab: CustomerHubModalTab;
  workspace: CustomerWorkspaceViewModel;
  selectedId: string | null;
  copy: ReturnType<typeof getHubCopy>;
}) {
  const selectedWorkstream =
    tab === "actions"
      ? workspace.actionItems.find((item) => item.id === selectedId)?.workstreamLabel
      : null;

  return (
    <div className="space-y-4">
      <ContextPanel
        title={copy.launchSummary}
        body={workspace.summary}
        chips={[
          `${workspace.launchStageLabel}`,
          copy.requestCount(workspace.requestCount),
          copy.deliverableCount(workspace.deliverableCount),
        ]}
      />

      <ContextPanel
        title={copy.selectedContext}
        body={
          selectedWorkstream
            ? copy.selectedContextWorkstream(selectedWorkstream)
            : copy.selectedContextBody
        }
        chips={[
          tab.toUpperCase(),
          copy.blocked(workspace.blockedWorkstreamCount),
        ]}
      />

      <div className="rounded-[1.4rem] border border-white/8 bg-white/[0.03] p-4">
        <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">{copy.activeAreasTitle}</p>
        <div className="mt-4 space-y-3">
          {workspace.workstreams.slice(0, 4).map((workstream) => (
            <div key={workstream.key} className="rounded-2xl border border-white/8 bg-background/30 px-3 py-3">
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-medium text-white">{workstream.title}</p>
                <Badge variant="outline" className="border-white/10 bg-white/[0.03] text-[10px]">
                  {copy.statusLabel(workstream.status)}
                </Badge>
              </div>
              <p className="mt-2 text-xs leading-5 text-muted-foreground">{workstream.nextStep}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-[1.4rem] border border-white/8 bg-white/[0.03] p-4">
        <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">{copy.quickLinks}</p>
        <div className="mt-4 flex flex-col gap-2">
          <Button asChild className="justify-between rounded-2xl">
            <Link href="/panel/support">
              {copy.supportCenter}
              <ArrowUpRight className="h-4 w-4" />
            </Link>
          </Button>
          <Button asChild variant="outline" className="justify-between rounded-2xl border-white/10 bg-white/[0.03] text-slate-200">
            <Link href="/panel/documents">
              {copy.documents}
              <ArrowUpRight className="h-4 w-4" />
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}

function CustomerEntityWorkspace<T extends { id: string }>({
  kicker,
  title,
  description,
  list,
  empty,
  emptyDescription,
  selectedId,
  onSelect,
  copy,
  renderListItem,
  renderDetail,
}: {
  kicker: string;
  title: string;
  description: string;
  list: T[];
  empty: string;
  emptyDescription: string;
  selectedId: string | null;
  onSelect: (id: string) => void;
  copy: ReturnType<typeof getHubCopy>;
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
        <div className="grid gap-4 2xl:grid-cols-[minmax(0,0.88fr)_minmax(0,1.12fr)]">
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
        <div className="flex min-h-[300px] items-center justify-center" data-jarvis-empty-surface>
          <div className="w-full max-w-4xl space-y-4">
            <AtlasEmptySurface
              title={empty}
              description={emptyDescription}
              tone="primary"
              className="mx-auto max-w-3xl"
              primaryAction={{
                label: copy.supportCenter,
                href: "/panel/support",
              }}
              secondaryAction={{
                label: copy.services,
                href: "/panel/services",
                variant: "outline",
              }}
            />
            <AtlasStackGrid columns="two" className="items-stretch">
              <AtlasInsightCard
                eyebrow={copy.nextStep}
                title={copy.supportCenter}
                description={copy.nextStepBody}
                tone="cobalt"
                className="h-full"
              />
              <AtlasInsightCard
                eyebrow={copy.selectedContext}
                title={copy.generalTopic}
                description={copy.selectedContextBody}
                tone="neutral"
                className="h-full"
              />
            </AtlasStackGrid>
          </div>
        </div>
      )}
    </div>
  );
}

function EntityListButton({
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
      className={cn(
        "rounded-[1.3rem] border border-white/8 bg-white/[0.03] px-4 py-4 transition-all",
        active && "border-primary/25 bg-primary/10 shadow-[inset_0_0_0_1px_rgba(79,140,255,0.1)]",
        tone === "warning" && active && "border-amber-300/25 bg-amber-500/8 shadow-[inset_0_0_0_1px_rgba(251,191,36,0.08)]",
        tone === "success" && active && "border-emerald-400/20 bg-emerald-500/8 shadow-[inset_0_0_0_1px_rgba(16,185,129,0.08)]",
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-semibold tracking-tight text-white">{title}</p>
          <p className="mt-2 line-clamp-2 text-sm leading-6 text-slate-300/82">{summary}</p>
        </div>
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
        <span className="rounded-full border border-white/8 bg-background/25 px-2.5 py-1">{metaLeft}</span>
        <span>{metaRight}</span>
      </div>
    </div>
  );
}

function ActionDetail({
  item,
  copy,
  formatDate,
}: {
  item: CustomerHubActionItem;
  copy: ReturnType<typeof getHubCopy>;
  formatDate: (value: string | number | Date, options?: Intl.DateTimeFormatOptions) => string;
}) {
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-2">
        <Badge className="border-0 bg-primary/14 text-primary">{item.sourceLabel}</Badge>
        <Badge
          className={cn(
            "border-0",
            item.status === "blocked" ? "bg-amber-500/15 text-amber-300" : "bg-white/[0.06] text-slate-200",
          )}
        >
          {item.status}
        </Badge>
      </div>
      <div>
        <h4 className="text-[1.55rem] font-semibold tracking-tight text-white">{item.title}</h4>
        <p className="mt-3 text-sm leading-7 text-slate-300/85">{item.summary}</p>
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        <DetailTile label={copy.workstream} value={item.workstreamLabel ?? copy.generalTopic} />
        <DetailTile label={copy.createdAt} value={formatDate(item.createdAt)} />
      </div>
      <div className="rounded-[1.25rem] border border-white/8 bg-white/[0.03] p-4">
        <div className="flex items-start gap-3">
          <AlertTriangle className="mt-0.5 h-4 w-4 text-amber-300" />
          <div>
            <p className="text-sm font-medium text-white">{copy.nextStep}</p>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              {copy.nextStepBody}
            </p>
          </div>
        </div>
      </div>
      {item.href ? (
        <Button asChild className="rounded-2xl">
          <Link href={item.href}>
            {copy.openTopic}
            <ArrowUpRight className="ml-2 h-4 w-4" />
          </Link>
        </Button>
      ) : null}
    </div>
  );
}

function FormDetail({
  item,
  copy,
  formatDate,
}: {
  item: CustomerHubFormItem;
  copy: ReturnType<typeof getHubCopy>;
  formatDate: (value: string | number | Date, options?: Intl.DateTimeFormatOptions) => string;
}) {
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant="outline" className="border-white/10 bg-white/[0.03] font-mono text-[11px]">
          {item.formCode}
        </Badge>
        <Badge className="border-0 bg-primary/14 text-primary">{item.status}</Badge>
      </div>
      <div>
        <h4 className="text-[1.55rem] font-semibold tracking-tight text-white">{item.title}</h4>
        <p className="mt-3 text-sm leading-7 text-slate-300/85">{item.summary}</p>
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        <DetailTile label={copy.submittedAt} value={formatDate(item.submittedAt)} />
        <DetailTile label={copy.updatedAt} value={formatDate(item.updatedAt)} />
      </div>
      {item.adminNotes ? (
        <div className="rounded-[1.25rem] border border-primary/20 bg-primary/8 p-4">
          <p className="text-[11px] uppercase tracking-[0.18em] text-primary">{copy.atlasNote}</p>
          <p className="mt-3 text-sm leading-7 text-slate-200/90">{item.adminNotes}</p>
        </div>
      ) : null}
      <Button asChild className="rounded-2xl">
        <Link href={item.href}>
          {copy.openForm}
          <ArrowUpRight className="ml-2 h-4 w-4" />
        </Link>
      </Button>
    </div>
  );
}

function DocumentDetail({
  item,
  copy,
  formatDate,
}: {
  item: CustomerHubDocumentItem;
  copy: ReturnType<typeof getHubCopy>;
  formatDate: (value: string | number | Date, options?: Intl.DateTimeFormatOptions) => string;
}) {
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-2">
        <Badge className="border-0 bg-emerald-500/14 text-emerald-300">{item.typeLabel}</Badge>
        <Badge variant="outline" className="border-white/10 bg-white/[0.03] text-slate-200">
          {item.status}
        </Badge>
      </div>
      <div>
        <h4 className="text-[1.55rem] font-semibold tracking-tight text-white">{item.title}</h4>
        <p className="mt-3 text-sm leading-7 text-slate-300/85">{item.summary}</p>
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        <DetailTile label={copy.documentType} value={item.typeLabel} />
        <DetailTile label={copy.addedAt} value={formatDate(item.createdAt)} />
      </div>
      <div className="rounded-[1.25rem] border border-white/8 bg-white/[0.03] p-4">
        <div className="flex items-start gap-3">
          <MessageSquareText className="mt-0.5 h-4 w-4 text-primary" />
          <p className="text-sm leading-6 text-muted-foreground">
            {copy.documentBody}
          </p>
        </div>
      </div>
      {item.href ? (
        <Button asChild className="rounded-2xl">
          <Link href={item.href}>
            {copy.openDocument}
            <ArrowUpRight className="ml-2 h-4 w-4" />
          </Link>
        </Button>
      ) : null}
    </div>
  );
}

function HistoryDetail({
  item,
  copy,
  formatDate,
}: {
  item: CustomerHubHistoryItem;
  copy: ReturnType<typeof getHubCopy>;
  formatDate: (value: string | number | Date, options?: Intl.DateTimeFormatOptions) => string;
}) {
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-2">
        <Badge className="border-0 bg-white/[0.06] text-slate-200">{item.kind}</Badge>
        <Badge variant="outline" className="border-white/10 bg-white/[0.03] text-slate-200">
          {formatDate(item.createdAt)}
        </Badge>
      </div>
      <div>
        <h4 className="text-[1.55rem] font-semibold tracking-tight text-white">{item.title}</h4>
        <p className="mt-3 text-sm leading-7 text-slate-300/85">{item.description}</p>
      </div>
      <div className="rounded-[1.25rem] border border-white/8 bg-white/[0.03] p-4">
        <div className="flex items-start gap-3">
          <CalendarClock className="mt-0.5 h-4 w-4 text-primary" />
          <p className="text-sm leading-6 text-muted-foreground">
            {copy.historyBody}
          </p>
        </div>
      </div>
    </div>
  );
}

function ContextPanel({
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

function DetailTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[1.15rem] border border-white/8 bg-white/[0.03] px-4 py-3">
      <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">{label}</p>
      <p className="mt-2 text-sm font-medium text-white">{value}</p>
    </div>
  );
}

function getFirstEntityId(tab: CustomerHubModalTab, workspace: CustomerWorkspaceViewModel) {
  if (tab === "actions") return workspace.actionItems[0]?.id ?? null;
  if (tab === "forms") return workspace.submittedForms[0]?.id ?? null;
  if (tab === "documents") return workspace.documents[0]?.id ?? null;
  return workspace.history[0]?.id ?? null;
}
