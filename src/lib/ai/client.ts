/**
 * ─── Atlas AI Client — Groq-first model routing ───
 *
 * Öncelik:
 *   1. GROQ_API_KEY varsa Groq OpenAI-compatible endpoint
 *   2. Yoksa Ollama fallback
 *
 * Bu yapı tek provider'a kilitlenmeden planner / action / coding / vision
 * slot'larını aynı yerden yönetmek için kullanılır.
 */

import { createOpenAI } from "@ai-sdk/openai";

type AiProvider = "groq" | "ollama";
type JarvisProvider = "hqtt" | AiProvider;
export type AiModelSlot =
  | "primary"
  | "chat"
  | "fast"
  | "planner"
  | "action"
  | "code"
  | "research"
  | "researchFast"
  | "mcp"
  | "vision";

const hasGroqKey = Boolean(process.env.GROQ_API_KEY);
const activeProvider: AiProvider = hasGroqKey ? "groq" : "ollama";
const hqttEnabled = process.env.ATLAS_JARVIS_ENABLED === "1" && Boolean(process.env.HQTT_BASE_URL);

const groq = createOpenAI({
  baseURL: process.env.GROQ_BASE_URL ?? "https://api.groq.com/openai/v1",
  apiKey: process.env.GROQ_API_KEY ?? "missing-groq-key",
});

const ollama = createOpenAI({
  baseURL: process.env.OLLAMA_BASE_URL ?? "http://localhost:11434/v1",
  apiKey: "ollama",
});

const hqtt = createOpenAI({
  baseURL: process.env.HQTT_BASE_URL ?? "http://127.0.0.1:8020/v1",
  apiKey: process.env.HQTT_API_KEY ?? "hqtt-local",
});

const provider = activeProvider === "groq" ? groq : ollama;

function resolveModel(envKey: string, fallback: string) {
  return process.env[envKey] ?? fallback;
}

const defaults: Record<AiProvider, Record<AiModelSlot, string>> = {
  groq: {
    primary: resolveModel("GROQ_MODEL", "openai/gpt-oss-120b"),
    chat: resolveModel("GROQ_CHAT_MODEL", "openai/gpt-oss-20b"),
    fast: resolveModel("GROQ_FAST_MODEL", resolveModel("GROQ_CHAT_MODEL", "openai/gpt-oss-20b")),
    planner: resolveModel("GROQ_PLANNER_MODEL", resolveModel("GROQ_MODEL", "openai/gpt-oss-120b")),
    action: resolveModel("GROQ_ACTION_MODEL", resolveModel("GROQ_MODEL", "openai/gpt-oss-120b")),
    code: resolveModel("GROQ_CODE_MODEL", resolveModel("GROQ_MODEL", "openai/gpt-oss-120b")),
    research: resolveModel("GROQ_RESEARCH_MODEL", "groq/compound"),
    researchFast: resolveModel("GROQ_RESEARCH_FAST_MODEL", "groq/compound-mini"),
    mcp: resolveModel("GROQ_MCP_MODEL", resolveModel("GROQ_MODEL", "openai/gpt-oss-120b")),
    vision: resolveModel("GROQ_VISION_MODEL", resolveModel("GROQ_MODEL", "meta-llama/llama-4-scout-17b-16e-instruct")),
  },
  ollama: {
    primary: resolveModel("OLLAMA_MODEL", "qwen2.5:7b"),
    chat: resolveModel("OLLAMA_CHAT_MODEL", resolveModel("OLLAMA_MODEL", "qwen2.5:7b")),
    fast: resolveModel("OLLAMA_FAST_MODEL", resolveModel("OLLAMA_CHAT_MODEL", resolveModel("OLLAMA_MODEL", "qwen2.5:7b"))),
    planner: resolveModel("OLLAMA_PLANNER_MODEL", resolveModel("OLLAMA_MODEL", "qwen2.5:7b")),
    action: resolveModel("OLLAMA_ACTION_MODEL", resolveModel("OLLAMA_MODEL", "qwen2.5:7b")),
    code: resolveModel("OLLAMA_CODE_MODEL", resolveModel("OLLAMA_MODEL", "qwen2.5:7b")),
    research: resolveModel("OLLAMA_RESEARCH_MODEL", resolveModel("OLLAMA_MODEL", "qwen2.5:7b")),
    researchFast: resolveModel("OLLAMA_RESEARCH_FAST_MODEL", resolveModel("OLLAMA_FAST_MODEL", resolveModel("OLLAMA_MODEL", "qwen2.5:7b"))),
    mcp: resolveModel("OLLAMA_MCP_MODEL", resolveModel("OLLAMA_MODEL", "qwen2.5:7b")),
    vision: resolveModel("OLLAMA_VISION_MODEL", resolveModel("OLLAMA_MODEL", "qwen2.5:7b")),
  },
} as const;

const chosen = defaults[activeProvider];
const jarvisDefaults: Record<JarvisProvider, Record<AiModelSlot, string>> = {
  ...defaults,
  hqtt: {
    primary: resolveModel("HQTT_MODEL", "hqtt-agi-os"),
    chat: resolveModel("HQTT_MODEL", "hqtt-agi-os"),
    fast: resolveModel("HQTT_MODEL", "hqtt-agi-os"),
    planner: resolveModel("HQTT_MODEL", "hqtt-agi-os"),
    action: resolveModel("HQTT_MODEL", "hqtt-agi-os"),
    code: resolveModel("HQTT_MODEL", "hqtt-agi-os"),
    research: resolveModel("HQTT_MODEL", "hqtt-agi-os"),
    researchFast: resolveModel("HQTT_MODEL", "hqtt-agi-os"),
    mcp: resolveModel("HQTT_MODEL", "hqtt-agi-os"),
    vision: resolveModel("HQTT_MODEL", "hqtt-agi-os"),
  },
};

function instantiateModel(slot: AiModelSlot) {
  return provider.chat(chosen[slot]);
}

function instantiateJarvisModel(slot: AiModelSlot) {
  const jarvisProvider: JarvisProvider = hqttEnabled ? "hqtt" : activeProvider;
  const jarvisModel = jarvisDefaults[jarvisProvider][slot];
  const lane = jarvisProvider === "hqtt" ? hqtt : provider;
  return lane.chat(jarvisModel);
}

/** Ana model — general planning / execution */
export const model = instantiateModel("primary");

/** Hızlı chat modeli */
export const chatModel = instantiateModel("chat");

/** Düşük latency yardımcı slot */
export const fastModel = instantiateModel("fast");

/** Çok adımlı plan kurucu slot */
export const plannerModel = instantiateModel("planner");

/** ReAct / tool seçimi / karar verme slot'u */
export const actionModel = instantiateModel("action");

/** Kod üretimi / refactor / tool schema işleri */
export const codeModel = instantiateModel("code");

/** Araştırma ve gerektiğinde server-side built-in tool lane */
export const researchModel = instantiateModel("research");

/** Daha hızlı research lane */
export const researchFastModel = instantiateModel("researchFast");

/** Remote MCP veya tool-heavy request'ler için slot */
export const mcpModel = instantiateModel("mcp");

/** Vision-capable slot */
export const visionModel = instantiateModel("vision");

export function getActiveAiProvider() {
  return activeProvider;
}

export function getModelNameForSlot(slot: AiModelSlot) {
  return chosen[slot];
}

export function getModelForSlot(slot: AiModelSlot) {
  switch (slot) {
    case "primary":
      return model;
    case "chat":
      return chatModel;
    case "fast":
      return fastModel;
    case "planner":
      return plannerModel;
    case "action":
      return actionModel;
    case "code":
      return codeModel;
    case "research":
      return researchModel;
    case "researchFast":
      return researchFastModel;
    case "mcp":
      return mcpModel;
    case "vision":
      return visionModel;
  }
}

export function getModelRoutingInfo() {
  return {
    provider: activeProvider,
    model: chosen.primary,
    chatModel: chosen.chat,
    fastModel: chosen.fast,
    plannerModel: chosen.planner,
    actionModel: chosen.action,
    codeModel: chosen.code,
    researchModel: chosen.research,
    researchFastModel: chosen.researchFast,
    mcpModel: chosen.mcp,
    visionModel: chosen.vision,
  };
}

export function getJarvisModelForSlot(slot: AiModelSlot) {
  return instantiateJarvisModel(slot);
}

export function getJarvisRoutingInfo() {
  const providerName: JarvisProvider = hqttEnabled ? "hqtt" : activeProvider;
  return {
    provider: providerName,
    model: jarvisDefaults[providerName].research,
    fallbackProvider: activeProvider,
    fallbackModel: chosen.research,
    hqttEnabled,
  };
}

export { groq, ollama, hqtt };
