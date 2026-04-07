import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/require-admin";
import { runReflection } from "@/lib/jarvis";

export async function POST(request: NextRequest) {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = (await request.json()) as { findings?: string[] };
    const findings = body.findings;

    if (!Array.isArray(findings) || findings.length === 0) {
      return NextResponse.json(
        { error: "findings array is required and must not be empty." },
        { status: 400 },
      );
    }

    const result = await runReflection(findings);
    return NextResponse.json({ result });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Reflection başarısız." },
      { status: 500 },
    );
  }
}
