"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight, CheckCircle2, Clock3, FileText, LifeBuoy, ShieldAlert, Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  FORM_SUBMISSION_STATUS_COLORS,
  FORM_SUBMISSION_STATUS_LABELS,
  type FormSubmissionStatus,
} from "@/lib/forms/types";
import type { PortalSupportOverview, PortalSupportUnlockContext } from "@/lib/customer-portal/types";
import { useClientGuidance } from "../../_components/client-guidance-provider";
import { cn, formatDate } from "@/lib/utils";
import { useMemo } from "react";
import { useI18n } from "@/i18n/provider";

function toHumanFieldLabel(
  t: (key: string, params?: Record<string, string | number>) => string,
  field: string,
) {
  const translationKey = `workflows.completionFields.${field}.label`;
  const translated = t(translationKey);
  if (translated !== translationKey) {
    return translated;
  }

  return field
    .split("_")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export function SupportContent({ overview }: { overview: PortalSupportOverview }) {
  const { t } = useI18n();
  const openRequests = overview.assignedRequests.filter((request) => request.status !== "completed");
  const unlockContext = overview.unlockContext ?? null;
  const generalSupportHref = unlockContext?.supportFormHref ?? "/panel/support/forms/ATL-701";

  const copy = useMemo(
    () => ({
      title: t("portal.support.title"),
      intro: t("portal.support.intro"),
      pageBadge: t("portal.support.pageBadge"),
      viewBadge: t("portal.support.viewBadge"),
      requestsTab: t("portal.support.tabs.requests.label"),
      historyTab: t("portal.support.tabs.history.label"),
      helpTab: t("portal.support.tabs.help.label"),
      requestsHint: t("portal.support.tabs.requests.hint"),
      historyHint: t("portal.support.tabs.history.hint"),
      helpHint: t("portal.support.tabs.help.hint"),
      submissionDate: t("portal.support.submissionDate"),
      submissionUpdated: t("portal.support.submissionUpdated"),
      requestsEmptyTitle: t("portal.support.requestsEmptyTitle"),
      requestsEmptyDescription: t("portal.support.requestsEmptyDescription"),
      historyEmptyTitle: t("portal.support.historyEmptyTitle"),
      historyEmptyDescription: t("portal.support.historyEmptyDescription"),
      requestDescription: t("portal.support.requestDescription"),
      requestDate: t("portal.support.requestDate"),
      requestUpdated: t("portal.support.requestUpdated"),
      supportCenter: t("portal.support.supportCenter"),
      services: t("portal.nav.services"),
      process: t("portal.nav.process"),
      generalSupportForm: t("portal.support.generalSupportForm"),
      generalSupportTitle: t("portal.support.generalSupportTitle"),
      generalSupportDescription: t("portal.support.generalSupportDescription"),
      generalSupportBadge: t("portal.support.generalSupportBadge"),
      generalSupportAction: t("portal.support.generalSupportAction"),
      quickDirectionsTitle: t("portal.support.quickDirectionsTitle"),
      quickDirectionsDescription: t("portal.support.quickDirectionsDescription"),
      quickDirectionsServices: t("portal.support.quickDirectionsServices"),
      quickDirectionsProcess: t("portal.support.quickDirectionsProcess"),
      quickDirectionsSettings: t("portal.support.quickDirectionsSettings"),
      supportWaiting: t("portal.support.supportWaiting"),
      supportReviewing: t("portal.support.supportReviewing"),
      supportCompleted: t("portal.support.supportCompleted"),
      supportFlow: t("portal.support.supportFlow"),
      status: {
        pending: {
          label: t("portal.support.status.pending.label"),
          badge: t("portal.support.status.pending.badge"),
        },
        submitted: {
          label: t("portal.support.status.submitted.label"),
          badge: t("portal.support.status.submitted.badge"),
        },
        completed: {
          label: t("portal.support.status.completed.label"),
          badge: t("portal.support.status.completed.badge"),
        },
      },
    }),
    [t],
  );

  useClientGuidance(
    useMemo(
      () => ({
        focusLabel:
          openRequests.length > 0
            ? copy.supportWaiting
            : copy.supportCompleted,
        summary:
          openRequests.length > 0
            ? copy.intro
            : copy.generalSupportDescription,
        pendingCount: openRequests.length,
        metrics: [
          { label: t("portal.support.metrics.waiting"), value: `${openRequests.length}` },
          { label: t("portal.support.metrics.submissions"), value: `${overview.submissionHistory.length}` },
          { label: t("portal.support.metrics.generalSupport"), value: "ATL-701" },
        ],
      }),
      [copy.generalSupportDescription, copy.intro, copy.supportCompleted, copy.supportWaiting, openRequests.length, overview.submissionHistory.length, t],
    ),
  );

  return (
    <div className="space-y-6">
      <section className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <Badge className="border-0 bg-primary/14 text-primary">{copy.pageBadge}</Badge>
          <Badge variant="outline" className="border-white/10 bg-white/[0.03] text-slate-200">
            {copy.viewBadge}
          </Badge>
        </div>
        <div>
          <h1 className="text-[2.15rem] font-semibold tracking-tight text-white">{copy.title}</h1>
          <p className="mt-3 max-w-3xl text-sm leading-7 text-muted-foreground">
            {copy.intro}
          </p>
        </div>
      </section>

      {unlockContext ? <SupportUnlockContextCard context={unlockContext} /> : null}

      <section className="grid gap-5 xl:grid-cols-[1.08fr_0.92fr]">
        <SupportFocusPanel
          kicker={copy.requestsTab}
          title={openRequests.length > 0 ? copy.supportWaiting : copy.supportCompleted}
          summary={
            openRequests.length > 0
              ? copy.requestsHint
              : copy.generalSupportDescription
          }
          accent={openRequests.length > 0 ? "warning" : "primary"}
          metrics={[
            { label: t("portal.support.metrics.waiting"), value: `${openRequests.length}` },
            { label: t("portal.support.metrics.reviewing"), value: `${overview.assignedRequests.filter((request) => request.status === "submitted").length}` },
            { label: t("portal.support.metrics.completed"), value: `${overview.assignedRequests.filter((request) => request.status === "completed").length}` },
          ]}
          primary={{ label: copy.requestsTab, href: "#requests" }}
          secondary={{ label: copy.generalSupportForm, href: generalSupportHref }}
        />

        <SupportFocusPanel
          kicker={copy.helpTab}
          title={copy.supportFlow}
          summary={copy.intro}
          accent="primary"
          metrics={[
            { label: t("portal.support.metrics.submissions"), value: `${overview.submissionHistory.length}` },
            { label: t("portal.support.metrics.openThreads"), value: `${openRequests.length}` },
            { label: t("portal.support.metrics.generalSupport"), value: "ATL-701" },
          ]}
          primary={{ label: copy.historyTab, href: "#history" }}
          secondary={{ label: copy.process, href: "/panel/process" }}
        />
      </section>

      <Tabs defaultValue="requests" className="space-y-6">
        <TabsList className="grid w-full max-w-xl grid-cols-3">
          <TabsTrigger value="requests">{copy.requestsTab}</TabsTrigger>
          <TabsTrigger value="history">{copy.historyTab}</TabsTrigger>
          <TabsTrigger value="help">{copy.helpTab}</TabsTrigger>
        </TabsList>

        <TabsContent value="requests" className="space-y-4" id="requests">
          {overview.assignedRequests.length === 0 ? (
            <div className="rounded-[1.55rem] border border-dashed border-white/10 bg-card/80 p-10 text-center">
              <CheckCircle2 className="mx-auto h-10 w-10 text-emerald-300" />
              <h3 className="mt-4 text-lg font-semibold">{copy.requestsEmptyTitle}</h3>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                {copy.requestsEmptyDescription}
              </p>
              <div className="mt-5 flex flex-wrap justify-center gap-2">
                <Button asChild>
                  <Link href={generalSupportHref}>{copy.generalSupportAction}</Link>
                </Button>
                <Button asChild variant="outline">
                  <Link href="/panel/services">{copy.services}</Link>
                </Button>
              </div>
            </div>
          ) : (
            <div className="grid gap-4 xl:grid-cols-2">
              {overview.assignedRequests.map((request, index) => {
                const requestCopy = copy.status[request.status as keyof typeof copy.status];

                return (
                  <motion.div
                    key={request.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.04 }}
                    className="rounded-[1.55rem] border border-white/8 bg-card/85 p-5"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge variant="outline" className="font-mono text-[10px]">
                            {request.formCode}
                          </Badge>
                          <Badge className={requestCopy.badge}>{requestCopy.label}</Badge>
                        </div>
                        <h3 className="mt-3 text-lg font-semibold tracking-tight">{request.title}</h3>
                        <p className="mt-2 text-sm leading-6 text-muted-foreground">
                          {request.summary}
                        </p>
                      </div>
                      {request.status === "pending" ? (
                        <ShieldAlert className="mt-1 h-5 w-5 shrink-0 text-amber-300" />
                      ) : (
                        <Clock3 className="mt-1 h-5 w-5 shrink-0 text-primary" />
                      )}
                    </div>

                    <div className="mt-4 rounded-2xl border border-white/8 bg-background/45 p-4">
                      <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
                        {copy.requestDescription}
                      </p>
                      <p className="mt-2 text-sm leading-6 text-muted-foreground">
                        {request.description}
                      </p>
                      {request.requestedFields.length > 0 ? (
                        <div className="mt-3 flex flex-wrap gap-2">
                          {request.requestedFields.map((field) => (
                            <Badge key={field} variant="outline" className="text-[10px]">
                              {toHumanFieldLabel(t, field)}
                            </Badge>
                          ))}
                        </div>
                      ) : null}
                    </div>

                    <div className="mt-4 flex flex-wrap gap-2 text-[11px] text-muted-foreground">
                      <span>{copy.requestDate}: {formatDate(request.requestedAt)}</span>
                      <span>{copy.requestUpdated}: {formatDate(request.updatedAt)}</span>
                    </div>

                    <div className="mt-5 flex flex-wrap gap-2">
                      <Button asChild size="lg" className="rounded-2xl">
                        <Link href={request.primaryAction.href}>{request.primaryAction.label}</Link>
                      </Button>
                      {request.secondaryAction ? (
                        <Button asChild size="lg" variant="outline" className="rounded-2xl">
                          <Link href={request.secondaryAction.href}>{request.secondaryAction.label}</Link>
                        </Button>
                      ) : null}
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </TabsContent>

        <TabsContent value="history" className="space-y-4" id="history">
          {overview.submissionHistory.length === 0 ? (
            <div className="rounded-[1.55rem] border border-dashed border-white/10 bg-card/80 p-10 text-center">
              <FileText className="mx-auto h-10 w-10 text-muted-foreground/35" />
              <h3 className="mt-4 text-lg font-semibold">{copy.historyEmptyTitle}</h3>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                {copy.historyEmptyDescription}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {overview.submissionHistory.map((submission, index) => {
                const status = submission.status as FormSubmissionStatus;
                return (
                  <motion.div
                    key={submission.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.03 }}
                  >
                    <Link
                      href={`/panel/support/submissions/${submission.id}`}
                      className="block rounded-[1.45rem] border border-white/8 bg-card/85 p-4 transition hover:border-primary/25 hover:bg-card"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="font-mono text-[10px]">
                              {submission.formCode}
                            </Badge>
                            <p className="truncate text-sm font-medium">{submission.title}</p>
                          </div>
                          <p className="mt-2 text-xs text-muted-foreground">
                            {copy.submissionDate}: {formatDate(submission.createdAt)} · {copy.submissionUpdated}:{" "}
                            {formatDate(submission.updatedAt)}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge
                            className={cn(
                              "text-[11px]",
                              FORM_SUBMISSION_STATUS_COLORS[status] ?? "bg-muted text-muted-foreground"
                            )}
                          >
                            {FORM_SUBMISSION_STATUS_LABELS[status] ?? submission.status}
                          </Badge>
                          <ArrowRight className="h-4 w-4 text-muted-foreground" />
                        </div>
                      </div>
                    </Link>
                  </motion.div>
                );
              })}
            </div>
          )}
        </TabsContent>

        <TabsContent value="help" className="space-y-4">
          <div className="grid gap-4 lg:grid-cols-[1.15fr_0.85fr]">
            <div className="rounded-[1.55rem] border border-white/8 bg-card/85 p-5">
              <div className="flex items-center gap-2">
                <LifeBuoy className="h-4 w-4 text-primary" />
                <div>
                  <h3 className="text-lg font-semibold tracking-tight">{copy.generalSupportTitle}</h3>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {copy.generalSupportDescription}
                  </p>
                </div>
              </div>
              <div className="mt-5 rounded-2xl border border-cyan-500/20 bg-cyan-500/5 p-4">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="outline" className="font-mono text-[10px]">
                    ATL-701
                  </Badge>
                  <Badge className="border-0 bg-cyan-500/15 text-cyan-200">{copy.generalSupportBadge}</Badge>
                </div>
                <p className="mt-3 text-sm leading-6 text-muted-foreground">
                  {copy.generalSupportDescription}
                </p>
                <div className="mt-5 flex flex-wrap gap-2">
                  <Button asChild className="rounded-2xl">
                    <Link href="/panel/support/forms/ATL-701">{copy.generalSupportAction}</Link>
                  </Button>
                  <Button asChild variant="outline" className="rounded-2xl">
                    <Link href="/panel/process">{copy.process}</Link>
                  </Button>
                </div>
              </div>
            </div>

            <div className="rounded-[1.55rem] border border-white/8 bg-card/85 p-5">
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-primary" />
                <div>
                  <h3 className="text-lg font-semibold tracking-tight">{copy.quickDirectionsTitle}</h3>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {copy.quickDirectionsDescription}
                  </p>
                </div>
              </div>
              <div className="mt-5 space-y-3">
                <Link
                  href="/panel/services"
                  className="flex items-center justify-between rounded-2xl border border-white/8 bg-background/45 px-4 py-3 text-sm transition hover:border-primary/25"
                >
                  <span>{copy.quickDirectionsServices}</span>
                  <ArrowRight className="h-4 w-4 text-muted-foreground" />
                </Link>
                <Link
                  href="/panel/process"
                  className="flex items-center justify-between rounded-2xl border border-white/8 bg-background/45 px-4 py-3 text-sm transition hover:border-primary/25"
                >
                  <span>{copy.quickDirectionsProcess}</span>
                  <ArrowRight className="h-4 w-4 text-muted-foreground" />
                </Link>
                <Link
                  href="/panel/settings"
                  className="flex items-center justify-between rounded-2xl border border-white/8 bg-background/45 px-4 py-3 text-sm transition hover:border-primary/25"
                >
                  <span>{copy.quickDirectionsSettings}</span>
                  <ArrowRight className="h-4 w-4 text-muted-foreground" />
                </Link>
              </div>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function SupportFocusPanel({
  kicker,
  title,
  summary,
  metrics,
  primary,
  secondary,
  accent,
}: {
  kicker: string;
  title: string;
  summary: string;
  metrics: Array<{ label: string; value: string }>;
  primary: { label: string; href: string };
  secondary: { label: string; href: string };
  accent: "warning" | "primary";
}) {
  return (
    <div
      className={cn(
        "rounded-[1.8rem] border p-6",
        accent === "warning"
          ? "border-amber-300/15 bg-[linear-gradient(135deg,rgba(29,24,13,0.95),rgba(10,14,24,0.96))]"
          : "border-primary/18 bg-[linear-gradient(135deg,rgba(10,18,33,0.98),rgba(9,24,31,0.96))]",
      )}
    >
      <div className="flex flex-col gap-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">{kicker}</p>
            <h2 className="mt-3 text-[1.75rem] font-semibold tracking-tight text-white">{title}</h2>
            <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-300/86">{summary}</p>
          </div>
          <div className="grid gap-3 sm:grid-cols-3 xl:min-w-[310px]">
            {metrics.map((metric) => (
              <div key={metric.label} className="rounded-[1.15rem] border border-white/8 bg-white/[0.03] px-4 py-3">
                <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">{metric.label}</p>
                <p className="mt-2 text-[1.6rem] font-semibold tracking-tight text-white">{metric.value}</p>
              </div>
            ))}
          </div>
        </div>
        <div className="flex flex-wrap gap-3">
          <Button asChild className="rounded-2xl">
            <Link href={primary.href}>{primary.label}</Link>
          </Button>
          <Button asChild variant="outline" className="rounded-2xl border-white/10 bg-white/[0.03] text-slate-200">
            <Link href={secondary.href}>{secondary.label}</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}

function SupportUnlockContextCard({ context }: { context: PortalSupportUnlockContext }) {
  return (
    <div className="rounded-[1.6rem] border border-cyan-400/20 bg-[linear-gradient(135deg,rgba(7,25,43,0.98),rgba(8,15,28,0.96))] p-5">
      <div className="flex flex-wrap items-center gap-2">
        <Badge className="border-0 bg-cyan-500/15 text-cyan-100">Unlock context</Badge>
        <Badge variant="outline" className="border-white/10 bg-white/[0.03] text-slate-200">
          {context.fromLabel}
        </Badge>
        {context.priceLabel ? (
          <Badge variant="outline" className="border-white/10 bg-white/[0.03] text-slate-200">
            {context.priceLabel}
          </Badge>
        ) : null}
      </div>
      <div className="mt-4 grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
        <div>
          <h2 className="text-lg font-semibold tracking-tight text-white">{context.offerTitle}</h2>
          <p className="mt-2 text-sm leading-6 text-slate-300/85">{context.offerSummary}</p>
          <p className="mt-3 text-xs leading-6 text-slate-400">
            Bu destek ekranı bir modül açma CTA&apos;sından geldi. Gönderdiğiniz talep Atlas ekibine hangi modül ve hangi paket için yazdığınızı açık bağlamla iletecek.
          </p>
        </div>
        <div className="rounded-2xl border border-white/8 bg-black/20 p-4">
          <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">Hazır bağlam</p>
          <p className="mt-3 text-sm text-slate-200">{context.threadSubjectPrefix}</p>
          <pre className="mt-3 whitespace-pre-wrap text-xs leading-6 text-slate-400">{context.threadMessagePrefix}</pre>
          <div className="mt-4 flex flex-wrap gap-2">
            <Button asChild className="rounded-2xl">
              <Link href={context.supportFormHref}>Genel destek formunu aç</Link>
            </Button>
            {context.billingHref ? (
              <Button asChild variant="outline" className="rounded-2xl border-white/10 bg-white/[0.03] text-slate-200">
                <Link href={context.billingHref}>Faturalamayı aç</Link>
              </Button>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
