// ─── Atlas Copilot — Engine v3 (Manus AI-level) ────────────────────────────
// Multi-agent orchestrator with:
//   - Task decomposition (visible subtasks like Manus AI)
//   - Deep analysis (trends, anomalies, health scoring, predictions)
//   - Action execution (actually modify data, not just read)
//   - Artifact generation (reports, tables, checklists)
//   - Persistent memory (conversation history, entity extraction)
//
// Pipeline: Decompose → Intent → Plan → Fetch → Analyze → Act → Generate → Stream
// No tool-calling required — works with ANY Ollama model.
// ─────────────────────────────────────────────────────────────────────────────
import { streamText } from "ai";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import { chatModel } from "@/lib/ai/client";
import type { AssembledContext, CopilotMessage, SSEEvent, DomainData } from "./types";
import { analyzeIntent, getPrimaryAgent, getSupportingAgents } from "./intent";
import { createQueryPlan, getAgentLabel, getAgentIcon } from "./planner";
import { fetchDomainData } from "./data-queries";
import { buildSystemPrompt, buildThinkingPrompt } from "./prompts";
import { decomposeTask } from "./task-decomposer";
import { buildMemoryContext, extractEntities } from "./memory";
import { detectActions, executeAction, formatActionResults } from "./actions";
import { runDeepAnalysis, formatAnalysisForPrompt } from "./deep-analysis";
import {
  detectArtifactRequest,
  generateExecutiveSummary,
  generateChecklist,
} from "./artifacts";

type Db = SupabaseClient<Database>;

// ─── SSE Encoder ────────────────────────────────────────────────────────────

function encodeSSE(event: SSEEvent): Uint8Array {
  const encoder = new TextEncoder();
  const json = JSON.stringify({ ...event, timestamp: Date.now() });
  return encoder.encode(`data: ${json}\n\n`);
}

/** Safe enqueue — ignores if controller is already closed (client disconnect) */
function safeEnqueue(controller: ReadableStreamDefaultController<Uint8Array>, data: Uint8Array) {
  try {
    controller.enqueue(data);
  } catch {
    // Controller already closed (client disconnected) — ignore
  }
}

/** Safe close — ignores if controller is already closed */
function safeClose(controller: ReadableStreamDefaultController<Uint8Array>) {
  try {
    controller.close();
  } catch {
    // Already closed — ignore
  }
}

// ─── Main Pipeline (v3 — Manus-level) ───────────────────────────────────────

/**
 * Execute the full copilot pipeline and return an SSE stream.
 *
 * Enhanced pipeline steps:
 * 1. DECOMPOSE — Break complex request into visible subtasks
 * 2. INTENT    — Analyze user message for domain signals
 * 3. PLAN      — Determine which agents and queries to engage
 * 4. MEMORY    — Load conversation history, extract entities
 * 5. FETCH     — Parallel data retrieval from Supabase
 * 6. ANALYZE   — Deep analysis (trends, anomalies, health, predictions)
 * 7. ACT       — Detect & execute actions (mutations)
 * 8. ARTIFACT  — Generate reports/documents if requested
 * 9. CONTEXT   — Assemble domain expert prompt with all data
 * 10. STREAM   — Stream LLM response token by token
 */
export function runCopilotPipeline(
  messages: CopilotMessage[],
  supabase: Db,
  options?: { sessionId?: string; userId?: string },
): ReadableStream<Uint8Array> {
  return new ReadableStream({
    async start(controller) {
      try {
        const pipelineStart = Date.now();
        const totalSteps = 8;

        // Extract last user message
        const lastUserMsg = messages
          .filter(m => m.role === "user")
          .pop()?.content ?? "";

        // ── Step 1: Intent Analysis + Task Decomposition ─────────────
        safeEnqueue(controller, encodeSSE({
          type: "status",
          data: { step: "intent", message: "Mesaj analiz ediliyor...", progress: 1, total: totalSteps },
        }));

        const signals = analyzeIntent(lastUserMsg);
        const primaryAgent = getPrimaryAgent(signals);
        const supportingAgents = getSupportingAgents(signals);

        // Task decomposition — Manus-style visible subtasks
        const taskPlan = decomposeTask(lastUserMsg, signals);

        safeEnqueue(controller, encodeSSE({
          type: "tasks",
          data: {
            complexity: taskPlan.complexity,
            totalSteps: taskPlan.totalSteps,
            tasks: taskPlan.tasks,
            reasoning: taskPlan.reasoning,
            estimatedMs: taskPlan.estimatedMs,
          },
        }));

        // Mark first task as done
        safeEnqueue(controller, encodeSSE({
          type: "task_update",
          data: { taskId: 1, status: "done", durationMs: Date.now() - pipelineStart },
        }));

        safeEnqueue(controller, encodeSSE({
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
        safeEnqueue(controller, encodeSSE({
          type: "status",
          data: { step: "plan", message: "Veri planı oluşturuluyor...", progress: 2, total: totalSteps },
        }));

        const plan = createQueryPlan(signals);

        safeEnqueue(controller, encodeSSE({
          type: "plan",
          data: {
            primaryAgent: plan.primaryAgent,
            supportingAgents: plan.supportingAgents,
            queryCount: plan.queries.length,
            reasoning: plan.reasoning,
          },
        }));

        // ── Step 3: Memory Context ───────────────────────────────────
        safeEnqueue(controller, encodeSSE({
          type: "status",
          data: { step: "memory", message: "Hafıza ve bağlam yükleniyor...", progress: 3, total: totalSteps },
        }));

        const memoryContext = await buildMemoryContext(
          supabase,
          options?.sessionId ?? null,
          messages,
        );

        // Extract entities from current message
        const entities = extractEntities(lastUserMsg);

        safeEnqueue(controller, encodeSSE({
          type: "memory",
          data: {
            entityCount: entities.length,
            entities: entities.slice(0, 5).map(e => e.entity),
            conversationCount: memoryContext.conversationCount,
            sessionSummary: memoryContext.sessionSummary,
          },
        }));

        // ── Step 4: Parallel Data Fetching ───────────────────────────
        const fetchStart = Date.now();
        const agentsToFetch = [plan.primaryAgent, ...plan.supportingAgents];
        safeEnqueue(controller, encodeSSE({
          type: "status",
          data: {
            step: "fetch",
            message: `${agentsToFetch.length} departmandan veri çekiliyor...`,
            progress: 4,
            total: totalSteps,
            agents: agentsToFetch.map(a => getAgentLabel(a)),
          },
        }));

        // Update task statuses for fetch tasks
        let fetchTaskId = 2;
        for (let i = 0; i < agentsToFetch.length; i++) {
          safeEnqueue(controller, encodeSSE({
            type: "task_update",
            data: { taskId: fetchTaskId++, status: "running" },
          }));
        }

        const domains: DomainData[] = await fetchDomainData(agentsToFetch, supabase);

        const totalRecords = domains.reduce((sum, d) => sum + d.recordCount, 0);
        const totalFetchMs = Date.now() - fetchStart;

        // Mark fetch tasks as done
        fetchTaskId = 2;
        for (let i = 0; i < agentsToFetch.length; i++) {
          safeEnqueue(controller, encodeSSE({
            type: "task_update",
            data: { taskId: fetchTaskId++, status: "done", durationMs: totalFetchMs },
          }));
        }

        safeEnqueue(controller, encodeSSE({
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

        // ── Step 5: Deep Analysis (for complex queries) ──────────────
        let analysisText = "";
        const isComplex = taskPlan.complexity === "complex" || taskPlan.complexity === "deep";

        if (isComplex) {
          safeEnqueue(controller, encodeSSE({
            type: "status",
            data: { step: "analyze", message: "Derin analiz yapılıyor...", progress: 5, total: totalSteps },
          }));

          const analysis = await runDeepAnalysis(supabase);
          analysisText = formatAnalysisForPrompt(analysis);

          safeEnqueue(controller, encodeSSE({
            type: "analysis",
            data: {
              health: analysis.health,
              trendCount: analysis.trends.length,
              anomalyCount: analysis.anomalies.length,
              predictionCount: analysis.predictions.length,
              correlationCount: analysis.correlations.length,
              executionMs: analysis.executionMs,
              // Flatten for UI display
              anomalies: analysis.anomalies,
              predictions: analysis.predictions,
            },
          }));

          // Check if artifact is requested
          const artifactType = detectArtifactRequest(lastUserMsg);
          if (artifactType) {
            safeEnqueue(controller, encodeSSE({
              type: "status",
              data: { step: "artifact", message: "Rapor oluşturuluyor...", progress: 6, total: totalSteps },
            }));

            let artifact;
            if (artifactType === "checklist") {
              artifact = generateChecklist(analysis);
            } else {
              artifact = generateExecutiveSummary(domains, analysis);
            }

            safeEnqueue(controller, encodeSSE({
              type: "artifact",
              data: {
                id: artifact.id,
                type: artifact.type,
                title: artifact.title,
                content: artifact.content,
                metadata: artifact.metadata,
              },
            }));
          }
        }

        // ── Step 6: Action Detection & Execution ─────────────────────
        const detectedActions = detectActions(lastUserMsg);
        let actionText = "";

        if (detectedActions.length > 0) {
          safeEnqueue(controller, encodeSSE({
            type: "status",
            data: { step: "action", message: `${detectedActions.length} aksiyon tespit edildi...`, progress: 6, total: totalSteps },
          }));

          // Execute non-confirmation actions automatically
          const autoActions = detectedActions.filter(a => !a.requiresConfirmation);
          const confirmActions = detectedActions.filter(a => a.requiresConfirmation);

          // Send action detection info
          safeEnqueue(controller, encodeSSE({
            type: "action",
            data: {
              detected: detectedActions.map(a => ({
                type: a.type,
                description: a.description,
                confidence: a.confidence,
                requiresConfirmation: a.requiresConfirmation,
              })),
              autoExecute: autoActions.length,
              needsConfirmation: confirmActions.length,
            },
          }));

          // Execute auto-actions
          if (autoActions.length > 0) {
            const results = await Promise.all(
              autoActions.map(a => executeAction(supabase, a)),
            );
            actionText = formatActionResults(results);
          }

          // For confirmation-needed actions, include info in prompt
          if (confirmActions.length > 0) {
            actionText += "\n\nKullanıcının istediği işlemler (onay gerekli): " +
              confirmActions.map(a => a.description).join(", ") +
              "\nKullanıcıya bu işlemleri yapmak isteyip istemediğini sor.";
          }
        }

        // ── Step 7: Context Assembly ─────────────────────────────────
        safeEnqueue(controller, encodeSSE({
          type: "status",
          data: { step: "context", message: `${totalRecords} kayıt derleniyor...`, progress: 7, total: totalSteps },
        }));

        const assembledContext: AssembledContext = {
          intent: signals,
          plan,
          domains,
          totalRecords,
          totalFetchMs,
          conversationSummary: memoryContext.sessionSummary ?? undefined,
        };

        let systemPrompt = buildSystemPrompt(assembledContext);

        // Inject deep analysis results
        if (analysisText) {
          systemPrompt += "\n\n--- DERİN ANALİZ SONUÇLARI ---\n" + analysisText;
        }

        // Inject action results
        if (actionText) {
          systemPrompt += "\n\n--- AKSİYON SONUÇLARI ---\n" + actionText;
        }

        // Inject memory entities
        if (entities.length > 0) {
          systemPrompt += "\n\n--- HAFIZA ---\n" +
            "Kullanıcının ilgilendiği varlıklar: " +
            entities.map(e => e.entity).join(", ");
        }

        const thinkingPrompt = buildThinkingPrompt(assembledContext, lastUserMsg);

        // ── Step 8: LLM Streaming ────────────────────────────────────
        safeEnqueue(controller, encodeSSE({
          type: "agent",
          data: {
            role: primaryAgent,
            label: getAgentLabel(primaryAgent),
            icon: getAgentIcon(primaryAgent),
          },
        }));

        safeEnqueue(controller, encodeSSE({
          type: "status",
          data: { step: "stream", message: "Yanıt oluşturuluyor...", progress: 8, total: totalSteps },
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
          safeEnqueue(controller, encodeSSE({
            type: "text",
            data: { content: chunk },
          }));
        }

        // ── Done ─────────────────────────────────────────────────────
        const pipelineMs = Date.now() - pipelineStart;
        safeEnqueue(controller, encodeSSE({
          type: "done",
          data: {
            pipelineMs,
            fetchMs: totalFetchMs,
            totalRecords,
            agent: primaryAgent,
            agentLabel: getAgentLabel(primaryAgent),
            complexity: taskPlan.complexity,
            taskCount: taskPlan.totalSteps,
            analysisRan: isComplex,
            actionsDetected: detectedActions.length,
            entitiesFound: entities.length,
          },
        }));

        safeClose(controller);
      } catch (err) {
        console.error("[Atlas Copilot] Pipeline error:", err);
        safeEnqueue(controller, encodeSSE({
          type: "error",
          data: {
            message: err instanceof Error ? err.message : "Bilinmeyen hata",
            code: "PIPELINE_ERROR",
          },
        }));
        safeClose(controller);
      }
    },
  });
}

/** Quick system health check */
export async function getSystemInfo(): Promise<Record<string, unknown>> {
  return {
    status: "active",
    model: process.env.OLLAMA_MODEL ?? "gemma3:4b",
    architecture: "multi-agent-copilot-v3",
    version: "3.0.0",
    capabilities: [
      "multi-agent-routing",
      "task-decomposition",
      "deep-analysis",
      "action-execution",
      "artifact-generation",
      "persistent-memory",
      "entity-extraction",
      "trend-detection",
      "anomaly-detection",
      "health-scoring",
      "predictive-indicators",
    ],
    agents: ["customer", "commerce", "marketing", "finance", "operations", "strategy"],
    description: "Manus AI-level copilot: Decompose → Intent → Plan → Memory → Fetch → Analyze → Act → Artifact → Stream",
    pipeline: [
      "1. Task Decomposition (complexity detection + subtask generation)",
      "2. Intent Analysis (keyword + pattern matching)",
      "3. Query Planning (agent selection + data queries)",
      "4. Memory Context (conversation history + entity extraction)",
      "5. Parallel Data Fetching (domain-specific Supabase queries)",
      "6. Deep Analysis (trends, anomalies, health scoring, predictions)",
      "7. Action Detection & Execution (pattern-matched mutations)",
      "8. Artifact Generation (reports, tables, checklists)",
      "9. Context Assembly (expert prompt + all data injection)",
      "10. LLM Streaming (gemma3:4b via Ollama)",
    ],
  };
}
