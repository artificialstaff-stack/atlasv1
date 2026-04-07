"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
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
import { PageHeader } from "@/components/shared/page-header";
import {
  AtlasEmptySurface,
  AtlasInsightCard,
  AtlasSectionPanel,
  AtlasStackGrid,
  AtlasTableShell,
} from "@/components/portal/atlas-widget-kit";
import {
  MOVEMENT_TYPE_LABELS,
  type MovementType,
  WAREHOUSE_LOCATION_LABELS,
  type WarehouseLocation,
} from "@/types/enums";
import { formatDateTime, getStatusVariant } from "@/lib/utils";
import { useInventoryMovements, useProducts } from "@/features/queries";
import { useRecordStockMovement } from "@/features/mutations";
import { AlertTriangle, ArrowUpDown, Package, Plus, RefreshCw, Search } from "lucide-react";
import type { Tables } from "@/types/database";
import { useI18n } from "@/i18n/provider";

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
  const { t } = useI18n();
  const {
    data: movementsRaw = [],
    isLoading: loading,
    isError: movementsHasError,
    error: movementsError,
    refetch: refetchMovements,
  } = useInventoryMovements(100);
  const movements = movementsRaw as MovementWithDetails[];
  const {
    data: products = [],
    isError: productsHasError,
    error: productsError,
    refetch: refetchProducts,
  } = useProducts();
  const recordMovement = useRecordStockMovement();

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

  async function onSubmit(data: StockFormData) {
    recordMovement.mutate(
      {
        product_id: data.product_id,
        movement_type: data.movement_type,
        location: data.location,
        quantity_delta: data.quantity_delta,
        note: data.reference_note || undefined,
      },
      {
        onSuccess: () => {
          form.reset();
          setModalOpen(false);
        },
      },
    );
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

  const hasError = movementsHasError || productsHasError;
  const errorMessage =
    movementsError instanceof Error
      ? movementsError.message
      : productsError instanceof Error
        ? productsError.message
        : "Bir veya daha fazla envanter kaynağına erişilemedi.";
  const totalTurkeyStock = products.reduce((sum, p) => sum + p.stock_turkey, 0);
  const totalUsStock = products.reduce((sum, p) => sum + p.stock_us, 0);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Envanter"
        description="Stok hareketleri, depo lokasyonlari ve operator duzeltme akislari tek workbench icinde toplanir."
      >
        <Button onClick={() => setModalOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Stok Hareketi
        </Button>
      </PageHeader>

      {hasError ? (
        <AtlasEmptySurface
          title="Envanter verisi yuklenemedi"
          description={errorMessage}
          tone="danger"
          primaryAction={{
            label: "Tekrar dene",
            onClick: () => {
              void Promise.all([refetchProducts(), refetchMovements()]);
            },
            icon: RefreshCw,
          }}
        />
      ) : (
        <AtlasStackGrid columns="four">
          <AtlasInsightCard
            eyebrow="Inventory Pulse"
            title={`${products.length}`}
            description="Kayitli toplam urun ve SKU havuzu."
            badge="Toplam urun"
            tone="cobalt"
          />
          <AtlasInsightCard
            eyebrow="TR Warehouse"
            title={`${totalTurkeyStock}`}
            description="Turkiye tarafindaki hazir stok adedi."
            badge="TR stok"
            tone="neutral"
          />
          <AtlasInsightCard
            eyebrow="US Warehouse"
            title={`${totalUsStock}`}
            description="ABD operasyonu icin hazir stok adedi."
            badge="US stok"
            tone="success"
          />
          <AtlasInsightCard
            eyebrow="Activity Stream"
            title={`${movements.length}`}
            description="Son cekilen stok hareketi sayisi."
            badge="Son 100 hareket"
            tone="warning"
          />
        </AtlasStackGrid>
      )}

      <AtlasSectionPanel
        eyebrow="Inventory Controls"
        title="Arama ve hizli operator kontrolleri"
        description="Urun, SKU veya hareket tipine gore stok kayitlarini hizli filtreleyin."
      >
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Urun adi veya SKU ile ara..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
      </AtlasSectionPanel>

      <AtlasTableShell
        eyebrow="Movement Ledger"
        title="Stok hareketleri"
        description="Tum giris, cikis ve duzeltme hareketleri tek ledger tablosunda izlenir."
        badge={`${filteredMovements.length} hareket`}
      >
          {loading ? (
            <p className="text-center text-muted-foreground py-12">
              Yükleniyor...
            </p>
          ) : hasError ? (
            <div className="py-12">
              <EmptyState
                icon={<AlertTriangle className="h-12 w-12 text-destructive" />}
                title={t("admin.inventoryLaunch.errorTitle")}
                description={t("admin.inventoryLaunch.errorDescription")}
                action={
                  <Button
                    variant="outline"
                    className="gap-2"
                    onClick={() => {
                      void Promise.all([refetchProducts(), refetchMovements()]);
                    }}
                  >
                    <RefreshCw className="h-4 w-4" />
                    {t("admin.inventoryLaunch.retry")}
                  </Button>
                }
              />
            </div>
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
            <>
              <div className="py-12">
                <EmptyState
                  icon={<Package className="h-12 w-12" />}
                  title="Stok hareketi bulunamadı"
                  description={t("admin.inventoryLaunch.emptyDescription")}
                  action={
                    <Button onClick={() => setModalOpen(true)}>
                      <Plus className="mr-2 h-4 w-4" />
                      {t("admin.inventoryLaunch.addMovement")}
                    </Button>
                  }
                />
              </div>
            </>
          )}
      </AtlasTableShell>

      {/* Stok Hareketi Modal */}
      <ModalWrapper
        open={modalOpen}
        onOpenChange={setModalOpen}
        title="Yeni Stok Hareketi"
        description="Ürün stok girişi veya çıkışı kaydedin."
        size="default"
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
            <div className="grid gap-4 md:grid-cols-2">
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
