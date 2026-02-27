import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { PLAN_TIERS, BANK_DETAILS, type PlanTier, type Invoice } from "@/lib/payments";
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

  const currentPlanKey = (sub?.plan_tier ?? "starter") as PlanTier;
  const currentPlan = PLAN_TIERS[currentPlanKey] ?? PLAN_TIERS.starter;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-white">Faturalandırma</h1>
        <p className="mt-2 text-slate-400">
          Faturalarınızı görüntüleyin ve ödeme yapın.
        </p>
      </div>

      {/* Current Plan */}
      <div className="rounded-2xl border border-slate-700/50 bg-slate-800/40 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-white flex items-center gap-2">
              <BadgeCheck className="h-5 w-5 text-indigo-400" />
              Mevcut Plan
            </h2>
            <div className="mt-3 flex items-center gap-4">
              <span className="inline-flex items-center rounded-full bg-indigo-500/20 px-4 py-1.5 text-sm font-medium text-indigo-300">
                {currentPlan.name}
              </span>
              {sub && (
                <>
                  <span className="text-sm text-slate-400">
                    ${sub.amount}/ay
                  </span>
                  <span className="text-sm text-slate-500">
                    Geçerlilik: {new Date(sub.valid_until).toLocaleDateString("tr-TR")}
                  </span>
                </>
              )}
            </div>
          </div>
          {sub && new Date(sub.valid_until) < new Date() && (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-red-500/20 px-3 py-1 text-xs font-medium text-red-400">
              <AlertTriangle className="h-3.5 w-3.5" />
              Süresi Dolmuş
            </span>
          )}
        </div>
      </div>

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
      <div className="rounded-2xl border border-slate-700/50 bg-slate-800/40 p-6">
        <h2 className="text-lg font-semibold text-white flex items-center gap-2 mb-4">
          <Building2 className="h-5 w-5 text-indigo-400" />
          Ödeme Bilgileri
        </h2>
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
      </div>

      {/* Invoice History */}
      <div className="rounded-2xl border border-slate-700/50 bg-slate-800/40 p-6">
        <h2 className="mb-4 text-lg font-semibold text-white flex items-center gap-2">
          <CreditCard className="h-5 w-5 text-indigo-400" />
          Fatura Geçmişi
        </h2>
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
                            const { createClient: sc } = await import("@/lib/supabase/server");
                            const supa = await sc();
                            const { data: { user: u } } = await supa.auth.getUser();
                            if (u) {
                              await markInvoiceAsPaid(invoice.id, u.id, "bank_transfer");
                            }
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
      </div>
    </div>
  );
}
