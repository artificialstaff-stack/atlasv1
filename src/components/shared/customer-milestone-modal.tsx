"use client";

import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ModalWrapper } from "@/components/shared/modal-wrapper";
import type { CustomerMilestone } from "@/lib/workflows/types";
import { cn, formatDate } from "@/lib/utils";

const STATUS_STYLES: Record<
  CustomerMilestone["status"],
  { label: string; className: string }
> = {
  pending: {
    label: "Bekliyor",
    className: "border-amber-500/20 bg-amber-500/10 text-amber-300",
  },
  in_progress: {
    label: "Devam ediyor",
    className: "border-primary/20 bg-primary/10 text-primary",
  },
  blocked: {
    label: "Aksiyon gerekli",
    className: "border-red-500/20 bg-red-500/10 text-red-300",
  },
  completed: {
    label: "Tamamlandi",
    className: "border-emerald-500/20 bg-emerald-500/10 text-emerald-300",
  },
};

interface CustomerMilestoneModalProps {
  milestone: CustomerMilestone | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CustomerMilestoneModal({
  milestone,
  open,
  onOpenChange,
}: CustomerMilestoneModalProps) {
  if (!milestone) {
    return null;
  }

  const statusStyle = STATUS_STYLES[milestone.status];
  const hasAction =
    Boolean(milestone.primaryAction) && milestone.primaryAction?.type !== "wait";
  const hasDocuments = milestone.tabSummary.documents.length > 0;
  const hasHistory = milestone.tabSummary.history.length > 0;
  const defaultTab = hasAction ? "action" : "overview";

  return (
    <ModalWrapper
      open={open}
      onOpenChange={onOpenChange}
      title={milestone.title}
      description={milestone.serviceTitle}
      size="wide"
    >
      <div className="space-y-5">
        <div className="grid gap-3 lg:grid-cols-[1.25fr_0.75fr]">
          <div className="rounded-2xl border border-white/8 bg-background/50 p-4">
            <div className="flex flex-wrap items-center gap-2">
              <Badge className={cn("border", statusStyle.className)}>
                {statusStyle.label}
              </Badge>
              {milestone.formCode && (
                <Badge variant="outline" className="font-mono text-[10px]">
                  {milestone.formCode}
                </Badge>
              )}
              {milestone.estimatedMinutes ? (
                <Badge variant="outline" className="text-[10px]">
                  Yaklasik {milestone.estimatedMinutes} dk
                </Badge>
              ) : null}
            </div>
            <p className="mt-3 text-sm leading-6 text-muted-foreground">
              {milestone.summary}
            </p>
            {milestone.whyNeeded ? (
              <div className="mt-4 rounded-2xl border border-white/8 bg-background/55 px-4 py-3">
                <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
                  Neden bunu istiyoruz
                </p>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                  {milestone.whyNeeded}
                </p>
              </div>
            ) : null}
          </div>
          <div className="rounded-2xl border border-white/8 bg-background/50 p-4">
            <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
              Son guncelleme
            </p>
            <p className="mt-2 text-sm font-medium">{formatDate(milestone.updatedAt)}</p>
            <p className="mt-2 text-xs text-muted-foreground">
              Bu pencerede Atlas ekibinin ne yaptigini, sizden ne beklendigini ve varsa hangi dugmeye basmaniz gerektigini gorebilirsiniz.
            </p>
          </div>
        </div>

        <Tabs defaultValue={defaultTab} className="space-y-4">
          <TabsList className="w-full justify-start rounded-2xl bg-white/[0.03] p-1">
            <TabsTrigger value="overview">Ozet</TabsTrigger>
            <TabsTrigger value="action">Simdi yap</TabsTrigger>
            <TabsTrigger value="atlas">Atlas ne yapiyor</TabsTrigger>
            {hasDocuments ? <TabsTrigger value="documents">Belgeler</TabsTrigger> : null}
            {hasHistory ? <TabsTrigger value="history">Gecmis</TabsTrigger> : null}
          </TabsList>

          <TabsContent value="overview">
            <div className="rounded-2xl border border-white/8 bg-background/45 p-4">
              <p className="text-sm leading-6 text-muted-foreground">
                {milestone.tabSummary.status}
              </p>
            </div>
          </TabsContent>

          <TabsContent value="action">
            <div className="space-y-3">
              <div className="rounded-2xl border border-white/8 bg-background/45 p-4">
                <p className="text-sm leading-6 text-muted-foreground">
                  {milestone.tabSummary.customerAction}
                </p>
              </div>

              {hasAction ? (
                <div className="rounded-2xl border border-primary/20 bg-primary/5 p-4">
                  <p className="text-[11px] uppercase tracking-[0.18em] text-primary">
                    Sizden beklenen aksiyon
                  </p>
                  <p className="mt-2 text-base font-medium">
                    {milestone.primaryAction?.label}
                  </p>
                  {milestone.primaryAction?.description ? (
                    <p className="mt-2 text-sm leading-6 text-muted-foreground">
                      {milestone.primaryAction.description}
                    </p>
                  ) : null}
                </div>
              ) : (
                <div className="rounded-2xl border border-white/8 bg-background/45 p-4">
                  <p className="text-sm leading-6 text-muted-foreground">
                    Su anda sizden ek bir islem beklenmiyor. Atlas bu adimi sizin adiniza yurutup sizi yeni bir bildirimle haberdar edecek.
                  </p>
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="atlas">
            <div className="rounded-2xl border border-white/8 bg-background/45 p-4">
              <p className="text-sm leading-6 text-muted-foreground">
                {milestone.tabSummary.atlasAction}
              </p>
            </div>
          </TabsContent>

          {hasDocuments ? (
            <TabsContent value="documents">
              <div className="rounded-2xl border border-white/8 bg-background/45 p-4">
                <div className="space-y-2">
                  {milestone.tabSummary.documents.map((document) => (
                    <div
                      key={document}
                      className="rounded-xl border border-white/8 bg-background/50 px-3 py-2 text-sm text-muted-foreground"
                    >
                      {document}
                    </div>
                  ))}
                </div>
              </div>
            </TabsContent>
          ) : null}

          {hasHistory ? (
            <TabsContent value="history">
              <div className="rounded-2xl border border-white/8 bg-background/45 p-4">
                <div className="space-y-3">
                  {milestone.tabSummary.history.map((event) => (
                    <div
                      key={event.id}
                      className="rounded-xl border border-white/8 bg-background/50 px-3 py-3"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <p className="text-sm font-medium">{event.title}</p>
                        <span className="text-[11px] text-muted-foreground">
                          {formatDate(event.createdAt)}
                        </span>
                      </div>
                      {event.description && (
                        <p className="mt-1 text-sm text-muted-foreground">
                          {event.description}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </TabsContent>
          ) : null}
        </Tabs>

        <div className="rounded-2xl border border-white/8 bg-background/45 p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
                Sonraki adim
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                {hasAction
                  ? "Asagidaki birincil dugme sizi dogrudan dogru ekrana goturur."
                  : "Su an beklemede kalabilirsiniz. Yeni bir islem gerekirse Atlas sizi bilgilendirecek."}
              </p>
            </div>

            <div className="flex flex-col gap-2 sm:flex-row">
              {hasAction ? (
                <Button asChild size="lg" className="rounded-2xl px-6">
                  <Link href={milestone.primaryAction?.href ?? "/panel/services"}>
                    {milestone.primaryAction?.label}
                  </Link>
                </Button>
              ) : null}
              {milestone.secondaryAction ? (
                <Button asChild size="lg" variant="outline" className="rounded-2xl">
                  <Link href={milestone.secondaryAction.href}>
                    {milestone.secondaryAction.label}
                  </Link>
                </Button>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </ModalWrapper>
  );
}
