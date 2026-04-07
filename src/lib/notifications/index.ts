/**
 * ─── Atlas Notification System ───
 * In-app + email notifications, Supabase realtime support.
 */

import { createClient } from "@/lib/supabase/server";
import { sendEmail } from "@/lib/email";

export type NotificationType = "info" | "success" | "warning" | "error" | "system";
export type NotificationChannel = "in_app" | "email" | "push" | "sms";

export interface CreateNotificationParams {
  userId: string;
  title: string;
  body: string;
  type?: NotificationType;
  channel?: NotificationChannel;
  actionUrl?: string;
  metadata?: Record<string, unknown>;
}

export interface Notification {
  id: string;
  user_id: string;
  title: string;
  body: string;
  type: NotificationType;
  channel: NotificationChannel;
  is_read: boolean;
  action_url: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  read_at: string | null;
}

/**
 * Create in-app notification (optionally send email too)
 */
export async function createNotification(params: CreateNotificationParams): Promise<Notification | null> {
  const supabase = await createClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any;

  const { data, error } = await db
    .from("notifications")
    .insert({
      user_id: params.userId,
      title: params.title,
      body: params.body,
      type: params.type ?? "info",
      channel: params.channel ?? "in_app",
      action_url: params.actionUrl,
      metadata: params.metadata ?? {},
    })
    .select()
    .single();

  if (error) {
    console.error("[notifications] Create error:", error);
    return null;
  }

  // Eğer email channel ise, e-posta da gönder
  if (params.channel === "email") {
    const { data: user } = await db
      .from("users")
      .select("email, first_name")
      .eq("id", params.userId)
      .single();

    if (user?.email) {
      await sendEmail({
        to: user.email,
        subject: params.title,
        html: `
          <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto">
            <h2 style="color:#6366f1">${params.title}</h2>
            <p>${params.body}</p>
            ${params.actionUrl ? `<a href="${params.actionUrl}" style="display:inline-block;padding:12px 24px;background:#6366f1;color:white;text-decoration:none;border-radius:8px;margin-top:16px">Detayları Gör</a>` : ""}
          </div>
        `,
      });
    }
  }

  return data as Notification;
}

/**
 * Kullanıcının okunmamış bildirimlerini getir
 */
export async function getUnreadNotifications(userId: string, limit = 20): Promise<Notification[]> {
  const supabase = await createClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any;

  const { data, error } = await db
    .from("notifications")
    .select("*")
    .eq("user_id", userId)
    .eq("is_read", false)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    console.error("[notifications] Fetch error:", error);
    return [];
  }

  return (data ?? []) as Notification[];
}

/**
 * Tüm bildirimleri getir (paginated)
 */
export async function getNotifications(userId: string, page = 1, pageSize = 20) {
  const supabase = await createClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any;
  const offset = (page - 1) * pageSize;

  const { data, count } = await db
    .from("notifications")
    .select("*", { count: "exact" })
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .range(offset, offset + pageSize - 1);

  return {
    notifications: (data ?? []) as Notification[],
    total: count ?? 0,
    page,
    pageSize,
    hasMore: (count ?? 0) > offset + pageSize,
  };
}

/**
 * Bildirimi okundu olarak işaretle
 */
export async function markAsRead(notificationId: string): Promise<boolean> {
  const supabase = await createClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any;

  const { error } = await db
    .from("notifications")
    .update({ is_read: true, read_at: new Date().toISOString() })
    .eq("id", notificationId);

  return !error;
}

export {
  triggerOrderStatusNotification,
  triggerOnboardingNotification,
  triggerSupportTicketNotification,
  triggerLeadStatusNotification,
  triggerLowStockNotification,
  triggerPayoutNotification,
  triggerDocumentNotification,
  triggerSubscriptionNotification,
  triggerSystemNotification,
  triggerBulkNotification,
} from "./triggers";

/**
 * Tüm bildirimleri okundu yap
 */
export async function markAllAsRead(userId: string): Promise<boolean> {
  const supabase = await createClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any;

  const { error } = await db
    .from("notifications")
    .update({ is_read: true, read_at: new Date().toISOString() })
    .eq("user_id", userId)
    .eq("is_read", false);

  return !error;
}
