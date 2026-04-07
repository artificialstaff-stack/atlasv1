"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { ArrowLeft, CheckCircle, FileText, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DynamicFormRenderer } from "@/components/forms/dynamic-form-renderer";
import { FORM_CATEGORIES } from "@/lib/forms";
import type { FormDefinition } from "@/lib/forms/types";
import { cn } from "@/lib/utils";
import { PortalPageHero } from "@/components/portal/portal-page-hero";
import { useClientGuidance } from "../../../../_components/client-guidance-provider";
import { useI18n } from "@/i18n/provider";
import type { PortalSupportUnlockContext } from "@/lib/customer-portal/types";

interface FormFillContentProps {
  code: string;
  formDef: FormDefinition | null;
  canAccess: boolean;
  unlockContext?: PortalSupportUnlockContext | null;
}

export function FormFillContent({ code, formDef, canAccess, unlockContext = null }: FormFillContentProps) {
  const router = useRouter();
  const { locale, t } = useI18n();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const categoryMeta = formDef
    ? FORM_CATEGORIES.find((category) => category.id === formDef.category)
    : null;

  const tf = (key: string, fallback: string, params?: Record<string, string | number>) => {
    const translated = t(key, params);
    return translated === key ? fallback : translated;
  };

  const copy = useMemo(
    () => ({
      missingTitle: tf("portal.support.formFill.missingTitle", locale === "en" ? "Form not found" : "Form bulunamadı"),
      missingDescription: tf("portal.support.formFill.missingDescription", locale === "en" ? `No active support form found for ${code}.` : `${code} için aktif bir destek formu bulunamadı.`, { code }),
      lockedTitle: tf("portal.support.formFill.lockedTitle", locale === "en" ? "Form access is locked" : "Form erişimi şu an kapalı"),
      lockedDescription: tf("portal.support.formFill.lockedDescription", locale === "en" ? "This form only opens when ATLAS assigns it or when it is available in general support scope." : "Bu form yalnızca Atlas atadığında veya genel destek kapsamına girdiğinde açılır."),
      submittedTitle: tf("portal.support.formFill.submittedTitle", locale === "en" ? "Submission received" : "Gönderim alındı"),
      submittedDescription: tf("portal.support.formFill.submittedDescription", locale === "en" ? `${code} was submitted successfully.` : `${code} başarıyla gönderildi.`, { code }),
      submitErrorTitle: tf("portal.support.formFill.submitErrorTitle", locale === "en" ? "Submission failed" : "Gönderim başarısız"),
      submitErrorDescription: tf("portal.support.formFill.submitErrorDescription", locale === "en" ? "Please retry after checking required fields." : "Zorunlu alanları kontrol edip tekrar deneyin."),
      submitSuccess: tf("portal.support.formFill.submitSuccess", locale === "en" ? "Your form was sent to the ATLAS team." : "Formunuz Atlas ekibine iletildi."),
      retry: tf("portal.support.formFill.retry", locale === "en" ? "Retry" : "Tekrar dene"),
      backToSupport: tf("portal.support.formFill.backToSupport", locale === "en" ? "Back to support" : "Desteğe dön"),
      supportCenter: tf("portal.support.formFill.supportCenter", locale === "en" ? "Support" : "Destek"),
      generalSupportForm: tf("portal.support.formFill.generalSupportForm", locale === "en" ? "General support form" : "Genel destek formu"),
      fillDescription: tf("portal.support.formFill.fillDescription", locale === "en" ? "Complete the form below so the ATLAS team can continue the flow." : "Atlas ekibinin akışı sürdürebilmesi için aşağıdaki formu tamamlayın."),
      statusReady: tf("portal.support.formFill.statusReady", locale === "en" ? "Ready" : "Hazır"),
      statusLocked: tf("portal.support.formFill.statusLocked", locale === "en" ? "Locked" : "Kilitli"),
      statusSending: tf("portal.support.formFill.statusSending", locale === "en" ? "Sending" : "Gönderiliyor"),
      form: tf("common.form", locale === "en" ? "Form" : "Form"),
      category: tf("common.category", locale === "en" ? "Category" : "Kategori"),
      status: tf("common.status", locale === "en" ? "Status" : "Durum"),
      supportFlow: tf("portal.support.formFill.supportFlow", locale === "en" ? "Support flow" : "Destek akışı"),
      assignedRequest: tf("portal.support.formFill.assignedRequest", locale === "en" ? "Assigned request" : "Atanmış istek"),
      formAccessNote: tf("portal.support.formFill.formAccessNote", locale === "en" ? "This form is visible only when ATLAS explicitly assigns it or opens it under general support." : "Bu form yalnızca Atlas açıkça atadığında veya genel destek kapsamında açtığında görünür."),
      backToServices: tf("portal.support.formFill.backToServices", locale === "en" ? "Back to services" : "Hizmetlere dön"),
      categoryFallback: tf("portal.support.formFill.categoryFallback", locale === "en" ? "General support" : "Genel destek"),
      generalSupportFormDescription: tf("portal.support.formFill.generalSupportFormDescription", locale === "en" ? "Open the general support form and continue with the same context." : "Genel destek formunu aç ve aynı bağlamla devam et."),
    }),
    [code, locale, t],
  );

  useClientGuidance(
    useMemo(
      () => ({
        focusLabel:
          !formDef
            ? copy.missingTitle
            : !canAccess
              ? copy.lockedTitle
              : submitted
                ? copy.submittedTitle
                : copy.assignedRequest,
        summary:
          !formDef
            ? copy.missingDescription
            : !canAccess
              ? copy.lockedDescription
              : submitted
                ? copy.submittedDescription
                : copy.fillDescription,
        metrics: [
          { label: copy.form, value: formDef?.code ?? code },
          { label: copy.category, value: categoryMeta?.label ?? copy.categoryFallback },
          { label: copy.status, value: submitted ? copy.statusReady : canAccess ? copy.statusReady : copy.statusLocked },
        ],
      }),
      [canAccess, categoryMeta?.label, code, copy, formDef, submitted],
    ),
  );

  if (!formDef) {
    return (
      <div className="space-y-6">
        <PortalPageHero
          eyebrow={copy.supportFlow}
          title={copy.missingTitle}
          description={copy.missingDescription}
          surfaceVariant="secondary"
          primaryAction={{
            id: "form-missing:support",
            label: copy.supportCenter,
            href: unlockContext?.supportHubHref ?? "/panel/support",
            description: copy.backToSupport,
            kind: "open_support",
          }}
          secondaryAction={{
            id: "form-missing:services",
            label: t("portal.nav.services"),
            href: "/panel/services",
            description: copy.backToServices,
            kind: "open_services",
            emphasis: "secondary",
          }}
        />
        <div className="rounded-xl border bg-card p-12 text-center">
          <FileText className="mx-auto mb-3 h-10 w-10 text-muted-foreground/30" />
          <p className="mb-4 text-sm text-muted-foreground">
            <strong>{code}</strong> {copy.missingDescription}
          </p>
          <Button variant="outline" onClick={() => router.push("/panel/support")}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            {copy.backToSupport}
          </Button>
        </div>
      </div>
    );
  }

  if (!canAccess) {
    return (
      <div className="space-y-6">
        <PortalPageHero
          eyebrow={copy.supportFlow}
          title={copy.lockedTitle}
          description={copy.lockedDescription}
          surfaceVariant="secondary"
          metrics={[
            { label: copy.form, value: formDef.code },
            { label: copy.category, value: categoryMeta?.label ?? copy.categoryFallback },
            { label: copy.status, value: copy.statusLocked },
          ]}
          primaryAction={{
            id: "form-locked:support",
            label: copy.supportCenter,
            href: unlockContext?.supportHubHref ?? "/panel/support",
            description: copy.backToSupport,
            kind: "open_support",
          }}
          secondaryAction={{
            id: "form-locked:general",
            label: copy.generalSupportForm,
            href: "/panel/support/forms/ATL-701",
            description: copy.generalSupportFormDescription,
            kind: "form_request",
            emphasis: "secondary",
          }}
        />
        <div className="rounded-[1.55rem] border border-amber-500/20 bg-card/85 p-12 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-amber-500/10">
            <ShieldAlert className="h-8 w-8 text-amber-300" />
          </div>
          <p className="mx-auto max-w-lg text-sm leading-6 text-muted-foreground">
            <Badge variant="outline" className="font-mono">
              {formDef.code}
            </Badge>{" "}
            {copy.formAccessNote}
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <Button onClick={() => router.push(unlockContext?.supportHubHref ?? "/panel/support")}>{copy.backToSupport}</Button>
            <Button variant="outline" onClick={() => router.push(unlockContext?.supportFormHref ?? "/panel/support/forms/ATL-701")}>
              {copy.generalSupportForm}
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="space-y-6">
        <PortalPageHero
          eyebrow={copy.supportFlow}
          title={copy.submittedTitle}
          description={copy.submittedDescription}
          surfaceVariant="secondary"
          metrics={[
            { label: copy.form, value: formDef.code },
            { label: copy.category, value: categoryMeta?.label ?? copy.categoryFallback },
            { label: copy.status, value: copy.statusReady },
          ]}
          primaryAction={{
            id: "form-submitted:support",
            label: copy.supportCenter,
            href: unlockContext?.supportHubHref ?? "/panel/support",
            description: copy.backToSupport,
            kind: "open_support",
          }}
          secondaryAction={{
            id: "form-submitted:services",
            label: t("portal.nav.services"),
            href: "/panel/services",
            description: copy.backToServices,
            kind: "open_services",
            emphasis: "secondary",
          }}
        />
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="mx-auto max-w-lg rounded-xl border bg-card p-12 text-center"
        >
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/10">
            <CheckCircle className="h-8 w-8 text-emerald-500" />
          </div>
          <h2 className="mb-2 text-lg font-semibold">{copy.submittedTitle}</h2>
          <p className="mb-1 text-sm text-muted-foreground">
            <Badge variant="outline" className="font-mono">
              {formDef.code}
            </Badge>{" "}
            — {formDef.title}
          </p>
          <p className="mb-6 text-sm text-muted-foreground">{copy.submitSuccess}</p>
          <div className="flex justify-center gap-3">
            <Button variant="outline" onClick={() => router.push(unlockContext?.supportHubHref ?? "/panel/support")}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              {copy.backToSupport}
            </Button>
            <Button onClick={() => setSubmitted(false)}>{copy.retry}</Button>
          </div>
        </motion.div>
      </div>
    );
  }

  const activeForm = formDef;

  async function handleSubmit(data: Record<string, unknown>) {
    setIsSubmitting(true);

    try {
      const response = await fetch("/api/forms/submit", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          form_code: activeForm.code,
          data,
        }),
      });

      const payload = (await response.json().catch(() => null)) as
        | { error?: string; message?: string }
        | null;

      if (!response.ok) {
        toast.error(copy.submitErrorTitle, {
          description: payload?.error ?? copy.submitErrorDescription,
        });
        return;
      }

      toast.success(payload?.message ?? copy.submitSuccess);
      setSubmitted(true);
    } catch {
      toast.error(copy.submitErrorTitle, {
        description: copy.submitErrorDescription,
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="space-y-6">
      <PortalPageHero
        eyebrow={copy.supportFlow}
        title={formDef.title}
        description={formDef.description}
        surfaceVariant="secondary"
        badges={[formDef.code, categoryMeta?.label ?? t("portal.support.formFill.categoryFallback")]}
        metrics={[
          { label: copy.form, value: formDef.code },
          { label: copy.category, value: categoryMeta?.label ?? copy.categoryFallback },
          { label: copy.status, value: isSubmitting ? copy.statusSending : copy.statusReady },
        ]}
        primaryAction={{
          id: "form-fill:support",
          label: copy.supportCenter,
          href: unlockContext?.supportHubHref ?? "/panel/support",
          description: copy.backToSupport,
          kind: "open_support",
        }}
        secondaryAction={{
          id: "form-fill:services",
          label: t("portal.nav.services"),
          href: "/panel/services",
          description: copy.backToServices,
          kind: "open_services",
          emphasis: "secondary",
        }}
      >
        {unlockContext ? (
          <div className="rounded-2xl border border-cyan-400/20 bg-cyan-500/8 px-4 py-3 text-sm leading-6 text-slate-200/90">
            <span className="font-medium text-white">{unlockContext.fromLabel}</span> icin acilan baglam:
            {" "}
            {unlockContext.offerTitle}
            {unlockContext.priceLabel ? ` · ${unlockContext.priceLabel}` : ""}
          </div>
        ) : null}
        <div className="rounded-2xl border border-white/8 bg-background/35 px-4 py-3 text-sm leading-6 text-slate-200/90">
          {copy.fillDescription}
        </div>
      </PortalPageHero>

      <div className="atlas-workbench-panel rounded-[1.55rem] p-6">
        <DynamicFormRenderer form={activeForm} onSubmit={handleSubmit} isSubmitting={isSubmitting} />
      </div>
    </div>
  );
}
