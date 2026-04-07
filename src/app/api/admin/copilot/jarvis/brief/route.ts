import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/require-admin";
import { refreshJarvisBrief } from "@/lib/jarvis";

export async function POST() {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const dashboard = await refreshJarvisBrief();
    return NextResponse.json({ dashboard });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Jarvis sabah özeti üretilemedi." },
      { status: 500 },
    );
  }
}
