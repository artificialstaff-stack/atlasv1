"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { motion, useReducedMotion } from "framer-motion";
import type { LucideIcon } from "lucide-react";
import { ArrowRight, Lock, Sparkles } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type AtlasWidgetTone =
  | "neutral"
  | "primary"
  | "success"
  | "warning"
  | "danger"
  | "copper"
  | "emerald"
  | "cobalt"
  | "violet"
  | "crafted";

export type AtlasWidgetState =
  | "active"
  | "locked"
  | "blocked"
  | "processing"
  | "empty"
  | "data-rich";

export interface AtlasWidgetAction {
  label: string;
  href?: string;
  onClick?: () => void;
  icon?: LucideIcon;
  variant?: "default" | "outline" | "ghost";
}

export interface AtlasMetricItem {
  label: string;
  value: string;
  hint?: string;
  tone?: AtlasWidgetTone;
}

export interface AtlasTimelineItemVM {
  id: string;
  title: string;
  description: string;
  badge?: string;
  tone?: AtlasWidgetTone;
  icon?: LucideIcon;
}

export interface AtlasPageHeroVM {
  eyebrow: string;
  title: string;
  description: string;
  badges?: string[];
  metrics?: AtlasMetricItem[];
  primaryAction?: AtlasWidgetAction;
  secondaryAction?: AtlasWidgetAction;
  tone?: AtlasWidgetTone;
}

function toneRecipe(tone: AtlasWidgetTone = "neutral") {
  switch (tone) {
    case "primary":
      return {
        badge: "border-primary/25 bg-primary/12 text-primary",
        metric: "border-primary/15 bg-primary/[0.08]",
        icon: "border-primary/20 bg-primary/10 text-primary",
        action: "bg-primary text-primary-foreground hover:bg-primary/90",
        accent: "from-primary/35 via-cyan-400/10 to-transparent",
      };
    case "success":
      return {
        badge: "border-emerald-400/25 bg-emerald-500/12 text-emerald-200",
        metric: "border-emerald-400/15 bg-emerald-500/[0.08]",
        icon: "border-emerald-400/20 bg-emerald-500/10 text-emerald-200",
        action: "bg-emerald-400 text-slate-950 hover:bg-emerald-300",
        accent: "from-emerald-400/30 via-cyan-400/8 to-transparent",
      };
    case "warning":
    case "copper":
      return {
        badge: "border-amber-400/25 bg-amber-500/12 text-amber-100",
        metric: "border-amber-400/15 bg-amber-500/[0.08]",
        icon: "border-amber-400/20 bg-amber-500/10 text-amber-100",
        action: "bg-amber-400 text-slate-950 hover:bg-amber-300",
        accent: "from-amber-300/35 via-orange-300/12 to-transparent",
      };
    case "danger":
      return {
        badge: "border-rose-400/25 bg-rose-500/12 text-rose-200",
        metric: "border-rose-400/15 bg-rose-500/[0.08]",
        icon: "border-rose-400/20 bg-rose-500/10 text-rose-200",
        action: "bg-rose-400 text-slate-950 hover:bg-rose-300",
        accent: "from-rose-300/30 via-orange-300/8 to-transparent",
      };
    case "emerald":
      return {
        badge: "border-emerald-400/25 bg-emerald-500/12 text-emerald-200",
        metric: "border-emerald-400/15 bg-emerald-500/[0.08]",
        icon: "border-emerald-400/20 bg-emerald-500/10 text-emerald-100",
        action: "bg-emerald-400 text-slate-950 hover:bg-emerald-300",
        accent: "from-emerald-300/35 via-cyan-300/12 to-transparent",
      };
    case "cobalt":
      return {
        badge: "border-sky-400/25 bg-sky-500/12 text-sky-200",
        metric: "border-sky-400/15 bg-sky-500/[0.08]",
        icon: "border-sky-400/20 bg-sky-500/10 text-sky-100",
        action: "bg-sky-400 text-slate-950 hover:bg-sky-300",
        accent: "from-sky-300/35 via-cyan-300/12 to-transparent",
      };
    case "violet":
      return {
        badge: "border-violet-400/25 bg-violet-500/12 text-violet-200",
        metric: "border-violet-400/15 bg-violet-500/[0.08]",
        icon: "border-violet-400/20 bg-violet-500/10 text-violet-100",
        action: "bg-violet-400 text-slate-950 hover:bg-violet-300",
        accent: "from-violet-300/35 via-fuchsia-300/12 to-transparent",
      };
    case "crafted":
      return {
        badge: "border-orange-300/25 bg-orange-400/12 text-orange-100",
        metric: "border-orange-300/15 bg-orange-400/[0.08]",
        icon: "border-orange-300/20 bg-orange-400/10 text-orange-100",
        action: "bg-orange-300 text-slate-950 hover:bg-orange-200",
        accent: "from-orange-200/35 via-amber-300/12 to-transparent",
      };
    default:
      return {
        badge: "border-white/10 bg-white/[0.04] text-slate-200",
        metric: "border-white/8 bg-white/[0.04]",
        icon: "border-white/10 bg-white/[0.04] text-white",
        action: "bg-primary text-primary-foreground hover:bg-primary/90",
        accent: "from-white/15 via-white/6 to-transparent",
      };
  }
}

function renderAction(action: AtlasWidgetAction, className?: string) {
  const Icon = action.icon ?? ArrowRight;
  const variant = action.variant ?? "default";

  if (action.href) {
    return (
      <Button
        asChild
        variant={variant}
        className={cn(
          "rounded-2xl",
          variant === "outline" && "border-white/10 bg-white/[0.03] text-slate-100 hover:bg-white/[0.06]",
          className,
        )}
      >
        <Link href={action.href}>
          {action.label}
          <Icon className="ml-2 h-4 w-4" />
        </Link>
      </Button>
    );
  }

  return (
    <Button
      type="button"
      variant={variant}
      onClick={action.onClick}
      className={cn(
        "rounded-2xl",
        variant === "outline" && "border-white/10 bg-white/[0.03] text-slate-100 hover:bg-white/[0.06]",
        className,
      )}
    >
      {action.label}
      <Icon className="ml-2 h-4 w-4" />
    </Button>
  );
}

export function AtlasStackGrid({
  children,
  className,
  columns = "three",
}: {
  children: ReactNode;
  className?: string;
  columns?: "two" | "three" | "four" | "split";
}) {
  return (
    <div
      className={cn(
        "grid gap-4",
        columns === "two" && "md:grid-cols-2",
        columns === "three" && "md:grid-cols-2 xl:grid-cols-3",
        columns === "four" && "md:grid-cols-2 xl:grid-cols-4",
        columns === "split" && "xl:grid-cols-[1.08fr_0.92fr]",
        className,
      )}
    >
      {children}
    </div>
  );
}

export function AtlasMetricSlab({
  label,
  value,
  hint,
  tone = "neutral",
}: AtlasMetricItem) {
  const recipe = toneRecipe(tone);

  return (
    <div className={cn("rounded-[1.15rem] border px-4 py-3", recipe.metric)}>
      <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">{label}</p>
      <p className="mt-2 text-[1.45rem] font-semibold tracking-tight text-white">{value}</p>
      {hint ? <p className="mt-1.5 text-xs leading-5 text-muted-foreground">{hint}</p> : null}
    </div>
  );
}

export function AtlasActionDock({
  primaryAction,
  secondaryAction,
  className,
}: {
  primaryAction?: AtlasWidgetAction;
  secondaryAction?: AtlasWidgetAction;
  className?: string;
}) {
  if (!primaryAction && !secondaryAction) return null;

  return (
    <div className={cn("flex flex-wrap gap-3", className)}>
      {primaryAction ? renderAction(primaryAction) : null}
      {secondaryAction ? renderAction({ ...secondaryAction, variant: secondaryAction.variant ?? "outline" }) : null}
    </div>
  );
}

export function AtlasSectionIntro({
  eyebrow,
  title,
  description,
  badge,
  action,
  className,
}: {
  eyebrow: string;
  title: string;
  description: string;
  badge?: string;
  action?: AtlasWidgetAction;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-wrap items-start justify-between gap-4", className)}>
      <div className="max-w-3xl">
        <p className="text-[11px] uppercase tracking-[0.22em] text-slate-500">{eyebrow}</p>
        <h2 className="mt-2 text-[1.85rem] font-semibold tracking-tight text-white">{title}</h2>
        <p className="mt-3 text-sm leading-7 text-slate-300/78">{description}</p>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        {badge ? (
          <Badge variant="outline" className="border-white/10 bg-white/[0.04] text-slate-200">
            {badge}
          </Badge>
        ) : null}
        {action ? renderAction({ ...action, variant: action.variant ?? "outline" }) : null}
      </div>
    </div>
  );
}

export function AtlasHeroBoard({
  eyebrow,
  title,
  description,
  badges,
  metrics,
  primaryAction,
  secondaryAction,
  tone = "primary",
  children,
  className,
  surface = "hero",
}: AtlasPageHeroVM & {
  children?: ReactNode;
  className?: string;
  surface?: "hero" | "secondary" | "list" | "locked";
}) {
  const reduceMotion = useReducedMotion();
  const recipe = toneRecipe(tone);
  const surfaceClass =
    surface === "secondary"
      ? "portal-surface-secondary"
      : surface === "list"
        ? "portal-surface-list"
        : surface === "locked"
          ? "portal-surface-locked"
          : "portal-surface-hero";

  return (
    <motion.section
      initial={reduceMotion ? false : { opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: reduceMotion ? 0 : 0.32, ease: [0.22, 1, 0.36, 1] }}
      className={cn(
        "atlas-noise relative overflow-hidden rounded-[1.9rem] p-6 md:p-7",
        surfaceClass,
        className,
      )}
    >
      <div className={cn("pointer-events-none absolute inset-x-0 top-0 h-36 bg-gradient-to-b opacity-70 blur-3xl", recipe.accent)} />

      <div className="relative z-10 space-y-6">
        <div className="flex flex-wrap items-center gap-2">
          <Badge className={recipe.badge}>{eyebrow}</Badge>
          {badges?.map((badge) => (
            <Badge key={badge} variant="outline" className="border-white/10 bg-white/[0.04] text-slate-200">
              {badge}
            </Badge>
          ))}
        </div>

        <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
          <div className="max-w-3xl">
            <h1 className="text-[2.2rem] font-semibold tracking-tight text-white md:text-[2.45rem]">{title}</h1>
            <p className="mt-3 text-sm leading-7 text-slate-300/82">{description}</p>
          </div>

          {(primaryAction || secondaryAction) ? (
            <AtlasActionDock primaryAction={primaryAction} secondaryAction={secondaryAction} />
          ) : null}
        </div>

        {metrics?.length ? (
          <AtlasStackGrid columns={metrics.length >= 4 ? "four" : metrics.length === 2 ? "two" : "three"}>
            {metrics.map((metric) => (
              <AtlasMetricSlab key={metric.label} {...metric} />
            ))}
          </AtlasStackGrid>
        ) : null}

        {children}
      </div>
    </motion.section>
  );
}

export function AtlasInsightCard({
  eyebrow,
  title,
  description,
  badge,
  tone = "neutral",
  icon: Icon,
  metrics,
  primaryAction,
  secondaryAction,
  children,
  className,
}: {
  eyebrow?: string;
  title: ReactNode;
  description: string;
  badge?: string;
  tone?: AtlasWidgetTone;
  icon?: LucideIcon;
  metrics?: AtlasMetricItem[];
  primaryAction?: AtlasWidgetAction;
  secondaryAction?: AtlasWidgetAction;
  children?: ReactNode;
  className?: string;
}) {
  const reduceMotion = useReducedMotion();
  const recipe = toneRecipe(tone);

  return (
    <motion.article
      initial={reduceMotion ? false : { opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: reduceMotion ? 0 : 0.28, ease: [0.22, 1, 0.36, 1] }}
      className={cn("portal-surface-secondary atlas-noise relative overflow-hidden rounded-[1.7rem] p-5", className)}
    >
      <div className={cn("pointer-events-none absolute inset-x-0 top-0 h-28 bg-gradient-to-b opacity-60 blur-3xl", recipe.accent)} />
      <div className="relative z-10 flex h-full flex-col">
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 items-start gap-3">
            {Icon ? (
              <div className={cn("flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border", recipe.icon)}>
                <Icon className="h-5 w-5" />
              </div>
            ) : null}
            <div className="min-w-0">
              {eyebrow ? <p className="atlas-kicker">{eyebrow}</p> : null}
              <h3 className="mt-2 text-xl font-semibold tracking-tight text-white">{title}</h3>
            </div>
          </div>
          {badge ? <Badge className={recipe.badge}>{badge}</Badge> : null}
        </div>

        <p className="mt-4 text-sm leading-7 text-slate-300/82">{description}</p>

        {metrics?.length ? (
          <AtlasStackGrid columns={metrics.length >= 4 ? "four" : metrics.length === 2 ? "two" : "three"} className="mt-5">
            {metrics.map((metric) => (
              <AtlasMetricSlab key={metric.label} {...metric} tone={metric.tone ?? tone} />
            ))}
          </AtlasStackGrid>
        ) : null}

        {children ? <div className="mt-5">{children}</div> : null}

        {(primaryAction || secondaryAction) ? (
          <AtlasActionDock primaryAction={primaryAction} secondaryAction={secondaryAction} className="mt-5" />
        ) : null}
      </div>
    </motion.article>
  );
}

export function AtlasActionCard({
  title,
  value,
  description,
  icon: Icon,
  tone = "neutral",
  onClick,
  href,
  openLabel,
  className,
}: {
  title: string;
  value: string;
  description: string;
  icon: LucideIcon;
  tone?: AtlasWidgetTone;
  onClick?: () => void;
  href?: string;
  openLabel?: string;
  className?: string;
}) {
  const recipe = toneRecipe(tone);
  const content = (
    <>
      <div className={cn("flex h-11 w-11 items-center justify-center rounded-2xl border", recipe.icon)}>
        <Icon className="h-5 w-5" />
      </div>
      <p className="mt-5 text-[11px] uppercase tracking-[0.22em] text-muted-foreground">{title}</p>
      <p className="mt-2 text-2xl font-semibold tracking-tight text-white">{value}</p>
      <p className="mt-3 text-sm leading-6 text-muted-foreground">{description}</p>
      {openLabel ? (
        <div className="mt-4 inline-flex items-center gap-2 text-sm font-medium text-white/88">
          {openLabel}
          <ArrowRight className="h-4 w-4" />
        </div>
      ) : null}
    </>
  );

  if (href) {
    return (
      <Link
        href={href}
        className={cn(
          "portal-surface-secondary block rounded-[1.5rem] p-5 text-left transition hover:-translate-y-0.5 hover:border-primary/25",
          className,
        )}
      >
        {content}
      </Link>
    );
  }

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "portal-surface-secondary block rounded-[1.5rem] p-5 text-left transition hover:-translate-y-0.5 hover:border-primary/25",
        className,
      )}
    >
      {content}
    </button>
  );
}

export function AtlasSectionPanel({
  eyebrow,
  title,
  description,
  badge,
  action,
  children,
  className,
}: {
  eyebrow: string;
  title: string;
  description?: string;
  badge?: string;
  action?: AtlasWidgetAction;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("portal-surface-secondary rounded-[1.6rem] p-5", className)}>
      <AtlasSectionIntro
        eyebrow={eyebrow}
        title={title}
        description={description ?? ""}
        badge={badge}
        action={action}
      />
      <div className="mt-5">{children}</div>
    </section>
  );
}

export function AtlasEmptySurface({
  title,
  description,
  primaryAction,
  secondaryAction,
  tone = "neutral",
  className,
}: {
  title: string;
  description: string;
  primaryAction?: AtlasWidgetAction;
  secondaryAction?: AtlasWidgetAction;
  tone?: AtlasWidgetTone;
  className?: string;
}) {
  const recipe = toneRecipe(tone);

  return (
    <div className={cn("rounded-[1.45rem] border border-dashed px-5 py-10 text-center", recipe.metric, className)}>
      <div className={cn("mx-auto flex h-12 w-12 items-center justify-center rounded-2xl border", recipe.icon)}>
        <Sparkles className="h-5 w-5" />
      </div>
      <h3 className="mt-4 text-lg font-semibold text-white">{title}</h3>
      <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-muted-foreground">{description}</p>
      <AtlasActionDock primaryAction={primaryAction} secondaryAction={secondaryAction} className="mt-5 justify-center" />
    </div>
  );
}

export function AtlasTimelineRail({
  items,
  className,
}: {
  items: AtlasTimelineItemVM[];
  className?: string;
}) {
  return (
    <div className={cn("space-y-3", className)}>
      {items.map((item) => {
        const recipe = toneRecipe(item.tone ?? "neutral");
        const Icon = item.icon ?? Lock;
        return (
          <div key={item.id} className="rounded-[1.2rem] border border-white/8 bg-background/35 p-4">
            <div className="flex items-start gap-3">
              <div className={cn("mt-0.5 flex h-9 w-9 items-center justify-center rounded-xl border", recipe.icon)}>
                <Icon className="h-4 w-4" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-sm font-medium text-white">{item.title}</p>
                  {item.badge ? <Badge className={recipe.badge}>{item.badge}</Badge> : null}
                </div>
                <p className="mt-1.5 text-xs leading-5 text-muted-foreground">{item.description}</p>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

export function AtlasTableShell({
  eyebrow,
  title,
  description,
  badge,
  children,
  className,
}: {
  eyebrow: string;
  title: string;
  description: string;
  badge?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("portal-surface-list rounded-[1.45rem] p-4", className)}>
      <AtlasSectionIntro eyebrow={eyebrow} title={title} description={description} badge={badge} />
      <div className="mt-4">{children}</div>
    </div>
  );
}
