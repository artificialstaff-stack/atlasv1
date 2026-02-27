import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { STRIPE_PRICES, type PlanTier } from "@/lib/payments/stripe";

export const metadata: Metadata = {
  title: "Faturalandırma",
  description: "Abonelik ve fatura yönetimi",
};

const plans: {
  tier: PlanTier;
  name: string;
  price: string;
  features: string[];
  popular?: boolean;
}[] = [
  {
    tier: "starter",
    name: "Başlangıç",
    price: "$49/ay",
    features: [
      "100 sipariş/ay",
      "5 ürün",
      "Temel envanter yönetimi",
      "E-posta destek",
    ],
  },
  {
    tier: "professional",
    name: "Profesyonel",
    price: "$149/ay",
    popular: true,
    features: [
      "1.000 sipariş/ay",
      "50 ürün",
      "Gelişmiş envanter + analytics",
      "AI asistan",
      "Öncelikli destek",
      "API erişimi",
    ],
  },
  {
    tier: "enterprise",
    name: "Kurumsal",
    price: "$499/ay",
    features: [
      "Sınırsız sipariş",
      "Sınırsız ürün",
      "Tüm özellikler",
      "Dedicated account manager",
      "SLA garantisi",
      "Özel entegrasyonlar",
    ],
  },
];

export default async function BillingPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  // Mevcut subscription bilgisi
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: subscription } = await (supabase as any)
    .from("user_subscriptions")
    .select("*")
    .eq("user_id", user.id)
    .eq("payment_status", "paid")
    .order("started_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const sub = subscription as { plan_tier: string; valid_until: string; started_at: string; amount: number } | null;
  const currentPlan = sub?.plan_tier ?? "starter";

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-white">Faturalandırma</h1>
        <p className="mt-2 text-slate-400">
          Abonelik planınızı ve fatura geçmişinizi yönetin.
        </p>
      </div>

      {/* Current Plan */}
      <div className="rounded-2xl border border-slate-700/50 bg-slate-800/40 p-6">
        <h2 className="text-lg font-semibold text-white">Mevcut Plan</h2>
        <div className="mt-4 flex items-center gap-4">
          <span className="inline-flex items-center rounded-full bg-indigo-500/20 px-4 py-1.5 text-sm font-medium text-indigo-300">
            {plans.find((p) => p.tier === currentPlan)?.name ?? "Başlangıç"}
          </span>
          {sub && (
            <span className="text-sm text-slate-400">
              Geçerlilik: {new Date(sub.valid_until).toLocaleDateString("tr-TR")}
            </span>
          )}
        </div>
      </div>

      {/* Plans Grid */}
      <div className="grid gap-6 md:grid-cols-3">
        {plans.map((plan) => {
          const isCurrent = plan.tier === currentPlan;
          return (
            <div
              key={plan.tier}
              className={`relative rounded-2xl border p-6 transition-all ${
                plan.popular
                  ? "border-indigo-500/50 bg-slate-800/60 shadow-lg shadow-indigo-500/10"
                  : "border-slate-700/50 bg-slate-800/40"
              } ${isCurrent ? "ring-2 ring-indigo-500/30" : ""}`}
            >
              {plan.popular && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-indigo-500 px-3 py-0.5 text-xs font-medium text-white">
                  Popüler
                </span>
              )}

              <h3 className="text-xl font-bold text-white">{plan.name}</h3>
              <p className="mt-2 text-3xl font-bold text-indigo-400">
                {plan.price}
              </p>

              <ul className="mt-6 space-y-3">
                {plan.features.map((feature) => (
                  <li
                    key={feature}
                    className="flex items-start gap-2 text-sm text-slate-300"
                  >
                    <svg
                      className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400"
                      fill="none"
                      viewBox="0 0 24 24"
                      strokeWidth={2}
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="m4.5 12.75 6 6 9-13.5"
                      />
                    </svg>
                    {feature}
                  </li>
                ))}
              </ul>

              <form
                action={async () => {
                  "use server";
                  const { createCheckoutSession } = await import(
                    "@/lib/payments/stripe"
                  );
                  const result = await createCheckoutSession({
                    userId: user!.id,
                    email: user!.email!,
                    priceId: STRIPE_PRICES[plan.tier],
                    mode: "subscription",
                  });
                  if (result.url) {
                    const { redirect: redir } = await import("next/navigation");
                    redir(result.url);
                  }
                }}
              >
                <button
                  type="submit"
                  disabled={isCurrent}
                  className={`mt-6 w-full rounded-xl px-4 py-3 text-sm font-semibold transition-all ${
                    isCurrent
                      ? "cursor-default bg-slate-700/50 text-slate-400"
                      : plan.popular
                        ? "bg-indigo-600 text-white shadow-lg hover:bg-indigo-500"
                        : "bg-slate-700 text-white hover:bg-slate-600"
                  }`}
                >
                  {isCurrent ? "Mevcut Plan" : "Planı Seç"}
                </button>
              </form>
            </div>
          );
        })}
      </div>

      {/* Invoice History */}
      <div className="rounded-2xl border border-slate-700/50 bg-slate-800/40 p-6">
        <h2 className="mb-4 text-lg font-semibold text-white">
          Fatura Geçmişi
        </h2>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-slate-700 text-slate-400">
              <tr>
                <th className="py-3 font-medium">Tarih</th>
                <th className="py-3 font-medium">Plan</th>
                <th className="py-3 font-medium">Tutar</th>
                <th className="py-3 font-medium">Durum</th>
              </tr>
            </thead>
            <tbody>
              {sub ? (
                <tr className="border-b border-slate-700/50">
                  <td className="py-3 text-white">
                    {new Date(sub.started_at).toLocaleDateString("tr-TR")}
                  </td>
                  <td className="py-3 text-slate-300">
                    {plans.find((p) => p.tier === sub.plan_tier)?.name ?? sub.plan_tier}
                  </td>
                  <td className="py-3 text-white">
                    ${sub.amount?.toFixed(2) ?? "0.00"}
                  </td>
                  <td className="py-3">
                    <span className="inline-flex rounded-full bg-emerald-500/20 px-2.5 py-0.5 text-xs font-medium text-emerald-400">
                      Ödendi
                    </span>
                  </td>
                </tr>
              ) : (
                <tr>
                  <td className="py-6 text-center text-slate-500" colSpan={4}>
                    Henüz fatura bulunmuyor
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
