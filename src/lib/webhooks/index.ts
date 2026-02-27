/**
 * ─── Atlas Platform — Webhook Delivery System ───
 * Outgoing webhooks to notify external systems of events.
 * Supports: order.created, order.status_changed, invoice.paid, user.registered
 */

import { createAdminClient } from "@/lib/supabase/admin";
import crypto from "crypto";

// ─── Types ──────────────────────────────────────────────
export type WebhookEvent =
  | "order.created"
  | "order.status_changed"
  | "invoice.created"
  | "invoice.paid"
  | "user.registered"
  | "product.created"
  | "product.updated"
  | "ticket.created"
  | "ticket.resolved";

export interface WebhookPayload {
  event: WebhookEvent;
  timestamp: string;
  data: Record<string, unknown>;
}

export interface WebhookEndpoint {
  id: string;
  url: string;
  secret: string;
  events: WebhookEvent[];
  isActive: boolean;
}

// ─── Signature Generation ───────────────────────────────
function generateSignature(payload: string, secret: string): string {
  return crypto
    .createHmac("sha256", secret)
    .update(payload)
    .digest("hex");
}

// ─── Delivery ───────────────────────────────────────────
export async function deliverWebhook(
  endpoint: WebhookEndpoint,
  payload: WebhookPayload
): Promise<{ success: boolean; statusCode?: number; error?: string }> {
  const body = JSON.stringify(payload);
  const signature = generateSignature(body, endpoint.secret);

  try {
    const response = await fetch(endpoint.url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Atlas-Signature": signature,
        "X-Atlas-Event": payload.event,
        "X-Atlas-Timestamp": payload.timestamp,
        "User-Agent": "Atlas-Platform-Webhook/1.0",
      },
      body,
      signal: AbortSignal.timeout(10_000), // 10s timeout
    });

    return {
      success: response.ok,
      statusCode: response.status,
    };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Unknown error",
    };
  }
}

// ─── Fan-Out: Send to all matching endpoints ────────────
export async function dispatchWebhookEvent(
  event: WebhookEvent,
  data: Record<string, unknown>
): Promise<void> {
  const payload: WebhookPayload = {
    event,
    timestamp: new Date().toISOString(),
    data,
  };

  // In a real system, webhook endpoints would be stored in DB.
  // For now, check for a global webhook URL in env.
  const webhookUrl = process.env.ATLAS_WEBHOOK_URL;
  const webhookSecret = process.env.ATLAS_WEBHOOK_SECRET || "atlas-default-secret";

  if (!webhookUrl) return;

  const endpoint: WebhookEndpoint = {
    id: "env-default",
    url: webhookUrl,
    secret: webhookSecret,
    events: [event], // Matches all events from env
    isActive: true,
  };

  const result = await deliverWebhook(endpoint, payload);

  // Log delivery attempt
  try {
    const adminClient = createAdminClient();
    await adminClient.from("audit_logs").insert({
      action: "webhook.delivered",
      entity_type: "webhook",
      entity_id: endpoint.id,
      metadata: {
        event,
        url: endpoint.url,
        success: result.success,
        statusCode: result.statusCode,
        error: result.error,
      } as unknown as import("@/types/database").Json,
    });
  } catch {
    console.error("[Webhook] Failed to log delivery");
  }
}

// ─── Signature Verification (for incoming webhooks) ─────
export function verifyWebhookSignature(
  payload: string,
  signature: string,
  secret: string
): boolean {
  const expected = generateSignature(payload, secret);
  try {
    return crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expected)
    );
  } catch {
    return false;
  }
}
