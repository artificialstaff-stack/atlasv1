/**
 * ─── Provider Registry ───
 *
 * Singleton registry that manages all LLM providers at runtime.
 * Supports hot-swap: add/remove providers without restart.
 * Handles rate-limit detection, automatic failover, and recovery.
 *
 * Design:
 *   - Any OpenAI-compatible API can be registered
 *   - Providers are ranked by priority (lower = preferred)
 *   - Rate-limited/unavailable providers are automatically skipped
 *   - Brain opinions can influence routing (advisory)
 *   - HQTT is special — it's marked with isHqtt flag for custom endpoints
 */

import { createOpenAI } from "@ai-sdk/openai";
import type {
  AiModelSlot,
  ProviderConfig,
  ProviderState,
  ProviderEntry,
  ProviderCallMetric,
  ProviderHealthSummary,
  RoutingDecision,
  ProviderOpinion,
} from "./provider-types";

// ──────────────────────────────────────
// Constants
// ──────────────────────────────────────

const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_COOLDOWN_MS = 60_000;
const UNAVAILABLE_COOLDOWN_MS = 30_000;
const MAX_CONSECUTIVE_ERRORS = 5;
const LATENCY_ROLLING_WINDOW = 50;
const METRICS_BUFFER_MAX = 500;

// ──────────────────────────────────────
// Singleton State
// ──────────────────────────────────────

const providers = new Map<string, ProviderEntry>();
const sdkInstances = new Map<string, ReturnType<typeof createOpenAI>>();
const metricsBuffer: ProviderCallMetric[] = [];
const opinions = new Map<string, ProviderOpinion>(); // key: `${providerId}:${slot}`

let onProviderChange: (() => void) | null = null;

// ──────────────────────────────────────
// State Factory
// ──────────────────────────────────────

function createInitialState(): ProviderState {
  return {
    requestCount: 0,
    tokenCount: 0,
    requestsInWindow: 0,
    tokensInWindow: 0,
    windowStart: Date.now(),
    lastRequestAt: null,
    lastErrorAt: null,
    lastErrorType: null,
    consecutiveErrors: 0,
    rateLimitResetAt: null,
    averageLatencyMs: 0,
    latencySamples: 0,
    isRateLimited: false,
    isAvailable: true,
  };
}

function ensureWindowFresh(state: ProviderState): void {
  const now = Date.now();
  if (now - state.windowStart > RATE_LIMIT_WINDOW_MS) {
    state.requestsInWindow = 0;
    state.tokensInWindow = 0;
    state.windowStart = now;
  }
}

// ──────────────────────────────────────
// SDK Instance Management
// ──────────────────────────────────────

function createSdkInstance(config: ProviderConfig) {
  return createOpenAI({
    baseURL: config.baseURL,
    apiKey: config.apiKey || "no-key",
  });
}

function getSdkInstance(providerId: string) {
  return sdkInstances.get(providerId) ?? null;
}

// ──────────────────────────────────────
// Public API
// ──────────────────────────────────────

/** Register or update a provider. Creates SDK instance automatically. */
export function registerProvider(config: ProviderConfig): void {
  const existing = providers.get(config.id);
  const state = existing?.state ?? createInitialState();
  providers.set(config.id, { config, state });
  sdkInstances.set(config.id, createSdkInstance(config));
  onProviderChange?.();
}

/** Remove a provider by ID. */
export function removeProvider(id: string): boolean {
  const deleted = providers.delete(id);
  sdkInstances.delete(id);
  if (deleted) onProviderChange?.();
  return deleted;
}

/** Get a provider entry by ID. */
export function getProvider(id: string): ProviderEntry | null {
  return providers.get(id) ?? null;
}

/** List all registered providers sorted by priority. */
export function listProviders(): ProviderEntry[] {
  return [...providers.values()].sort(
    (a, b) => a.config.priority - b.config.priority,
  );
}

/** Get the AI SDK instance for a provider (for .chat() calls). */
export function getProviderSdk(id: string) {
  return getSdkInstance(id);
}

/**
 * Get the best available provider + model for a given slot.
 * Considers: enabled, availability, rate limits, priority, brain opinions.
 */
export function routeToProvider(
  slot: AiModelSlot,
  options?: { preferJarvis?: boolean },
): RoutingDecision {
  const sorted = listProviders();
  const now = Date.now();

  // Check rate limit recovery
  for (const entry of sorted) {
    const { state } = entry;
    if (state.isRateLimited && state.rateLimitResetAt && now >= state.rateLimitResetAt) {
      state.isRateLimited = false;
      state.rateLimitResetAt = null;
    }
    if (!state.isAvailable && state.lastErrorAt && now - state.lastErrorAt > UNAVAILABLE_COOLDOWN_MS) {
      state.isAvailable = true;
      state.consecutiveErrors = 0;
    }
  }

  // Filter to usable providers
  const usable = sorted.filter(
    (e) => e.config.enabled && e.state.isAvailable && !e.state.isRateLimited,
  );

  // If preferJarvis, prioritize HQTT
  if (options?.preferJarvis) {
    const hqtt = usable.find((e) => e.config.isHqtt);
    if (hqtt) {
      const model = resolveModelForSlot(hqtt.config, slot);
      const fallback = usable.find((e) => !e.config.isHqtt);
      return {
        providerId: hqtt.config.id,
        model,
        fallbackProviderId: fallback?.config.id ?? null,
        fallbackModel: fallback ? resolveModelForSlot(fallback.config, slot) : null,
        reason: "HQTT brain preferred for Jarvis operations",
      };
    }
  }

  // Apply brain opinions as tie-breaker
  const withScores = usable.map((e) => {
    const opinionKey = `${e.config.id}:${slot}`;
    const opinion = opinions.get(opinionKey);
    const opinionBonus = opinion ? (opinion.preferenceScore - 0.5) * 10 : 0;
    return { entry: e, score: e.config.priority - opinionBonus };
  });
  withScores.sort((a, b) => a.score - b.score);

  if (withScores.length === 0) {
    // Nothing usable — try any enabled provider regardless of state
    const anyEnabled = sorted.find((e) => e.config.enabled);
    if (anyEnabled) {
      return {
        providerId: anyEnabled.config.id,
        model: resolveModelForSlot(anyEnabled.config, slot),
        fallbackProviderId: null,
        fallbackModel: null,
        reason: "No healthy providers — using best effort",
      };
    }
    // Absolute fallback
    return {
      providerId: "ollama",
      model: "qwen2.5:7b",
      fallbackProviderId: null,
      fallbackModel: null,
      reason: "No providers registered — defaulting to Ollama",
    };
  }

  const primary = withScores[0].entry;
  const fallback = withScores.length > 1 ? withScores[1].entry : null;

  return {
    providerId: primary.config.id,
    model: resolveModelForSlot(primary.config, slot),
    fallbackProviderId: fallback?.config.id ?? null,
    fallbackModel: fallback ? resolveModelForSlot(fallback.config, slot) : null,
    reason: `Priority provider: ${primary.config.name}`,
  };
}

/** Get a chat model instance for the best provider for a given slot. */
export function getChatModel(slot: AiModelSlot, options?: { preferJarvis?: boolean }) {
  const decision = routeToProvider(slot, options);
  const sdk = getSdkInstance(decision.providerId);
  if (!sdk) {
    // Provider was removed between route decision and model fetch
    const fallbackSdk = decision.fallbackProviderId
      ? getSdkInstance(decision.fallbackProviderId)
      : null;
    if (fallbackSdk && decision.fallbackModel) {
      return fallbackSdk.chat(decision.fallbackModel);
    }
    throw new Error(`No SDK instance for provider ${decision.providerId}`);
  }
  return sdk.chat(decision.model);
}

/** Get a Jarvis-specific chat model (prefers HQTT if available). */
export function getJarvisChatModel(slot: AiModelSlot) {
  return getChatModel(slot, { preferJarvis: true });
}

// ──────────────────────────────────────
// Call Recording & Rate Limit Detection
// ──────────────────────────────────────

/**
 * Record the result of an API call.
 * Automatically detects rate limits and marks providers accordingly.
 */
export function recordCall(metric: ProviderCallMetric): void {
  const entry = providers.get(metric.providerId);
  if (!entry) return;

  const { state, config } = entry;
  ensureWindowFresh(state);

  state.requestCount++;
  state.requestsInWindow++;
  state.tokenCount += metric.inputTokens + metric.outputTokens;
  state.tokensInWindow += metric.inputTokens + metric.outputTokens;
  state.lastRequestAt = metric.timestamp;

  if (metric.success) {
    state.consecutiveErrors = 0;
    state.isAvailable = true;
    // Rolling average latency
    state.averageLatencyMs =
      (state.averageLatencyMs * Math.min(state.latencySamples, LATENCY_ROLLING_WINDOW) +
        metric.durationMs) /
      (Math.min(state.latencySamples, LATENCY_ROLLING_WINDOW) + 1);
    state.latencySamples++;
  } else {
    state.consecutiveErrors++;
    state.lastErrorAt = metric.timestamp;
    state.lastErrorType = metric.errorType ?? "unknown";

    // Rate limit detection
    if (metric.httpStatus === 429) {
      state.isRateLimited = true;
      state.rateLimitResetAt = Date.now() + RATE_LIMIT_COOLDOWN_MS;
    }

    // Too many consecutive errors → mark unavailable
    if (state.consecutiveErrors >= MAX_CONSECUTIVE_ERRORS) {
      state.isAvailable = false;
    }
  }

  // Proactive rate limit check
  if (config.rateLimits?.requestsPerMinute && state.requestsInWindow >= config.rateLimits.requestsPerMinute) {
    state.isRateLimited = true;
    state.rateLimitResetAt = state.windowStart + RATE_LIMIT_WINDOW_MS;
  }
  if (config.rateLimits?.tokensPerMinute && state.tokensInWindow >= config.rateLimits.tokensPerMinute) {
    state.isRateLimited = true;
    state.rateLimitResetAt = state.windowStart + RATE_LIMIT_WINDOW_MS;
  }

  // Buffer for brain opinions
  metricsBuffer.push(metric);
  if (metricsBuffer.length > METRICS_BUFFER_MAX) {
    metricsBuffer.splice(0, metricsBuffer.length - METRICS_BUFFER_MAX);
  }
}

/**
 * Parse rate-limit info from HTTP response headers.
 * Call this after a 429 response to set accurate reset time.
 */
export function applyRateLimitHeaders(
  providerId: string,
  headers: Record<string, string>,
): void {
  const entry = providers.get(providerId);
  if (!entry) return;

  const retryAfter = headers["retry-after"];
  const rateLimitReset = headers["x-ratelimit-reset"];

  let resetAt: number | null = null;

  if (retryAfter) {
    const seconds = parseInt(retryAfter, 10);
    if (!isNaN(seconds)) {
      resetAt = Date.now() + seconds * 1000;
    }
  } else if (rateLimitReset) {
    const epoch = parseInt(rateLimitReset, 10);
    if (!isNaN(epoch)) {
      resetAt = epoch * 1000; // Convert to ms if seconds
      if (resetAt < Date.now() + 1_000_000_000) {
        resetAt = epoch; // Already in ms
      }
    }
  }

  if (resetAt) {
    entry.state.isRateLimited = true;
    entry.state.rateLimitResetAt = resetAt;
  }
}

// ──────────────────────────────────────
// Health Summaries
// ──────────────────────────────────────

export function getProviderHealth(id: string): ProviderHealthSummary | null {
  const entry = providers.get(id);
  if (!entry) return null;
  return toHealthSummary(entry);
}

export function getAllProviderHealth(): ProviderHealthSummary[] {
  return listProviders().map(toHealthSummary);
}

function toHealthSummary(entry: ProviderEntry): ProviderHealthSummary {
  return {
    id: entry.config.id,
    name: entry.config.name,
    enabled: entry.config.enabled,
    priority: entry.config.priority,
    isAvailable: entry.state.isAvailable,
    isRateLimited: entry.state.isRateLimited,
    rateLimitResetAt: entry.state.rateLimitResetAt,
    averageLatencyMs: Math.round(entry.state.averageLatencyMs),
    requestCount: entry.state.requestCount,
    consecutiveErrors: entry.state.consecutiveErrors,
    lastErrorType: entry.state.lastErrorType,
    models: entry.config.models,
    capabilities: entry.config.capabilities ?? [],
    isHqtt: entry.config.isHqtt ?? false,
  };
}

// ──────────────────────────────────────
// Brain Opinions
// ──────────────────────────────────────

export function setOpinion(opinion: ProviderOpinion): void {
  opinions.set(`${opinion.providerId}:${opinion.slot}`, opinion);
}

export function getOpinion(providerId: string, slot: AiModelSlot): ProviderOpinion | null {
  return opinions.get(`${providerId}:${slot}`) ?? null;
}

export function getAllOpinions(): ProviderOpinion[] {
  return [...opinions.values()];
}

/** Recompute brain opinions from recent metrics buffer. */
export function recomputeOpinions(): void {
  const slotProviderMetrics = new Map<string, ProviderCallMetric[]>();

  for (const m of metricsBuffer) {
    const key = `${m.providerId}:${m.slot}`;
    const arr = slotProviderMetrics.get(key) ?? [];
    arr.push(m);
    slotProviderMetrics.set(key, arr);
  }

  for (const [key, metrics] of slotProviderMetrics) {
    const [providerId, slot] = key.split(":") as [string, AiModelSlot];
    const successful = metrics.filter((m) => m.success);
    const successRate = metrics.length > 0 ? successful.length / metrics.length : 0;
    const avgLatency =
      successful.length > 0
        ? successful.reduce((sum, m) => sum + m.durationMs, 0) / successful.length
        : Infinity;

    // Score: 60% success rate + 40% speed (normalized)
    const speedScore = avgLatency < 500 ? 1 : avgLatency < 2000 ? 0.7 : avgLatency < 5000 ? 0.4 : 0.1;
    const preferenceScore = Math.min(1, Math.max(0, successRate * 0.6 + speedScore * 0.4));

    const entry = providers.get(providerId);
    const providerName = entry?.config.name ?? providerId;

    let reason: string;
    if (successRate >= 0.95 && avgLatency < 500) {
      reason = `${providerName}: excellent — ${Math.round(avgLatency)}ms avg, ${(successRate * 100).toFixed(0)}% success`;
    } else if (successRate >= 0.8) {
      reason = `${providerName}: good — ${Math.round(avgLatency)}ms avg, ${(successRate * 100).toFixed(0)}% success`;
    } else if (successRate >= 0.5) {
      reason = `${providerName}: mediocre — ${Math.round(avgLatency)}ms avg, ${(successRate * 100).toFixed(0)}% success`;
    } else {
      reason = `${providerName}: poor — ${(successRate * 100).toFixed(0)}% success rate, not recommended`;
    }

    setOpinion({
      providerId,
      slot: slot as AiModelSlot,
      preferenceScore,
      reason,
      sampleCount: metrics.length,
      updatedAt: Date.now(),
    });
  }
}

export function getMetricsBuffer(): readonly ProviderCallMetric[] {
  return metricsBuffer;
}

// ──────────────────────────────────────
// Helpers
// ──────────────────────────────────────

function resolveModelForSlot(config: ProviderConfig, slot: AiModelSlot): string {
  return config.models[slot] ?? config.models.primary ?? "unknown";
}

/** Subscribe to provider changes (for cache invalidation, etc.) */
export function onProvidersChanged(cb: () => void): () => void {
  onProviderChange = cb;
  return () => {
    if (onProviderChange === cb) onProviderChange = null;
  };
}

/** Get count of registered providers. */
export function getProviderCount(): number {
  return providers.size;
}

/** Check if any provider is available (not rate-limited, not down). */
export function hasAvailableProvider(): boolean {
  return listProviders().some(
    (e) => e.config.enabled && e.state.isAvailable && !e.state.isRateLimited,
  );
}

// ──────────────────────────────────────
// Bootstrap from Environment Variables
// ──────────────────────────────────────

/**
 * Auto-register providers from process.env.
 * Called once at module load for backward compatibility.
 * Providers added later via registerProvider() take effect immediately.
 */
export function bootstrapFromEnv(): void {
  // Already bootstrapped?
  if (providers.size > 0) return;

  const hqttEnabled =
    process.env.ATLAS_JARVIS_ENABLED === "1" && Boolean(process.env.HQTT_BASE_URL);

  if (hqttEnabled) {
    registerProvider({
      id: "hqtt",
      name: "HQTT Brain",
      baseURL: process.env.HQTT_BASE_URL ?? "http://127.0.0.1:8020/v1",
      apiKey: process.env.HQTT_API_KEY ?? "hqtt-local",
      models: {
        primary: process.env.HQTT_MODEL ?? "hqtt-agi-os",
        chat: process.env.HQTT_MODEL ?? "hqtt-agi-os",
        fast: process.env.HQTT_MODEL ?? "hqtt-agi-os",
        planner: process.env.HQTT_MODEL ?? "hqtt-agi-os",
        action: process.env.HQTT_MODEL ?? "hqtt-agi-os",
        code: process.env.HQTT_MODEL ?? "hqtt-agi-os",
        research: process.env.HQTT_MODEL ?? "hqtt-agi-os",
        researchFast: process.env.HQTT_MODEL ?? "hqtt-agi-os",
        mcp: process.env.HQTT_MODEL ?? "hqtt-agi-os",
        vision: process.env.HQTT_MODEL ?? "hqtt-agi-os",
      },
      priority: 0,
      enabled: true,
      isHqtt: true,
    });
  }

  // OpenAI
  if (process.env.OPENAI_API_KEY) {
    registerProvider({
      id: "openai",
      name: "OpenAI",
      baseURL: process.env.OPENAI_BASE_URL ?? "https://api.openai.com/v1",
      apiKey: process.env.OPENAI_API_KEY,
      models: {
        primary: process.env.OPENAI_MODEL ?? "gpt-4o",
        chat: process.env.OPENAI_CHAT_MODEL ?? "gpt-4o-mini",
        fast: process.env.OPENAI_FAST_MODEL ?? "gpt-4o-mini",
        code: process.env.OPENAI_CODE_MODEL ?? "gpt-4o",
        vision: process.env.OPENAI_VISION_MODEL ?? "gpt-4o",
      },
      priority: 10,
      enabled: true,
      capabilities: ["vision", "function_calling", "streaming", "json_mode"],
    });
  }

  // Anthropic (via OpenAI-compatible gateway)
  if (process.env.ANTHROPIC_API_KEY) {
    registerProvider({
      id: "anthropic",
      name: "Anthropic Claude",
      baseURL: process.env.ANTHROPIC_BASE_URL ?? "https://api.anthropic.com/v1",
      apiKey: process.env.ANTHROPIC_API_KEY,
      models: {
        primary: process.env.ANTHROPIC_MODEL ?? "claude-sonnet-4-20250514",
        chat: process.env.ANTHROPIC_CHAT_MODEL ?? "claude-sonnet-4-20250514",
        fast: process.env.ANTHROPIC_FAST_MODEL ?? "claude-haiku-3-20250514",
        code: process.env.ANTHROPIC_CODE_MODEL ?? "claude-sonnet-4-20250514",
      },
      priority: 15,
      enabled: true,
      capabilities: ["function_calling", "streaming", "long_context", "code", "reasoning"],
    });
  }

  // Groq
  if (process.env.GROQ_API_KEY) {
    const rm = (envKey: string, fallback: string) => process.env[envKey] ?? fallback;
    registerProvider({
      id: "groq",
      name: "Groq",
      baseURL: process.env.GROQ_BASE_URL ?? "https://api.groq.com/openai/v1",
      apiKey: process.env.GROQ_API_KEY,
      models: {
        primary: rm("GROQ_MODEL", "openai/gpt-oss-120b"),
        chat: rm("GROQ_CHAT_MODEL", "openai/gpt-oss-20b"),
        fast: rm("GROQ_FAST_MODEL", rm("GROQ_CHAT_MODEL", "openai/gpt-oss-20b")),
        planner: rm("GROQ_PLANNER_MODEL", rm("GROQ_MODEL", "openai/gpt-oss-120b")),
        action: rm("GROQ_ACTION_MODEL", rm("GROQ_MODEL", "openai/gpt-oss-120b")),
        code: rm("GROQ_CODE_MODEL", rm("GROQ_MODEL", "openai/gpt-oss-120b")),
        research: rm("GROQ_RESEARCH_MODEL", "groq/compound"),
        researchFast: rm("GROQ_RESEARCH_FAST_MODEL", "groq/compound-mini"),
        mcp: rm("GROQ_MCP_MODEL", rm("GROQ_MODEL", "openai/gpt-oss-120b")),
        vision: rm("GROQ_VISION_MODEL", "meta-llama/llama-4-scout-17b-16e-instruct"),
      },
      priority: 20,
      enabled: true,
      capabilities: ["function_calling", "streaming"],
      rateLimits: {
        requestsPerMinute: 30,
        tokensPerMinute: 15_000,
      },
    });
  }

  // DeepSeek
  if (process.env.DEEPSEEK_API_KEY) {
    registerProvider({
      id: "deepseek",
      name: "DeepSeek",
      baseURL: process.env.DEEPSEEK_BASE_URL ?? "https://api.deepseek.com/v1",
      apiKey: process.env.DEEPSEEK_API_KEY,
      models: {
        primary: process.env.DEEPSEEK_MODEL ?? "deepseek-chat",
        chat: process.env.DEEPSEEK_CHAT_MODEL ?? "deepseek-chat",
        code: process.env.DEEPSEEK_CODE_MODEL ?? "deepseek-coder",
      },
      priority: 25,
      enabled: true,
      capabilities: ["function_calling", "streaming", "code", "reasoning"],
    });
  }

  // Ollama (always available as ultimate fallback)
  registerProvider({
    id: "ollama",
    name: "Ollama (Local)",
    baseURL: process.env.OLLAMA_BASE_URL ?? "http://localhost:11434/v1",
    apiKey: "ollama",
    models: {
      primary: process.env.OLLAMA_MODEL ?? "qwen2.5:7b",
      chat: process.env.OLLAMA_CHAT_MODEL ?? process.env.OLLAMA_MODEL ?? "qwen2.5:7b",
      fast: process.env.OLLAMA_FAST_MODEL ?? process.env.OLLAMA_MODEL ?? "qwen2.5:7b",
      planner: process.env.OLLAMA_PLANNER_MODEL ?? process.env.OLLAMA_MODEL ?? "qwen2.5:7b",
      action: process.env.OLLAMA_ACTION_MODEL ?? process.env.OLLAMA_MODEL ?? "qwen2.5:7b",
      code: process.env.OLLAMA_CODE_MODEL ?? process.env.OLLAMA_MODEL ?? "qwen2.5:7b",
      research: process.env.OLLAMA_RESEARCH_MODEL ?? process.env.OLLAMA_MODEL ?? "qwen2.5:7b",
      researchFast: process.env.OLLAMA_RESEARCH_FAST_MODEL ?? process.env.OLLAMA_MODEL ?? "qwen2.5:7b",
      mcp: process.env.OLLAMA_MCP_MODEL ?? process.env.OLLAMA_MODEL ?? "qwen2.5:7b",
      vision: process.env.OLLAMA_VISION_MODEL ?? process.env.OLLAMA_MODEL ?? "qwen2.5:7b",
    },
    priority: 99,
    enabled: true,
  });
}

// Auto-bootstrap on first import
bootstrapFromEnv();
