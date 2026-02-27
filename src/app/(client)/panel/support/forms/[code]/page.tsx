"use client";

/**
 * Atlas Form Doldurma Sayfası
 * /panel/support/forms/ATL-101 gibi dinamik route
 */

import { use, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/shared/page-header";
import { DynamicFormRenderer } from "@/components/forms/dynamic-form-renderer";
import { getFormByCode, FORM_CATEGORIES } from "@/lib/forms";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import { ArrowLeft, FileText, CheckCircle } from "lucide-react";
import { cn } from "@/lib/utils";

interface FormPageProps {
  params: Promise<{ code: string }>;
}

export default function FormFillPage({ params }: FormPageProps) {
  const { code } = use(params);
  const router = useRouter();
  const supabase = createClient();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const formDef = getFormByCode(code.toUpperCase());
  const categoryMeta = formDef
    ? FORM_CATEGORIES.find((c) => c.id === formDef.category)
    : null;

  if (!formDef) {
    return (
      <div className="space-y-6">
        <PageHeader title="Form Bulunamadı" />
        <div className="rounded-xl border bg-card p-12 text-center">
          <FileText className="mx-auto h-10 w-10 text-muted-foreground/30 mb-3" />
          <p className="text-sm text-muted-foreground mb-4">
            <strong>{code}</strong> kodlu form bulunamadı.
          </p>
          <Button variant="outline" onClick={() => router.push("/panel/support")}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Formlara Dön
          </Button>
        </div>
      </div>
    );
  }

  // ─── Success State ───
  if (submitted) {
    return (
      <div className="space-y-6">
        <PageHeader title="Form Gönderildi" />
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="rounded-xl border bg-card p-12 text-center max-w-lg mx-auto"
        >
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/10 mx-auto mb-4">
            <CheckCircle className="h-8 w-8 text-emerald-500" />
          </div>
          <h2 className="text-lg font-semibold mb-2">Formunuz Başarıyla Gönderildi!</h2>
          <p className="text-sm text-muted-foreground mb-1">
            <Badge variant="outline" className="font-mono">{formDef.code}</Badge> — {formDef.title}
          </p>
          <p className="text-sm text-muted-foreground mb-6">
            Ekibimiz en kısa sürede talebinizi inceleyecek ve size dönüş yapacaktır.
          </p>
          <div className="flex gap-3 justify-center">
            <Button variant="outline" onClick={() => router.push("/panel/support")}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Formlara Dön
            </Button>
            <Button onClick={() => setSubmitted(false)}>
              Tekrar Doldur
            </Button>
          </div>
        </motion.div>
      </div>
    );
  }

  // ─── Form Submit Handler ───
  async function handleSubmit(data: Record<string, unknown>) {
    setIsSubmitting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error("Oturum bulunamadı", { description: "Lütfen tekrar giriş yapın." });
        return;
      }

      const { error } = await supabase.from("form_submissions").insert({
        form_code: formDef!.code,
        user_id: user.id,
        data: data as unknown as import("@/types/database").Json,
        status: "submitted",
      });

      if (error) {
        toast.error("Gönderilemedi", { description: error.message });
        return;
      }

      toast.success("Form başarıyla gönderildi!");
      setSubmitted(true);
    } catch {
      toast.error("Beklenmedik bir hata oluştu");
    } finally {
      setIsSubmitting(false);
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
        {categoryMeta && (
          <>
            <span className="text-muted-foreground">/</span>
            <span className={cn("text-xs font-medium", categoryMeta.color)}>
              {categoryMeta.label}
            </span>
          </>
        )}
        <span className="text-muted-foreground">/</span>
        <Badge variant="outline" className="text-[10px] font-mono">
          {formDef.code}
        </Badge>
      </div>

      <PageHeader title={formDef.title} description={formDef.description} />

      {/* Form */}
      <div className="rounded-xl border bg-card p-6 max-w-3xl">
        <DynamicFormRenderer
          form={formDef}
          onSubmit={handleSubmit}
          isSubmitting={isSubmitting}
        />
      </div>
    </div>
  );
}
