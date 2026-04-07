import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/require-admin";
import { launchJarvisObservation } from "@/lib/jarvis";

export async function POST() {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const payload = await launchJarvisObservation("manual");
    return NextResponse.json(payload);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Jarvis observer çalıştırılamadı." },
      { status: 500 },
    );
  }
}
