"use client";

import { Suspense, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { motion } from "framer-motion";
import { z } from "zod";
import {
  ArrowRight,
  CheckCircle2,
  Loader2,
  Mail,
  Phone,
  Send,
  ShieldCheck,
  Store,
  Truck,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { createClient } from "@/lib/supabase/client";
import { useI18n } from "@/i18n/provider";

type VolumeRange =
  | "0-100"
  | "100-500"
  | "500-1500"
  | "1500+";

type SellerChannel =
  | "trendyol"
  | "amazon"
  | "shopify"
  | "hepsiburada"
  | "website"
  | "other";

type MainProblem =
  | "commission"
  | "operations"
  | "launch"
  | "fulfillment"
  | "cashflow"
  | "other";

type TranslateFn = (key: string, params?: Record<string, string | number>) => string;

const channelOptions: Array<{ value: SellerChannel; labelKey: string }> = [
  { value: "trendyol", labelKey: "marketing.launch.contact.channelOptions.trendyol" },
  { value: "amazon", labelKey: "marketing.launch.contact.channelOptions.amazon" },
  { value: "shopify", labelKey: "marketing.launch.contact.channelOptions.shopify" },
  { value: "hepsiburada", labelKey: "marketing.launch.contact.channelOptions.hepsiburada" },
  { value: "website", labelKey: "marketing.launch.contact.channelOptions.website" },
  { value: "other", labelKey: "marketing.launch.contact.channelOptions.other" },
];

const volumeOptions: Array<{ value: VolumeRange; labelKey: string }> = [
  { value: "0-100", labelKey: "marketing.launch.contact.volumeOptions.first" },
  { value: "100-500", labelKey: "marketing.launch.contact.volumeOptions.second" },
  { value: "500-1500", labelKey: "marketing.launch.contact.volumeOptions.third" },
  { value: "1500+", labelKey: "marketing.launch.contact.volumeOptions.fourth" },
];

const problemOptions: Array<{ value: MainProblem; labelKey: string }> = [
  { value: "commission", labelKey: "marketing.launch.contact.problemOptions.commission" },
  { value: "operations", labelKey: "marketing.launch.contact.problemOptions.operations" },
  { value: "launch", labelKey: "marketing.launch.contact.problemOptions.launch" },
  { value: "fulfillment", labelKey: "marketing.launch.contact.problemOptions.fulfillment" },
  { value: "cashflow", labelKey: "marketing.launch.contact.problemOptions.cashflow" },
  { value: "other", labelKey: "marketing.launch.contact.problemOptions.other" },
];

function buildStructuredMessage(data: ContactFormData, isApplication: boolean, t: TranslateFn) {
  if (!isApplication) {
    return data.message.trim();
  }

  return [
    t("marketing.launch.contact.application.badge"),
    `${t("marketing.launch.contact.labels.name")}: ${data.name}`,
    `${t("marketing.launch.contact.labels.email")}: ${data.email}`,
    `${t("marketing.launch.contact.labels.phone")}: ${data.phone}`,
    `${t("marketing.launch.contact.labels.company")}: ${data.company_name}`,
    `${t("marketing.launch.contact.labels.sellerChannel")}: ${channelOptions.find((option) => option.value === data.seller_channel)?.labelKey ? t(channelOptions.find((option) => option.value === data.seller_channel)!.labelKey) : "-"}`,
    `${t("marketing.launch.contact.labels.volume")}: ${volumeOptions.find((option) => option.value === data.monthly_volume_range)?.labelKey ? t(volumeOptions.find((option) => option.value === data.monthly_volume_range)!.labelKey) : "-"}`,
    `${t("marketing.launch.contact.labels.mainProblem")}: ${problemOptions.find((option) => option.value === data.main_problem)?.labelKey ? t(problemOptions.find((option) => option.value === data.main_problem)!.labelKey) : "-"}`,
    `${t("marketing.launch.contact.labels.shortNote")}: ${data.message.trim() || "-"}`,
  ].join("\n");
}

function isOptionValue<T extends string>(options: Array<{ value: T }>, value: string): value is T {
  return options.some((option) => option.value === value);
}

function buildContactSchema(isApplication: boolean, t: TranslateFn) {
  return z
    .object({
      name: z.string().min(2, t("marketing.launch.contact.validation.name")),
      email: z.string().email(t("marketing.launch.contact.validation.email")),
      phone: z.string().min(7, t("marketing.launch.contact.validation.phone")),
      company_name: z.string().min(2, t("marketing.launch.contact.validation.company")),
      seller_channel: z.string(),
      monthly_volume_range: z.string(),
      main_problem: z.string(),
      message: z.string().min(
        isApplication ? 10 : 5,
        t(
          isApplication
            ? "marketing.launch.contact.validation.messageApplication"
            : "marketing.launch.contact.validation.messageGeneral",
        ),
      ),
    })
    .superRefine((data, ctx) => {
      if (!isApplication) {
        return;
      }

      if (!isOptionValue(channelOptions, data.seller_channel)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["seller_channel"],
          message: t("marketing.launch.contact.validation.sellerChannel"),
        });
      }

      if (!isOptionValue(volumeOptions, data.monthly_volume_range)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["monthly_volume_range"],
          message: t("marketing.launch.contact.validation.volume"),
        });
      }

      if (!isOptionValue(problemOptions, data.main_problem)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["main_problem"],
          message: t("marketing.launch.contact.validation.problem"),
        });
      }
    });
}

type ContactFormData = z.infer<ReturnType<typeof buildContactSchema>>;

function Section({
  children,
  className,
  delay = 0,
}: {
  children: React.ReactNode;
  className?: string;
  delay?: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 26 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-80px" }}
      transition={{ duration: 0.6, delay, ease: [0.22, 1, 0.36, 1] }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

function ContactContent() {
  const { t } = useI18n();
  const searchParams = useSearchParams();
  const intent = searchParams.get("intent");
  const isApplication = intent !== "support" && intent !== "general";

  const schema = useMemo(() => buildContactSchema(isApplication, t), [isApplication, t]);

  const form = useForm<ContactFormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: "",
      email: "",
      phone: "",
      company_name: "",
      seller_channel: "",
      monthly_volume_range: "",
      main_problem: "",
      message: "",
    },
  });

  const highlights = [
    {
      icon: ShieldCheck,
      title: t("marketing.launch.contact.cards.firstTitle"),
      body: t("marketing.launch.contact.cards.firstBody"),
    },
    {
      icon: Store,
      title: t("marketing.launch.contact.cards.secondTitle"),
      body: t("marketing.launch.contact.cards.secondBody"),
    },
    {
      icon: Truck,
      title: t("marketing.launch.contact.cards.thirdTitle"),
      body: t("marketing.launch.contact.cards.thirdBody"),
    },
  ];

  const discussionPoints = [
    t("marketing.launch.contact.highlights.first"),
    t("marketing.launch.contact.highlights.second"),
    t("marketing.launch.contact.highlights.third"),
    t("marketing.launch.contact.highlights.fourth"),
  ];

  const pageCopy = isApplication
    ? {
        badge: t("marketing.launch.contact.application.badge"),
        title: t("marketing.launch.contact.application.title"),
        description: t("marketing.launch.contact.application.description"),
        formTitle: t("marketing.launch.contact.application.formTitle"),
        formDescription: t("marketing.launch.contact.application.formDescription"),
        submit: t("marketing.launch.contact.application.submit"),
        submitting: t("marketing.launch.contact.application.submitting"),
        successTitle: t("marketing.launch.contact.application.successTitle"),
        successDescription: t("marketing.launch.contact.application.successDescription"),
      }
    : {
        badge: t("marketing.launch.contact.general.badge"),
        title: t("marketing.launch.contact.general.title"),
        description: t("marketing.launch.contact.general.description"),
        formTitle: t("marketing.launch.contact.general.formTitle"),
        formDescription: t("marketing.launch.contact.general.formDescription"),
        submit: t("marketing.launch.contact.general.submit"),
        submitting: t("marketing.launch.contact.general.submitting"),
        successTitle: t("marketing.launch.contact.general.successTitle"),
        successDescription: t("marketing.launch.contact.general.successDescription"),
      };

  async function onSubmit(data: ContactFormData) {
    try {
      const supabase = createClient();
      const { error } = await supabase.from("contact_submissions").insert({
        name: data.name,
        email: data.email,
        phone: data.phone,
        company_name: data.company_name,
        message: buildStructuredMessage(data, isApplication, t),
        status: "new",
      });

      if (error) throw error;

      toast.success(pageCopy.successTitle, {
        description: pageCopy.successDescription,
      });
      form.reset();
    } catch {
      toast.error(t("marketing.launch.contact.errors.title"), {
        description: t("marketing.launch.contact.errors.description"),
      });
    }
  }

  return (
    <div className="relative overflow-hidden pb-24 pt-24">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(79,140,255,0.16),transparent_28%),radial-gradient(circle_at_80%_10%,rgba(32,211,178,0.10),transparent_24%),linear-gradient(180deg,rgba(7,10,18,0.98),rgba(6,8,15,1))]" />

      <section className="relative">
        <div className="container mx-auto px-4 md:px-6">
          <div className="grid gap-10 lg:grid-cols-[0.92fr_1.08fr]">
            <Section className="space-y-8">
              <div>
                <Badge variant="outline" className="border-primary/30 bg-primary/10 text-primary">
                  {pageCopy.badge}
                </Badge>
                <h1 className="mt-4 text-4xl font-semibold tracking-tight text-white md:text-6xl">
                  {pageCopy.title}
                </h1>
                <p className="mt-5 max-w-2xl text-lg leading-8 text-slate-300/80">
                  {pageCopy.description}
                </p>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                {highlights.map((item) => (
                  <div key={item.title} className="rounded-[1.45rem] border border-white/8 bg-white/[0.03] p-4">
                    <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/12 text-primary">
                      <item.icon className="h-5 w-5" />
                    </div>
                    <h2 className="mt-4 text-base font-semibold text-white">{item.title}</h2>
                    <p className="mt-2 text-sm leading-6 text-slate-300/76">{item.body}</p>
                  </div>
                ))}
              </div>

              <div className="rounded-[1.6rem] border border-white/8 bg-white/[0.03] p-5">
                <p className="text-[11px] uppercase tracking-[0.22em] text-slate-400">
                  {t("marketing.launch.contact.highlightsTitle")}
                </p>
                <div className="mt-4 space-y-3">
                  {discussionPoints.map((item) => (
                    <div key={item} className="flex items-start gap-3 text-sm text-slate-200/84">
                      <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-300" />
                      <span>{item}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-3 text-sm text-slate-300/76">
                <a
                  href={`mailto:${t("marketing.launch.contact.contactInfo.email")}`}
                  className="flex items-center gap-3 rounded-[1.2rem] border border-white/8 bg-white/[0.03] px-4 py-3 transition hover:border-primary/25"
                >
                  <Mail className="h-4 w-4 text-primary" />
                  {t("marketing.launch.contact.contactInfo.email")}
                </a>
                <a
                  href={`tel:${t("marketing.launch.contact.contactInfo.phoneHref")}`}
                  className="flex items-center gap-3 rounded-[1.2rem] border border-white/8 bg-white/[0.03] px-4 py-3 transition hover:border-primary/25"
                >
                  <Phone className="h-4 w-4 text-primary" />
                  {t("marketing.launch.contact.contactInfo.phoneDisplay")}
                </a>
              </div>
            </Section>

            <Section delay={0.08}>
              <div className="rounded-[1.9rem] border border-white/8 bg-[linear-gradient(180deg,rgba(12,18,32,0.98),rgba(8,11,19,0.96))] p-6 md:p-8 shadow-[0_30px_90px_rgba(2,6,23,0.42)]">
                <div className="mb-6">
                  <h2 className="text-2xl font-semibold text-white">{pageCopy.formTitle}</h2>
                  <p className="mt-2 text-sm leading-6 text-slate-300/78">{pageCopy.formDescription}</p>
                </div>

                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
                    <div className="grid gap-4 md:grid-cols-2">
                      <FormField
                        control={form.control}
                        name="name"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>{t("marketing.launch.contact.labels.name")}</FormLabel>
                            <FormControl>
                              <Input
                                className="border-border/50 bg-muted/50 focus:bg-background"
                                placeholder={t("marketing.launch.contact.placeholders.name")}
                                {...field}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="email"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>{t("marketing.launch.contact.labels.email")}</FormLabel>
                            <FormControl>
                              <Input
                                type="email"
                                className="border-border/50 bg-muted/50 focus:bg-background"
                                placeholder={t("marketing.launch.contact.placeholders.email")}
                                {...field}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <div className="grid gap-4 md:grid-cols-2">
                      <FormField
                        control={form.control}
                        name="phone"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>{t("marketing.launch.contact.labels.phone")}</FormLabel>
                            <FormControl>
                              <Input
                                className="border-border/50 bg-muted/50 focus:bg-background"
                                placeholder={t("marketing.launch.contact.placeholders.phone")}
                                {...field}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="company_name"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>{t("marketing.launch.contact.labels.company")}</FormLabel>
                            <FormControl>
                              <Input
                                className="border-border/50 bg-muted/50 focus:bg-background"
                                placeholder={t("marketing.launch.contact.placeholders.company")}
                                {...field}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    {isApplication ? (
                      <>
                        <div className="grid gap-4 md:grid-cols-2">
                          <FormField
                            control={form.control}
                            name="seller_channel"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>{t("marketing.launch.contact.labels.sellerChannel")}</FormLabel>
                                <Select onValueChange={field.onChange} value={field.value || undefined}>
                                  <FormControl>
                                    <SelectTrigger className="border-border/50 bg-muted/50">
                                      <SelectValue placeholder={t("marketing.launch.contact.placeholders.sellerChannel")} />
                                    </SelectTrigger>
                                  </FormControl>
                                  <SelectContent>
                                    {channelOptions.map((option) => (
                                      <SelectItem key={option.value} value={option.value}>
                                        {t(option.labelKey)}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={form.control}
                            name="monthly_volume_range"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>{t("marketing.launch.contact.labels.volume")}</FormLabel>
                                <Select onValueChange={field.onChange} value={field.value || undefined}>
                                  <FormControl>
                                    <SelectTrigger className="border-border/50 bg-muted/50">
                                      <SelectValue placeholder={t("marketing.launch.contact.placeholders.volume")} />
                                    </SelectTrigger>
                                  </FormControl>
                                  <SelectContent>
                                    {volumeOptions.map((option) => (
                                      <SelectItem key={option.value} value={option.value}>
                                        {t(option.labelKey)}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>

                        <FormField
                          control={form.control}
                          name="main_problem"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>{t("marketing.launch.contact.labels.mainProblem")}</FormLabel>
                              <Select onValueChange={field.onChange} value={field.value || undefined}>
                                <FormControl>
                                  <SelectTrigger className="border-border/50 bg-muted/50">
                                    <SelectValue placeholder={t("marketing.launch.contact.placeholders.mainProblem")} />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  {problemOptions.map((option) => (
                                    <SelectItem key={option.value} value={option.value}>
                                      {t(option.labelKey)}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </>
                    ) : null}

                    <FormField
                      control={form.control}
                      name="message"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>
                            {isApplication
                              ? t("marketing.launch.contact.labels.shortNote")
                              : t("marketing.launch.contact.labels.message")}
                          </FormLabel>
                          <FormControl>
                            <Textarea
                              rows={5}
                              className="resize-none border-border/50 bg-muted/50 focus:bg-background"
                              placeholder={
                                isApplication
                                  ? t("marketing.launch.contact.placeholders.shortNote")
                                  : t("marketing.launch.contact.placeholders.message")
                              }
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <Button type="submit" size="lg" className="w-full rounded-2xl" disabled={form.formState.isSubmitting}>
                      {form.formState.isSubmitting ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          {pageCopy.submitting}
                        </>
                      ) : (
                        <>
                          <Send className="mr-2 h-4 w-4" />
                          {pageCopy.submit}
                        </>
                      )}
                    </Button>

                    <p className="flex items-center justify-center gap-2 text-center text-xs text-slate-400">
                      <ShieldCheck className="h-3.5 w-3.5" />
                      {t("marketing.launch.contact.privacy")}
                    </p>

                    {isApplication ? (
                      <div className="rounded-[1.35rem] border border-cyan-400/18 bg-cyan-400/6 p-4 text-sm leading-6 text-slate-200/84">
                        {t("marketing.launch.contact.processTitle")}
                        <span className="block text-slate-300/76">
                          {t("marketing.launch.contact.processDescription")}
                        </span>
                        <span className="mt-2 inline-flex items-center gap-2 text-cyan-100">
                          {t("marketing.launch.contact.processLink")}
                          <ArrowRight className="h-4 w-4" />
                        </span>
                      </div>
                    ) : null}
                  </form>
                </Form>
              </div>
            </Section>
          </div>
        </div>
      </section>
    </div>
  );
}

function ContactPageFallback() {
  const { t } = useI18n();

  return (
    <div className="flex min-h-[60vh] items-center justify-center pt-24 text-sm text-muted-foreground">
      {t("marketing.launch.contact.loading")}
    </div>
  );
}

export default function ContactPage() {
  return (
    <Suspense fallback={<ContactPageFallback />}>
      <ContactContent />
    </Suspense>
  );
}
