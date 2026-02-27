import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { generateReport, getUserReports, type ReportType } from "@/lib/ai/reporting";

/**
 * GET /api/reports — Kullanıcının raporlarını listele
 * POST /api/reports — Yeni rapor oluştur
 */
export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const reports = await getUserReports(user.id);
  return NextResponse.json({ reports });
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { type, title, dateRange, filters } = body as {
    type: ReportType;
    title: string;
    dateRange?: { from: string; to: string };
    filters?: Record<string, unknown>;
  };

  if (!type || !title) {
    return NextResponse.json(
      { error: "type and title are required" },
      { status: 400 }
    );
  }

  const report = await generateReport({
    userId: user.id,
    type,
    title,
    dateRange,
    filters,
  });

  if (!report) {
    return NextResponse.json(
      { error: "Report generation failed" },
      { status: 500 }
    );
  }

  return NextResponse.json({ report });
}
