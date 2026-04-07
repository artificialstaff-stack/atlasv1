import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/require-admin";
import { getJarvisControlTower } from "@/lib/jarvis";

export async function GET() {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const dashboard = await getJarvisControlTower();
    return NextResponse.json({ dashboard });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Jarvis dashboard yüklenemedi." },
      { status: 500 },
    );
  }
}
