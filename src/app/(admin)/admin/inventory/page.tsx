"use client";

import { useEffect, useState, useCallback } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
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
import { ModalWrapper } from "@/components/shared/modal-wrapper";
import { EmptyState } from "@/components/shared/empty-state";
import {
  MOVEMENT_TYPE_LABELS,
  type MovementType,
  WAREHOUSE_LOCATION_LABELS,
  type WarehouseLocation,
} from "@/types/enums";
import { formatDateTime, getStatusVariant } from "@/lib/utils";
import { toast } from "sonner";
import { Package, Plus, Search, ArrowUpDown } from "lucide-react";
import type { Tables } from "@/types/database";

const stockAdjustmentSchema = z.object({
  product_id: z.string().min(1, "Ürün seçiniz"),
  movement_type: z.enum([
    "inbound_receipt",
    "order_fulfillment",
    "transfer_in",
    "transfer_out",
    "shrinkage",
    "adjustment",
    "return",
  ]),
  location: z.enum(["TR", "US"]),
  quantity_delta: z.number().refine((v) => v !== 0, "Miktar 0 olamaz"),
  reference_note: z.string().optional(),
});

type StockFormData = z.infer<typeof stockAdjustmentSchema>;

type MovementWithDetails = Tables<"inventory_movements"> & {
  products?: { name: string; sku: string } | null;
};

export default function AdminInventoryPage() {
  const supabase = createClient();
  const [movements, setMovements] = useState<MovementWithDetails[]>([]);
  const [products, setProducts] = useState<
    { id: string; name: string; sku: string; stock_turkey: number; stock_us: number; owner_id: string }[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [search, setSearch] = useState("");

  const form = useForm<StockFormData>({
    resolver: zodResolver(stockAdjustmentSchema),
    defaultValues: {
      product_id: "",
      movement_type: "inbound_receipt",
      location: "US",
      quantity_delta: 0,
      reference_note: "",
    },
  });

  const fetchData = useCallback(async () => {
    const [{ data: movData }, { data: prodData }] = await Promise.all([
      supabase
        .from("inventory_movements")
        .select("*, products(name, sku)")
        .order("recorded_at", { ascending: false })
        .limit(100),
      supabase
        .from("products")
        .select("id, name, sku, stock_turkey, stock_us, owner_id")
        .eq("is_active", true)
        .order("name", { ascending: true }),
    ]);

    setMovements((movData as MovementWithDetails[]) ?? []);
    setProducts(prodData ?? []);
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  async function onSubmit(data: StockFormData) {
    // Kullanıcı bilgisi (recorded_by)
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await supabase.from("inventory_movements").insert({
      product_id: data.product_id,
      movement_type: data.movement_type,
      location: data.location,
      quantity_delta: data.quantity_delta,
      note: data.reference_note || null,
      recorded_by: user.id,
    });

    if (error) {
      toast.error("Stok hareketi kaydedilemedi", {
        description: error.message,
      });
      return;
    }

    toast.success("Stok hareketi başarıyla kaydedildi");
    form.reset();
    setModalOpen(false);
    fetchData();
  }

  const filteredMovements = movements.filter((m) => {
    if (!search) return true;
    const s = search.toLowerCase();
    return (
      m.products?.name?.toLowerCase().includes(s) ||
      m.products?.sku?.toLowerCase().includes(s) ||
      m.movement_type.toLowerCase().includes(s)
    );
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Envanter</h1>
          <p className="text-muted-foreground">
            Stok hareketleri ve depo yönetimi.
          </p>
        </div>
        <Button onClick={() => setModalOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Stok Hareketi
        </Button>
      </div>

      {/* Stok Özet Kartları */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">
              Toplam Ürün
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{products.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">
              Toplam TR Stok
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">
              {products.reduce((sum, p) => sum + p.stock_turkey, 0)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">
              Toplam US Stok
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">
              {products.reduce((sum, p) => sum + p.stock_us, 0)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">
              Son 100 Hareket
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{movements.length}</p>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Ürün adı veya SKU ile ara..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Hareket Tablosu */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <ArrowUpDown className="h-4 w-4" />
            Stok Hareketleri
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <p className="text-center text-muted-foreground py-12">
              Yükleniyor...
            </p>
          ) : filteredMovements.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Ürün</TableHead>
                  <TableHead>Tip</TableHead>
                  <TableHead>Konum</TableHead>
                  <TableHead>Miktar</TableHead>
                  <TableHead>Not</TableHead>
                  <TableHead>Tarih</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredMovements.map((m) => (
                  <TableRow key={m.id}>
                    <TableCell>
                      <p className="font-medium text-sm">
                        {m.products?.name ?? "—"}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {m.products?.sku ?? "—"}
                      </p>
                    </TableCell>
                    <TableCell>
                      <Badge variant={getStatusVariant(m.movement_type)}>
                        {MOVEMENT_TYPE_LABELS[
                          m.movement_type as MovementType
                        ] ?? m.movement_type}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {WAREHOUSE_LOCATION_LABELS[
                          m.location as WarehouseLocation
                        ] ?? m.location}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <span
                        className={
                          m.quantity_delta > 0
                            ? "text-green-600 font-semibold"
                            : "text-red-600 font-semibold"
                        }
                      >
                        {m.quantity_delta > 0 ? "+" : ""}
                        {m.quantity_delta}
                      </span>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground max-w-[200px] truncate">
                      {m.note ?? "—"}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {formatDateTime(m.recorded_at)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="py-12">
              <EmptyState
                icon={<Package className="h-12 w-12" />}
                title="Stok hareketi bulunamadı"
                description="Yeni stok hareketi ekleyin."
              />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Stok Hareketi Modal */}
      <ModalWrapper
        open={modalOpen}
        onOpenChange={setModalOpen}
        title="Yeni Stok Hareketi"
        description="Ürün stok girişi veya çıkışı kaydedin."
      >
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="product_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Ürün</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Ürün seçin" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {products.map((p) => (
                        <SelectItem key={p.id} value={p.id}>
                          {p.name} ({p.sku})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="movement_type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Hareket Tipi</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {(
                          Object.entries(MOVEMENT_TYPE_LABELS) as [
                            MovementType,
                            string,
                          ][]
                        ).map(([val, label]) => (
                          <SelectItem key={val} value={val}>
                            {label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="location"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Depo Lokasyonu</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {(
                          Object.entries(WAREHOUSE_LOCATION_LABELS) as [
                            WarehouseLocation,
                            string,
                          ][]
                        ).map(([val, label]) => (
                          <SelectItem key={val} value={val}>
                            {label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <FormField
              control={form.control}
              name="quantity_delta"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    Miktar Değişimi (giriş: +, çıkış: -)
                  </FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      placeholder="Ör: 50 veya -10"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="reference_note"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Referans Notu (Opsiyonel)</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Ör: Virginia depo konteyner #A1234"
                      rows={2}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button
              type="submit"
              className="w-full"
              disabled={form.formState.isSubmitting}
            >
              {form.formState.isSubmitting
                ? "Kaydediliyor..."
                : "Hareketi Kaydet"}
            </Button>
          </form>
        </Form>
      </ModalWrapper>
    </div>
  );
}
