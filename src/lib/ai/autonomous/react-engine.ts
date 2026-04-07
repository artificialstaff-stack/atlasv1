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
import { generateObject, streamText } from "ai";
import { actionModel, ollama } from "@/lib/ai/client";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import { z } from "zod";

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

export interface ToolContextCookie {
  name: string;
  value: string;
}

export interface ToolContext {
  supabase: Db;
  userId: string;
  sessionId: string;
  requestCookies?: ToolContextCookie[];
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

const reactDecisionSchema = z.object({
  thought: z.string().min(1),
  action: z.object({
    tool: z.string().min(1),
    params: z.record(z.string(), z.unknown()).default({}),
  }).optional(),
  finalAnswer: z.string().optional(),
});

const localFallbackChatModel = ollama.chat(
  process.env.OLLAMA_CHAT_MODEL ?? process.env.OLLAMA_MODEL ?? "qwen2.5:7b",
);

function getModelErrorMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message;
  }

  if (error && typeof error === "object" && "responseBody" in error && typeof error.responseBody === "string") {
    return error.responseBody;
  }

  return String(error ?? "unknown_error");
}

export function shouldFallbackToLocalModel(error: unknown) {
  const message = getModelErrorMessage(error);
  return /(rate limit|429|maxRetriesExceeded|retry after|tokens per day|temporarily unavailable|timeout|timed out|socket hang up|econnreset|model overloaded|tool_use_failed|tool choice is none)/i.test(message);
}

function buildModelExecutionError(error: unknown) {
  const message = getModelErrorMessage(error);

  if (shouldFallbackToLocalModel(error)) {
    return new Error("Atlas model katmanı şu anda yoğun. Sohbet akışı korunuyor; aynı isteği birazdan yeniden deneyebiliriz.");
  }

  if (/unauthorized|refresh token|auth/i.test(message)) {
    return new Error("Atlas bu turda güvenli oturum katmanına erişemedi. Girişi yenileyip aynı sohbetten devam edebilirsiniz.");
  }

  return new Error("Atlas bu turda model katmanından temiz yanıt alamadı. Aynı hedefi daha dar bir alt adımla sürdürelim.");
}

async function generateStructuredDecision(
  model: typeof actionModel,
  systemPrompt: string,
  conversationHistory: string,
) {
  const { object } = await generateObject({
    model,
    system: `${systemPrompt}\n\nSadece schema'ya uyan yapılandırılmış nesne üret.`,
    prompt: `${conversationHistory}\nŞimdi bir sonraki adımı planla ve schema'ya uygun yanıt ver.`,
    schema: reactDecisionSchema,
    temperature: 0.2,
    maxOutputTokens: 500,
  });

  return {
    thought: object.thought.trim(),
    action: object.action
      ? {
          tool: object.action.tool,
          params: object.action.params ?? {},
        }
      : undefined,
    finalAnswer: object.finalAnswer?.trim(),
  } satisfies ParsedResponse;
}

async function streamDecisionText(
  model: typeof actionModel,
  systemPrompt: string,
  conversationHistory: string,
) {
  const result = streamText({
    model,
    system: systemPrompt,
    messages: [{ role: "user", content: `${conversationHistory}\nŞimdi düşün ve eylem seç:` }],
    temperature: 0.3,
    maxOutputTokens: 800,
  });

  let llmOutput = "";
  for await (const chunk of result.textStream) {
    llmOutput += chunk;
  }

  return llmOutput;
}

async function askStructuredNextStep(
  systemPrompt: string,
  conversationHistory: string,
): Promise<ParsedResponse | null> {
  try {
    return await generateStructuredDecision(actionModel, systemPrompt, conversationHistory);
  } catch (error) {
    if (!shouldFallbackToLocalModel(error)) {
      return null;
    }

    try {
      return await generateStructuredDecision(localFallbackChatModel, systemPrompt, conversationHistory);
    } catch {
      return null;
    }
  }
}

async function askTextNextStep(
  systemPrompt: string,
  conversationHistory: string,
) {
  try {
    return await streamDecisionText(actionModel, systemPrompt, conversationHistory);
  } catch (error) {
    if (!shouldFallbackToLocalModel(error)) {
      throw buildModelExecutionError(error);
    }

    try {
      return await streamDecisionText(localFallbackChatModel, systemPrompt, conversationHistory);
    } catch (fallbackError) {
      throw buildModelExecutionError(fallbackError);
    }
  }
}

function tryParseJsonResponse(text: string): ParsedResponse | null {
  const candidates = [
    text.match(/```json\s*([\s\S]*?)```/i)?.[1],
    text.match(/```[\s\S]*?(\{[\s\S]*\})[\s\S]*?```/i)?.[1],
    text.match(/\{[\s\S]*\}/)?.[0],
  ].filter(Boolean) as string[];

  for (const candidate of candidates) {
    try {
      const parsed = JSON.parse(candidate) as {
        thought?: string;
        dusunce?: string;
        action?: { tool?: string; name?: string; params?: Record<string, unknown> };
        eylem?: { tool?: string; name?: string; params?: Record<string, unknown> };
        finalAnswer?: string;
        sonuc?: string;
      };

      const thought = parsed.thought ?? parsed.dusunce ?? "";
      const action = parsed.action ?? parsed.eylem;
      const finalAnswer = parsed.finalAnswer ?? parsed.sonuc;

      if (thought || action?.tool || action?.name || finalAnswer) {
        return {
          thought: thought.trim(),
          action: action?.tool || action?.name
            ? {
                tool: String(action.tool ?? action.name),
                params: (action.params ?? {}) as Record<string, unknown>,
              }
            : undefined,
          finalAnswer: typeof finalAnswer === "string" ? finalAnswer.trim() : undefined,
        };
      }
    } catch {
      // continue
    }
  }

  return null;
}

function parseLLMResponse(text: string): ParsedResponse {
  const result: ParsedResponse = { thought: "" };

  const jsonParsed = tryParseJsonResponse(text);
  if (jsonParsed) {
    return jsonParsed;
  }

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

    let parsed: ParsedResponse | null = await askStructuredNextStep(systemPrompt, conversationHistory);

    if (!parsed) {
      try {
        const llmOutput = await askTextNextStep(systemPrompt, conversationHistory);
        parsed = parseLLMResponse(llmOutput);
      } catch (err) {
        steps.push({
          type: "thought",
          content: err instanceof Error ? err.message : "Atlas model katmanı bu turda yanıt üretemedi.",
          timestamp: Date.now(),
          durationMs: Date.now() - stepStart,
        });
        break;
      }
    }

    if (!parsed) {
      conversationHistory += `GÖZLEM: Model geçerli yapılandırılmış yanıt üretemedi. DÜŞÜNCE/EYLEM/SONUÇ formatı veya schema zorunlu.\n\n`;
      continue;
    }

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
