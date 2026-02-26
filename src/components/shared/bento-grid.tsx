"use client";

import { ReactNode } from "react";
import { cn } from "@/lib/utils";

// ─── Bento Grid Ana Bileşen ───

interface BentoGridProps {
  children: ReactNode;
  className?: string;
  cols?: 2 | 3 | 4;
}

export function BentoGrid({ children, className, cols = 4 }: BentoGridProps) {
  return (
    <div
      className={cn(
        "grid gap-4",
        cols === 4 && "grid-cols-1 sm:grid-cols-2 lg:grid-cols-4",
        cols === 3 && "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3",
        cols === 2 && "grid-cols-1 sm:grid-cols-2",
        className
      )}
    >
      {children}
    </div>
  );
}

// ─── Bento Hücre Bileşeni ───

type BentoSpan = "1" | "2" | "3" | "4" | "2x2";

interface BentoCellProps {
  children: ReactNode;
  className?: string;
  span?: BentoSpan;
  /** Hero kart — büyük & belirgin */
  hero?: boolean;
}

export function BentoCell({
  children,
  className,
  span = "1",
  hero = false,
}: BentoCellProps) {
  return (
    <div
      className={cn(
        "rounded-xl border bg-card p-5 text-card-foreground transition-all duration-200",
        // Span variants
        span === "2" && "sm:col-span-2",
        span === "3" && "sm:col-span-2 lg:col-span-3",
        span === "4" && "sm:col-span-2 lg:col-span-4",
        span === "2x2" && "sm:col-span-2 sm:row-span-2",
        // Hero variant
        hero && "bg-gradient-to-br from-card to-muted/50 border-primary/20 glow-brand",
        // Hover
        !hero && "hover:border-primary/15 hover:shadow-md",
        className
      )}
    >
      {children}
    </div>
  );
}
