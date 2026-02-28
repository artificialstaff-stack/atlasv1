"use client";

import { useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Warehouse, Search, Package, MapPin } from "lucide-react";

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

  const filtered = items.filter((i) => {
    const matchesSearch =
      (i.sku || "").toLowerCase().includes(search.toLowerCase()) ||
      (i.barcode || "").toLowerCase().includes(search.toLowerCase()) ||
      (LOCATIONS[i.warehouse_location] || i.warehouse_location)
        .toLowerCase()
        .includes(search.toLowerCase());
    const matchesStatus = statusFilter === "all" || i.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const totalQty = items.reduce((s, i) => s + (i.quantity || 0), 0);
  const inStockQty = items.filter((i) => i.status === "in_stock").reduce((s, i) => s + i.quantity, 0);
  const totalCost = items.reduce((s, i) => s + (i.storage_cost_monthly || 0), 0);
  const locationCount = new Set(items.map((i) => i.warehouse_location)).size;

  if (items.length === 0) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Depom</h1>
          <p className="text-muted-foreground">ABD depolarındaki ürünleriniz</p>
        </div>
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <Warehouse className="h-12 w-12 text-muted-foreground/30 mb-4" />
            <h3 className="text-lg font-semibold">Depoda ürün yok</h3>
            <p className="text-sm text-muted-foreground mt-1">
              Ürünleriniz depoya ulaştığında burada görünecektir.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Depom</h1>
        <p className="text-muted-foreground">ABD depolarındaki ürünleriniz</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 mb-1">
              <Package className="h-4 w-4 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">Toplam Stok</span>
            </div>
            <div className="text-2xl font-bold">{totalQty.toLocaleString()}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs text-muted-foreground">Stokta</span>
            </div>
            <div className="text-2xl font-bold text-green-600">{inStockQty.toLocaleString()}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 mb-1">
              <MapPin className="h-4 w-4 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">Depo Lokasyonu</span>
            </div>
            <div className="text-2xl font-bold">{locationCount}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-xs text-muted-foreground mb-1">Aylık Depo Maliyeti</div>
            <div className="text-2xl font-bold text-primary">
              ${totalCost.toLocaleString("en-US", { minimumFractionDigits: 2 })}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filter */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="SKU, barkod veya lokasyon ara..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-[200px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tüm Durumlar</SelectItem>
                {Object.entries(STATUS_LABELS).map(([k, v]) => (
                  <SelectItem key={k} value={k}>
                    {v}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardHeader>
          <CardTitle>Depo Envanteri</CardTitle>
          <CardDescription>{filtered.length} kayıt</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>SKU</TableHead>
                <TableHead>Depo</TableHead>
                <TableHead>Raf</TableHead>
                <TableHead className="text-right">Miktar</TableHead>
                <TableHead>Durum</TableHead>
                <TableHead className="text-right">Aylık Maliyet</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((item) => (
                <TableRow key={item.id}>
                  <TableCell className="font-mono text-xs">
                    {item.sku || "—"}
                    {item.barcode && (
                      <span className="block text-muted-foreground">{item.barcode}</span>
                    )}
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
              {filtered.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    Kayıt bulunamadı
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
