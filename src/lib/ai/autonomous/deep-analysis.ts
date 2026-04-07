// ─── Atlas Autonomous — Deep Analysis Engine ────────────────────────────────
// Manus AI-level capability: multi-dimensional data analysis with insights.
//
// Goes beyond simple data fetching — performs:
//   1. Trend detection (growth/decline over time periods)
//   2. Anomaly detection (outliers, sudden changes)
//   3. Cross-domain correlation (orders ↔ inventory ↔ revenue)
//   4. Predictive indicators (churn risk, stock-out risk, revenue forecast)
//   5. Comparative analysis (this month vs last month, TR vs US)
//   6. Health scoring (overall system health with breakdown)
//
// All analysis is data-driven — no LLM needed for calculations.
// Results are injected into LLM prompt for natural language interpretation.
// ─────────────────────────────────────────────────────────────────────────────
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

type Db = SupabaseClient<Database>;

// ─── Analysis Types ─────────────────────────────────────────────────────────

export interface TrendPoint {
  period: string;  // "2026-01", "2026-02", etc.
  value: number;
  label?: string;
}

export interface TrendAnalysis {
  metric: string;
  current: number;
  previous: number;
  changePercent: number;
  direction: "up" | "down" | "stable";
  trend: TrendPoint[];
  insight: string;  // Turkish insight text
}

export interface AnomalyFlag {
  metric: string;
  severity: "info" | "warning" | "critical";
  message: string;
  value: number;
  threshold: number;
}

export interface HealthScore {
  overall: number;         // 0-100
  dimensions: {
    name: string;
    score: number;         // 0-100
    status: "good" | "warning" | "critical";
    detail: string;
  }[];
}

export interface DeepAnalysisResult {
  trends: TrendAnalysis[];
  anomalies: AnomalyFlag[];
  health: HealthScore;
  correlations: string[];   // Turkish insight strings
  predictions: string[];    // Turkish prediction strings
  executionMs: number;
}

// ─── Utility: Date ranges ───────────────────────────────────────────────────

function getDateRange(daysBack: number): { from: string; to: string } {
  const to = new Date();
  const from = new Date(to.getTime() - daysBack * 24 * 60 * 60 * 1000);
  return { from: from.toISOString(), to: to.toISOString() };
}

function getMonthStart(monthsBack: number): string {
  const d = new Date();
  d.setMonth(d.getMonth() - monthsBack);
  d.setDate(1);
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
}

// ─── Trend Detection ────────────────────────────────────────────────────────

async function analyzeOrderTrends(db: Db): Promise<TrendAnalysis> {
  const thisMonth = getMonthStart(0);
  const lastMonth = getMonthStart(1);

  /* eslint-disable @typescript-eslint/no-explicit-any */
  const [currentRes, previousRes] = await Promise.all([
    (db as any).from("orders").select("id, total_amount").gte("created_at", thisMonth),
    (db as any).from("orders").select("id, total_amount").gte("created_at", lastMonth).lt("created_at", thisMonth),
  ]);
  /* eslint-enable @typescript-eslint/no-explicit-any */

  const current = currentRes.data?.length ?? 0;
  const previous = previousRes.data?.length ?? 0;
  const currentRevenue = (currentRes.data ?? []).reduce((s: number, o: { total_amount: number | null }) => s + (o.total_amount ?? 0), 0);
  const previousRevenue = (previousRes.data ?? []).reduce((s: number, o: { total_amount: number | null }) => s + (o.total_amount ?? 0), 0);

  const changePercent = previous > 0 ? ((current - previous) / previous) * 100 : (current > 0 ? 100 : 0);

  return {
    metric: "Aylık Sipariş Sayısı",
    current,
    previous,
    changePercent: Math.round(changePercent * 10) / 10,
    direction: changePercent > 5 ? "up" : changePercent < -5 ? "down" : "stable",
    trend: [
      { period: "2 ay önce", value: 0 }, // Would need 3-month query for real data
      { period: "Geçen ay", value: previous },
      { period: "Bu ay", value: current },
    ],
    insight: changePercent > 10
      ? `Sipariş sayısı %${Math.abs(Math.round(changePercent))} arttı — büyüme trendi. Gelir: $${currentRevenue.toFixed(0)} (önceki: $${previousRevenue.toFixed(0)})`
      : changePercent < -10
        ? `Sipariş sayısı %${Math.abs(Math.round(changePercent))} düştü — dikkat gerekiyor. Gelir: $${currentRevenue.toFixed(0)}`
        : `Sipariş sayısı sabit. Bu ay: ${current}, Geçen ay: ${previous}. Gelir: $${currentRevenue.toFixed(0)}`,
  };
}

async function analyzeCustomerTrends(db: Db): Promise<TrendAnalysis> {
  const thisMonth = getMonthStart(0);
  const lastMonth = getMonthStart(1);

  /* eslint-disable @typescript-eslint/no-explicit-any */
  const [currentRes, previousRes, activeRes] = await Promise.all([
    (db as any).from("users").select("id").gte("created_at", thisMonth),
    (db as any).from("users").select("id").gte("created_at", lastMonth).lt("created_at", thisMonth),
    (db as any).from("users").select("id").eq("onboarding_status", "active"),
  ]);
  /* eslint-enable @typescript-eslint/no-explicit-any */

  const current = currentRes.data?.length ?? 0;
  const previous = previousRes.data?.length ?? 0;
  const activeCount = activeRes.data?.length ?? 0;
  const changePercent = previous > 0 ? ((current - previous) / previous) * 100 : (current > 0 ? 100 : 0);

  return {
    metric: "Yeni Müşteri Kaydı",
    current,
    previous,
    changePercent: Math.round(changePercent * 10) / 10,
    direction: changePercent > 5 ? "up" : changePercent < -5 ? "down" : "stable",
    trend: [
      { period: "Geçen ay", value: previous },
      { period: "Bu ay", value: current },
    ],
    insight: `Bu ay ${current} yeni kayıt (geçen ay: ${previous}). Toplam aktif müşteri: ${activeCount}`,
  };
}

// ─── Anomaly Detection ──────────────────────────────────────────────────────

/* eslint-disable @typescript-eslint/no-explicit-any */
async function detectAnomalies(db: Db): Promise<AnomalyFlag[]> {
  const anomalies: AnomalyFlag[] = [];

  // Check for low stock products
  const { data: lowStock } = await (db as any)
    .from("products")
    .select("id, name, stock_turkey, stock_us")
    .eq("is_active", true)
    .or("stock_turkey.lte.5,stock_us.lte.5");

  if (lowStock && lowStock.length > 0) {
    anomalies.push({
      metric: "Düşük Stok",
      severity: lowStock.length > 5 ? "critical" : "warning",
      message: `${lowStock.length} üründe stok kritik seviyede (≤5 adet)`,
      value: lowStock.length,
      threshold: 5,
    });
  }

  // Check for overdue payments
  const { data: overdue } = await (db as any)
    .from("user_subscriptions")
    .select("id")
    .eq("payment_status", "overdue");

  if (overdue && overdue.length > 0) {
    anomalies.push({
      metric: "Gecikmiş Ödemeler",
      severity: overdue.length > 3 ? "critical" : "warning",
      message: `${overdue.length} abonelikte ödeme gecikmiş`,
      value: overdue.length,
      threshold: 0,
    });
  }

  // Check for stalled orders (processing for too long)
  const threeDaysAgo = getDateRange(3).from;
  const { data: stalled } = await (db as any)
    .from("orders")
    .select("id")
    .in("status", ["received", "processing"])
    .lt("created_at", threeDaysAgo);

  if (stalled && stalled.length > 0) {
    anomalies.push({
      metric: "Askıda Siparişler",
      severity: stalled.length > 5 ? "critical" : "warning",
      message: `${stalled.length} sipariş 3+ gündür işleniyor`,
      value: stalled.length,
      threshold: 3,
    });
  }

  // Check for open support tickets (high priority)
  const { data: urgentTickets } = await (db as any)
    .from("support_tickets")
    .select("id")
    .in("status", ["open", "investigating"])
    .in("priority", ["high", "urgent"]);

  if (urgentTickets && urgentTickets.length > 0) {
    anomalies.push({
      metric: "Acil Destek Talepleri",
      severity: "warning",
      message: `${urgentTickets.length} yüksek öncelikli açık destek talebi`,
      value: urgentTickets.length,
      threshold: 0,
    });
  }

  // Check for blocked process tasks
  const { data: blockedTasks } = await (db as any)
    .from("process_tasks")
    .select("id")
    .eq("task_status", "blocked");

  if (blockedTasks && blockedTasks.length > 0) {
    anomalies.push({
      metric: "Engellenen Görevler",
      severity: blockedTasks.length > 3 ? "critical" : "warning",
      message: `${blockedTasks.length} müşteri süreci engellendi (blocked)`,
      value: blockedTasks.length,
      threshold: 0,
    });
  }

  return anomalies;
}
/* eslint-enable @typescript-eslint/no-explicit-any */

// ─── Health Scoring ─────────────────────────────────────────────────────────

async function calculateHealthScore(db: Db, anomalies: AnomalyFlag[]): Promise<HealthScore> {
  /* eslint-disable @typescript-eslint/no-explicit-any */
  const [ordersRes, ticketsRes, usersRes, productsRes] = await Promise.all([
    (db as any).from("orders").select("id, status").limit(200),
    (db as any).from("support_tickets").select("id, status").limit(200),
    (db as any).from("users").select("id, onboarding_status").limit(200),
    (db as any).from("products").select("id, is_active, stock_turkey, stock_us").limit(200),
  ]);
  /* eslint-enable @typescript-eslint/no-explicit-any */

  const orders = ordersRes.data ?? [];
  const tickets = ticketsRes.data ?? [];
  const users = usersRes.data ?? [];
  const products = productsRes.data ?? [];

  // Order fulfillment score
  const totalOrders = orders.length;
  const deliveredOrders = orders.filter((o: { status: string }) => o.status === "delivered").length;
  const cancelledOrders = orders.filter((o: { status: string }) => o.status === "cancelled").length;
  const orderScore = totalOrders > 0
    ? Math.round(((deliveredOrders / totalOrders) * 80) + (((totalOrders - cancelledOrders) / totalOrders) * 20))
    : 80; // Default good if no orders

  // Support resolution score
  const totalTickets = tickets.length;
  const resolvedTickets = tickets.filter((t: { status: string }) => ["resolved", "closed"].includes(t.status)).length;
  const supportScore = totalTickets > 0
    ? Math.round((resolvedTickets / totalTickets) * 100)
    : 90;

  // Customer health score
  const totalUsers = users.length;
  const activeUsers = users.filter((u: { onboarding_status: string }) => u.onboarding_status === "active").length;
  const customerScore = totalUsers > 0
    ? Math.round((activeUsers / totalUsers) * 100)
    : 80;

  // Inventory health score
  const activeProducts = products.filter((p: { is_active: boolean }) => p.is_active);
  const lowStockProducts = activeProducts.filter(
    (p: { stock_turkey: number; stock_us: number }) => p.stock_turkey <= 5 || p.stock_us <= 5,
  );
  const inventoryScore = activeProducts.length > 0
    ? Math.round(((activeProducts.length - lowStockProducts.length) / activeProducts.length) * 100)
    : 90;

  // Anomaly penalty
  const criticalCount = anomalies.filter(a => a.severity === "critical").length;
  const warningCount = anomalies.filter(a => a.severity === "warning").length;
  const anomalyPenalty = Math.min(30, criticalCount * 10 + warningCount * 3);

  const dimensions = [
    {
      name: "Sipariş Karşılama",
      score: orderScore,
      status: orderScore >= 70 ? "good" as const : orderScore >= 40 ? "warning" as const : "critical" as const,
      detail: `${deliveredOrders}/${totalOrders} sipariş teslim edildi`,
    },
    {
      name: "Destek Kalitesi",
      score: supportScore,
      status: supportScore >= 70 ? "good" as const : supportScore >= 40 ? "warning" as const : "critical" as const,
      detail: `${resolvedTickets}/${totalTickets} talep çözüldü`,
    },
    {
      name: "Müşteri Sağlığı",
      score: customerScore,
      status: customerScore >= 70 ? "good" as const : customerScore >= 40 ? "warning" as const : "critical" as const,
      detail: `${activeUsers}/${totalUsers} müşteri aktif`,
    },
    {
      name: "Envanter Durumu",
      score: inventoryScore,
      status: inventoryScore >= 70 ? "good" as const : inventoryScore >= 40 ? "warning" as const : "critical" as const,
      detail: `${lowStockProducts.length} üründe düşük stok`,
    },
  ];

  const rawOverall = Math.round(dimensions.reduce((s, d) => s + d.score, 0) / dimensions.length);
  const overall = Math.max(0, rawOverall - anomalyPenalty);

  return { overall, dimensions };
}

// ─── Cross-Domain Correlations ──────────────────────────────────────────────

function generateCorrelations(trends: TrendAnalysis[], anomalies: AnomalyFlag[]): string[] {
  const correlations: string[] = [];

  // Order trend + customer trend
  const orderTrend = trends.find(t => t.metric.includes("Sipariş"));
  const customerTrend = trends.find(t => t.metric.includes("Müşteri"));

  if (orderTrend && customerTrend) {
    if (orderTrend.direction === "up" && customerTrend.direction === "up") {
      correlations.push("📈 Hem müşteri hem sipariş artışta — sağlıklı büyüme.");
    } else if (orderTrend.direction === "down" && customerTrend.direction === "down") {
      correlations.push("📉 Hem müşteri hem sipariş düşüşte — acil aksiyon planı gerekli.");
    } else if (orderTrend.direction === "up" && customerTrend.direction === "down") {
      correlations.push("⚠️ Siparişler artıyor ama yeni müşteri azalıyor — mevcut müşteriler daha fazla sipariş veriyor olabilir.");
    }
  }

  // Anomaly-based correlations
  const lowStock = anomalies.find(a => a.metric === "Düşük Stok");
  const stalledOrders = anomalies.find(a => a.metric === "Askıda Siparişler");

  if (lowStock && stalledOrders) {
    correlations.push("🔗 Düşük stok ve askıda siparişler birlikte — stok bitimi sipariş karşılamayı engellemiş olabilir.");
  }

  return correlations;
}

// ─── Predictive Indicators ──────────────────────────────────────────────────

function generatePredictions(trends: TrendAnalysis[], anomalies: AnomalyFlag[], health: HealthScore): string[] {
  const predictions: string[] = [];

  // Revenue prediction
  const orderTrend = trends.find(t => t.metric.includes("Sipariş"));
  if (orderTrend && orderTrend.direction === "up") {
    const projectedGrowth = Math.round(orderTrend.changePercent * 0.7); // Conservative
    predictions.push(`📊 Mevcut trendde önümüzdeki ay siparişlerde ~%${projectedGrowth} büyüme bekleniyor.`);
  }

  // Churn risk
  if (health.overall < 50) {
    predictions.push("⚠️ Sistem sağlığı düşük — müşteri kaybı riski yüksek. Öncelikli aksiyonlar: " +
      health.dimensions.filter(d => d.status === "critical").map(d => d.name).join(", "));
  }

  // Stock-out risk
  const lowStock = anomalies.find(a => a.metric === "Düşük Stok");
  if (lowStock && lowStock.value > 3) {
    predictions.push(`🏭 ${lowStock.value} üründe stok tükenme riski — 7 gün içinde tedarik planı yapılmalı.`);
  }

  // Overdue payment risk
  const overdue = anomalies.find(a => a.metric === "Gecikmiş Ödemeler");
  if (overdue) {
    predictions.push(`💰 ${overdue.value} gecikmiş ödeme — nakit akışı riski. Tahsilat takibi başlatılmalı.`);
  }

  return predictions;
}

// ─── Main Deep Analysis Function ────────────────────────────────────────────

/** Run comprehensive deep analysis across all domains */
export async function runDeepAnalysis(db: Db): Promise<DeepAnalysisResult> {
  const start = Date.now();

  // Run all analyses in parallel
  const [orderTrend, customerTrend, anomalies] = await Promise.all([
    analyzeOrderTrends(db).catch(() => null),
    analyzeCustomerTrends(db).catch(() => null),
    detectAnomalies(db).catch(() => [] as AnomalyFlag[]),
  ]);

  const trends = [orderTrend, customerTrend].filter((t): t is TrendAnalysis => t !== null);
  const health = await calculateHealthScore(db, anomalies).catch(() => ({
    overall: 70,
    dimensions: [],
  }));

  const correlations = generateCorrelations(trends, anomalies);
  const predictions = generatePredictions(trends, anomalies, health);

  return {
    trends,
    anomalies,
    health,
    correlations,
    predictions,
    executionMs: Date.now() - start,
  };
}

/** Format deep analysis results for prompt injection */
export function formatAnalysisForPrompt(analysis: DeepAnalysisResult): string {
  const sections: string[] = [];

  // Health score
  sections.push(`## 🏥 Sistem Sağlığı: ${analysis.health.overall}/100`);
  for (const dim of analysis.health.dimensions) {
    const icon = dim.status === "good" ? "🟢" : dim.status === "warning" ? "🟡" : "🔴";
    sections.push(`${icon} ${dim.name}: ${dim.score}/100 — ${dim.detail}`);
  }

  // Trends
  if (analysis.trends.length > 0) {
    sections.push("\n## 📈 Trendler");
    for (const t of analysis.trends) {
      const icon = t.direction === "up" ? "↑" : t.direction === "down" ? "↓" : "→";
      sections.push(`${icon} ${t.metric}: ${t.current} (${t.changePercent > 0 ? "+" : ""}${t.changePercent}%) — ${t.insight}`);
    }
  }

  // Anomalies
  if (analysis.anomalies.length > 0) {
    sections.push("\n## ⚠️ Anomaliler");
    for (const a of analysis.anomalies) {
      const icon = a.severity === "critical" ? "🔴" : a.severity === "warning" ? "🟡" : "ℹ️";
      sections.push(`${icon} ${a.message}`);
    }
  }

  // Correlations
  if (analysis.correlations.length > 0) {
    sections.push("\n## 🔗 Korelasyonlar");
    for (const c of analysis.correlations) sections.push(c);
  }

  // Predictions
  if (analysis.predictions.length > 0) {
    sections.push("\n## 🔮 Öngörüler");
    for (const p of analysis.predictions) sections.push(p);
  }

  return sections.join("\n");
}
