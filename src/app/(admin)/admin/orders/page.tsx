"use client";

import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useI18n } from "@/i18n/provider";
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
  AtlasInsightCard,
  AtlasSectionPanel,
  AtlasStackGrid,
  AtlasTableShell,
} from "@/components/portal/atlas-widget-kit";
import {
  getOrderStatusLabel,
  getPlatformLabel,
  type OrderStatus,
  type Platform,
} from "@/types/enums";
import {
  formatDate,
  formatCurrency,
  getStatusVariant,
  shortenUUID,
} from "@/lib/utils";
import { useOrders, useCustomerList } from "@/features/queries";
import { useCreateOrder, useUpdateOrderStatus } from "@/features/mutations";
import { useOrdersRealtime, usePagination } from "@/lib/hooks";
import { DataTablePagination } from "@/components/shared/data-table-pagination";
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

type NewOrderFormData = {
  user_id: string;
  platform?: string;
  platform_order_id?: string;
  destination: string;
  total_amount?: number;
  notes?: string;
};

export default function AdminOrdersPage() {
  const { t, locale } = useI18n();
  useOrdersRealtime();

  const orderSchema = useMemo(
    () =>
      z.object({
        user_id: z.string().min(1, t("admin.orders.validation.customerRequired")),
        platform: z.string().optional(),
        platform_order_id: z.string().optional(),
        destination: z.string().min(5, t("admin.orders.validation.destinationRequired")),
        total_amount: z.number().min(0, t("admin.orders.validation.amountNonNegative")).optional(),
        notes: z.string().optional(),
      }),
    [t],
  );

  const [statusFilter, setStatusFilter] = useState<string>("all");
  const { data: ordersRaw = [], isLoading: loading } = useOrders(
    statusFilter !== "all" ? statusFilter : undefined,
  );
  const orders = ordersRaw as OrderWithUser[];
  const createOrderMutation = useCreateOrder();
  const updateStatusMutation = useUpdateOrderStatus();
  const { data: customers = [] } = useCustomerList();

  const [search, setSearch] = useState("");
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [detailOrder, setDetailOrder] = useState<OrderWithUser | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [trackingRef, setTrackingRef] = useState("");
  const [carrier, setCarrier] = useState("");

  const form = useForm<NewOrderFormData>({
    resolver: zodResolver(orderSchema),
    defaultValues: {
      user_id: "",
      platform: "",
      platform_order_id: "",
      destination: "",
      total_amount: 0,
      notes: "",
    },
  });

  const orderStatusOptions = useMemo(
    () =>
      ([
        "received",
        "processing",
        "packing",
        "shipped",
        "delivered",
        "cancelled",
        "returned",
      ] as OrderStatus[]).map((value) => ({
        value,
        label: getOrderStatusLabel(value, locale),
      })),
    [locale],
  );

  const platformOptions = useMemo(
    () =>
      (["amazon", "shopify", "walmart", "etsy", "direct", "other"] as Platform[]).map((value) => ({
        value,
        label: getPlatformLabel(value, locale),
      })),
    [locale],
  );

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

  const pagination = usePagination({ pageSize: 20 });

  const filteredOrders = orders.filter((order) => {
    if (!search) return true;
    const normalized = search.toLowerCase();
    return (
      order.users?.company_name?.toLowerCase().includes(normalized) ||
      order.platform_order_id?.toLowerCase().includes(normalized) ||
      order.destination.toLowerCase().includes(normalized) ||
      order.tracking_ref?.toLowerCase().includes(normalized)
    );
  });

  useEffect(() => {
    pagination.setTotal(filteredOrders.length);
  }, [filteredOrders.length]);

  const paginatedOrders = filteredOrders.slice(pagination.from, pagination.to + 1);
  const shippedCount = orders.filter((order) => ["shipped", "delivered"].includes(order.status)).length;
  const grossVolume = orders.reduce((sum, order) => sum + (order.total_amount ?? 0), 0);

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("admin.orders.title")}
        description={t("admin.orders.description")}
      >
        <Button onClick={() => setCreateModalOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          {t("admin.orders.create")}
        </Button>
      </PageHeader>

      <AtlasStackGrid columns="four">
        <AtlasInsightCard
          eyebrow="Order Stream"
          title={`${orders.length}`}
          description="Sistemde izlenen toplam siparis."
          badge="Toplam"
          tone="cobalt"
        />
        <AtlasInsightCard
          eyebrow="Filtered Queue"
          title={`${filteredOrders.length}`}
          description="Arama ve durum filtresinden gecen kayitlar."
          badge="Gorunen"
          tone="warning"
        />
        <AtlasInsightCard
          eyebrow="Shipment Progress"
          title={`${shippedCount}`}
          description="Kargoya verilen veya teslim edilen siparisler."
          badge="Shipped + delivered"
          tone="success"
        />
        <AtlasInsightCard
          eyebrow="Gross Volume"
          title={formatCurrency(grossVolume)}
          description="Kayitli siparis tutarlarindan hesaplanan toplam hacim."
          badge="Toplam hacim"
          tone="primary"
        />
      </AtlasStackGrid>

      <AtlasSectionPanel
        eyebrow="Order Controls"
        title="Arama ve durum filtresi"
        description="Musteri, platform siparis ID veya tracking numarasina gore siparis akisini daraltin."
      >
        <div className="flex flex-col gap-3 sm:flex-row">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={t("admin.orders.searchPlaceholder")}
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder={t("admin.orders.filters.status")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("admin.orders.filters.all")}</SelectItem>
              {orderStatusOptions.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </AtlasSectionPanel>

      <AtlasTableShell
        eyebrow="Order Ledger"
        title="Siparis workbench"
        description="Durum guncelleme, detay acma ve pagination tek shell icinde yonetilir."
        badge={`${filteredOrders.length} siparis`}
      >
        {loading ? (
          <p className="py-12 text-center text-muted-foreground">{t("common.loading")}</p>
        ) : filteredOrders.length > 0 ? (
          <>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("admin.orders.table.customer")}</TableHead>
                  <TableHead>{t("admin.orders.table.platform")}</TableHead>
                  <TableHead>{t("admin.orders.table.destination")}</TableHead>
                  <TableHead>{t("admin.orders.table.amount")}</TableHead>
                  <TableHead>{t("admin.orders.table.status")}</TableHead>
                  <TableHead>{t("admin.orders.table.date")}</TableHead>
                  <TableHead>{t("admin.orders.table.actions")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedOrders.map((order) => (
                  <TableRow key={order.id}>
                    <TableCell>
                      <p className="text-sm font-medium">{order.users?.company_name ?? t("common.notAvailable")}</p>
                      <p className="text-xs text-muted-foreground">{shortenUUID(order.id)}</p>
                    </TableCell>
                    <TableCell>
                      {order.platform ? (
                        <Badge variant="outline">
                          {getPlatformLabel(order.platform as Platform, locale)}
                        </Badge>
                      ) : (
                        t("common.notAvailable")
                      )}
                    </TableCell>
                    <TableCell className="max-w-[200px] truncate text-sm">{order.destination}</TableCell>
                    <TableCell className="text-sm">
                      {order.total_amount ? formatCurrency(order.total_amount) : t("common.notAvailable")}
                    </TableCell>
                    <TableCell>
                      <Badge variant={getStatusVariant(order.status)}>
                        {getOrderStatusLabel(order.status as OrderStatus, locale)}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">{formatDate(order.created_at)}</TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7"
                          onClick={() => setDetailOrder(order)}
                          aria-label={t("admin.orders.actions.openDetail")}
                        >
                          <Eye className="h-3 w-3" />
                        </Button>
                        {["received", "processing", "packing"].includes(order.status) && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-7 text-xs"
                            onClick={() => setUpdatingId(order.id)}
                          >
                            <Truck className="mr-1 h-3 w-3" />
                            {t("admin.orders.actions.update")}
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <div className="px-4 pt-4">
              <DataTablePagination pagination={pagination} />
            </div>
          </>
        ) : (
          <div className="py-12">
            <EmptyState
              icon={<ShoppingCart className="h-12 w-12" />}
              title={t("admin.orders.empty.title")}
              description={t("admin.orders.empty.description")}
            />
          </div>
        )}
      </AtlasTableShell>

      <ModalWrapper
        open={createModalOpen}
        onOpenChange={setCreateModalOpen}
        title={t("admin.orders.modal.createTitle")}
        description={t("admin.orders.modal.createDescription")}
      >
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onCreateOrder)} className="space-y-4">
            <FormField
              control={form.control}
              name="user_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("admin.orders.fields.customer")}</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder={t("admin.orders.fields.customerPlaceholder")} />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {customers.map((customer) => (
                        <SelectItem key={customer.id} value={customer.id}>
                          {customer.company_name} — {customer.first_name} {customer.last_name}
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
                    <FormLabel>{t("admin.orders.fields.platform")}</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder={t("common.select")} />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {platformOptions.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
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
                    <FormLabel>{t("admin.orders.fields.platformOrderId")}</FormLabel>
                    <FormControl>
                      <Input placeholder={t("common.optional")} {...field} />
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
                  <FormLabel>{t("admin.orders.fields.destination")}</FormLabel>
                  <FormControl>
                    <Textarea placeholder={t("admin.orders.fields.destinationPlaceholder")} rows={2} {...field} />
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
                  <FormLabel>{t("admin.orders.fields.totalAmount")}</FormLabel>
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
                  <FormLabel>{t("admin.orders.fields.notes")}</FormLabel>
                  <FormControl>
                    <Textarea rows={2} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button type="submit" className="w-full" disabled={form.formState.isSubmitting}>
              {form.formState.isSubmitting ? t("admin.orders.actions.creating") : t("admin.orders.actions.create")}
            </Button>
          </form>
        </Form>
      </ModalWrapper>

      <ModalWrapper
        open={!!updatingId}
        onOpenChange={(open) => {
          if (!open) setUpdatingId(null);
        }}
        title={t("admin.orders.modal.updateTitle")}
        description={t("admin.orders.modal.updateDescription")}
      >
        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">{t("admin.orders.fields.trackingNumber")}</label>
            <Input
              value={trackingRef}
              onChange={(event) => setTrackingRef(event.target.value)}
              placeholder={t("admin.orders.fields.trackingPlaceholder")}
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">{t("admin.orders.fields.carrier")}</label>
            <Input
              value={carrier}
              onChange={(event) => setCarrier(event.target.value)}
              placeholder={t("admin.orders.fields.carrierPlaceholder")}
            />
          </div>
          <div className="grid grid-cols-2 gap-2">
            {(["processing", "packing", "shipped", "delivered"] as OrderStatus[]).map((status) => (
              <Button
                key={status}
                variant="outline"
                onClick={() => updatingId && handleUpdateOrderStatus(updatingId, status)}
              >
                {getOrderStatusLabel(status, locale)}
              </Button>
            ))}
          </div>
          <Button
            variant="destructive"
            className="w-full"
            onClick={() => updatingId && handleUpdateOrderStatus(updatingId, "cancelled")}
          >
            {t("admin.orders.actions.cancelOrder")}
          </Button>
        </div>
      </ModalWrapper>

      <ModalWrapper
        open={!!detailOrder}
        onOpenChange={(open) => {
          if (!open) setDetailOrder(null);
        }}
        title={t("admin.orders.modal.detailTitle")}
        description={detailOrder ? shortenUUID(detailOrder.id) : ""}
      >
        {detailOrder && (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <p className="text-muted-foreground">{t("admin.orders.detail.customer")}</p>
                <p className="font-medium">{detailOrder.users?.company_name}</p>
              </div>
              <div>
                <p className="text-muted-foreground">{t("admin.orders.detail.platform")}</p>
                <p className="font-medium">
                  {detailOrder.platform ? getPlatformLabel(detailOrder.platform as Platform, locale) : t("common.notAvailable")}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground">{t("admin.orders.detail.status")}</p>
                <Badge variant={getStatusVariant(detailOrder.status)}>
                  {getOrderStatusLabel(detailOrder.status as OrderStatus, locale)}
                </Badge>
              </div>
              <div>
                <p className="text-muted-foreground">{t("admin.orders.detail.amount")}</p>
                <p className="font-medium">
                  {detailOrder.total_amount ? formatCurrency(detailOrder.total_amount) : t("common.notAvailable")}
                </p>
              </div>
              <div className="col-span-2">
                <p className="text-muted-foreground">{t("admin.orders.detail.destination")}</p>
                <p className="font-medium">{detailOrder.destination}</p>
              </div>
              {detailOrder.tracking_ref && (
                <div>
                  <p className="text-muted-foreground">{t("admin.orders.detail.trackingNumber")}</p>
                  <p className="font-medium">{detailOrder.tracking_ref}</p>
                </div>
              )}
              {detailOrder.carrier && (
                <div>
                  <p className="text-muted-foreground">{t("admin.orders.detail.carrier")}</p>
                  <p className="font-medium">{detailOrder.carrier}</p>
                </div>
              )}
              {detailOrder.notes && (
                <div className="col-span-2">
                  <p className="text-muted-foreground">{t("admin.orders.detail.notes")}</p>
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
