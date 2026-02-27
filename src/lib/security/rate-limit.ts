/**
 * ─── Atlas Platform — API Rate Limiter v2 ───
 * In-memory sliding window rate limiter.
 * Supports per-IP, per-user, and per-endpoint limits.
 * Headers: X-RateLimit-Limit, X-RateLimit-Remaining, Retry-After.
 */

// ─── Types ──────────────────────────────────────────────
export interface RateLimitConfig {
  /** Maximum number of requests allowed in the window */
  maxRequests: number;
  /** Time window in milliseconds */
  windowMs: number;
  /** Identifier for this limiter (e.g., "api", "auth", "upload") */
  name?: string;
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  limit: number;
  resetAt: number;
  retryAfter?: number;
}

// ─── In-Memory Store ────────────────────────────────────
interface WindowEntry {
  timestamps: number[];
  firstRequestAt: number;
}

const store = new Map<string, WindowEntry>();

// Periodic cleanup every 60 seconds
let cleanupInterval: ReturnType<typeof setInterval> | null = null;

function ensureCleanup() {
  if (cleanupInterval) return;
  cleanupInterval = setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of store) {
      // Remove entries whose window has fully expired
      if (now - entry.firstRequestAt > 300_000) {
        store.delete(key);
      }
    }
  }, 60_000);
  // Don't prevent process exit
  if (typeof cleanupInterval === "object" && "unref" in cleanupInterval) {
    cleanupInterval.unref();
  }
}

// ─── Core Rate Limit Check ──────────────────────────────
export function checkRateLimit(
  key: string,
  config: RateLimitConfig
): RateLimitResult {
  ensureCleanup();

  const now = Date.now();
  const windowStart = now - config.windowMs;

  let entry = store.get(key);
  if (!entry) {
    entry = { timestamps: [], firstRequestAt: now };
    store.set(key, entry);
  }

  // Remove timestamps outside the current window
  entry.timestamps = entry.timestamps.filter((t) => t > windowStart);

  const remaining = Math.max(0, config.maxRequests - entry.timestamps.length);
  const resetAt = entry.timestamps.length > 0
    ? entry.timestamps[0] + config.windowMs
    : now + config.windowMs;

  if (entry.timestamps.length >= config.maxRequests) {
    const retryAfter = Math.ceil((resetAt - now) / 1000);
    return {
      allowed: false,
      remaining: 0,
      limit: config.maxRequests,
      resetAt,
      retryAfter,
    };
  }

  // Record this request
  entry.timestamps.push(now);

  return {
    allowed: true,
    remaining: remaining - 1,
    limit: config.maxRequests,
    resetAt,
  };
}

// ─── Preset Configurations ──────────────────────────────
export const RATE_LIMITS = {
  /** General API: 100 req / minute */
  api: { maxRequests: 100, windowMs: 60_000, name: "api" },
  /** Auth endpoints: 10 req / minute */
  auth: { maxRequests: 10, windowMs: 60_000, name: "auth" },
  /** File uploads: 20 req / minute */
  upload: { maxRequests: 20, windowMs: 60_000, name: "upload" },
  /** AI/Copilot: 30 req / minute */
  ai: { maxRequests: 30, windowMs: 60_000, name: "ai" },
  /** Webhook: 200 req / minute */
  webhook: { maxRequests: 200, windowMs: 60_000, name: "webhook" },
  /** Contact form: 5 req / 15 minutes */
  contact: { maxRequests: 5, windowMs: 900_000, name: "contact" },
} as const satisfies Record<string, RateLimitConfig>;

// ─── Utility: Headers ───────────────────────────────────
export function rateLimitHeaders(
  result: RateLimitResult
): Record<string, string> {
  const headers: Record<string, string> = {
    "X-RateLimit-Limit": String(result.limit),
    "X-RateLimit-Remaining": String(result.remaining),
    "X-RateLimit-Reset": String(Math.ceil(result.resetAt / 1000)),
  };

  if (result.retryAfter) {
    headers["Retry-After"] = String(result.retryAfter);
  }

  return headers;
}

// ─── Helper: Extract identifier from request ────────────
export function getClientIdentifier(
  headers: Headers,
  userId?: string
): string {
  if (userId) return `user:${userId}`;
  const forwarded = headers.get("x-forwarded-for");
  const ip = forwarded?.split(",")[0]?.trim() || headers.get("x-real-ip") || "unknown";
  return `ip:${ip}`;
}

// ─── Convenience: Full check with ID extraction ─────────
export function apiRateLimit(
  headers: Headers,
  config: RateLimitConfig = RATE_LIMITS.api,
  userId?: string
): RateLimitResult {
  const id = getClientIdentifier(headers, userId);
  const key = `${config.name || "default"}:${id}`;
  return checkRateLimit(key, config);
}
