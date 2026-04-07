"use server";

import { createClient } from "@/lib/supabase/server";
import { requireAdmin, requireAuth } from "@/features/auth/guards";
import { revalidatePath } from "next/cache";
import type { ActionResponse } from "@/types";
import {
  createTicketSchema,
  respondTicketSchema,
  type CreateTicketData,
  type RespondTicketData,
} from "@/features/schemas";
import { triggerSupportTicketNotification } from "@/lib/notifications";

// =============================================================================
// Müşteri: Destek talebi oluşturma
// =============================================================================

export async function createTicket(
  data: CreateTicketData
): Promise<ActionResponse<{ id: string }>> {
  const user = await requireAuth();
  const parsed = createTicketSchema.safeParse(data);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message };
  }

  const supabase = await createClient();
  const { data: ticket, error } = await supabase
    .from("support_tickets")
    .insert({
      user_id: user.id,
      subject: parsed.data.subject,
      description: parsed.data.description,
      priority: parsed.data.priority,
    })
    .select("id")
    .single();

  if (error) {
    return { success: false, error: error.message };
  }

  revalidatePath("/panel/support");
  return {
    success: true,
    data: { id: ticket.id },
    message: "Destek talebiniz oluşturuldu",
  };
}

// =============================================================================
// Admin: Destek talebine yanıt verme
// =============================================================================

export async function respondToTicket(
  data: RespondTicketData
): Promise<ActionResponse> {
  await requireAdmin();
  const parsed = respondTicketSchema.safeParse(data);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message };
  }

  const supabase = await createClient();

  const updateData: {
    admin_response: string;
    status?: string;
    resolved_at?: string;
  } = {
    admin_response: parsed.data.admin_response,
  };

  if (parsed.data.status) {
    updateData.status = parsed.data.status;
    if (parsed.data.status === "resolved") {
      updateData.resolved_at = new Date().toISOString();
    }
  }

  // Talep bilgilerini çek (bildirim için)
  const { data: ticket } = await supabase
    .from("support_tickets")
    .select("id, user_id, subject")
    .eq("id", parsed.data.id)
    .single();

  const { error } = await supabase
    .from("support_tickets")
    .update(updateData)
    .eq("id", parsed.data.id);

  if (error) {
    return { success: false, error: error.message };
  }

  // Müşteriye bildirim gönder
  if (ticket?.user_id) {
    const action = parsed.data.status === "resolved" ? "resolved" : "new_reply";
    await triggerSupportTicketNotification(
      ticket.user_id,
      ticket.id,
      ticket.subject,
      action,
      parsed.data.admin_response
    );
  }

  revalidatePath("/admin/support");
  return { success: true, data: undefined };
}
