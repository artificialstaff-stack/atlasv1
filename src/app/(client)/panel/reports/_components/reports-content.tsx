"use client";

import {
  DollarSign,
  ShoppingCart,
  Package,
  TrendingUp,
  BarChart3,
  CheckCircle2,
  Truck,
  ArrowUpRight,
  ArrowDownRight,
} from "lucide-react";
import { BentoGrid, BentoCell } from "@/components/shared/bento-grid";
import { StatCard } from "@/components/shared/stat-card";
import { MetricChart } from "@/components/shared/metric-chart";
import { PageHeader } from "@/components/shared/page-header";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface ReportsData {
  totalRevenue: number;
  totalOrders: number;
  totalProducts: number;
  totalStockTR: number;
  totalStockUS: number;
  completedTasks: number;
  totalTasks: number;
  avgOrderValue: number;
  deliveryRate: number;
  monthlyStats: { name: string; siparis: number; gelir: number }[];
  platformStats: { name: string; value: number }[];
  statusStats: { name: string; value: number }[];
}

const staggerChildren = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.06 },
  },
};

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.4, ease: [0.4, 0, 0.2, 1] as const },
  },
};

const PLATFORM_COLORS: Record<string, string> = {
  amazon: "bg-amber-500",
  shopify: "bg-green-500",
  walmart: "bg-blue-500",
  etsy: "bg-orange-500",
  Diğer: "bg-slate-500",
};

export function ReportsContent({ data }: { data: ReportsData }) {
  const totalPlatformOrders = data.platformStats.reduce(
    (s, p) => s + p.value,
    0
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Raporlar & Analitik"
        description="Satış performansınızı, sipariş istatistiklerinizi ve stok durumunuzu analiz edin."
      />

      {/* KPI Cards */}
      <motion.div variants={staggerChildren} initial="hidden" animate="show">
        <BentoGrid cols={4}>
          {/* Revenue Hero Card */}
          <BentoCell span="2x2" hero>
            <div className="flex h-full flex-col justify-between">
              <div>
                <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  Toplam Gelir
                </p>
                <p className="mt-2 text-4xl font-bold tabular-nums tracking-tight text-primary">
                  $
                  {data.totalRevenue.toLocaleString("tr-TR", {
                    maximumFractionDigits: 0,
                  })}
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {data.totalOrders} sipariş üzerinden
                </p>
              </div>

              {/* Mini revenue trend */}
              <div className="mt-4 space-y-3">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">
                    Ort. Sipariş Değeri
                  </span>
                  <span className="font-semibold">
                    $
                    {data.avgOrderValue.toLocaleString("tr-TR", {
                      maximumFractionDigits: 0,
                    })}
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">
                    Teslimat Başarı Oranı
                  </span>
                  <span className="font-semibold text-green-500">
                    %{data.deliveryRate}
                  </span>
                </div>
                <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
                  <motion.div
                    className="h-full rounded-full bg-primary"
                    initial={{ width: 0 }}
                    animate={{ width: `${data.deliveryRate}%` }}
                    transition={{
                      duration: 1,
                      ease: [0.4, 0, 0.2, 1] as const,
                      delay: 0.3,
                    }}
                  />
                </div>
              </div>
            </div>
          </BentoCell>

          <StatCard
            title="Toplam Sipariş"
            value={data.totalOrders}
            icon={ShoppingCart}
            trend={12}
          />
          <StatCard
            title="Toplam Ürün"
            value={data.totalProducts}
            icon={Package}
            trend={5}
          />
          <StatCard
            title="TR Stok"
            value={data.totalStockTR}
            icon={TrendingUp}
          />
          <StatCard
            title="US Stok"
            value={data.totalStockUS}
            icon={Truck}
          />
        </BentoGrid>
      </motion.div>

      {/* Charts Row */}
      <BentoGrid cols={3}>
        {/* Monthly Trend Chart */}
        <BentoCell span="2">
          <MetricChart
            title="Aylık Sipariş & Gelir Trendi"
            data={data.monthlyStats}
            type="area"
            dataKeys={["siparis", "gelir"]}
            showLegend
          />
        </BentoCell>

        {/* Platform Distribution */}
        <BentoCell>
          <h3 className="mb-4 text-sm font-medium text-muted-foreground">
            Platform Dağılımı
          </h3>
          {data.platformStats.length > 0 ? (
            <div className="space-y-3">
              {data.platformStats.map((p) => {
                const pct =
                  totalPlatformOrders > 0
                    ? Math.round((p.value / totalPlatformOrders) * 100)
                    : 0;
                const colorClass =
                  PLATFORM_COLORS[p.name.toLowerCase()] ??
                  PLATFORM_COLORS["Diğer"];
                return (
                  <motion.div key={p.name} variants={fadeUp} className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-medium capitalize">{p.name}</span>
                      <span className="tabular-nums text-muted-foreground">
                        {p.value} sipariş ({pct}%)
                      </span>
                    </div>
                    <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
                      <motion.div
                        className={cn("h-full rounded-full", colorClass)}
                        initial={{ width: 0 }}
                        animate={{ width: `${pct}%` }}
                        transition={{
                          duration: 0.8,
                          ease: [0.4, 0, 0.2, 1] as const,
                        }}
                      />
                    </div>
                  </motion.div>
                );
              })}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <BarChart3 className="h-10 w-10 text-muted-foreground/40 mb-2" />
              <p className="text-xs text-muted-foreground">
                Platform verisi henüz mevcut değil.
              </p>
            </div>
          )}
        </BentoCell>
      </BentoGrid>

      {/* Bottom Row — Status Distribution + Task Progress */}
      <BentoGrid cols={2}>
        {/* Order Status Distribution */}
        <BentoCell>
          <h3 className="mb-4 text-sm font-medium text-muted-foreground">
            Sipariş Durum Dağılımı
          </h3>
          {data.statusStats.length > 0 ? (
            <div className="space-y-2.5">
              {data.statusStats.map((s) => {
                const pct =
                  data.totalOrders > 0
                    ? Math.round((s.value / data.totalOrders) * 100)
                    : 0;
                return (
                  <motion.div
                    key={s.name}
                    variants={fadeUp}
                    className="flex items-center justify-between rounded-lg border border-border/50 px-3 py-2"
                  >
                    <div className="flex items-center gap-2">
                      <div className="h-2.5 w-2.5 rounded-full bg-primary/60" />
                      <span className="text-sm font-medium">{s.name}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-xs tabular-nums text-muted-foreground">
                        {s.value}
                      </span>
                      <span className="text-xs font-medium tabular-nums w-10 text-right">
                        %{pct}
                      </span>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <CheckCircle2 className="h-10 w-10 text-muted-foreground/40 mb-2" />
              <p className="text-xs text-muted-foreground">
                Henüz sipariş verisi yok.
              </p>
            </div>
          )}
        </BentoCell>

        {/* Task Completion + Insights */}
        <BentoCell>
          <h3 className="mb-4 text-sm font-medium text-muted-foreground">
            Performans Özeti
          </h3>
          <div className="space-y-4">
            {/* Task Progress */}
            <div className="rounded-lg bg-muted/40 p-4 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">Görev İlerlemesi</span>
                <span className="font-semibold">
                  {data.completedTasks}/{data.totalTasks}
                </span>
              </div>
              <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
                <motion.div
                  className="h-full rounded-full bg-green-500"
                  initial={{ width: 0 }}
                  animate={{
                    width: `${
                      data.totalTasks > 0
                        ? Math.round(
                            (data.completedTasks / data.totalTasks) * 100
                          )
                        : 0
                    }%`,
                  }}
                  transition={{
                    duration: 1,
                    ease: [0.4, 0, 0.2, 1] as const,
                    delay: 0.5,
                  }}
                />
              </div>
            </div>

            {/* Quick Insights */}
            <div className="space-y-2">
              <InsightRow
                label="Toplam Stok (TR + US)"
                value={`${(data.totalStockTR + data.totalStockUS).toLocaleString("tr-TR")} adet`}
                trend="up"
              />
              <InsightRow
                label="Sipariş Başına Ort. Gelir"
                value={`$${data.avgOrderValue.toLocaleString("tr-TR", { maximumFractionDigits: 0 })}`}
                trend={data.avgOrderValue > 50 ? "up" : "neutral"}
              />
              <InsightRow
                label="Teslimat Oranı"
                value={`%${data.deliveryRate}`}
                trend={data.deliveryRate >= 80 ? "up" : "down"}
              />
              <InsightRow
                label="Stok Çeşitliliği"
                value={`${data.totalProducts} ürün`}
                trend="up"
              />
            </div>
          </div>
        </BentoCell>
      </BentoGrid>
    </div>
  );
}

function InsightRow({
  label,
  value,
  trend,
}: {
  label: string;
  value: string;
  trend: "up" | "down" | "neutral";
}) {
  return (
    <div className="flex items-center justify-between rounded-lg border border-border/50 px-3 py-2">
      <span className="text-xs text-muted-foreground">{label}</span>
      <div className="flex items-center gap-1.5">
        <span className="text-xs font-medium tabular-nums">{value}</span>
        {trend === "up" && (
          <ArrowUpRight className="h-3 w-3 text-green-500" />
        )}
        {trend === "down" && (
          <ArrowDownRight className="h-3 w-3 text-destructive" />
        )}
      </div>
    </div>
  );
}
