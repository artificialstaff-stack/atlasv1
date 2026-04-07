"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import type { Notification } from "@/lib/notifications";

/**
 * Bildirim hook'u — Supabase Realtime + fallback API polling.
 * Yeni bildirim geldiğinde anında toast gösterir.
 */
export function useNotifications(pollIntervalMs = 60_000) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const channelRef = useRef<ReturnType<ReturnType<typeof createClient>["channel"]> | null>(null);
  const userIdRef = useRef<string | null>(null);

  const fetchNotifications = useCallback(async () => {
    try {
      const res = await fetch("/api/notifications?page=1&pageSize=50");
      if (!res.ok) return;
      const data = await res.json();
      setNotifications(data.notifications ?? []);
      setUnreadCount(
        (data.notifications ?? []).filter((n: Notification) => !n.is_read).length
      );
    } catch {
      // Sessiz hata
    } finally {
      setLoading(false);
    }
  }, []);

  // Supabase Realtime ile anlık bildirim dinleme
  useEffect(() => {
    const supabase = createClient();

    // Kullanıcı ID'sini al
    supabase.auth.getUser().then(({ data }) => {
      const userId = data.user?.id;
      if (!userId) return;

      userIdRef.current = userId;

      // Realtime channel oluştur
      const channel = supabase
        .channel(`notifications:${userId}`)
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "notifications",
            filter: `user_id=eq.${userId}`,
          },
          (payload) => {
            const n = payload.new as Notification;
            // State'e ekle
            setNotifications((prev) => [n, ...prev]);
            setUnreadCount((c) => c + 1);
            // Toast bildirimi göster
            const toastFn =
              n.type === "success" ? toast.success :
              n.type === "error" ? toast.error :
              n.type === "warning" ? toast.warning :
              toast;
            toastFn(n.title, {
              description: n.body,
              action: n.action_url
                ? { label: "Görüntüle", onClick: () => { window.location.href = n.action_url!; } }
                : undefined,
              duration: 6000,
            });
          }
        )
        .on(
          "postgres_changes",
          {
            event: "UPDATE",
            schema: "public",
            table: "notifications",
            filter: `user_id=eq.${userId}`,
          },
          (payload) => {
            const updated = payload.new as Notification;
            setNotifications((prev) =>
              prev.map((n) => (n.id === updated.id ? updated : n))
            );
            if (updated.is_read) {
              setUnreadCount((c) => Math.max(0, c - 1));
            }
          }
        )
        .subscribe();

      channelRef.current = channel;
    });

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
      }
    };
  }, []);

  // İlk yükleme + fallback polling (düşük frekans)
  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, pollIntervalMs);
    return () => clearInterval(interval);
  }, [fetchNotifications, pollIntervalMs]);

  const markRead = useCallback(
    async (id: string) => {
      await fetch("/api/notifications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "mark_read", notificationId: id }),
      });
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, is_read: true } : n))
      );
      setUnreadCount((c) => Math.max(0, c - 1));
    },
    []
  );

  const markAllRead = useCallback(async () => {
    await fetch("/api/notifications", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "mark_all_read" }),
    });
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
    setUnreadCount(0);
  }, []);

  return {
    notifications,
    unreadCount,
    loading,
    markRead,
    markAllRead,
    refresh: fetchNotifications,
  };
}
