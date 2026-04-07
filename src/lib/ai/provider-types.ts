/**
 * ─── Provider Types ───
 *
 * Universal LLM provider system for Atlas / Jarvis.
 * Any OpenAI-compatible API can be registered at runtime.
 * The brain decides which provider to use based on priority,
 * availability, rate limits, and learned preferences.
 */

// ──────────────────────────────────────
// AI Model Slots (canonical definition)
// ──────────────────────────────────────

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

// ──────────────────────────────────────
// Provider Configuration
// ──────────────────────────────────────

export interface ProviderConfig {
  /** Unique identifier — "openai", "anthropic", "groq", "ollama", "deepseek", etc. */
  id: string;
  /** Human-friendly display name */
  name: string;
  /** OpenAI-compatible base URL */
  baseURL: string;
  /** API key (empty string for local providers like Ollama) */
  apiKey: string;
  /** Model mapping per slot — missing slots inherit from "primary" */
  models: Partial<Record<AiModelSlot, string>>;
  /** Lower number = higher priority (0 = highest) */
  priority: number;
  /** Whether this provider is enabled */
  enabled: boolean;
  /** Rate limit thresholds (optional — used for proactive switching) */
  rateLimits?: ProviderRateLimits;
  /** Capabilities this provider supports */
  capabilities?: ProviderCapability[];
  /** Whether this is the HQTT brain server (special treatment) */
  isHqtt?: boolean;
}

export interface ProviderRateLimits {
  requestsPerMinute?: number;
  tokensPerMinute?: number;
  tokensPerDay?: number;
}

export type ProviderCapability =
  | "vision"
  | "function_calling"
  | "streaming"
  | "long_context"
  | "json_mode"
  | "code"
  | "reasoning";

// ──────────────────────────────────────
// Provider Runtime State
// ──────────────────────────────────────

export interface ProviderState {
  /** Total requests since process start */
  requestCount: number;
  /** Total tokens consumed (approximate) */
  tokenCount: number;
  /** Requests in current rate-limit window */
  requestsInWindow: number;
  /** Tokens in current rate-limit window */
  tokensInWindow: number;
  /** Start of current rate-limit window */
  windowStart: number;
  /** Timestamp of last successful request */
  lastRequestAt: number | null;
  /** Timestamp of last error */
  lastErrorAt: number | null;
  /** Last error message */
  lastErrorType: string | null;
  /** Consecutive error count (resets on success) */
  consecutiveErrors: number;
  /** When rate limit resets (from Retry-After or x-ratelimit-reset headers) */
  rateLimitResetAt: number | null;
  /** Rolling average latency in ms */
  averageLatencyMs: number;
  /** Total latency samples for rolling average */
  latencySamples: number;
  /** Currently rate-limited? */
  isRateLimited: boolean;
  /** Currently reachable? */
  isAvailable: boolean;
}

// ──────────────────────────────────────
// Provider Entry (config + state)
// ──────────────────────────────────────

export interface ProviderEntry {
  config: ProviderConfig;
  state: ProviderState;
}

// ──────────────────────────────────────
// Call Metrics (recorded per API call)
// ──────────────────────────────────────

export interface ProviderCallMetric {
  providerId: string;
  slot: AiModelSlot;
  model: string;
  durationMs: number;
  inputTokens: number;
  outputTokens: number;
  success: boolean;
  errorType?: string;
  httpStatus?: number;
  timestamp: number;
}

// ──────────────────────────────────────
// Provider Health Summary (for API/UI)
// ──────────────────────────────────────

export interface ProviderHealthSummary {
  id: string;
  name: string;
  enabled: boolean;
  priority: number;
  isAvailable: boolean;
  isRateLimited: boolean;
  rateLimitResetAt: number | null;
  averageLatencyMs: number;
  requestCount: number;
  consecutiveErrors: number;
  lastErrorType: string | null;
  models: Partial<Record<AiModelSlot, string>>;
  capabilities: ProviderCapability[];
  isHqtt: boolean;
}

// ──────────────────────────────────────
// Routing Decision
// ──────────────────────────────────────

export interface RoutingDecision {
  providerId: string;
  model: string;
  fallbackProviderId: string | null;
  fallbackModel: string | null;
  reason: string;
}

// ──────────────────────────────────────
// Brain Opinion (learned preference)
// ──────────────────────────────────────

export interface ProviderOpinion {
  providerId: string;
  slot: AiModelSlot;
  /** 0-1 score — higher = brain prefers this provider for this slot */
  preferenceScore: number;
  /** Human-readable reason */
  reason: string;
  /** Based on how many samples */
  sampleCount: number;
  /** When this opinion was last updated */
  updatedAt: number;
}
