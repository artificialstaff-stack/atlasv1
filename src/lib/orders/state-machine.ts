/**
 * Atlas Platform — Order State Machine
 * Sipariş durumlarını ve geçişlerini yönetir.
 * Geçersiz geçişleri engeller + audit log + email bildirim tetikler.
 */
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

// ─── Types ──────────────────────────────────────────────
export type OrderStatus =
  | "received"
  | "processing"
  | "packing"
  | "shipped"
  | "delivered"
  | "cancelled"
  | "returned";

export interface OrderTransitionResult {
  success: boolean;
  error?: string;
  previousStatus?: OrderStatus;
  newStatus?: OrderStatus;
}

// ─── State Machine: Geçerli Geçişler ───────────────────
const VALID_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  received: ["processing", "cancelled"],
  processing: ["packing", "cancelled"],
  packing: ["shipped", "cancelled"],
  shipped: ["delivered", "returned"],
  delivered: ["returned"],
  cancelled: [], // Terminal state
  returned: [], // Terminal state
};

export function canTransition(from: OrderStatus, to: OrderStatus): boolean {
  return VALID_TRANSITIONS[from]?.includes(to) ?? false;
}

export function getNextStatuses(current: OrderStatus): OrderStatus[] {
  return VALID_TRANSITIONS[current] || [];
}

export function isTerminalStatus(status: OrderStatus): boolean {
  return (VALID_TRANSITIONS[status]?.length ?? 0) === 0;
}

// ─── Status Labels & Colors ─────────────────────────────
export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  received: "Alındı",
  processing: "İşleniyor",
  packing: "Paketleniyor",
  shipped: "Kargoya Verildi",
  delivered: "Teslim Edildi",
  cancelled: "İptal Edildi",
  returned: "İade Edildi",
};

export const ORDER_STATUS_COLORS: Record<OrderStatus, string> = {
  received: "bg-blue-100 text-blue-800",
  processing: "bg-amber-100 text-amber-800",
  packing: "bg-purple-100 text-purple-800",
  shipped: "bg-indigo-100 text-indigo-800",
  delivered: "bg-green-100 text-green-800",
  cancelled: "bg-red-100 text-red-800",
  returned: "bg-gray-100 text-gray-800",
};

// ─── State Machine Transition ───────────────────────────
export async function transitionOrderStatus(
  orderId: string,
  newStatus: OrderStatus,
  options?: {
    trackingRef?: string;
    carrier?: string;
    notes?: string;
    userId?: string;
  },
): Promise<OrderTransitionResult> {
  const supabase = await createClient();

  // 1. Mevcut siparişi al
  const { data: order, error: fetchError } = await supabase
    .from("orders")
    .select("id, status, user_id")
    .eq("id", orderId)
    .single();

  if (fetchError || !order) {
    return { success: false, error: "Sipariş bulunamadı" };
  }

  const currentStatus = order.status as OrderStatus;

  // 2. Geçiş validasyonu
  if (!canTransition(currentStatus, newStatus)) {
    return {
      success: false,
      error: `Geçersiz durum geçişi: ${ORDER_STATUS_LABELS[currentStatus]} → ${ORDER_STATUS_LABELS[newStatus]}`,
    };
  }

  // 3. Güncelle
  const updateData: Record<string, unknown> = {
    status: newStatus,
    updated_at: new Date().toISOString(),
  };

  if (options?.trackingRef) updateData.tracking_ref = options.trackingRef;
  if (options?.carrier) updateData.carrier = options.carrier;
  if (options?.notes) updateData.notes = options.notes;
  if (newStatus === "shipped") updateData.shipped_at = new Date().toISOString();
  if (newStatus === "delivered") updateData.delivered_at = new Date().toISOString();

  const { error: updateError } = await supabase
    .from("orders")
    .update(updateData)
    .eq("id", orderId);

  if (updateError) {
    return { success: false, error: updateError.message };
  }

  // 4. Audit log oluştur (admin client ile — RLS bypass)
  try {
    const adminClient = createAdminClient();
    await adminClient.from("audit_logs").insert({
      user_id: options?.userId || null,
      action: "order.status_changed",
      entity_type: "order",
      entity_id: orderId,
      metadata: {
        previous_status: currentStatus,
        new_status: newStatus,
        tracking_ref: options?.trackingRef,
        carrier: options?.carrier,
      },
    });
  } catch {
    // Audit log failure shouldn't block the transition
    console.error("[OrderStateMachine] Audit log failed");
  }

  // 5. Bildirim oluştur
  try {
    const adminClient = createAdminClient();
    await adminClient.from("notifications").insert({
      user_id: order.user_id,
      title: `Sipariş ${ORDER_STATUS_LABELS[newStatus]}`,
      body: `Siparişinizin durumu "${ORDER_STATUS_LABELS[newStatus]}" olarak güncellendi.`,
      type: newStatus === "cancelled" ? "warning" : "info",
      channel: "in_app",
      action_url: `/panel/orders/${orderId}`,
      is_read: false,
    });
  } catch {
    console.error("[OrderStateMachine] Notification failed");
  }

  return {
    success: true,
    previousStatus: currentStatus,
    newStatus,
  };
}

// ─── Bulk Status Check ──────────────────────────────────
export function getOrderProgress(status: OrderStatus): number {
  const progressMap: Record<OrderStatus, number> = {
    received: 10,
    processing: 30,
    packing: 50,
    shipped: 75,
    delivered: 100,
    cancelled: 0,
    returned: 0,
  };
  return progressMap[status] ?? 0;
}
