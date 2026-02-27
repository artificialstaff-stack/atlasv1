"use client";

/**
 * Form Gönderim Detay Sayfası — Müşteri
 * /panel/support/submissions/[id]
 */

import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/shared/page-header";
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

  if (loading) {
    return (
      <div className="space-y-6">
        <PageHeader title="Yükleniyor..." />
      </div>
    );
  }

  if (!submission) {
    return (
      <div className="space-y-6">
        <PageHeader title="Gönderim Bulunamadı" />
        <div className="rounded-xl border bg-card p-12 text-center">
          <FileText className="mx-auto h-10 w-10 text-muted-foreground/30 mb-3" />
          <p className="text-sm text-muted-foreground mb-4">Bu gönderim bulunamadı veya yetkiniz yok.</p>
          <Button variant="outline" onClick={() => router.push("/panel/support")}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Geri Dön
          </Button>
        </div>
      </div>
    );
  }

  const formDef = getFormByCode(submission.form_code);
  const categoryMeta = formDef ? FORM_CATEGORIES.find((c) => c.id === formDef.category) : null;
  const status = submission.status as FormSubmissionStatus;
  const statusColors = FORM_SUBMISSION_STATUS_COLORS[status] ?? "text-muted-foreground bg-muted";

  // Build field label map from form definition
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
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm">
        <Button variant="ghost" size="sm" onClick={() => router.push("/panel/support")}>
          <ArrowLeft className="mr-1 h-4 w-4" />
          Formlar
        </Button>
        <span className="text-muted-foreground">/</span>
        <span className="text-xs text-muted-foreground">Gönderim Detayı</span>
      </div>

      <PageHeader
        title={formDef?.title ?? submission.form_code}
        description={formDef?.description}
      >
        <Badge className={cn("text-xs", statusColors)}>
          {FORM_SUBMISSION_STATUS_LABELS[status] ?? status}
        </Badge>
      </PageHeader>

      <div className="grid gap-6 lg:grid-cols-[1fr_300px]">
        {/* Main: Form Data */}
        <div className="rounded-xl border bg-card p-6 space-y-6">
          <div className="flex items-center gap-3 text-sm text-muted-foreground">
            <Badge variant="outline" className="font-mono text-[10px]">{submission.form_code}</Badge>
            <span className="flex items-center gap-1 text-[10px]">
              <Clock className="h-3 w-3" />
              {formatDate(submission.created_at)}
            </span>
            {categoryMeta && (
              <span className={cn("text-[10px] font-medium", categoryMeta.color)}>
                {categoryMeta.label}
              </span>
            )}
          </div>

          <Separator />

          {/* Render form data grouped by sections */}
          {formDef ? (
            formDef.sections.map((section, sIdx) => {
              const sectionFields = section.fields.filter(
                (f) => f.type !== "heading" && f.type !== "separator" && submission.data[f.name] !== undefined && submission.data[f.name] !== ""
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
                          <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
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
            /* Fallback: raw key-value */
            <div className="grid gap-3 sm:grid-cols-2">
              {Object.entries(submission.data).map(([key, value]) => (
                <div key={key} className="space-y-0.5">
                  <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
                    {fieldLabels[key] ?? key}
                  </p>
                  <p className="text-sm">{String(value ?? "—")}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Sidebar: Status & Admin Notes */}
        <div className="space-y-4">
          <div className="rounded-xl border bg-card p-4 space-y-3">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Durum</h4>
            <Badge className={cn("text-sm", statusColors)}>
              {FORM_SUBMISSION_STATUS_LABELS[status] ?? status}
            </Badge>
            <p className="text-xs text-muted-foreground">
              Gönderilme: {formatDate(submission.created_at)}
            </p>
            {submission.updated_at !== submission.created_at && (
              <p className="text-xs text-muted-foreground">
                Son güncelleme: {formatDate(submission.updated_at)}
              </p>
            )}
          </div>

          {submission.admin_notes && (
            <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4 space-y-2">
              <div className="flex items-center gap-2">
                <MessageCircle className="h-4 w-4 text-emerald-500" />
                <h4 className="text-xs font-semibold text-emerald-500">Atlas Ekibi Notu</h4>
              </div>
              <p className="text-sm">{submission.admin_notes}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
