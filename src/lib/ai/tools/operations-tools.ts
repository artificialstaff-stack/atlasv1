/* eslint-disable */
// @ts-nocheck
// ─── Atlas AI — Operations & Support Tools (30 tools) ────────────────────────
import { tool } from "./define-tool";
import { z } from "zod";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import { transitionFormSubmission } from "@/lib/workflows/service";

type Db = SupabaseClient<Database>;

const READ_ONLY_TABLES = {
  users: {
    select: "id,email,first_name,last_name,company_name,onboarding_status,created_at",
    defaultOrder: "created_at",
  },
  customer_companies: {
    select: "id,user_id,company_name,company_type,state_of_formation,status,ein_number,formation_date,created_at",
    defaultOrder: "created_at",
  },
  marketplace_accounts: {
    select: "id,user_id,platform,store_name,status,store_url,created_at",
    defaultOrder: "created_at",
  },
  form_submissions: {
    select: "id,form_code,user_id,status,data,created_at",
    defaultOrder: "created_at",
  },
  process_tasks: {
    select: "id,user_id,task_name,task_category,task_status,sort_order,created_at",
    defaultOrder: "created_at",
  },
  notifications: {
    select: "id,user_id,title,body,type,channel,is_read,created_at",
    defaultOrder: "created_at",
  },
  user_subscriptions: {
    select: "id,user_id,plan_tier,status,started_at,current_period_end,monthly_fee,setup_fee",
    defaultOrder: "started_at",
  },
  orders: {
    select: "id,user_id,order_number,status,total_amount,created_at",
    defaultOrder: "created_at",
  },
  products: {
    select: "id,owner_id,name,sku,is_active,stock_turkey,stock_us,created_at",
    defaultOrder: "created_at",
  },
} as const;

export function createOperationsTools(supabase: Db) {
  return {
    // ══════════════════════════════════════════════════════════ READ-ONLY DB EXPLORATION (2)
    db_inspect_read_schema: tool({
      description: "Read-only güvenli schema görünümü. Hangi tabloların AI tarafından sorgulanabildiğini ve kolonlarını listeler.",
      parameters: z.object({}),
      execute: async () => {
        const tables = Object.entries(READ_ONLY_TABLES).map(([table, config]) => ({
          table,
          select: config.select,
          defaultOrder: config.defaultOrder,
          columns: config.select.split(","),
        }));

        return {
          tables,
          count: tables.length,
          mode: "read_only",
        };
      },
    }),

    db_read_table_rows: tool({
      description: "Whitelisted read-only tablo okuma aracı. Sadece güvenli atlas tablolarını listeler.",
      parameters: z.object({
        table: z.enum([
          "users",
          "customer_companies",
          "marketplace_accounts",
          "form_submissions",
          "process_tasks",
          "notifications",
          "user_subscriptions",
          "orders",
          "products",
        ]),
        limit: z.number().optional(),
        order_by: z.string().optional(),
        ascending: z.boolean().optional(),
        filters: z.record(z.string(), z.union([z.string(), z.number(), z.boolean(), z.null()])).optional(),
      }),
      execute: async ({ table, limit = 10, order_by, ascending = false, filters }) => {
        const config = READ_ONLY_TABLES[table];
        let query = supabase
          .from(table)
          .select(config.select)
          .order(order_by ?? config.defaultOrder, { ascending })
          .limit(Math.min(limit, 25));

        if (filters) {
          for (const [key, value] of Object.entries(filters)) {
            query = query.eq(key, value);
          }
        }

        const { data, error } = await query;
        return error
          ? { error: error.message }
          : {
              table,
              rows: data,
              count: data?.length ?? 0,
              readOnly: true,
            };
      },
    }),

    // ══════════════════════════════════════════════════════════ FORM SUBMISSIONS (8)
    list_form_submissions: tool({
      description: "List all form submissions with optional status/form_code filter.",
      parameters: z.object({ form_code: z.string().optional(), status: z.string().optional(), limit: z.number().optional() }),
      execute: async ({ form_code, status, limit = 20 }) => {
        let q = supabase.from("form_submissions").select("id,form_code,user_id,status,admin_notes,assigned_to,created_at,updated_at").order("created_at", { ascending: false }).limit(limit);
        if (form_code) q = q.eq("form_code", form_code);
        if (status) q = q.eq("status", status);
        const { data, error } = await q;
        return error ? { error: error.message } : { submissions: data, count: data?.length };
      },
    }),

    get_submission_by_id: tool({
      description: "Get full details of a specific form submission including its data.",
      parameters: z.object({ submission_id: z.string() }),
      execute: async ({ submission_id }) => {
        const { data, error } = await supabase.from("form_submissions").select("*").eq("id", submission_id).single();
        return error ? { error: error.message } : data;
      },
    }),

    get_submissions_by_form_code: tool({
      description: "Get all submissions for a specific form type.",
      parameters: z.object({ form_code: z.string(), limit: z.number().optional() }),
      execute: async ({ form_code, limit = 20 }) => {
        const { data, error } = await supabase.from("form_submissions").select("id,form_code,user_id,status,created_at").eq("form_code", form_code).order("created_at", { ascending: false }).limit(limit);
        return error ? { error: error.message } : { submissions: data, count: data?.length };
      },
    }),

    get_submissions_by_status: tool({
      description: "Count form submissions grouped by status.",
      parameters: z.object({}),
      execute: async () => {
        const { data, error } = await supabase.from("form_submissions").select("status");
        if (error) return { error: error.message };
        const m: Record<string, number> = {};
        data?.forEach(r => { m[r.status ?? "unknown"] = (m[r.status ?? "unknown"] || 0) + 1; });
        return { counts: m, total: data?.length };
      },
    }),

    update_submission_status: tool({
      description: "Update a form submission's status. Valid: draft, submitted, under_review, needs_correction, approved, rejected, completed.",
      parameters: z.object({
        submission_id: z.string(),
        status: z.enum(["draft", "submitted", "under_review", "needs_correction", "approved", "rejected", "completed"]),
        admin_notes: z.string().optional(),
      }),
      execute: async ({ submission_id, status, admin_notes }) => {
        try {
          const submission = await transitionFormSubmission({
            submissionId: submission_id,
            nextStatus: status,
            adminNotes: admin_notes ?? null,
          });
          return { success: true, submission };
        } catch (error) {
          return { error: error instanceof Error ? error.message : "Status update failed" };
        }
      },
    }),

    assign_submission: tool({
      description: "Assign a form submission to a staff member for review.",
      parameters: z.object({ submission_id: z.string(), assigned_to: z.string() }),
      execute: async ({ submission_id, assigned_to }) => {
        const { error } = await supabase
          .from("form_submissions")
          .update({ assigned_to })
          .eq("id", submission_id);
        if (error) return { error: error.message };
        try {
          const submission = await transitionFormSubmission({
            submissionId: submission_id,
            nextStatus: "under_review",
          });
          return { success: true, submission };
        } catch (transitionError) {
          return {
            error:
              transitionError instanceof Error
                ? transitionError.message
                : "Submission assignment failed",
          };
        }
      },
    }),

    get_pending_submissions: tool({
      description: "Get form submissions that need review (submitted status).",
      parameters: z.object({}),
      execute: async () => {
        const { data, error } = await supabase.from("form_submissions").select("id,form_code,user_id,status,created_at").eq("status", "submitted").order("created_at");
        return error ? { error: error.message } : { pending: data, count: data?.length };
      },
    }),

    get_submission_form_codes: tool({
      description: "Get list of all unique form codes and their submission counts.",
      parameters: z.object({}),
      execute: async () => {
        const { data, error } = await supabase.from("form_submissions").select("form_code");
        if (error) return { error: error.message };
        const m: Record<string, number> = {};
        data?.forEach(r => { m[r.form_code ?? "unknown"] = (m[r.form_code ?? "unknown"] || 0) + 1; });
        return { form_codes: m, total: data?.length };
      },
    }),

    // ══════════════════════════════════════════════════════════ PROCESS TASKS (9)
    list_process_tasks: tool({
      description: "List all process/workflow tasks with optional filters.",
      parameters: z.object({ category: z.string().optional(), status: z.string().optional(), limit: z.number().optional() }),
      execute: async ({ category, status, limit = 20 }) => {
        let q = supabase.from("process_tasks").select("id,user_id,task_name,task_category,task_status,sort_order,notes,completed_at,created_at,visibility,task_kind,source_submission_id").order("sort_order").limit(limit);
        if (category) q = q.eq("task_category", category);
        if (status) q = q.eq("task_status", status);
        const { data, error } = await q;
        return error ? { error: error.message } : { tasks: data, count: data?.length };
      },
    }),

    get_task_by_id: tool({
      description: "Get detailed information about a specific process task.",
      parameters: z.object({ task_id: z.string() }),
      execute: async ({ task_id }) => {
        const { data, error } = await supabase.from("process_tasks").select("*").eq("id", task_id).single();
        return error ? { error: error.message } : data;
      },
    }),

    get_tasks_by_category: tool({
      description: "Get task counts grouped by category.",
      parameters: z.object({}),
      execute: async () => {
        const { data, error } = await supabase.from("process_tasks").select("task_category,task_status");
        if (error) return { error: error.message };
        const m: Record<string, { total: number; completed: number; pending: number }> = {};
        data?.forEach(r => {
          if (!m[r.task_category ?? "unknown"]) m[r.task_category ?? "unknown"] = { total: 0, completed: 0, pending: 0 };
          m[r.task_category ?? "unknown"].total++;
          if (r.task_status === "completed") m[r.task_category ?? "unknown"].completed++;
          else m[r.task_category ?? "unknown"].pending++;
        });
        return { by_category: m, total: data?.length };
      },
    }),

    get_tasks_by_status: tool({
      description: "Count tasks grouped by status.",
      parameters: z.object({}),
      execute: async () => {
        const { data, error } = await supabase.from("process_tasks").select("task_status");
        if (error) return { error: error.message };
        const m: Record<string, number> = {};
        data?.forEach(r => { m[r.task_status ?? "unknown"] = (m[r.task_status ?? "unknown"] || 0) + 1; });
        return { counts: m, total: data?.length };
      },
    }),

    update_task_status: tool({
      description: "Update the status of a process task.",
      parameters: z.object({ task_id: z.string(), status: z.string(), notes: z.string().optional() }),
      execute: async ({ task_id, status, notes }) => {
        const upd: Record<string, unknown> = { task_status: status };
        if (notes) upd.notes = notes;
        if (status === "completed") upd.completed_at = new Date().toISOString();
        const { data, error } = await supabase.from("process_tasks").update(upd).eq("id", task_id).select("id,task_name,task_status").single();
        return error ? { error: error.message } : { success: true, task: data };
      },
    }),

    create_process_task: tool({
      description: "Create a new process task for a user.",
      parameters: z.object({ user_id: z.string(), task_name: z.string(), task_category: z.string(), notes: z.string().optional() }),
      execute: async ({ user_id, task_name, task_category, notes }) => {
        const { data, error } = await supabase.from("process_tasks").insert({ user_id, task_name, task_category, task_status: "pending", notes: notes ?? null, visibility: "admin_internal", task_kind: "execution" }).select().single();
        return error ? { error: error.message } : { success: true, task: data };
      },
    }),

    get_overdue_tasks: tool({
      description: "Get tasks that have been pending for more than a specified number of days.",
      parameters: z.object({ days: z.number().optional() }),
      execute: async ({ days = 14 }) => {
        const since = new Date(Date.now() - days * 86400000).toISOString();
        const { data, error } = await supabase.from("process_tasks").select("id,user_id,task_name,task_category,task_status,created_at").neq("task_status", "completed").lte("created_at", since).order("created_at");
        return error ? { error: error.message } : { overdue: data, count: data?.length };
      },
    }),

    get_user_tasks: tool({
      description: "Get all process tasks for a specific user.",
      parameters: z.object({ user_id: z.string() }),
      execute: async ({ user_id }) => {
        const { data, error } = await supabase.from("process_tasks").select("id,task_name,task_category,task_status,sort_order,completed_at,created_at").eq("user_id", user_id).order("sort_order");
        return error ? { error: error.message } : { tasks: data, count: data?.length };
      },
    }),

    count_tasks_by_status: tool({
      description: "Simple count of tasks grouped by status.",
      parameters: z.object({}),
      execute: async () => {
        const { count, error } = await supabase.from("process_tasks").select("*", { count: "exact", head: true });
        if (error) return { error: error.message };
        return { total: count };
      },
    }),

    // ══════════════════════════════════════════════════════════ SUPPORT TICKETS (8)
    list_support_tickets: tool({
      description: "List all support tickets with optional status/priority filter.",
      parameters: z.object({ status: z.string().optional(), priority: z.string().optional(), limit: z.number().optional() }),
      execute: async ({ status, priority, limit = 20 }) => {
        let q = supabase.from("support_tickets").select("id,user_id,subject,status,priority,created_at,updated_at,resolved_at").order("created_at", { ascending: false }).limit(limit);
        if (status) q = q.eq("status", status);
        if (priority) q = q.eq("priority", priority);
        const { data, error } = await q;
        return error ? { error: error.message } : { tickets: data, count: data?.length };
      },
    }),

    get_ticket_by_id: tool({
      description: "Get full details of a specific support ticket.",
      parameters: z.object({ ticket_id: z.string() }),
      execute: async ({ ticket_id }) => {
        const { data, error } = await supabase.from("support_tickets").select("*").eq("id", ticket_id).single();
        return error ? { error: error.message } : data;
      },
    }),

    search_tickets: tool({
      description: "Search support tickets by subject.",
      parameters: z.object({ query: z.string() }),
      execute: async ({ query }) => {
        const { data, error } = await supabase.from("support_tickets").select("id,subject,status,priority,created_at").ilike("subject", `%${query}%`).limit(20);
        return error ? { error: error.message } : { tickets: data, count: data?.length };
      },
    }),

    get_tickets_by_priority: tool({
      description: "Get tickets grouped by priority level.",
      parameters: z.object({}),
      execute: async () => {
        const { data, error } = await supabase.from("support_tickets").select("priority,status");
        if (error) return { error: error.message };
        const m: Record<string, { total: number; open: number }> = {};
        data?.forEach(r => {
          const p = r.priority ?? "normal";
          if (!m[p]) m[p] = { total: 0, open: 0 };
          m[p].total++;
          if (r.status !== "resolved" && r.status !== "closed") m[p].open++;
        });
        return { by_priority: m, total: data?.length };
      },
    }),

    update_ticket_status: tool({
      description: "Update a support ticket's status.",
      parameters: z.object({ ticket_id: z.string(), status: z.string() }),
      execute: async ({ ticket_id, status }) => {
        const upd: Record<string, unknown> = { status };
        if (status === "resolved") upd.resolved_at = new Date().toISOString();
        const { data, error } = await supabase.from("support_tickets").update(upd).eq("id", ticket_id).select("id,subject,status").single();
        return error ? { error: error.message } : { success: true, ticket: data };
      },
    }),

    respond_to_ticket: tool({
      description: "Add an admin response to a support ticket.",
      parameters: z.object({ ticket_id: z.string(), response: z.string() }),
      execute: async ({ ticket_id, response }) => {
        const { data, error } = await supabase.from("support_tickets").update({ admin_response: response, status: "in_progress" }).eq("id", ticket_id).select("id,subject,status").single();
        return error ? { error: error.message } : { success: true, ticket: data };
      },
    }),

    get_open_tickets: tool({
      description: "Get all open/unresolved support tickets.",
      parameters: z.object({}),
      execute: async () => {
        const { data, error } = await supabase.from("support_tickets").select("id,user_id,subject,status,priority,created_at").not("status", "in", '("resolved","closed")').order("created_at");
        return error ? { error: error.message } : { open_tickets: data, count: data?.length };
      },
    }),

    count_tickets_by_status: tool({
      description: "Count support tickets by status.",
      parameters: z.object({}),
      execute: async () => {
        const { data, error } = await supabase.from("support_tickets").select("status");
        if (error) return { error: error.message };
        const m: Record<string, number> = {};
        data?.forEach(r => { m[r.status ?? "unknown"] = (m[r.status ?? "unknown"] || 0) + 1; });
        return { counts: m, total: data?.length };
      },
    }),

    // ══════════════════════════════════════════════════════════ NOTIFICATIONS (3)
    list_user_notifications: tool({
      description: "List notifications for a specific user.",
      parameters: z.object({ user_id: z.string(), unread_only: z.boolean().optional(), limit: z.number().optional() }),
      execute: async ({ user_id, unread_only, limit = 20 }) => {
        let q = supabase.from("notifications").select("id,title,body,type,channel,is_read,action_url,created_at").eq("user_id", user_id).order("created_at", { ascending: false }).limit(limit);
        if (unread_only) q = q.eq("is_read", false);
        const { data, error } = await q;
        return error ? { error: error.message } : { notifications: data, count: data?.length };
      },
    }),

    send_notification: tool({
      description: "Send a notification to a user.",
      parameters: z.object({
        user_id: z.string(),
        title: z.string(),
        body: z.string(),
        type: z.enum(["info", "success", "warning", "error", "system"]).optional(),
      }),
      execute: async ({ user_id, title, body, type = "info" }) => {
        const { data, error } = await supabase.from("notifications").insert({ user_id, title, body, type, channel: "in_app" }).select("id,title").single();
        return error ? { error: error.message } : { success: true, notification: data };
      },
    }),

    get_unread_count: tool({
      description: "Get unread notification count for a user.",
      parameters: z.object({ user_id: z.string() }),
      execute: async ({ user_id }) => {
        const { count, error } = await supabase.from("notifications").select("*", { count: "exact", head: true }).eq("user_id", user_id).eq("is_read", false);
        return error ? { error: error.message } : { unread_count: count };
      },
    }),

    // ══════════════════════════════════════════════════════════ CONTACTS (2)
    list_contact_submissions: tool({
      description: "List contact form submissions from the public website.",
      parameters: z.object({ status: z.string().optional(), limit: z.number().optional() }),
      execute: async ({ status, limit = 20 }) => {
        let q = supabase.from("contact_submissions").select("id,name,email,phone,company_name,status,created_at").order("created_at", { ascending: false }).limit(limit);
        if (status) q = q.eq("status", status);
        const { data, error } = await q;
        return error ? { error: error.message } : { contacts: data, count: data?.length };
      },
    }),

    update_contact_status: tool({
      description: "Update a contact submission's status and add admin notes.",
      parameters: z.object({ contact_id: z.string(), status: z.string(), admin_notes: z.string().optional() }),
      execute: async ({ contact_id, status, admin_notes }) => {
        const upd: Record<string, unknown> = { status };
        if (admin_notes) upd.admin_notes = admin_notes;
        const { data, error } = await supabase.from("contact_submissions").update(upd).eq("id", contact_id).select("id,name,email,status").single();
        return error ? { error: error.message } : { success: true, contact: data };
      },
    }),
  };
}
