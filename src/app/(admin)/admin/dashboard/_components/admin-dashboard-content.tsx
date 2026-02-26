"use client";

import {
  Users,
  ShoppingCart,
  UserPlus,
  AlertTriangle,
  TrendingUp,
  Package,
} from "lucide-react";
import { motion } from "framer-motion";
import {
  ORDER_STATUS_LABELS,
  type OrderStatus,
} from "@/types/enums";
import { formatRelativeTime, formatCurrency, getStatusVariant } from "@/lib/utils";
import { BentoGrid, BentoCell } from "@/components/shared/bento-grid";
import { StatCard } from "@/components/shared/stat-card";
import { PageHeader } from "@/components/shared/page-header";
import { StatusTransition } from "@/components/shared/status-transition";
import { Badge } from "@/components/ui/badge";

interface AdminDashboardData {
  customerCount: number;
  activeOrderCount: number;
  leadCount: number;
  lowStockProducts: { id: string; name: string; sku: string; stock_us: number }[];
  recentOrders: {
    id: string;
    platform: string | null;
    status: string;
    total_amount: number | null;
    created_at: string;
  }[];
  recentLeads: {
    id: string;
    name: string;
    email: string;
    company_name: string | null;
    status: string;
    created_at: string;
  }[];
}

const mapOrderStatus = (s: string) => {
  if (s === "delivered") return "approved" as const;
  if (["processing", "packing", "shipped"].includes(s)) return "in_progress" as const;
  if (s === "cancelled" || s === "returned") return "rejected" as const;
  return "pending" as const;
};

const stagger = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.06 } },
};

const fadeItem = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { duration: 0.3 } },
};

export function AdminDashboardContent({ data }: { data: AdminDashboardData }) {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Admin Dashboard"
        description="Operasyonel genel bakış ve hızlı erişim."
      />

      {/* KPI Bento Grid */}
      <BentoGrid cols={4}>
        <StatCard
          title="Toplam Müşteri"
          value={data.customerCount}
          icon={Users}
          trend={12}
        />
        <StatCard
          title="Aktif Sipariş"
          value={data.activeOrderCount}
          icon={ShoppingCart}
          trend={5}
        />
        <StatCard
          title="Bekleyen Lead"
          value={data.leadCount}
          icon={UserPlus}
        />
        <StatCard
          title="Düşük Stok Uyarısı"
          value={data.lowStockProducts.length}
          icon={AlertTriangle}
        />
      </BentoGrid>

      {/* Content Grid: Orders + Leads side-by-side */}
      <BentoGrid cols={2}>
        {/* Son Siparişler */}
        <BentoCell>
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="h-4 w-4 text-primary" />
            <h3 className="text-sm font-medium">Son Siparişler</h3>
          </div>
          {data.recentOrders.length > 0 ? (
            <motion.div
              variants={stagger}
              initial="hidden"
              animate="show"
              className="space-y-2.5"
            >
              {data.recentOrders.slice(0, 6).map((order) => (
                <motion.div
                  key={order.id}
                  variants={fadeItem}
                  className="flex items-center justify-between rounded-lg border border-border/50 px-3 py-2.5"
                >
                  <div>
                    <p className="text-sm font-medium">
                      {order.platform ?? "—"} sipariş
                    </p>
                    <p className="text-[10px] text-muted-foreground">
                      {formatRelativeTime(order.created_at)}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {order.total_amount && (
                      <span className="text-xs font-medium tabular-nums">
                        {formatCurrency(order.total_amount)}
                      </span>
                    )}
                    <StatusTransition
                      status={mapOrderStatus(order.status)}
                      label={ORDER_STATUS_LABELS[order.status as OrderStatus] ?? order.status}
                      size="sm"
                    />
                  </div>
                </motion.div>
              ))}
            </motion.div>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-8">
              Henüz sipariş yok.
            </p>
          )}
        </BentoCell>

        {/* Son Başvurular */}
        <BentoCell>
          <div className="flex items-center gap-2 mb-4">
            <UserPlus className="h-4 w-4 text-primary" />
            <h3 className="text-sm font-medium">Son Başvurular</h3>
          </div>
          {data.recentLeads.length > 0 ? (
            <motion.div
              variants={stagger}
              initial="hidden"
              animate="show"
              className="space-y-2.5"
            >
              {data.recentLeads.map((lead) => (
                <motion.div
                  key={lead.id}
                  variants={fadeItem}
                  className="flex items-center justify-between rounded-lg border border-border/50 px-3 py-2.5"
                >
                  <div>
                    <p className="text-sm font-medium">{lead.name}</p>
                    <p className="text-[10px] text-muted-foreground">
                      {lead.company_name ?? lead.email}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={getStatusVariant(lead.status)} className="text-[10px]">
                      {lead.status}
                    </Badge>
                    <span className="text-[10px] text-muted-foreground tabular-nums">
                      {formatRelativeTime(lead.created_at)}
                    </span>
                  </div>
                </motion.div>
              ))}
            </motion.div>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-8">
              Henüz başvuru yok.
            </p>
          )}
        </BentoCell>
      </BentoGrid>

      {/* Düşük Stok Uyarıları — Full width */}
      {data.lowStockProducts.length > 0 && (
        <BentoCell className="w-full">
          <div className="flex items-center gap-2 mb-4">
            <Package className="h-4 w-4 text-destructive" />
            <h3 className="text-sm font-medium">Düşük Stok Uyarıları (US Depo)</h3>
          </div>
          <motion.div
            variants={stagger}
            initial="hidden"
            animate="show"
            className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3"
          >
            {data.lowStockProducts.map((product) => (
              <motion.div
                key={product.id}
                variants={fadeItem}
                className="flex items-center justify-between rounded-lg border border-destructive/20 bg-destructive/5 px-3 py-2.5"
              >
                <div>
                  <p className="text-sm font-medium">{product.name}</p>
                  <p className="text-[10px] text-muted-foreground font-mono">
                    {product.sku}
                  </p>
                </div>
                <Badge variant="destructive" className="tabular-nums">
                  {product.stock_us} adet
                </Badge>
              </motion.div>
            ))}
          </motion.div>
        </BentoCell>
      )}
    </div>
  );
}
