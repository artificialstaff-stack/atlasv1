// ─── Atlas AI — Tool Index + Smart Router ────────────────────────────────────
// Aggregates all 151 tools and routes the most relevant ~20 per user query
// to keep within the model's context window (qwen2.5:7b = ~32k tokens).
// ─────────────────────────────────────────────────────────────────────────────
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import type { Tool } from "ai";

import { createCustomerTools } from "./customer-tools";
import { createCommerceTools } from "./commerce-tools";
import { createMarketingTools } from "./marketing-tools";
import { createOperationsTools } from "./operations-tools";
import { createAnalyticsTools } from "./analytics-tools";

type Db = SupabaseClient<Database>;
type ToolMap = Record<string, Tool>;
type Category = "customer" | "commerce" | "marketing" | "operations" | "analytics";

// ─── Keyword maps (Turkish + English) ───────────────────────────────────────
const KEYWORDS: Record<Category, string[]> = {
  customer: [
    "müşteri", "kullanıcı", "user", "customer", "müşteriler", "kullanıcılar",
    "şirket", "company", "companies", "llc", "corporation", "firma",
    "fatura", "invoice", "billing", "ödeme", "payment", "abonelik", "subscription",
    "rol", "role", "davet", "invitation", "onboarding", "kayıt", "register",
    "profil", "profile", "hesap", "account",
  ],
  commerce: [
    "sipariş", "order", "siparişler", "orders", "ürün", "product", "products", "ürünler",
    "stok", "stock", "envanter", "inventory", "depo", "warehouse", "depolama", "storage",
    "kargo", "shipment", "shipping", "sevkiyat", "teslimat", "delivery", "tracking",
    "takip", "gümrük", "customs", "sku", "barcode", "barkod",
  ],
  marketing: [
    "pazaryeri", "marketplace", "amazon", "ebay", "etsy", "shopify", "walmart",
    "tiktok", "wayfair", "mağaza", "store", "seller", "satıcı",
    "sosyal medya", "social media", "instagram", "facebook", "youtube", "twitter",
    "pinterest", "linkedin", "takipçi", "follower", "engagement",
    "reklam", "campaign", "kampanya", "ads", "ppc", "roas", "cpc", "ctr",
    "bütçe", "budget", "impressions", "clicks", "tıklama",
  ],
  operations: [
    "form", "başvuru", "submission", "görev", "task", "workflow", "iş akışı",
    "destek", "support", "ticket", "bilet", "talep", "şikayet",
    "bildirim", "notification", "alert", "uyarı",
    "iletişim", "contact", "leads", "potansiyel",
  ],
  analytics: [
    "rapor", "report", "analiz", "analytics", "istatistik", "stats", "dashboard",
    "trend", "performans", "performance", "gelir", "revenue", "gider", "expense",
    "kâr", "profit", "zarar", "loss", "finans", "finance", "mali",
    "audit", "denetim", "log", "sistem", "system", "health", "sağlık",
    "özet", "summary", "genel", "overview", "toplam", "total", "aylık", "monthly",
  ],
};

// ─── Universal tools (always included) ──────────────────────────────────────
const UNIVERSAL_TOOLS = [
  "get_dashboard_overview", "get_system_health", "search_users", "get_user_360",
  "list_orders", "get_financial_summary", "get_table_row_counts",
];

/**
 * Score each category based on keyword matches in the user's message.
 */
function scoreCategories(message: string): Record<Category, number> {
  const msg = message.toLowerCase();
  const scores: Record<Category, number> = { customer: 0, commerce: 0, marketing: 0, operations: 0, analytics: 0 };

  for (const [cat, keywords] of Object.entries(KEYWORDS) as [Category, string[]][]) {
    for (const kw of keywords) {
      if (msg.includes(kw)) scores[cat] += kw.length > 4 ? 2 : 1; // longer keywords = higher weight
    }
  }
  return scores;
}

/**
 * Select the most relevant tools for the given user message.
 * Returns a focused subset (~20-30 tools) from the full 151 tool catalog.
 */
export function selectTools(message: string, supabase: Db): ToolMap {
  const scores = scoreCategories(message);

  // Sort categories by score descending
  const ranked = (Object.entries(scores) as [Category, number][]).sort((a, b) => b[1] - a[1]);

  // Build the ALL tools map lazily per category
  const categoryToolsMap: Record<Category, () => ToolMap> = {
    customer: () => createCustomerTools(supabase),
    commerce: () => createCommerceTools(supabase),
    marketing: () => createMarketingTools(supabase),
    operations: () => createOperationsTools(supabase),
    analytics: () => createAnalyticsTools(supabase),
  };

  const selected: ToolMap = {};

  // Always pick the top category's tools
  const topCat = ranked[0];
  const topTools = categoryToolsMap[topCat[0]]();
  Object.assign(selected, topTools);

  // If second category also matched, include it
  if (ranked[1][1] > 0) {
    const secondTools = categoryToolsMap[ranked[1][0]]();
    Object.assign(selected, secondTools);
  }

  // If no category matched at all (generic question), include analytics + customer
  if (ranked[0][1] === 0) {
    Object.assign(selected, categoryToolsMap.analytics());
    Object.assign(selected, categoryToolsMap.customer());
  }

  // Always add universal tools from other categories if not already present
  const allAnalytics = categoryToolsMap.analytics();
  const allCustomer = categoryToolsMap.customer();
  const allCommerce = categoryToolsMap.commerce();
  for (const name of UNIVERSAL_TOOLS) {
    if (!selected[name]) {
      if (name in allAnalytics) selected[name] = allAnalytics[name];
      else if (name in allCustomer) selected[name] = allCustomer[name];
      else if (name in allCommerce) selected[name] = allCommerce[name];
    }
  }

  return selected;
}

/**
 * Get ALL 151 tools (for counting/documentation purposes).
 */
export function createAllTools(supabase: Db): ToolMap {
  return {
    ...createCustomerTools(supabase),
    ...createCommerceTools(supabase),
    ...createMarketingTools(supabase),
    ...createOperationsTools(supabase),
    ...createAnalyticsTools(supabase),
  };
}

/**
 * Get tool count per category.
 */
export function getToolCounts(supabase: Db) {
  return {
    customer: Object.keys(createCustomerTools(supabase)).length,
    commerce: Object.keys(createCommerceTools(supabase)).length,
    marketing: Object.keys(createMarketingTools(supabase)).length,
    operations: Object.keys(createOperationsTools(supabase)).length,
    analytics: Object.keys(createAnalyticsTools(supabase)).length,
  };
}
