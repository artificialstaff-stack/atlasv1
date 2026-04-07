"use client";

import { ColumnDef } from "@tanstack/react-table";
import { Package } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { BentoGrid, BentoCell } from "@/components/shared/bento-grid";
import { StatCard } from "@/components/shared/stat-card";
import { PageHeader } from "@/components/shared/page-header";
import { DataTable } from "@/components/shared/data-table";
import { AtlasEmptySurface } from "@/components/portal/atlas-widget-kit";
import { formatCurrency } from "@/lib/utils";

interface Product {
  id: string;
  name: string;
  sku: string;
  hs_code?: string | null;
  stock_turkey: number;
  stock_us: number;
  base_price: number;
}

const columns: ColumnDef<Product, unknown>[] = [
  {
    accessorKey: "name",
    header: "Ürün Adı",
    cell: ({ row }) => (
      <span className="font-medium">{row.getValue("name")}</span>
    ),
  },
  {
    accessorKey: "sku",
    header: "SKU",
    cell: ({ row }) => (
      <span className="font-mono text-xs">{row.getValue("sku")}</span>
    ),
  },
  {
    accessorKey: "hs_code",
    header: "HS Kodu",
    cell: ({ row }) => (
      <span className="text-xs">{row.getValue("hs_code") ?? "-"}</span>
    ),
  },
  {
    accessorKey: "stock_turkey",
    header: "TR Stok",
    cell: ({ row }) => {
      const val = row.getValue("stock_turkey") as number;
      return (
        <Badge variant={val > 0 ? "default" : "destructive"} className="tabular-nums">
          {val}
        </Badge>
      );
    },
  },
  {
    accessorKey: "stock_us",
    header: "US Stok",
    cell: ({ row }) => {
      const val = row.getValue("stock_us") as number;
      return (
        <Badge variant={val > 0 ? "default" : "destructive"} className="tabular-nums">
          {val}
        </Badge>
      );
    },
  },
  {
    accessorKey: "base_price",
    header: "Birim Fiyat",
    cell: ({ row }) => (
      <span className="tabular-nums text-right block">
        {formatCurrency(row.getValue("base_price"))}
      </span>
    ),
  },
];

export function ProductsContent({ products }: { products: Product[] }) {
  const totalTR = products.reduce((s, p) => s + (p.stock_turkey ?? 0), 0);
  const totalUS = products.reduce((s, p) => s + (p.stock_us ?? 0), 0);
  const lowStock = products.filter(
    (p) => p.stock_turkey + p.stock_us < 10
  ).length;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Ürünlerim"
        description="Depolardaki ürünlerinizin stok durumunu görüntüleyin."
      />

      {/* KPI Strip */}
      <BentoGrid cols={4}>
        <StatCard title="Toplam Ürün" value={products.length} icon={Package} />
        <StatCard title="TR Stok" value={totalTR} format="number" />
        <StatCard title="US Stok" value={totalUS} format="number" />
        <StatCard title="Düşük Stok" value={lowStock} format="number" />
      </BentoGrid>

      {/* Data Table */}
      <BentoCell className="w-full">
        {products.length > 0 ? (
          <DataTable
            columns={columns}
            data={products}
            searchKey="name"
            searchPlaceholder="Ürün adı ara..."
          />
        ) : (
          <AtlasEmptySurface
            title="Henüz ürün kartı oluşmadı"
            description="Depoya kabul edilen SKU'lar işlendiğinde stok, SKU ve fiyat görünümü bu tabloya otomatik olarak düşer."
            tone="neutral"
            primaryAction={{ label: "Depo görünümünü aç", href: "/panel/warehouse" }}
            secondaryAction={{ label: "Destek merkezi", href: "/panel/support", variant: "outline" }}
          />
        )}
      </BentoCell>
    </div>
  );
}
