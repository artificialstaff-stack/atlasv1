"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Lock, ShieldAlert, Sparkles, TimerReset } from "lucide-react";
import { PortalPageHero } from "./portal-page-hero";
import { useI18n } from "@/i18n/provider";
import type { CustomerLockedModuleAction, CustomerLockedModuleState } from "@/lib/customer-workspace";
import { getStoreOfferByQuery, type StoreOfferQuery } from "@/lib/payments/catalog";

function getOfferHref(query: StoreOfferQuery, moduleHref: string) {
  const search = new URLSearchParams({
    intent: "module_unlock",
    from: moduleHref.replace("/panel/", "") || "module",
    offerType: query.offerType,
    offerKey: query.offerKey,
  });
  return `/panel/support?${search.toString()}`;
}

function getStateCopy(locale: "tr" | "en", state: CustomerLockedModuleState) {
  if (state === "processing") {
    return {
      badge: locale === "en" ? "Processing" : "İşleniyor",
      title: locale === "en" ? "ATLAS is processing this module." : "Atlas bu modülü işliyor.",
      description:
        locale === "en"
          ? "The package or activation request is already in motion."
          : "Paket veya aktivasyon talebi işleme alınmış durumda.",
      icon: TimerReset,
      tone: "border-blue-500/20 bg-blue-500/10 text-blue-100",
    };
  }

  if (state === "blocked") {
    return {
      badge: locale === "en" ? "Blocked" : "Önkoşul",
      title: locale === "en" ? "A prerequisite is still missing." : "Önce başka bir adım tamamlanmalı.",
      description:
        locale === "en"
          ? "This module stays locked until the required setup lane is opened."
          : "Gerekli kurulum hattı açılmadan bu modül kilitli kalır.",
      icon: ShieldAlert,
      tone: "border-amber-400/25 bg-amber-400/10 text-amber-50",
    };
  }

  return {
    badge: locale === "en" ? "Locked" : "Kilitli",
    title: locale === "en" ? "This module is available as a package." : "Bu modül ayrı bir hizmet paketi olarak açılır.",
    description:
      locale === "en"
        ? "Start the matching service from this screen to unlock it."
        : "Kilidi açmak için ilgili hizmeti bu ekrandan başlatın.",
    icon: Lock,
    tone: "border-amber-300/20 bg-black/20 text-slate-200/85",
  };
}

export function LockedModuleContent(input: {
  title: string;
  description: string;
  summary: string;
  nextStep: string;
  state: CustomerLockedModuleState;
  action: CustomerLockedModuleAction | null;
  secondaryAction: CustomerLockedModuleAction | null;
  offerQueries: StoreOfferQuery[];
}) {
  const pathname = usePathname();
  const { t, locale, formatCurrency } = useI18n();
  const stateCopy = getStateCopy(locale, input.state);
  const offers = input.offerQueries
    .map((query) => ({ query, offer: getStoreOfferByQuery(query.offerType, query.offerKey) }))
    .filter((item): item is { query: StoreOfferQuery; offer: NonNullable<ReturnType<typeof getStoreOfferByQuery>> } => Boolean(item.offer));
  const StateIcon = stateCopy.icon;

  return (
    <div className="space-y-6">
      <PortalPageHero
        eyebrow={t("portal.lockedModules.eyebrow")}
        title={input.title}
        description={input.description}
        surfaceVariant="locked"
        badges={[t("portal.lockedModules.badge"), stateCopy.badge]}
        primaryAction={
          input.action
            ? {
                id: "locked:primary",
                label: input.action.label,
                href: input.action.href,
                description: input.action.description ?? t("portal.lockedModules.primaryDescription"),
                kind: "custom",
              }
            : undefined
        }
        secondaryAction={
          input.secondaryAction
            ? {
                id: "locked:secondary",
                label: input.secondaryAction.label,
                href: input.secondaryAction.href,
                description: input.secondaryAction.description ?? t("portal.lockedModules.secondaryDescription"),
                kind: "custom",
                emphasis: "secondary",
              }
            : undefined
        }
      />

      <Card className="portal-surface-locked rounded-[1.55rem] border-amber-300/15">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-amber-300/25 bg-amber-400/12 text-amber-200">
              <StateIcon className="h-5 w-5" />
            </div>
            <div>
              <CardTitle>{stateCopy.title}</CardTitle>
              <CardDescription className="mt-1 text-amber-100/75">
                {stateCopy.description}
              </CardDescription>
            </div>
          </div>
          <CardDescription>{t("portal.lockedModules.summaryDescription")}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className={`rounded-2xl border p-4 text-sm leading-6 ${stateCopy.tone}`}>
            {input.summary}
          </div>
          <div className="rounded-2xl border border-amber-300/20 bg-amber-400/10 p-4 text-sm leading-6 text-amber-50">
            <div className="flex items-center gap-2 text-sm font-medium text-amber-100">
              <Sparkles className="h-4 w-4" />
              {t("portal.lockedModules.nextStepTitle")}
            </div>
            <p className="mt-2">{input.nextStep}</p>
          </div>
          {offers.length > 0 ? (
            <div className="grid gap-3 lg:grid-cols-2">
              {offers.map(({ query, offer }) => {
                const priceLabel = offer.oneTimePrice
                  ? formatCurrency(offer.oneTimePrice, "USD")
                  : offer.monthlyPrice
                    ? `${formatCurrency(offer.monthlyPrice, "USD")}/${locale === "en" ? "mo" : "ay"}`
                    : offer.setupFee
                      ? formatCurrency(offer.setupFee, "USD")
                      : locale === "en" ? "Custom" : "Teklif";

                return (
                  <div key={`${query.offerType}:${query.offerKey}`} className="rounded-2xl border border-white/8 bg-black/20 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-white">{offer.title}</p>
                        <p className="mt-1 text-xs text-muted-foreground">{offer.summary}</p>
                      </div>
                      <Badge variant="outline" className="border-white/12 bg-background/35">
                        {priceLabel}
                      </Badge>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {offer.features.slice(0, 3).map((feature) => (
                        <span
                          key={feature}
                          className="rounded-full border border-white/8 bg-white/5 px-3 py-1 text-[11px] text-slate-300"
                        >
                          {feature}
                        </span>
                      ))}
                    </div>
                    <div className="mt-4 flex flex-wrap gap-2">
                      <Button asChild className="rounded-2xl">
                        <Link href={getOfferHref(query, pathname)}>{offer.ctaLabel}</Link>
                      </Button>
                      <Button asChild variant="outline" className="rounded-2xl border-white/12 bg-background/30">
                        <Link href={getOfferHref(query, pathname)}>{t("portal.support.title")}</Link>
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : null}
          <div className="flex flex-wrap gap-2">
            {input.action ? (
              <Button asChild className="rounded-2xl">
                <Link href={input.action.href}>{input.action.label}</Link>
              </Button>
            ) : null}
            {input.secondaryAction ? (
              <Button asChild variant="outline" className="rounded-2xl">
                <Link href={input.secondaryAction.href}>{input.secondaryAction.label}</Link>
              </Button>
            ) : null}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
