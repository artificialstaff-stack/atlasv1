/**
 * ─── Atlas Platform — Custom Reports API ───
 * POST /api/reports/custom { type, dateFrom?, dateTo? }
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { generateReport, type ReportConfig } from "@/lib/reports";

const VALID_TYPES = ["orders_summary", "revenue_by_country", "product_performance", "invoice_aging"];

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = (await req.json()) as ReportConfig;

    if (!body.type || !VALID_TYPES.includes(body.type)) {
      return NextResponse.json(
        { error: `Geçersiz rapor türü. Geçerli: ${VALID_TYPES.join(", ")}` },
        { status: 400 }
      );
    }

    const report = await generateReport(user.id, body);

    return NextResponse.json(report);
  } catch (err) {
    console.error("[Reports Error]", err);
    return NextResponse.json({ error: "Rapor oluşturulamadı" }, { status: 500 });
  }
}
