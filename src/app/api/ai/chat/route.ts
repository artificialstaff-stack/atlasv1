// ─── Atlas AI Chat API — Multi-Agent Copilot v3 (Manus AI-level) ────────────
// POST /api/ai/chat — SSE streaming with pipeline visibility
// GET  /api/ai/chat — System info & health check
//
// Architecture: Decompose → Intent → Memory → Plan → Fetch → Analyze → Act → Stream
// Protocol: Server-Sent Events (SSE) with 15 typed events
// ─────────────────────────────────────────────────────────────────────────────
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import { requireAdmin } from "@/features/auth/guards";
import { runCopilotPipeline, getSystemInfo } from "@/lib/ai/copilot";
import { persistMessage } from "@/lib/ai/copilot/memory";

function getAdminClient() {
  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
}

export async function POST(req: Request) {
  // Auth check
  const admin = await requireAdmin().catch(() => null);
  if (!admin) {
    return Response.json(
      { error: "Yetkiniz yok. Sadece admin kullanıcılar AI asistanı kullanabilir." },
      { status: 401 },
    );
  }

  try {
    const body = await req.json();
    const { messages, sessionId } = body;

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return Response.json({ error: "Mesaj gerekli." }, { status: 400 });
    }

    // Validate messages format
    const validMessages = messages
      .filter((m: unknown): m is { role: string; content: string } =>
        typeof m === "object" && m !== null && "role" in m && "content" in m,
      )
      .map(m => ({
        role: m.role as "user" | "assistant" | "system",
        content: String(m.content),
      }));

    if (validMessages.length === 0) {
      return Response.json({ error: "Geçerli mesaj bulunamadı." }, { status: 400 });
    }

    const supabase = getAdminClient();

    // Resolve session ID (client can send one or we auto-generate)
    const resolvedSessionId = typeof sessionId === "string" && sessionId.length > 0
      ? sessionId
      : crypto.randomUUID();

    // Persist the last user message for memory
    const lastUserMsg = validMessages.filter(m => m.role === "user").pop();
    if (lastUserMsg) {
      persistMessage(supabase, {
        sessionId: resolvedSessionId,
        userId: admin.id ?? "system",
        role: "user",
        content: lastUserMsg.content,
      }).catch(() => { /* non-blocking */ });
    }

    // Run the multi-agent copilot pipeline — returns SSE stream
    const stream = runCopilotPipeline(validMessages, supabase, {
      sessionId: resolvedSessionId,
      userId: admin.id ?? "system",
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache, no-store, must-revalidate",
        Connection: "keep-alive",
        "X-Atlas-AI": "copilot-v3",
        "X-Atlas-Session": resolvedSessionId,
      },
    });
  } catch (err: unknown) {
    console.error("[Atlas AI] Route error:", err);
    const message = err instanceof Error ? err.message : "Bilinmeyen hata";
    return Response.json(
      { error: "AI servisinde hata: " + message },
      { status: 500 },
    );
  }
}

export async function GET() {
  const info = await getSystemInfo();
  return Response.json(info);
}
