/**
 * Atlas Platform — Realtime Notifications Hook
 * Supabase Realtime ile canlı bildirim dinleme.
 * postgres_changes ile notifications tablosunu izler.
 */
"use client";

import { useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { useNotificationStore } from "@/lib/store/notification-store";
import type { RealtimeChannel } from "@supabase/supabase-js";
import type { NotificationRow } from "@/types/database";

/**
 * Supabase Realtime ile bildirimleri canlı dinler.
 * Yeni bildirim geldiğinde Zustand store'a ekler.
 * Component unmount'ta channel'ı temizler.
 */
export function useRealtimeNotifications(userId: string | undefined) {
  const addNotification = useNotificationStore((s) => s.addNotification);

  useEffect(() => {
    if (!userId) return;

    const supabase = createClient();

    const channel: RealtimeChannel = supabase
      .channel(`notifications:${userId}`)
      .on(
        "postgres_changes" as never,
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${userId}`,
        },
        (payload: { new: NotificationRow }) => {
          const n = payload.new;
          addNotification({
            title: n.title,
            message: n.body || undefined,
            type: n.type === "system" ? "info" : n.type,
          });
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, addNotification]);
}

/**
 * Bildirimleri veritabanından çek (ilk yükleme).
 * Son 50 okunmamış bildirimi getirir.
 */
export function useLoadNotifications(userId: string | undefined) {
  const addNotification = useNotificationStore((s) => s.addNotification);

  const loadNotifications = useCallback(async () => {
    if (!userId) return;

    const supabase = createClient();
    const { data } = await supabase
      .from("notifications")
      .select("*")
      .eq("user_id", userId)
      .eq("is_read", false)
      .order("created_at", { ascending: false })
      .limit(50);

    if (data) {
      for (const n of data) {
        addNotification({
          title: n.title,
          message: n.body || undefined,
          type: (n.type as "info" | "success" | "warning" | "error") || "info",
        });
      }
    }
  }, [userId, addNotification]);

  useEffect(() => {
    loadNotifications();
  }, [loadNotifications]);
}

/**
 * Bildirimi okundu olarak işaretle (DB'de).
 */
export async function markNotificationRead(notificationId: string) {
  const supabase = createClient();
  await supabase
    .from("notifications")
    .update({ is_read: true, read_at: new Date().toISOString() })
    .eq("id", notificationId);
}

/**
 * Tüm bildirimleri okundu olarak işaretle (DB'de).
 */
export async function markAllNotificationsRead(userId: string) {
  const supabase = createClient();
  await supabase
    .from("notifications")
    .update({ is_read: true, read_at: new Date().toISOString() })
    .eq("user_id", userId)
    .eq("is_read", false);
}
