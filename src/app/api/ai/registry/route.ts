import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/require-admin";
import { getUnifiedRegistrySnapshot, verifyUnifiedRegistrySnapshot } from "@/lib/ai/orchestrator/service";

export async function GET() {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  return NextResponse.json(await getUnifiedRegistrySnapshot());
}

export async function POST() {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  return NextResponse.json(await verifyUnifiedRegistrySnapshot());
}
