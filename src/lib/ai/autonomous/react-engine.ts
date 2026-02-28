// ─── Atlas AI — ReAct Agent Engine ──────────────────────────────────────────
// ReAct = Reason + Act. The LLM thinks step-by-step, picks tools, observes
// results, and loops until the goal is achieved.
//
// This is the REAL engine — not a demo. It:
//   1. Takes a goal + available tools
//   2. Enters a Reason → Act → Observe loop
//   3. The LLM decides WHICH tool to call and with WHAT params
//   4. Executes the tool, feeds result back as observation
//   5. Repeats until LLM outputs FINAL_ANSWER
//
// This is how Claude, GPT, and Manus work internally.
// ─────────────────────────────────────────────────────────────────────────────
import { streamText } from "ai";
import { chatModel } from "@/lib/ai/client";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

type Db = SupabaseClient<Database>;

// ─── Tool Definition ────────────────────────────────────────────────────────

export interface AgentTool {
  name: string;
  description: string;
  parameters: ToolParam[];
  execute: (params: Record<string, unknown>, ctx: ToolContext) => Promise<ToolResult>;
}

export interface ToolParam {
  name: string;
  type: "string" | "number" | "boolean" | "object" | "array";
  description: string;
  required?: boolean;
  default?: unknown;
}

export interface ToolContext {
  supabase: Db;
  userId: string;
  sessionId: string;
  signal?: AbortSignal;
}

export interface ToolResult {
  success: boolean;
  data: unknown;
  summary: string;
  error?: string;
}

// ─── ReAct Step Types ───────────────────────────────────────────────────────

export interface ReActStep {
  type: "thought" | "action" | "observation" | "final_answer";
  content: string;
  toolName?: string;
  toolParams?: Record<string, unknown>;
  toolResult?: ToolResult;
  timestamp: number;
  durationMs?: number;
}

export interface ReActConfig {
  maxSteps: number;
  maxTokensPerStep: number;
  timeoutMs: number;
  tools: AgentTool[];
  systemPrompt?: string;
  onStep?: (step: ReActStep) => void;
  signal?: AbortSignal;
}

// ─── Build Tool Description for LLM ────────────────────────────────────────

function buildToolsPrompt(tools: AgentTool[]): string {
  if (tools.length === 0) return "Kullanılabilir araç yok.";

  const lines: string[] = ["Kullanılabilir araçlar:"];

  for (const tool of tools) {
    const params = tool.parameters
      .map(p => `    - ${p.name} (${p.type}${p.required ? ", zorunlu" : ""}): ${p.description}`)
      .join("\n");

    lines.push(`
[${tool.name}]
  Açıklama: ${tool.description}
  Parametreler:
${params || "    (parametre yok)"}`);
  }

  return lines.join("\n");
}

// ─── Parse LLM Output ──────────────────────────────────────────────────────

interface ParsedResponse {
  thought: string;
  action?: { tool: string; params: Record<string, unknown> };
  finalAnswer?: string;
}

function parseLLMResponse(text: string): ParsedResponse {
  const result: ParsedResponse = { thought: "" };

  // Extract THOUGHT (Turkish: DÜŞÜNCE, English: THOUGHT)
  const thoughtMatch = text.match(/D[ÜU]Ş[ÜU]NCE:\s*([\s\S]*?)(?=EYLEM:|SONUC|SONU[ÇC]:|ACTION:|FINAL|$)/i)
    ?? text.match(/THOUGHT:\s*([\s\S]*?)(?=ACTION:|FINAL_ANSWER:|$)/i);
  if (thoughtMatch) {
    result.thought = thoughtMatch[1].trim();
  }

  // Extract FINAL_ANSWER / SONUÇ (handle Turkish chars)
  const finalMatch = text.match(/SONU[ÇC]:\s*([\s\S]*?)$/i)
    ?? text.match(/FINAL[\s_]?ANSWER:\s*([\s\S]*?)$/i);
  if (finalMatch) {
    result.finalAnswer = finalMatch[1].trim();
    return result;
  }

  // Extract ACTION / EYLEM — handle multiple formats
  const actionMatch = text.match(/EYLEM:\s*(\w+)\s*\(([\s\S]*?)\)/i)
    ?? text.match(/ACTION:\s*(\w+)\s*\(([\s\S]*?)\)/i)
    ?? text.match(/EYLEM:\s*(\w+)\s*\{([\s\S]*?)\}/i)
    ?? text.match(/(\w+)\s*\(([\s\S]*?)\)\s*$/im);
  if (actionMatch) {
    const toolName = actionMatch[1].trim();
    let params: Record<string, unknown> = {};

    try {
      // Try JSON parse first
      const paramStr = actionMatch[2].trim();
      if (paramStr.startsWith("{")) {
        params = JSON.parse(paramStr);
      } else {
        // Parse key=value format
        const kvPairs = paramStr.split(",").map(s => s.trim()).filter(Boolean);
        for (const kv of kvPairs) {
          const eqIdx = kv.indexOf("=");
          if (eqIdx > 0) {
            const key = kv.slice(0, eqIdx).trim();
            let val: unknown = kv.slice(eqIdx + 1).trim();
            // Try to parse as JSON value
            try { val = JSON.parse(val as string); } catch { /* keep as string */ }
            params[key] = val;
          }
        }
      }
    } catch {
      // If param parsing fails, pass raw string
      params = { query: actionMatch[2].trim() };
    }

    result.action = { tool: toolName, params };
    return result;
  }

  // Fallback: if no structured output, treat entire text as thought + final answer
  if (!result.thought && !result.action && !result.finalAnswer) {
    // Check if the LLM just gave a direct answer without structure
    const hasToolCall = /EYLEM:|ACTION:|SONUÇ:|FINAL_ANSWER:|DÜŞÜNCE:|THOUGHT:/i.test(text);
    if (!hasToolCall) {
      result.finalAnswer = text.trim();
    } else {
      result.thought = text.trim();
    }
  }

  return result;
}

// ─── The ReAct Loop ─────────────────────────────────────────────────────────

export async function runReActLoop(
  goal: string,
  context: string,
  config: ReActConfig,
  toolCtx: ToolContext,
): Promise<{ steps: ReActStep[]; finalAnswer: string; success: boolean }> {
  const steps: ReActStep[] = [];
  const toolsPrompt = buildToolsPrompt(config.tools);
  const toolMap = new Map(config.tools.map(t => [t.name, t]));

  const systemPrompt = config.systemPrompt ?? `Sen Atlas AI'ın otonom ajanısın. SADECE TÜRKÇE yaz, başka dil kullanma.

HER ADIMDA BU FORMATI KULLAN:
DÜŞÜNCE: [ne yapmam gerekiyor — Türkçe]
EYLEM: araç_adı(param1=değer1, param2=değer2)

Sonucu gördükten sonra tekrar DÜŞÜNCE yaz.
Hedefe ulaştığında:
SONUÇ: [final cevap — Türkçe]

KURALLAR:
- Her adımda sadece BİR araç çağır
- SADECE Türkçe yaz
- Tahmin yapma, araç kullan

${toolsPrompt}`;

  let conversationHistory = `HEDEF: ${goal}\n\nBAĞLAM:\n${context}\n\n`;
  const startTime = Date.now();

  for (let step = 0; step < config.maxSteps; step++) {
    if (config.signal?.aborted) break;
    if (Date.now() - startTime > config.timeoutMs) {
      steps.push({
        type: "final_answer",
        content: "Zaman aşımı — mevcut bulgularla sonuçlanıyor.",
        timestamp: Date.now(),
      });
      break;
    }

    // ── Ask LLM for next step ───────────────────────────────────────
    const stepStart = Date.now();

    let llmOutput = "";
    try {
      const result = streamText({
        model: chatModel,
        system: systemPrompt,
        messages: [{ role: "user", content: conversationHistory + "\nŞimdi düşün ve eylem seç:" }],
        temperature: 0.3,
        maxOutputTokens: config.maxTokensPerStep,
      });

      for await (const chunk of result.textStream) {
        llmOutput += chunk;
      }
    } catch (err) {
      steps.push({
        type: "thought",
        content: `LLM hatası: ${err instanceof Error ? err.message : "Bilinmeyen"}`,
        timestamp: Date.now(),
        durationMs: Date.now() - stepStart,
      });
      break;
    }

    // ── Parse the LLM output ────────────────────────────────────────
    const parsed = parseLLMResponse(llmOutput);

    // Record thought
    if (parsed.thought) {
      const thoughtStep: ReActStep = {
        type: "thought",
        content: parsed.thought,
        timestamp: Date.now(),
        durationMs: Date.now() - stepStart,
      };
      steps.push(thoughtStep);
      config.onStep?.(thoughtStep);
      conversationHistory += `DÜŞÜNCE: ${parsed.thought}\n`;
    }

    // ── Handle final answer ─────────────────────────────────────────
    if (parsed.finalAnswer) {
      const finalStep: ReActStep = {
        type: "final_answer",
        content: parsed.finalAnswer,
        timestamp: Date.now(),
        durationMs: Date.now() - stepStart,
      };
      steps.push(finalStep);
      config.onStep?.(finalStep);

      return {
        steps,
        finalAnswer: parsed.finalAnswer,
        success: true,
      };
    }

    // ── Execute tool action ─────────────────────────────────────────
    if (parsed.action) {
      const actionStep: ReActStep = {
        type: "action",
        content: `${parsed.action.tool}(${JSON.stringify(parsed.action.params)})`,
        toolName: parsed.action.tool,
        toolParams: parsed.action.params,
        timestamp: Date.now(),
      };
      steps.push(actionStep);
      config.onStep?.(actionStep);
      conversationHistory += `EYLEM: ${parsed.action.tool}(${JSON.stringify(parsed.action.params)})\n`;

      // Find and execute the tool
      const tool = toolMap.get(parsed.action.tool);
      const toolStart = Date.now();

      let toolResult: ToolResult;
      if (!tool) {
        toolResult = {
          success: false,
          data: null,
          summary: `Araç bulunamadı: ${parsed.action.tool}`,
          error: `Tool not found: ${parsed.action.tool}`,
        };
      } else {
        try {
          toolResult = await tool.execute(parsed.action.params, toolCtx);
        } catch (err) {
          toolResult = {
            success: false,
            data: null,
            summary: `Araç hatası: ${err instanceof Error ? err.message : "Bilinmeyen"}`,
            error: err instanceof Error ? err.message : "Unknown error",
          };
        }
      }

      const obsStep: ReActStep = {
        type: "observation",
        content: toolResult.summary,
        toolName: parsed.action.tool,
        toolResult,
        timestamp: Date.now(),
        durationMs: Date.now() - toolStart,
      };
      steps.push(obsStep);
      config.onStep?.(obsStep);

      // Feed observation back to LLM
      const obsText = typeof toolResult.data === "string"
        ? toolResult.data
        : JSON.stringify(toolResult.data, null, 2);
      const truncatedObs = obsText.length > 2000 ? obsText.slice(0, 2000) + "\n...(kırpıldı)" : obsText;
      conversationHistory += `GÖZLEM: ${toolResult.summary}\n${truncatedObs}\n\n`;

      continue;
    }

    // ── No action and no final answer — nudge LLM ───────────────────
    conversationHistory += `GÖZLEM: Yapısal format kullanılmadı. DÜŞÜNCE/EYLEM/SONUÇ formatını kullan.\n\n`;
  }

  // If we exhausted all steps without final answer
  const lastThought = steps.filter(s => s.type === "thought").pop()?.content ?? "";
  const lastObs = steps.filter(s => s.type === "observation").pop()?.content ?? "";

  return {
    steps,
    finalAnswer: lastThought || lastObs || "Görev tamamlanamadı — yeterli adım bulunamadı.",
    success: steps.some(s => s.type === "final_answer"),
  };
}

// ─── SSE Streaming ReAct ────────────────────────────────────────────────────

export function encodeSSE(data: Record<string, unknown>): Uint8Array {
  return new TextEncoder().encode(`data: ${JSON.stringify(data)}\n\n`);
}

/**
 * Run a full ReAct session and stream results via SSE.
 * This is the main entry point for the autonomous API.
 */
export function createReActStream(
  goal: string,
  context: string,
  tools: AgentTool[],
  toolCtx: ToolContext,
  options?: { maxSteps?: number; systemPrompt?: string },
): ReadableStream<Uint8Array> {
  return new ReadableStream<Uint8Array>({
    async start(controller) {
      const safeEnqueue = (data: Uint8Array) => {
        try { controller.enqueue(data); } catch { /* controller closed */ }
      };
      const safeClose = () => {
        try { controller.close(); } catch { /* already closed */ }
      };

      const startTime = Date.now();

      try {
        safeEnqueue(encodeSSE({
          type: "react_start",
          data: {
            goal,
            toolCount: tools.length,
            maxSteps: options?.maxSteps ?? 15,
          },
        }));

        const result = await runReActLoop(goal, context, {
          maxSteps: options?.maxSteps ?? 15,
          maxTokensPerStep: 800,
          timeoutMs: 120_000,
          tools,
          systemPrompt: options?.systemPrompt,
          signal: toolCtx.signal,
          onStep: (step) => {
            safeEnqueue(encodeSSE({
              type: `react_${step.type}`,
              data: {
                content: step.content,
                toolName: step.toolName,
                toolParams: step.toolParams,
                toolSuccess: step.toolResult?.success,
                toolSummary: step.toolResult?.summary,
                durationMs: step.durationMs,
              },
            }));
          },
        }, toolCtx);

        // Stream final answer as text chunks
        const answer = result.finalAnswer;
        const chunkSize = 50;
        for (let i = 0; i < answer.length; i += chunkSize) {
          safeEnqueue(encodeSSE({
            type: "text",
            data: { content: answer.slice(i, i + chunkSize) },
          }));
        }

        safeEnqueue(encodeSSE({
          type: "done",
          data: {
            success: result.success,
            totalSteps: result.steps.length,
            thoughts: result.steps.filter(s => s.type === "thought").length,
            actions: result.steps.filter(s => s.type === "action").length,
            observations: result.steps.filter(s => s.type === "observation").length,
            pipelineMs: Date.now() - startTime,
          },
        }));
      } catch (err) {
        safeEnqueue(encodeSSE({
          type: "error",
          data: { message: err instanceof Error ? err.message : "Bilinmeyen hata" },
        }));
      } finally {
        safeClose();
      }
    },
  });
}
