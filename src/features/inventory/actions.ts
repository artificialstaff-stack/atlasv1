"use server";

import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/features/auth/guards";
import { revalidatePath } from "next/cache";
import type { ActionResponse } from "@/types";
import {
  stockAdjustmentSchema,
  createProductSchema,
  updateProductSchema,
  type StockAdjustmentData,
  type CreateProductData,
  type UpdateProductData,
} from "@/features/schemas";

// =============================================================================
// Admin: Ürün oluşturma
// =============================================================================

export async function createProduct(
  data: CreateProductData
): Promise<ActionResponse<{ id: string }>> {
  const user = await requireAdmin();
  const parsed = createProductSchema.safeParse(data);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message };
  }

  const supabase = await createClient();
  const { data: product, error } = await supabase
    .from("products")
    .insert({
      owner_id: parsed.data.owner_id,
      name: parsed.data.name,
      sku: parsed.data.sku,
      hs_code: parsed.data.hs_code || null,
      description: parsed.data.description || null,
      base_price: parsed.data.base_price,
    })
    .select("id")
    .single();

  if (error) {
    return { success: false, error: error.message };
  }

  revalidatePath("/admin/inventory");
  return { success: true, data: { id: product.id } };
}

// =============================================================================
// Admin: Ürün güncelleme
// =============================================================================

export async function updateProduct(
  data: UpdateProductData
): Promise<ActionResponse> {
  await requireAdmin();
  const parsed = updateProductSchema.safeParse(data);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message };
  }

  const { id, ...updateFields } = parsed.data;
  const supabase = await createClient();

  const { error } = await supabase
    .from("products")
    .update(updateFields)
    .eq("id", id);

  if (error) {
    return { success: false, error: error.message };
  }

  revalidatePath("/admin/inventory");
  return { success: true, data: undefined };
}

// =============================================================================
// Admin: Stok hareketi kaydet (append-only)
// =============================================================================

export async function recordStockMovement(
  data: StockAdjustmentData
): Promise<ActionResponse> {
  const user = await requireAdmin();
  const parsed = stockAdjustmentSchema.safeParse(data);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("inventory_movements").insert({
    product_id: parsed.data.product_id,
    movement_type: parsed.data.movement_type,
    location: parsed.data.location,
    quantity_delta: parsed.data.quantity_delta,
    note: parsed.data.reference_note || null,
    recorded_by: user.id,
  });

  if (error) {
    return { success: false, error: error.message };
  }

  revalidatePath("/admin/inventory");
  return { success: true, data: undefined, message: "Stok hareketi kaydedildi" };
}
