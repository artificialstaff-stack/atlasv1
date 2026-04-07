/**
 * ─── Atlas AI Client — Dynamic Provider Routing ───
 *
 * Runtime'da herhangi bir OpenAI-uyumlu LLM API'si takılıp çıkarılabilir.
 * Provider Registry üzerinden çalışır:
 *   - Env var'lardan otomatik bootstrap (geriye uyumlu)
 *   - Admin UI'dan runtime'da ekleme/çıkarma
 *   - Rate-limit algılama ve otomatik geçiş
 *   - Brain opinion sistemi ile öğrenme
 *
 * HQTT = Jarvis'in kendi beyin sunucusu (özel muamele)
 * Diğer tüm provider'lar = OpenAI-uyumlu LLM API'leri
 */

import {
  bootstrapFromEnv,
  getChatModel,
  getJarvisChatModel,
  getProviderSdk,
  routeToProvider,
  listProviders,
} from "./provider-registry";

// Ensure providers are bootstrapped on first import
bootstrapFromEnv();

import type { AiModelSlot } from "./provider-types";

// Re-export canonical slot type for backward compatibility
export type { AiModelSlot } from "./provider-types";

// ──────────────────────────────────────
// Dynamic Model Accessors
// ──────────────────────────────────────
// These are dynamic — every call goes through the registry
// so provider hot-swap and rate-limit rotation work automatically.

/** Ana model — general planning / execution */
export const model = getChatModel("primary");

/** Hızlı chat modeli */
export const chatModel = getChatModel("chat");

/** Düşük latency yardımcı slot */
export const fastModel = getChatModel("fast");

/** Çok adımlı plan kurucu slot */
export const plannerModel = getChatModel("planner");

/** ReAct / tool seçimi / karar verme slot'u */
export const actionModel = getChatModel("action");

/** Kod üretimi / refactor / tool schema işleri */
export const codeModel = getChatModel("code");

/** Araştırma ve gerektiğinde server-side built-in tool lane */
export const researchModel = getChatModel("research");

/** Daha hızlı research lane */
export const researchFastModel = getChatModel("researchFast");

/** Remote MCP veya tool-heavy request'ler için slot */
export const mcpModel = getChatModel("mcp");

/** Vision-capable slot */
export const visionModel = getChatModel("vision");

// ──────────────────────────────────────
// Backward-Compatible API
// ──────────────────────────────────────

export function getActiveAiProvider(): string {
  const decision = routeToProvider("primary");
  return decision.providerId;
}

export function getModelNameForSlot(slot: AiModelSlot): string {
  const decision = routeToProvider(slot);
  return decision.model;
}

export function getModelForSlot(slot: AiModelSlot) {
  return getChatModel(slot);
}

export function getModelRoutingInfo() {
  return {
    provider: getActiveAiProvider(),
    model: routeToProvider("primary").model,
    chatModel: routeToProvider("chat").model,
    fastModel: routeToProvider("fast").model,
    plannerModel: routeToProvider("planner").model,
    actionModel: routeToProvider("action").model,
    codeModel: routeToProvider("code").model,
    researchModel: routeToProvider("research").model,
    researchFastModel: routeToProvider("researchFast").model,
    mcpModel: routeToProvider("mcp").model,
    visionModel: routeToProvider("vision").model,
  };
}

export function getJarvisModelForSlot(slot: AiModelSlot) {
  return getJarvisChatModel(slot);
}

export function getJarvisRoutingInfo() {
  const decision = routeToProvider("research", { preferJarvis: true });
  const hqttEnabled =
    process.env.ATLAS_JARVIS_ENABLED === "1" && Boolean(process.env.HQTT_BASE_URL);
  return {
    provider: decision.providerId,
    model: decision.model,
    fallbackProvider: decision.fallbackProviderId ?? "ollama",
    fallbackModel: decision.fallbackModel ?? "qwen2.5:7b",
    hqttEnabled,
  };
}

// Legacy named SDK exports — now dynamic via registry
export function getGroqSdk() { return getProviderSdk("groq"); }
export function getOllamaSdk() { return getProviderSdk("ollama"); }
export function getHqttSdk() { return getProviderSdk("hqtt"); }

// Legacy direct exports for consumers that import { groq, ollama, hqtt }
const _groq = getProviderSdk("groq");
const _ollama = getProviderSdk("ollama");
const _hqtt = getProviderSdk("hqtt");
export { _groq as groq, _ollama as ollama, _hqtt as hqtt };
