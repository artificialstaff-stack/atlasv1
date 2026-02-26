"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdmin, requireAuth } from "@/features/auth/guards";
import { revalidatePath } from "next/cache";
import type { ActionResponse } from "@/types";
import {
  contactFormSchema,
  updateLeadStatusSchema,
  createInvitationSchema,
  type ContactFormData,
  type UpdateLeadStatusData,
  type CreateInvitationData,
} from "@/features/schemas";

// =============================================================================
// Anonim: İletişim formu gönderimi (landing page)
// =============================================================================

export async function submitContactForm(
  data: ContactFormData
): Promise<ActionResponse> {
  const parsed = contactFormSchema.safeParse(data);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message };
  }

  const supabase = createAdminClient();
  const { error } = await supabase.from("contact_submissions").insert({
    name: parsed.data.name,
    email: parsed.data.email,
    phone: parsed.data.phone || null,
    company_name: parsed.data.company_name || null,
    message: parsed.data.message,
  });

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true, data: undefined, message: "Form gönderildi" };
}

// =============================================================================
// Admin: Lead durumu güncelleme
// =============================================================================

export async function updateLeadStatus(
  data: UpdateLeadStatusData
): Promise<ActionResponse> {
  await requireAdmin();
  const parsed = updateLeadStatusSchema.safeParse(data);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message };
  }

  const supabase = await createClient();
  const updateData: { status: string; admin_notes?: string } = { status: parsed.data.status };
  if (parsed.data.admin_notes !== undefined) {
    updateData.admin_notes = parsed.data.admin_notes;
  }

  const { error } = await supabase
    .from("contact_submissions")
    .update(updateData)
    .eq("id", parsed.data.id);

  if (error) {
    return { success: false, error: error.message };
  }

  revalidatePath("/admin/leads");
  return { success: true, data: undefined };
}

// =============================================================================
// Admin: Davet oluşturma
// =============================================================================

export async function createInvitation(
  data: CreateInvitationData
): Promise<ActionResponse<{ token: string; inviteUrl: string }>> {
  await requireAdmin();
  const parsed = createInvitationSchema.safeParse(data);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message };
  }

  const token = crypto.randomUUID();
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7);

  const supabase = await createClient();
  const { error } = await supabase.from("invitations").insert({
    email: parsed.data.email,
    token,
    plan_tier: parsed.data.plan_tier,
    expires_at: expiresAt.toISOString(),
  });

  if (error) {
    return { success: false, error: error.message };
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const inviteUrl = `${appUrl}/register?token=${token}`;

  revalidatePath("/admin/leads");
  return {
    success: true,
    data: { token, inviteUrl },
    message: "Davet linki oluşturuldu",
  };
}
