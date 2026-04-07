"use client";

import { useMemo, useState } from "react";
import { MapPin, Package, Search, Warehouse } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  AtlasEmptySurface,
  AtlasHeroBoard,
  AtlasSectionPanel,
  AtlasStackGrid,
  AtlasTableShell,
  AtlasTimelineRail,
} from "@/components/portal/atlas-widget-kit";
import { useClientGuidance } from "../../_components/client-guidance-provider";

interface WarehouseItem {
  id: string;
  warehouse_location: string;
  bin_number: string | null;
  quantity: number;
  unit_type: string;
  storage_cost_monthly: number;
  status: string;
  sku: string | null;
  barcode: string | null;
  notes: string | null;
  created_at: string;
}

const LOCATIONS: Record<string, string> = {
  US_MAIN: "ABD Ana Depo",
  US_EAST: "ABD Doğu",
  US_WEST: "ABD Batı",
  US_SOUTH: "ABD Güney",
  TR_ISTANBUL: "İstanbul",
  TR_IZMIR: "İzmir",
  AMAZON_FBA: "Amazon FBA",
  FEDEX: "FedEx",
  OTHER: "Diğer",
};

const STATUS_LABELS: Record<string, string> = {
  in_stock: "Stokta",
  reserved: "Rezerve",
  shipping: "Gönderimde",
  returned: "İade",
  damaged: "Hasarlı",
  disposed: "İmha",
};

const STATUS_COLORS: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  in_stock: "default",
  reserved: "secondary",
  shipping: "secondary",
  returned: "outline",
  damaged: "destructive",
  disposed: "destructive",
};

const UNIT_LABELS: Record<string, string> = {
  piece: "Adet",
  box: "Kutu",
  pallet: "Palet",
  kg: "Kg",
  lbs: "Lb",
};

export function WarehouseContent({ items }: { items: WarehouseItem[] }) {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const filtered = useMemo(
    () =>
      items.filter((item) => {
        const matchesSearch =
          (item.sku || "").toLowerCase().includes(search.toLowerCase()) ||
          (item.barcode || "").toLowerCase().includes(search.toLowerCase()) ||
          (LOCATIONS[item.warehouse_location] || item.warehouse_location).toLowerCase().includes(search.toLowerCase());
        const matchesStatus = statusFilter === "all" || item.status === statusFilter;
        return matchesSearch && matchesStatus;
      }),
    [items, search, statusFilter],
  );

  const totalQty = items.reduce((sum, item) => sum + (item.quantity || 0), 0);
  const inStockQty = items.filter((item) => item.status === "in_stock").reduce((sum, item) => sum + item.quantity, 0);
  const totalCost = items.reduce((sum, item) => sum + (item.storage_cost_monthly || 0), 0);
  const locationCount = new Set(items.map((item) => item.warehouse_location)).size;

  useClientGuidance({
    focusLabel: items.length > 0 ? "Depo ve fulfillment workbench" : "Depo lane'i henüz boş",
    summary:
      items.length > 0
        ? "Stok, lokasyon ve aylık depo maliyeti sade bir operator yüzeyinde tutulur."
        : "Fulfillment alanı açıldığında depo lokasyonları ve stok kayıtları burada görünür.",
    metrics: [
      { label: "Kayıt", value: `${items.length}` },
      { label: "Lokasyon", value: `${locationCount}` },
      { label: "Stok", value: `${totalQty}` },
    ],
  });

  return (
    <div className="space-y-6">
      <AtlasHeroBoard
        eyebrow="Fulfillment Lane"
        title="Depom"
        description="ABD depolarındaki stok, bin konumu, fulfillment readiness ve aylık depolama maliyeti tek workbench içinde görünür."
        tone="cobalt"
        surface="secondary"
        metrics={[
          { label: "Toplam stok", value: `${totalQty}`, tone: "primary" },
          { label: "Stokta", value: `${inStockQty}`, tone: "success" },
          { label: "Lokasyon", value: `${locationCount}`, tone: "cobalt" },
          {
            label: "Aylık maliyet",
            value: `$${totalCost.toLocaleString("en-US", { minimumFractionDigits: 0 })}`,
            tone: "warning",
          },
        ]}
        primaryAction={{ label: "Süreç takibi", href: "/panel/process" }}
        secondaryAction={{ label: "Destek merkezi", href: "/panel/support", variant: "outline" }}
      >
        <div className="rounded-[1.2rem] border border-white/8 bg-black/20 px-4 py-3 text-sm leading-6 text-slate-300/85">
          Depo modülü artık çıplak envanter tablosu değil; önce stok snapshot’ını, sonra filtrelenebilir fulfillment workbench’ini gösterir.
        </div>
      </AtlasHeroBoard>

      {items.length === 0 ? (
        <AtlasEmptySurface
          title="Depoda ürün yok"
          description="Fulfillment alanı açıldığında stok, lokasyon ve bin kayıtları burada görünmeye başlar."
          tone="cobalt"
          primaryAction={{ label: "Süreç modülünü aç", href: "/panel/process" }}
          secondaryAction={{ label: "Destek ile ilerle", href: "/panel/support", variant: "outline" }}
        />
      ) : (
        <>
          <AtlasSectionPanel
            eyebrow="Fulfillment Snapshot"
            title="Depo operasyon görünümü"
            description="Stok, lokasyon ve maliyet sinyalini kartlar üzerinden, fulfillment adımlarını ise rail üzerinden izleyin."
            badge={`${items.length} kayıt`}
          >
            <AtlasStackGrid columns="split">
              <AtlasStackGrid columns="four">
                <div className="rounded-[1.2rem] border border-white/8 bg-black/20 p-4">
                  <p className="atlas-kicker">Toplam stok</p>
                  <p className="mt-3 text-2xl font-semibold text-white">{totalQty.toLocaleString()}</p>
                </div>
                <div className="rounded-[1.2rem] border border-emerald-400/15 bg-emerald-500/[0.06] p-4">
                  <p className="atlas-kicker">Stokta</p>
                  <p className="mt-3 text-2xl font-semibold text-white">{inStockQty.toLocaleString()}</p>
                </div>
                <div className="rounded-[1.2rem] border border-white/8 bg-black/20 p-4">
                  <p className="atlas-kicker">Lokasyon</p>
                  <p className="mt-3 text-2xl font-semibold text-white">{locationCount}</p>
                </div>
                <div className="rounded-[1.2rem] border border-amber-400/15 bg-amber-500/[0.06] p-4">
                  <p className="atlas-kicker">Aylık maliyet</p>
                  <p className="mt-3 text-2xl font-semibold text-white">${totalCost.toFixed(2)}</p>
                </div>
              </AtlasStackGrid>

              <AtlasTimelineRail
                items={[
                  {
                    id: "warehouse-intake",
                    title: "Inbound intake",
                    description: "Depoya giren ürünler barkod, SKU ve lokasyon ile eşleşir.",
                    badge: `${locationCount} lokasyon`,
                    tone: "cobalt",
                    icon: Warehouse,
                  },
                  {
                    id: "warehouse-stock",
                    title: "Stock health",
                    description: `${inStockQty.toLocaleString()} birim stokta. Rezerve ve iade hareketleri ayrı izlenir.`,
                    badge: `${items.length} kayıt`,
                    tone: "success",
                    icon: Package,
                  },
                  {
                    id: "warehouse-cost",
                    title: "Cost control",
                    description: `Aylık depolama maliyeti $${totalCost.toFixed(2)} olarak hesaplanıyor.`,
                    badge: "Monthly",
                    tone: "warning",
                    icon: MapPin,
                  },
                ]}
              />
            </AtlasStackGrid>
          </AtlasSectionPanel>

          <AtlasTableShell
            eyebrow="Inventory Workbench"
            title="Depo envanteri"
            description="SKU, barkod, lokasyon ve depo durumuna göre filtrelenmiş tüm stok kayıtları burada listelenir."
            badge={`${filtered.length} sonuç`}
          >
            <div className="mb-4 flex flex-col gap-3 sm:flex-row">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="SKU, barkod veya lokasyon ara..."
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  className="border-white/10 bg-white/[0.03] pl-9"
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full border-white/10 bg-white/[0.03] sm:w-[210px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tüm durumlar</SelectItem>
                  {Object.entries(STATUS_LABELS).map(([key, value]) => (
                    <SelectItem key={key} value={key}>
                      {value}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="overflow-x-auto rounded-[1.2rem] border border-white/8 bg-black/20">
              <Table>
                <TableHeader>
                  <TableRow className="border-white/8">
                    <TableHead>SKU / Barkod</TableHead>
                    <TableHead>Depo</TableHead>
                    <TableHead>Raf</TableHead>
                    <TableHead className="text-right">Miktar</TableHead>
                    <TableHead>Durum</TableHead>
                    <TableHead className="text-right">Aylık maliyet</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((item) => (
                    <TableRow key={item.id} className="border-white/8">
                      <TableCell className="font-mono text-xs">
                        {item.sku || "—"}
                        {item.barcode ? <span className="block text-muted-foreground">{item.barcode}</span> : null}
                      </TableCell>
                      <TableCell>{LOCATIONS[item.warehouse_location] || item.warehouse_location}</TableCell>
                      <TableCell>{item.bin_number || "—"}</TableCell>
                      <TableCell className="text-right font-medium">
                        {item.quantity} {UNIT_LABELS[item.unit_type] || item.unit_type}
                      </TableCell>
                      <TableCell>
                        <Badge variant={STATUS_COLORS[item.status] || "outline"}>
                          {STATUS_LABELS[item.status] || item.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right whitespace-nowrap">
                        ${(item.storage_cost_monthly || 0).toFixed(2)}
                      </TableCell>
                    </TableRow>
                  ))}
                  {filtered.length === 0 ? (
                    <TableRow className="border-white/8">
                      <TableCell colSpan={6} className="py-10 text-center text-muted-foreground">
                        Filtrelere uyan depo kaydı bulunamadı.
                      </TableCell>
                    </TableRow>
                  ) : null}
                </TableBody>
              </Table>
            </div>
          </AtlasTableShell>
        </>
      )}
    </div>
  );
}
