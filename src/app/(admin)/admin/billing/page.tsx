import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { PLAN_TIERS, type PlanTier, type Invoice } from "@/lib/payments";
import {
  DollarSign,
  Clock,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  FileText,
  TrendingUp,
  Receipt,
} from "lucide-react";

export const metadata: Metadata = {
  title: "Admin Faturalandırma",
  description: "Fatura oluşturma ve ödeme onay yönetimi",
};

/* eslint-disable @typescript-eslint/no-explicit-any */

type InvoiceWithUser = Invoice & {
  users?: {
    email: string;
    first_name: string;
    last_name: string;
    company_name: string;
  };
};

const statusConfig: Record<string, { label: string; color: string; icon: typeof Clock }> = {
  pending: { label: "Ödeme Bekliyor", color: "bg-amber-500/20 text-amber-400", icon: Clock },
  paid: { label: "Ödeme Yapıldı", color: "bg-blue-500/20 text-blue-400", icon: FileText },
  confirmed: { label: "Onaylandı", color: "bg-emerald-500/20 text-emerald-400", icon: CheckCircle2 },
  overdue: { label: "Vadesi Geçmiş", color: "bg-red-500/20 text-red-400", icon: AlertTriangle },
  cancelled: { label: "İptal", color: "bg-slate-500/20 text-slate-400", icon: XCircle },
};

export default async function AdminBillingPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  // Tüm faturalar (join users)
  const { data: allInvoices, count } = await (supabase as any)
    .from("invoices")
    .select("*, users!invoices_user_id_fkey(email, first_name, last_name, company_name)", { count: "exact" })
    .order("created_at", { ascending: false })
    .limit(100);

  const invoices = (allInvoices ?? []) as InvoiceWithUser[];

  // Müşteri listesi (fatura oluşturmak için)
  const { data: customers } = await (supabase as any)
    .from("users")
    .select("id, email, first_name, last_name, company_name")
    .order("company_name", { ascending: true });

  const customerList = (customers ?? []) as Array<{
    id: string;
    email: string;
    first_name: string;
    last_name: string;
    company_name: string;
  }>;

  // Metrikleri hesapla
  const totalRevenue = invoices
    .filter((i) => i.status === "confirmed")
    .reduce((sum, i) => sum + (i.amount ?? 0), 0);

  const pendingPayments = invoices.filter((i) => i.status === "paid").length;
  const pendingAmount = invoices
    .filter((i) => i.status === "paid")
    .reduce((sum, i) => sum + (i.amount ?? 0), 0);

  const overdueCount = invoices.filter((i) => i.status === "overdue").length;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-white">Fatura Yönetimi</h1>
        <p className="mt-2 text-slate-400">
          Müşteri faturaları oluşturun, ödemeleri onaylayın, gelirleri takip edin.
        </p>
      </div>

      {/* Metrics */}
      <div className="grid gap-4 md:grid-cols-4">
        {[
          {
            label: "Toplam Gelir",
            value: `$${totalRevenue.toLocaleString("en-US", { minimumFractionDigits: 2 })}`,
            icon: DollarSign,
            color: "text-emerald-400",
          },
          {
            label: "Onay Bekleyen",
            value: `${pendingPayments} fatura`,
            subtext: `$${pendingAmount.toFixed(2)}`,
            icon: Clock,
            color: "text-amber-400",
          },
          {
            label: "Vadesi Geçmiş",
            value: overdueCount,
            icon: AlertTriangle,
            color: "text-red-400",
          },
          {
            label: "Toplam Fatura",
            value: count ?? 0,
            icon: Receipt,
            color: "text-indigo-400",
          },
        ].map((metric) => (
          <div
            key={metric.label}
            className="rounded-xl border border-slate-700/50 bg-slate-800/40 p-4"
          >
            <div className="flex items-center gap-2">
              <metric.icon className={`h-4 w-4 ${metric.color}`} />
              <p className="text-sm text-slate-400">{metric.label}</p>
            </div>
            <p className="mt-2 text-2xl font-bold text-white">{metric.value}</p>
            {"subtext" in metric && metric.subtext && (
              <p className="text-xs text-slate-500">{metric.subtext}</p>
            )}
          </div>
        ))}
      </div>

      {/* Create Invoice Form */}
      <div className="rounded-2xl border border-slate-700/50 bg-slate-800/40 p-6">
        <h2 className="text-lg font-semibold text-white flex items-center gap-2 mb-4">
          <FileText className="h-5 w-5 text-indigo-400" />
          Yeni Fatura Oluştur
        </h2>
        <form
          action={async (formData: FormData) => {
            "use server";
            const { createInvoice } = await import("@/lib/payments");
            const userId = formData.get("userId") as string;
            const planTier = formData.get("planTier") as PlanTier;
            const amount = parseFloat(formData.get("amount") as string);
            const dueDate = formData.get("dueDate") as string;
            const notes = formData.get("notes") as string;

            if (userId && planTier && amount && dueDate) {
              await createInvoice({
                userId,
                planTier,
                amount,
                dueDate: new Date(dueDate).toISOString(),
                notes: notes || undefined,
              });
            }

            const { redirect: r } = await import("next/navigation");
            r("/admin/billing");
          }}
          className="grid gap-4 md:grid-cols-2 lg:grid-cols-5"
        >
          <div>
            <label className="block text-xs text-slate-400 mb-1.5">Müşteri</label>
            <select
              name="userId"
              required
              className="w-full rounded-lg border border-slate-700 bg-slate-900/50 px-3 py-2 text-sm text-white focus:border-indigo-500 focus:outline-none"
            >
              <option value="">Seçin...</option>
              {customerList.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.company_name} — {c.first_name} {c.last_name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs text-slate-400 mb-1.5">Plan</label>
            <select
              name="planTier"
              required
              className="w-full rounded-lg border border-slate-700 bg-slate-900/50 px-3 py-2 text-sm text-white focus:border-indigo-500 focus:outline-none"
            >
              {Object.entries(PLAN_TIERS).map(([key, plan]) => (
                <option key={key} value={key}>
                  {plan.name} {plan.price > 0 ? `($${plan.price})` : "(Özel)"}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs text-slate-400 mb-1.5">Tutar ($)</label>
            <input
              type="number"
              name="amount"
              required
              min="0"
              step="0.01"
              placeholder="999.00"
              className="w-full rounded-lg border border-slate-700 bg-slate-900/50 px-3 py-2 text-sm text-white focus:border-indigo-500 focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-xs text-slate-400 mb-1.5">Vade Tarihi</label>
            <input
              type="date"
              name="dueDate"
              required
              className="w-full rounded-lg border border-slate-700 bg-slate-900/50 px-3 py-2 text-sm text-white focus:border-indigo-500 focus:outline-none"
            />
          </div>
          <div className="flex items-end">
            <button
              type="submit"
              className="w-full rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-indigo-500"
            >
              Fatura Oluştur
            </button>
          </div>
          <div className="md:col-span-2 lg:col-span-5">
            <label className="block text-xs text-slate-400 mb-1.5">Not (opsiyonel)</label>
            <input
              type="text"
              name="notes"
              placeholder="Fatura hakkında ek bilgi..."
              className="w-full rounded-lg border border-slate-700 bg-slate-900/50 px-3 py-2 text-sm text-white focus:border-indigo-500 focus:outline-none"
            />
          </div>
        </form>
      </div>

      {/* Pending Confirmations */}
      {invoices.some((i) => i.status === "paid") && (
        <div className="rounded-2xl border border-amber-500/30 bg-amber-500/5 p-6">
          <h2 className="text-lg font-semibold text-amber-300 flex items-center gap-2 mb-4">
            <Clock className="h-5 w-5" />
            Onay Bekleyen Ödemeler ({pendingPayments})
          </h2>
          <div className="space-y-3">
            {invoices
              .filter((i) => i.status === "paid")
              .map((invoice) => (
                <div
                  key={invoice.id}
                  className="flex items-center justify-between rounded-lg bg-slate-800/60 p-4"
                >
                  <div>
                    <p className="text-sm font-medium text-white">
                      {invoice.users?.company_name ?? "—"}{" "}
                      <span className="text-slate-500">—</span>{" "}
                      <span className="font-mono text-xs text-slate-400">{invoice.invoice_number}</span>
                    </p>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {invoice.users?.first_name} {invoice.users?.last_name} · {PLAN_TIERS[invoice.plan_tier as PlanTier]?.name} · ${invoice.amount.toFixed(2)}
                      {invoice.paid_at && ` · Ödendi: ${new Date(invoice.paid_at).toLocaleDateString("tr-TR")}`}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <form
                      action={async () => {
                        "use server";
                        const { confirmPayment } = await import("@/lib/payments");
                        const { createClient: sc } = await import("@/lib/supabase/server");
                        const supa = await sc();
                        const { data: { user: admin } } = await supa.auth.getUser();
                        if (admin) {
                          await confirmPayment(invoice.id, admin.id);
                        }
                        const { redirect: r } = await import("next/navigation");
                        r("/admin/billing");
                      }}
                    >
                      <button
                        type="submit"
                        className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-emerald-500"
                      >
                        ✓ Onayla
                      </button>
                    </form>
                    <form
                      action={async () => {
                        "use server";
                        const { cancelInvoice } = await import("@/lib/payments");
                        await cancelInvoice(invoice.id, "Admin tarafından reddedildi");
                        const { redirect: r } = await import("next/navigation");
                        r("/admin/billing");
                      }}
                    >
                      <button
                        type="submit"
                        className="rounded-lg bg-red-600/80 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-red-500"
                      >
                        ✕ Reddet
                      </button>
                    </form>
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* All Invoices Table */}
      <div className="rounded-2xl border border-slate-700/50 bg-slate-800/40 p-6">
        <h2 className="mb-4 text-lg font-semibold text-white flex items-center gap-2">
          <TrendingUp className="h-5 w-5 text-indigo-400" />
          Tüm Faturalar ({count ?? 0})
        </h2>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-slate-700 text-slate-400">
              <tr>
                <th className="py-3 font-medium">Fatura No</th>
                <th className="py-3 font-medium">Müşteri</th>
                <th className="py-3 font-medium">Plan</th>
                <th className="py-3 font-medium">Tutar</th>
                <th className="py-3 font-medium">Vade</th>
                <th className="py-3 font-medium">Durum</th>
                <th className="py-3 font-medium">Tarih</th>
              </tr>
            </thead>
            <tbody>
              {invoices.map((invoice) => {
                const cfg = statusConfig[invoice.status] ?? statusConfig.pending;
                const Icon = cfg.icon;
                return (
                  <tr key={invoice.id} className="border-b border-slate-700/50 hover:bg-slate-800/60 transition-colors">
                    <td className="py-3 font-mono text-xs text-white">
                      {invoice.invoice_number}
                    </td>
                    <td className="py-3">
                      <div>
                        <p className="text-white text-xs">{invoice.users?.company_name ?? "—"}</p>
                        <p className="text-slate-500 text-xs">{invoice.users?.email}</p>
                      </div>
                    </td>
                    <td className="py-3">
                      <span className="inline-flex rounded-full bg-indigo-500/20 px-2.5 py-0.5 text-xs font-medium text-indigo-300">
                        {PLAN_TIERS[invoice.plan_tier as PlanTier]?.name ?? invoice.plan_tier}
                      </span>
                    </td>
                    <td className="py-3 text-white font-medium">
                      ${invoice.amount.toFixed(2)}
                    </td>
                    <td className="py-3 text-slate-400 text-xs">
                      {new Date(invoice.due_date).toLocaleDateString("tr-TR")}
                    </td>
                    <td className="py-3">
                      <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${cfg.color}`}>
                        <Icon className="h-3 w-3" />
                        {cfg.label}
                      </span>
                    </td>
                    <td className="py-3 text-slate-500 text-xs">
                      {new Date(invoice.created_at).toLocaleDateString("tr-TR")}
                    </td>
                  </tr>
                );
              })}
              {!invoices.length && (
                <tr>
                  <td className="py-8 text-center text-slate-500" colSpan={7}>
                    Henüz fatura oluşturulmamış. Yukarıdaki formdan ilk faturanızı oluşturun.
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
