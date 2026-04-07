import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/require-admin";
import { generateSelfReport } from "@/lib/jarvis";

export async function GET() {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const report = await generateSelfReport();
    return NextResponse.json({ report });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Self-report oluşturulamadı." },
      { status: 500 },
    );
  }
}
