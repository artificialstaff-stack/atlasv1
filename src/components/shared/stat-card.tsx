"use client";

import { ReactNode, useEffect, useRef, useState } from "react";
import { motion, useSpring, useTransform } from "framer-motion";
import { cn } from "@/lib/utils";
import { LucideIcon, TrendingUp, TrendingDown, Minus } from "lucide-react";

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
    trend === undefined || trend === 0
      ? "text-muted-foreground"
      : trend > 0
        ? "text-success"
        : "text-destructive";

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.4, 0, 0.2, 1] as const }}
      className={cn(
        "rounded-xl border bg-card p-5 transition-all duration-200 hover:border-primary/15 hover:shadow-md",
        span === "2" && "sm:col-span-2",
        className
      )}
    >
      <div className="flex items-start justify-between">
        <div className="space-y-2">
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            {title}
          </p>
          <p className="text-2xl font-bold tabular-nums tracking-tight">
            <AnimatedCounter value={value} format={format} />
          </p>
        </div>
        {Icon && (
          <div className="rounded-lg bg-primary/10 p-2.5">
            <Icon className="h-5 w-5 text-primary" />
          </div>
        )}
      </div>
      {trend !== undefined && (
        <div className={cn("mt-3 flex items-center gap-1 text-xs font-medium", trendColor)}>
          <TrendIcon className="h-3.5 w-3.5" />
          <span>
            {trend > 0 ? "+" : ""}
            {trend}%
          </span>
          <span className="text-muted-foreground">geçen aya kıyasla</span>
        </div>
      )}
    </motion.div>
  );
}
