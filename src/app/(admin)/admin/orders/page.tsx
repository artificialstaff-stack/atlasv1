"use client";

import { useEffect, useState, useCallback } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
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
  ORDER_STATUS_LABELS,
  type OrderStatus,
  PLATFORM_LABELS,
  type Platform,
} from "@/types/enums";
import {
  formatDate,
  formatCurrency,
  getStatusVariant,
  shortenUUID,
} from "@/lib/utils";
import { useOrders } from "@/features/queries";
import { useCreateOrder, useUpdateOrderStatus } from "@/features/mutations";
import { useOrdersRealtime } from "@/lib/hooks";
import {
  ShoppingCart,
  Plus,
  Search,
  Truck,
  Eye,
} from "lucide-react";
import type { Tables } from "@/types/database";

type OrderWithUser = Tables<"orders"> & {
  users?: { first_name: string; last_name: string; company_name: string } | null;
};

const newOrderSchema = z.object({
  user_id: z.string().min(1, "Müşteri seçiniz"),
  platform: z.string().optional(),
  platform_order_id: z.string().optional(),
  destination: z.string().min(5, "Teslimat adresi zorunludur"),
  total_amount: z.number().min(0, "Tutar negatif olamaz").optional(),
  notes: z.string().optional(),
});

type NewOrderFormData = z.infer<typeof newOrderSchema>;

export default function AdminOrdersPage() {
  useOrdersRealtime();
  const supabase = createClient();
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const { data: ordersRaw = [], isLoading: loading } = useOrders(
    statusFilter !== "all" ? statusFilter : undefined
  );
  const orders = ordersRaw as OrderWithUser[];
  const createOrderMutation = useCreateOrder();
  const updateStatusMutation = useUpdateOrderStatus();

  const [customers, setCustomers] = useState<
    { id: string; first_name: string; last_name: string; company_name: string }[]
  >([]);
  const [search, setSearch] = useState("");
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [detailOrder, setDetailOrder] = useState<OrderWithUser | null>(null);

  // Durum güncelleme state
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [trackingRef, setTrackingRef] = useState("");
  const [carrier, setCarrier] = useState("");

  const form = useForm<NewOrderFormData>({
    resolver: zodResolver(newOrderSchema),
    defaultValues: {
      user_id: "",
      platform: "",
      platform_order_id: "",
      destination: "",
      total_amount: 0,
      notes: "",
    },
  });

  // Müşterileri ayrıca çek (orders TanStack Query'den geliyor)
  const fetchCustomers = useCallback(async () => {
    const { data } = await supabase
      .from("users")
      .select("id, first_name, last_name, company_name")
      .order("company_name", { ascending: true });
    setCustomers(data ?? []);
  }, [supabase]);

  useEffect(() => {
    fetchCustomers();
  }, [fetchCustomers]);

  async function onCreateOrder(data: NewOrderFormData) {
    createOrderMutation.mutate(
      {
        user_id: data.user_id,
        platform: data.platform || null,
        platform_order_id: data.platform_order_id || null,
        destination: data.destination,
        total_amount: data.total_amount || null,
        notes: data.notes || null,
      },
      {
        onSuccess: () => {
          form.reset();
          setCreateModalOpen(false);
        },
      },
    );
  }

  function handleUpdateOrderStatus(orderId: string, newStatus: OrderStatus) {
    updateStatusMutation.mutate(
      {
        orderId,
        status: newStatus,
        trackingRef: trackingRef || undefined,
        carrier: carrier || undefined,
      },
      {
        onSuccess: () => {
          setUpdatingId(null);
          setTrackingRef("");
          setCarrier("");
        },
      },
    );
  }

  const filteredOrders = orders.filter((o) => {
    if (search) {
      const s = search.toLowerCase();
      return (
        o.users?.company_name?.toLowerCase().includes(s) ||
        o.platform_order_id?.toLowerCase().includes(s) ||
        o.destination.toLowerCase().includes(s) ||
        o.tracking_ref?.toLowerCase().includes(s)
      );
    }
    return true;
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Siparişler</h1>
          <p className="text-muted-foreground">
            Sipariş karşılama ve sevkiyat yönetimi.
          </p>
        </div>
        <Button onClick={() => setCreateModalOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Yeni Sipariş
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Şirket, sipariş no veya takip numarası..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Durum" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tümü</SelectItem>
            {(
              Object.entries(ORDER_STATUS_LABELS) as [OrderStatus, string][]
            ).map(([val, label]) => (
              <SelectItem key={val} value={val}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Tablo */}
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <p className="text-center text-muted-foreground py-12">
              Yükleniyor...
            </p>
          ) : filteredOrders.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Müşteri</TableHead>
                  <TableHead>Platform</TableHead>
                  <TableHead>Adres</TableHead>
                  <TableHead>Tutar</TableHead>
                  <TableHead>Durum</TableHead>
                  <TableHead>Tarih</TableHead>
                  <TableHead>İşlem</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredOrders.map((order) => (
                  <TableRow key={order.id}>
                    <TableCell>
                      <p className="font-medium text-sm">
                        {order.users?.company_name ?? "—"}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {shortenUUID(order.id)}
                      </p>
                    </TableCell>
                    <TableCell>
                      {order.platform ? (
                        <Badge variant="outline">
                          {PLATFORM_LABELS[order.platform as Platform] ??
                            order.platform}
                        </Badge>
                      ) : (
                        "—"
                      )}
                    </TableCell>
                    <TableCell className="max-w-[200px] truncate text-sm">
                      {order.destination}
                    </TableCell>
                    <TableCell className="text-sm">
                      {order.total_amount
                        ? formatCurrency(order.total_amount)
                        : "—"}
                    </TableCell>
                    <TableCell>
                      <Badge variant={getStatusVariant(order.status)}>
                        {ORDER_STATUS_LABELS[order.status as OrderStatus] ??
                          order.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {formatDate(order.created_at)}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7"
                          onClick={() => setDetailOrder(order)}
                        >
                          <Eye className="h-3 w-3" />
                        </Button>
                        {["received", "processing", "packing"].includes(
                          order.status
                        ) && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-7 text-xs"
                            onClick={() => setUpdatingId(order.id)}
                          >
                            <Truck className="h-3 w-3 mr-1" />
                            Güncelle
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="py-12">
              <EmptyState
                icon={<ShoppingCart className="h-12 w-12" />}
                title="Sipariş bulunamadı"
                description="Yeni sipariş ekleyin veya filtreleri değiştirin."
              />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Yeni Sipariş Modal */}
      <ModalWrapper
        open={createModalOpen}
        onOpenChange={setCreateModalOpen}
        title="Yeni Sipariş"
        description="Manuel sipariş kaydı oluşturun."
      >
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onCreateOrder)}
            className="space-y-4"
          >
            <FormField
              control={form.control}
              name="user_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Müşteri</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Müşteri seçin" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {customers.map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.company_name} — {c.first_name} {c.last_name}
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
                name="platform"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Platform</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Seçin" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {(
                          Object.entries(PLATFORM_LABELS) as [
                            Platform,
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
                name="platform_order_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Platform Sipariş No</FormLabel>
                    <FormControl>
                      <Input placeholder="Opsiyonel" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <FormField
              control={form.control}
              name="destination"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Teslimat Adresi</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="ABD teslimat adresi"
                      rows={2}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="total_amount"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Toplam Tutar ($)</FormLabel>
                  <FormControl>
                    <Input type="number" step="0.01" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notlar (Opsiyonel)</FormLabel>
                  <FormControl>
                    <Textarea rows={2} {...field} />
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
                ? "Oluşturuluyor..."
                : "Sipariş Oluştur"}
            </Button>
          </form>
        </Form>
      </ModalWrapper>

      {/* Durum Güncelleme Modal */}
      <ModalWrapper
        open={!!updatingId}
        onOpenChange={(open) => {
          if (!open) setUpdatingId(null);
        }}
        title="Sipariş Durumu Güncelle"
        description="Siparişi bir sonraki aşamaya ilerletin."
      >
        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Takip Numarası</label>
            <Input
              value={trackingRef}
              onChange={(e) => setTrackingRef(e.target.value)}
              placeholder="USPS, FedEx, UPS takip no"
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Kargo Firması</label>
            <Input
              value={carrier}
              onChange={(e) => setCarrier(e.target.value)}
              placeholder="Ör: FedEx, UPS, USPS"
            />
          </div>
          <div className="grid grid-cols-2 gap-2">
            {(
              [
                "processing",
                "packing",
                "shipped",
                "delivered",
              ] as OrderStatus[]
            ).map((status) => (
              <Button
                key={status}
                variant="outline"
                onClick={() =>
                  updatingId && handleUpdateOrderStatus(updatingId, status)
                }
              >
                {ORDER_STATUS_LABELS[status]}
              </Button>
            ))}
          </div>
          <Button
            variant="destructive"
            className="w-full"
            onClick={() =>
              updatingId && handleUpdateOrderStatus(updatingId, "cancelled")
            }
          >
            İptal Et
          </Button>
        </div>
      </ModalWrapper>

      {/* Sipariş Detay Modal */}
      <ModalWrapper
        open={!!detailOrder}
        onOpenChange={(open) => {
          if (!open) setDetailOrder(null);
        }}
        title="Sipariş Detayı"
        description={detailOrder ? shortenUUID(detailOrder.id) : ""}
      >
        {detailOrder && (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <p className="text-muted-foreground">Müşteri</p>
                <p className="font-medium">
                  {detailOrder.users?.company_name}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground">Platform</p>
                <p className="font-medium">
                  {detailOrder.platform
                    ? PLATFORM_LABELS[detailOrder.platform as Platform]
                    : "—"}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground">Durum</p>
                <Badge variant={getStatusVariant(detailOrder.status)}>
                  {ORDER_STATUS_LABELS[detailOrder.status as OrderStatus]}
                </Badge>
              </div>
              <div>
                <p className="text-muted-foreground">Tutar</p>
                <p className="font-medium">
                  {detailOrder.total_amount
                    ? formatCurrency(detailOrder.total_amount)
                    : "—"}
                </p>
              </div>
              <div className="col-span-2">
                <p className="text-muted-foreground">Teslimat</p>
                <p className="font-medium">{detailOrder.destination}</p>
              </div>
              {detailOrder.tracking_ref && (
                <div>
                  <p className="text-muted-foreground">Takip No</p>
                  <p className="font-medium">{detailOrder.tracking_ref}</p>
                </div>
              )}
              {detailOrder.carrier && (
                <div>
                  <p className="text-muted-foreground">Kargo</p>
                  <p className="font-medium">{detailOrder.carrier}</p>
                </div>
              )}
              {detailOrder.notes && (
                <div className="col-span-2">
                  <p className="text-muted-foreground">Notlar</p>
                  <p className="text-sm">{detailOrder.notes}</p>
                </div>
              )}
            </div>
          </div>
        )}
      </ModalWrapper>
    </div>
  );
}
