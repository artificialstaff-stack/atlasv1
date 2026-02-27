/**
 * ─── Atlas Platform — SLA Monitoring API ───
 * GET /api/sla?orderId=x  (single order)
 * GET /api/sla              (all active orders compliance)
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { checkOrderSLA, calculateSLACompliance } from "@/lib/sla";

export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const orderId = new URL(req.url).searchParams.get("orderId");

    if (orderId) {
      const { data: order, error } = await supabase
        .from("orders")
        .select("id, status, created_at, updated_at")
        .eq("id", orderId)
        .eq("user_id", user.id)
        .single();

      if (error || !order) {
        return NextResponse.json({ error: "Sipariş bulunamadı" }, { status: 404 });
      }

      return NextResponse.json({ sla: checkOrderSLA(order) });
    }

    // All active orders
    const { data: orders } = await supabase
      .from("orders")
      .select("id, status, created_at, updated_at")
      .eq("user_id", user.id)
      .not("status", "in", '("delivered","cancelled")')
      .order("created_at", { ascending: false });

    if (!orders || orders.length === 0) {
      return NextResponse.json({
        compliance: { total: 0, compliant: 0, breached: 0, complianceRate: 100 },
        breachedOrders: [],
      });
    }

    const compliance = calculateSLACompliance(orders);
    const breachedOrders = orders
      .map((o) => ({ order: o, sla: checkOrderSLA(o) }))
      .filter((r) => r.sla.some((s) => s.isBreached));

    return NextResponse.json({ compliance, breachedOrders });
  } catch (err) {
    console.error("[SLA Error]", err);
    return NextResponse.json({ error: "SLA kontrolü başarısız" }, { status: 500 });
  }
}
