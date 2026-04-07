"use client";

import { useRouter } from "next/navigation";
import { ColumnDef } from "@tanstack/react-table";
import { ShoppingCart, ChevronRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { StatCard } from "@/components/shared/stat-card";
import { DataTable } from "@/components/shared/data-table";
import { StatusTransition } from "@/components/shared/status-transition";
import { PortalPageHero } from "@/components/portal/portal-page-hero";
import { useClientGuidance } from "../../_components/client-guidance-provider";
import { formatDate } from "@/lib/utils";
import {
  ORDER_STATUS_LABELS,
  PLATFORM_LABELS,
  type OrderStatus,
  type Platform,
} from "@/types/enums";
import { useMemo } from "react";
import {
  AtlasSectionPanel,
  AtlasStackGrid,
  AtlasTableShell,
} from "@/components/portal/atlas-widget-kit";

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
  {
    id: "actions",
    header: "",
    cell: () => (
      <ChevronRight className="h-4 w-4 text-muted-foreground/50" />
    ),
  },
];

export function OrdersContent({ orders }: { orders: Order[] }) {
  const router = useRouter();
  const active = orders.filter(
    (o) => !["delivered", "cancelled", "returned"].includes(o.status)
  ).length;
  const delivered = orders.filter((o) => o.status === "delivered").length;
  const lastOrderAt = orders[0]?.created_at ? formatDate(orders[0].created_at) : "Yok";

  useClientGuidance(
    useMemo(
      () => ({
        focusLabel: active > 0 ? "Aktif sevkiyatlar izleniyor" : "Siparis akisiniz sade ozet modunda",
        summary:
          active > 0
            ? "Siparis ve teslim akisinin musteriye acik ozetini burada izleyebilir, detay sorulari destek akisi ile yonetebilirsiniz."
            : "Atlas operator ekibi siparis operasyonunu yurutur; yeni siparisler olustukca bu ekran otomatik guncellenir.",
        metrics: [
          { label: "Toplam", value: `${orders.length}` },
          { label: "Aktif", value: `${active}` },
          { label: "Son siparis", value: lastOrderAt },
        ],
      }),
      [active, lastOrderAt, orders.length],
    ),
  );

  return (
    <div className="space-y-6">
      <PortalPageHero
        eyebrow="Operasyon Ozeti"
        title="Siparislerim"
        description="Hazirlama, sevkiyat ve teslim akisinin musteriye acik sade gorunumu."
        surfaceVariant="secondary"
        metrics={[
          { label: "Toplam siparis", value: `${orders.length}` },
          { label: "Aktif", value: `${active}` },
          { label: "Teslim", value: `${delivered}` },
        ]}
        primaryAction={{
          id: "orders:process",
          label: "Surec Takibi",
          href: "/panel/process",
          description: "Siparislerin launch akisindaki yerini gor.",
          kind: "open_process",
        }}
        secondaryAction={{
          id: "orders:support",
          label: "Destek Merkezi",
          href: "/panel/support",
          description: "Teslim veya siparis sorusu icin destek al.",
          kind: "open_support",
          emphasis: "secondary",
        }}
      >
        <div className="rounded-2xl border border-white/8 bg-background/35 px-4 py-3 text-sm leading-6 text-slate-200/90">
          Self-serve fulfillment yerine Atlas tarafinda yuruyen siparis operasyonunun durum ozeti burada tutulur.
        </div>
      </PortalPageHero>

      {/* KPI Strip */}
      <AtlasStackGrid columns="three">
        <StatCard title="Toplam Sipariş" value={orders.length} icon={ShoppingCart} />
        <StatCard title="Aktif" value={active} format="number" />
        <StatCard title="Teslim Edildi" value={delivered} format="number" />
      </AtlasStackGrid>

      <AtlasTableShell
        eyebrow="Orders Workbench"
        title="Sipariş tablosu"
        description="Platform, durum ve takip numarası seviyesinde müşteri görünür sipariş akışı burada tutulur."
        badge={`${orders.length} sipariş`}
      >
        {orders.length > 0 ? (
          <DataTable
            columns={columns}
            data={orders}
            searchKey="platform_order_id"
            searchPlaceholder="Sipariş no ara..."
            onRowClick={(order) => router.push(`/panel/orders/${order.id}`)}
          />
        ) : (
          <AtlasSectionPanel
            eyebrow="Empty Orders"
            title="Henüz sipariş yok"
            description="Siparişleriniz oluştuğunda bu tablo otomatik dolacaktır."
          >
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <ShoppingCart className="mb-3 h-12 w-12 text-muted-foreground/50" />
              <p className="text-sm font-medium text-white">Operasyon henüz sipariş üretmedi</p>
              <p className="mt-1 text-xs text-muted-foreground">İlk live kanal açıldığında sipariş akışı burada görünür.</p>
            </div>
          </AtlasSectionPanel>
        )}
      </AtlasTableShell>
    </div>
  );
}
