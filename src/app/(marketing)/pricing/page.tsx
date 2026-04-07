"use client";

import Link from "next/link";
import { ArrowRight, BadgeCheck, Boxes, Building2, CheckCircle2, PackageCheck, Sparkles, Store } from "lucide-react";

import {
  AtlasHeroBoard,
  AtlasInsightCard,
  AtlasSectionPanel,
  AtlasStackGrid,
} from "@/components/portal/atlas-widget-kit";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/i18n/provider";
import { getPlanTierDefinition, type BillingPackage } from "@/lib/payments/catalog";

export default function PricingPage() {
  const { t } = useI18n();

  const programs = [
    {
      name: t("marketing.launch.pricing.programs.launchName"),
      icon: Building2,
      fit: t("marketing.launch.pricing.programs.launchFit"),
      days: [
        t("marketing.launch.pricing.programs.launchDay1"),
        t("marketing.launch.pricing.programs.launchDay2"),
        t("marketing.launch.pricing.programs.launchDay3"),
      ],
      emphasis: t("marketing.launch.pricing.programs.launchEmphasis"),
      featured: false,
      pkg: getPlanTierDefinition("starter"),
    },
    {
      name: t("marketing.launch.pricing.programs.growthName"),
      icon: Store,
      fit: t("marketing.launch.pricing.programs.growthFit"),
      days: [
        t("marketing.launch.pricing.programs.growthDay1"),
        t("marketing.launch.pricing.programs.growthDay2"),
        t("marketing.launch.pricing.programs.growthDay3"),
      ],
      emphasis: t("marketing.launch.pricing.programs.growthEmphasis"),
      featured: true,
      pkg: getPlanTierDefinition("growth"),
    },
    {
      name: t("marketing.launch.pricing.programs.operatorName"),
      icon: PackageCheck,
      fit: t("marketing.launch.pricing.programs.operatorFit"),
      days: [
        t("marketing.launch.pricing.programs.operatorDay1"),
        t("marketing.launch.pricing.programs.operatorDay2"),
        t("marketing.launch.pricing.programs.operatorDay3"),
      ],
      emphasis: t("marketing.launch.pricing.programs.operatorEmphasis"),
      featured: false,
      pkg: getPlanTierDefinition("professional"),
    },
  ];

  function renderPrice(pkg: BillingPackage) {
    if (pkg.price <= 0) return "Custom";
    return pkg.cadence === "monthly" ? `$${pkg.price.toFixed(0)}/ay` : `$${pkg.price.toFixed(0)}`;
  }

  const principles = [
    {
      icon: Boxes,
      title: t("marketing.launch.pricing.principles.firstTitle"),
      body: t("marketing.launch.pricing.principles.firstBody"),
    },
    {
      icon: BadgeCheck,
      title: t("marketing.launch.pricing.principles.secondTitle"),
      body: t("marketing.launch.pricing.principles.secondBody"),
    },
    {
      icon: Sparkles,
      title: t("marketing.launch.pricing.principles.thirdTitle"),
      body: t("marketing.launch.pricing.principles.thirdBody"),
    },
  ];

  const faqs = [
    {
      question: t("marketing.launch.pricing.faqs.firstQuestion"),
      answer: t("marketing.launch.pricing.faqs.firstAnswer"),
    },
    {
      question: t("marketing.launch.pricing.faqs.secondQuestion"),
      answer: t("marketing.launch.pricing.faqs.secondAnswer"),
    },
    {
      question: t("marketing.launch.pricing.faqs.thirdQuestion"),
      answer: t("marketing.launch.pricing.faqs.thirdAnswer"),
    },
    {
      question: t("marketing.launch.pricing.faqs.fourthQuestion"),
      answer: t("marketing.launch.pricing.faqs.fourthAnswer"),
    },
  ];

  return (
    <div className="relative overflow-hidden pb-24 pt-24">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(79,140,255,0.14),transparent_26%),linear-gradient(180deg,rgba(7,10,18,0.98),rgba(6,8,15,1))]" />

      <section className="relative pb-14">
        <div className="container mx-auto px-4 md:px-6">
          <AtlasHeroBoard
            eyebrow={t("marketing.launch.pricing.badge")}
            title={`${t("marketing.launch.pricing.titleStart")} ${t("marketing.launch.pricing.titleAccent")}`}
            description={t("marketing.launch.pricing.description")}
            badges={[t("marketing.launch.pricing.first30Days")]}
            metrics={programs.map((program) => ({
              label: program.name,
              value: renderPrice(program.pkg),
              tone: program.featured ? "primary" : "neutral",
            }))}
            primaryAction={{ label: t("marketing.launch.pricing.apply"), href: "/contact?intent=application" }}
            secondaryAction={{ label: t("marketing.launch.pricing.cta"), href: "/contact?intent=application", variant: "outline" }}
            tone="primary"
            className="mx-auto"
          />

          <AtlasStackGrid className="mt-10" columns="three">
            {programs.map((program, index) => (
              <AtlasInsightCard
                key={program.name}
                eyebrow={program.emphasis}
                title={program.name}
                description={program.fit}
                badge={program.pkg.cadence === "monthly" ? "Aylik" : "Tek sefer"}
                tone={program.featured ? "primary" : index === 0 ? "cobalt" : index === 1 ? "emerald" : "crafted"}
                icon={program.icon}
                metrics={[
                  { label: "Paket gercegi", value: renderPrice(program.pkg), tone: program.featured ? "primary" : "neutral" },
                ]}
                primaryAction={{ label: t("marketing.launch.pricing.apply"), href: "/contact?intent=application" }}
                secondaryAction={{ label: t("marketing.launch.pricing.cta"), href: "/contact?intent=application", variant: "outline" }}
                className="h-full"
              >
                <div className="rounded-[1.2rem] border border-white/8 bg-white/[0.03] p-4">
                  <p className="text-[11px] uppercase tracking-[0.22em] text-slate-400">{t("marketing.launch.pricing.first30Days")}</p>
                  <div className="mt-4 space-y-3">
                    {program.days.map((item) => (
                      <div key={item} className="flex items-start gap-3 text-sm text-slate-200/84">
                        <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-300" />
                        <span>{item}</span>
                      </div>
                    ))}
                  </div>
                </div>
                {program.pkg.lineItems?.length ? (
                  <div className="mt-4 flex flex-wrap gap-2">
                    {program.pkg.lineItems.map((item) => (
                      <span
                        key={`${program.name}:${item.label}`}
                        className="rounded-full border border-white/8 bg-white/[0.04] px-3 py-1 text-xs text-slate-200"
                      >
                        {item.label}: ${item.price.toFixed(0)}
                      </span>
                    ))}
                  </div>
                ) : null}
                <div className="mt-4 flex flex-wrap gap-2">
                  {program.pkg.features.slice(0, 4).map((feature) => (
                    <span
                      key={`${program.name}:${feature}`}
                      className="rounded-full bg-white/[0.05] px-3 py-1 text-xs text-slate-300"
                    >
                      {feature}
                    </span>
                  ))}
                </div>
              </AtlasInsightCard>
            ))}
          </AtlasStackGrid>
        </div>
      </section>

      <section className="relative py-14">
        <div className="container mx-auto px-4 md:px-6">
          <AtlasSectionPanel
            eyebrow={t("marketing.launch.pricing.howItWorks")}
            title={t("marketing.launch.pricing.first30Days")}
            description={t("marketing.launch.pricing.howItWorksBody")}
          >
            <AtlasStackGrid columns="three">
              {principles.map((item, index) => (
                <AtlasInsightCard
                  key={item.title}
                  title={item.title}
                  description={item.body}
                  icon={item.icon}
                  tone={index === 0 ? "cobalt" : index === 1 ? "success" : "violet"}
                  className="h-full"
                />
              ))}
            </AtlasStackGrid>
          </AtlasSectionPanel>
        </div>
      </section>

      <section className="relative py-14">
        <div className="container mx-auto px-4 md:px-6">
          <div className="mx-auto max-w-5xl">
            <AtlasSectionPanel
              eyebrow={t("marketing.launch.pricing.faqBadge")}
              title={t("marketing.launch.pricing.faqTitle")}
              description={t("marketing.launch.pricing.description")}
            >
              <AtlasStackGrid columns="two">
                {faqs.map((faq) => (
                  <AtlasInsightCard
                    key={faq.question}
                    title={faq.question}
                    description={faq.answer}
                    tone="neutral"
                    className="h-full"
                  />
                ))}
              </AtlasStackGrid>
            </AtlasSectionPanel>
          </div>

          <div className="mt-10 text-center">
            <Button asChild size="lg" className="rounded-2xl px-6">
              <Link href="/contact?intent=application">
                {t("marketing.launch.pricing.cta")}
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
}
