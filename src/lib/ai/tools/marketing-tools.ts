/* eslint-disable */
// @ts-nocheck
// ─── Atlas AI — Marketing & Growth Tools (28 tools) ──────────────────────────
import { tool } from "./define-tool";
import { z } from "zod";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

type Db = SupabaseClient<Database>;

export function createMarketingTools(supabase: Db) {
  return {
    // ══════════════════════════════════════════════════════════ MARKETPLACE (10)
    list_marketplace_accounts: tool({
      description: "List all marketplace seller accounts (Amazon, eBay, Walmart, etc).",
      parameters: z.object({ platform: z.string().optional(), status: z.string().optional(), limit: z.number().optional() }),
      execute: async ({ platform, status, limit = 20 }) => {
        let q = supabase.from("marketplace_accounts").select("id,user_id,company_id,platform,store_name,status,seller_rating,total_listings,total_sales,monthly_revenue,api_connected").order("created_at", { ascending: false }).limit(limit);
        if (platform) q = q.eq("platform", platform);
        if (status) q = q.eq("status", status);
        const { data, error } = await q;
        return error ? { error: error.message } : { accounts: data, count: data?.length };
      },
    }),

    get_marketplace_by_id: tool({
      description: "Get full details of a specific marketplace account.",
      parameters: z.object({ account_id: z.string() }),
      execute: async ({ account_id }) => {
        const { data, error } = await supabase.from("marketplace_accounts").select("*").eq("id", account_id).single();
        return error ? { error: error.message } : data;
      },
    }),

    search_marketplace_accounts: tool({
      description: "Search marketplace accounts by store name.",
      parameters: z.object({ query: z.string() }),
      execute: async ({ query }) => {
        const { data, error } = await supabase.from("marketplace_accounts").select("id,platform,store_name,status,monthly_revenue").ilike("store_name", `%${query}%`).limit(20);
        return error ? { error: error.message } : { accounts: data, count: data?.length };
      },
    }),

    get_marketplace_by_platform: tool({
      description: "Get marketplace accounts stats grouped by platform.",
      parameters: z.object({}),
      execute: async () => {
        const { data, error } = await supabase.from("marketplace_accounts").select("platform,status,monthly_revenue,total_sales");
        if (error) return { error: error.message };
        const m: Record<string, { count: number; active: number; revenue: number; sales: number }> = {};
        data?.forEach(r => {
          if (!m[r.platform ?? "unknown"]) m[r.platform ?? "unknown"] = { count: 0, active: 0, revenue: 0, sales: 0 };
          m[r.platform ?? "unknown"].count++;
          if (r.status === "active") m[r.platform ?? "unknown"].active++;
          m[r.platform ?? "unknown"].revenue += Number(r.monthly_revenue) || 0;
          m[r.platform ?? "unknown"].sales += r.total_sales ?? 0;
        });
        return { by_platform: m, total: data?.length };
      },
    }),

    get_marketplace_by_status: tool({
      description: "Count marketplace accounts grouped by status.",
      parameters: z.object({}),
      execute: async () => {
        const { data, error } = await supabase.from("marketplace_accounts").select("status");
        if (error) return { error: error.message };
        const m: Record<string, number> = {};
        data?.forEach(r => { m[r.status ?? "unknown"] = (m[r.status ?? "unknown"] || 0) + 1; });
        return { counts: m, total: data?.length };
      },
    }),

    update_marketplace_status: tool({
      description: "Update a marketplace account's status.",
      parameters: z.object({
        account_id: z.string(),
        status: z.enum(["pending_setup", "under_review", "active", "suspended", "vacation_mode", "closed"]),
      }),
      execute: async ({ account_id, status }) => {
        const { data, error } = await supabase.from("marketplace_accounts").update({ status }).eq("id", account_id).select("id,store_name,status").single();
        return error ? { error: error.message } : { success: true, account: data };
      },
    }),

    get_top_marketplace_by_revenue: tool({
      description: "Get top marketplace accounts ranked by monthly revenue.",
      parameters: z.object({ limit: z.number().optional() }),
      execute: async ({ limit = 10 }) => {
        const { data, error } = await supabase.from("marketplace_accounts").select("id,store_name,platform,monthly_revenue,total_sales,seller_rating").eq("status", "active").order("monthly_revenue", { ascending: false }).limit(limit);
        return error ? { error: error.message } : { top_accounts: data };
      },
    }),

    get_marketplace_stats: tool({
      description: "Get overall marketplace statistics: total revenue, total sales, avg rating.",
      parameters: z.object({}),
      execute: async () => {
        const { data, error } = await supabase.from("marketplace_accounts").select("monthly_revenue,total_sales,seller_rating,status");
        if (error) return { error: error.message };
        let rev = 0, sales = 0, ratingSum = 0, ratingCount = 0;
        data?.forEach(r => {
          rev += Number(r.monthly_revenue) || 0;
          sales += r.total_sales ?? 0;
          if (r.seller_rating) { ratingSum += Number(r.seller_rating); ratingCount++; }
        });
        return { total_monthly_revenue: rev, total_sales: sales, avg_rating: ratingCount ? (ratingSum / ratingCount).toFixed(2) : null, total_accounts: data?.length };
      },
    }),

    count_marketplace_by_platform: tool({
      description: "Simple count of marketplace accounts per platform.",
      parameters: z.object({}),
      execute: async () => {
        const { data, error } = await supabase.from("marketplace_accounts").select("platform");
        if (error) return { error: error.message };
        const m: Record<string, number> = {};
        data?.forEach(r => { m[r.platform ?? "unknown"] = (m[r.platform ?? "unknown"] || 0) + 1; });
        return { counts: m, total: data?.length };
      },
    }),

    get_pending_marketplace_setups: tool({
      description: "Get marketplace accounts that are pending setup or under review.",
      parameters: z.object({}),
      execute: async () => {
        const { data, error } = await supabase.from("marketplace_accounts").select("id,user_id,store_name,platform,status,created_at").in("status", ["pending_setup", "under_review"]).order("created_at");
        return error ? { error: error.message } : { pending: data, count: data?.length };
      },
    }),

    // ══════════════════════════════════════════════════════════ SOCIAL MEDIA (8)
    list_social_accounts: tool({
      description: "List all social media accounts (Instagram, TikTok, YouTube, etc).",
      parameters: z.object({ platform: z.string().optional(), limit: z.number().optional() }),
      execute: async ({ platform, limit = 20 }) => {
        let q = supabase.from("social_media_accounts").select("id,user_id,platform,account_name,profile_url,status,followers_count,engagement_rate,managed_by_us").order("created_at", { ascending: false }).limit(limit);
        if (platform) q = q.eq("platform", platform);
        const { data, error } = await q;
        return error ? { error: error.message } : { accounts: data, count: data?.length };
      },
    }),

    get_social_account_by_id: tool({
      description: "Get full details of a specific social media account.",
      parameters: z.object({ account_id: z.string() }),
      execute: async ({ account_id }) => {
        const { data, error } = await supabase.from("social_media_accounts").select("*").eq("id", account_id).single();
        return error ? { error: error.message } : data;
      },
    }),

    search_social_accounts: tool({
      description: "Search social media accounts by account name.",
      parameters: z.object({ query: z.string() }),
      execute: async ({ query }) => {
        const { data, error } = await supabase.from("social_media_accounts").select("id,platform,account_name,status,followers_count").ilike("account_name", `%${query}%`).limit(20);
        return error ? { error: error.message } : { accounts: data, count: data?.length };
      },
    }),

    get_social_by_platform: tool({
      description: "Get social media account stats grouped by platform.",
      parameters: z.object({}),
      execute: async () => {
        const { data, error } = await supabase.from("social_media_accounts").select("platform,status,followers_count,engagement_rate");
        if (error) return { error: error.message };
        const m: Record<string, { count: number; followers: number; avg_engagement: number }> = {};
        data?.forEach(r => {
          if (!m[r.platform ?? "unknown"]) m[r.platform ?? "unknown"] = { count: 0, followers: 0, avg_engagement: 0 };
          m[r.platform ?? "unknown"].count++;
          m[r.platform ?? "unknown"].followers += r.followers_count ?? 0;
          m[r.platform ?? "unknown"].avg_engagement += Number(r.engagement_rate) || 0;
        });
        Object.values(m).forEach(v => { if (v.count) v.avg_engagement = Number((v.avg_engagement / v.count).toFixed(2)); });
        return { by_platform: m, total: data?.length };
      },
    }),

    update_social_account_status: tool({
      description: "Update a social media account's status.",
      parameters: z.object({
        account_id: z.string(),
        status: z.enum(["pending_setup", "active", "suspended", "deactivated"]),
      }),
      execute: async ({ account_id, status }) => {
        const { data, error } = await supabase.from("social_media_accounts").update({ status }).eq("id", account_id).select("id,account_name,status").single();
        return error ? { error: error.message } : { success: true, account: data };
      },
    }),

    get_top_social_by_followers: tool({
      description: "Get top social media accounts ranked by follower count.",
      parameters: z.object({ limit: z.number().optional() }),
      execute: async ({ limit = 10 }) => {
        const { data, error } = await supabase.from("social_media_accounts").select("id,account_name,platform,followers_count,engagement_rate,status").order("followers_count", { ascending: false }).limit(limit);
        return error ? { error: error.message } : { top_accounts: data };
      },
    }),

    get_managed_social_accounts: tool({
      description: "Get social media accounts managed by Atlas team.",
      parameters: z.object({}),
      execute: async () => {
        const { data, error } = await supabase.from("social_media_accounts").select("id,account_name,platform,status,followers_count").eq("managed_by_us", true);
        return error ? { error: error.message } : { managed: data, count: data?.length };
      },
    }),

    count_social_by_platform: tool({
      description: "Count social media accounts per platform.",
      parameters: z.object({}),
      execute: async () => {
        const { data, error } = await supabase.from("social_media_accounts").select("platform");
        if (error) return { error: error.message };
        const m: Record<string, number> = {};
        data?.forEach(r => { m[r.platform ?? "unknown"] = (m[r.platform ?? "unknown"] || 0) + 1; });
        return { counts: m, total: data?.length };
      },
    }),

    // ══════════════════════════════════════════════════════════ AD CAMPAIGNS (10)
    list_ad_campaigns: tool({
      description: "List all advertising campaigns with optional filters.",
      parameters: z.object({ platform: z.string().optional(), status: z.string().optional(), limit: z.number().optional() }),
      execute: async ({ platform, status, limit = 20 }) => {
        let q = supabase.from("ad_campaigns").select("id,user_id,campaign_name,platform,campaign_type,status,daily_budget,total_budget,spent_amount,impressions,clicks,conversions,roas").order("created_at", { ascending: false }).limit(limit);
        if (platform) q = q.eq("platform", platform);
        if (status) q = q.eq("status", status);
        const { data, error } = await q;
        return error ? { error: error.message } : { campaigns: data, count: data?.length };
      },
    }),

    get_campaign_by_id: tool({
      description: "Get full details of a specific advertising campaign.",
      parameters: z.object({ campaign_id: z.string() }),
      execute: async ({ campaign_id }) => {
        const { data, error } = await supabase.from("ad_campaigns").select("*").eq("id", campaign_id).single();
        return error ? { error: error.message } : data;
      },
    }),

    search_campaigns: tool({
      description: "Search advertising campaigns by name.",
      parameters: z.object({ query: z.string() }),
      execute: async ({ query }) => {
        const { data, error } = await supabase.from("ad_campaigns").select("id,campaign_name,platform,status,spent_amount,roas").ilike("campaign_name", `%${query}%`).limit(20);
        return error ? { error: error.message } : { campaigns: data, count: data?.length };
      },
    }),

    get_campaigns_by_platform: tool({
      description: "Get campaign performance stats grouped by ad platform.",
      parameters: z.object({}),
      execute: async () => {
        const { data, error } = await supabase.from("ad_campaigns").select("platform,status,spent_amount,impressions,clicks,conversions,revenue_generated,roas");
        if (error) return { error: error.message };
        const m: Record<string, { count: number; spent: number; impressions: number; clicks: number; conversions: number; revenue: number }> = {};
        data?.forEach(r => {
          if (!m[r.platform ?? "unknown"]) m[r.platform ?? "unknown"] = { count: 0, spent: 0, impressions: 0, clicks: 0, conversions: 0, revenue: 0 };
          m[r.platform ?? "unknown"].count++;
          m[r.platform ?? "unknown"].spent += Number(r.spent_amount) || 0;
          m[r.platform ?? "unknown"].impressions += Number(r.impressions) || 0;
          m[r.platform ?? "unknown"].clicks += Number(r.clicks) || 0;
          m[r.platform ?? "unknown"].conversions += r.conversions ?? 0;
          m[r.platform ?? "unknown"].revenue += Number(r.revenue_generated) || 0;
        });
        return { by_platform: m, total: data?.length };
      },
    }),

    get_campaigns_by_status: tool({
      description: "Count campaigns grouped by status.",
      parameters: z.object({}),
      execute: async () => {
        const { data, error } = await supabase.from("ad_campaigns").select("status");
        if (error) return { error: error.message };
        const m: Record<string, number> = {};
        data?.forEach(r => { m[r.status ?? "unknown"] = (m[r.status ?? "unknown"] || 0) + 1; });
        return { counts: m, total: data?.length };
      },
    }),

    update_campaign_status: tool({
      description: "Update a campaign's status.",
      parameters: z.object({
        campaign_id: z.string(),
        status: z.enum(["draft", "pending_approval", "active", "paused", "completed", "cancelled"]),
      }),
      execute: async ({ campaign_id, status }) => {
        const { data, error } = await supabase.from("ad_campaigns").update({ status }).eq("id", campaign_id).select("id,campaign_name,status").single();
        return error ? { error: error.message } : { success: true, campaign: data };
      },
    }),

    get_active_campaigns: tool({
      description: "Get all currently active advertising campaigns.",
      parameters: z.object({}),
      execute: async () => {
        const { data, error } = await supabase.from("ad_campaigns").select("id,campaign_name,platform,daily_budget,spent_amount,impressions,clicks,conversions,roas").eq("status", "active").order("spent_amount", { ascending: false });
        return error ? { error: error.message } : { active_campaigns: data, count: data?.length };
      },
    }),

    get_top_campaigns_by_roas: tool({
      description: "Get top campaigns ranked by Return on Ad Spend (ROAS).",
      parameters: z.object({ limit: z.number().optional() }),
      execute: async ({ limit = 10 }) => {
        const { data, error } = await supabase.from("ad_campaigns").select("id,campaign_name,platform,spent_amount,revenue_generated,roas,conversions").gt("spent_amount", 0).order("roas", { ascending: false }).limit(limit);
        return error ? { error: error.message } : { top_campaigns: data };
      },
    }),

    get_campaign_budget_summary: tool({
      description: "Get overall ad campaign budget summary: total budget, spent, remaining.",
      parameters: z.object({}),
      execute: async () => {
        const { data, error } = await supabase.from("ad_campaigns").select("total_budget,spent_amount,status");
        if (error) return { error: error.message };
        let budget = 0, spent = 0;
        data?.forEach(r => {
          budget += Number(r.total_budget) || 0;
          spent += Number(r.spent_amount) || 0;
        });
        return { total_budget: budget, total_spent: spent, remaining: budget - spent, campaign_count: data?.length };
      },
    }),

    count_campaigns_by_platform: tool({
      description: "Count of campaigns per ad platform.",
      parameters: z.object({}),
      execute: async () => {
        const { data, error } = await supabase.from("ad_campaigns").select("platform");
        if (error) return { error: error.message };
        const m: Record<string, number> = {};
        data?.forEach(r => { m[r.platform ?? "unknown"] = (m[r.platform ?? "unknown"] || 0) + 1; });
        return { counts: m, total: data?.length };
      },
    }),
  };
}
