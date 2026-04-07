"use client";

import { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { AtlasStackGrid } from "@/components/portal/atlas-widget-kit";

// ─── Bento Grid Ana Bileşen ───

interface BentoGridProps {
  children: ReactNode;
  className?: string;
  cols?: 2 | 3 | 4;
}

export function BentoGrid({ children, className, cols = 4 }: BentoGridProps) {
  const columns = cols === 4 ? "four" : cols === 3 ? "three" : "two";
  return (
    <AtlasStackGrid columns={columns} className={className}>
      {children}
    </AtlasStackGrid>
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
        "atlas-noise rounded-[1.6rem] p-5 text-card-foreground transition-all duration-300",
        hero ? "portal-surface-hero glow-brand" : "portal-surface-secondary hover:-translate-y-0.5 hover:border-primary/18 hover:shadow-[0_24px_60px_rgba(0,0,0,0.22)]",
        // Span variants
        span === "2" && "sm:col-span-2",
        span === "3" && "sm:col-span-2 lg:col-span-3",
        span === "4" && "sm:col-span-2 lg:col-span-4",
        span === "2x2" && "sm:col-span-2 sm:row-span-2",
        className
      )}
    >
      {children}
    </div>
  );
}
