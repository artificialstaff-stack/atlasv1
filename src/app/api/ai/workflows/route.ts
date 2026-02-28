// ─── Atlas Autonomous AI API — Workflows ─────────────────────────────────────
// GET    /api/ai/workflows          — List workflows
// POST   /api/ai/workflows          — Create workflow from natural language
// PATCH  /api/ai/workflows          — Toggle/delete workflow
// ─────────────────────────────────────────────────────────────────────────────
import { requireAdmin } from "@/features/auth/guards";
import {
  getAllWorkflows,
  getActiveWorkflows,
  createWorkflowFromNL,
  toggleWorkflow,
  deleteWorkflow,
  getWorkflowStats,
} from "@/lib/ai/autonomous";

export async function GET(req: Request) {
  const admin = await requireAdmin().catch(() => null);
  if (!admin) {
    return Response.json({ error: "Yetkiniz yok." }, { status: 401 });
  }

  const url = new URL(req.url);
  const activeOnly = url.searchParams.get("active") === "true";

  return Response.json({
    workflows: activeOnly ? getActiveWorkflows() : getAllWorkflows(),
    stats: getWorkflowStats(),
  });
}

export async function POST(req: Request) {
  const admin = await requireAdmin().catch(() => null);
  if (!admin) {
    return Response.json({ error: "Yetkiniz yok." }, { status: 401 });
  }

  try {
    const { description } = await req.json();

    if (!description || typeof description !== "string") {
      return Response.json({ error: "description gerekli." }, { status: 400 });
    }

    const workflow = await createWorkflowFromNL(description);
    return Response.json({ success: true, workflow });
  } catch (err) {
    return Response.json(
      { error: "Workflow oluşturma hatası: " + (err instanceof Error ? err.message : "Bilinmeyen") },
      { status: 500 },
    );
  }
}

export async function PATCH(req: Request) {
  const admin = await requireAdmin().catch(() => null);
  if (!admin) {
    return Response.json({ error: "Yetkiniz yok." }, { status: 401 });
  }

  try {
    const { workflowId, action } = await req.json();

    if (!workflowId || !action) {
      return Response.json({ error: "workflowId ve action gerekli." }, { status: 400 });
    }

    if (action === "toggle") {
      const result = toggleWorkflow(workflowId);
      if (!result) return Response.json({ error: "Workflow bulunamadı." }, { status: 404 });
      return Response.json({ success: true, workflow: result });
    }

    if (action === "delete") {
      const deleted = deleteWorkflow(workflowId);
      if (!deleted) return Response.json({ error: "Workflow bulunamadı." }, { status: 404 });
      return Response.json({ success: true });
    }

    return Response.json({ error: "Geçersiz action. (toggle/delete)" }, { status: 400 });
  } catch (err) {
    return Response.json(
      { error: "Workflow işlemi hatası: " + (err instanceof Error ? err.message : "Bilinmeyen") },
      { status: 500 },
    );
  }
}
