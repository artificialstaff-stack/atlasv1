"use server";

import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/features/auth/guards";
import { revalidatePath } from "next/cache";
import type { ActionResponse } from "@/types";
import {
  updateCustomerSchema,
  type UpdateCustomerData,
} from "@/features/schemas";
import { triggerOnboardingNotification } from "@/lib/notifications";

// =============================================================================
// Admin: Müşteri profili güncelleme
// =============================================================================

export async function updateCustomer(
  data: UpdateCustomerData
): Promise<ActionResponse> {
  await requireAdmin();
  const parsed = updateCustomerSchema.safeParse(data);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message };
  }

  const { id, ...updateFields } = parsed.data;
  const supabase = await createClient();

  const { error } = await supabase
    .from("users")
    .update(updateFields)
    .eq("id", id);

  if (error) {
    return { success: false, error: error.message };
  }

  revalidatePath("/admin/customers");
  revalidatePath(`/admin/customers/${id}`);
  return { success: true, data: undefined };
}

// =============================================================================
// Admin: Onboarding durumu güncelleme
// =============================================================================

export async function updateOnboardingStatus(
  userId: string,
  status: string
): Promise<ActionResponse> {
  await requireAdmin();

  const supabase = await createClient();

  // Mevcut durumu çek (bildirim için)
  const { data: customer } = await supabase
    .from("users")
    .select("onboarding_status")
    .eq("id", userId)
    .single();

  const { error } = await supabase
    .from("users")
    .update({ onboarding_status: status })
    .eq("id", userId);

  if (error) {
    return { success: false, error: error.message };
  }

  // Müşteriye bildirim gönder
  await triggerOnboardingNotification(
    userId,
    userId,
    customer?.onboarding_status ?? "",
    status
  );

  revalidatePath("/admin/customers");
  revalidatePath(`/admin/customers/${userId}`);
  return { success: true, data: undefined };
}
