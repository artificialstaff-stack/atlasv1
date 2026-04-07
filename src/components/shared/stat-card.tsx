"use client";

import { useEffect } from "react";
import { motion, useSpring, useTransform } from "framer-motion";
import { LucideIcon, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { AtlasInsightCard, type AtlasWidgetTone } from "@/components/portal/atlas-widget-kit";

interface StatCardProps {
  title: string;
  value: number;
  /** Sayı formatı: number (10,000) veya currency ($10,000) */
  format?: "number" | "currency" | "percent";
  /** Önceki döneme kıyasla değişim yüzdesi */
  trend?: number;
  icon?: LucideIcon;
  className?: string;
  /** Bento Grid boyutu */
  span?: "1" | "2";
}

function AnimatedCounter({
  value,
  format = "number",
}: {
  value: number;
  format?: "number" | "currency" | "percent";
}) {
  const spring = useSpring(0, { stiffness: 100, damping: 30 });
  const display = useTransform(spring, (v) => {
    const rounded = Math.round(v);
    if (format === "currency") {
      return new Intl.NumberFormat("tr-TR", {
        style: "currency",
        currency: "USD",
        maximumFractionDigits: 0,
      }).format(rounded);
    }
    if (format === "percent") return `%${rounded}`;
    return new Intl.NumberFormat("tr-TR").format(rounded);
  });

  useEffect(() => {
    spring.set(value);
  }, [spring, value]);

  return <motion.span>{display}</motion.span>;
}

export function StatCard({
  title,
  value,
  format = "number",
  trend,
  icon: Icon,
  className,
  span = "1",
}: StatCardProps) {
  const TrendIcon =
    trend === undefined || trend === 0
      ? Minus
      : trend > 0
        ? TrendingUp
        : TrendingDown;

  const trendColor =
    trend === undefined || trend === 0 ? "Nötr" : trend > 0 ? "Yukarı" : "Aşağı";
  const tone: AtlasWidgetTone =
    trend === undefined || trend === 0
      ? "neutral"
      : trend > 0
        ? "success"
        : "danger";

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.4, 0, 0.2, 1] as const }}
      className={span === "2" ? "sm:col-span-2" : undefined}
    >
      <AtlasInsightCard
        eyebrow={title}
        title={<AnimatedCounter value={value} format={format} />}
        description={
          trend !== undefined
            ? `${trendColor}: ${trend > 0 ? "+" : ""}${trend}% gecen aya gore`
            : "Guncel operasyon ozet metriği"
        }
        tone={tone}
        icon={Icon}
        badge={
          trend !== undefined ? `${trend > 0 ? "+" : ""}${trend}%` : undefined
        }
        className={className}
      >
        {trend !== undefined ? (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <TrendIcon className="h-3.5 w-3.5" />
            <span>gecen aya kiyasla</span>
          </div>
        ) : null}
      </AtlasInsightCard>
    </motion.div>
  );
}
