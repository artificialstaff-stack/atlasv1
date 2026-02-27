/**
 * ─── Atlas Platform — Custom Reports Builder ───
 * Generate dynamic reports from order, product, and invoice data.
 */

import { createClient } from "@/lib/supabase/server";

export type ReportType = "orders_summary" | "revenue_by_country" | "product_performance" | "invoice_aging";

export interface ReportConfig {
  type: ReportType;
  dateFrom?: string;
  dateTo?: string;
  groupBy?: string;
}

export interface ReportResult {
  title: string;
  generatedAt: string;
  rows: Record<string, unknown>[];
  summary: Record<string, unknown>;
}

export async function generateReport(
  userId: string,
  config: ReportConfig
): Promise<ReportResult> {
  const supabase = await createClient();
  const now = new Date().toISOString();
  const dateFrom = config.dateFrom || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
  const dateTo = config.dateTo || now;

  switch (config.type) {
    case "orders_summary":
      return generateOrdersSummary(supabase, userId, dateFrom, dateTo);
    case "revenue_by_country":
      return generateRevenueByCountry(supabase, userId, dateFrom, dateTo);
    case "product_performance":
      return generateProductPerformance(supabase, userId, dateFrom, dateTo);
    case "invoice_aging":
      return generateInvoiceAging(supabase, userId);
    default:
      throw new Error(`Bilinmeyen rapor türü: ${config.type}`);
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function generateOrdersSummary(supabase: any, userId: string, dateFrom: string, dateTo: string): Promise<ReportResult> {
  const { data: orders } = await supabase
    .from("orders")
    .select("status, destination, created_at")
    .eq("user_id", userId)
    .gte("created_at", dateFrom)
    .lte("created_at", dateTo);

  const statusCounts: Record<string, number> = {};
  (orders ?? []).forEach((o: { status: string }) => {
    statusCounts[o.status] = (statusCounts[o.status] || 0) + 1;
  });

  const rows = Object.entries(statusCounts).map(([status, count]) => ({ status, count }));

  return {
    title: "Sipariş Özeti",
    generatedAt: new Date().toISOString(),
    rows,
    summary: { totalOrders: orders?.length ?? 0, period: `${dateFrom} — ${dateTo}` },
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function generateRevenueByCountry(supabase: any, userId: string, dateFrom: string, dateTo: string): Promise<ReportResult> {
  const { data: orders } = await supabase
    .from("orders")
    .select("destination, created_at")
    .eq("user_id", userId)
    .gte("created_at", dateFrom)
    .lte("created_at", dateTo);

  const countryCounts: Record<string, number> = {};
  (orders ?? []).forEach((o: { destination: string }) => {
    const country = o.destination || "Bilinmeyen";
    countryCounts[country] = (countryCounts[country] || 0) + 1;
  });

  const rows = Object.entries(countryCounts)
    .map(([country, orderCount]) => ({ country, orderCount }))
    .sort((a, b) => b.orderCount - a.orderCount);

  return {
    title: "Ülkelere Göre Sipariş Dağılımı",
    generatedAt: new Date().toISOString(),
    rows,
    summary: { totalCountries: rows.length, period: `${dateFrom} — ${dateTo}` },
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function generateProductPerformance(supabase: any, userId: string, dateFrom: string, dateTo: string): Promise<ReportResult> {
  const { data: products } = await supabase
    .from("products")
    .select("id, name, sku, base_price, stock_turkey, stock_us, is_active")
    .eq("owner_id", userId);

  const rows = (products ?? []).map((p: { name: string; sku: string; base_price: number; stock_turkey: number; stock_us: number; is_active: boolean }) => ({
    name: p.name,
    sku: p.sku,
    price: p.base_price,
    totalStock: (p.stock_turkey ?? 0) + (p.stock_us ?? 0),
    isActive: p.is_active,
  }));

  return {
    title: "Ürün Performansı",
    generatedAt: new Date().toISOString(),
    rows,
    summary: {
      totalProducts: rows.length,
      activeProducts: rows.filter((r: { isActive: boolean }) => r.isActive).length,
      period: `${dateFrom} — ${dateTo}`,
    },
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function generateInvoiceAging(supabase: any, userId: string): Promise<ReportResult> {
  const { data: invoices } = await supabase
    .from("invoices")
    .select("invoice_number, amount, currency, status, due_date, created_at")
    .eq("user_id", userId)
    .neq("status", "paid");

  const now = Date.now();
  const rows = (invoices ?? []).map((inv: { invoice_number: string; amount: number; currency: string; status: string; due_date: string }) => {
    const dueDate = inv.due_date ? new Date(inv.due_date).getTime() : now;
    const daysOverdue = Math.max(0, Math.floor((now - dueDate) / (1000 * 60 * 60 * 24)));
    return {
      invoice_number: inv.invoice_number,
      amount: inv.amount,
      currency: inv.currency,
      status: inv.status,
      daysOverdue,
      agingBucket:
        daysOverdue === 0 ? "Güncel" : daysOverdue <= 30 ? "1-30 Gün" : daysOverdue <= 60 ? "31-60 Gün" : "60+ Gün",
    };
  });

  return {
    title: "Fatura Yaşlandırma Raporu",
    generatedAt: new Date().toISOString(),
    rows,
    summary: {
      totalUnpaid: rows.length,
      overdue: rows.filter((r: { daysOverdue: number }) => r.daysOverdue > 0).length,
    },
  };
}
