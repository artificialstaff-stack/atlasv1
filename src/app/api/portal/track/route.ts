/**
 * ─── Atlas Platform — Customer Portal: Order Tracking API ───
 * GET /api/portal/track?tracking=XXXX
 */

import { NextRequest, NextResponse } from "next/server";
import { trackOrder } from "@/lib/customer-portal";

export async function GET(req: NextRequest) {
  const tracking = new URL(req.url).searchParams.get("tracking");

  if (!tracking || tracking.length < 3) {
    return NextResponse.json({ error: "Takip numarası gerekli" }, { status: 400 });
  }

  const result = await trackOrder(tracking);

  if (!result) {
    return NextResponse.json({ error: "Sipariş bulunamadı" }, { status: 404 });
  }

  return NextResponse.json({
    status: result.status,
    destination: result.destination,
    updated_at: result.updated_at,
  });
}
