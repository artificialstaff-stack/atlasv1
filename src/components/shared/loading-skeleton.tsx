"use client";

import { Skeleton } from "@/components/ui/skeleton";

interface LoadingSkeletonProps {
  /** Satır sayısı */
  lines?: number;
  /** Kart şeklinde göster */
  card?: boolean;
  /** Tablo satırı */
  tableRows?: number;
}

export function LoadingSkeleton({
  lines = 3,
  card = false,
  tableRows,
}: LoadingSkeletonProps) {
  if (tableRows) {
    return (
      <div className="space-y-3">
        {/* Table header */}
        <div className="flex gap-4">
          <Skeleton className="h-8 w-full" />
        </div>
        {/* Table rows */}
        {Array.from({ length: tableRows }).map((_, i) => (
          <div key={i} className="flex gap-4">
            <Skeleton className="h-12 w-full" />
          </div>
        ))}
      </div>
    );
  }

  if (card) {
    return (
      <div className="rounded-lg border p-6 space-y-4">
        <Skeleton className="h-6 w-1/3" />
        <Skeleton className="h-4 w-2/3" />
        {Array.from({ length: lines }).map((_, i) => (
          <Skeleton key={i} className="h-4 w-full" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton key={i} className="h-4 w-full" />
      ))}
    </div>
  );
}

/**
 * Dashboard KPI kartları için iskelet yükleme
 */
export function KPICardsSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="rounded-lg border p-6 space-y-3">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-8 w-16" />
          <Skeleton className="h-3 w-32" />
        </div>
      ))}
    </div>
  );
}

/**
 * Sayfa yükleme iskelet
 */
export function PageSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-10 w-32" />
      </div>
      <KPICardsSkeleton />
      <LoadingSkeleton tableRows={5} />
    </div>
  );
}
