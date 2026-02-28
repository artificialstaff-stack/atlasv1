/* eslint-disable */
// @ts-nocheck
// ─── Atlas AI — Customer & Account Tools (31 tools) ─────────────────────────
import { tool } from "./define-tool";
import { z } from "zod";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

type Db = SupabaseClient<Database>;

export function createCustomerTools(supabase: Db) {
  return {
    // ══════════════════════════════════════════════════════════════ USERS (8)
    list_users: tool({
      description: "List all registered users/customers with optional onboarding status filter.",
      parameters: z.object({
        status: z.string().optional(),
        limit: z.number().optional(),
      }),
      execute: async ({ status, limit = 20 }) => {
        let q = supabase.from("users").select("id,email,first_name,last_name,company_name,onboarding_status,created_at").order("created_at", { ascending: false }).limit(limit);
        if (status) q = q.eq("onboarding_status", status);
        const { data, error } = await q;
        return error ? { error: error.message } : { users: data, count: data?.length };
      },
    }),

    get_user_by_id: tool({
      description: "Get a specific user's full profile by their unique ID.",
      parameters: z.object({ user_id: z.string() }),
      execute: async ({ user_id }) => {
        const { data, error } = await supabase.from("users").select("*").eq("id", user_id).single();
        return error ? { error: error.message } : data;
      },
    }),

    search_users: tool({
      description: "Search users by name, email, or company name.",
      parameters: z.object({ query: z.string() }),
      execute: async ({ query }) => {
        const { data, error } = await supabase.from("users").select("id,email,first_name,last_name,company_name,onboarding_status").or(`email.ilike.%${query}%,first_name.ilike.%${query}%,last_name.ilike.%${query}%,company_name.ilike.%${query}%`).limit(20);
        return error ? { error: error.message } : { users: data, count: data?.length };
      },
    }),

    get_user_subscription_info: tool({
      description: "Get a user's current subscription plan details.",
      parameters: z.object({ user_id: z.string() }),
      execute: async ({ user_id }) => {
        const { data, error } = await supabase.from("user_subscriptions").select("*").eq("user_id", user_id).order("started_at", { ascending: false }).limit(1).maybeSingle();
        return error ? { error: error.message } : data ?? { message: "No subscription found" };
      },
    }),

    update_user_onboarding: tool({
      description: "Update a user's onboarding status.",
      parameters: z.object({ user_id: z.string(), status: z.string() }),
      execute: async ({ user_id, status }) => {
        const { data, error } = await supabase.from("users").update({ onboarding_status: status }).eq("id", user_id).select("id,email,onboarding_status").single();
        return error ? { error: error.message } : { success: true, user: data };
      },
    }),

    count_users_by_onboarding: tool({
      description: "Count users grouped by onboarding status.",
      parameters: z.object({}),
      execute: async () => {
        const { data, error } = await supabase.from("users").select("onboarding_status");
        if (error) return { error: error.message };
        const c: Record<string, number> = {};
        data?.forEach(r => { c[r.onboarding_status ?? "unknown"] = (c[r.onboarding_status ?? "unknown"] || 0) + 1; });
        return { counts: c, total: data?.length };
      },
    }),

    get_recent_signups: tool({
      description: "Get the most recently registered users within a time period.",
      parameters: z.object({ days: z.number().optional(), limit: z.number().optional() }),
      execute: async ({ days = 7, limit = 20 }) => {
        const since = new Date(Date.now() - days * 86400000).toISOString();
        const { data, error } = await supabase.from("users").select("id,email,first_name,last_name,company_name,created_at").gte("created_at", since).order("created_at", { ascending: false }).limit(limit);
        return error ? { error: error.message } : { users: data, count: data?.length };
      },
    }),

    get_user_360: tool({
      description: "Get a complete 360-degree view of a user: profile, companies, orders, subscription, role.",
      parameters: z.object({ user_id: z.string() }),
      execute: async ({ user_id }) => {
        const [u, co, ord, sub, role] = await Promise.all([
          supabase.from("users").select("*").eq("id", user_id).single(),
          supabase.from("customer_companies").select("id,company_name,company_type,status,state_of_formation").eq("user_id", user_id),
          supabase.from("orders").select("id,platform,status,total_amount,created_at").eq("user_id", user_id).order("created_at", { ascending: false }).limit(10),
          supabase.from("user_subscriptions").select("*").eq("user_id", user_id).order("started_at", { ascending: false }).limit(1).maybeSingle(),
          supabase.from("user_roles").select("role,is_active").eq("user_id", user_id).maybeSingle(),
        ]);
        return { user: u.data, companies: co.data, recent_orders: ord.data, subscription: sub.data, role: role.data };
      },
    }),

    // ══════════════════════════════════════════════════════════════ ROLES (2)
    list_all_roles: tool({
      description: "List all user role assignments in the system.",
      parameters: z.object({ limit: z.number().optional() }),
      execute: async ({ limit = 50 }) => {
        const { data, error } = await supabase.from("user_roles").select("id,user_id,role,is_active,created_at").order("created_at", { ascending: false }).limit(limit);
        return error ? { error: error.message } : { roles: data, count: data?.length };
      },
    }),

    update_user_role: tool({
      description: "Assign or update a user's role. Valid roles: super_admin, admin, moderator, viewer, customer.",
      parameters: z.object({
        user_id: z.string(),
        role: z.enum(["super_admin", "admin", "moderator", "viewer", "customer"]),
      }),
      execute: async ({ user_id, role }) => {
        const { data, error } = await supabase.from("user_roles").upsert({ user_id, role, is_active: true }, { onConflict: "user_id" }).select().single();
        return error ? { error: error.message } : { success: true, data };
      },
    }),

    // ══════════════════════════════════════════════════════════════ COMPANIES (7)
    list_companies: tool({
      description: "List all customer companies (LLC, corporation, etc). Optional status filter.",
      parameters: z.object({ status: z.string().optional(), limit: z.number().optional() }),
      execute: async ({ status, limit = 20 }) => {
        let q = supabase.from("customer_companies").select("id,user_id,company_name,company_type,state_of_formation,status,bank_account_status,created_at").order("created_at", { ascending: false }).limit(limit);
        if (status) q = q.eq("status", status);
        const { data, error } = await q;
        return error ? { error: error.message } : { companies: data, count: data?.length };
      },
    }),

    get_company_by_id: tool({
      description: "Get full details of a specific customer company by ID.",
      parameters: z.object({ company_id: z.string() }),
      execute: async ({ company_id }) => {
        const { data, error } = await supabase.from("customer_companies").select("*").eq("id", company_id).single();
        return error ? { error: error.message } : data;
      },
    }),

    search_companies: tool({
      description: "Search customer companies by name or EIN number.",
      parameters: z.object({ query: z.string() }),
      execute: async ({ query }) => {
        const { data, error } = await supabase.from("customer_companies").select("id,company_name,company_type,state_of_formation,status,ein_number").or(`company_name.ilike.%${query}%,ein_number.ilike.%${query}%`).limit(20);
        return error ? { error: error.message } : { companies: data, count: data?.length };
      },
    }),

    update_company_status: tool({
      description: "Update a company's status. Valid: pending, formation_in_progress, active, suspended, dissolved.",
      parameters: z.object({
        company_id: z.string(),
        status: z.enum(["pending", "formation_in_progress", "active", "suspended", "dissolved"]),
      }),
      execute: async ({ company_id, status }) => {
        const { data, error } = await supabase.from("customer_companies").update({ status }).eq("id", company_id).select("id,company_name,status").single();
        return error ? { error: error.message } : { success: true, company: data };
      },
    }),

    get_companies_by_state: tool({
      description: "Get count of companies grouped by US state of formation.",
      parameters: z.object({}),
      execute: async () => {
        const { data, error } = await supabase.from("customer_companies").select("state_of_formation");
        if (error) return { error: error.message };
        const m: Record<string, number> = {};
        data?.forEach(r => { m[r.state_of_formation ?? "unknown"] = (m[r.state_of_formation ?? "unknown"] || 0) + 1; });
        return { by_state: m, total: data?.length };
      },
    }),

    get_companies_by_type: tool({
      description: "Count companies grouped by type (LLC, corporation, etc).",
      parameters: z.object({}),
      execute: async () => {
        const { data, error } = await supabase.from("customer_companies").select("company_type");
        if (error) return { error: error.message };
        const m: Record<string, number> = {};
        data?.forEach(r => { m[r.company_type ?? "unknown"] = (m[r.company_type ?? "unknown"] || 0) + 1; });
        return { by_type: m, total: data?.length };
      },
    }),

    count_companies_by_status: tool({
      description: "Count companies grouped by status.",
      parameters: z.object({}),
      execute: async () => {
        const { data, error } = await supabase.from("customer_companies").select("status");
        if (error) return { error: error.message };
        const m: Record<string, number> = {};
        data?.forEach(r => { m[r.status ?? "unknown"] = (m[r.status ?? "unknown"] || 0) + 1; });
        return { counts: m, total: data?.length };
      },
    }),

    // ══════════════════════════════════════════════════════════════ INVOICES (6)
    list_invoices: tool({
      description: "List all invoices with optional status filter.",
      parameters: z.object({ status: z.string().optional(), limit: z.number().optional() }),
      execute: async ({ status, limit = 20 }) => {
        let q = supabase.from("invoices").select("id,user_id,invoice_number,plan_tier,amount,currency,status,due_date,paid_at,created_at").order("created_at", { ascending: false }).limit(limit);
        if (status) q = q.eq("status", status);
        const { data, error } = await q;
        return error ? { error: error.message } : { invoices: data, count: data?.length };
      },
    }),

    get_invoice_by_id: tool({
      description: "Get detailed information about a specific invoice.",
      parameters: z.object({ invoice_id: z.string() }),
      execute: async ({ invoice_id }) => {
        const { data, error } = await supabase.from("invoices").select("*").eq("id", invoice_id).single();
        return error ? { error: error.message } : data;
      },
    }),

    get_overdue_invoices: tool({
      description: "Get all invoices that are past their due date and still unpaid.",
      parameters: z.object({}),
      execute: async () => {
        const now = new Date().toISOString();
        const { data, error } = await supabase.from("invoices").select("id,user_id,invoice_number,amount,currency,status,due_date").in("status", ["pending", "overdue"]).lte("due_date", now).order("due_date");
        return error ? { error: error.message } : { overdue: data, count: data?.length };
      },
    }),

    update_invoice_status: tool({
      description: "Update an invoice's status. Valid: pending, paid, confirmed, overdue, cancelled.",
      parameters: z.object({
        invoice_id: z.string(),
        status: z.enum(["pending", "paid", "confirmed", "overdue", "cancelled"]),
      }),
      execute: async ({ invoice_id, status }) => {
        const upd: Record<string, unknown> = { status };
        if (status === "paid") upd.paid_at = new Date().toISOString();
        if (status === "confirmed") upd.confirmed_at = new Date().toISOString();
        const { data, error } = await supabase.from("invoices").update(upd).eq("id", invoice_id).select("id,invoice_number,status").single();
        return error ? { error: error.message } : { success: true, invoice: data };
      },
    }),

    get_invoice_stats: tool({
      description: "Get invoice statistics: counts and total amounts per status.",
      parameters: z.object({}),
      execute: async () => {
        const { data, error } = await supabase.from("invoices").select("status,amount");
        if (error) return { error: error.message };
        const s: Record<string, { count: number; total: number }> = {};
        data?.forEach(r => {
          if (!s[r.status ?? "unknown"]) s[r.status ?? "unknown"] = { count: 0, total: 0 };
          s[r.status ?? "unknown"].count++;
          s[r.status ?? "unknown"].total += Number(r.amount) || 0;
        });
        return { stats: s, total_invoices: data?.length };
      },
    }),

    search_invoices: tool({
      description: "Search invoices by invoice number.",
      parameters: z.object({ query: z.string() }),
      execute: async ({ query }) => {
        const { data, error } = await supabase.from("invoices").select("id,invoice_number,user_id,amount,status,due_date").ilike("invoice_number", `%${query}%`).limit(20);
        return error ? { error: error.message } : { invoices: data, count: data?.length };
      },
    }),

    // ══════════════════════════════════════════════════════════════ BILLING (3)
    list_billing_records: tool({
      description: "List all billing/payment records.",
      parameters: z.object({ status: z.string().optional(), limit: z.number().optional() }),
      execute: async ({ status, limit = 20 }) => {
        let q = supabase.from("billing_records").select("*").order("created_at", { ascending: false }).limit(limit);
        if (status) q = q.eq("status", status);
        const { data, error } = await q;
        return error ? { error: error.message } : { records: data, count: data?.length };
      },
    }),

    get_billing_by_user: tool({
      description: "Get billing records for a specific user.",
      parameters: z.object({ user_id: z.string() }),
      execute: async ({ user_id }) => {
        const { data, error } = await supabase.from("billing_records").select("*").eq("user_id", user_id).order("created_at", { ascending: false });
        return error ? { error: error.message } : { records: data, count: data?.length };
      },
    }),

    get_billing_summary: tool({
      description: "Get overall billing summary: revenue by plan, counts by status.",
      parameters: z.object({}),
      execute: async () => {
        const { data, error } = await supabase.from("billing_records").select("status,plan_tier,amount");
        if (error) return { error: error.message };
        const byStatus: Record<string, number> = {};
        const byPlan: Record<string, number> = {};
        let rev = 0;
        data?.forEach(r => {
          byStatus[r.status ?? "unknown"] = (byStatus[r.status ?? "unknown"] || 0) + 1;
          byPlan[r.plan_tier ?? "unknown"] = (byPlan[r.plan_tier ?? "unknown"] || 0) + 1;
          if (r.status === "active") rev += Number(r.amount) || 0;
        });
        return { by_status: byStatus, by_plan: byPlan, active_revenue: rev, total: data?.length };
      },
    }),

    // ══════════════════════════════════════════════════════════════ SUBSCRIPTIONS (3)
    list_subscriptions: tool({
      description: "List all user subscriptions.",
      parameters: z.object({ limit: z.number().optional() }),
      execute: async ({ limit = 30 }) => {
        const { data, error } = await supabase.from("user_subscriptions").select("*").order("started_at", { ascending: false }).limit(limit);
        return error ? { error: error.message } : { subscriptions: data, count: data?.length };
      },
    }),

    get_subscription_by_user: tool({
      description: "Get a specific user's subscription.",
      parameters: z.object({ user_id: z.string() }),
      execute: async ({ user_id }) => {
        const { data, error } = await supabase.from("user_subscriptions").select("*").eq("user_id", user_id).order("started_at", { ascending: false }).limit(1).maybeSingle();
        return error ? { error: error.message } : data ?? { message: "No subscription found" };
      },
    }),

    get_active_subscriptions: tool({
      description: "Get all active subscriptions grouped by plan tier.",
      parameters: z.object({}),
      execute: async () => {
        const { data, error } = await supabase.from("user_subscriptions").select("plan_tier,payment_status,amount").eq("payment_status", "paid");
        if (error) return { error: error.message };
        const bp: Record<string, { count: number; revenue: number }> = {};
        data?.forEach(r => {
          if (!bp[r.plan_tier ?? "unknown"]) bp[r.plan_tier ?? "unknown"] = { count: 0, revenue: 0 };
          bp[r.plan_tier ?? "unknown"].count++;
          bp[r.plan_tier ?? "unknown"].revenue += Number(r.amount) || 0;
        });
        return { by_plan: bp, total_active: data?.length };
      },
    }),

    // ══════════════════════════════════════════════════════════════ INVITATIONS (2)
    list_invitations: tool({
      description: "List all invitation codes and their statuses.",
      parameters: z.object({ status: z.string().optional(), limit: z.number().optional() }),
      execute: async ({ status, limit = 30 }) => {
        let q = supabase.from("invitations").select("*").order("created_at", { ascending: false }).limit(limit);
        if (status) q = q.eq("status", status);
        const { data, error } = await q;
        return error ? { error: error.message } : { invitations: data, count: data?.length };
      },
    }),

    get_invitation_by_email: tool({
      description: "Look up an invitation by email address.",
      parameters: z.object({ email: z.string() }),
      execute: async ({ email }) => {
        const { data, error } = await supabase.from("invitations").select("*").eq("email", email).maybeSingle();
        return error ? { error: error.message } : data ?? { message: "No invitation found" };
      },
    }),
  };
}
