"use client";

import { useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import type { RealtimeChannel } from "@supabase/supabase-js";

type SubscriptionEvent = "INSERT" | "UPDATE" | "DELETE" | "*";

interface UseRealtimeOptions {
  /** Supabase tablo adı */
  table: string;
  /** Dinlenecek olaylar (varsayılan: tümü) */
  event?: SubscriptionEvent;
  /** Filtre: column=eq.value */
  filter?: string;
  /** Değişiklikte invalidate edilecek query key'ler */
  queryKeys: string[][];
  /** Etkin mi? (varsayılan: true) */
  enabled?: boolean;
}

/**
 * Supabase Realtime subscription hook
 *
 * Tablo değişikliklerini dinler ve ilgili TanStack Query cache'ini otomatik
 * invalidate eder. Böylece kullanıcı sayfayı yenilemeden güncel veriyi görür.
 *
 * Kullanım:
 * ```tsx
 * useRealtime({
 *   table: "orders",
 *   event: "UPDATE",
 *   queryKeys: [["orders"], ["admin-kpis"]],
 * });
 * ```
 */
export function useRealtime({
  table,
  event = "*",
  filter,
  queryKeys,
  enabled = true,
}: UseRealtimeOptions) {
  const queryClient = useQueryClient();
  const channelRef = useRef<RealtimeChannel | null>(null);

  useEffect(() => {
    if (!enabled) return;

    const supabase = createClient();

    const channelName = `realtime-${table}-${event}-${filter ?? "all"}`;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const channelConfig: any = {
      event,
      schema: "public",
      table,
    };

    if (filter) {
      channelConfig.filter = filter;
    }

    const channel = supabase
      .channel(channelName)
      .on("postgres_changes", channelConfig, () => {
        // Değişiklik geldiğinde ilgili query'leri invalidate et
        queryKeys.forEach((key) => {
          queryClient.invalidateQueries({ queryKey: key });
        });
      })
      .subscribe();

    channelRef.current = channel;

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [table, event, filter, queryKeys, enabled, queryClient]);
}

/**
 * Sipariş tablosu değişikliklerini dinler
 */
export function useOrdersRealtime(enabled = true) {
  useRealtime({
    table: "orders",
    queryKeys: [["orders"], ["admin-kpis"]],
    enabled,
  });
}

/**
 * Destek talebi değişikliklerini dinler
 */
export function useTicketsRealtime(enabled = true) {
  useRealtime({
    table: "support_tickets",
    queryKeys: [["tickets"], ["my-tickets"]],
    enabled,
  });
}

/**
 * Envanter hareketlerini dinler
 */
export function useInventoryRealtime(enabled = true) {
  useRealtime({
    table: "inventory_movements",
    queryKeys: [["inventory-movements"], ["products"]],
    enabled,
  });
}

/**
 * Lead/başvuru değişikliklerini dinler
 */
export function useLeadsRealtime(enabled = true) {
  useRealtime({
    table: "contact_submissions",
    queryKeys: [["leads"], ["admin-kpis"]],
    enabled,
  });
}
