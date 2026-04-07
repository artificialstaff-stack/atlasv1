"use client";

import { useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { z } from "zod";
import { toast } from "sonner";
import { ArrowRight, CheckCircle2, Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import type { Json } from "@/types/database";
import {
  extractAttribution,
  mergeAttribution,
  readStoredAttribution,
} from "@/lib/marketing-attribution";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

const leadCaptureSchema = z.object({
  name: z.string().min(2, "Ad soyad en az 2 karakter olmalıdır"),
  email: z.string().email("Geçerli bir e-posta adresi giriniz"),
  phone: z.string().optional(),
  company_name: z.string().optional(),
  current_sales_channels: z.string().optional(),
  target_marketplaces: z.string().optional(),
  monthly_revenue_band: z.string().optional(),
  growth_goal: z.string().optional(),
  timeline: z.string().optional(),
  message: z.string().min(10, "Mesaj en az 10 karakter olmalıdır"),
  consent: z.boolean().refine((value) => value, {
    message: "Başvuruyu göndermek için iletişim onayı gereklidir",
  }),
});

type LeadCaptureState = z.infer<typeof leadCaptureSchema>;
type LeadCaptureErrors = Partial<Record<keyof LeadCaptureState, string>>;

type LeadCaptureVariant = "contact" | "demo" | "webinar";

export interface LeadCaptureFormProps {
  entryPoint: string;
  intent: string;
  title: string;
  description: string;
  submitLabel: string;
  messagePlaceholder: string;
  variant?: LeadCaptureVariant;
  className?: string;
}

const goalOptions = [
  { value: "us-market-entry", label: "ABD pazarına ilk giriş" },
  { value: "multi-channel-growth", label: "Amazon + Shopify + Walmart kurgusu" },
  { value: "margin-optimization", label: "Marj ve kanal ekonomisi analizi" },
  { value: "operations-control", label: "Operasyon ve fulfillment görünürlüğü" },
  { value: "need-guidance", label: "Nereden başlayacağımı bilmiyorum" },
];

const webinarTopicOptions = [
  { value: "marketplace-strategy", label: "Amazon mu Shopify mı Walmart mı?" },
  { value: "unit-economics", label: "Komisyon, marj ve karlılık hesabı" },
  { value: "llc-ein-customs", label: "LLC, EIN ve gümrük süreci" },
  { value: "fulfillment-ops", label: "Virginia depo ve fulfillment operasyonu" },
  { value: "ai-ops", label: "Atlas paneli ve AI operasyon akışı" },
];

const revenueBands = [
  { value: "pre-launch", label: "Henüz satış yok / hazırlık aşaması" },
  { value: "0-250k", label: "0 - 250 bin TL / ay" },
  { value: "250k-1m", label: "250 bin - 1 milyon TL / ay" },
  { value: "1m-5m", label: "1 - 5 milyon TL / ay" },
  { value: "5m-plus", label: "5 milyon TL+ / ay" },
];

const timelineOptions = [
  { value: "0-30-days", label: "0 - 30 gün" },
  { value: "1-3-months", label: "1 - 3 ay" },
  { value: "3-6-months", label: "3 - 6 ay" },
  { value: "researching", label: "Şimdilik araştırma yapıyorum" },
];

function getGoalLabel(variant: LeadCaptureVariant) {
  return variant === "webinar"
    ? "Özellikle hangi konuda içerik görmek istersiniz?"
    : "Öncelikli hedefiniz nedir?";
}

function getGoalOptions(variant: LeadCaptureVariant) {
  return variant === "webinar" ? webinarTopicOptions : goalOptions;
}

function defaultState(): LeadCaptureState {
  return {
    name: "",
    email: "",
    phone: "",
    company_name: "",
    current_sales_channels: "",
    target_marketplaces: "",
    monthly_revenue_band: "",
    growth_goal: "",
    timeline: "",
    message: "",
    consent: false,
  };
}

export function LeadCaptureForm({
  entryPoint,
  intent,
  title,
  description,
  submitLabel,
  messagePlaceholder,
  variant = "demo",
  className,
}: LeadCaptureFormProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const supabase = createClient();
  const [form, setForm] = useState<LeadCaptureState>(defaultState);
  const [errors, setErrors] = useState<LeadCaptureErrors>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  function updateField<K extends keyof LeadCaptureState>(
    key: K,
    value: LeadCaptureState[K],
  ) {
    setForm((current) => ({ ...current, [key]: value }));
    setErrors((current) => ({ ...current, [key]: undefined }));
  }

  function getError(key: keyof LeadCaptureState) {
    if (!errors[key]) {
      return null;
    }

    return <p className="text-xs text-destructive">{errors[key]}</p>;
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const parsed = leadCaptureSchema.safeParse(form);
    if (!parsed.success) {
      setErrors(parsed.error.flatten().fieldErrors as LeadCaptureErrors);
      return;
    }

    setSubmitting(true);

    const liveAttribution = extractAttribution(
      new URLSearchParams(searchParams.toString()),
      pathname,
      document.referrer,
    );
    const storedAttribution = readStoredAttribution(window.localStorage);
    const attribution = mergeAttribution(storedAttribution, liveAttribution);

    const metadata = {
      current_sales_channels: parsed.data.current_sales_channels || null,
      target_marketplaces: parsed.data.target_marketplaces || null,
      monthly_revenue_band: parsed.data.monthly_revenue_band || null,
      growth_goal: parsed.data.growth_goal || null,
      timeline: parsed.data.timeline || null,
      consent_marketing: parsed.data.consent,
      submitted_from: pathname,
      intent,
      variant,
      click_id_type: attribution.click_id_type,
      source_snapshot: attribution,
    } as unknown as Json;

    const { error } = await supabase.from("contact_submissions").insert({
      name: parsed.data.name,
      email: parsed.data.email,
      phone: parsed.data.phone || null,
      company_name: parsed.data.company_name || null,
      message: parsed.data.message,
      status: "new",
      entry_point: entryPoint,
      interest_type: intent,
      landing_page: attribution.landing_page || pathname,
      referrer_url: attribution.referrer_url || document.referrer || null,
      utm_source: attribution.utm_source,
      utm_medium: attribution.utm_medium,
      utm_campaign: attribution.utm_campaign,
      utm_content: attribution.utm_content,
      utm_term: attribution.utm_term,
      click_id: attribution.click_id,
      metadata,
    });

    setSubmitting(false);

    if (error) {
      toast.error("Başvuru gönderilemedi", {
        description: error.message,
      });
      return;
    }

    setSubmitted(true);
    setForm(defaultState());
    toast.success("Başvurunuz alındı", {
      description: "Ekibimiz 24 saat içinde sizinle iletişime geçecek.",
    });
  }

  if (submitted) {
    return (
      <Card className={cn("border-primary/20 bg-primary/5", className)}>
        <CardContent className="space-y-4 p-6">
          <div className="flex items-center gap-3">
            <div className="rounded-full bg-primary/15 p-2">
              <CheckCircle2 className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h3 className="font-semibold">Başvurunuz ekibe ulaştı</h3>
              <p className="text-sm text-muted-foreground">
                İlk değerlendirme sonrası uygunluk görüşmesi için size dönüş yapacağız.
              </p>
            </div>
          </div>
          <div className="grid gap-3 rounded-2xl border border-border/60 bg-background/60 p-4 text-sm text-muted-foreground md:grid-cols-3">
            <div>
              <p className="font-medium text-foreground">1. İlk okuma</p>
              <p>Talebiniz ve kanal ihtiyacınız Atlas ekibi tarafından incelenir.</p>
            </div>
            <div>
              <p className="font-medium text-foreground">2. Demo / görüşme</p>
              <p>En uygun akış, platform ve operasyon modeli sizinle paylaşılır.</p>
            </div>
            <div>
              <p className="font-medium text-foreground">3. Yol haritası</p>
              <p>LLC, depo, marketplace ve fulfillment sırası netleştirilir.</p>
            </div>
          </div>
          <Button
            variant="outline"
            onClick={() => setSubmitted(false)}
            className="w-full"
          >
            Yeni Bir Başvuru Daha Oluştur
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={cn("border-border/60 bg-card/90 backdrop-blur-sm", className)}>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        <form className="space-y-5" onSubmit={handleSubmit}>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor={`${entryPoint}-name`}>Ad Soyad</Label>
              <Input
                id={`${entryPoint}-name`}
                value={form.name}
                onChange={(event) => updateField("name", event.target.value)}
                placeholder="Ad Soyad"
              />
              {getError("name")}
            </div>
            <div className="space-y-2">
              <Label htmlFor={`${entryPoint}-email`}>E-posta</Label>
              <Input
                id={`${entryPoint}-email`}
                type="email"
                value={form.email}
                onChange={(event) => updateField("email", event.target.value)}
                placeholder="ornek@sirket.com"
              />
              {getError("email")}
            </div>
            <div className="space-y-2">
              <Label htmlFor={`${entryPoint}-phone`}>Telefon</Label>
              <Input
                id={`${entryPoint}-phone`}
                value={form.phone}
                onChange={(event) => updateField("phone", event.target.value)}
                placeholder="+90 5xx xxx xx xx"
              />
              {getError("phone")}
            </div>
            <div className="space-y-2">
              <Label htmlFor={`${entryPoint}-company`}>Şirket / Marka</Label>
              <Input
                id={`${entryPoint}-company`}
                value={form.company_name}
                onChange={(event) => updateField("company_name", event.target.value)}
                placeholder="Marka veya şirket adı"
              />
              {getError("company_name")}
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor={`${entryPoint}-channels`}>Mevcut satış kanallarınız</Label>
              <Input
                id={`${entryPoint}-channels`}
                value={form.current_sales_channels}
                onChange={(event) =>
                  updateField("current_sales_channels", event.target.value)
                }
                placeholder="Trendyol, Hepsiburada, Amazon TR, D2C..."
              />
              {getError("current_sales_channels")}
            </div>
            <div className="space-y-2">
              <Label>Öncelikli hedef kanal</Label>
              <Select
                value={form.target_marketplaces || undefined}
                onValueChange={(value) => updateField("target_marketplaces", value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Hedef kanal seçin" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="amazon-us">Amazon US</SelectItem>
                  <SelectItem value="walmart">Walmart Marketplace</SelectItem>
                  <SelectItem value="shopify-d2c">Shopify / D2C</SelectItem>
                  <SelectItem value="multi-channel">Karma kanal yapısı</SelectItem>
                  <SelectItem value="need-recommendation">Henüz karar vermedim</SelectItem>
                </SelectContent>
              </Select>
              {getError("target_marketplaces")}
            </div>
            <div className="space-y-2">
              <Label>Aylık satış hacmi</Label>
              <Select
                value={form.monthly_revenue_band || undefined}
                onValueChange={(value) => updateField("monthly_revenue_band", value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Bant seçin" />
                </SelectTrigger>
                <SelectContent>
                  {revenueBands.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {getError("monthly_revenue_band")}
            </div>
            <div className="space-y-2">
              <Label>{getGoalLabel(variant)}</Label>
              <Select
                value={form.growth_goal || undefined}
                onValueChange={(value) => updateField("growth_goal", value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Bir başlık seçin" />
                </SelectTrigger>
                <SelectContent>
                  {getGoalOptions(variant).map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {getError("growth_goal")}
            </div>
          </div>

          <div className="space-y-2">
            <Label>Ne kadar sürede başlamak istiyorsunuz?</Label>
            <Select
              value={form.timeline || undefined}
              onValueChange={(value) => updateField("timeline", value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Zaman planınızı seçin" />
              </SelectTrigger>
              <SelectContent>
                {timelineOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {getError("timeline")}
          </div>

          <div className="space-y-2">
            <Label htmlFor={`${entryPoint}-message`}>Kısa notunuz</Label>
            <Textarea
              id={`${entryPoint}-message`}
              value={form.message}
              onChange={(event) => updateField("message", event.target.value)}
              placeholder={messagePlaceholder}
              className="min-h-28"
            />
            {getError("message")}
          </div>

          <div className="rounded-2xl border border-border/60 bg-muted/20 p-4">
            <div className="flex items-start gap-3">
              <Checkbox
                id={`${entryPoint}-consent`}
                checked={form.consent}
                onCheckedChange={(checked) =>
                  updateField("consent", checked === true)
                }
              />
              <div className="space-y-1">
                <Label htmlFor={`${entryPoint}-consent`} className="leading-relaxed">
                  Atlas ekibinin başvurumla ilgili benimle iletişime geçmesini kabul ediyorum.
                </Label>
                <p className="text-xs text-muted-foreground">
                  Başvurunuz demo planlaması, webinar daveti veya uygunluk görüşmesi için CRM tarafında takip edilir.
                </p>
                {getError("consent")}
              </div>
            </div>
          </div>

          <Button className="w-full group" disabled={submitting} type="submit">
            {submitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Gönderiliyor
              </>
            ) : (
              <>
                {submitLabel}
                <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-0.5" />
              </>
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
