import { NextRequest } from "next/server";
import { requireAdmin } from "@/lib/auth/require-admin";
import { getLegacyRouteStatus, streamLegacyRun, submitLegacyRun } from "@/lib/ai/orchestrator/service";
import { buildLegacySseHeaders } from "@/lib/ai/orchestrator/legacy-facade";

export async function POST(request: NextRequest) {
  const admin = await requireAdmin();
  if (!admin) {
    return Response.json({ error: "Yetkiniz yok." }, { status: 401 });
  }

  try {
    const payload = await request.json().catch(() => ({})) as Record<string, unknown>;
    const response = await submitLegacyRun(admin.id, "chat", payload, request.cookies.getAll().map((cookie) => ({
      name: cookie.name,
      value: cookie.value,
    })));
    return new Response(streamLegacyRun(response, "chat"), { headers: buildLegacySseHeaders("chat") });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Bilinmeyen hata";
    return Response.json({ error: `AI servisinde hata: ${message}` }, { status: 500 });
  }
}

export async function GET() {
  return Response.json(await getLegacyRouteStatus("chat"));
}
