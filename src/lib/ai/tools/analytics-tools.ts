/* eslint-disable */
// @ts-nocheck
// ─── Atlas AI — Analytics, Finance & System Tools (28 tools) ─────────────────
import { tool } from "./define-tool";
import { z } from "zod";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

type Db = SupabaseClient<Database>;

export function createAnalyticsTools(supabase: Db) {
  return {
    // ══════════════════════════════════════════════════════════ FINANCIAL RECORDS (8)
    list_financial_records: tool({
      description: "List financial records (income/expense) with optional filters.",
      parameters: z.object({ record_type: z.string().optional(), category: z.string().optional(), limit: z.number().optional() }),
      execute: async ({ record_type, category, limit = 20 }) => {
        let q = supabase.from("financial_records").select("id,user_id,record_type,category,description,amount,currency,transaction_date,is_verified").order("transaction_date", { ascending: false }).limit(limit);
        if (record_type) q = q.eq("record_type", record_type);
        if (category) q = q.eq("category", category);
        const { data, error } = await q;
        return error ? { error: error.message } : { records: data, count: data?.length };
      },
    }),

    get_financial_summary: tool({
      description: "Get overall financial summary: total income, total expenses, net profit.",
      parameters: z.object({ date_from: z.string().optional(), date_to: z.string().optional() }),
      execute: async ({ date_from, date_to }) => {
        let q = supabase.from("financial_records").select("record_type,amount,category,transaction_date");
        if (date_from) q = q.gte("transaction_date", date_from);
        if (date_to) q = q.lte("transaction_date", date_to);
        const { data, error } = await q;
        if (error) return { error: error.message };
        let income = 0, expense = 0;
        const byCat: Record<string, number> = {};
        data?.forEach(r => {
          const a = Number(r.amount) || 0;
          if (r.record_type === "income") income += a; else expense += a;
          byCat[r.category ?? "unknown"] = (byCat[r.category ?? "unknown"] || 0) + a;
        });
        return { total_income: income, total_expense: expense, net_profit: income - expense, by_category: byCat, record_count: data?.length };
      },
    }),

    get_income_records: tool({
      description: "Get all income records.",
      parameters: z.object({ limit: z.number().optional() }),
      execute: async ({ limit = 20 }) => {
        const { data, error } = await supabase.from("financial_records").select("id,category,description,amount,currency,transaction_date").eq("record_type", "income").order("transaction_date", { ascending: false }).limit(limit);
        return error ? { error: error.message } : { income: data, count: data?.length };
      },
    }),

    get_expense_records: tool({
      description: "Get all expense records.",
      parameters: z.object({ limit: z.number().optional() }),
      execute: async ({ limit = 20 }) => {
        const { data, error } = await supabase.from("financial_records").select("id,category,description,amount,currency,transaction_date").eq("record_type", "expense").order("transaction_date", { ascending: false }).limit(limit);
        return error ? { error: error.message } : { expenses: data, count: data?.length };
      },
    }),

    get_financial_by_category: tool({
      description: "Get financial totals grouped by category.",
      parameters: z.object({}),
      execute: async () => {
        const { data, error } = await supabase.from("financial_records").select("record_type,category,amount");
        if (error) return { error: error.message };
        const m: Record<string, { income: number; expense: number }> = {};
        data?.forEach(r => {
          if (!m[r.category ?? "unknown"]) m[r.category ?? "unknown"] = { income: 0, expense: 0 };
          if (r.record_type === "income") m[r.category ?? "unknown"].income += Number(r.amount) || 0;
          else m[r.category ?? "unknown"].expense += Number(r.amount) || 0;
        });
        return { by_category: m };
      },
    }),

    get_monthly_profit_loss: tool({
      description: "Get monthly profit/loss breakdown.",
      parameters: z.object({}),
      execute: async () => {
        const { data, error } = await supabase.from("financial_records").select("record_type,amount,transaction_date");
        if (error) return { error: error.message };
        const m: Record<string, { income: number; expense: number }> = {};
        data?.forEach(r => {
          const month = r.transaction_date?.substring(0, 7) ?? "unknown";
          if (!m[month]) m[month] = { income: 0, expense: 0 };
          if (r.record_type === "income") m[month].income += Number(r.amount) || 0;
          else m[month].expense += Number(r.amount) || 0;
        });
        const result = Object.entries(m).sort().map(([month, v]) => ({ month, ...v, profit: v.income - v.expense }));
        return { monthly: result };
      },
    }),

    get_unverified_transactions: tool({
      description: "Get financial transactions that haven't been verified yet.",
      parameters: z.object({}),
      execute: async () => {
        const { data, error } = await supabase.from("financial_records").select("id,record_type,category,description,amount,transaction_date").eq("is_verified", false).order("transaction_date", { ascending: false }).limit(50);
        return error ? { error: error.message } : { unverified: data, count: data?.length };
      },
    }),

    get_financial_by_company: tool({
      description: "Get financial records for a specific company.",
      parameters: z.object({ company_id: z.string() }),
      execute: async ({ company_id }) => {
        const { data, error } = await supabase.from("financial_records").select("id,record_type,category,description,amount,transaction_date").eq("company_id", company_id).order("transaction_date", { ascending: false });
        if (error) return { error: error.message };
        let income = 0, expense = 0;
        data?.forEach(r => { if (r.record_type === "income") income += Number(r.amount) || 0; else expense += Number(r.amount) || 0; });
        return { records: data, count: data?.length, total_income: income, total_expense: expense, net: income - expense };
      },
    }),

    // ══════════════════════════════════════════════════════════ DASHBOARD & ANALYTICS (8)
    get_dashboard_overview: tool({
      description: "Get a high-level dashboard overview: user count, order count, revenue, active companies.",
      parameters: z.object({}),
      execute: async () => {
        const [users, orders, companies, tickets] = await Promise.all([
          supabase.from("users").select("*", { count: "exact", head: true }),
          supabase.from("orders").select("total_amount,status"),
          supabase.from("customer_companies").select("status"),
          supabase.from("support_tickets").select("status"),
        ]);
        let revenue = 0;
        orders.data?.forEach(r => { revenue += Number(r.total_amount) || 0; });
        const activeCompanies = companies.data?.filter(c => c.status === "active").length ?? 0;
        const openTickets = tickets.data?.filter(t => t.status !== "resolved" && t.status !== "closed").length ?? 0;
        return { total_users: users.count, total_orders: orders.data?.length, total_revenue: revenue, active_companies: activeCompanies, open_tickets: openTickets };
      },
    }),

    get_revenue_by_month: tool({
      description: "Get monthly revenue from orders.",
      parameters: z.object({}),
      execute: async () => {
        const { data, error } = await supabase.from("orders").select("total_amount,created_at");
        if (error) return { error: error.message };
        const m: Record<string, number> = {};
        data?.forEach(r => {
          const month = r.created_at?.substring(0, 7) ?? "unknown";
          m[month] = (m[month] || 0) + (Number(r.total_amount) || 0);
        });
        return { monthly_revenue: Object.entries(m).sort().map(([month, rev]) => ({ month, revenue: rev })) };
      },
    }),

    get_new_users_by_month: tool({
      description: "Get new user registrations grouped by month.",
      parameters: z.object({}),
      execute: async () => {
        const { data, error } = await supabase.from("users").select("created_at");
        if (error) return { error: error.message };
        const m: Record<string, number> = {};
        data?.forEach(r => {
          const month = r.created_at?.substring(0, 7) ?? "unknown";
          m[month] = (m[month] || 0) + 1;
        });
        return { monthly_signups: Object.entries(m).sort().map(([month, count]) => ({ month, count })) };
      },
    }),

    get_top_customers_by_orders: tool({
      description: "Get top customers ranked by number of orders or total spend.",
      parameters: z.object({ limit: z.number().optional() }),
      execute: async ({ limit = 10 }) => {
        const { data, error } = await supabase.from("orders").select("user_id,total_amount");
        if (error) return { error: error.message };
        const m: Record<string, { orders: number; spend: number }> = {};
        data?.forEach(r => {
          if (!m[r.user_id ?? "unknown"]) m[r.user_id ?? "unknown"] = { orders: 0, spend: 0 };
          m[r.user_id ?? "unknown"].orders++;
          m[r.user_id ?? "unknown"].spend += Number(r.total_amount) || 0;
        });
        return { top_customers: Object.entries(m).sort((a, b) => b[1].spend - a[1].spend).slice(0, limit).map(([id, v]) => ({ user_id: id, ...v })) };
      },
    }),

    get_platform_comparison: tool({
      description: "Compare performance across all marketplace platforms: orders, revenue, avg order value.",
      parameters: z.object({}),
      execute: async () => {
        const { data, error } = await supabase.from("orders").select("platform,total_amount");
        if (error) return { error: error.message };
        const m: Record<string, { orders: number; revenue: number }> = {};
        data?.forEach(r => {
          const p = r.platform ?? "unknown";
          if (!m[p]) m[p] = { orders: 0, revenue: 0 };
          m[p].orders++;
          m[p].revenue += Number(r.total_amount) || 0;
        });
        const result = Object.entries(m).map(([p, v]) => ({ platform: p, ...v, avg_order: v.orders ? Number((v.revenue / v.orders).toFixed(2)) : 0 }));
        return { platforms: result.sort((a, b) => b.revenue - a.revenue) };
      },
    }),

    get_company_formation_stats: tool({
      description: "Get company formation statistics: by state, by type, success rate.",
      parameters: z.object({}),
      execute: async () => {
        const { data, error } = await supabase.from("customer_companies").select("company_type,state_of_formation,status");
        if (error) return { error: error.message };
        const byType: Record<string, number> = {};
        const byState: Record<string, number> = {};
        const byStatus: Record<string, number> = {};
        data?.forEach(r => {
          byType[r.company_type ?? "unknown"] = (byType[r.company_type ?? "unknown"] || 0) + 1;
          byState[r.state_of_formation ?? "unknown"] = (byState[r.state_of_formation ?? "unknown"] || 0) + 1;
          byStatus[r.status ?? "unknown"] = (byStatus[r.status ?? "unknown"] || 0) + 1;
        });
        return { by_type: byType, by_state: byState, by_status: byStatus, total: data?.length };
      },
    }),

    get_marketplace_performance_overview: tool({
      description: "Get overall marketplace performance: total accounts, revenue, sales across all platforms.",
      parameters: z.object({}),
      execute: async () => {
        const { data, error } = await supabase.from("marketplace_accounts").select("platform,status,monthly_revenue,total_sales,total_listings");
        if (error) return { error: error.message };
        let rev = 0, sales = 0, listings = 0, active = 0;
        data?.forEach(r => {
          rev += Number(r.monthly_revenue) || 0;
          sales += r.total_sales ?? 0;
          listings += r.total_listings ?? 0;
          if (r.status === "active") active++;
        });
        return { total_accounts: data?.length, active_accounts: active, total_monthly_revenue: rev, total_sales: sales, total_listings: listings };
      },
    }),

    get_campaign_performance_overview: tool({
      description: "Get overall ad campaign performance: total spend, impressions, clicks, conversions, ROAS.",
      parameters: z.object({}),
      execute: async () => {
        const { data, error } = await supabase.from("ad_campaigns").select("spent_amount,impressions,clicks,conversions,revenue_generated,roas,status");
        if (error) return { error: error.message };
        let spent = 0, imp = 0, cl = 0, conv = 0, rev = 0;
        data?.forEach(r => {
          spent += Number(r.spent_amount) || 0;
          imp += Number(r.impressions) || 0;
          cl += Number(r.clicks) || 0;
          conv += r.conversions ?? 0;
          rev += Number(r.revenue_generated) || 0;
        });
        return { total_spent: spent, total_impressions: imp, total_clicks: cl, total_conversions: conv, total_revenue: rev, avg_roas: spent > 0 ? Number((rev / spent).toFixed(2)) : 0, campaign_count: data?.length };
      },
    }),

    // ══════════════════════════════════════════════════════════ AUDIT LOGS (4)
    list_audit_logs: tool({
      description: "List recent audit log entries.",
      parameters: z.object({ action: z.string().optional(), entity_type: z.string().optional(), limit: z.number().optional() }),
      execute: async ({ action, entity_type, limit = 20 }) => {
        let q = supabase.from("audit_logs").select("id,user_id,action,entity_type,entity_id,ip_address,created_at").order("created_at", { ascending: false }).limit(limit);
        if (action) q = q.eq("action", action);
        if (entity_type) q = q.eq("entity_type", entity_type);
        const { data, error } = await q;
        return error ? { error: error.message } : { logs: data, count: data?.length };
      },
    }),

    search_audit_logs: tool({
      description: "Search audit logs by action type.",
      parameters: z.object({ query: z.string() }),
      execute: async ({ query }) => {
        const { data, error } = await supabase.from("audit_logs").select("id,user_id,action,entity_type,entity_id,created_at").ilike("action", `%${query}%`).order("created_at", { ascending: false }).limit(20);
        return error ? { error: error.message } : { logs: data, count: data?.length };
      },
    }),

    get_audit_by_entity: tool({
      description: "Get all audit log entries for a specific entity (by entity_type and entity_id).",
      parameters: z.object({ entity_type: z.string(), entity_id: z.string() }),
      execute: async ({ entity_type, entity_id }) => {
        const { data, error } = await supabase.from("audit_logs").select("*").eq("entity_type", entity_type).eq("entity_id", entity_id).order("created_at", { ascending: false });
        return error ? { error: error.message } : { logs: data, count: data?.length };
      },
    }),

    get_recent_activity: tool({
      description: "Get the most recent system activity from audit logs.",
      parameters: z.object({ limit: z.number().optional() }),
      execute: async ({ limit = 15 }) => {
        const { data, error } = await supabase.from("audit_logs").select("id,user_id,action,entity_type,created_at").order("created_at", { ascending: false }).limit(limit);
        return error ? { error: error.message } : { activity: data };
      },
    }),

    // ══════════════════════════════════════════════════════════ AI REPORTS (4)
    list_ai_reports: tool({
      description: "List all generated AI reports.",
      parameters: z.object({ report_type: z.string().optional(), limit: z.number().optional() }),
      execute: async ({ report_type, limit = 20 }) => {
        let q = supabase.from("ai_reports").select("id,user_id,report_type,title,status,summary,generated_at,created_at").order("created_at", { ascending: false }).limit(limit);
        if (report_type) q = q.eq("report_type", report_type);
        const { data, error } = await q;
        return error ? { error: error.message } : { reports: data, count: data?.length };
      },
    }),

    get_ai_report_by_id: tool({
      description: "Get a specific AI report with full content.",
      parameters: z.object({ report_id: z.string() }),
      execute: async ({ report_id }) => {
        const { data, error } = await supabase.from("ai_reports").select("*").eq("id", report_id).single();
        return error ? { error: error.message } : data;
      },
    }),

    get_report_stats: tool({
      description: "Get AI report statistics by type and status.",
      parameters: z.object({}),
      execute: async () => {
        const { data, error } = await supabase.from("ai_reports").select("report_type,status");
        if (error) return { error: error.message };
        const byType: Record<string, number> = {};
        const byStatus: Record<string, number> = {};
        data?.forEach(r => {
          byType[r.report_type ?? "unknown"] = (byType[r.report_type ?? "unknown"] || 0) + 1;
          byStatus[r.status ?? "unknown"] = (byStatus[r.status ?? "unknown"] || 0) + 1;
        });
        return { by_type: byType, by_status: byStatus, total: data?.length };
      },
    }),

    // ══════════════════════════════════════════════════════════ SYSTEM (4)
    get_system_health: tool({
      description: "Check system health: count rows in all major tables to verify database connectivity.",
      parameters: z.object({}),
      execute: async () => {
        const tables = ["users", "orders", "products", "customer_companies", "marketplace_accounts", "support_tickets", "form_submissions", "invoices", "notifications", "audit_logs"] as const;
        const results: Record<string, number | null> = {};
        await Promise.all(
          tables.map(async (t) => {
            const { count } = await supabase.from(t).select("*", { count: "exact", head: true });
            results[t] = count;
          })
        );
        return { table_counts: results, status: "healthy", checked_at: new Date().toISOString() };
      },
    }),

    get_table_row_counts: tool({
      description: "Get row counts for all main database tables.",
      parameters: z.object({}),
      execute: async () => {
        const tables = [
          "users", "user_roles", "user_subscriptions", "orders", "order_items", "products",
          "customer_companies", "marketplace_accounts", "social_media_accounts", "ad_campaigns",
          "financial_records", "warehouse_items", "shipments", "form_submissions", "process_tasks",
          "support_tickets", "notifications", "billing_records", "invoices", "audit_logs",
          "ai_reports", "agent_conversations", "contact_submissions", "invitations", "inventory_movements",
        ] as const;
        const counts: Record<string, number | null> = {};
        await Promise.all(tables.map(async (t) => {
          const { count } = await supabase.from(t).select("*", { count: "exact", head: true });
          counts[t] = count;
        }));
        return { counts };
      },
    }),

    get_session_messages: tool({
      description: "Get conversation messages from a specific AI chat session.",
      parameters: z.object({ session_id: z.string(), limit: z.number().optional() }),
      execute: async ({ session_id, limit = 50 }) => {
        const { data, error } = await supabase.from("agent_conversations").select("role,content,created_at").eq("session_id", session_id).order("created_at").limit(limit);
        return error ? { error: error.message } : { messages: data, count: data?.length };
      },
    }),

    get_recent_sessions: tool({
      description: "Get recent AI chat sessions.",
      parameters: z.object({ limit: z.number().optional() }),
      execute: async ({ limit = 10 }) => {
        const { data, error } = await supabase.from("agent_conversations").select("session_id,user_id,created_at").order("created_at", { ascending: false }).limit(limit * 10);
        if (error) return { error: error.message };
        const seen = new Set<string>();
        const sessions = data?.filter(r => {
          if (seen.has(r.session_id)) return false;
          seen.add(r.session_id);
          return true;
        }).slice(0, limit);
        return { sessions, count: sessions?.length };
      },
    }),
  };
}
