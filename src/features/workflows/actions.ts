"use server";

import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/features/auth/guards";
import { revalidatePath } from "next/cache";
import type { ActionResponse } from "@/types";
import {
  createTaskSchema,
  updateTaskStatusSchema,
  type CreateTaskData,
  type UpdateTaskStatusData,
} from "@/features/schemas";

// =============================================================================
// Admin: Süreç görevi oluşturma
// =============================================================================

export async function createProcessTask(
  data: CreateTaskData
): Promise<ActionResponse<{ id: string }>> {
  await requireAdmin();
  const parsed = createTaskSchema.safeParse(data);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message };
  }

  const supabase = await createClient();
  const { data: task, error } = await supabase
    .from("process_tasks")
    .insert({
      user_id: parsed.data.user_id,
      task_name: parsed.data.task_name,
      task_category: parsed.data.task_category || null,
      notes: parsed.data.notes || null,
      sort_order: parsed.data.sort_order,
    })
    .select("id")
    .single();

  if (error) {
    return { success: false, error: error.message };
  }

  revalidatePath("/admin/workflows");
  revalidatePath(`/admin/customers/${parsed.data.user_id}`);
  return { success: true, data: { id: task.id } };
}

// =============================================================================
// Admin: Görev durumu güncelleme
// =============================================================================

export async function updateTaskStatus(
  data: UpdateTaskStatusData
): Promise<ActionResponse> {
  await requireAdmin();
  const parsed = updateTaskStatusSchema.safeParse(data);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message };
  }

  const supabase = await createClient();

  const updateData: {
    task_status: string;
    completed_at: string | null;
  } = {
    task_status: parsed.data.task_status,
    completed_at: parsed.data.task_status === "completed" ? new Date().toISOString() : null,
  };

  const { error } = await supabase
    .from("process_tasks")
    .update(updateData)
    .eq("id", parsed.data.id);

  if (error) {
    return { success: false, error: error.message };
  }

  revalidatePath("/admin/workflows");
  return { success: true, data: undefined };
}

// =============================================================================
// Admin: Yeni müşteri için varsayılan görevler oluştur
// =============================================================================

export async function createDefaultTasks(
  userId: string
): Promise<ActionResponse> {
  await requireAdmin();

  const defaultTasks = [
    { task_name: "LLC Kurulumu", task_category: "legal", sort_order: 1 },
    { task_name: "EIN Kaydı", task_category: "tax", sort_order: 2 },
    { task_name: "Banka Hesabı Açılışı", task_category: "legal", sort_order: 3 },
    { task_name: "Gümrük Broker Ataması", task_category: "customs", sort_order: 4 },
    { task_name: "Pazar Yeri Entegrasyonu", task_category: "marketplace", sort_order: 5 },
    { task_name: "İlk Ürün Depo Kabul", task_category: "logistics", sort_order: 6 },
  ];

  const supabase = await createClient();
  const { error } = await supabase.from("process_tasks").insert(
    defaultTasks.map((task) => ({
      user_id: userId,
      ...task,
    }))
  );

  if (error) {
    return { success: false, error: error.message };
  }

  revalidatePath("/admin/workflows");
  revalidatePath(`/admin/customers/${userId}`);
  return {
    success: true,
    data: undefined,
    message: "Varsayılan görevler oluşturuldu",
  };
}
