// ─── Atlas AI — ReAct Agent API ─────────────────────────────────────────────
// POST /api/ai/react — Execute a ReAct agent loop (SSE stream)
// GET  /api/ai/react — Get available tools and status
//
// This is the REAL agentic endpoint. The LLM decides what tools to use,
// calls them autonomously, observes results, and loops until done.
// ─────────────────────────────────────────────────────────────────────────────
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import { requireAdmin } from "@/features/auth/guards";
import { createReActStream } from "@/lib/ai/autonomous/react-engine";
import { selectAgentTools, getAllAgentTools } from "@/lib/ai/autonomous/agent-tools";
import { getSessionMessages, saveMessage } from "@/lib/ai/memory";

function getAdminClient() {
  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
}

export async function POST(req: Request) {
  const admin = await requireAdmin().catch(() => null);
  if (!admin) {
    return Response.json({ error: "Yetkiniz yok." }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { input, sessionId, maxSteps } = body;

    if (!input || typeof input !== "string" || input.trim().length === 0) {
      return Response.json({ error: "Komut gerekli." }, { status: 400 });
    }

    const supabase = getAdminClient();
    const sid = sessionId ?? crypto.randomUUID();
    const userId = admin.id ?? "system";

    // Save user message to memory
    await saveMessage({
      userId,
      sessionId: sid,
      role: "user",
      content: input.trim(),
      metadata: { source: "react_agent" },
    }).catch(() => null);

    // Get conversation history for context
    const history = await getSessionMessages(sid, 4000).catch(() => []);
    const historyContext = history.length > 0
      ? "Önceki konuşma:\n" + history.map(m => `[${m.role}]: ${m.content.slice(0, 200)}`).join("\n")
      : "";

    // Select relevant tools
    const tools = selectAgentTools(input);

    // Build context
    const context = [
      historyContext,
      `Kullanıcı: ${admin.email ?? userId}`,
      `Platform: Atlas — ABD pazarına giren Türk girişimciler için B2B SaaS`,
      `Tarih: ${new Date().toISOString().slice(0, 10)}`,
    ].filter(Boolean).join("\n\n");

    const controller = new AbortController();
    req.signal.addEventListener("abort", () => controller.abort());

    const stream = createReActStream(
      input.trim(),
      context,
      tools,
      {
        supabase,
        userId,
        sessionId: sid,
        signal: controller.signal,
      },
      { maxSteps: maxSteps ?? 12 },
    );

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache, no-store, must-revalidate",
        Connection: "keep-alive",
        "X-Atlas-AI": "react-agent-v1",
        "X-Atlas-Session": sid,
      },
    });
  } catch (err) {
    console.error("[Atlas ReAct] Route error:", err);
    return Response.json(
      { error: "Agent hatası: " + (err instanceof Error ? err.message : "Bilinmeyen") },
      { status: 500 },
    );
  }
}

export async function GET() {
  const tools = getAllAgentTools();

  return Response.json({
    status: "active",
    version: "2.0.0",
    architecture: "react-agent-with-tools",
    engine: "ReAct (Reason + Act Loop)",
    description: "LLM decides which tools to call, executes them, observes results, and loops until goal is achieved.",
    capabilities: [
      "autonomous-reasoning",
      "tool-use",
      "database-queries",
      "web-fetch",
      "web-search",
      "content-generation",
      "text-analysis",
      "trend-analysis",
      "platform-health",
      "notifications",
      "persistent-memory",
      "multi-step-planning",
      "metric-calculation",
    ],
    tools: tools.map(t => ({
      name: t.name,
      description: t.description,
      paramCount: t.parameters.length,
    })),
    toolCount: tools.length,
    maxSteps: 15,
    model: "gemma3:4b (local Ollama)",
  });
}
