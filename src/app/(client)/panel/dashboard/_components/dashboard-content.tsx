"use client";

import {
  Package,
  ShoppingCart,
  ListChecks,
  TrendingUp,
} from "lucide-react";
import { BentoGrid, BentoCell } from "@/components/shared/bento-grid";
import { StatCard } from "@/components/shared/stat-card";
import { MetricChart } from "@/components/shared/metric-chart";
import { PageHeader } from "@/components/shared/page-header";
import { StatusTransition } from "@/components/shared/status-transition";
import { Badge } from "@/components/ui/badge";
import { motion } from "framer-motion";

interface DashboardData {
  totalProducts: number;
  totalStockTR: number;
  totalStockUS: number;
  activeOrders: number;
  totalOrders: number;
  completionPct: number;
  completedTasks: number;
  totalTasks: number;
  recentOrders: { id: string; status: string; platform_order_id?: string | null }[];
}

// Simulated monthly chart data
const monthlyData = [
  { name: "Oca", siparis: 12, stok: 340 },
  { name: "Şub", siparis: 18, stok: 320 },
  { name: "Mar", siparis: 24, stok: 290 },
  { name: "Nis", siparis: 22, stok: 310 },
  { name: "May", siparis: 30, stok: 280 },
  { name: "Haz", siparis: 35, stok: 260 },
];

const staggerChildren = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.08 },
  },
};

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.4, 0, 0.2, 1] as const } },
};

export function DashboardContent({ data }: { data: DashboardData }) {
  const mapStatus = (s: string) => {
    if (s === "delivered") return "approved" as const;
    if (["processing", "packing", "shipped"].includes(s)) return "in_progress" as const;
    if (s === "cancelled" || s === "returned") return "rejected" as const;
    return "pending" as const;
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Dashboard"
        description="ATLAS platformunuza genel bakış."
      />

      {/* KPI Bento Grid */}
      <motion.div variants={staggerChildren} initial="hidden" animate="show">
        <BentoGrid cols={4}>
          {/* Hero Card — 2×2 */}
          <BentoCell span="2x2" hero>
            <div className="flex h-full flex-col justify-between">
              <div>
                <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  Süreç İlerlemesi
                </p>
                <p className="mt-2 text-5xl font-bold tabular-nums tracking-tight text-primary">
                  %{data.completionPct}
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {data.completedTasks}/{data.totalTasks} görev tamamlandı
                </p>
              </div>
              {/* Progress bar */}
              <div className="mt-4">
                <div className="h-2.5 w-full rounded-full bg-muted overflow-hidden">
                  <motion.div
                    className="h-full rounded-full bg-primary"
                    initial={{ width: 0 }}
                    animate={{ width: `${data.completionPct}%` }}
                    transition={{ duration: 1, ease: [0.4, 0, 0.2, 1] as const, delay: 0.3 }}
                  />
                </div>
              </div>
            </div>
          </BentoCell>

          <StatCard
            title="Toplam Ürün"
            value={data.totalProducts}
            icon={Package}
            trend={8}
          />
          <StatCard
            title="Aktif Sipariş"
            value={data.activeOrders}
            icon={ShoppingCart}
            trend={-3}
          />
          <StatCard
            title="TR Stok"
            value={data.totalStockTR}
            icon={TrendingUp}
          />
          <StatCard
            title="US Stok"
            value={data.totalStockUS}
            icon={TrendingUp}
          />
        </BentoGrid>
      </motion.div>

      {/* Chart + Recent Orders — Bento 2-col */}
      <BentoGrid cols={3}>
        <BentoCell span="2">
          <MetricChart
            title="Aylık Sipariş & Stok Trendi"
            data={monthlyData}
            type="area"
            dataKeys={["siparis", "stok"]}
            showLegend
          />
        </BentoCell>

        <BentoCell>
          <h3 className="mb-3 text-sm font-medium text-muted-foreground">
            Son Siparişler
          </h3>
          {data.recentOrders.length > 0 ? (
            <div className="space-y-2.5">
              {data.recentOrders.slice(0, 6).map((order) => (
                <motion.div
                  key={order.id}
                  variants={fadeUp}
                  className="flex items-center justify-between rounded-lg border border-border/50 px-3 py-2"
                >
                  <span className="text-xs font-mono text-muted-foreground">
                    {order.platform_order_id ?? order.id.slice(0, 8)}
                  </span>
                  <StatusTransition status={mapStatus(order.status)} size="sm" />
                </motion.div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-8">
              Henüz sipariş yok.
            </p>
          )}
        </BentoCell>
      </BentoGrid>
    </div>
  );
}
