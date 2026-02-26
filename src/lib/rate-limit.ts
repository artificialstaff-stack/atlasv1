/**
 * Atlas Rate Limiter — Edge-compatible, in-memory sliding window
 *
 * Startup-grade rate limiting without external dependencies.
 * Uses a Map with sliding window counters.
 *
 * For production at scale, swap to Upstash Redis rate limiter.
 */

interface RateLimitConfig {
  /** Maximum requests per window */
  limit: number;
  /** Window duration in milliseconds */
  windowMs: number;
}

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const store = new Map<string, RateLimitEntry>();

// Cleanup stale entries every 60 seconds
if (typeof setInterval !== "undefined") {
  setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of store) {
      if (entry.resetAt < now) store.delete(key);
    }
  }, 60_000);
}

export function rateLimit(
  identifier: string,
  config: RateLimitConfig = { limit: 60, windowMs: 60_000 }
): { success: boolean; remaining: number; resetAt: number } {
  const now = Date.now();
  const entry = store.get(identifier);

  if (!entry || entry.resetAt < now) {
    // New window
    const resetAt = now + config.windowMs;
    store.set(identifier, { count: 1, resetAt });
    return { success: true, remaining: config.limit - 1, resetAt };
  }

  if (entry.count >= config.limit) {
    return { success: false, remaining: 0, resetAt: entry.resetAt };
  }

  entry.count++;
  return {
    success: true,
    remaining: config.limit - entry.count,
    resetAt: entry.resetAt,
  };
}

/** Preset configurations */
export const RATE_LIMITS = {
  /** API endpoints: 60 req/min */
  api: { limit: 60, windowMs: 60_000 },
  /** Auth endpoints: 10 req/min (brute force protection) */
  auth: { limit: 10, windowMs: 60_000 },
  /** Contact form: 3 req/min (spam protection) */
  contact: { limit: 3, windowMs: 60_000 },
  /** MCP tools: 30 req/min */
  mcp: { limit: 30, windowMs: 60_000 },
  /** Webhooks: 100 req/min */
  webhook: { limit: 100, windowMs: 60_000 },
} as const;
