"use client";

import { X, type LucideIcon } from "lucide-react";
import { ModalWrapper } from "@/components/shared/modal-wrapper";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

export type WorkspaceRailTab = {
  value: string;
  label: string;
  hint: string;
  count?: number;
  icon: LucideIcon;
};

export type WorkspaceHeaderMetric = {
  label: string;
  value: string;
  tone?: "default" | "primary" | "warning" | "success";
};

export function WorkspaceModalShell({
  open,
  onOpenChange,
  title,
  description,
  badge,
  status,
  meta,
  metrics,
  tabs,
  activeTab,
  onTabChange,
  mainContent,
  contextContent,
  topActions,
  workspacePreset = "default",
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  badge?: string;
  status?: string;
  meta?: string[];
  metrics?: WorkspaceHeaderMetric[];
  tabs: WorkspaceRailTab[];
  activeTab: string;
  onTabChange: (value: string) => void;
  mainContent: ReactNode;
  contextContent?: ReactNode;
  topActions?: ReactNode;
  workspacePreset?: "default" | "compact" | "dense";
}) {
  const layoutClassName =
    workspacePreset === "compact"
      ? "xl:grid-cols-[13.5rem_minmax(0,1fr)_16rem] 2xl:grid-cols-[14rem_minmax(0,1fr)_16.5rem]"
      : workspacePreset === "dense"
        ? "xl:grid-cols-[13.25rem_minmax(0,1.02fr)_18rem] 2xl:grid-cols-[13.75rem_minmax(0,1.06fr)_18.5rem]"
        : "xl:grid-cols-[13.5rem_minmax(0,1.02fr)_18.5rem] 2xl:grid-cols-[14rem_minmax(0,1.06fr)_19rem]";
  const tabMinHeightClassName =
    workspacePreset === "compact"
      ? "min-h-[110px]"
      : workspacePreset === "dense"
        ? "min-h-[96px]"
        : "min-h-[88px]";
  const tabHintClassName =
    workspacePreset === "compact"
      ? "mt-1.5 min-h-[1.25rem] break-words text-[11px] leading-5 text-slate-400 transition-colors line-clamp-1 group-data-[state=active]:text-slate-300"
      : "mt-1.5 min-h-[2.5rem] break-words text-[11px] leading-5 text-slate-400 transition-colors line-clamp-2 group-data-[state=active]:text-slate-300";

  return (
    <ModalWrapper
      open={open}
      onOpenChange={onOpenChange}
      title={title}
      description={description}
      size="workspace"
      workspacePreset={workspacePreset}
      hideHeader
      className="border-white/12 bg-[#07101f]/96"
    >
      <div className="flex h-full min-h-0 flex-col" data-jarvis-workspace-shell={workspacePreset}>
        <div className="sticky top-0 z-20 border-b border-white/8 bg-[linear-gradient(180deg,rgba(7,12,24,0.99),rgba(7,12,24,0.95))] px-6 py-4 backdrop-blur-xl">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
            <div className="min-w-0 max-w-[56rem] space-y-2.5">
              <div className="flex flex-wrap items-center gap-2">
                {badge ? (
                  <Badge className="border-0 bg-primary/14 text-primary">{badge}</Badge>
                ) : null}
                {status ? (
                  <Badge variant="outline" className="border-white/10 bg-white/[0.03] text-slate-200">
                    {status}
                  </Badge>
                ) : null}
              </div>
              <div>
                <h2 className="text-[1.55rem] font-semibold tracking-tight text-white">{title}</h2>
                <p className="mt-1.5 max-w-2xl text-sm leading-6 text-slate-300/84">{description}</p>
              </div>
              {meta?.length ? (
                <div className="flex flex-wrap gap-2">
                  {meta.map((item) => (
                    <span
                      key={item}
                      className="rounded-full border border-white/10 bg-white/[0.03] px-3 py-1.5 text-[11px] text-slate-300/80"
                    >
                      {item}
                    </span>
                  ))}
                </div>
              ) : null}
            </div>

            <div className="flex flex-col items-stretch gap-2.5 xl:min-w-[420px] xl:max-w-[460px]">
              <div className="flex items-start justify-end gap-3">
                {topActions ? <div className="flex flex-wrap justify-end gap-2">{topActions}</div> : <div />}
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="shrink-0 rounded-2xl border border-white/10 bg-white/[0.03] text-slate-300 hover:bg-white/[0.08] hover:text-white"
                  onClick={() => onOpenChange(false)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
              {metrics?.length ? (
                <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-2">
                  {metrics.map((metric) => (
                    <div
                      key={metric.label}
                      className={cn(
                        "rounded-[1rem] border border-white/8 bg-[linear-gradient(180deg,rgba(12,18,33,0.88),rgba(10,15,27,0.82))] px-3.5 py-3",
                        metric.tone === "primary" && "border-primary/20 bg-primary/5",
                        metric.tone === "warning" && "border-amber-300/15 bg-amber-500/5",
                        metric.tone === "success" && "border-emerald-400/15 bg-emerald-500/5",
                      )}
                    >
                      <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">{metric.label}</p>
                      <p className="mt-1.5 text-[1.35rem] font-semibold tracking-tight text-white">{metric.value}</p>
                    </div>
                  ))}
                </div>
              ) : null}
            </div>
          </div>
        </div>

        <Tabs
          value={activeTab}
          onValueChange={onTabChange}
          orientation="vertical"
          className="min-h-0 flex-1 gap-0"
        >
          <div className={cn("grid min-h-0 flex-1 grid-cols-1", layoutClassName)}>
            <div
              data-jarvis-workspace-rail="left"
              className="border-b border-white/8 bg-[linear-gradient(180deg,rgba(8,12,23,0.96),rgba(7,11,20,0.93))] px-4 py-4 xl:border-b-0 xl:border-r"
            >
              <TabsList
                variant="line"
                className="h-full w-full flex-col items-stretch justify-start gap-2 bg-transparent p-0 text-left"
              >
                {tabs.map((tab) => {
                  const Icon = tab.icon;
                  return (
                    <TabsTrigger
                      key={tab.value}
                      value={tab.value}
                      className={cn(
                        "group w-full justify-start rounded-[1rem] border border-white/8 bg-white/[0.02] px-3.5 py-3 text-left text-slate-300",
                        tabMinHeightClassName,
                        "data-[state=active]:border-primary/25 data-[state=active]:bg-primary/10 data-[state=active]:text-white data-[state=active]:shadow-[inset_0_0_0_1px_rgba(79,140,255,0.1)]",
                        "after:hidden",
                      )}
                    >
                      <div className="flex w-full items-start gap-3">
                        <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-white/8 bg-white/[0.03] text-primary">
                          <Icon className="h-4 w-4" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between gap-2">
                            <span className="truncate text-sm font-semibold">{tab.label}</span>
                            {typeof tab.count === "number" ? (
                              <span className="rounded-full border border-white/8 bg-white/[0.03] px-2 py-0.5 text-[11px] text-slate-200">
                                {tab.count}
                              </span>
                            ) : null}
                          </div>
                          <p className={tabHintClassName}>
                            {tab.hint}
                          </p>
                        </div>
                      </div>
                    </TabsTrigger>
                  );
                })}
              </TabsList>
            </div>

            <div
              data-jarvis-workspace-main
              className="min-h-0 border-b border-white/8 bg-[linear-gradient(180deg,rgba(6,11,21,0.94),rgba(5,10,18,0.88))] xl:border-b-0 xl:border-r"
            >
              <div className="h-full min-h-0 overflow-y-auto px-5 py-5 2xl:px-6">{mainContent}</div>
            </div>

            <div
              data-jarvis-workspace-rail="context"
              className="min-h-0 bg-[linear-gradient(180deg,rgba(8,12,22,0.96),rgba(7,11,20,0.92))]"
            >
              <div className="h-full min-h-0 overflow-y-auto px-4 py-5">{contextContent}</div>
            </div>
          </div>
        </Tabs>
      </div>
    </ModalWrapper>
  );
}
