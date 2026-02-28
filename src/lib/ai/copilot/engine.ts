// ─── Atlas Copilot — Engine ─────────────────────────────────────────────────
// Multi-agent orchestrator inspired by OpenAI Swarm & Microsoft AutoGen.
// Pipeline: Intent → Plan → Fetch → Context → Stream
// No tool-calling required — works with ANY Ollama model.
// ─────────────────────────────────────────────────────────────────────────────
import { streamText } from "ai";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import { chatModel } from "@/lib/ai/client";
import type { AssembledContext, CopilotMessage, SSEEvent, DomainData, AgentRole } from "./types";
import { analyzeIntent, getPrimaryAgent, getSupportingAgents } from "./intent";
import { createQueryPlan, getAgentLabel, getAgentIcon } from "./planner";
import { fetchDomainData } from "./data-queries";
import { buildSystemPrompt, buildThinkingPrompt } from "./prompts";

type Db = SupabaseClient<Database>;

// ─── SSE Encoder ────────────────────────────────────────────────────────────

function encodeSSE(event: SSEEvent): Uint8Array {
  const encoder = new TextEncoder();
  const json = JSON.stringify({ ...event, timestamp: Date.now() });
  return encoder.encode(`data: ${json}\n\n`);
}

// ─── Main Pipeline ──────────────────────────────────────────────────────────

/**
 * Execute the full copilot pipeline and return an SSE stream.
 *
 * Pipeline steps:
 * 1. INTENT  — Analyze user message for domain signals
 * 2. PLAN    — Determine which agents and queries to engage
 * 3. FETCH   — Parallel data retrieval from Supabase
 * 4. CONTEXT — Assemble domain expert prompt with real data
 * 5. STREAM  — Stream LLM response token by token
 */
export function runCopilotPipeline(
  messages: CopilotMessage[],
  supabase: Db,
): ReadableStream<Uint8Array> {
  return new ReadableStream({
    async start(controller) {
      try {
        const pipelineStart = Date.now();

        // Extract last user message
        const lastUserMsg = messages
          .filter(m => m.role === "user")
          .pop()?.content ?? "";

        // ── Step 1: Intent Analysis ──────────────────────────────────
        controller.enqueue(encodeSSE({
          type: "status",
          data: { step: "intent", message: "Mesaj analiz ediliyor...", progress: 1, total: 5 },
        }));

        const signals = analyzeIntent(lastUserMsg);
        const primaryAgent = getPrimaryAgent(signals);
        const supportingAgents = getSupportingAgents(signals);

        controller.enqueue(encodeSSE({
          type: "intent",
          data: {
            primary: primaryAgent,
            primaryLabel: getAgentLabel(primaryAgent),
            supporting: supportingAgents.map(a => ({ role: a, label: getAgentLabel(a) })),
            confidence: signals[0]?.confidence ?? 0,
            keywords: signals[0]?.keywords ?? [],
            patterns: signals[0]?.patterns ?? [],
          },
        }));

        // ── Step 2: Query Planning ───────────────────────────────────
        controller.enqueue(encodeSSE({
          type: "status",
          data: { step: "plan", message: "Veri planı oluşturuluyor...", progress: 2, total: 5 },
        }));

        const plan = createQueryPlan(signals);

        controller.enqueue(encodeSSE({
          type: "plan",
          data: {
            primaryAgent: plan.primaryAgent,
            supportingAgents: plan.supportingAgents,
            queryCount: plan.queries.length,
            reasoning: plan.reasoning,
          },
        }));

        // ── Step 3: Parallel Data Fetching ───────────────────────────
        const agentsToFetch = [plan.primaryAgent, ...plan.supportingAgents];
        controller.enqueue(encodeSSE({
          type: "status",
          data: {
            step: "fetch",
            message: `${agentsToFetch.length} departmandan veri çekiliyor...`,
            progress: 3,
            total: 5,
            agents: agentsToFetch.map(a => getAgentLabel(a)),
          },
        }));

        const domains: DomainData[] = await fetchDomainData(agentsToFetch, supabase);

        const totalRecords = domains.reduce((sum, d) => sum + d.recordCount, 0);
        const totalFetchMs = domains.reduce((max, d) => Math.max(max, d.fetchMs), 0);

        controller.enqueue(encodeSSE({
          type: "context",
          data: {
            domains: domains.map(d => ({
              agent: d.agent,
              label: d.label,
              records: d.recordCount,
              fetchMs: d.fetchMs,
            })),
            totalRecords,
            totalFetchMs,
          },
        }));

        // ── Step 4: Context Assembly ─────────────────────────────────
        controller.enqueue(encodeSSE({
          type: "status",
          data: { step: "context", message: `${totalRecords} kayıt analiz ediliyor...`, progress: 4, total: 5 },
        }));

        const assembledContext: AssembledContext = {
          intent: signals,
          plan,
          domains,
          totalRecords,
          totalFetchMs,
        };

        const systemPrompt = buildSystemPrompt(assembledContext);
        const thinkingPrompt = buildThinkingPrompt(assembledContext, lastUserMsg);

        // ── Step 5: LLM Streaming ────────────────────────────────────
        controller.enqueue(encodeSSE({
          type: "agent",
          data: {
            role: primaryAgent,
            label: getAgentLabel(primaryAgent),
            icon: getAgentIcon(primaryAgent),
          },
        }));

        controller.enqueue(encodeSSE({
          type: "status",
          data: { step: "stream", message: "Yanıt oluşturuluyor...", progress: 5, total: 5 },
        }));

        // Build enriched message list with thinking prompt
        const enrichedMessages: CopilotMessage[] = [
          { role: "system", content: thinkingPrompt },
          ...messages.map(m => ({ role: m.role, content: m.content })),
        ];

        const result = streamText({
          model: chatModel,
          system: systemPrompt,
          messages: enrichedMessages,
          temperature: 0.4,
          maxOutputTokens: 2048,
        });

        // Stream tokens
        for await (const chunk of result.textStream) {
          controller.enqueue(encodeSSE({
            type: "text",
            data: { content: chunk },
          }));
        }

        // ── Done ─────────────────────────────────────────────────────
        controller.enqueue(encodeSSE({
          type: "done",
          data: {
            pipelineMs: Date.now() - pipelineStart,
            fetchMs: totalFetchMs,
            totalRecords,
            agent: primaryAgent,
            agentLabel: getAgentLabel(primaryAgent),
          },
        }));

        controller.close();
      } catch (err) {
        console.error("[Atlas Copilot] Pipeline error:", err);
        controller.enqueue(encodeSSE({
          type: "error",
          data: {
            message: err instanceof Error ? err.message : "Bilinmeyen hata",
            code: "PIPELINE_ERROR",
          },
        }));
        controller.close();
      }
    },
  });
}

/** Quick system health check */
export async function getSystemInfo(): Promise<Record<string, unknown>> {
  return {
    status: "active",
    model: process.env.OLLAMA_MODEL ?? "gemma3:4b",
    architecture: "multi-agent-copilot",
    version: "2.0.0",
    agents: ["customer", "commerce", "marketing", "finance", "operations", "strategy"],
    description: "Multi-agent copilot: Intent → Plan → Fetch → Context → Stream",
    pipeline: [
      "1. Intent Analysis (keyword + pattern matching)",
      "2. Query Planning (agent selection + data queries)",
      "3. Parallel Data Fetching (domain-specific Supabase queries)",
      "4. Context Assembly (expert prompt + real data injection)",
      "5. LLM Streaming (gemma3:4b via Ollama)",
    ],
  };
}
