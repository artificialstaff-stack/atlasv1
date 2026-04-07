"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import type { ContactStatus, OrderStatus, TaskStatus, TicketStatus } from "@/types/enums";
import { queryKeys } from "./query-keys";

const supabase = createClient();

// Re-export queryKeys for backward compatibility
export { queryKeys };

// =============================================================================
// LEAD / CONTACT MUTATIONS
// =============================================================================

export function useUpdateLeadStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      leadId,
      status,
      adminNotes,
    }: {
      leadId: string;
      status: ContactStatus;
      adminNotes?: string;
    }) => {
      const update: Record<string, unknown> = { status };
      if (adminNotes !== undefined) update.admin_notes = adminNotes;

      const { error } = await supabase
        .from("contact_submissions")
        .update(update)
        .eq("id", leadId);
      if (error) throw error;
    },
    // ─── Optimistic Update ───
    onMutate: async ({ leadId, status }) => {
      await qc.cancelQueries({ queryKey: queryKeys.leads });
      const previousLeads = qc.getQueryData(queryKeys.leads);

      qc.setQueryData(queryKeys.leads, (old: unknown) => {
        if (!Array.isArray(old)) return old;
        return old.map((lead: Record<string, unknown>) =>
          lead.id === leadId ? { ...lead, status } : lead
        );
      });

      return { previousLeads };
    },
    onError: (_err, _vars, context) => {
      if (context?.previousLeads) {
        qc.setQueryData(queryKeys.leads, context.previousLeads);
      }
      toast.error("Lead durumu güncellenemedi");
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: queryKeys.leads });
      qc.invalidateQueries({ queryKey: queryKeys.adminKpis });
    },
    onSuccess: () => {
      toast.success("Lead durumu güncellendi");
    },
  });
}

export function useCreateInvitation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      email,
      planTier,
    }: {
      email: string;
      planTier: string;
    }) => {
      const token = crypto.randomUUID();
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7);

      const { error } = await supabase.from("invitations").insert({
        email,
        token,
        plan_tier: planTier,
        expires_at: expiresAt.toISOString(),
      });
      if (error) throw error;

      const inviteUrl = `${window.location.origin}/register?token=${token}`;
      return inviteUrl;
    },
    onSuccess: (inviteUrl) => {
      navigator.clipboard.writeText(inviteUrl);
      qc.invalidateQueries({ queryKey: queryKeys.leads });
      toast.success("Davet linki oluşturuldu ve kopyalandı!", {
        description: inviteUrl,
      });
    },
    onError: () => toast.error("Davet oluşturulamadı"),
  });
}

// =============================================================================
// CUSTOMER MUTATIONS
// =============================================================================

export function useUpdateCustomer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      customerId,
      data,
    }: {
      customerId: string;
      data: Record<string, unknown>;
    }) => {
      const { error } = await supabase
        .from("users")
        .update(data)
        .eq("id", customerId);
      if (error) throw error;
    },
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: queryKeys.customer(vars.customerId) });
      qc.invalidateQueries({ queryKey: queryKeys.customers() });
      toast.success("Müşteri güncellendi");
    },
    onError: () => toast.error("Müşteri güncellenemedi"),
  });
}

export function useUpdateOnboardingStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      customerId,
      status,
    }: {
      customerId: string;
      status: string;
    }) => {
      const { error } = await supabase
        .from("users")
        .update({ onboarding_status: status })
        .eq("id", customerId);
      if (error) throw error;
    },
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: queryKeys.customer(vars.customerId) });
      qc.invalidateQueries({ queryKey: queryKeys.customers() });
      toast.success("Onboarding durumu güncellendi");
    },
    onError: () => toast.error("Durum güncellenemedi"),
  });
}

// =============================================================================
// ORDER MUTATIONS
// =============================================================================

export function useCreateOrder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: {
      user_id: string;
      platform?: string | null;
      platform_order_id?: string | null;
      destination: string;
      total_amount?: number | null;
      notes?: string | null;
    }) => {
      const { error } = await supabase.from("orders").insert({
        user_id: data.user_id,
        platform: data.platform || null,
        platform_order_id: data.platform_order_id || null,
        destination: data.destination,
        total_amount: data.total_amount || null,
        notes: data.notes || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.orders() });
      qc.invalidateQueries({ queryKey: queryKeys.adminKpis });
      toast.success("Sipariş oluşturuldu");
    },
    onError: (error) =>
      toast.error("Sipariş oluşturulamadı", {
        description: (error as Error).message,
      }),
  });
}

export function useUpdateOrderStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      orderId,
      status,
      trackingRef,
      carrier,
    }: {
      orderId: string;
      status: OrderStatus;
      trackingRef?: string;
      carrier?: string;
    }) => {
      const updateData: Record<string, unknown> = { status };

      if (status === "shipped") {
        updateData.shipped_at = new Date().toISOString();
        if (trackingRef) updateData.tracking_ref = trackingRef;
        if (carrier) updateData.carrier = carrier;
      }
      if (status === "delivered") {
        updateData.delivered_at = new Date().toISOString();
      }

      const { error } = await supabase
        .from("orders")
        .update(updateData)
        .eq("id", orderId);
      if (error) throw error;
    },
    // ─── Optimistic Update ───
    onMutate: async ({ orderId, status }) => {
      // Cancel outgoing refetches
      await qc.cancelQueries({ queryKey: queryKeys.orders() });

      // Snapshot previous value
      const previousOrders = qc.getQueriesData({ queryKey: queryKeys.orders() });

      // Optimistically update the order status in cache
      qc.setQueriesData({ queryKey: queryKeys.orders() }, (old: unknown) => {
        if (!Array.isArray(old)) return old;
        return old.map((order: Record<string, unknown>) =>
          order.id === orderId ? { ...order, status } : order
        );
      });

      return { previousOrders };
    },
    onError: (_err, _vars, context) => {
      // Rollback on error
      if (context?.previousOrders) {
        for (const [queryKey, data] of context.previousOrders) {
          qc.setQueryData(queryKey, data);
        }
      }
      toast.error("Sipariş güncellenemedi");
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: queryKeys.orders() });
      qc.invalidateQueries({ queryKey: queryKeys.adminKpis });
    },
    onSuccess: () => {
      toast.success("Sipariş durumu güncellendi");
    },
  });
}

// =============================================================================
// PRODUCT MUTATIONS
// =============================================================================

export function useCreateProduct() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: {
      owner_id: string;
      name: string;
      sku: string;
      hs_code?: string;
      description?: string;
      base_price: number;
    }) => {
      const { error } = await supabase.from("products").insert(data);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.products() });
      toast.success("Ürün oluşturuldu");
    },
    onError: (error) =>
      toast.error("Ürün oluşturulamadı", {
        description: (error as Error).message,
      }),
  });
}

export function useUpdateProduct() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      productId,
      data,
    }: {
      productId: string;
      data: Record<string, unknown>;
    }) => {
      const { error } = await supabase
        .from("products")
        .update(data)
        .eq("id", productId);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.products() });
      toast.success("Ürün güncellendi");
    },
    onError: () => toast.error("Ürün güncellenemedi"),
  });
}

// =============================================================================
// INVENTORY MUTATIONS
// =============================================================================

export function useRecordStockMovement() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: {
      product_id: string;
      movement_type: string;
      location: string;
      quantity_delta: number;
      note?: string;
    }) => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Oturum gerekli");

      const { error } = await supabase.from("inventory_movements").insert({
        product_id: data.product_id,
        movement_type: data.movement_type,
        location: data.location,
        quantity_delta: data.quantity_delta,
        note: data.note || null,
        recorded_by: user.id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.inventoryMovements() });
      qc.invalidateQueries({ queryKey: queryKeys.products() });
      toast.success("Stok hareketi kaydedildi");
    },
    onError: (error) =>
      toast.error("Stok hareketi kaydedilemedi", {
        description: (error as Error).message,
      }),
  });
}

// =============================================================================
// PROCESS TASK MUTATIONS
// =============================================================================

export function useCreateTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: {
      user_id: string;
      task_name: string;
      task_category?: string;
      notes?: string;
      sort_order?: number;
    }) => {
      const { error } = await supabase.from("process_tasks").insert({
        user_id: data.user_id,
        task_name: data.task_name,
        task_category: data.task_category || null,
        notes: data.notes || null,
        sort_order: data.sort_order ?? 0,
        visibility: "admin_internal",
        task_kind: "execution",
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.processTasks() });
      toast.success("Görev oluşturuldu");
    },
    onError: (error) =>
      toast.error("Görev oluşturulamadı", {
        description: (error as Error).message,
      }),
  });
}

export function useUpdateTaskStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      taskId,
      status,
    }: {
      taskId: string;
      status: TaskStatus;
    }) => {
      const updateData: Record<string, unknown> = {
        task_status: status,
        completed_at: status === "completed" ? new Date().toISOString() : null,
      };

      const { error } = await supabase
        .from("process_tasks")
        .update(updateData)
        .eq("id", taskId);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.processTasks() });
      toast.success("Görev durumu güncellendi");
    },
    onError: () => toast.error("Görev durumu güncellenemedi"),
  });
}

// =============================================================================
// SUPPORT TICKET MUTATIONS
// =============================================================================

export function useCreateTicket() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: {
      subject: string;
      description: string;
      priority?: string;
    }) => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Oturum gerekli");

      const { error } = await supabase.from("support_tickets").insert({
        user_id: user.id,
        subject: data.subject,
        description: data.description,
        priority: data.priority || "medium",
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.tickets() });
      qc.invalidateQueries({ queryKey: queryKeys.myTickets });
      toast.success("Destek talebi oluşturuldu");
    },
    onError: (error) =>
      toast.error("Destek talebi oluşturulamadı", {
        description: (error as Error).message,
      }),
  });
}

export function useRespondToTicket() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      ticketId,
      response,
      status,
    }: {
      ticketId: string;
      response?: string;
      status?: TicketStatus;
    }) => {
      const updateData: Record<string, unknown> = {};
      if (response) updateData.admin_response = response;
      if (status) {
        updateData.status = status;
        if (status === "resolved") {
          updateData.resolved_at = new Date().toISOString();
        }
      }

      if (Object.keys(updateData).length === 0) {
        throw new Error("Lütfen yanıt yazın veya durum seçin");
      }

      const { error } = await supabase
        .from("support_tickets")
        .update(updateData)
        .eq("id", ticketId);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.tickets() });
      toast.success("Destek talebi güncellendi");
    },
    onError: (error) =>
      toast.error((error as Error).message || "Güncelleme başarısız"),
  });
}

// =============================================================================
// CONTACT FORM (PUBLIC — anonim)
// =============================================================================

export function useSubmitContactForm() {
  return useMutation({
    mutationFn: async (data: {
      name: string;
      email: string;
      phone?: string;
      company_name?: string;
      message: string;
    }) => {
      const { error } = await supabase
        .from("contact_submissions")
        .insert(data);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Başvurunuz alındı! En kısa sürede dönüş yapacağız.");
    },
    onError: () =>
      toast.error("Başvuru gönderilemedi, lütfen tekrar deneyin"),
  });
}
