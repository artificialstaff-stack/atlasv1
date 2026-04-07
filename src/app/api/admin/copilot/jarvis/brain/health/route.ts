import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/require-admin";
import { JarvisCoreAdapter } from "@/lib/jarvis";

export async function GET() {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const health = await JarvisCoreAdapter.health();
    return NextResponse.json({ health });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Health check başarısız." },
      { status: 500 },
    );
  }
}
