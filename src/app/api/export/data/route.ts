/**
 * ─── Atlas Platform — Data Export API ───
 * GET /api/export/data?type=products|orders|invoices&format=csv|json
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { toCSV, toJSON, EXPORT_COLUMNS } from "@/lib/data-io";

const ALLOWED_TYPES = ["products", "orders", "invoices"] as const;
type ExportType = (typeof ALLOWED_TYPES)[number];

export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const url = new URL(req.url);
    const type = url.searchParams.get("type") as ExportType;
    const format = url.searchParams.get("format") || "csv";

    if (!type || !ALLOWED_TYPES.includes(type)) {
      return NextResponse.json(
        { error: "Geçersiz tür. products, orders veya invoices olmalı." },
        { status: 400 }
      );
    }

    // Fetch data based on type
    let data: Record<string, unknown>[] = [];

    if (type === "products") {
      const { data: products, error } = await supabase
        .from("products")
        .select("name, sku, hs_code, base_price, stock_turkey, stock_us, is_active")
        .eq("owner_id", user.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      data = products ?? [];
    } else if (type === "orders") {
      const { data: orders, error } = await supabase
        .from("orders")
        .select("platform_order_id, status, destination, tracking_ref, created_at")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      data = orders ?? [];
    } else if (type === "invoices") {
      const { data: invoices, error } = await supabase
        .from("invoices")
        .select("invoice_number, amount, currency, status, due_date, created_at")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      data = invoices ?? [];
    }

    if (format === "json") {
      return new NextResponse(toJSON(data), {
        headers: {
          "Content-Type": "application/json",
          "Content-Disposition": `attachment; filename="atlas-${type}-${Date.now()}.json"`,
        },
      });
    }

    // Default: CSV
    const columns = EXPORT_COLUMNS[type] as { key: string; label: string }[];
    const csv = toCSV(data as Record<string, unknown>[], columns as { key: keyof Record<string, unknown>; label: string }[]);

    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="atlas-${type}-${Date.now()}.csv"`,
      },
    });
  } catch (err) {
    console.error("[Export Error]", err);
    return NextResponse.json({ error: "Export başarısız" }, { status: 500 });
  }
}
