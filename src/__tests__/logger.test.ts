import { describe, it, expect, vi, beforeEach } from "vitest";
import { logger } from "@/lib/logger";

describe("Structured Logger", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("logger.info calls console.info", () => {
    const spy = vi.spyOn(console, "info").mockImplementation(() => {});
    logger.info("test message");
    expect(spy).toHaveBeenCalledOnce();
    expect(spy.mock.calls[0][0]).toContain("test message");
  });

  it("logger.warn calls console.warn", () => {
    const spy = vi.spyOn(console, "warn").mockImplementation(() => {});
    logger.warn("warning test");
    expect(spy).toHaveBeenCalledOnce();
    expect(spy.mock.calls[0][0]).toContain("warning test");
  });

  it("logger.error calls console.error", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    logger.error("error test");
    expect(spy).toHaveBeenCalledOnce();
    expect(spy.mock.calls[0][0]).toContain("error test");
  });

  it("logger.fatal calls console.error", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    logger.fatal("fatal test");
    expect(spy).toHaveBeenCalledOnce();
    expect(spy.mock.calls[0][0]).toContain("fatal test");
  });

  it("includes metadata in log output", () => {
    const spy = vi.spyOn(console, "info").mockImplementation(() => {});
    logger.info("user login", { userId: "abc-123", role: "admin" });
    expect(spy).toHaveBeenCalledOnce();
    const output = spy.mock.calls[0][0] as string;
    expect(output).toContain("user login");
    expect(output).toContain("abc-123");
  });

  it("includes timestamp in output", () => {
    const spy = vi.spyOn(console, "info").mockImplementation(() => {});
    logger.info("time check");
    const output = spy.mock.calls[0][0] as string;
    // Should have ISO date format
    expect(output).toMatch(/\d{4}-\d{2}-\d{2}/);
  });

  it("includes service name", () => {
    const spy = vi.spyOn(console, "info").mockImplementation(() => {});
    logger.info("service check");
    const output = spy.mock.calls[0][0] as string;
    expect(output).toContain("atlas-platform");
  });

  it("child logger includes preset context", () => {
    const spy = vi.spyOn(console, "info").mockImplementation(() => {});
    const childLog = logger.child({ module: "orders", requestId: "req-1" });
    childLog.info("order created");
    const output = spy.mock.calls[0][0] as string;
    expect(output).toContain("order created");
    expect(output).toContain("orders");
    expect(output).toContain("req-1");
  });

  it("child logger merges additional metadata", () => {
    const spy = vi.spyOn(console, "warn").mockImplementation(() => {});
    const childLog = logger.child({ module: "auth" });
    childLog.warn("login failed", { ip: "1.2.3.4" });
    const output = spy.mock.calls[0][0] as string;
    expect(output).toContain("auth");
    expect(output).toContain("1.2.3.4");
  });
});
