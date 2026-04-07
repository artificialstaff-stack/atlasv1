"use server";

import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/features/auth/guards";
import { revalidatePath } from "next/cache";
import type { ActionResponse } from "@/types";
import {
  createOrderSchema,
  updateOrderStatusSchema,
  type CreateOrderData,
  type UpdateOrderStatusData,
} from "@/features/schemas";
import { triggerOrderStatusNotification } from "@/lib/notifications";

// =============================================================================
// Admin: Sipariş oluşturma
// =============================================================================

export async function createOrder(
  data: CreateOrderData
): Promise<ActionResponse<{ id: string }>> {
  await requireAdmin();
  const parsed = createOrderSchema.safeParse(data);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message };
  }

  const supabase = await createClient();
  const { data: order, error } = await supabase
    .from("orders")
    .insert({
      user_id: parsed.data.user_id,
      platform: parsed.data.platform || null,
      platform_order_id: parsed.data.platform_order_id || null,
      destination: parsed.data.destination,
      total_amount: parsed.data.total_amount || null,
      notes: parsed.data.notes || null,
    })
    .select("id")
    .single();

  if (error) {
    return { success: false, error: error.message };
  }

  revalidatePath("/admin/orders");
  return { success: true, data: { id: order.id } };
}

// =============================================================================
// Admin: Sipariş durumu güncelleme
// =============================================================================

export async function updateOrderStatus(
  data: UpdateOrderStatusData
): Promise<ActionResponse> {
  await requireAdmin();
  const parsed = updateOrderStatusSchema.safeParse(data);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message };
  }

  const supabase = await createClient();

  const updateData: {
    status: string;
    shipped_at?: string;
    tracking_ref?: string;
    carrier?: string;
    delivered_at?: string;
  } = { status: parsed.data.status };

  if (parsed.data.status === "shipped") {
    updateData.shipped_at = new Date().toISOString();
    if (parsed.data.tracking_ref) updateData.tracking_ref = parsed.data.tracking_ref;
    if (parsed.data.carrier) updateData.carrier = parsed.data.carrier;
  }

  if (parsed.data.status === "delivered") {
    updateData.delivered_at = new Date().toISOString();
  }

  // Sipariş bilgilerini çek (bildirim için)
  const { data: order } = await supabase
    .from("orders")
    .select("id, user_id, order_number")
    .eq("id", parsed.data.id)
    .single();

  const { error } = await supabase
    .from("orders")
    .update(updateData)
    .eq("id", parsed.data.id);

  if (error) {
    return { success: false, error: error.message };
  }

  // Müşteriye bildirim gönder
  if (order?.user_id) {
    await triggerOrderStatusNotification(
      order.user_id,
      order.id,
      order.order_number ?? order.id.slice(0, 8),
      "", // oldStatus — mevcut yapıda bilinmiyor
      parsed.data.status
    );
  }

  revalidatePath("/admin/orders");
  return { success: true, data: undefined };
}
