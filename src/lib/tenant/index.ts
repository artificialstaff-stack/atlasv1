/**
 * ─── Atlas Platform — Multi-tenant Isolation Service ───
 * Ensures tenant data isolation at the application layer.
 * Works alongside Supabase RLS policies.
 */

import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/types/database";

type TableName = keyof Database["public"]["Tables"];

export interface TenantContext {
  userId: string;
  email: string;
  role: string;
  orgId?: string;
}

/** Get current tenant context from Supabase auth */
export async function getTenantContext(): Promise<TenantContext | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const role = (user.app_metadata?.user_role as string) || "customer";

  return {
    userId: user.id,
    email: user.email ?? "",
    role,
    orgId: user.user_metadata?.org_id as string | undefined,
  };
}

/** Verify a resource belongs to the current tenant */
export async function verifyTenantOwnership(
  table: TableName,
  resourceId: string,
  userIdColumn = "user_id"
): Promise<boolean> {
  const ctx = await getTenantContext();
  if (!ctx) return false;

  // Admins can access all resources
  if (ctx.role === "admin" || ctx.role === "super_admin") return true;

  const supabase = await createClient();
  const { data } = await supabase
    .from(table)
    .select("id")
    .eq("id", resourceId)
    .eq(userIdColumn, ctx.userId)
    .single();

  return !!data;
}

/** Create a tenant-scoped query builder */
export async function tenantQuery(table: TableName) {
  const supabase = await createClient();
  const ctx = await getTenantContext();

  if (!ctx) throw new Error("Authentication required");

  const query = supabase.from(table).select();

  // Non-admin users only see their own data
  if (ctx.role !== "admin" && ctx.role !== "super_admin") {
    return query.eq("user_id", ctx.userId);
  }

  return query;
}

/** Tenant-aware insert — automatically adds user_id */
export async function tenantInsert(
  table: TableName,
  data: Record<string, unknown> | Record<string, unknown>[]
) {
  const ctx = await getTenantContext();
  if (!ctx) throw new Error("Authentication required");

  const supabase = await createClient();
  const rows = Array.isArray(data) ? data : [data];

  const withTenant = rows.map((row) => ({
    ...row,
    user_id: ctx.userId,
  }));

  return supabase.from(table).insert(withTenant);
}

/** Audit-safe tenant isolation check middleware */
export function assertTenantIsolation(requestUserId: string, resourceUserId: string): void {
  if (requestUserId !== resourceUserId) {
    throw new Error("Tenant isolation violation: access denied");
  }
}
