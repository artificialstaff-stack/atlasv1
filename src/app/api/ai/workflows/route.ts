import { NextRequest } from "next/server";
import { requireAdmin } from "@/lib/auth/require-admin";
import { getLegacyRouteStatus, submitLegacyRun } from "@/lib/ai/orchestrator/service";
import { decorateLegacyJsonPayload } from "@/lib/ai/orchestrator/legacy-facade";

export async function GET() {
  const admin = await requireAdmin();
  if (!admin) {
    return Response.json({ error: "Yetkiniz yok." }, { status: 401 });
  }

  const status = await getLegacyRouteStatus("workflows");
  const workflows = status.recentRuns
    .filter((run) => run.mode === "autonomous" || run.mode === "agent")
    .map((run) => ({
      id: run.id,
      title: run.summary ?? run.commandText,
      description: run.commandText,
      status: run.status,
      intent: run.intent,
      createdAt: run.createdAt,
      requiresApproval: run.requiresApproval,
    }));

  return Response.json(decorateLegacyJsonPayload("workflows", {
    architecture: status.architecture,
    registry: status.registry.summary,
    workflows,
    stats: {
      total: workflows.length,
      pendingApprovals: status.pendingApprovals,
      completed: workflows.filter((workflow) => workflow.status === "completed").length,
      running: workflows.filter((workflow) => workflow.status === "running").length,
    },
  }));
}

export async function POST(request: NextRequest) {
  const admin = await requireAdmin();
  if (!admin) {
    return Response.json({ error: "Yetkiniz yok." }, { status: 401 });
  }

  try {
    const payload = await request.json().catch(() => ({})) as Record<string, unknown>;
    const response = await submitLegacyRun(admin.id, "workflows", payload, request.cookies.getAll().map((cookie) => ({
      name: cookie.name,
      value: cookie.value,
    })));
    return Response.json(decorateLegacyJsonPayload("workflows", {
      success: true,
      run: response.run,
      summary: response.response.summary,
      workflow: {
        id: response.run.id,
        title: response.run.summary ?? response.run.commandText,
        description: response.run.commandText,
        status: response.run.status,
      },
    }));
  } catch (error) {
    const message = error instanceof Error ? error.message : "Bilinmeyen hata";
    return Response.json({ error: `Workflow oluşturma hatası: ${message}` }, { status: 500 });
  }
}

export async function PATCH() {
  return Response.json(
    {
      error: "Workflow toggle/delete artık unified run surface üzerinden yönetiliyor.",
    },
    { status: 501 },
  );
}
