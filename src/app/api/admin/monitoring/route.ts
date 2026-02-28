/**
 * ─── Atlas Platform — Performance Monitoring API ───
 * GET /api/admin/monitoring?minutes=60  — performance summary
 */

import { NextRequest, NextResponse } from "next/server";
import { getPerformanceSummary } from "@/lib/monitoring";
import { requireAdmin } from "@/lib/auth/require-admin";

export async function GET(req: NextRequest) {
  try {
    const admin = await requireAdmin();
    if (!admin) {
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
