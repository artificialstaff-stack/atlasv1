import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/require-admin";
import { generateGapReport } from "@/lib/jarvis";

export async function GET() {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const report = await generateGapReport();
    return NextResponse.json({ report });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Gap report oluşturulamadı." },
      { status: 500 },
    );
  }
}
