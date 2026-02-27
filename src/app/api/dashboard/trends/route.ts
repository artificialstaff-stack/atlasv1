/**
 * ─── Atlas Platform — Dashboard Trends API ───
 * Returns monthly order count + stock totals for the last 6 months.
 * Per-user data via RLS.
 */

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

interface MonthlyTrend {
  name: string;
  siparis: number;
  stok: number;
}

const MONTH_NAMES_TR = [
  "Oca", "Şub", "Mar", "Nis", "May", "Haz",
  "Tem", "Ağu", "Eyl", "Eki", "Kas", "Ara",
];

export async function GET() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get last 6 months range
    const now = new Date();
    const months: { year: number; month: number; label: string }[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      months.push({
        year: d.getFullYear(),
        month: d.getMonth(),
        label: MONTH_NAMES_TR[d.getMonth()],
      });
    }

    const sixMonthsAgo = new Date(months[0].year, months[0].month, 1);

    // Fetch orders in the last 6 months
    const { data: orders } = await supabase
      .from("orders")
      .select("id, created_at")
      .eq("user_id", user.id)
      .gte("created_at", sixMonthsAgo.toISOString())
      .order("created_at", { ascending: true });

    // Fetch current stock totals
    const { data: products } = await supabase
      .from("products")
      .select("stock_turkey, stock_us")
      .eq("owner_id", user.id);

    const totalStock =
      products?.reduce(
        (sum, p) => sum + (p.stock_turkey ?? 0) + (p.stock_us ?? 0),
        0
      ) ?? 0;

    // Aggregate orders per month
    const ordersByMonth = new Map<string, number>();
    for (const order of orders ?? []) {
      const d = new Date(order.created_at);
      const key = `${d.getFullYear()}-${d.getMonth()}`;
      ordersByMonth.set(key, (ordersByMonth.get(key) ?? 0) + 1);
    }

    const trends: MonthlyTrend[] = months.map((m) => ({
      name: m.label,
      siparis: ordersByMonth.get(`${m.year}-${m.month}`) ?? 0,
      stok: totalStock, // Current snapshot (historical stock tracking would need inventory_movements)
    }));

    return NextResponse.json({ trends });
  } catch {
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
