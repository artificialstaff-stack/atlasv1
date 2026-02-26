"use client";

import { useParams } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
import {
  ONBOARDING_STATUS_LABELS,
  type OnboardingStatus,
  PLAN_TIER_LABELS,
  type PlanTier,
  PAYMENT_STATUS_LABELS,
  type PaymentStatus,
  ORDER_STATUS_LABELS,
  type OrderStatus,
  TASK_STATUS_LABELS,
  type TaskStatus,
} from "@/types/enums";
import {
  formatDate,
  formatCurrency,
  getStatusVariant,
} from "@/lib/utils";
import { useCustomerDetail, useCustomerOrders, useProcessTasks, useProducts } from "@/features/queries";
import { useUpdateOnboardingStatus } from "@/features/mutations";
import type { Tables } from "@/types/database";
import {
  ArrowLeft,
  Building2,
  Mail,
  Phone,
  Hash,
  Calendar,
} from "lucide-react";
import Link from "next/link";

export default function CustomerDetailPage() {
  const params = useParams();
  const customerId = params.id as string;

  const { data: customerData, isLoading: loading } = useCustomerDetail(customerId);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const customer = customerData ?? null;
  const subscriptions: Tables<"user_subscriptions">[] =
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (customerData as any)?.user_subscriptions ?? [];
  const { data: orders = [] } = useCustomerOrders(customerId);
  const { data: tasks = [] } = useProcessTasks(customerId);
  const { data: products = [] } = useProducts(customerId);
  const updateOnboarding = useUpdateOnboardingStatus();

  function handleUpdateOnboarding(newStatus: string) {
    updateOnboarding.mutate({ customerId, status: newStatus });
  }

  if (loading) {
    return (
      <div className="text-center text-muted-foreground py-20">
        Yükleniyor...
      </div>
    );
  }

  if (!customer) {
    return (
      <div className="text-center py-20">
        <p className="text-muted-foreground mb-4">Müşteri bulunamadı.</p>
        <Button asChild>
          <Link href="/admin/customers">Geri Dön</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/admin/customers">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            {customer.first_name} {customer.last_name}
          </h1>
          <p className="text-muted-foreground">{customer.company_name}</p>
        </div>
      </div>

      {/* Profil + Durum */}
      <div className="grid gap-4 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Profil Bilgileri</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center gap-2 text-sm">
              <Mail className="h-4 w-4 text-muted-foreground" />
              {customer.email}
            </div>
            {customer.phone && (
              <div className="flex items-center gap-2 text-sm">
                <Phone className="h-4 w-4 text-muted-foreground" />
                {customer.phone}
              </div>
            )}
            <div className="flex items-center gap-2 text-sm">
              <Building2 className="h-4 w-4 text-muted-foreground" />
              {customer.company_name}
            </div>
            {customer.tax_id && (
              <div className="flex items-center gap-2 text-sm">
                <Hash className="h-4 w-4 text-muted-foreground" />
                {customer.tax_id}
              </div>
            )}
            <div className="flex items-center gap-2 text-sm">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              Kayıt: {formatDate(customer.created_at)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Onboarding Durumu</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Badge variant={getStatusVariant(customer.onboarding_status)}>
              {ONBOARDING_STATUS_LABELS[
                customer.onboarding_status as OnboardingStatus
              ] ?? customer.onboarding_status}
            </Badge>
            <Select
              value={customer.onboarding_status}
              onValueChange={handleUpdateOnboarding}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(
                  Object.entries(ONBOARDING_STATUS_LABELS) as [
                    OnboardingStatus,
                    string,
                  ][]
                ).map(([val, label]) => (
                  <SelectItem key={val} value={val}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Abonelik</CardTitle>
          </CardHeader>
          <CardContent>
            {subscriptions.length > 0 ? (
              <div className="space-y-2">
                {subscriptions.map((sub) => (
                  <div
                    key={sub.id}
                    className="rounded border p-3 space-y-1"
                  >
                    <div className="flex items-center justify-between">
                      <Badge variant="outline">
                        {PLAN_TIER_LABELS[sub.plan_tier as PlanTier] ??
                          sub.plan_tier}
                      </Badge>
                      <Badge
                        variant={getStatusVariant(sub.payment_status)}
                      >
                        {PAYMENT_STATUS_LABELS[
                          sub.payment_status as PaymentStatus
                        ] ?? sub.payment_status}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {formatCurrency(sub.amount)} / ay
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Geçerlilik: {formatDate(sub.valid_until)}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                Abonelik kaydı yok.
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Süreç Görevleri */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            Süreç Görevleri ({tasks.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {tasks.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>#</TableHead>
                  <TableHead>Görev</TableHead>
                  <TableHead>Kategori</TableHead>
                  <TableHead>Durum</TableHead>
                  <TableHead>Tamamlanma</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {tasks.map((task, idx) => (
                  <TableRow key={task.id}>
                    <TableCell className="text-muted-foreground">
                      {idx + 1}
                    </TableCell>
                    <TableCell className="font-medium text-sm">
                      {task.task_name}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {task.task_category ?? "—"}
                    </TableCell>
                    <TableCell>
                      <Badge variant={getStatusVariant(task.task_status)}>
                        {TASK_STATUS_LABELS[
                          task.task_status as TaskStatus
                        ] ?? task.task_status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {task.completed_at
                        ? formatDate(task.completed_at)
                        : "—"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-8">
              Henüz süreç görevi atanmamış.
            </p>
          )}
        </CardContent>
      </Card>

      {/* Ürünler Özet */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            Ürünler ({products.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {products.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Ürün</TableHead>
                  <TableHead>SKU</TableHead>
                  <TableHead>TR Stok</TableHead>
                  <TableHead>US Stok</TableHead>
                  <TableHead>Fiyat</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {products.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell className="font-medium text-sm">
                      {p.name}
                    </TableCell>
                    <TableCell className="text-sm">{p.sku}</TableCell>
                    <TableCell className="text-sm">{p.stock_turkey}</TableCell>
                    <TableCell className="text-sm">{p.stock_us}</TableCell>
                    <TableCell className="text-sm">
                      {formatCurrency(p.base_price)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-8">
              Ürün kaydı yok.
            </p>
          )}
        </CardContent>
      </Card>

      {/* Son Siparişler */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            Son Siparişler ({orders.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {orders.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Platform</TableHead>
                  <TableHead>Durum</TableHead>
                  <TableHead>Tutar</TableHead>
                  <TableHead>Tarih</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {orders.map((order) => (
                  <TableRow key={order.id}>
                    <TableCell className="text-sm">
                      {order.platform ?? "—"}
                    </TableCell>
                    <TableCell>
                      <Badge variant={getStatusVariant(order.status)}>
                        {ORDER_STATUS_LABELS[
                          order.status as OrderStatus
                        ] ?? order.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm">
                      {order.total_amount
                        ? formatCurrency(order.total_amount)
                        : "—"}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {formatDate(order.created_at)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-8">
              Sipariş kaydı yok.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
