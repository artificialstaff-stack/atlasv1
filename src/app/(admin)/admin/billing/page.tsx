import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export const metadata: Metadata = {
  title: "Admin Faturalandırma",
  description: "Tüm üyelikleri ve gelirleri yönetin",
};

export default async function AdminBillingPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  // Tüm subscriptions
  const { data: subscriptions, count } = await supabase
    .from("user_subscriptions")
    .select("*", { count: "exact" })
    .order("started_at", { ascending: false })
    .limit(50);

  const subs = (subscriptions ?? []) as Array<{
    id: string;
    user_id: string;
    plan_tier: string;
    payment_status: string;
    amount: number;
    started_at: string;
    valid_until: string;
    notes: string | null;
  }>;

  // Toplam gelir
  const totalRevenue = subs.reduce(
    (sum, s) => sum + (s.amount ?? 0),
    0
  );

  // Plan dağılımı
  const planCounts: Record<string, number> = {};
  for (const s of subs) {
    planCounts[s.plan_tier] = (planCounts[s.plan_tier] ?? 0) + 1;
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-white">Faturalandırma Yönetimi</h1>
        <p className="mt-2 text-slate-400">
          Tüm müşteri abonelikleri ve gelir özeti.
        </p>
      </div>

      {/* Metrics */}
      <div className="grid gap-4 md:grid-cols-4">
        {[
          { label: "Toplam Abonelik", value: count ?? 0 },
          {
            label: "Toplam Gelir",
            value: `$${totalRevenue.toFixed(2)}`,
          },
          ...Object.entries(planCounts).map(([plan, c]) => ({
            label: plan.charAt(0).toUpperCase() + plan.slice(1),
            value: c,
          })),
        ]
          .slice(0, 4)
          .map((metric) => (
            <div
              key={metric.label}
              className="rounded-xl border border-slate-700/50 bg-slate-800/40 p-4"
            >
              <p className="text-sm text-slate-400">{metric.label}</p>
              <p className="mt-1 text-2xl font-bold text-white">{metric.value}</p>
            </div>
          ))}
      </div>

      {/* Subscriptions Table */}
      <div className="rounded-2xl border border-slate-700/50 bg-slate-800/40 p-6">
        <h2 className="mb-4 text-lg font-semibold text-white">Abonelikler</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-slate-700 text-slate-400">
              <tr>
                <th className="py-3 font-medium">Müşteri</th>
                <th className="py-3 font-medium">Şirket</th>
                <th className="py-3 font-medium">Plan</th>
                <th className="py-3 font-medium">Tutar</th>
                <th className="py-3 font-medium">Durum</th>
                <th className="py-3 font-medium">Bitiş</th>
              </tr>
            </thead>
            <tbody>
              {subs.map((sub) => {
                return (
                  <tr key={sub.id} className="border-b border-slate-700/50">
                    <td className="py-3 text-white">
                      {sub.user_id.slice(0, 8)}...
                    </td>
                    <td className="py-3 text-slate-300">
                      —
                    </td>
                    <td className="py-3 text-slate-300">
                      <span className="inline-flex rounded-full bg-indigo-500/20 px-2.5 py-0.5 text-xs font-medium text-indigo-300">
                        {sub.plan_tier}
                      </span>
                    </td>
                    <td className="py-3 text-white">
                      ${sub.amount?.toFixed(2) ?? "0.00"}
                    </td>
                    <td className="py-3">
                      <span
                        className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${
                          sub.payment_status === "paid"
                            ? "bg-emerald-500/20 text-emerald-400"
                            : "bg-amber-500/20 text-amber-400"
                        }`}
                      >
                        {sub.payment_status}
                      </span>
                    </td>
                    <td className="py-3 text-slate-400">
                      {new Date(sub.valid_until).toLocaleDateString("tr-TR")}
                    </td>
                  </tr>
                );
              })}
              {!subs.length && (
                <tr>
                  <td className="py-6 text-center text-slate-500" colSpan={6}>
                    Henüz abonelik bulunmuyor
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
