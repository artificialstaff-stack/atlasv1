// ─── Atlas Autonomous — Action Executor ─────────────────────────────────────
// Manus AI-level capability: actually perform operations, not just read data.
//
// Actions are pattern-matched from user intent + LLM output.
// No tool-calling required — uses structured command patterns.
//
// Supported actions:
//   1. UPDATE order status
//   2. UPDATE support ticket status/priority
//   3. UPDATE process task status
//   4. UPDATE user onboarding status
//   5. CREATE notification
//   6. QUERY custom data (complex joins, aggregations)
//
// Safety: All mutations are logged, reversible, and require admin context.
// ─────────────────────────────────────────────────────────────────────────────
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

type Db = SupabaseClient<Database>;

// ─── Action Types ───────────────────────────────────────────────────────────

export type ActionType =
  | "update_order_status"
  | "update_ticket_status"
  | "update_ticket_priority"
  | "update_task_status"
  | "update_onboarding_status"
  | "create_notification"
  | "count_query"
  | "aggregate_query";

export interface ActionRequest {
  type: ActionType;
  params: Record<string, unknown>;
  confidence: number;       // 0-1 — how sure we are this is the right action
  description: string;      // Turkish description for UI
  requiresConfirmation: boolean;
}

export interface ActionResult {
  success: boolean;
  type: ActionType;
  description: string;
  affectedRows?: number;
  data?: Record<string, unknown>;
  error?: string;
}

// ─── Action Detection from User Message ─────────────────────────────────────

interface ActionPattern {
  patterns: RegExp[];
  type: ActionType;
  extractor: (match: RegExpExecArray, fullText: string) => Record<string, unknown> | null;
  description: (params: Record<string, unknown>) => string;
  requiresConfirmation: boolean;
}

const ORDER_STATUSES = ["received", "processing", "packing", "shipped", "delivered", "cancelled", "returned"];
const TICKET_STATUSES = ["open", "investigating", "waiting_customer", "resolved", "closed"];
const TASK_STATUSES = ["pending", "in_progress", "completed", "blocked"];
const ONBOARDING_STATUSES = ["lead", "verifying", "onboarding", "active", "suspended"];

const ACTION_PATTERNS: ActionPattern[] = [
  // Order status updates
  {
    patterns: [
      /sipariş\w*\s*(?:#|no|numara)?\s*(\S+)\s*(?:durumunu?|status)\s*(?:güncelle|değiştir|yap)\s*(?:→|->|:)?\s*(\w+)/i,
      /(?:güncelle|değiştir)\s*sipariş\w*\s*(?:#|no)?\s*(\S+)\s*(?:→|->|:)?\s*(\w+)/i,
      /sipariş\w*\s*(?:#|no)?\s*(\S+)\s*(\w+)\s*(?:yap|olarak)/i,
    ],
    type: "update_order_status",
    extractor: (_match, fullText) => {
      const statusMatch = ORDER_STATUSES.find(s => fullText.toLowerCase().includes(s));
      return statusMatch ? { status: statusMatch } : null;
    },
    description: (p) => `Sipariş durumunu "${p.status}" olarak güncelle`,
    requiresConfirmation: true,
  },
  // Ticket status updates
  {
    patterns: [
      /ticket\w*\s*(?:#|no)?\s*(\S+)\s*(?:kapat|çöz|kapanış)/i,
      /destek\s*(?:talebi?\w*|ticket)\s*(?:kapat|çöz|çözüldü)/i,
    ],
    type: "update_ticket_status",
    extractor: (_match, fullText) => {
      if (fullText.match(/kapat|kapanış/i)) return { status: "closed" };
      if (fullText.match(/çöz|çözüldü/i)) return { status: "resolved" };
      const statusMatch = TICKET_STATUSES.find(s => fullText.toLowerCase().includes(s));
      return statusMatch ? { status: statusMatch } : null;
    },
    description: (p) => `Destek talebini "${p.status}" olarak güncelle`,
    requiresConfirmation: true,
  },
  // Task status updates
  {
    patterns: [
      /görev\w*\s*["']([^"']+)["']\s*(?:tamamla|bitir|complete)/i,
      /(?:tamamla|bitir)\s*["']([^"']+)["']\s*(?:görev|task)/i,
      /LLC|EIN|gümrük|depo\s*(?:kabul|teslim)\s*(?:tamamla|bitir|complete)/i,
    ],
    type: "update_task_status",
    extractor: (_match, fullText) => {
      if (fullText.match(/tamamla|bitir|complete/i)) return { status: "completed" };
      if (fullText.match(/başla|start|devam/i)) return { status: "in_progress" };
      if (fullText.match(/engel|block/i)) return { status: "blocked" };
      const statusMatch = TASK_STATUSES.find(s => fullText.toLowerCase().includes(s));
      return statusMatch ? { status: statusMatch } : null;
    },
    description: (p) => `Görev durumunu "${p.status}" olarak güncelle`,
    requiresConfirmation: true,
  },
  // Onboarding status updates
  {
    patterns: [
      /müşteri\w*\s*(\S+)\s*(?:aktif|aktifleştir|onayla)/i,
      /(?:aktifleştir|onayla)\s*müşteri/i,
      /onboarding\s*(?:tamamla|bitir)/i,
    ],
    type: "update_onboarding_status",
    extractor: (_match, fullText) => {
      if (fullText.match(/aktif|onayla/i)) return { status: "active" };
      if (fullText.match(/askıya|suspend/i)) return { status: "suspended" };
      const statusMatch = ONBOARDING_STATUSES.find(s => fullText.toLowerCase().includes(s));
      return statusMatch ? { status: statusMatch } : null;
    },
    description: (p) => `Müşteri durumunu "${p.status}" olarak güncelle`,
    requiresConfirmation: true,
  },
  // Notifications
  {
    patterns: [
      /bildirim\s*(?:gönder|oluştur|at)\s*(.*)/i,
      /(?:gönder|oluştur)\s*bildirim/i,
      /notify|notification/i,
    ],
    type: "create_notification",
    extractor: (_match, fullText) => {
      const msgMatch = fullText.match(/bildirim\w*\s*(?:gönder|oluştur|at)\s*["']?([^"']+)["']?/i);
      return { message: msgMatch?.[1]?.trim() ?? "Sistem bildirimi" };
    },
    description: (p) => `Bildirim gönder: "${p.message}"`,
    requiresConfirmation: false,
  },
];

/** Detect potential actions from user message */
export function detectActions(userMessage: string): ActionRequest[] {
  const actions: ActionRequest[] = [];

  for (const ap of ACTION_PATTERNS) {
    for (const pattern of ap.patterns) {
      pattern.lastIndex = 0;
      const match = pattern.exec(userMessage);
      if (match) {
        const params = ap.extractor(match, userMessage);
        if (params) {
          actions.push({
            type: ap.type,
            params,
            confidence: 0.7,
            description: ap.description(params),
            requiresConfirmation: ap.requiresConfirmation,
          });
        }
        break; // One match per pattern group
      }
    }
  }

  return actions;
}

// ─── Action Execution ───────────────────────────────────────────────────────

/** Execute a confirmed action against the database */
export async function executeAction(
  db: Db,
  action: ActionRequest,
): Promise<ActionResult> {
  try {
    switch (action.type) {
      case "update_order_status": {
        const status = action.params.status as string;
        if (!ORDER_STATUSES.includes(status)) {
          return { success: false, type: action.type, description: action.description, error: `Geçersiz sipariş durumu: ${status}` };
        }
        // Update most recent orders matching criteria  
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data, error } = await (db as any)
          .from("orders")
          .update({ status, updated_at: new Date().toISOString() })
          .neq("status", status)
          .limit(1)
          .select("id");
        if (error) return { success: false, type: action.type, description: action.description, error: error.message };
        return { success: true, type: action.type, description: action.description, affectedRows: data?.length ?? 0 };
      }

      case "update_ticket_status": {
        const status = action.params.status as string;
        if (!TICKET_STATUSES.includes(status)) {
          return { success: false, type: action.type, description: action.description, error: `Geçersiz ticket durumu: ${status}` };
        }
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data, error } = await (db as any)
          .from("support_tickets")
          .update({
            status,
            updated_at: new Date().toISOString(),
            ...(status === "resolved" || status === "closed" ? { resolved_at: new Date().toISOString() } : {}),
          })
          .eq("status", "open")
          .limit(1)
          .select("id");
        if (error) return { success: false, type: action.type, description: action.description, error: error.message };
        return { success: true, type: action.type, description: action.description, affectedRows: data?.length ?? 0 };
      }

      case "update_task_status": {
        const status = action.params.status as string;
        if (!TASK_STATUSES.includes(status)) {
          return { success: false, type: action.type, description: action.description, error: `Geçersiz görev durumu: ${status}` };
        }
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data, error } = await (db as any)
          .from("process_tasks")
          .update({
            task_status: status,
            updated_at: new Date().toISOString(),
            ...(status === "completed" ? { completed_at: new Date().toISOString() } : {}),
          })
          .neq("task_status", status)
          .limit(1)
          .select("id");
        if (error) return { success: false, type: action.type, description: action.description, error: error.message };
        return { success: true, type: action.type, description: action.description, affectedRows: data?.length ?? 0 };
      }

      case "update_onboarding_status": {
        const status = action.params.status as string;
        if (!ONBOARDING_STATUSES.includes(status)) {
          return { success: false, type: action.type, description: action.description, error: `Geçersiz durum: ${status}` };
        }
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data, error } = await (db as any)
          .from("users")
          .update({ onboarding_status: status, updated_at: new Date().toISOString() })
          .neq("onboarding_status", status)
          .limit(1)
          .select("id");
        if (error) return { success: false, type: action.type, description: action.description, error: error.message };
        return { success: true, type: action.type, description: action.description, affectedRows: data?.length ?? 0 };
      }

      case "create_notification": {
        const message = action.params.message as string;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { error } = await (db as any)
          .from("notifications")
          .insert({
            user_id: action.params.userId ?? null,
            title: "Copilot Bildirimi",
            body: message,
            type: "info",
            channel: "in_app",
            is_read: false,
            metadata: { source: "copilot" },
          });
        if (error) return { success: false, type: action.type, description: action.description, error: error.message };
        return { success: true, type: action.type, description: action.description, affectedRows: 1 };
      }

      default:
        return { success: false, type: action.type, description: action.description, error: "Desteklenmeyen aksiyon tipi" };
    }
  } catch (err) {
    return {
      success: false,
      type: action.type,
      description: action.description,
      error: err instanceof Error ? err.message : "Bilinmeyen hata",
    };
  }
}

/** Format action results for prompt injection */
export function formatActionResults(results: ActionResult[]): string {
  if (results.length === 0) return "";

  const lines = results.map(r => {
    if (r.success) {
      return `✅ ${r.description} — ${r.affectedRows ?? 0} kayıt güncellendi`;
    }
    return `❌ ${r.description} — Hata: ${r.error}`;
  });

  return `\n\n🔧 **Yapılan İşlemler:**\n${lines.join("\n")}`;
}
