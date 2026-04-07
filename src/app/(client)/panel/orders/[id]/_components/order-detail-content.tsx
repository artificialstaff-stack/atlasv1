"use client";

import { useMemo } from "react";
import {
  Package,
  Truck,
  CheckCircle2,
  Clock,
  XCircle,
  RotateCcw,
  Copy,
  ExternalLink,
  MapPin,
  Calendar,
  Hash,
  DollarSign,
  ShoppingCart,
  Box,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { BentoGrid, BentoCell } from "@/components/shared/bento-grid";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { PortalPageHero } from "@/components/portal/portal-page-hero";
import { useClientGuidance } from "../../../_components/client-guidance-provider";
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
  shipping_address?: string | null;
  destination?: string | null;
  total_amount?: number | null;
  carrier?: string | null;
  notes?: string | null;
  created_at: string;
  updated_at?: string | null;
  shipped_at?: string | null;
  delivered_at?: string | null;
}

interface Product {
  id: string;
  title: string;
  sku?: string | null;
  name?: string | null;
}

const TIMELINE_STEPS: {
  key: string;
  label: string;
  icon: typeof Clock;
  description: string;
}[] = [
  {
    key: "pending",
    label: "Sipariş Alındı",
    icon: Clock,
    description: "Siparişiniz sisteme kaydedildi.",
  },
  {
    key: "processing",
    label: "İşleniyor",
    icon: ShoppingCart,
    description: "Siparişiniz işleme alındı.",
  },
  {
    key: "packing",
    label: "Paketleniyor",
    icon: Box,
    description: "Ürününüz paketleniyor.",
  },
  {
    key: "shipped",
    label: "Kargoya Verildi",
    icon: Truck,
    description: "Siparişiniz kargoya teslim edildi.",
  },
  {
    key: "delivered",
    label: "Teslim Edildi",
    icon: CheckCircle2,
    description: "Siparişiniz başarıyla teslim edildi.",
  },
];

const STATUS_COLORS: Record<string, string> = {
  pending: "text-amber-500 bg-amber-500/10 border-amber-500/20",
  processing: "text-blue-500 bg-blue-500/10 border-blue-500/20",
  packing: "text-indigo-500 bg-indigo-500/10 border-indigo-500/20",
  shipped: "text-purple-500 bg-purple-500/10 border-purple-500/20",
  delivered: "text-green-500 bg-green-500/10 border-green-500/20",
  cancelled: "text-red-500 bg-red-500/10 border-red-500/20",
  returned: "text-orange-500 bg-orange-500/10 border-orange-500/20",
};

export function OrderDetailContent({
  order,
  product,
}: {
  order: Order;
  product: Product | null;
}) {
  const isCancelled = order.status === "cancelled";
  const isReturned = order.status === "returned";
  const isTerminal = isCancelled || isReturned;

  // Timeline step index
  const currentStepIdx = TIMELINE_STEPS.findIndex(
    (s) => s.key === order.status
  );

  function copyToClipboard(text: string) {
    navigator.clipboard.writeText(text);
    toast.success("Panoya kopyalandı");
  }

  const statusLabel =
    ORDER_STATUS_LABELS[order.status as OrderStatus] ?? order.status;
  const statusColor = STATUS_COLORS[order.status] ?? STATUS_COLORS.pending;
  const platformLabel = order.platform
    ? (PLATFORM_LABELS[order.platform as Platform] ?? order.platform)
    : "Atlas";
  const orderCode = order.platform_order_id ?? order.id.slice(0, 12);

  useClientGuidance(
    useMemo(
      () => ({
        focusLabel: isTerminal ? "Siparis kapandi" : "Tekil siparis durumu",
        summary:
          isTerminal
            ? isCancelled
              ? "Siparis iptal edilmis durumda. Yeni aksiyon gerekiyorsa destek akisina donun."
              : "Siparis iade surecinde. Guncel durum ve sonraki adimlar burada tutulur."
            : `Siparis ${statusLabel.toLowerCase()} durumunda. Takip, teslim ve belge baglantilari bu ekrandan izlenebilir.`,
        metrics: [
          { label: "Siparis", value: orderCode },
          { label: "Platform", value: platformLabel },
          { label: "Durum", value: statusLabel },
        ],
      }),
      [isCancelled, isTerminal, orderCode, platformLabel, statusLabel],
    ),
  );

  return (
    <div className="space-y-6">
      <PortalPageHero
        eyebrow="Siparis Takibi"
        title="Siparis Detayi"
        description={`Siparis ${orderCode} icin durum, teslim ve lojistik akisinin sade ozeti.`}
        surfaceVariant="secondary"
        badges={[platformLabel, statusLabel]}
        metrics={[
          { label: "Siparis", value: orderCode },
          { label: "Platform", value: platformLabel },
          { label: "Durum", value: statusLabel },
        ]}
        primaryAction={{
          id: "order-detail:orders",
          label: "Tum Siparislerim",
          href: "/panel/orders",
          description: "Siparis listesine geri don.",
          kind: "open_orders",
        }}
        secondaryAction={{
          id: "order-detail:support",
          label: "Destek Merkezi",
          href: "/panel/support",
          description: "Teslim veya siparis sorusu icin destek al.",
          kind: "open_support",
          emphasis: "secondary",
        }}
      >
        <div className="rounded-2xl border border-white/8 bg-background/35 px-4 py-3 text-sm leading-6 text-slate-200/90">
          {order.tracking_ref
            ? `Takip numarasi ${order.tracking_ref}. Kopyalayip kargo ve teslim baglamini kontrol edebilirsiniz.`
            : "Takip numarasi olustugunda bu ekranda gorunecek; operator akisiniz arka planda ilerlemeye devam eder."}
        </div>
      </PortalPageHero>

      {/* Status Banner */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className={cn(
          "flex items-center gap-3 rounded-xl border p-4",
          statusColor
        )}
      >
        {isTerminal ? (
          isCancelled ? (
            <XCircle className="h-6 w-6" />
          ) : (
            <RotateCcw className="h-6 w-6" />
          )
        ) : currentStepIdx >= 0 ? (
          (() => {
            const Icon = TIMELINE_STEPS[currentStepIdx].icon;
            return <Icon className="h-6 w-6" />;
          })()
        ) : (
          <Clock className="h-6 w-6" />
        )}
        <div>
          <p className="font-semibold">{statusLabel}</p>
          <p className="text-xs opacity-80">
            {isTerminal
              ? isCancelled
                ? "Bu sipariş iptal edilmiştir."
                : "Bu sipariş iade edilmiştir."
              : currentStepIdx >= 0
                ? TIMELINE_STEPS[currentStepIdx].description
                : "Sipariş durumu bekleniyor."}
          </p>
        </div>
      </motion.div>

      <BentoGrid cols={3}>
        {/* Timeline — 2 col */}
        <BentoCell span="2">
          <h3 className="mb-5 text-sm font-medium text-muted-foreground">
            Sipariş Süreci
          </h3>
          {!isTerminal ? (
            <div className="relative">
              {TIMELINE_STEPS.map((step, i) => {
                const isCompleted = i <= currentStepIdx;
                const isCurrent = i === currentStepIdx;
                const Icon = step.icon;

                return (
                  <motion.div
                    key={step.key}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.1 }}
                    className="flex gap-4 pb-6 last:pb-0"
                  >
                    {/* Line + Circle */}
                    <div className="flex flex-col items-center">
                      <div
                        className={cn(
                          "flex h-10 w-10 items-center justify-center rounded-full border-2 transition-all",
                          isCurrent
                            ? "border-primary bg-primary text-primary-foreground shadow-md shadow-primary/25"
                            : isCompleted
                              ? "border-primary/50 bg-primary/10 text-primary"
                              : "border-border bg-muted text-muted-foreground"
                        )}
                      >
                        <Icon className="h-4 w-4" />
                      </div>
                      {i < TIMELINE_STEPS.length - 1 && (
                        <div
                          className={cn(
                            "mt-1 w-0.5 flex-1 min-h-6 rounded-full transition-colors",
                            i < currentStepIdx ? "bg-primary/50" : "bg-border"
                          )}
                        />
                      )}
                    </div>

                    {/* Content */}
                    <div className="pt-1.5">
                      <p
                        className={cn(
                          "text-sm font-medium",
                          isCurrent
                            ? "text-primary"
                            : isCompleted
                              ? "text-foreground"
                              : "text-muted-foreground"
                        )}
                      >
                        {step.label}
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {step.description}
                      </p>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              {isCancelled ? (
                <XCircle className="h-12 w-12 text-destructive/40 mb-3" />
              ) : (
                <RotateCcw className="h-12 w-12 text-orange-500/40 mb-3" />
              )}
              <p className="text-sm font-medium">
                {isCancelled
                  ? "Sipariş iptal edildi"
                  : "Sipariş iade sürecinde"}
              </p>
            </div>
          )}
        </BentoCell>

        {/* Order Details — right col */}
        <BentoCell className="p-0">
          <Card className="border-0 shadow-none bg-transparent h-full">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Sipariş Bilgileri
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <DetailRow
                icon={Hash}
                label="Sipariş No"
                value={
                  <span className="font-mono text-xs">
                    {order.platform_order_id ?? order.id.slice(0, 12)}
                  </span>
                }
                copyable={order.platform_order_id ?? order.id}
                onCopy={copyToClipboard}
              />
              {order.platform && (
                <DetailRow
                  icon={ExternalLink}
                  label="Platform"
                  value={
                    <Badge variant="outline" className="text-xs">
                      {PLATFORM_LABELS[order.platform as Platform] ?? order.platform}
                    </Badge>
                  }
                />
              )}
              {order.total_amount != null && (
                <DetailRow
                  icon={DollarSign}
                  label="Tutar"
                  value={
                    <span className="font-semibold">
                      ${order.total_amount.toLocaleString("tr-TR")}
                    </span>
                  }
                />
              )}
              {order.carrier && (
                <DetailRow
                  icon={Truck}
                  label="Kargo Firması"
                  value={order.carrier}
                />
              )}
              {order.tracking_ref && (
                <DetailRow
                  icon={Truck}
                  label="Takip No"
                  value={
                    <span className="font-mono text-xs">
                      {order.tracking_ref}
                    </span>
                  }
                  copyable={order.tracking_ref}
                  onCopy={copyToClipboard}
                />
              )}
              {order.shipping_address && (
                <DetailRow
                  icon={MapPin}
                  label="Adres"
                  value={
                    <span className="text-xs">{order.shipping_address}</span>
                  }
                />
              )}
              {order.destination && !order.shipping_address && (
                <DetailRow
                  icon={MapPin}
                  label="Hedef"
                  value={
                    <span className="text-xs">{order.destination}</span>
                  }
                />
              )}
              <DetailRow
                icon={Calendar}
                label="Oluşturulma"
                value={new Date(order.created_at).toLocaleDateString("tr-TR", {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              />

              {/* Product info */}
              {product && (
                <>
                  <Separator className="my-2" />
                  <div className="space-y-2">
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
                      Ürün Bilgisi
                    </p>
                    <div className="rounded-lg bg-muted/40 p-3 space-y-1">
                      <p className="text-sm font-medium line-clamp-2">
                        {product.title}
                      </p>
                      {product.sku && (
                        <p className="text-xs text-muted-foreground">
                          SKU: {product.sku}
                        </p>
                      )}
                    </div>
                  </div>
                </>
              )}

              {/* Notes */}
              {order.notes && (
                <>
                  <Separator className="my-2" />
                  <div className="space-y-1">
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
                      Notlar
                    </p>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      {order.notes}
                    </p>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </BentoCell>
      </BentoGrid>
    </div>
  );
}

function DetailRow({
  icon: Icon,
  label,
  value,
  copyable,
  onCopy,
}: {
  icon: typeof Hash;
  label: string;
  value: React.ReactNode;
  copyable?: string;
  onCopy?: (text: string) => void;
}) {
  return (
    <div className="flex items-start gap-3">
      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-muted">
        <Icon className="h-3.5 w-3.5 text-muted-foreground" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
          {label}
        </p>
        <div className="flex items-center gap-1.5">
          <span className="text-sm">{value}</span>
          {copyable && onCopy && (
            <button
              onClick={() => onCopy(copyable)}
              className="text-muted-foreground/40 hover:text-muted-foreground transition-colors"
              title="Kopyala"
            >
              <Copy className="h-3 w-3" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
