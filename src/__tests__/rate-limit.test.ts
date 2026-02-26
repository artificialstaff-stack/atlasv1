import { describe, it, expect, beforeEach, vi } from "vitest";
import { rateLimit, RATE_LIMITS } from "@/lib/rate-limit";

describe("Rate Limiter", () => {
  beforeEach(() => {
    // Reset time mocking between tests
    vi.useRealTimers();
  });

  it("allows requests within limit", () => {
    const result = rateLimit("test-user-1", { limit: 5, windowMs: 60_000 });
    expect(result.success).toBe(true);
    expect(result.remaining).toBe(4);
  });

  it("tracks remaining count across calls", () => {
    const id = "test-user-count-" + Date.now();
    const config = { limit: 3, windowMs: 60_000 };

    const r1 = rateLimit(id, config);
    expect(r1.remaining).toBe(2);

    const r2 = rateLimit(id, config);
    expect(r2.remaining).toBe(1);

    const r3 = rateLimit(id, config);
    expect(r3.remaining).toBe(0);
  });

  it("blocks requests exceeding limit", () => {
    const id = "test-block-" + Date.now();
    const config = { limit: 2, windowMs: 60_000 };

    rateLimit(id, config);
    rateLimit(id, config);
    const blocked = rateLimit(id, config);

    expect(blocked.success).toBe(false);
    expect(blocked.remaining).toBe(0);
  });

  it("resets after window expires", () => {
    vi.useFakeTimers();
    const id = "test-window-" + Date.now();
    const config = { limit: 1, windowMs: 1000 };

    const r1 = rateLimit(id, config);
    expect(r1.success).toBe(true);

    const r2 = rateLimit(id, config);
    expect(r2.success).toBe(false);

    // Advance time past window
    vi.advanceTimersByTime(1100);

    const r3 = rateLimit(id, config);
    expect(r3.success).toBe(true);
  });

  it("provides resetAt timestamp", () => {
    const id = "test-reset-" + Date.now();
    const result = rateLimit(id, { limit: 10, windowMs: 30_000 });

    expect(result.resetAt).toBeGreaterThan(Date.now() - 1000);
    expect(result.resetAt).toBeLessThanOrEqual(Date.now() + 30_000);
  });

  it("different identifiers have separate limits", () => {
    const config = { limit: 1, windowMs: 60_000 };
    const id1 = "user-a-" + Date.now();
    const id2 = "user-b-" + Date.now();

    const r1 = rateLimit(id1, config);
    const r2 = rateLimit(id2, config);

    expect(r1.success).toBe(true);
    expect(r2.success).toBe(true);

    // id1 is now blocked but id2 is also blocked (1 req each)
    expect(rateLimit(id1, config).success).toBe(false);
    expect(rateLimit(id2, config).success).toBe(false);
  });

  it("RATE_LIMITS presets are properly configured", () => {
    expect(RATE_LIMITS.api.limit).toBe(60);
    expect(RATE_LIMITS.auth.limit).toBe(10);
    expect(RATE_LIMITS.contact.limit).toBe(3);
    expect(RATE_LIMITS.mcp.limit).toBe(30);
    expect(RATE_LIMITS.webhook.limit).toBe(100);
  });

  it("all presets have windowMs", () => {
    for (const [, config] of Object.entries(RATE_LIMITS)) {
      expect(config.windowMs).toBeGreaterThan(0);
    }
  });
});
