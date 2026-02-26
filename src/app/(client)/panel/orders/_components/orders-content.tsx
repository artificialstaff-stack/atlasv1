"use client";

import { ColumnDef } from "@tanstack/react-table";
import { ShoppingCart } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { BentoGrid, BentoCell } from "@/components/shared/bento-grid";
import { StatCard } from "@/components/shared/stat-card";
import { PageHeader } from "@/components/shared/page-header";
import { DataTable } from "@/components/shared/data-table";
import { StatusTransition } from "@/components/shared/status-transition";
import { formatDate } from "@/lib/utils";
import {
  ORDER_STATUS_LABELS,
  PLATFORM_LABELS,
  type OrderStatus,
  type Platform,
} from "@/types/enums";

interface Order {
  id: string;
  status: string;
  platform?: string | null;
  platform_order_id?: string | null;
  tracking_ref?: string | null;
  created_at: string;
}

const mapStatus = (s: string) => {
  if (s === "delivered") return "approved" as const;
  if (["processing", "packing", "shipped"].includes(s)) return "in_progress" as const;
  if (s === "cancelled" || s === "returned") return "rejected" as const;
  return "pending" as const;
};

const columns: ColumnDef<Order, unknown>[] = [
  {
    accessorKey: "platform_order_id",
    header: "Sipariş No",
    cell: ({ row }) => (
      <span className="font-mono text-xs">
        {row.original.platform_order_id ?? row.original.id.slice(0, 8)}
      </span>
    ),
  },
  {
    accessorKey: "platform",
    header: "Platform",
    cell: ({ row }) => {
      const p = row.getValue("platform") as string | null;
      return (
        <Badge variant="outline" className="text-xs">
          {p ? (PLATFORM_LABELS[p as Platform] ?? p) : "-"}
        </Badge>
      );
    },
  },
  {
    accessorKey: "status",
    header: "Durum",
    cell: ({ row }) => {
      const s = row.getValue("status") as string;
      return (
        <StatusTransition
          status={mapStatus(s)}
          label={ORDER_STATUS_LABELS[s as OrderStatus] ?? s}
          size="sm"
        />
      );
    },
  },
  {
    accessorKey: "tracking_ref",
    header: "Takip No",
    cell: ({ row }) => (
      <span className="text-xs">{row.getValue("tracking_ref") ?? "-"}</span>
    ),
  },
  {
    accessorKey: "created_at",
    header: "Tarih",
    cell: ({ row }) => (
      <span className="text-xs tabular-nums">
        {formatDate(row.getValue("created_at"))}
      </span>
    ),
  },
];

export function OrdersContent({ orders }: { orders: Order[] }) {
  const active = orders.filter(
    (o) => !["delivered", "cancelled", "returned"].includes(o.status)
  ).length;
  const delivered = orders.filter((o) => o.status === "delivered").length;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Siparişlerim"
        description="Sipariş durumlarınızı ve kargo takip bilgilerinizi görüntüleyin."
      />

      {/* KPI Strip */}
      <BentoGrid cols={3}>
        <StatCard title="Toplam Sipariş" value={orders.length} icon={ShoppingCart} />
        <StatCard title="Aktif" value={active} format="number" />
        <StatCard title="Teslim Edildi" value={delivered} format="number" />
      </BentoGrid>

      {/* Orders Table */}
      <BentoCell className="w-full">
        {orders.length > 0 ? (
          <DataTable
            columns={columns}
            data={orders}
            searchKey="platform_order_id"
            searchPlaceholder="Sipariş no ara..."
          />
        ) : (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <ShoppingCart className="h-12 w-12 text-muted-foreground/50 mb-3" />
            <p className="text-sm font-medium">Henüz sipariş yok</p>
            <p className="text-xs text-muted-foreground mt-1">
              Siparişleriniz oluşturulduğunda burada görünecektir.
            </p>
          </div>
        )}
      </BentoCell>
    </div>
  );
}
