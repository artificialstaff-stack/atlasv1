"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { AnimatePresence, motion, MotionConfig, useReducedMotion } from "framer-motion";
import {
  AlertTriangle,
  ArrowRight,
  Building2,
  CheckCircle2,
  ChevronDown,
  Compass,
  Crown,
  Globe2,
  Loader2,
  Megaphone,
  Rocket,
  ShieldCheck,
  Sparkles,
  Store,
  Truck,
} from "lucide-react";
import { toast } from "sonner";

import { PortalPageHero } from "@/components/portal/portal-page-hero";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type {
  StoreAddonCardViewModel,
  StoreAddonClusterViewModel,
  StoreBundleCardViewModel,
  StoreExperienceMarketplaceCard,
  StoreExperienceViewModel,
  StoreTimelineStep,
} from "@/lib/customer-workspace";

function formatMoney(value: number | null | undefined, suffix = "") {
  if (value === null || value === undefined) return "Custom";
  return `$${value.toFixed(2)}${suffix}`;
}

function toneBadgeClasses(tone: string) {
  if (tone === "emerald") return "border-emerald-400/25 bg-emerald-500/12 text-emerald-200";
  if (tone === "blue") return "border-sky-400/25 bg-sky-500/12 text-sky-200";
  if (tone === "amber") return "border-amber-400/25 bg-amber-500/12 text-amber-100";
  if (tone === "rose") return "border-rose-400/25 bg-rose-500/12 text-rose-200";
  if (tone === "violet") return "border-violet-400/25 bg-violet-500/12 text-violet-200";
  return "border-white/10 bg-white/[0.05] text-slate-200";
}

function metricToneClasses(tone?: "default" | "primary" | "warning" | "success") {
  if (tone === "primary") return "border-sky-400/15 bg-sky-500/[0.08]";
  if (tone === "warning") return "border-amber-400/15 bg-amber-500/[0.08]";
  if (tone === "success") return "border-emerald-400/15 bg-emerald-500/[0.08]";
  return "border-white/8 bg-white/[0.04]";
}

function clusterIcon(key: StoreAddonClusterViewModel["key"]) {
  if (key === "foundation") return Building2;
  if (key === "compliance") return ShieldCheck;
  if (key === "fulfillment") return Truck;
  return Megaphone;
}

function ClusterIcon({ clusterKey }: { clusterKey: StoreAddonClusterViewModel["key"] }) {
  if (clusterKey === "foundation") {
    return <Building2 className="h-5 w-5" />;
  }
  if (clusterKey === "compliance") {
    return <ShieldCheck className="h-5 w-5" />;
  }
  if (clusterKey === "fulfillment") {
    return <Truck className="h-5 w-5" />;
  }
  return <Megaphone className="h-5 w-5" />;
}

function surfaceClasses(surfaceStyle: StoreExperienceMarketplaceCard["surfaceStyle"] | StoreAddonCardViewModel["surfaceStyle"] | StoreBundleCardViewModel["surfaceStyle"]) {
  if (surfaceStyle === "velocity") {
    return {
      container:
        "border-amber-400/15 bg-[linear-gradient(180deg,rgba(53,31,17,0.94),rgba(12,14,24,0.97))]",
      glow: "from-amber-500/25 via-orange-400/10 to-transparent",
      accent: "from-amber-300/80 via-orange-300/50 to-transparent",
      icon: "border-amber-300/20 bg-amber-500/10 text-amber-100",
      button: "bg-amber-400 text-slate-950 hover:bg-amber-300",
      muted: "border-amber-400/12 bg-amber-500/[0.06]",
    };
  }
  if (surfaceStyle === "storefront") {
    return {
      container:
        "border-emerald-400/15 bg-[linear-gradient(180deg,rgba(12,34,34,0.94),rgba(9,14,24,0.97))]",
      glow: "from-emerald-400/25 via-cyan-400/10 to-transparent",
      accent: "from-emerald-300/75 via-cyan-300/40 to-transparent",
      icon: "border-emerald-300/20 bg-emerald-500/10 text-emerald-100",
      button: "bg-emerald-400 text-slate-950 hover:bg-emerald-300",
      muted: "border-emerald-400/12 bg-emerald-500/[0.06]",
    };
  }
  if (surfaceStyle === "verification") {
    return {
      container:
        "border-sky-400/15 bg-[linear-gradient(180deg,rgba(13,29,47,0.94),rgba(8,13,24,0.98))]",
      glow: "from-sky-500/22 via-amber-300/10 to-transparent",
      accent: "from-sky-300/75 via-cyan-300/45 to-transparent",
      icon: "border-sky-300/20 bg-sky-500/10 text-sky-100",
      button: "bg-sky-400 text-slate-950 hover:bg-sky-300",
      muted: "border-sky-400/12 bg-sky-500/[0.06]",
    };
  }
  if (surfaceStyle === "market-flex") {
    return {
      container:
        "border-violet-400/15 bg-[linear-gradient(180deg,rgba(29,19,49,0.94),rgba(10,12,24,0.97))]",
      glow: "from-violet-500/24 via-rose-400/8 to-transparent",
      accent: "from-violet-300/80 via-sky-300/35 to-transparent",
      icon: "border-violet-300/20 bg-violet-500/10 text-violet-100",
      button: "bg-violet-400 text-slate-950 hover:bg-violet-300",
      muted: "border-violet-400/12 bg-violet-500/[0.06]",
    };
  }
  if (surfaceStyle === "crafted") {
    return {
      container:
        "border-amber-300/15 bg-[linear-gradient(180deg,rgba(49,28,24,0.94),rgba(11,12,20,0.97))]",
      glow: "from-amber-300/20 via-orange-300/10 to-transparent",
      accent: "from-orange-200/75 via-amber-200/45 to-transparent",
      icon: "border-orange-200/20 bg-orange-400/10 text-orange-100",
      button: "bg-orange-300 text-slate-950 hover:bg-orange-200",
      muted: "border-orange-300/12 bg-orange-400/[0.06]",
    };
  }
  if (surfaceStyle === "growth") {
    return {
      container:
        "border-sky-400/18 bg-[linear-gradient(135deg,rgba(17,38,62,0.98),rgba(13,18,35,0.98))]",
      glow: "from-sky-400/28 via-violet-400/12 to-transparent",
      accent: "from-sky-200/80 via-cyan-300/55 to-transparent",
      icon: "border-sky-200/20 bg-sky-400/12 text-sky-100",
      button: "bg-white text-slate-950 hover:bg-slate-100",
      muted: "border-sky-400/14 bg-sky-500/[0.08]",
    };
  }
  if (surfaceStyle === "enterprise") {
    return {
      container:
        "border-amber-300/18 bg-[linear-gradient(135deg,rgba(54,36,16,0.97),rgba(20,14,26,0.98))]",
      glow: "from-amber-300/28 via-orange-300/14 to-transparent",
      accent: "from-amber-100/85 via-orange-200/55 to-transparent",
      icon: "border-amber-200/20 bg-amber-300/12 text-amber-50",
      button: "bg-amber-300 text-slate-950 hover:bg-amber-200",
      muted: "border-amber-300/14 bg-amber-300/[0.08]",
    };
  }

  const toned =
    surfaceStyle === "foundation" || surfaceStyle === "compliance"
      ? "blue"
      : surfaceStyle === "demand"
        ? "violet"
        : "amber";

  return {
    container: "border-white/10 bg-[linear-gradient(180deg,rgba(17,21,33,0.95),rgba(9,12,22,0.97))]",
    glow:
      toned === "blue"
        ? "from-sky-500/18 via-cyan-400/8 to-transparent"
        : toned === "violet"
          ? "from-violet-500/18 via-fuchsia-400/8 to-transparent"
          : "from-amber-400/18 via-orange-400/8 to-transparent",
    accent:
      toned === "blue"
        ? "from-sky-300/70 via-cyan-300/30 to-transparent"
        : toned === "violet"
          ? "from-violet-300/70 via-fuchsia-300/30 to-transparent"
          : "from-amber-300/70 via-orange-300/30 to-transparent",
    icon:
      toned === "blue"
        ? "border-sky-300/20 bg-sky-500/10 text-sky-100"
        : toned === "violet"
          ? "border-violet-300/20 bg-violet-500/10 text-violet-100"
          : "border-amber-300/20 bg-amber-500/10 text-amber-100",
    button:
      toned === "blue"
        ? "bg-sky-400 text-slate-950 hover:bg-sky-300"
        : toned === "violet"
          ? "bg-violet-400 text-slate-950 hover:bg-violet-300"
          : "bg-amber-400 text-slate-950 hover:bg-amber-300",
    muted:
      toned === "blue"
        ? "border-sky-400/12 bg-sky-500/[0.06]"
        : toned === "violet"
          ? "border-violet-400/12 bg-violet-500/[0.06]"
          : "border-amber-400/12 bg-amber-500/[0.06]",
  };
}

function hoverMotion(preset: StoreExperienceMarketplaceCard["motionPreset"], reducedMotion: boolean) {
  if (reducedMotion) return {};
  if (preset === "amazon") return { y: -6, scale: 1.012 };
  if (preset === "shopify") return { y: -5, scale: 1.01 };
  if (preset === "walmart") return { y: -4, scale: 1.008 };
  if (preset === "ebay") return { y: -6, scale: 1.014 };
  if (preset === "etsy") return { y: -4, scale: 1.01 };
  return { y: -4, scale: 1.008 };
}

function stateChipClasses(state: StoreExperienceMarketplaceCard["state"]) {
  if (state === "active") return "border-emerald-400/25 bg-emerald-500/12 text-emerald-100";
  if (state === "selected") return "border-primary/25 bg-primary/12 text-primary";
  if (state === "disabled") return "border-white/10 bg-white/[0.05] text-slate-300";
  return "border-sky-400/20 bg-sky-500/10 text-sky-100";
}

function SectionIntro({
  eyebrow,
  title,
  summary,
  badge,
}: {
  eyebrow: string;
  title: string;
  summary: string;
  badge?: string;
}) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-4">
      <div className="max-w-3xl">
        <p className="text-[11px] uppercase tracking-[0.22em] text-slate-500">{eyebrow}</p>
        <h2 className="mt-2 text-[1.9rem] font-semibold tracking-tight text-white">{title}</h2>
        <p className="mt-3 text-sm leading-7 text-slate-300/78">{summary}</p>
      </div>
      {badge ? (
        <Badge variant="outline" className="border-white/10 bg-white/[0.04] text-slate-200">
          {badge}
        </Badge>
      ) : null}
    </div>
  );
}

function MarketplaceCard({
  card,
  expanded,
  onToggle,
  onSelect,
  submitting,
  reducedMotion,
}: {
  card: StoreExperienceMarketplaceCard;
  expanded: boolean;
  onToggle: () => void;
  onSelect: (key: StoreExperienceMarketplaceCard["key"]) => void;
  submitting: boolean;
  reducedMotion: boolean;
}) {
  const visuals = surfaceClasses(card.surfaceStyle);
  const Icon = card.key === "amazon" ? Rocket : card.key === "shopify" ? Store : card.key === "walmart" ? ShieldCheck : card.key === "ebay" ? Compass : Sparkles;

  return (
    <motion.article
      layout
      initial={reducedMotion ? false : { opacity: 0, y: 12 }}
      whileInView={reducedMotion ? undefined : { opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.2 }}
      whileHover={hoverMotion(card.motionPreset, reducedMotion)}
      transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
      className={cn("group relative overflow-hidden rounded-[1.75rem] border p-5 md:p-6", visuals.container)}
    >
      <div className={cn("pointer-events-none absolute inset-x-0 top-0 h-40 bg-gradient-to-b opacity-80 blur-2xl", visuals.glow)} />
      <motion.div
        aria-hidden
        className={cn("pointer-events-none absolute inset-x-6 top-0 h-px bg-gradient-to-r", visuals.accent)}
        animate={card.state === "selected" || card.state === "active"
          ? reducedMotion
            ? { opacity: 0.8 }
            : { opacity: [0.35, 0.85, 0.35] }
          : { opacity: 0.45 }}
        transition={card.state === "selected" || card.state === "active" ? { duration: 4.6, repeat: Infinity, ease: "easeInOut" } : { duration: 0.2 }}
      />

      <div className="relative z-10">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <div className={cn("rounded-2xl border p-2.5", visuals.icon)}>
                <Icon className="h-5 w-5" />
              </div>
              <div>
                <p className="text-[11px] uppercase tracking-[0.22em] text-slate-500">{card.archetype}</p>
                <div className="mt-1 flex flex-wrap items-center gap-2">
                  <h3 className="text-xl font-semibold text-white">{card.title}</h3>
                  <Badge className={toneBadgeClasses(card.visualTone)}>{card.badge}</Badge>
                  <Badge className={stateChipClasses(card.state)}>{card.stateLabel}</Badge>
                </div>
              </div>
            </div>
            <p className="max-w-xl text-sm leading-7 text-slate-300/80">{card.summary}</p>
          </div>

          <div className="min-w-[142px] rounded-[1.3rem] border border-white/10 bg-black/15 px-4 py-3 text-right shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]">
            <p className="text-[11px] uppercase tracking-[0.18em] text-slate-500">Setup</p>
            <p className="mt-1 text-[1.6rem] font-semibold tracking-tight text-white">{formatMoney(card.setupFee)}</p>
            <p className="mt-3 text-[11px] uppercase tracking-[0.18em] text-slate-500">Aylik yonetim</p>
            <p className="mt-1 text-lg font-semibold text-slate-100">{formatMoney(card.monthlyPrice, "/ay")}</p>
          </div>
        </div>

        <div className="mt-5 grid gap-4 lg:grid-cols-[minmax(0,0.62fr)_minmax(0,0.38fr)]">
          <div className="rounded-[1.4rem] border border-white/10 bg-black/15 p-4">
            <p className="text-[11px] uppercase tracking-[0.2em] text-slate-500">Best for</p>
            <p className="mt-2 text-sm leading-7 text-slate-200">{card.bestFor}</p>
          </div>
          <div className={cn("rounded-[1.4rem] border p-4", visuals.muted)}>
            <p className="text-[11px] uppercase tracking-[0.2em] text-slate-500">Primary outcome</p>
            <p className="mt-2 text-sm leading-7 text-slate-200">{card.primaryOutcome}</p>
          </div>
        </div>

        <div className="mt-5 grid gap-2 md:grid-cols-3">
          {card.atlasHandles.map((item) => (
            <div key={item} className="rounded-2xl border border-white/8 bg-white/[0.04] px-3.5 py-3 text-sm text-slate-200/88">
              {item}
            </div>
          ))}
        </div>

        <div className="mt-5 flex flex-wrap items-center gap-2">
          {card.features.slice(0, expanded ? card.features.length : 4).map((item) => (
            <span key={item} className="rounded-full border border-white/8 bg-white/[0.05] px-3 py-1 text-xs text-slate-300">
              {item}
            </span>
          ))}
        </div>

        <div className="mt-5 flex flex-wrap items-center justify-between gap-3 rounded-[1.3rem] border border-white/10 bg-black/10 px-4 py-3">
          <p className="max-w-xl text-xs leading-6 text-slate-400">{card.stateSummary}</p>
          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="rounded-2xl border-white/10 bg-white/[0.03] text-slate-200 hover:bg-white/[0.06]"
              onClick={onToggle}
            >
              {expanded ? "Ozeti kapat" : "Detayi ac"}
              <ChevronDown className={cn("ml-2 h-4 w-4 transition", expanded ? "rotate-180" : "")} />
            </Button>
            {card.state === "selected" || card.state === "active" ? (
              <Button asChild size="sm" className={cn("rounded-2xl", visuals.button)}>
                <Link href={card.billingHref}>
                  Faturayi ac
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            ) : (
              <Button
                type="button"
                size="sm"
                className={cn("rounded-2xl", visuals.button)}
                disabled={!card.canSelect || submitting}
                onClick={() => onSelect(card.key)}
              >
                {submitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Gonderiliyor
                  </>
                ) : (
                  card.ctaLabel
                )}
              </Button>
            )}
          </div>
        </div>

        <AnimatePresence initial={false}>
          {expanded ? (
            <motion.div
              key="expanded"
              initial={reducedMotion ? { opacity: 0 } : { opacity: 0, height: 0, y: 8 }}
              animate={reducedMotion ? { opacity: 1 } : { opacity: 1, height: "auto", y: 0 }}
              exit={reducedMotion ? { opacity: 0 } : { opacity: 0, height: 0, y: -4 }}
              transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
              className="overflow-hidden"
            >
              <div className="mt-5 grid gap-4 xl:grid-cols-[minmax(0,0.58fr)_minmax(0,0.42fr)]">
                <div className="space-y-4">
                  <div className="rounded-[1.35rem] border border-white/10 bg-white/[0.04] p-4">
                    <p className="text-[11px] uppercase tracking-[0.2em] text-slate-500">Atlas handles</p>
                    <div className="mt-3 space-y-2.5">
                      {card.includedServices.slice(0, 6).map((item) => (
                        <div key={item} className="flex items-start gap-2 text-sm leading-6 text-slate-200/82">
                          <span className={cn("mt-2 h-1.5 w-1.5 rounded-full", card.visualTone === "amber" ? "bg-amber-200" : card.visualTone === "emerald" ? "bg-emerald-200" : card.visualTone === "violet" ? "bg-violet-200" : "bg-sky-200")} />
                          <span>{item}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="rounded-[1.35rem] border border-white/10 bg-white/[0.04] p-4">
                    <p className="text-[11px] uppercase tracking-[0.2em] text-slate-500">Need from you</p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {card.customerNeeds.map((item) => (
                        <span key={item} className="rounded-full border border-white/8 bg-black/15 px-3 py-1 text-xs text-slate-300">
                          {item}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="rounded-[1.35rem] border border-white/10 bg-black/10 p-4">
                    <p className="text-[11px] uppercase tracking-[0.2em] text-slate-500">Setup focus</p>
                    <p className="mt-2 text-sm leading-7 text-slate-200/82">{card.setupFocus}</p>
                    <div className="mt-4 flex flex-wrap gap-2">
                      {card.requirements.map((item) => (
                        <span key={item} className="rounded-full border border-white/8 bg-white/[0.04] px-3 py-1 text-xs text-slate-300">
                          {item}
                        </span>
                      ))}
                    </div>
                  </div>

                  {card.riskNote ? (
                    <div className="rounded-[1.35rem] border border-amber-400/15 bg-amber-500/[0.07] p-4 text-sm leading-6 text-amber-100/90">
                      <div className="flex items-start gap-2">
                        <AlertTriangle className="mt-1 h-4 w-4 shrink-0 text-amber-200" />
                        <span>{card.riskNote}</span>
                      </div>
                    </div>
                  ) : null}

                  {card.tip ? (
                    <div className="rounded-[1.35rem] border border-sky-400/12 bg-sky-500/[0.06] p-4 text-sm leading-6 text-sky-100/82">
                      <div className="flex items-start gap-2">
                        <Sparkles className="mt-1 h-4 w-4 shrink-0 text-sky-200" />
                        <span>{card.tip}</span>
                      </div>
                    </div>
                  ) : null}

                  <div className="flex items-center gap-2">
                    <Button asChild variant="outline" size="sm" className="rounded-2xl border-white/10 bg-white/[0.03] text-slate-200">
                      <Link href={card.supportHref}>Destekten sor</Link>
                    </Button>
                    {card.state === "selected" || card.state === "active" ? (
                      <Button asChild size="sm" className={cn("rounded-2xl", visuals.button)}>
                        <Link href={card.billingHref}>Billing akisini ac</Link>
                      </Button>
                    ) : null}
                  </div>
                </div>
              </div>
            </motion.div>
          ) : null}
        </AnimatePresence>
      </div>
    </motion.article>
  );
}

function AddonClusterCard({ cluster }: { cluster: StoreAddonClusterViewModel }) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 12 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.25 }}
      transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
      className="rounded-[1.7rem] border border-white/10 bg-[linear-gradient(180deg,rgba(15,18,29,0.95),rgba(9,12,21,0.98))] p-5"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className={cn("rounded-2xl border p-2.5", toneBadgeClasses(cluster.tone))}>
            <ClusterIcon clusterKey={cluster.key} />
          </div>
          <div>
            <p className="text-[11px] uppercase tracking-[0.22em] text-slate-500">{cluster.key}</p>
            <h3 className="mt-1 text-xl font-semibold text-white">{cluster.title}</h3>
          </div>
        </div>
        <Badge className={toneBadgeClasses(cluster.tone)}>{cluster.offers.length} servis</Badge>
      </div>
      <p className="mt-4 text-sm leading-7 text-slate-300/78">{cluster.summary}</p>

      <div className="mt-5 grid gap-3">
        {cluster.offers.map((offer) => {
          const visuals = surfaceClasses(offer.surfaceStyle);
          return (
            <div key={offer.key} className={cn("rounded-[1.35rem] border p-4", visuals.container)}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-semibold text-white">{offer.title}</p>
                    <Badge className={toneBadgeClasses(offer.visualTone)}>{offer.badge}</Badge>
                    {offer.statusLabel ? <Badge className={offer.statusTone ? toneBadgeClasses(offer.statusTone) : "border-white/10 bg-white/[0.05] text-slate-200"}>{offer.statusLabel}</Badge> : null}
                  </div>
                  <p className="mt-2 text-sm leading-6 text-slate-300/76">{offer.summary}</p>
                </div>
                <div className="text-right">
                  {offer.oneTimePrice ? <p className="text-lg font-semibold text-white">{formatMoney(offer.oneTimePrice)}</p> : null}
                  {offer.setupFee > 0 ? <p className="text-sm font-medium text-slate-100">{formatMoney(offer.setupFee)} setup</p> : null}
                  {offer.monthlyPrice ? <p className="text-sm text-slate-400">{formatMoney(offer.monthlyPrice, "/ay")}</p> : null}
                </div>
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                {offer.features.slice(0, 4).map((item) => (
                  <span key={item} className="rounded-full border border-white/8 bg-white/[0.05] px-3 py-1 text-xs text-slate-300">
                    {item}
                  </span>
                ))}
              </div>

              <div className="mt-4 flex items-center justify-between gap-3">
                <p className="text-xs leading-5 text-slate-500">{offer.primaryOutcome}</p>
                <Button asChild size="sm" variant="outline" className="rounded-2xl border-white/10 bg-white/[0.03] text-slate-200">
                  <Link href={offer.supportHref}>
                    {offer.selectionMode === "quote" ? "Detayi ac" : "Destekten iste"}
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
              </div>
            </div>
          );
        })}
      </div>
    </motion.section>
  );
}

function BundleCard({ offer }: { offer: StoreBundleCardViewModel }) {
  const visuals = surfaceClasses(offer.surfaceStyle);

  return (
    <motion.article
      initial={{ opacity: 0, y: 12 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.25 }}
      transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
      className={cn("relative overflow-hidden rounded-[1.9rem] border p-6", visuals.container)}
    >
      <div className={cn("pointer-events-none absolute inset-x-0 top-0 h-48 bg-gradient-to-b opacity-85 blur-3xl", visuals.glow)} />
      <div className="relative z-10">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <div className={cn("rounded-2xl border p-2.5", visuals.icon)}>
                <Crown className="h-5 w-5" />
              </div>
              <div>
                <p className="text-[11px] uppercase tracking-[0.22em] text-slate-500">{offer.archetype}</p>
                <h3 className="mt-1 text-[1.45rem] font-semibold tracking-tight text-white">{offer.title}</h3>
              </div>
              <Badge className={toneBadgeClasses(offer.visualTone)}>{offer.badge}</Badge>
              {offer.priorityBadge ? <Badge className={toneBadgeClasses(offer.priorityBadge.tone)}>{offer.priorityBadge.text}</Badge> : null}
            </div>
            <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-300/78">{offer.summary}</p>
          </div>

          <div className="rounded-[1.4rem] border border-white/10 bg-black/15 px-4 py-3 text-right">
            <p className="text-[11px] uppercase tracking-[0.18em] text-slate-500">Bundle fiyat</p>
            <p className="mt-2 text-[1.9rem] font-semibold tracking-tight text-white">{formatMoney(offer.monthlyPrice, "/ay")}</p>
          </div>
        </div>

        <div className="mt-5 flex flex-wrap gap-2">
          {offer.includedChannels.map((channel) => (
            <span key={channel} className="rounded-full border border-white/10 bg-white/[0.05] px-3 py-1 text-xs text-slate-200">
              {channel}
            </span>
          ))}
        </div>

        <div className="mt-5 grid gap-3 md:grid-cols-2">
          {offer.bundleIncludes.map((item) => (
            <div key={item} className="rounded-[1.25rem] border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-slate-200/85">
              {item}
            </div>
          ))}
        </div>

        <div className="mt-5 flex items-center justify-between gap-3">
          <p className="max-w-2xl text-xs leading-6 text-slate-400">
            Bundle secimi marketplace karar alanini override etmez; ozel operasyon, cok kanalli kapsam ve teklif akisi icin destek tarafinda ele alinir.
          </p>
          <Button asChild className={cn("rounded-2xl", visuals.button)}>
            <Link href={offer.supportHref}>
              Teklif iste
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </div>
      </div>
    </motion.article>
  );
}

function TimelineRail({ steps }: { steps: StoreTimelineStep[] }) {
  return (
    <div className="rounded-[1.8rem] border border-white/10 bg-[linear-gradient(180deg,rgba(14,18,31,0.96),rgba(10,12,22,0.98))] p-5">
      <div className="flex items-center gap-2">
        <CheckCircle2 className="h-5 w-5 text-primary" />
        <h3 className="text-lg font-semibold text-white">Sonraki dogru sira</h3>
      </div>
      <div className="mt-5 space-y-3">
        {steps.map((step) => (
          <div key={step.id} className="rounded-[1.35rem] border border-white/8 bg-white/[0.04] p-4">
            <div className="flex items-start gap-3">
              <div className={cn("mt-0.5 rounded-full border px-2.5 py-1 text-[11px] uppercase tracking-[0.18em]", toneBadgeClasses(step.tone))}>
                {step.label}
              </div>
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-semibold text-white">{step.title}</p>
                  <Badge className={step.status === "completed" ? "border-emerald-400/25 bg-emerald-500/12 text-emerald-100" : step.status === "current" ? "border-primary/25 bg-primary/12 text-primary" : "border-white/10 bg-white/[0.05] text-slate-300"}>
                    {step.status === "completed" ? "Tamamlandi" : step.status === "current" ? "Simdi" : "Sonra"}
                  </Badge>
                </div>
                <p className="mt-2 text-sm leading-6 text-slate-300/78">{step.summary}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function StoreContent({ experience }: { experience: StoreExperienceViewModel }) {
  const router = useRouter();
  const reducedMotion = useReducedMotion();
  const [expandedCard, setExpandedCard] = useState<string | null>(
    experience.marketplaceCards.find((card) => card.state === "selected" || card.state === "active")?.key
      ?? experience.marketplaceCards[0]?.key
      ?? null,
  );
  const [submittingChannel, setSubmittingChannel] = useState<string | null>(null);
  const [notesOpen, setNotesOpen] = useState(false);

  async function handleChannelSelection(channel: StoreExperienceMarketplaceCard["key"]) {
    setSubmittingChannel(channel);
    try {
      const response = await fetch("/api/customer/channel-selection", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ channel }),
      });
      const payload = (await response.json().catch(() => null)) as
        | {
            error?: string;
            selection?: {
              title?: string;
              setupFee?: number | null;
              monthlyPrice?: number | null;
            };
          }
        | null;

      if (!response.ok) {
        throw new Error(payload?.error ?? "Kanal secimi kaydedilemedi.");
      }

      toast.success("Kanal secimi kaydedildi", {
        description:
          `${payload?.selection?.title ?? channel} icin `
          + `${payload?.selection?.setupFee ? `setup ${formatMoney(payload.selection.setupFee)} · ` : ""}`
          + `${payload?.selection?.monthlyPrice ? `${formatMoney(payload.selection.monthlyPrice, "/ay")} yonetim` : "yonetim"} akisi baslatildi.`,
      });
      router.refresh();
    } catch (error) {
      toast.error("Kanal secimi basarisiz", {
        description: error instanceof Error ? error.message : "Beklenmeyen hata",
      });
    } finally {
      setSubmittingChannel(null);
    }
  }

  return (
    <MotionConfig reducedMotion={reducedMotion ? "always" : "never"}>
      <div className="relative space-y-10 overflow-hidden">
        <div className="pointer-events-none absolute inset-x-[-10%] top-0 h-96 bg-[radial-gradient(circle_at_18%_16%,rgba(245,158,11,0.08),transparent_28%),radial-gradient(circle_at_86%_12%,rgba(59,130,246,0.12),transparent_32%),radial-gradient(circle_at_80%_72%,rgba(16,185,129,0.08),transparent_22%)]" />

        <PortalPageHero
          eyebrow={experience.hero.eyebrow}
          title={experience.hero.title}
          description={experience.hero.description}
          surfaceVariant="secondary"
          className="border border-white/10 bg-[linear-gradient(135deg,rgba(11,16,29,0.96),rgba(8,11,22,0.98))]"
          badges={[experience.hero.statusLabel]}
          metrics={experience.hero.metrics}
          primaryAction={{ id: "store:primary", label: experience.hero.primaryAction.label, href: experience.hero.primaryAction.href, description: "", kind: "custom" }}
          secondaryAction={{ id: "store:support", label: experience.hero.secondaryAction.label, href: experience.hero.secondaryAction.href, description: "", kind: "open_support", emphasis: "secondary" }}
        >
          <div className="grid gap-4 xl:grid-cols-[minmax(0,0.6fr)_minmax(0,0.4fr)]">
            <div className="grid gap-3 md:grid-cols-2">
              {experience.hero.readinessItems.map((item) => (
                <div key={item.id} className={cn("rounded-[1.35rem] border px-4 py-3", toneBadgeClasses(item.tone))}>
                  <p className="text-[11px] uppercase tracking-[0.18em] text-slate-500">{item.label}</p>
                  <p className="mt-2 text-lg font-semibold text-white">{item.value}</p>
                  <p className="mt-2 text-sm leading-6 text-slate-200/82">{item.summary}</p>
                </div>
              ))}
            </div>

            {experience.hero.spotlight ? (
              <div className="rounded-[1.5rem] border border-primary/18 bg-[linear-gradient(180deg,rgba(20,31,58,0.92),rgba(10,15,26,0.96))] p-5">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge className="border-0 bg-primary/14 text-primary">{experience.hero.spotlight.stateLabel}</Badge>
                  <Badge variant="outline" className="border-white/10 bg-white/[0.04] text-slate-200">Secili kanal</Badge>
                </div>
                <h3 className="mt-4 text-xl font-semibold text-white">{experience.hero.spotlight.title}</h3>
                <p className="mt-3 text-sm leading-7 text-slate-300/80">{experience.hero.spotlight.summary}</p>
                {experience.hero.spotlight.href ? (
                  <Button asChild size="sm" className="mt-5 rounded-2xl">
                    <Link href={experience.hero.spotlight.href}>
                      Billing akisini ac
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Link>
                  </Button>
                ) : null}
              </div>
            ) : (
              <div className="rounded-[1.5rem] border border-white/10 bg-white/[0.04] p-5">
                <p className="text-[11px] uppercase tracking-[0.22em] text-slate-500">Atlas ne yapiyor?</p>
                <p className="mt-3 text-lg font-semibold text-white">Marketplace secimine hazir bir kontrol odasi kuruyor.</p>
                <p className="mt-3 text-sm leading-7 text-slate-300/78">
                  Once foundation temizlenir, sonra marketplace setup ve aylik yonetim katmanlari bu sayfadan acilir.
                </p>
              </div>
            )}
          </div>
        </PortalPageHero>

        <section id="marketplace-zone" className="space-y-5">
          <SectionIntro
            eyebrow="Marketplace Decision Zone"
            title="Hangi kanalda ilerlemek istiyorsunuz?"
            summary="Her kart ayni karar sistemine bagli: setup, aylik yonetim, en uygun profil ve Atlas'in bu kanalda kuracagi operasyon acilir detayla gorunur."
            badge={`${experience.marketplaceCards.length} kanal`}
          />
          <div className="grid gap-4 xl:grid-cols-3">
            {experience.marketplaceCards.map((card) => (
              <MarketplaceCard
                key={card.key}
                card={card}
                expanded={expandedCard === card.key}
                onToggle={() => setExpandedCard((current) => current === card.key ? null : card.key)}
                onSelect={(key) => void handleChannelSelection(key)}
                submitting={submittingChannel === card.key}
                reducedMotion={Boolean(reducedMotion)}
              />
            ))}
          </div>
        </section>

        <section className="space-y-5">
          <SectionIntro
            eyebrow="Addon Service Clusters"
            title="Marketplace kararindan sonra devreye giren servis katmanlari"
            summary="Ek hizmetler marketplace secimini bozmadan growth, fulfillment ve compliance kapasitesini katmanli sekilde genisletir."
            badge={`${experience.addonClusters.reduce((sum, cluster) => sum + cluster.offers.length, 0)} servis`}
          />
          <div className="grid gap-4 xl:grid-cols-2">
            {experience.addonClusters.map((cluster) => (
              <AddonClusterCard key={cluster.key} cluster={cluster} />
            ))}
          </div>
        </section>

        <section className="space-y-5">
          <SectionIntro
            eyebrow="Bundle Showcase"
            title="Daha buyuk kapsam gerekiyorsa premium bundle katmani"
            summary="Bundle alanı, marketplace secimini silmeden cok kanalli veya executive operasyon modeline gecis icin satıs yuzeyi olarak calisir."
            badge={`${experience.bundleCards.length} premium paket`}
          />
          <div className="grid gap-4 xl:grid-cols-2">
            {experience.bundleCards.map((bundle) => (
              <BundleCard key={bundle.key} offer={bundle} />
            ))}
          </div>
        </section>

        <section className="space-y-4">
          <button
            type="button"
            onClick={() => setNotesOpen((current) => !current)}
            className="flex w-full items-center justify-between rounded-[1.55rem] border border-white/10 bg-white/[0.04] px-5 py-4 text-left"
          >
            <div>
              <p className="text-[11px] uppercase tracking-[0.22em] text-slate-500">Operational Notes</p>
              <h3 className="mt-2 text-lg font-semibold text-white">Depo ve fulfillment notlari</h3>
            </div>
            <ChevronDown className={cn("h-5 w-5 text-slate-300 transition", notesOpen ? "rotate-180" : "")} />
          </button>

          <AnimatePresence initial={false}>
            {notesOpen ? (
              <motion.div
                initial={reducedMotion ? { opacity: 0 } : { opacity: 0, height: 0 }}
                animate={reducedMotion ? { opacity: 1 } : { opacity: 1, height: "auto" }}
                exit={reducedMotion ? { opacity: 0 } : { opacity: 0, height: 0 }}
                transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
                className="overflow-hidden"
              >
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                  {experience.operationalNotes.map((note) => (
                    <div key={note.key} className="rounded-[1.4rem] border border-white/10 bg-[linear-gradient(180deg,rgba(15,19,31,0.95),rgba(10,12,22,0.98))] p-4">
                      <p className="text-[11px] uppercase tracking-[0.18em] text-slate-500">{note.label}</p>
                      <p className="mt-3 text-xl font-semibold text-white">{note.value}</p>
                      <p className="mt-2 text-sm leading-6 text-slate-300/78">{note.summary}</p>
                    </div>
                  ))}
                </div>
              </motion.div>
            ) : null}
          </AnimatePresence>
        </section>

        <section className="grid gap-4 xl:grid-cols-[minmax(0,0.58fr)_minmax(0,0.42fr)]">
          <TimelineRail steps={experience.timelineSteps} />

          <div className="rounded-[1.8rem] border border-white/10 bg-[linear-gradient(180deg,rgba(16,19,31,0.95),rgba(10,12,22,0.98))] p-5">
            <div className="flex items-center gap-2">
              <Globe2 className="h-5 w-5 text-primary" />
              <h3 className="text-lg font-semibold text-white">Aktif magaza hesaplari</h3>
            </div>
            <p className="mt-3 text-sm leading-7 text-slate-300/78">{experience.activeAccountsSummary}</p>

            <div className="mt-5 space-y-3">
              {experience.activeAccounts.length > 0 ? (
                experience.activeAccounts.map((account) => (
                  <div key={account.id} className="rounded-[1.35rem] border border-white/8 bg-white/[0.04] p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="font-semibold text-white">{account.storeName}</p>
                          {account.isPrimary ? <Badge className="border-primary/25 bg-primary/12 text-primary">Primary</Badge> : null}
                        </div>
                        <p className="mt-1 text-xs text-slate-400">
                          {account.platformLabel}
                          {account.sellerId ? ` · ${account.sellerId}` : ""}
                        </p>
                      </div>
                      <Badge className="border-emerald-400/25 bg-emerald-500/12 text-emerald-100">{account.statusLabel}</Badge>
                    </div>
                    {account.storeUrl ? (
                      <Link href={account.storeUrl} target="_blank" className="mt-3 inline-flex items-center text-xs text-primary hover:underline">
                        Magazayi gor
                        <ArrowRight className="ml-1 h-3.5 w-3.5" />
                      </Link>
                    ) : null}
                  </div>
                ))
              ) : (
                <div className="rounded-[1.35rem] border border-dashed border-white/12 bg-white/[0.03] p-4 text-sm leading-6 text-slate-300/78">
                  Henüz aktif bir marketplace hesabı görünmüyor. Bu alan, admin ekip setup ve verification adımlarını tamamladıkça dolacak.
                </div>
              )}
            </div>
          </div>
        </section>
      </div>
    </MotionConfig>
  );
}
