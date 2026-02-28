// ─── Atlas Autonomous AI API — Command Endpoint ─────────────────────────────
// POST /api/ai/autonomous     — Execute autonomous command (SSE stream)
// GET  /api/ai/autonomous     — Get system status & active plans
// ─────────────────────────────────────────────────────────────────────────────
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import { requireAdmin } from "@/features/auth/guards";
import {
  runAutonomousPipeline,
  getActivePlans,
  getAvailableAgents,
  getApprovalStats,
  getAlertStats,
  getWorkflowStats,
  getContentStats,
  createPredefinedWorkflows,
} from "@/lib/ai/autonomous";
import type { AutonomousCommand } from "@/lib/ai/autonomous";

function getAdminClient() {
  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
}

// Initialize predefined workflows on first load
let initialized = false;
function ensureInit() {
  if (!initialized) {
    createPredefinedWorkflows();
    initialized = true;
  }
}

export async function POST(req: Request) {
  const admin = await requireAdmin().catch(() => null);
  if (!admin) {
    return Response.json({ error: "Yetkiniz yok." }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { input, priority, sessionId } = body;

    if (!input || typeof input !== "string" || input.trim().length === 0) {
      return Response.json({ error: "Komut gerekli." }, { status: 400 });
    }

    ensureInit();

    const command: AutonomousCommand = {
      id: `cmd_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      input: input.trim(),
      sessionId: sessionId ?? crypto.randomUUID(),
      userId: admin.id ?? "system",
      createdAt: Date.now(),
      priority: priority ?? "normal",
    };

    const supabase = getAdminClient();
    const stream = runAutonomousPipeline(command, supabase);

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache, no-store, must-revalidate",
        Connection: "keep-alive",
        "X-Atlas-AI": "autonomous-v1",
        "X-Atlas-Command": command.id,
      },
    });
  } catch (err) {
    console.error("[Atlas Autonomous] Route error:", err);
    return Response.json(
      { error: "Otonom sistem hatası: " + (err instanceof Error ? err.message : "Bilinmeyen") },
      { status: 500 },
    );
  }
}

export async function GET() {
  ensureInit();

  return Response.json({
    status: "active",
    version: "1.0.0",
    architecture: "autonomous-multi-agent-cowork-v1",
    capabilities: [
      "autonomous-planning",
      "sub-agent-delegation",
      "content-generation",
      "social-media-management",
      "video-script-generation",
      "image-prompt-generation",
      "approval-workflows",
      "proactive-monitoring",
      "workflow-automation",
      "quality-scoring",
      "multi-channel-adaptation",
    ],
    agents: getAvailableAgents(),
    activePlans: getActivePlans().length,
    stats: {
      approvals: getApprovalStats(),
      alerts: getAlertStats(),
      workflows: getWorkflowStats(),
      content: getContentStats(),
    },
  });
}
