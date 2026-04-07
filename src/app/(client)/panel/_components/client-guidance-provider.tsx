"use client";

import Link from "next/link";
import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import { ArrowRight, Compass, Lock, Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { getClientPanelPageConfig } from "@/lib/customer-portal/ui-config";
import type { ClientGuidanceState } from "@/lib/customer-portal/types";
import { useI18n } from "@/i18n/provider";

type ClientGuidanceContextValue = {
  guidance: ClientGuidanceState;
  setOverride: (value: Partial<ClientGuidanceState> | null) => void;
};

const ClientGuidanceContext = createContext<ClientGuidanceContextValue | null>(null);

function mergeGuidance(
  base: ClientGuidanceState,
  override: Partial<ClientGuidanceState> | null,
): ClientGuidanceState {
  if (!override) return base;

  return {
    ...base,
    ...override,
    metrics: override.metrics ?? base.metrics,
    primaryAction: override.primaryAction ?? base.primaryAction,
    secondaryAction: override.secondaryAction ?? base.secondaryAction,
    lockedHint: override.lockedHint ?? base.lockedHint,
  };
}

function GuidanceBar({ guidance }: { guidance: ClientGuidanceState }) {
  const { t } = useI18n();

  return (
    <motion.section
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.32, ease: [0.4, 0, 0.2, 1] }}
      className="portal-guidance-card relative overflow-hidden rounded-[1.6rem] p-5 md:p-6"
    >
      <div className="absolute -top-24 right-0 h-52 w-52 rounded-full bg-primary/10 blur-[90px]" />
      <div className="absolute bottom-0 left-0 h-44 w-44 rounded-full bg-cyan-400/10 blur-[90px]" />

      <div className="relative z-10 grid gap-5 lg:grid-cols-[minmax(0,1.2fr)_minmax(280px,0.8fr)] lg:items-end">
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <Badge className="border-0 bg-primary/15 text-primary">
              <Compass className="mr-1.5 h-3 w-3" />
              {guidance.areaLabel}
            </Badge>
            {typeof guidance.pendingCount === "number" ? (
              <Badge variant="outline" className="border-white/10 bg-background/35">
                {t("portal.guidance.pendingActions", { count: guidance.pendingCount })}
              </Badge>
            ) : null}
            {guidance.lockedHint ? (
              <Badge className="border-0 bg-amber-500/12 text-amber-200">
                <Lock className="mr-1.5 h-3 w-3" />
                {guidance.lockedHint.label}
              </Badge>
            ) : null}
          </div>

          <div className="space-y-2">
            <p className="atlas-kicker text-primary/70">{t("portal.guidance.currentLocation")}</p>
            <h2 className="text-xl font-semibold tracking-tight text-white md:text-[1.75rem]">
              {guidance.focusLabel}
            </h2>
            <p className="max-w-3xl text-sm leading-6 text-muted-foreground">
              {guidance.summary}
            </p>
          </div>

          {guidance.helperText ? (
            <div className="inline-flex max-w-3xl items-start gap-2 rounded-full border border-white/8 bg-background/35 px-3 py-2 text-xs text-muted-foreground">
              <Sparkles className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
              <span>{guidance.helperText}</span>
            </div>
          ) : null}

          {guidance.lockedHint ? (
            <div className="rounded-2xl border border-amber-500/15 bg-amber-500/8 px-4 py-3 text-sm leading-6 text-amber-100/90">
              {guidance.lockedHint.description}
            </div>
          ) : null}
        </div>

        <div className="space-y-4">
          {guidance.metrics?.length ? (
            <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1 xl:grid-cols-3">
              {guidance.metrics.map((metric) => (
                <div
                  key={metric.label}
                  className="rounded-2xl border border-white/8 bg-background/35 px-4 py-3"
                >
                  <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
                    {metric.label}
                  </p>
                  <p className="mt-2 text-xl font-semibold tracking-tight text-white">
                    {metric.value}
                  </p>
                </div>
              ))}
            </div>
          ) : null}

          <div className="flex flex-wrap gap-2">
            {guidance.primaryAction ? (
              <Button asChild className="rounded-2xl">
                <Link href={guidance.primaryAction.href}>
                  {guidance.primaryAction.label}
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            ) : null}
            {guidance.secondaryAction ? (
              <Button asChild variant="outline" className="rounded-2xl border-white/12 bg-background/30">
                <Link href={guidance.secondaryAction.href}>{guidance.secondaryAction.label}</Link>
              </Button>
            ) : null}
          </div>
        </div>
      </div>
    </motion.section>
  );
}

export function ClientGuidanceProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <ClientGuidanceScope key={pathname} pathname={pathname}>
      {children}
    </ClientGuidanceScope>
  );
}

function ClientGuidanceScope({
  children,
  pathname,
}: {
  children: React.ReactNode;
  pathname: string;
}) {
  const { locale } = useI18n();
  const [override, setOverride] = useState<Partial<ClientGuidanceState> | null>(null);
  const pageConfig = useMemo(() => getClientPanelPageConfig(pathname, locale), [locale, pathname]);
  const guidance = useMemo(
    () => mergeGuidance(pageConfig.guidance, override),
    [override, pageConfig.guidance],
  );

  return (
    <ClientGuidanceContext.Provider value={{ guidance, setOverride }}>
      <div className="space-y-6 md:space-y-8">
        <GuidanceBar guidance={guidance} />
        {children}
      </div>
    </ClientGuidanceContext.Provider>
  );
}

export function useClientGuidance(value: Partial<ClientGuidanceState> | null) {
  const context = useContext(ClientGuidanceContext);

  useEffect(() => {
    if (!context) return;
    context.setOverride(value);
    return () => context.setOverride(null);
  }, [context, value]);
}

export function useClientGuidanceValue() {
  const context = useContext(ClientGuidanceContext);
  if (!context) {
    throw new Error("useClientGuidanceValue must be used within ClientGuidanceProvider.");
  }
  return context.guidance;
}

export function usePortalRouteTone() {
  const { locale } = useI18n();
  const pathname = usePathname();
  return useMemo(() => {
    const config = getClientPanelPageConfig(pathname, locale);
    return config.hero.surfaceVariant ?? "secondary";
  }, [locale, pathname]);
}

export function GuidanceMetricPill({
  label,
  value,
  className,
}: {
  label: string;
  value: string;
  className?: string;
}) {
  return (
    <div className={cn("rounded-full border border-white/8 bg-background/35 px-3 py-2", className)}>
      <span className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">{label}</span>
      <span className="ml-2 text-sm font-semibold text-white">{value}</span>
    </div>
  );
}
