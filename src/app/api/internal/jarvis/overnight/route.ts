import { NextResponse, type NextRequest } from "next/server";
import { refreshJarvisBrief, runJarvisObservation } from "@/lib/jarvis";

function hasInternalJarvisAccess(request: NextRequest) {
  const expectedToken = process.env.CRON_SECRET || process.env.SUPABASE_WEBHOOK_SECRET;
  if (!expectedToken) {
    return false;
  }

  const authHeader = request.headers.get("authorization");
  const headerToken = authHeader?.startsWith("Bearer ") ? authHeader.slice(7).trim() : null;
  const directToken = request.headers.get("x-atlas-jarvis-token");
  const token = headerToken || directToken;
  return token === expectedToken;
}

export async function POST(request: NextRequest) {
  if (!hasInternalJarvisAccess(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (process.env.ATLAS_OBSERVER_ENABLED !== "1") {
    return NextResponse.json({ error: "Jarvis observer disabled" }, { status: 409 });
  }

  try {
    await runJarvisObservation("overnight");
    const dashboard = await refreshJarvisBrief();
    return NextResponse.json({ dashboard });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Jarvis overnight run başarısız." },
      { status: 500 },
    );
  }
}
