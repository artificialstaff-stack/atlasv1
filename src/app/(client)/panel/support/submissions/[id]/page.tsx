"use client";

/**
 * Form Gönderim Detay Sayfası — Müşteri
 * /panel/support/submissions/[id]
 */

import { use, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { createClient } from "@/lib/supabase/client";
import { getFormByCode, FORM_CATEGORIES } from "@/lib/forms";
import {
  FORM_SUBMISSION_STATUS_LABELS,
  FORM_SUBMISSION_STATUS_COLORS,
  type FormSubmissionStatus,
} from "@/lib/forms/types";
import { cn, formatDate } from "@/lib/utils";
import { ArrowLeft, FileText, Clock, MessageCircle } from "lucide-react";
import { PortalPageHero } from "@/components/portal/portal-page-hero";
import { useClientGuidance } from "../../../_components/client-guidance-provider";
import { useI18n } from "@/i18n/provider";

interface SubmissionDetailPageProps {
  params: Promise<{ id: string }>;
}

interface SubmissionRow {
  id: string;
  form_code: string;
  user_id: string;
  data: Record<string, unknown>;
  status: string;
  admin_notes: string | null;
  created_at: string;
  updated_at: string;
}

export default function SubmissionDetailPage({ params }: SubmissionDetailPageProps) {
  const { id } = use(params);
  const router = useRouter();
  const { t } = useI18n();
  const supabase = createClient();
  const [submission, setSubmission] = useState<SubmissionRow | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetch() {
      const { data } = await supabase
        .from("form_submissions")
        .select("*")
        .eq("id", id)
        .single();
      setSubmission(data as SubmissionRow | null);
      setLoading(false);
    }
    fetch();
  }, [supabase, id]);

  const formDef = submission ? getFormByCode(submission.form_code) : null;
  const categoryMeta = formDef ? FORM_CATEGORIES.find((c) => c.id === formDef.category) : null;
  const status = submission?.status as FormSubmissionStatus | undefined;
  const statusLabel = status ? (FORM_SUBMISSION_STATUS_LABELS[status] ?? status) : t("portal.support.submissionDetail.statusUnavailable");
  const statusColors = status
    ? (FORM_SUBMISSION_STATUS_COLORS[status] ?? "text-muted-foreground bg-muted")
    : "text-muted-foreground bg-muted";

  const copy = useMemo(
    () => ({
      loadingTitle: t("portal.support.submissionDetail.loadingTitle"),
      loadingDescription: t("portal.support.submissionDetail.loadingDescription"),
      missingTitle: t("portal.support.submissionDetail.missingTitle"),
      missingDescription: t("portal.support.submissionDetail.missingDescription"),
      detailTitle: t("portal.support.submissionDetail.detailTitle"),
      detailDescription: t("portal.support.submissionDetail.detailDescription", { code: submission?.form_code ?? "—" }),
      statusTitle: t("portal.support.submissionDetail.statusTitle"),
      sentLabel: t("portal.support.submissionDetail.sentLabel"),
      updatedLabel: t("portal.support.submissionDetail.updatedLabel"),
      atlasNoteTitle: t("portal.support.submissionDetail.atlasNoteTitle"),
      backToSupport: t("portal.support.submissionDetail.backToSupport"),
      openServices: t("portal.support.submissionDetail.openServices"),
      form: t("common.form"),
      category: t("common.category"),
      status: t("common.status"),
      statusUnavailable: t("portal.support.submissionDetail.statusUnavailable"),
      supportFlow: t("portal.support.submissionDetail.supportFlow"),
      loadingCardTitle: t("portal.support.submissionDetail.loadingCardTitle"),
      missingCardTitle: t("portal.support.submissionDetail.missingCardTitle"),
    }),
    [submission?.form_code, t],
  );

  useClientGuidance(
    useMemo(
      () => ({
        focusLabel: loading
          ? copy.loadingTitle
          : !submission
            ? copy.missingTitle
            : copy.detailTitle,
        summary: loading
          ? copy.loadingDescription
          : !submission
            ? copy.missingDescription
            : copy.detailDescription,
        metrics: [
          { label: copy.form, value: submission?.form_code ?? "—" },
          { label: copy.category, value: categoryMeta?.label ?? t("portal.support.submissionDetail.categoryFallback") },
          {
            label: copy.status,
            value: submission ? statusLabel : loading ? t("common.loading") : copy.statusUnavailable,
          },
        ],
      }),
      [categoryMeta?.label, copy, loading, statusLabel, submission, t],
    ),
  );

  if (loading) {
    return (
      <div className="space-y-6">
        <PortalPageHero
          eyebrow={copy.supportFlow}
          title={copy.loadingTitle}
          description={copy.loadingDescription}
          surfaceVariant="secondary"
          primaryAction={{
            id: "submission-loading:support",
            label: t("portal.support.submissionDetail.backToSupport"),
            href: "/panel/support",
            description: copy.backToSupport,
            kind: "open_support",
          }}
        />
      </div>
    );
  }

  if (!submission) {
    return (
      <div className="space-y-6">
        <PortalPageHero
          eyebrow={copy.supportFlow}
          title={copy.missingTitle}
          description={copy.missingDescription}
          surfaceVariant="secondary"
          primaryAction={{
            id: "submission-missing:support",
            label: copy.backToSupport,
            href: "/panel/support",
            description: copy.backToSupport,
            kind: "open_support",
          }}
          secondaryAction={{
            id: "submission-missing:services",
            label: t("portal.nav.services"),
            href: "/panel/services",
            description: copy.openServices,
            kind: "open_services",
            emphasis: "secondary",
          }}
        />
        <div className="rounded-xl border bg-card p-12 text-center">
          <FileText className="mx-auto mb-3 h-10 w-10 text-muted-foreground/30" />
          <p className="mb-4 text-sm text-muted-foreground">{copy.missingDescription}</p>
          <Button variant="outline" onClick={() => router.push("/panel/support")}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            {copy.backToSupport}
          </Button>
        </div>
      </div>
    );
  }

  const fieldLabels: Record<string, string> = {};
  if (formDef) {
    for (const section of formDef.sections) {
      for (const field of section.fields) {
        fieldLabels[field.name] = field.label;
      }
    }
  }

  return (
    <div className="space-y-6">
      <PortalPageHero
        eyebrow={copy.supportFlow}
        title={formDef?.title ?? submission.form_code}
        description={formDef?.description ?? copy.detailDescription}
        surfaceVariant="secondary"
        badges={[submission.form_code, statusLabel]}
        metrics={[
          { label: copy.form, value: submission.form_code },
          { label: copy.category, value: categoryMeta?.label ?? t("portal.support.submissionDetail.categoryFallback") },
          { label: copy.status, value: statusLabel },
        ]}
        primaryAction={{
          id: "submission-detail:support",
          label: copy.backToSupport,
          href: "/panel/support",
          description: copy.backToSupport,
          kind: "open_support",
        }}
        secondaryAction={{
          id: "submission-detail:services",
          label: copy.openServices,
          href: "/panel/services",
          description: copy.openServices,
          kind: "open_services",
          emphasis: "secondary",
        }}
      >
        <div className="rounded-2xl border border-white/8 bg-background/35 px-4 py-3 text-sm leading-6 text-slate-200/90">
          {copy.detailDescription}
        </div>
      </PortalPageHero>

      <div className="grid gap-6 lg:grid-cols-[1fr_300px]">
        <div className="rounded-xl border bg-card p-6 space-y-6">
          <div className="flex items-center gap-3 text-sm text-muted-foreground">
            <Badge variant="outline" className="font-mono text-[10px]">
              {submission.form_code}
            </Badge>
            <span className="flex items-center gap-1 text-[10px]">
              <Clock className="h-3 w-3" />
              {formatDate(submission.created_at)}
            </span>
            {categoryMeta && (
              <span className={cn("text-[10px] font-medium", categoryMeta.color)}>{categoryMeta.label}</span>
            )}
          </div>

          <Separator />

          {formDef ? (
            formDef.sections.map((section, sIdx) => {
              const sectionFields = section.fields.filter(
                (f) => f.type !== "heading" && f.type !== "separator" && submission.data[f.name] !== undefined && submission.data[f.name] !== "",
              );
              if (sectionFields.length === 0) return null;
              return (
                <div key={sIdx} className="space-y-3">
                  <h3 className="text-sm font-semibold">{section.title}</h3>
                  <div className="grid gap-3 sm:grid-cols-2">
                    {sectionFields.map((field) => {
                      const value = submission.data[field.name];
                      const displayValue = Array.isArray(value)
                        ? value.map((v) => field.options?.find((o) => o.value === v)?.label ?? v).join(", ")
                        : field.options?.find((o) => o.value === value)?.label ?? String(value ?? "—");

                      return (
                        <div key={field.name} className="space-y-0.5">
                          <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                            {field.label}
                          </p>
                          <p className="text-sm">{displayValue}</p>
                        </div>
                      );
                    })}
                  </div>
                  {sIdx < formDef.sections.length - 1 && <Separator />}
                </div>
              );
            })
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              {Object.entries(submission.data).map(([key, value]) => (
                <div key={key} className="space-y-0.5">
                  <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                    {fieldLabels[key] ?? key}
                  </p>
                  <p className="text-sm">{String(value ?? "—")}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="space-y-4">
          <div className="rounded-xl border bg-card p-4 space-y-3">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              {copy.statusTitle}
            </h4>
            <Badge className={cn("text-sm", statusColors)}>{statusLabel}</Badge>
            <p className="text-xs text-muted-foreground">
              {copy.sentLabel}: {formatDate(submission.created_at)}
            </p>
            {submission.updated_at !== submission.created_at && (
              <p className="text-xs text-muted-foreground">
                {copy.updatedLabel}: {formatDate(submission.updated_at)}
              </p>
            )}
          </div>

          {submission.admin_notes && (
            <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4 space-y-2">
              <div className="flex items-center gap-2">
                <MessageCircle className="h-4 w-4 text-emerald-500" />
                <h4 className="text-xs font-semibold text-emerald-500">{copy.atlasNoteTitle}</h4>
              </div>
              <p className="text-sm">{submission.admin_notes}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
