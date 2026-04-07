// ─── Atlas Copilot — Domain Data Queries ────────────────────────────────────
// Each domain module fetches its own data from Supabase.
// All column names verified against src/types/database.ts.
// ─────────────────────────────────────────────────────────────────────────────
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import type { AgentRole, DomainData } from "./shared-types";

type Db = SupabaseClient<Database>;

// ─────────────────────────────────────────────────────────────────────────────
// CUSTOMER DOMAIN
// Tables: users, customer_companies, user_subscriptions, invoices, user_roles
// ─────────────────────────────────────────────────────────────────────────────
async function fetchCustomerDomain(db: Db): Promise<DomainData> {
  const start = Date.now();
  const d: Record<string, unknown> = {};
  let records = 0;

  // Total users
  const { count: totalUsers } = await db.from("users").select("*", { count: "exact", head: true });
  d.toplam_kullanici = totalUsers ?? 0;
  records += totalUsers ?? 0;

  // Recent signups (7 days)
  const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString();
  const { data: recentUsers } = await db
    .from("users")
    .select("id,email,first_name,last_name,company_name,onboarding_status,created_at")
    .gte("created_at", weekAgo)
    .order("created_at", { ascending: false })
    .limit(10);
  d.son_7_gun_kayitlar = recentUsers ?? [];
  d.yeni_kayit_sayisi = recentUsers?.length ?? 0;

  // Onboarding distribution
  const { data: allUsers } = await db.from("users").select("onboarding_status");
  if (allUsers) {
    const dist: Record<string, number> = {};
    allUsers.forEach(u => { dist[u.onboarding_status ?? "bilinmiyor"] = (dist[u.onboarding_status ?? "bilinmiyor"] || 0) + 1; });
    d.onboarding_dagilimi = dist;
  }

  // Companies
  const { count: totalCompanies } = await db.from("customer_companies").select("*", { count: "exact", head: true });
  d.toplam_sirket = totalCompanies ?? 0;
  records += totalCompanies ?? 0;

  const { data: companies } = await db
    .from("customer_companies")
    .select("id,company_name,company_type,state_of_formation,status,created_at")
    .order("created_at", { ascending: false })
    .limit(10);
  d.son_sirketler = companies ?? [];

  // Company type distribution
  if (companies && companies.length > 0) {
    const typeDist: Record<string, number> = {};
    companies.forEach(c => { typeDist[c.company_type ?? "other"] = (typeDist[c.company_type ?? "other"] || 0) + 1; });
    d.sirket_turu_dagilimi = typeDist;
  }

  // Subscriptions
  const { data: subs } = await db.from("user_subscriptions").select("plan_tier,payment_status,amount");
  if (subs && subs.length > 0) {
    const planDist: Record<string, number> = {};
    const statusDist: Record<string, number> = {};
    let totalRevenue = 0;
    subs.forEach(s => {
      planDist[s.plan_tier ?? "free"] = (planDist[s.plan_tier ?? "free"] || 0) + 1;
      statusDist[s.payment_status ?? "unknown"] = (statusDist[s.payment_status ?? "unknown"] || 0) + 1;
      totalRevenue += Number(s.amount) || 0;
    });
    d.abonelik_planlari = planDist;
    d.odeme_durumlari = statusDist;
    d.toplam_abonelik_geliri = totalRevenue;
    records += subs.length;
  }

  // Invoices summary
  const { data: invoices } = await db.from("invoices").select("status,amount");
  if (invoices && invoices.length > 0) {
    let total = 0;
    const byStatus: Record<string, { adet: number; tutar: number }> = {};
    invoices.forEach(inv => {
      const s = inv.status ?? "unknown";
      const a = Number(inv.amount) || 0;
      total += a;
      if (!byStatus[s]) byStatus[s] = { adet: 0, tutar: 0 };
      byStatus[s].adet++;
      byStatus[s].tutar += a;
    });
    d.fatura_ozeti = { toplam_tutar_usd: total, toplam_fatura: invoices.length, duruma_gore: byStatus };
    records += invoices.length;
  }

  return { agent: "customer", label: "Müşteri Yönetimi", data: d, recordCount: records, fetchMs: Date.now() - start };
}

// ─────────────────────────────────────────────────────────────────────────────
// COMMERCE DOMAIN
// Tables: orders, products, shipments, warehouse_items
// ─────────────────────────────────────────────────────────────────────────────
async function fetchCommerceDomain(db: Db): Promise<DomainData> {
  const start = Date.now();
  const d: Record<string, unknown> = {};
  let records = 0;

  // Orders
  const { count: totalOrders } = await db.from("orders").select("*", { count: "exact", head: true });
  d.toplam_siparis = totalOrders ?? 0;
  records += totalOrders ?? 0;

  const { data: orders } = await db.from("orders").select("status,platform,total_amount");
  if (orders && orders.length > 0) {
    let totalRevenue = 0;
    const byStatus: Record<string, number> = {};
    const byPlatform: Record<string, { adet: number; gelir: number }> = {};
    orders.forEach(o => {
      const amt = Number(o.total_amount) || 0;
      totalRevenue += amt;
      byStatus[o.status ?? "unknown"] = (byStatus[o.status ?? "unknown"] || 0) + 1;
      const p = o.platform ?? "direct";
      if (!byPlatform[p]) byPlatform[p] = { adet: 0, gelir: 0 };
      byPlatform[p].adet++;
      byPlatform[p].gelir += amt;
    });
    d.toplam_siparis_geliri_usd = totalRevenue;
    d.siparis_durumlari = byStatus;
    d.platform_bazli_siparisler = byPlatform;
  }

  // Recent orders
  const { data: recentOrders } = await db
    .from("orders")
    .select("id,platform_order_id,platform,status,total_amount,created_at")
    .order("created_at", { ascending: false })
    .limit(10);
  d.son_siparisler = recentOrders ?? [];

  // Products
  const { count: totalProducts } = await db.from("products").select("*", { count: "exact", head: true });
  d.toplam_urun = totalProducts ?? 0;
  records += totalProducts ?? 0;

  // Low stock (Turkey warehouse)
  const { data: lowStockTR } = await db
    .from("products")
    .select("id,name,sku,stock_turkey,stock_us,is_active")
    .lt("stock_turkey", 10)
    .eq("is_active", true)
    .order("stock_turkey")
    .limit(10);
  d.dusuk_stok_turkiye = lowStockTR ?? [];

  // Low stock (US warehouse)
  const { data: lowStockUS } = await db
    .from("products")
    .select("id,name,sku,stock_turkey,stock_us,is_active")
    .lt("stock_us", 10)
    .eq("is_active", true)
    .order("stock_us")
    .limit(10);
  d.dusuk_stok_abd = lowStockUS ?? [];

  // Shipments
  const { data: shipments } = await db.from("shipments").select("status,shipment_type");
  if (shipments && shipments.length > 0) {
    const byStatus: Record<string, number> = {};
    const byType: Record<string, number> = {};
    shipments.forEach(s => {
      byStatus[s.status ?? "unknown"] = (byStatus[s.status ?? "unknown"] || 0) + 1;
      byType[s.shipment_type ?? "unknown"] = (byType[s.shipment_type ?? "unknown"] || 0) + 1;
    });
    d.sevkiyat_durumlari = byStatus;
    d.sevkiyat_turleri = byType;
    d.toplam_sevkiyat = shipments.length;
    records += shipments.length;
  }

  // Warehouse items
  const { count: warehouseItems } = await db.from("warehouse_items").select("*", { count: "exact", head: true });
  d.depo_urun_sayisi = warehouseItems ?? 0;

  return { agent: "commerce", label: "E-Ticaret & Lojistik", data: d, recordCount: records, fetchMs: Date.now() - start };
}

// ─────────────────────────────────────────────────────────────────────────────
// MARKETING DOMAIN
// Tables: marketplace_accounts, social_media_accounts, ad_campaigns
// ─────────────────────────────────────────────────────────────────────────────
async function fetchMarketingDomain(db: Db): Promise<DomainData> {
  const start = Date.now();
  const d: Record<string, unknown> = {};
  let records = 0;

  // Marketplace accounts
  const { data: marketplaces } = await db
    .from("marketplace_accounts")
    .select("platform,status,monthly_revenue,total_sales,store_name,seller_rating");
  if (marketplaces && marketplaces.length > 0) {
    let totalRev = 0;
    let totalSales = 0;
    const byPlatform: Record<string, { adet: number; gelir: number; satis: number; ortalama_puan: number }> = {};
    marketplaces.forEach(m => {
      const rev = Number(m.monthly_revenue) || 0;
      const sales = Number(m.total_sales) || 0;
      totalRev += rev;
      totalSales += sales;
      const p = m.platform ?? "other";
      if (!byPlatform[p]) byPlatform[p] = { adet: 0, gelir: 0, satis: 0, ortalama_puan: 0 };
      byPlatform[p].adet++;
      byPlatform[p].gelir += rev;
      byPlatform[p].satis += sales;
      if (m.seller_rating) byPlatform[p].ortalama_puan = Number(m.seller_rating);
    });
    d.pazaryeri_ozeti = {
      toplam_aylik_gelir_usd: totalRev,
      toplam_satis: totalSales,
      toplam_magaza: marketplaces.length,
      platform_bazli: byPlatform,
    };
    records += marketplaces.length;
  }

  // Social media
  const { data: social } = await db
    .from("social_media_accounts")
    .select("platform,followers_count,engagement_rate,posts_count,status,account_name");
  if (social && social.length > 0) {
    let totalFollowers = 0;
    const byPlatform: Record<string, { hesaplar: string[]; takipci: number; etkilesim_orani: number }> = {};
    social.forEach(s => {
      const f = Number(s.followers_count) || 0;
      totalFollowers += f;
      const p = s.platform ?? "other";
      if (!byPlatform[p]) byPlatform[p] = { hesaplar: [], takipci: 0, etkilesim_orani: 0 };
      byPlatform[p].hesaplar.push(s.account_name);
      byPlatform[p].takipci += f;
      byPlatform[p].etkilesim_orani = Number(s.engagement_rate) || 0;
    });
    d.sosyal_medya = {
      toplam_takipci: totalFollowers,
      toplam_hesap: social.length,
      platform_bazli: byPlatform,
    };
    records += social.length;
  }

  // Ad campaigns
  const { data: campaigns } = await db
    .from("ad_campaigns")
    .select("platform,status,campaign_name,total_budget,spent_amount,revenue_generated,clicks,impressions,conversions,roas");
  if (campaigns && campaigns.length > 0) {
    let totalBudget = 0, totalSpent = 0, totalCampaignRev = 0, totalClicks = 0, totalImpressions = 0, totalConversions = 0;
    const byStatus: Record<string, number> = {};
    const byPlatform: Record<string, { adet: number; butce: number; harcama: number; gelir: number }> = {};
    campaigns.forEach(c => {
      totalBudget += Number(c.total_budget) || 0;
      totalSpent += Number(c.spent_amount) || 0;
      totalCampaignRev += Number(c.revenue_generated) || 0;
      totalClicks += Number(c.clicks) || 0;
      totalImpressions += Number(c.impressions) || 0;
      totalConversions += Number(c.conversions) || 0;
      byStatus[c.status ?? "unknown"] = (byStatus[c.status ?? "unknown"] || 0) + 1;
      const p = c.platform ?? "other";
      if (!byPlatform[p]) byPlatform[p] = { adet: 0, butce: 0, harcama: 0, gelir: 0 };
      byPlatform[p].adet++;
      byPlatform[p].butce += Number(c.total_budget) || 0;
      byPlatform[p].harcama += Number(c.spent_amount) || 0;
      byPlatform[p].gelir += Number(c.revenue_generated) || 0;
    });
    d.reklam_ozeti = {
      toplam_kampanya: campaigns.length,
      toplam_butce_usd: totalBudget,
      toplam_harcama_usd: totalSpent,
      toplam_reklam_geliri_usd: totalCampaignRev,
      roas: totalSpent > 0 ? Number((totalCampaignRev / totalSpent).toFixed(2)) : 0,
      toplam_tiklanma: totalClicks,
      toplam_gosterim: totalImpressions,
      toplam_donusum: totalConversions,
      ctr: totalImpressions > 0 ? Number(((totalClicks / totalImpressions) * 100).toFixed(2)) : 0,
      durum_dagilimi: byStatus,
      platform_bazli: byPlatform,
    };
    records += campaigns.length;
  }

  return { agent: "marketing", label: "Pazarlama & Dijital", data: d, recordCount: records, fetchMs: Date.now() - start };
}

// ─────────────────────────────────────────────────────────────────────────────
// FINANCE DOMAIN
// Tables: financial_records, invoices, orders (revenue), ad_campaigns (spend)
// ─────────────────────────────────────────────────────────────────────────────
async function fetchFinanceDomain(db: Db): Promise<DomainData> {
  const start = Date.now();
  const d: Record<string, unknown> = {};
  let records = 0;

  // Financial records
  const { data: financial } = await db
    .from("financial_records")
    .select("record_type,amount,category,transaction_date,description");
  if (financial && financial.length > 0) {
    let income = 0, expense = 0;
    const byCat: Record<string, { gelir: number; gider: number }> = {};
    // Monthly breakdown
    const monthly: Record<string, { gelir: number; gider: number }> = {};
    financial.forEach(r => {
      const a = Number(r.amount) || 0;
      if (r.record_type === "income") income += a;
      else expense += a;
      const cat = r.category ?? "diger";
      if (!byCat[cat]) byCat[cat] = { gelir: 0, gider: 0 };
      if (r.record_type === "income") byCat[cat].gelir += a;
      else byCat[cat].gider += a;
      // Monthly
      const month = r.transaction_date?.substring(0, 7) ?? "unknown";
      if (!monthly[month]) monthly[month] = { gelir: 0, gider: 0 };
      if (r.record_type === "income") monthly[month].gelir += a;
      else monthly[month].gider += a;
    });
    d.finansal_ozet = {
      toplam_gelir_usd: income,
      toplam_gider_usd: expense,
      net_kar_usd: income - expense,
      kar_marji_yuzde: income > 0 ? Number(((income - expense) / income * 100).toFixed(1)) : 0,
      kayit_sayisi: financial.length,
      kategori_bazli: byCat,
      aylik_trend: monthly,
    };
    records += financial.length;
  }

  // Invoice totals
  const { data: invoices } = await db.from("invoices").select("status,amount,currency");
  if (invoices && invoices.length > 0) {
    let totalPaid = 0, totalPending = 0, totalOverdue = 0;
    invoices.forEach(inv => {
      const a = Number(inv.amount) || 0;
      if (inv.status === "paid") totalPaid += a;
      else if (inv.status === "pending") totalPending += a;
      else if (inv.status === "overdue") totalOverdue += a;
    });
    d.fatura_analizi = {
      toplam_fatura: invoices.length,
      odenmis_usd: totalPaid,
      bekleyen_usd: totalPending,
      gecmis_usd: totalOverdue,
      tahsilat_orani: invoices.length > 0
        ? Number((invoices.filter(i => i.status === "paid").length / invoices.length * 100).toFixed(1))
        : 0,
    };
    records += invoices.length;
  }

  // Subscription revenue
  const { data: subs } = await db.from("user_subscriptions").select("plan_tier,amount,payment_status");
  if (subs && subs.length > 0) {
    const planRevenue: Record<string, { adet: number; toplam_usd: number }> = {};
    subs.forEach(s => {
      const tier = s.plan_tier ?? "free";
      if (!planRevenue[tier]) planRevenue[tier] = { adet: 0, toplam_usd: 0 };
      planRevenue[tier].adet++;
      if (s.payment_status === "paid" || s.payment_status === "active") {
        planRevenue[tier].toplam_usd += Number(s.amount) || 0;
      }
    });
    d.abonelik_geliri = planRevenue;
  }

  return { agent: "finance", label: "Finans & Muhasebe", data: d, recordCount: records, fetchMs: Date.now() - start };
}

// ─────────────────────────────────────────────────────────────────────────────
// OPERATIONS DOMAIN
// Tables: support_tickets, process_tasks, form_submissions, notifications
// ─────────────────────────────────────────────────────────────────────────────
async function fetchOperationsDomain(db: Db): Promise<DomainData> {
  const start = Date.now();
  const d: Record<string, unknown> = {};
  let records = 0;

  // Support tickets
  const { data: tickets } = await db.from("support_tickets").select("status,priority,subject,created_at");
  if (tickets && tickets.length > 0) {
    const byStatus: Record<string, number> = {};
    const byPriority: Record<string, number> = {};
    tickets.forEach(t => {
      byStatus[t.status ?? "unknown"] = (byStatus[t.status ?? "unknown"] || 0) + 1;
      byPriority[t.priority ?? "unknown"] = (byPriority[t.priority ?? "unknown"] || 0) + 1;
    });
    d.destek_talepleri = {
      toplam: tickets.length,
      durum_dagilimi: byStatus,
      oncelik_dagilimi: byPriority,
    };
    records += tickets.length;
  }

  // Open tickets (urgent)
  const { data: openTickets } = await db
    .from("support_tickets")
    .select("id,subject,status,priority,created_at")
    .in("status", ["open", "in_progress"])
    .order("created_at", { ascending: false })
    .limit(10);
  d.acik_destek_talepleri = openTickets ?? [];

  // Process tasks
  const { data: tasks } = await db.from("process_tasks").select("task_status,task_category,task_name");
  if (tasks && tasks.length > 0) {
    const byStatus: Record<string, number> = {};
    const byCat: Record<string, number> = {};
    tasks.forEach(t => {
      byStatus[t.task_status ?? "unknown"] = (byStatus[t.task_status ?? "unknown"] || 0) + 1;
      byCat[t.task_category ?? "genel"] = (byCat[t.task_category ?? "genel"] || 0) + 1;
    });
    d.gorevler = { toplam: tasks.length, durum_dagilimi: byStatus, kategori_dagilimi: byCat };
    records += tasks.length;
  }

  // Form submissions
  const { count: totalForms } = await db.from("form_submissions").select("*", { count: "exact", head: true });
  d.form_basvurulari = totalForms ?? 0;
  records += totalForms ?? 0;

  // Pending form submissions
  const { data: pendingForms } = await db
    .from("form_submissions")
    .select("id,form_code,status,created_at")
    .eq("status", "pending")
    .order("created_at", { ascending: false })
    .limit(5);
  d.bekleyen_basvurular = pendingForms ?? [];

  // Unread notifications
  const { count: unread } = await db
    .from("notifications")
    .select("*", { count: "exact", head: true })
    .eq("is_read", false);
  d.okunmamis_bildirimler = unread ?? 0;

  return { agent: "operations", label: "Operasyon & Destek", data: d, recordCount: records, fetchMs: Date.now() - start };
}

// ─────────────────────────────────────────────────────────────────────────────
// STRATEGY DOMAIN (Cross-cutting analytics)
// Tables: All tables (counts), financial_records, audit_logs
// ─────────────────────────────────────────────────────────────────────────────
async function fetchStrategyDomain(db: Db): Promise<DomainData> {
  const start = Date.now();
  const d: Record<string, unknown> = {};
  let records = 0;

  // System-wide table counts
  const tables = [
    "users", "orders", "products", "customer_companies", "invoices",
    "support_tickets", "marketplace_accounts", "ad_campaigns",
    "shipments", "financial_records", "warehouse_items",
    "social_media_accounts", "process_tasks", "form_submissions",
  ] as const;

  const counts: Record<string, number> = {};
  await Promise.all(
    tables.map(async (table) => {
      const { count } = await db.from(table).select("*", { count: "exact", head: true });
      counts[table] = count ?? 0;
      records += count ?? 0;
    }),
  );
  d.sistem_geneli = counts;

  // Financial summary (quick)
  const { data: financial } = await db
    .from("financial_records")
    .select("record_type,amount");
  if (financial && financial.length > 0) {
    let income = 0, expense = 0;
    financial.forEach(r => {
      const a = Number(r.amount) || 0;
      if (r.record_type === "income") income += a;
      else expense += a;
    });
    d.finansal_genel = { toplam_gelir_usd: income, toplam_gider_usd: expense, net_kar_usd: income - expense };
  }

  // Order revenue
  const { data: orders } = await db.from("orders").select("total_amount,status");
  if (orders && orders.length > 0) {
    let totalRev = 0;
    let pendingCount = 0;
    orders.forEach(o => {
      totalRev += Number(o.total_amount) || 0;
      if (o.status === "pending" || o.status === "processing") pendingCount++;
    });
    d.siparis_genel = { toplam_gelir_usd: totalRev, bekleyen_siparis: pendingCount };
  }

  // Recent audit logs (system activity)
  const { data: auditLogs } = await db
    .from("audit_logs")
    .select("action,entity_type,created_at")
    .order("created_at", { ascending: false })
    .limit(10);
  d.son_aktiviteler = auditLogs ?? [];

  // Key health indicators
  const { count: openTickets } = await db
    .from("support_tickets")
    .select("*", { count: "exact", head: true })
    .in("status", ["open", "in_progress"]);
  const { count: unreadNotifs } = await db
    .from("notifications")
    .select("*", { count: "exact", head: true })
    .eq("is_read", false);

  d.saglik_gostergeleri = {
    acik_destek_talebi: openTickets ?? 0,
    okunmamis_bildirim: unreadNotifs ?? 0,
    toplam_kullanici: counts.users ?? 0,
    toplam_siparis: counts.orders ?? 0,
    toplam_urun: counts.products ?? 0,
    toplam_sirket: counts.customer_companies ?? 0,
  };

  return { agent: "strategy", label: "Strateji & Analiz", data: d, recordCount: records, fetchMs: Date.now() - start };
}

// ─────────────────────────────────────────────────────────────────────────────
// PUBLIC API — Fetch domain data by agent role
// ─────────────────────────────────────────────────────────────────────────────

const FETCHERS: Record<Exclude<AgentRole, "coordinator">, (db: Db) => Promise<DomainData>> = {
  customer: fetchCustomerDomain,
  commerce: fetchCommerceDomain,
  marketing: fetchMarketingDomain,
  finance: fetchFinanceDomain,
  operations: fetchOperationsDomain,
  strategy: fetchStrategyDomain,
};

/**
 * Fetch data for multiple domain agents in parallel.
 * Always includes strategy (cross-domain analytics) as baseline.
 */
export async function fetchDomainData(
  agents: AgentRole[],
  db: Db,
): Promise<DomainData[]> {
  // Deduplicate, ensure strategy is always present
  const toFetch = new Set<Exclude<AgentRole, "coordinator">>(["strategy"]);
  for (const agent of agents) {
    if (agent !== "coordinator") {
      toFetch.add(agent as Exclude<AgentRole, "coordinator">);
    }
  }

  const results = await Promise.all(
    [...toFetch].map(async (agent) => {
      try {
        return await FETCHERS[agent](db);
      } catch (err) {
        console.error(`[Atlas Copilot] ${agent} fetch error:`, err);
        return {
          agent,
          label: agent,
          data: { hata: "Veri alınamadı" },
          recordCount: 0,
          fetchMs: 0,
        } satisfies DomainData;
      }
    }),
  );

  return results;
}
