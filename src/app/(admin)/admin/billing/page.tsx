import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import {
  PLAN_TIERS,
  getBillingCatalogSections,
  getPlanTierAmount,
  type PlanTier,
  type Invoice,
} from "@/lib/payments";
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
import { PendingInvoiceActions } from "./_components/pending-invoice-actions";
import { PageHeader } from "@/components/shared/page-header";
import {
  AtlasInsightCard,
  AtlasStackGrid,
  AtlasTableShell,
} from "@/components/portal/atlas-widget-kit";

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

  // Tüm faturalar (WITHOUT user embed — avoids FK ambiguity)
  const { data: rawInvoices, count } = await (supabase as any)
    .from("invoices")
    .select("*", { count: "exact" })
    .order("created_at", { ascending: false })
    .limit(100);

  // Fetch users separately
  const invoiceUserIds = [...new Set((rawInvoices ?? []).map((i: any) => i.user_id).filter(Boolean))];
  let invoiceUserMap: Record<string, { email: string; first_name: string; last_name: string; company_name: string }> = {};

  if (invoiceUserIds.length > 0) {
    const { data: usersData } = await (supabase as any)
      .from("users")
      .select("id, email, first_name, last_name, company_name")
      .in("id", invoiceUserIds);

    if (usersData) {
      invoiceUserMap = Object.fromEntries(
        (usersData as any[]).map((u: any) => [u.id, u])
      );
    }
  }

  // Merge user data
  const invoices: InvoiceWithUser[] = (rawInvoices ?? []).map((inv: any) => ({
    ...inv,
    users: invoiceUserMap[inv.user_id] ?? undefined,
  }));

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
  const billingCatalog = getBillingCatalogSections();

  return (
    <div className="space-y-8">
      <PageHeader
        title="Fatura Yönetimi"
        description="Musteri faturalarini olusturun, odeme onaylarini yonetin ve gelir akislarini operator perspektifinden izleyin."
      />

      <AtlasStackGrid columns="four">
        <AtlasInsightCard
          eyebrow="Revenue Pulse"
          title={`$${totalRevenue.toLocaleString("en-US", { minimumFractionDigits: 2 })}`}
          description="Onaylanmis faturalar uzerinden hesaplanan toplam gelir."
          badge="Toplam gelir"
          tone="success"
        />
        <AtlasInsightCard
          eyebrow="Approval Queue"
          title={`${pendingPayments} fatura`}
          description={`Onay bekleyen odeme tutari $${pendingAmount.toFixed(2)} seviyesinde.`}
          badge="Paid / awaiting approval"
          tone="warning"
        />
        <AtlasInsightCard
          eyebrow="Billing Risk"
          title={`${overdueCount}`}
          description="Vadesi gecmis ve takip gerektiren fatura kayitlari."
          badge="Overdue"
          tone="danger"
        />
        <AtlasInsightCard
          eyebrow="Invoice Volume"
          title={`${count ?? 0}`}
          description="Sistemde tutulan toplam fatura ve billing kaydi."
          badge="Toplam fatura"
          tone="cobalt"
        />
      </AtlasStackGrid>

      {/* Catalog Overview */}
      <div className="portal-surface-secondary rounded-[1.6rem] p-5">
        <div>
          <h2 className="text-lg font-semibold text-white">Fiyat Kataloğu</h2>
          <p className="text-sm text-slate-400">
            Tüm create path&apos;ler bu katalogdan beslenir. Custom fiyat yalnızca Kurumsal pakette ayrı tutulur.
          </p>
        </div>
        <div className="grid gap-4 xl:grid-cols-2">
          {billingCatalog.map((section) => (
            <div key={section.key} className="rounded-2xl border border-slate-700/50 bg-slate-800/40 p-5">
              <p className="text-xs uppercase tracking-[0.2em] text-slate-500">{section.title}</p>
              <p className="mt-2 text-sm text-slate-400">{section.description}</p>
              <div className="mt-4 space-y-3">
                {section.packages.map((pkg) => (
                  <div key={pkg.name} className="rounded-xl border border-white/8 bg-background/30 p-4">
                    <div className="flex items-start justify-between gap-4">
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
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Create Invoice Form */}
      <div className="portal-surface-secondary rounded-[1.6rem] p-6">
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
            const customAmount = parseFloat(formData.get("customAmount") as string);
            const dueDate = formData.get("dueDate") as string;
            const notes = formData.get("notes") as string;
            const amount = planTier === "global_scale"
              ? customAmount
              : getPlanTierAmount(planTier);

            if (userId && planTier && amount > 0 && dueDate) {
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
                  {plan.name} {plan.price > 0 ? `($${plan.price.toFixed(2)})` : "(Özel)"}
                </option>
              ))}
            </select>
            <p className="mt-1 text-[11px] text-slate-500">
              Plan seçimi fiyatı belirler. Sadece Kurumsal pakette custom tutar girilir.
            </p>
          </div>
          <div>
            <label className="block text-xs text-slate-400 mb-1.5">Custom Tutar ($)</label>
            <input
              type="number"
              name="customAmount"
              min="0"
              step="0.01"
              placeholder="Yalnızca Kurumsal için"
              className="w-full rounded-lg border border-slate-700 bg-slate-900/50 px-3 py-2 text-sm text-white focus:border-indigo-500 focus:outline-none"
            />
            <p className="mt-1 text-[11px] text-slate-500">
              Normal planlarda tutar katalogdan otomatik gelir.
            </p>
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
        <div className="portal-surface-locked rounded-[1.6rem] p-6">
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
                    <PendingInvoiceActions invoiceId={invoice.id} />
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* All Invoices Table */}
      <AtlasTableShell
        eyebrow="Billing Ledger"
        title={`Tum Faturalar (${count ?? 0})`}
        description="Tum plan tier, tutar ve durum bilgileri tek operator ledger tablosunda toplanir."
        badge={`${count ?? 0} kayit`}
      >
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
      </AtlasTableShell>
    </div>
  );
}
