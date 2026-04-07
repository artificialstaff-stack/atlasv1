"use client";

import { useEffect, useState, useCallback } from "react";
import { ArrowDownRight, ArrowUpRight, DollarSign, PiggyBank, Wallet } from "lucide-react";
import { motion } from "framer-motion";
import { AtlasMetricSlab, AtlasSectionPanel } from "@/components/portal/atlas-widget-kit";
import { Skeleton } from "@/components/ui/skeleton";
import { useI18n } from "@/i18n/provider";

interface FinancialSummary {
  totalIncome: number;
  totalExpense: number;
  atlasCommission: number;
  netBalance: number;
  currency: string;
  monthlyTrends: Array<{ month: string; income: number; expense: number; net: number }>;
  recentTransactions: Array<{
    type: string;
    category: string;
    amount: number;
    currency: string;
    date: string;
  }>;
}

function fmtUSD(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

export function FinancialOverview() {
  const { t } = useI18n();
  const [data, setData] = useState<FinancialSummary | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchSummary = useCallback(async () => {
    try {
      const res = await fetch("/api/portal/financial-summary");
      if (res.ok) {
        const json = await res.json();
        setData(json);
      }
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSummary();
  }, [fetchSummary]);

  if (loading) {
    return (
      <AtlasSectionPanel
        eyebrow="Finansal Özet"
        title="Yükleniyor..."
        description="Satış gelirleriniz ve bakiye bilgileriniz getiriliyor."
      >
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <Skeleton className="h-20 rounded-xl" />
          <Skeleton className="h-20 rounded-xl" />
          <Skeleton className="h-20 rounded-xl" />
        </div>
      </AtlasSectionPanel>
    );
  }

  if (!data) return null;

  const metrics = [
    {
      label: "Brüt Satış",
      value: fmtUSD(data.totalIncome),
      icon: ArrowUpRight,
      color: "text-emerald-400",
      bg: "bg-emerald-500/10",
    },
    {
      label: "Atlas Komisyon",
      value: fmtUSD(data.atlasCommission),
      icon: ArrowDownRight,
      color: "text-amber-400",
      bg: "bg-amber-500/10",
    },
    {
      label: "Çekilebilir Bakiye",
      value: fmtUSD(data.netBalance),
      icon: Wallet,
      color: "text-blue-400",
      bg: "bg-blue-500/10",
    },
  ];

  return (
    <AtlasSectionPanel
      eyebrow="💰 Finansal Özet"
      title="Satış Gelirleriniz"
      description="LLC hesabınıza gelen satışlar, Atlas komisyonu ve çekilebilir bakiyeniz."
    >
      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        {metrics.map((m, i) => (
          <motion.div
            key={m.label}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.08 }}
            className="flex items-center gap-3 rounded-xl border border-white/6 bg-white/[0.02] p-4"
          >
            <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${m.bg}`}>
              <m.icon className={`h-5 w-5 ${m.color}`} />
            </div>
            <div>
              <p className="text-[11px] text-muted-foreground">{m.label}</p>
              <p className="text-lg font-semibold text-white">{m.value}</p>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Mini bar chart - monthly trend */}
      {data.monthlyTrends.length > 0 && (
        <div className="mt-5">
          <p className="text-[11px] font-medium text-muted-foreground mb-3">Son 6 Ay Gelir/Gider</p>
          <div className="flex items-end gap-2 h-16">
            {data.monthlyTrends.map((m) => {
              const maxVal = Math.max(...data.monthlyTrends.map((x) => Math.max(x.income, x.expense)), 1);
              const incomeH = Math.max((m.income / maxVal) * 48, 2);
              const expenseH = Math.max((m.expense / maxVal) * 48, 2);
              return (
                <div key={m.month} className="flex-1 flex flex-col items-center gap-0.5">
                  <div className="flex items-end gap-0.5 w-full justify-center">
                    <div
                      className="w-2.5 rounded-sm bg-emerald-500/60 transition-all"
                      style={{ height: `${incomeH}px` }}
                      title={`Gelir: ${fmtUSD(m.income)}`}
                    />
                    <div
                      className="w-2.5 rounded-sm bg-amber-500/40 transition-all"
                      style={{ height: `${expenseH}px` }}
                      title={`Gider: ${fmtUSD(m.expense)}`}
                    />
                  </div>
                  <span className="text-[9px] text-muted-foreground/50">{m.month}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Recent transactions */}
      {data.recentTransactions.length > 0 && (
        <div className="mt-4">
          <p className="text-[11px] font-medium text-muted-foreground mb-2">Son İşlemler</p>
          <div className="space-y-1.5">
            {data.recentTransactions.map((tx, i) => (
              <div
                key={`${tx.date}-${i}`}
                className="flex items-center justify-between rounded-lg px-3 py-2 bg-white/[0.02] text-xs"
              >
                <div className="flex items-center gap-2">
                  {tx.type === "income" ? (
                    <ArrowUpRight className="h-3.5 w-3.5 text-emerald-400" />
                  ) : (
                    <ArrowDownRight className="h-3.5 w-3.5 text-amber-400" />
                  )}
                  <span className="text-muted-foreground capitalize">{tx.category.replace(/_/g, " ")}</span>
                </div>
                <span className={tx.type === "income" ? "text-emerald-400 font-medium" : "text-amber-400 font-medium"}>
                  {tx.type === "income" ? "+" : "-"}{fmtUSD(tx.amount)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </AtlasSectionPanel>
  );
}
