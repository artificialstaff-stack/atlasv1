/**
 * ─── Atlas AI Reporting — Otomatik Rapor Oluşturma ───
 * Sales, inventory, compliance, performance raporları
 */
/* eslint-disable @typescript-eslint/no-explicit-any */

import { createClient } from "@/lib/supabase/server";

export type ReportType = "sales" | "inventory" | "compliance" | "performance" | "custom";

export interface ReportRequest {
  userId: string;
  type: ReportType;
  title: string;
  dateRange?: { from: string; to: string };
  filters?: Record<string, unknown>;
}

export interface GeneratedReport {
  id: string;
  type: ReportType;
  title: string;
  content: string;
  summary: string;
  data: Record<string, unknown>;
  generatedAt: string;
}

/**
 * Rapor oluştur — veritabanından veri çek + analiz yap
 */
export async function generateReport(params: ReportRequest): Promise<GeneratedReport | null> {
  const supabase = await createClient();
   
  const db = supabase as any;

  // Rapor kaydını oluştur (generating status)
  const { data: report, error: createError } = await db
    .from("ai_reports")
    .insert({
      user_id: params.userId,
      report_type: params.type,
      title: params.title,
      content: "",
      summary: "",
      status: "generating",
      data: params.filters ?? {},
    })
    .select()
    .single();

  if (createError || !report) {
    console.error("[ai-reports] Create error:", createError);
    return null;
  }

  try {
    let reportData: Record<string, unknown> = {};
    let content = "";
    let summary = "";

    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const dateFrom = params.dateRange?.from ?? thirtyDaysAgo;
    const dateTo = params.dateRange?.to ?? now.toISOString();

    switch (params.type) {
      case "sales": {
        const { data: orders, count } = await db
          .from("orders")
          .select("*", { count: "exact" })
          .eq("user_id", params.userId)
          .gte("created_at", dateFrom)
          .lte("created_at", dateTo);

        const totalRevenue = (orders ?? []).reduce(
          (sum: number, o: any) => sum + (o.total_amount ?? 0),
          0
        );
        const avgOrderValue = count ? totalRevenue / count : 0;

        const statusBreakdown: Record<string, number> = {};
        for (const order of (orders ?? []) as any[]) {
          statusBreakdown[order.status] = (statusBreakdown[order.status] ?? 0) + 1;
        }

        reportData = {
          totalOrders: count ?? 0,
          totalRevenue,
          avgOrderValue,
          statusBreakdown,
          period: { from: dateFrom, to: dateTo },
        };

        summary = `${count ?? 0} sipariş, $${totalRevenue.toFixed(2)} toplam gelir, $${avgOrderValue.toFixed(2)} ortalama sipariş değeri`;
        content = generateSalesContent(reportData);
        break;
      }

      case "inventory": {
        const { data: products } = await db
          .from("products")
          .select("*")
          .eq("owner_id", params.userId)
          .eq("is_active", true);

        const prods = (products ?? []) as any[];
        const lowStockTR = prods.filter((p) => p.stock_turkey < 10);
        const lowStockUS = prods.filter((p) => p.stock_us < 10);
        const totalProducts = prods.length;

        reportData = {
          totalProducts,
          lowStockTR: lowStockTR.map((p) => ({ name: p.name, sku: p.sku, stock: p.stock_turkey })),
          lowStockUS: lowStockUS.map((p) => ({ name: p.name, sku: p.sku, stock: p.stock_us })),
          totalStockTR: prods.reduce((sum: number, p: any) => sum + p.stock_turkey, 0),
          totalStockUS: prods.reduce((sum: number, p: any) => sum + p.stock_us, 0),
        };

        summary = `${totalProducts} aktif ürün, ${lowStockTR.length} düşük stok (TR), ${lowStockUS.length} düşük stok (US)`;
        content = generateInventoryContent(reportData);
        break;
      }

      case "performance": {
        const { data: orders, count } = await db
          .from("orders")
          .select("*", { count: "exact" })
          .eq("user_id", params.userId)
          .gte("created_at", dateFrom);

        const perfOrders = (orders ?? []) as any[];
        const delivered = perfOrders.filter((o) => o.status === "delivered");
        const avgDeliveryDays =
          delivered.length > 0
            ? delivered.reduce((sum: number, o: any) => {
                const created = new Date(o.created_at).getTime();
                const deliveredAt = o.delivered_at ? new Date(o.delivered_at).getTime() : created;
                return sum + (deliveredAt - created) / (1000 * 60 * 60 * 24);
              }, 0) / delivered.length
            : 0;

        reportData = {
          totalOrders: count ?? 0,
          deliveredCount: delivered.length,
          deliveryRate: count ? (delivered.length / count) * 100 : 0,
          avgDeliveryDays: Math.round(avgDeliveryDays * 10) / 10,
        };

        summary = `${count ?? 0} sipariş, %${((reportData.deliveryRate as number) ?? 0).toFixed(1)} teslim oranı, ${avgDeliveryDays.toFixed(1)} gün ortalama teslim`;
        content = generatePerformanceContent(reportData);
        break;
      }

      default: {
        content = "Özel rapor oluşturuldu.";
        summary = "Özel rapor";
        reportData = { type: params.type, filters: params.filters };
      }
    }

    // Raporu güncelle
    await db
      .from("ai_reports")
      .update({
        content,
        summary,
        data: reportData,
        status: "completed",
        generated_at: new Date().toISOString(),
      })
      .eq("id", (report as any).id);

    return {
      id: (report as any).id,
      type: params.type,
      title: params.title,
      content,
      summary,
      data: reportData,
      generatedAt: new Date().toISOString(),
    };
  } catch (error) {
    console.error("[ai-reports] Generate error:", error);

    await db
      .from("ai_reports")
      .update({ status: "failed" })
      .eq("id", (report as any).id);

    return null;
  }
}

/**
 * Kullanıcının raporlarını listele
 */
export async function getUserReports(userId: string, limit = 20) {
  const supabase = await createClient();
   
  const db = supabase as any;

  const { data, error } = await db
    .from("ai_reports")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    console.error("[ai-reports] List error:", error);
    return [];
  }

  return data ?? [];
}

// ─── Report Content Generators ───

function generateSalesContent(data: Record<string, unknown>): string {
  const { totalOrders, totalRevenue, avgOrderValue, statusBreakdown } = data;
  const lines = [
    `# Satış Raporu`,
    ``,
    `## Özet`,
    `- **Toplam Sipariş:** ${totalOrders}`,
    `- **Toplam Gelir:** $${(totalRevenue as number).toFixed(2)}`,
    `- **Ortalama Sipariş Değeri:** $${(avgOrderValue as number).toFixed(2)}`,
    ``,
    `## Durum Dağılımı`,
  ];

  const breakdown = statusBreakdown as Record<string, number>;
  for (const [status, count] of Object.entries(breakdown)) {
    lines.push(`- **${status}:** ${count}`);
  }

  return lines.join("\n");
}

function generateInventoryContent(data: Record<string, unknown>): string {
  const { totalProducts, totalStockTR, totalStockUS, lowStockTR, lowStockUS } = data;
  const lines = [
    `# Envanter Raporu`,
    ``,
    `## Özet`,
    `- **Aktif Ürün:** ${totalProducts}`,
    `- **Toplam Stok (TR):** ${totalStockTR}`,
    `- **Toplam Stok (US):** ${totalStockUS}`,
    ``,
    `## Düşük Stok Uyarıları`,
    `### Türkiye`,
  ];

  for (const p of (lowStockTR as Array<{ name: string; sku: string; stock: number }>)) {
    lines.push(`- ${p.name} (${p.sku}): ${p.stock} adet`);
  }

  lines.push(``, `### ABD`);
  for (const p of (lowStockUS as Array<{ name: string; sku: string; stock: number }>)) {
    lines.push(`- ${p.name} (${p.sku}): ${p.stock} adet`);
  }

  return lines.join("\n");
}

function generatePerformanceContent(data: Record<string, unknown>): string {
  return [
    `# Performans Raporu`,
    ``,
    `## Teslimat Metrikleri`,
    `- **Toplam Sipariş:** ${data.totalOrders}`,
    `- **Teslim Edilen:** ${data.deliveredCount}`,
    `- **Teslim Oranı:** %${(data.deliveryRate as number).toFixed(1)}`,
    `- **Ortalama Teslim Süresi:** ${data.avgDeliveryDays} gün`,
  ].join("\n");
}
