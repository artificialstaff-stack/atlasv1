"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import {
  ArrowRight,
  BadgeCheck,
  Boxes,
  Building2,
  CheckCircle2,
  ChevronRight,
  Globe2,
  PackageCheck,
  ShieldCheck,
  Store,
  Truck,
  Wallet,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/i18n/provider";

function Section({
  children,
  className = "",
  delay = 0,
}: {
  children: React.ReactNode;
  className?: string;
  delay?: number;
}) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 28 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-80px" }}
      transition={{ duration: 0.65, delay, ease: [0.22, 1, 0.36, 1] }}
      className={className}
    >
      {children}
    </motion.section>
  );
}

export default function HomePage() {
  const { t } = useI18n();

  const painPoints = [
    t("marketing.launch.home.painPoints.first"),
    t("marketing.launch.home.painPoints.second"),
    t("marketing.launch.home.painPoints.third"),
  ];

  const proofPoints = [
    {
      icon: Wallet,
      title: t("marketing.launch.home.proof.marginTitle"),
      description: t("marketing.launch.home.proof.marginDescription"),
    },
    {
      icon: Building2,
      title: t("marketing.launch.home.proof.complianceTitle"),
      description: t("marketing.launch.home.proof.complianceDescription"),
    },
    {
      icon: Truck,
      title: t("marketing.launch.home.proof.warehouseTitle"),
      description: t("marketing.launch.home.proof.warehouseDescription"),
    },
    {
      icon: Store,
      title: t("marketing.launch.home.proof.dashboardTitle"),
      description: t("marketing.launch.home.proof.dashboardDescription"),
    },
  ];

  const workflow = [
    {
      step: "01",
      title: t("marketing.launch.home.workflow.firstTitle"),
      description: t("marketing.launch.home.workflow.firstDescription"),
    },
    {
      step: "02",
      title: t("marketing.launch.home.workflow.secondTitle"),
      description: t("marketing.launch.home.workflow.secondDescription"),
    },
    {
      step: "03",
      title: t("marketing.launch.home.workflow.thirdTitle"),
      description: t("marketing.launch.home.workflow.thirdDescription"),
    },
    {
      step: "04",
      title: t("marketing.launch.home.workflow.fourthTitle"),
      description: t("marketing.launch.home.workflow.fourthDescription"),
    },
  ];

  const serviceLanes = [
    {
      icon: Building2,
      title: t("marketing.launch.home.serviceLanes.complianceTitle"),
      items: [
        t("marketing.launch.home.serviceLanes.complianceItem1"),
        t("marketing.launch.home.serviceLanes.complianceItem2"),
        t("marketing.launch.home.serviceLanes.complianceItem3"),
      ],
    },
    {
      icon: Boxes,
      title: t("marketing.launch.home.serviceLanes.marketplaceTitle"),
      items: [
        t("marketing.launch.home.serviceLanes.marketplaceItem1"),
        t("marketing.launch.home.serviceLanes.marketplaceItem2"),
        t("marketing.launch.home.serviceLanes.marketplaceItem3"),
      ],
    },
    {
      icon: PackageCheck,
      title: t("marketing.launch.home.serviceLanes.fulfillmentTitle"),
      items: [
        t("marketing.launch.home.serviceLanes.fulfillmentItem1"),
        t("marketing.launch.home.serviceLanes.fulfillmentItem2"),
        t("marketing.launch.home.serviceLanes.fulfillmentItem3"),
      ],
    },
  ];

  const operationsProof = [
    t("marketing.launch.home.operationsProof.first"),
    t("marketing.launch.home.operationsProof.second"),
    t("marketing.launch.home.operationsProof.third"),
    t("marketing.launch.home.operationsProof.fourth"),
  ];

  const launchAcross = [
    t("marketing.launch.home.launchAcross.trendyol"),
    t("marketing.launch.home.launchAcross.amazon"),
    t("marketing.launch.home.launchAcross.shopify"),
    t("marketing.launch.home.launchAcross.walmart"),
    t("marketing.launch.home.launchAcross.virginia"),
  ];

  const boardItems = [
    {
      icon: ShieldCheck,
      title: t("marketing.launch.home.board.items.setupTitle"),
      body: t("marketing.launch.home.board.items.setupBody"),
    },
    {
      icon: Globe2,
      title: t("marketing.launch.home.board.items.marketplaceTitle"),
      body: t("marketing.launch.home.board.items.marketplaceBody"),
    },
    {
      icon: Truck,
      title: t("marketing.launch.home.board.items.fulfillmentTitle"),
      body: t("marketing.launch.home.board.items.fulfillmentBody"),
    },
  ];

  return (
    <div className="relative overflow-hidden pb-24">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(79,140,255,0.16),transparent_28%),radial-gradient(circle_at_80%_10%,rgba(32,211,178,0.12),transparent_24%),linear-gradient(180deg,rgba(6,9,18,0.98),rgba(6,8,15,1))]" />
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.05]"
        style={{
          backgroundImage:
            "linear-gradient(rgba(255,255,255,0.12) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.12) 1px, transparent 1px)",
          backgroundSize: "64px 64px",
        }}
      />

      <section className="relative min-h-[92vh] overflow-hidden pt-24">
        <div className="container mx-auto px-4 md:px-6">
          <div className="grid gap-10 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
            <div className="max-w-3xl space-y-8">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6 }}
                className="flex flex-wrap items-center gap-3"
              >
                <Badge variant="outline" className="border-primary/30 bg-primary/10 px-4 py-1.5 text-sm text-primary">
                  {t("marketing.launch.home.badges.launchDesk")}
                </Badge>
                <Badge variant="outline" className="border-white/10 bg-white/[0.04] px-4 py-1.5 text-sm text-slate-200">
                  {t("marketing.launch.home.badges.applicationModel")}
                </Badge>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 26 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.7, delay: 0.08 }}
                className="space-y-6"
              >
                <h1 className="max-w-4xl text-5xl font-semibold tracking-tight text-white sm:text-6xl lg:text-7xl lg:leading-[0.95]">
                  {t("marketing.launch.home.hero.titleStart")}
                  <span className="block text-[rgba(166,223,255,0.98)]">
                    {t("marketing.launch.home.hero.titleAccent")}
                  </span>
                </h1>
                <p className="max-w-2xl text-lg leading-8 text-slate-300/84">
                  {t("marketing.launch.home.hero.description")}
                </p>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.16 }}
                className="flex flex-wrap gap-3"
              >
                <Button asChild size="lg" className="rounded-2xl px-6">
                  <Link href="/contact?intent=application">
                    {t("marketing.launch.home.hero.apply")}
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
                <Button
                  asChild
                  size="lg"
                  variant="outline"
                  className="rounded-2xl border-white/12 bg-white/[0.03] px-6 text-slate-100"
                >
                  <Link href="/pricing">
                    {t("marketing.launch.home.hero.plans")}
                    <ChevronRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 26 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.7, delay: 0.24 }}
                className="grid gap-3 sm:grid-cols-3"
              >
                {painPoints.map((item) => (
                  <div
                    key={item}
                    className="rounded-[1.35rem] border border-white/10 bg-white/[0.04] px-4 py-4 text-sm leading-6 text-slate-300/84 backdrop-blur-sm"
                  >
                    {item}
                  </div>
                ))}
              </motion.div>
            </div>

            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 24 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.14, ease: [0.22, 1, 0.36, 1] }}
              className="rounded-[2rem] border border-white/10 bg-[linear-gradient(180deg,rgba(9,14,25,0.98),rgba(7,10,19,0.96))] p-6 shadow-[0_30px_90px_rgba(2,6,23,0.42)]"
            >
              <div className="flex items-center justify-between gap-3 border-b border-white/8 pb-4">
                <div>
                  <p className="text-[11px] uppercase tracking-[0.24em] text-slate-400">
                    {t("marketing.launch.home.board.eyebrow")}
                  </p>
                  <h2 className="mt-2 text-2xl font-semibold tracking-tight text-white">
                    {t("marketing.launch.home.board.title")}
                  </h2>
                </div>
                <Badge className="border-0 bg-emerald-500/15 text-emerald-200">
                  {t("marketing.launch.home.badges.virginiaOps")}
                </Badge>
              </div>

              <div className="mt-5 space-y-4">
                {boardItems.map((item) => (
                  <div key={item.title} className="rounded-[1.4rem] border border-white/8 bg-white/[0.03] p-4">
                    <div className="flex items-start gap-3">
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-primary/12 text-primary">
                        <item.icon className="h-5 w-5" />
                      </div>
                      <div>
                        <h3 className="text-base font-semibold text-white">{item.title}</h3>
                        <p className="mt-2 text-sm leading-6 text-slate-300/78">{item.body}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-5 rounded-[1.4rem] border border-cyan-400/20 bg-cyan-400/6 p-4">
                <p className="text-[11px] uppercase tracking-[0.22em] text-cyan-200/86">
                  {t("marketing.launch.home.board.outcomeEyebrow")}
                </p>
                <p className="mt-3 text-sm leading-6 text-slate-200/88">
                  {t("marketing.launch.home.board.outcomeBody")}
                </p>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      <Section className="relative py-10">
        <div className="container mx-auto px-4 md:px-6">
          <div className="rounded-[1.8rem] border border-white/8 bg-white/[0.03] px-5 py-4 backdrop-blur-sm">
            <div className="flex flex-wrap items-center justify-between gap-4 text-sm text-slate-300/78">
              <span className="text-[11px] uppercase tracking-[0.24em] text-slate-400">
                {t("marketing.launch.home.launchAcross.title")}
              </span>
              <div className="flex flex-wrap items-center gap-3">
                {launchAcross.map((label) => (
                  <span key={label} className="rounded-full border border-white/8 bg-white/[0.03] px-3 py-1.5">
                    {label}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </Section>

      <Section className="relative py-16">
        <div className="container mx-auto px-4 md:px-6">
          <div className="max-w-3xl">
            <Badge variant="outline" className="border-primary/30 bg-primary/10 text-primary">
              {t("marketing.launch.home.proof.eyebrow")}
            </Badge>
            <h2 className="mt-4 text-3xl font-semibold tracking-tight text-white md:text-4xl">
              {t("marketing.launch.home.proof.title")}
            </h2>
            <p className="mt-4 max-w-2xl text-base leading-7 text-slate-300/78">
              {t("marketing.launch.home.proof.description")}
            </p>
          </div>

          <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {proofPoints.map((point, index) => (
              <motion.div
                key={point.title}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-80px" }}
                transition={{ duration: 0.5, delay: index * 0.08 }}
                className="rounded-[1.6rem] border border-white/8 bg-white/[0.03] p-5"
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/12 text-primary">
                  <point.icon className="h-5 w-5" />
                </div>
                <h3 className="mt-5 text-lg font-semibold text-white">{point.title}</h3>
                <p className="mt-3 text-sm leading-6 text-slate-300/76">{point.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </Section>

      <Section className="relative py-16">
        <div className="container mx-auto px-4 md:px-6">
          <div className="grid gap-8 lg:grid-cols-[0.9fr_1.1fr]">
            <div>
              <Badge variant="outline" className="border-white/10 bg-white/[0.03] text-slate-200">
                {t("marketing.launch.home.workflowSection.eyebrow")}
              </Badge>
              <h2 className="mt-4 text-3xl font-semibold tracking-tight text-white md:text-4xl">
                {t("marketing.launch.home.workflowSection.title")}
              </h2>
              <p className="mt-4 text-base leading-7 text-slate-300/78">
                {t("marketing.launch.home.workflowSection.description")}
              </p>
            </div>

            <div className="space-y-3">
              {workflow.map((item, index) => (
                <motion.div
                  key={item.step}
                  initial={{ opacity: 0, x: 24 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true, margin: "-80px" }}
                  transition={{ duration: 0.55, delay: index * 0.08 }}
                  className="rounded-[1.5rem] border border-white/8 bg-white/[0.03] p-5"
                >
                  <div className="flex items-start gap-4">
                    <div className="min-w-[54px] rounded-2xl border border-primary/20 bg-primary/10 px-3 py-2 text-center text-sm font-semibold text-primary">
                      {item.step}
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-white">{item.title}</h3>
                      <p className="mt-2 text-sm leading-6 text-slate-300/76">{item.description}</p>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </Section>

      <Section className="relative py-16">
        <div className="container mx-auto px-4 md:px-6">
          <div className="max-w-3xl">
            <Badge variant="outline" className="border-primary/30 bg-primary/10 text-primary">
              {t("marketing.launch.home.servicesSection.eyebrow")}
            </Badge>
            <h2 className="mt-4 text-3xl font-semibold tracking-tight text-white md:text-4xl">
              {t("marketing.launch.home.servicesSection.title")}
            </h2>
          </div>

          <div className="mt-8 grid gap-4 lg:grid-cols-3">
            {serviceLanes.map((lane, index) => (
              <motion.div
                key={lane.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-80px" }}
                transition={{ duration: 0.5, delay: index * 0.08 }}
                className="rounded-[1.7rem] border border-white/8 bg-[linear-gradient(180deg,rgba(14,20,35,0.95),rgba(8,12,22,0.94))] p-6"
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/12 text-primary">
                  <lane.icon className="h-5 w-5" />
                </div>
                <h3 className="mt-5 text-xl font-semibold text-white">{lane.title}</h3>
                <div className="mt-5 space-y-3">
                  {lane.items.map((item) => (
                    <div key={item} className="flex items-start gap-3 text-sm text-slate-300/78">
                      <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-300" />
                      <span>{item}</span>
                    </div>
                  ))}
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </Section>

      <Section className="relative py-16">
        <div className="container mx-auto px-4 md:px-6">
          <div className="rounded-[2rem] border border-white/8 bg-[linear-gradient(135deg,rgba(10,18,33,0.96),rgba(9,26,30,0.92))] p-6 md:p-8">
            <div className="grid gap-8 lg:grid-cols-[1fr_0.9fr] lg:items-center">
              <div>
                <Badge variant="outline" className="border-cyan-300/20 bg-cyan-400/10 text-cyan-100">
                  {t("marketing.launch.home.operationsSection.eyebrow")}
                </Badge>
                <h2 className="mt-4 text-3xl font-semibold tracking-tight text-white md:text-4xl">
                  {t("marketing.launch.home.operationsSection.title")}
                </h2>
                <p className="mt-4 max-w-2xl text-base leading-7 text-slate-300/80">
                  {t("marketing.launch.home.operationsSection.description")}
                </p>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                {operationsProof.map((item) => (
                  <div
                    key={item}
                    className="rounded-[1.35rem] border border-white/8 bg-white/[0.04] px-4 py-4 text-sm leading-6 text-slate-200/84"
                  >
                    <div className="flex items-start gap-3">
                      <BadgeCheck className="mt-0.5 h-4 w-4 shrink-0 text-cyan-200" />
                      <span>{item}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </Section>

      <Section className="relative py-12">
        <div className="container mx-auto px-4 md:px-6">
          <div className="rounded-[2rem] border border-primary/18 bg-primary/8 p-8 text-center">
            <Badge variant="outline" className="border-primary/30 bg-primary/10 text-primary">
              {t("marketing.launch.home.cta.eyebrow")}
            </Badge>
            <h2 className="mt-4 text-3xl font-semibold tracking-tight text-white md:text-4xl">
              {t("marketing.launch.home.cta.title")}
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-base leading-7 text-slate-300/80">
              {t("marketing.launch.home.cta.description")}
            </p>
            <div className="mt-6 flex flex-wrap justify-center gap-3">
              <Button asChild size="lg" className="rounded-2xl px-6">
                <Link href="/contact?intent=application">
                  {t("marketing.launch.home.cta.button")}
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
              <Button
                asChild
                size="lg"
                variant="outline"
                className="rounded-2xl border-white/12 bg-white/[0.04] px-6 text-slate-100"
              >
                <Link href="/pricing">{t("marketing.launch.home.cta.secondaryButton")}</Link>
              </Button>
            </div>
          </div>
        </div>
      </Section>
    </div>
  );
}
