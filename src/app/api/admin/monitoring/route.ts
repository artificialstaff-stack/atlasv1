/**
 * ─── Atlas Platform — Performance Monitoring API ───
 * GET /api/admin/monitoring?minutes=60  — performance summary
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getPerformanceSummary } from "@/lib/monitoring";

export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const role = (user.app_metadata?.user_role as string) || "customer";
    if (role !== "admin" && role !== "super_admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const minutes = parseInt(new URL(req.url).searchParams.get("minutes") || "60", 10);
    const summary = getPerformanceSummary(Math.min(minutes, 1440)); // Max 24h

    return NextResponse.json(summary);
  } catch (err) {
    console.error("[Monitoring Error]", err);
    return NextResponse.json({ error: "Monitoring verisi alınamadı" }, { status: 500 });
  }
}
