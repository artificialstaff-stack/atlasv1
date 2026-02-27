/**
 * Atlas Platform — Audit Log Service
 * Tüm kritik aksiyonları kaydeder.
 * GDPR ve SOC2 uyumlu denetim izi.
 */
import { createAdminClient } from "@/lib/supabase/admin";
import { headers } from "next/headers";

// ─── Types ──────────────────────────────────────────────
export type AuditAction =
  // Auth
  | "auth.login"
  | "auth.logout"
  | "auth.register"
  | "auth.password_reset"
  // Orders
  | "order.created"
  | "order.status_changed"
  | "order.cancelled"
  // Invoices
  | "invoice.created"
  | "invoice.paid"
  | "invoice.confirmed"
  | "invoice.cancelled"
  // Users
  | "user.profile_updated"
  | "user.role_changed"
  | "user.suspended"
  | "user.activated"
  // Products
  | "product.created"
  | "product.updated"
  | "product.deleted"
  // Inventory
  | "inventory.movement"
  | "inventory.adjustment"
  // Support
  | "ticket.created"
  | "ticket.resolved"
  // Documents
  | "document.uploaded"
  | "document.deleted"
  // Admin
  | "admin.invitation_sent"
  | "admin.settings_changed"
  | "admin.export_data";

export type EntityType =
  | "user"
  | "order"
  | "invoice"
  | "product"
  | "inventory"
  | "ticket"
  | "document"
  | "invitation"
  | "subscription"
  | "setting";

import type { Json } from "@/types/database";

export interface AuditLogEntry {
  userId?: string;
  action: AuditAction;
  entityType: EntityType;
  entityId?: string;
  metadata?: Record<string, unknown>;
}

// ─── Core Function ──────────────────────────────────────
export async function createAuditLog(entry: AuditLogEntry): Promise<void> {
  try {
    const headersList = await headers();
    const ip = headersList.get("x-forwarded-for")?.split(",")[0]?.trim()
      || headersList.get("x-real-ip")
      || "unknown";
    const userAgent = headersList.get("user-agent") || "unknown";

    const adminClient = createAdminClient();
    await adminClient.from("audit_logs").insert({
      user_id: entry.userId || null,
      action: entry.action,
      entity_type: entry.entityType,
      entity_id: entry.entityId || null,
      metadata: (entry.metadata || {}) as Json,
      ip_address: ip !== "unknown" ? ip : null,
      user_agent: userAgent,
    });
  } catch (err) {
    // Audit log failure should never break the main flow
    console.error("[AuditLog] Failed to create log:", err);
  }
}

// ─── Convenience Functions ──────────────────────────────
export async function auditAuth(userId: string, action: "auth.login" | "auth.logout" | "auth.register" | "auth.password_reset") {
  return createAuditLog({ userId, action, entityType: "user", entityId: userId });
}

export async function auditOrder(userId: string, orderId: string, action: "order.created" | "order.status_changed" | "order.cancelled", meta?: Record<string, unknown>) {
  return createAuditLog({ userId, action, entityType: "order", entityId: orderId, metadata: meta });
}

export async function auditInvoice(userId: string, invoiceId: string, action: "invoice.created" | "invoice.paid" | "invoice.confirmed" | "invoice.cancelled", meta?: Record<string, unknown>) {
  return createAuditLog({ userId, action, entityType: "invoice", entityId: invoiceId, metadata: meta });
}

export async function auditUser(adminId: string, targetUserId: string, action: "user.profile_updated" | "user.role_changed" | "user.suspended" | "user.activated", meta?: Record<string, unknown>) {
  return createAuditLog({ userId: adminId, action, entityType: "user", entityId: targetUserId, metadata: meta });
}

export async function auditProduct(userId: string, productId: string, action: "product.created" | "product.updated" | "product.deleted", meta?: Record<string, unknown>) {
  return createAuditLog({ userId, action, entityType: "product", entityId: productId, metadata: meta });
}

export async function auditDocument(userId: string, action: "document.uploaded" | "document.deleted", meta?: Record<string, unknown>) {
  return createAuditLog({ userId, action, entityType: "document", metadata: meta });
}
