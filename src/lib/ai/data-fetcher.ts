// ─── Atlas AI — Smart Data Fetcher ──────────────────────────────────────────
// Kullanıcı mesajına göre akıllı veri toplama.
// Tool calling yerine "data-first" yaklaşım: önce veriyi çek, sonra LLM'e ver.
// qwen2.5:7b dahil HER model ile çalışır (tool calling desteği gerekmez).
// ─────────────────────────────────────────────────────────────────────────────
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

type Db = SupabaseClient<Database>;
type Category =
  | "customer"
  | "commerce"
  | "marketing"
  | "operations"
  | "analytics";

// ─── Keyword maps (Turkish + English) ───────────────────────────────────────
const KEYWORDS: Record<Category, string[]> = {
  customer: [
    "müşteri",
    "kullanıcı",
    "user",
    "customer",
    "şirket",
    "company",
    "llc",
    "corporation",
    "fatura",
    "invoice",
    "billing",
    "ödeme",
    "abonelik",
    "subscription",
    "rol",
    "role",
    "davet",
    "invitation",
    "onboarding",
    "profil",
    "hesap",
    "account",
    "kayıt",
  ],
  commerce: [
    "sipariş",
    "order",
    "ürün",
    "product",
    "stok",
    "stock",
    "envanter",
    "inventory",
    "depo",
    "warehouse",
    "kargo",
    "shipment",
    "shipping",
    "sevkiyat",
    "teslimat",
    "sku",
    "barkod",
  ],
  marketing: [
    "pazaryeri",
    "marketplace",
    "amazon",
    "ebay",
    "etsy",
    "shopify",
    "walmart",
    "tiktok",
    "sosyal",
    "social",
    "instagram",
    "facebook",
    "youtube",
    "reklam",
    "campaign",
    "kampanya",
    "ads",
    "ppc",
    "roas",
    "mağaza",
    "store",
  ],
  operations: [
    "form",
    "başvuru",
    "submission",
    "görev",
    "task",
    "workflow",
    "destek",
    "support",
    "ticket",
    "talep",
    "bildirim",
    "notification",
    "iletişim",
    "contact",
    "leads",
  ],
  analytics: [
    "rapor",
    "report",
    "analiz",
    "analytics",
    "dashboard",
    "trend",
    "performans",
    "gelir",
    "revenue",
    "gider",
    "expense",
    "kâr",
    "profit",
    "finans",
    "finance",
    "audit",
    "log",
    "sistem",
    "system",
    "health",
    "özet",
    "summary",
    "genel",
    "overview",
    "toplam",
    "total",
    "aylık",
    "monthly",
    "kaç",
    "sayı",
    "count",
    "istatistik",
    "stats",
  ],
};

function scoreCategories(message: string): Record<Category, number> {
  const msg = message.toLowerCase();
  const scores: Record<Category, number> = {
    customer: 0,
    commerce: 0,
    marketing: 0,
    operations: 0,
    analytics: 0,
  };
  for (const [cat, keywords] of Object.entries(KEYWORDS) as [
    Category,
    string[],
  ][]) {
    for (const kw of keywords) {
      if (msg.includes(kw)) scores[cat] += kw.length > 4 ? 2 : 1;
    }
  }
  return scores;
}

// ─── Data Fetchers per Category ─────────────────────────────────────────────

async function fetchCustomerData(supabase: Db) {
  const results: Record<string, unknown> = {};

  // User stats
  const { count: totalUsers } = await supabase
    .from("users")
    .select("*", { count: "exact", head: true });
  results.toplam_kullanici = totalUsers ?? 0;

  // Recent signups (last 7 days)
  const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString();
  const { data: recentUsers } = await supabase
    .from("users")
    .select("id,email,first_name,last_name,company_name,onboarding_status,created_at")
    .gte("created_at", weekAgo)
    .order("created_at", { ascending: false })
    .limit(10);
  results.son_7_gun_kayitlar = recentUsers ?? [];

  // Onboarding status distribution
  const { data: allUsers } = await supabase
    .from("users")
    .select("onboarding_status");
  if (allUsers) {
    const dist: Record<string, number> = {};
    allUsers.forEach((u) => {
      const s = u.onboarding_status ?? "unknown";
      dist[s] = (dist[s] || 0) + 1;
    });
    results.onboarding_dagilimi = dist;
  }

  // Companies
  const { count: totalCompanies } = await supabase
    .from("customer_companies")
    .select("*", { count: "exact", head: true });
  results.toplam_sirket = totalCompanies ?? 0;

  const { data: companies } = await supabase
    .from("customer_companies")
    .select("id,company_name,company_type,state_of_formation,status,created_at")
    .order("created_at", { ascending: false })
    .limit(10);
  results.son_sirketler = companies ?? [];

  // Subscriptions
  const { data: subs } = await supabase
    .from("user_subscriptions")
    .select("plan_tier,payment_status");
  if (subs) {
    const planDist: Record<string, number> = {};
    const statusDist: Record<string, number> = {};
    subs.forEach((s) => {
      planDist[s.plan_tier ?? "unknown"] = (planDist[s.plan_tier ?? "unknown"] || 0) + 1;
      statusDist[s.payment_status ?? "unknown"] = (statusDist[s.payment_status ?? "unknown"] || 0) + 1;
    });
    results.abonelik_planlari = planDist;
    results.abonelik_durumlari = statusDist;
  }

  // Invoices summary
  const { data: invoices } = await supabase
    .from("invoices")
    .select("status,amount");
  if (invoices) {
    let total = 0;
    const byStatus: Record<string, { count: number; amount: number }> = {};
    invoices.forEach((inv) => {
      const s = inv.status ?? "unknown";
      const a = Number(inv.amount) || 0;
      total += a;
      if (!byStatus[s]) byStatus[s] = { count: 0, amount: 0 };
      byStatus[s].count++;
      byStatus[s].amount += a;
    });
    results.fatura_ozeti = { toplam_tutar: total, duruma_gore: byStatus };
  }

  return results;
}

async function fetchCommerceData(supabase: Db) {
  const results: Record<string, unknown> = {};

  // Order stats
  const { count: totalOrders } = await supabase
    .from("orders")
    .select("*", { count: "exact", head: true });
  results.toplam_siparis = totalOrders ?? 0;

  const { data: orders } = await supabase
    .from("orders")
    .select("status,platform,total_amount");
  if (orders) {
    let totalRevenue = 0;
    const byStatus: Record<string, number> = {};
    const byPlatform: Record<string, number> = {};
    orders.forEach((o) => {
      totalRevenue += Number(o.total_amount) || 0;
      byStatus[o.status ?? "unknown"] = (byStatus[o.status ?? "unknown"] || 0) + 1;
      byPlatform[o.platform ?? "unknown"] = (byPlatform[o.platform ?? "unknown"] || 0) + 1;
    });
    results.toplam_gelir = totalRevenue;
    results.siparis_durumlari = byStatus;
    results.platform_dagilimi = byPlatform;
  }

  // Recent orders
  const { data: recentOrders } = await supabase
    .from("orders")
    .select("id,platform_order_id,platform,status,total_amount,created_at")
    .order("created_at", { ascending: false })
    .limit(10);
  results.son_siparisler = recentOrders ?? [];

  // Product stats
  const { count: totalProducts } = await supabase
    .from("products")
    .select("*", { count: "exact", head: true });
  results.toplam_urun = totalProducts ?? 0;

  // Low stock check (stock_turkey or stock_us)
  const { data: lowStockTR } = await supabase
    .from("products")
    .select("id,name,sku,stock_turkey,stock_us,is_active")
    .lt("stock_turkey", 10)
    .eq("is_active", true)
    .order("stock_turkey")
    .limit(10);
  const { data: lowStockUS } = await supabase
    .from("products")
    .select("id,name,sku,stock_turkey,stock_us,is_active")
    .lt("stock_us", 10)
    .eq("is_active", true)
    .order("stock_us")
    .limit(10);
  results.dusuk_stok_turkiye = lowStockTR ?? [];
  results.dusuk_stok_abd = lowStockUS ?? [];

  // Shipments
  const { data: shipments } = await supabase
    .from("shipments")
    .select("status,shipment_type");
  if (shipments) {
    const byStatus: Record<string, number> = {};
    shipments.forEach((s) => {
      byStatus[s.status ?? "unknown"] = (byStatus[s.status ?? "unknown"] || 0) + 1;
    });
    results.sevkiyat_durumlari = byStatus;
  }

  return results;
}

async function fetchMarketingData(supabase: Db) {
  const results: Record<string, unknown> = {};

  // Marketplace accounts
  const { data: marketplaces } = await supabase
    .from("marketplace_accounts")
    .select("platform,status,monthly_revenue,total_sales");
  if (marketplaces) {
    let totalRev = 0;
    const byPlatform: Record<string, { count: number; revenue: number }> = {};
    marketplaces.forEach((m) => {
      const rev = Number(m.monthly_revenue) || 0;
      totalRev += rev;
      const p = m.platform ?? "unknown";
      if (!byPlatform[p]) byPlatform[p] = { count: 0, revenue: 0 };
      byPlatform[p].count++;
      byPlatform[p].revenue += rev;
    });
    results.toplam_pazaryeri_gelir = totalRev;
    results.platform_bazli = byPlatform;
  }

  // Social media
  const { data: social } = await supabase
    .from("social_media_accounts")
    .select("platform,followers_count,engagement_rate,status");
  if (social) {
    const byPlatform: Record<string, { count: number; followers: number }> = {};
    social.forEach((s) => {
      const p = s.platform ?? "unknown";
      if (!byPlatform[p]) byPlatform[p] = { count: 0, followers: 0 };
      byPlatform[p].count++;
      byPlatform[p].followers += Number(s.followers_count) || 0;
    });
    results.sosyal_medya = byPlatform;
  }

  // Ad campaigns
  const { data: campaigns } = await supabase
    .from("ad_campaigns")
    .select("platform,status,total_budget,spent_amount,revenue_generated,clicks,impressions");
  if (campaigns) {
    let totalBudget = 0,
      totalSpent = 0,
      totalCampaignRev = 0;
    const byStatus: Record<string, number> = {};
    campaigns.forEach((c) => {
      totalBudget += Number(c.total_budget) || 0;
      totalSpent += Number(c.spent_amount) || 0;
      totalCampaignRev += Number(c.revenue_generated) || 0;
      byStatus[c.status ?? "unknown"] = (byStatus[c.status ?? "unknown"] || 0) + 1;
    });
    results.reklam_ozeti = {
      toplam_butce: totalBudget,
      toplam_harcama: totalSpent,
      toplam_gelir: totalCampaignRev,
      roas: totalSpent > 0 ? (totalCampaignRev / totalSpent).toFixed(2) : "N/A",
      durumlari: byStatus,
    };
  }

  return results;
}

async function fetchOperationsData(supabase: Db) {
  const results: Record<string, unknown> = {};

  // Support tickets
  const { data: tickets } = await supabase
    .from("support_tickets")
    .select("status,priority");
  if (tickets) {
    const byStatus: Record<string, number> = {};
    const byPriority: Record<string, number> = {};
    tickets.forEach((t) => {
      byStatus[t.status ?? "unknown"] = (byStatus[t.status ?? "unknown"] || 0) + 1;
      byPriority[t.priority ?? "unknown"] = (byPriority[t.priority ?? "unknown"] || 0) + 1;
    });
    results.destek_talepleri = {
      toplam: tickets.length,
      duruma_gore: byStatus,
      oncelik_dagilimi: byPriority,
    };
  }

  // Recent open tickets
  const { data: openTickets } = await supabase
    .from("support_tickets")
    .select("id,subject,status,priority,created_at")
    .in("status", ["open", "in_progress"])
    .order("created_at", { ascending: false })
    .limit(10);
  results.acik_talepler = openTickets ?? [];

  // Tasks
  const { data: tasks } = await supabase
    .from("process_tasks")
    .select("task_status,task_category");
  if (tasks) {
    const byStatus: Record<string, number> = {};
    const byCat: Record<string, number> = {};
    tasks.forEach((t) => {
      byStatus[t.task_status ?? "unknown"] = (byStatus[t.task_status ?? "unknown"] || 0) + 1;
      byCat[t.task_category ?? "unknown"] = (byCat[t.task_category ?? "unknown"] || 0) + 1;
    });
    results.gorevler = { toplam: tasks.length, duruma_gore: byStatus, kategori_dagilimi: byCat };
  }

  // Form submissions
  const { count: totalSubmissions } = await supabase
    .from("form_submissions")
    .select("*", { count: "exact", head: true });
  results.form_basvurulari = totalSubmissions ?? 0;

  // Notifications
  const { count: unreadNotifications } = await supabase
    .from("notifications")
    .select("*", { count: "exact", head: true })
    .eq("is_read", false);
  results.okunmamis_bildirimler = unreadNotifications ?? 0;

  return results;
}

async function fetchAnalyticsData(supabase: Db) {
  const results: Record<string, unknown> = {};

  // Financial summary
  const { data: financial } = await supabase
    .from("financial_records")
    .select("record_type,amount,category,transaction_date");
  if (financial) {
    let income = 0,
      expense = 0;
    const byCat: Record<string, number> = {};
    financial.forEach((r) => {
      const a = Number(r.amount) || 0;
      if (r.record_type === "income") income += a;
      else expense += a;
      byCat[r.category ?? "unknown"] = (byCat[r.category ?? "unknown"] || 0) + a;
    });
    results.finansal_ozet = {
      toplam_gelir: income,
      toplam_gider: expense,
      net_kar: income - expense,
      kategori_bazli: byCat,
    };
  }

  // System health — table counts
  const tables = [
    "users",
    "orders",
    "products",
    "customer_companies",
    "invoices",
    "support_tickets",
    "marketplace_accounts",
    "ad_campaigns",
    "shipments",
    "financial_records",
  ] as const;
  const counts: Record<string, number> = {};
  for (const table of tables) {
    const { count } = await supabase
      .from(table)
      .select("*", { count: "exact", head: true });
    counts[table] = count ?? 0;
  }
  results.tablo_sayilari = counts;

  // Dashboard overview
  results.toplam_kullanici = counts.users;
  results.toplam_siparis = counts.orders;
  results.toplam_urun = counts.products;
  results.toplam_sirket = counts.customer_companies;
  results.toplam_destek_talebi = counts.support_tickets;

  // Recent audit logs
  const { data: auditLogs } = await supabase
    .from("audit_logs")
    .select("id,action,entity_type,entity_id,created_at")
    .order("created_at", { ascending: false })
    .limit(5);
  results.son_audit_loglari = auditLogs ?? [];

  return results;
}

// ─── Main Export ────────────────────────────────────────────────────────────

export interface FetchedContext {
  categories: Category[];
  data: Record<string, unknown>;
  fetchTimeMs: number;
}

/**
 * Kullanıcı mesajını analiz et, ilgili veritabanı sorgularını çalıştır,
 * yapılandırılmış bağlam verisi döndür.
 */
export async function fetchContextForMessage(
  message: string,
  supabase: Db,
): Promise<FetchedContext> {
  const start = Date.now();
  const scores = scoreCategories(message);
  const ranked = (Object.entries(scores) as [Category, number][]).sort(
    (a, b) => b[1] - a[1],
  );

  // Always fetch analytics (it's the base), plus top-scoring categories
  const toFetch = new Set<Category>(["analytics"]);
  if (ranked[0][1] > 0) toFetch.add(ranked[0][0]);
  if (ranked[1][1] > 0) toFetch.add(ranked[1][0]);
  // If nothing matched, also add customer (most common queries)
  if (ranked[0][1] === 0) toFetch.add("customer");

  const fetchers: Record<Category, (db: Db) => Promise<Record<string, unknown>>> = {
    customer: fetchCustomerData,
    commerce: fetchCommerceData,
    marketing: fetchMarketingData,
    operations: fetchOperationsData,
    analytics: fetchAnalyticsData,
  };

  // Fetch all needed categories in parallel
  const entries = await Promise.all(
    [...toFetch].map(async (cat) => {
      try {
        const data = await fetchers[cat](supabase);
        return [cat, data] as const;
      } catch {
        return [cat, { hata: "veri alinamadi" }] as const;
      }
    }),
  );

  const data: Record<string, unknown> = {};
  const categories: Category[] = [];
  for (const [cat, catData] of entries) {
    data[cat] = catData;
    categories.push(cat);
  }

  return { categories, data, fetchTimeMs: Date.now() - start };
}
