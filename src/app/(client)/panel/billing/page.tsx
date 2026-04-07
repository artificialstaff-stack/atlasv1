import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import {
  PLAN_TIERS,
  BANK_DETAILS,
  getBillingCatalogSections,
  getPlanTierDefinition,
  type PlanTier,
  type Invoice,
} from "@/lib/payments";
import {
  CreditCard,
  FileText,
  Clock,
  CheckCircle2,
  XCircle,
  Building2,
  Copy,
  AlertTriangle,
  BadgeCheck,
} from "lucide-react";
import { PortalPageHero } from "@/components/portal/portal-page-hero";
import { AtlasSectionPanel, AtlasStackGrid, AtlasTableShell } from "@/components/portal/atlas-widget-kit";

export const metadata: Metadata = {
  title: "Faturalandırma",
  description: "Fatura ve ödeme yönetimi",
};

/* eslint-disable @typescript-eslint/no-explicit-any */

const statusConfig: Record<string, { label: string; color: string; icon: typeof Clock }> = {
  pending: { label: "Ödeme Bekliyor", color: "bg-amber-500/20 text-amber-400", icon: Clock },
  paid: { label: "Ödeme Yapıldı (Onay Bekliyor)", color: "bg-blue-500/20 text-blue-400", icon: FileText },
  confirmed: { label: "Onaylandı", color: "bg-emerald-500/20 text-emerald-400", icon: CheckCircle2 },
  overdue: { label: "Vadesi Geçmiş", color: "bg-red-500/20 text-red-400", icon: AlertTriangle },
  cancelled: { label: "İptal Edildi", color: "bg-slate-500/20 text-slate-400", icon: XCircle },
};

export default async function BillingPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");
  const customerId = user.id;

  // Mevcut subscription
  const { data: subscription } = await (supabase as any)
    .from("user_subscriptions")
    .select("*")
    .eq("user_id", user.id)
    .in("payment_status", ["cleared", "pending"])
    .order("started_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const sub = subscription as {
    plan_tier: string;
    valid_until: string;
    started_at: string;
    amount: number;
    payment_status: string;
  } | null;

  // Faturalar
  const { data: invoices } = await (supabase as any)
    .from("invoices")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(20);

  const myInvoices = (invoices ?? []) as Invoice[];
  const pendingInvoices = myInvoices.filter((i) => i.status === "pending");
  const latestTrackedInvoice = myInvoices.find((invoice) =>
    invoice.status === "pending" || invoice.status === "paid" || invoice.status === "confirmed",
  ) ?? null;
  const currentPlanKey = (sub?.plan_tier ?? latestTrackedInvoice?.plan_tier ?? null) as PlanTier | null;
  const currentPlan = currentPlanKey ? getPlanTierDefinition(currentPlanKey) : null;
  const catalogSections = getBillingCatalogSections();
  const currentAmount = typeof sub?.amount === "number"
    ? sub.amount
    : typeof latestTrackedInvoice?.amount === "number"
      ? latestTrackedInvoice.amount
      : currentPlan?.price ?? 0;
  const cadenceLabel = currentPlan
    ? currentPlan.cadence === "one_time"
      ? "tek sefer"
      : currentPlan.cadence === "monthly"
        ? "aylık"
        : "custom"
    : null;

  return (
    <div className="space-y-8">
      <PortalPageHero
        eyebrow="Odeme Durumu"
        title="Faturalandirma"
        description="Plan, odeme durumu ve fatura gecmisinizi operasyon akisindan ayrilmadan takip edin."
        surfaceVariant="secondary"
        metrics={[
          { label: "Plan", value: currentPlan?.name ?? "Secilmedi" },
          { label: "Bekleyen", value: `${pendingInvoices.length}` },
          { label: "Fatura", value: `${myInvoices.length}` },
        ]}
        primaryAction={{
          id: "billing:support",
          label: "Destek Merkezi",
          href: "/panel/support",
          description: "Odeme veya aktivasyon sorusu icin destek al.",
          kind: "open_support",
        }}
        secondaryAction={{
          id: "billing:documents",
          label: "Belgelerim",
          href: "/panel/documents",
          description: "Ilgili fatura ve evraklari gor.",
          kind: "open_documents",
          emphasis: "secondary",
        }}
      >
        <div className="rounded-2xl border border-white/8 bg-background/35 px-4 py-3 text-sm leading-6 text-slate-200/90">
          Finans operasyonu Atlas tarafinda kalir; burada planiniz, odeme bekleyen faturalariniz ve gerekli next-step sade sekilde gosterilir.
        </div>
      </PortalPageHero>

      {/* Current Plan */}
      <AtlasSectionPanel
        eyebrow="Current Plan"
        title="Mevcut plan"
        description="Aktif paket, kaydedilen tutar ve vade/validity bilgisi bu alanda tutulur."
        badge={currentPlan?.name ?? "Paket yok"}
      >
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 className="flex items-center gap-2 text-lg font-semibold text-white">
              <BadgeCheck className="h-5 w-5 text-indigo-400" />
              {currentPlan?.name ?? "Henüz aktif paket yok"}
            </h2>
            <div className="mt-3 flex flex-wrap items-center gap-4">
              {(sub || latestTrackedInvoice) && currentPlan && cadenceLabel ? (
                <>
                  <span className="text-sm text-slate-300">${currentAmount.toFixed(2)} · {cadenceLabel}</span>
                  {sub?.valid_until ? (
                    <span className="text-sm text-slate-500">
                      Geçerlilik: {new Date(sub.valid_until).toLocaleDateString("tr-TR")}
                    </span>
                  ) : latestTrackedInvoice?.due_date ? (
                    <span className="text-sm text-slate-500">
                      Vade: {new Date(latestTrackedInvoice.due_date).toLocaleDateString("tr-TR")}
                    </span>
                  ) : null}
                </>
              ) : (
                <span className="text-sm text-slate-500">
                  Launch merkezi ya da mağaza modülünden akışı başlatabilirsiniz.
                </span>
              )}
            </div>
            {currentPlan && currentAmount !== currentPlan.price ? (
              <p className="mt-2 text-xs text-slate-500">
                Katalog fiyatı: ${currentPlan.price.toFixed(2)} · Kaydedilen tutar: ${currentAmount.toFixed(2)}
              </p>
            ) : null}
          </div>
          {sub && new Date(sub.valid_until) < new Date() ? (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-red-500/20 px-3 py-1 text-xs font-medium text-red-400">
              <AlertTriangle className="h-3.5 w-3.5" />
              Süresi Dolmuş
            </span>
          ) : null}
        </div>
      </AtlasSectionPanel>

      {/* Service Catalog */}
      <AtlasSectionPanel
        eyebrow="Catalog Sync"
        title="Hizmet kataloğu"
        description="Kurulum ve yönetim paketleri tek katalogdan okunur. Fiyatlar burada helper ile senkron kalır."
        badge={`${catalogSections.length} bölüm`}
      >
        <AtlasStackGrid columns="two">
          {catalogSections.map((section) => (
            <div key={section.key} className="rounded-2xl border border-slate-700/50 bg-slate-800/40 p-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs uppercase tracking-[0.2em] text-slate-500">{section.title}</p>
                  <p className="mt-2 text-sm text-slate-400">{section.description}</p>
                </div>
              </div>
              <div className="mt-4 space-y-3">
                {section.packages.map((pkg) => (
                  <div
                    key={pkg.name}
                    className="rounded-xl border border-white/8 bg-background/30 p-4"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-medium text-white">{pkg.name}</p>
                        <p className="mt-1 text-sm text-slate-400">{pkg.summary}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-base font-semibold text-white">
                          {pkg.price > 0 ? `$${pkg.price.toFixed(2)}` : "Custom"}
                        </p>
                        <p className="text-xs text-slate-500">
                          {pkg.cadence === "one_time" ? "tek sefer" : pkg.cadence === "monthly" ? "aylık" : "teklif bazlı"}
                        </p>
                      </div>
                    </div>
                    {pkg.lineItems?.length ? (
                      <div className="mt-3 flex flex-wrap gap-2">
                        {pkg.lineItems.map((item) => (
                          <span
                            key={item.label}
                            className="inline-flex items-center rounded-full border border-white/8 bg-white/5 px-3 py-1 text-xs text-slate-300"
                          >
                            {item.label}: ${item.price.toFixed(2)}
                          </span>
                        ))}
                      </div>
                    ) : null}
                    <div className="mt-3 flex flex-wrap gap-2">
                      {pkg.features.map((feature) => (
                        <span
                          key={feature}
                          className={`rounded-full px-3 py-1 text-xs ${
                            pkg.popular
                              ? "bg-indigo-500/15 text-indigo-200"
                              : "bg-white/5 text-slate-300"
                          }`}
                        >
                          {feature}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </AtlasStackGrid>
      </AtlasSectionPanel>

      {/* Pending Invoices Alert */}
      {pendingInvoices.length > 0 && (
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-5">
          <div className="flex items-start gap-3">
            <Clock className="h-5 w-5 text-amber-400 mt-0.5 shrink-0" />
            <div>
              <h3 className="font-semibold text-amber-300">
                {pendingInvoices.length} Ödeme Bekleyen Fatura
              </h3>
              <p className="mt-1 text-sm text-amber-400/70">
                Aşağıdaki banka hesabına havale/EFT yaparak ödeyebilirsiniz.
                Açıklama alanına fatura numaranızı yazmayı unutmayın.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Bank Details */}
      <AtlasSectionPanel
        eyebrow="Bank Transfer"
        title="Ödeme bilgileri"
        description="Havale/EFT ödemeleri için kullanılan hesap detayları burada sabit tutulur."
        badge="Wire ready"
      >
        <div className="grid gap-4 md:grid-cols-2">
          {[
            { label: "Banka", value: BANK_DETAILS.bankName },
            { label: "Hesap Adı", value: BANK_DETAILS.accountName },
            { label: "Routing Number", value: BANK_DETAILS.routingNumber },
            { label: "SWIFT Kodu", value: BANK_DETAILS.swiftCode },
          ].map((item) => (
            <div key={item.label} className="rounded-lg bg-slate-900/50 p-3">
              <p className="text-xs text-slate-500">{item.label}</p>
              <p className="mt-1 text-sm font-mono text-white flex items-center gap-2">
                {item.value}
                <Copy className="h-3.5 w-3.5 text-slate-500 cursor-pointer hover:text-white transition-colors" />
              </p>
            </div>
          ))}
        </div>
        <p className="mt-4 text-xs text-slate-500 flex items-center gap-1.5">
          <FileText className="h-3.5 w-3.5" />
          {BANK_DETAILS.reference}
        </p>
      </AtlasSectionPanel>

      {/* Invoice History */}
      <AtlasTableShell
        eyebrow="Invoice History"
        title="Fatura geçmişi"
        description="Tüm faturalar, ödeme durumu ve müşteri aksiyonu tek tabloda görünür."
        badge={`${myInvoices.length} fatura`}
      >
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-slate-700 text-slate-400">
              <tr>
                <th className="py-3 font-medium">Fatura No</th>
                <th className="py-3 font-medium">Plan</th>
                <th className="py-3 font-medium">Tutar</th>
                <th className="py-3 font-medium">Vade</th>
                <th className="py-3 font-medium">Durum</th>
                <th className="py-3 font-medium">İşlem</th>
              </tr>
            </thead>
            <tbody>
              {myInvoices.map((invoice) => {
                const cfg = statusConfig[invoice.status] ?? statusConfig.pending;
                const Icon = cfg.icon;
                return (
                  <tr key={invoice.id} className="border-b border-slate-700/50">
                    <td className="py-3 font-mono text-xs text-white">
                      {invoice.invoice_number}
                    </td>
                    <td className="py-3 text-slate-300">
                      {PLAN_TIERS[invoice.plan_tier as PlanTier]?.name ?? invoice.plan_tier}
                    </td>
                    <td className="py-3 text-white font-medium">
                      ${invoice.amount.toFixed(2)}{" "}
                      <span className="text-xs text-slate-500">{invoice.currency}</span>
                    </td>
                    <td className="py-3 text-slate-400">
                      {new Date(invoice.due_date).toLocaleDateString("tr-TR")}
                    </td>
                    <td className="py-3">
                      <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${cfg.color}`}>
                        <Icon className="h-3 w-3" />
                        {cfg.label}
                      </span>
                    </td>
                    <td className="py-3">
                      {invoice.status === "pending" && (
                        <form
                          action={async () => {
                            "use server";
                            const { markInvoiceAsPaid } = await import("@/lib/payments");
                            await markInvoiceAsPaid(invoice.id, customerId, "bank_transfer");
                            const { redirect: r } = await import("next/navigation");
                            r("/panel/billing");
                          }}
                        >
                          <button
                            type="submit"
                            className="rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-indigo-500"
                          >
                            Ödeme Yaptım
                          </button>
                        </form>
                      )}
                      {invoice.status === "paid" && (
                        <span className="text-xs text-blue-400">Onay bekleniyor...</span>
                      )}
                      {invoice.status === "confirmed" && (
                        <span className="text-xs text-emerald-400">✓ Tamamlandı</span>
                      )}
                    </td>
                  </tr>
                );
              })}
              {!myInvoices.length && (
                <tr>
                  <td className="py-8 text-center text-slate-500" colSpan={6}>
                    Henüz fatura bulunmuyor. Plan seçimi için lütfen bizimle iletişime geçin.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </AtlasTableShell>
    </div>
  );
}
