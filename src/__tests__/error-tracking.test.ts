import { describe, it, expect, vi, beforeEach } from "vitest";
import { captureError, captureMessage, setUser } from "@/lib/error-tracking";
import { logger } from "@/lib/logger";

// Mock logger
vi.mock("@/lib/logger", () => ({
  logger: {
    error: vi.fn(),
    warn: vi.fn(),
    info: vi.fn(),
  },
}));

describe("Error Tracking", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("captureError", () => {
    it("logs Error instances with stack trace", () => {
      const error = new Error("test error");
      captureError(error, { context: "test" });

      expect(logger.error).toHaveBeenCalledWith(
        "test error",
        expect.objectContaining({
          context: "test",
          stack: expect.any(String),
          name: "Error",
        })
      );
    });

    it("converts non-Error values to Error", () => {
      captureError("string error");

      expect(logger.error).toHaveBeenCalledWith(
        "string error",
        expect.objectContaining({ name: "Error" })
      );
    });

    it("includes custom context metadata", () => {
      captureError(new Error("fail"), {
        context: "order-creation",
        userId: "usr_123",
        requestId: "req_abc",
      });

      expect(logger.error).toHaveBeenCalledWith(
        "fail",
        expect.objectContaining({
          context: "order-creation",
          userId: "usr_123",
          requestId: "req_abc",
        })
      );
    });

    it("works without context", () => {
      captureError(new Error("no context"));
      expect(logger.error).toHaveBeenCalledTimes(1);
    });
  });

  describe("captureMessage", () => {
    it("logs info messages via logger.info", () => {
      captureMessage("test info", "info", { context: "test" });
      expect(logger.info).toHaveBeenCalledWith(
        "test info",
        expect.objectContaining({ context: "test" })
      );
    });

    it("logs warning messages via logger.warn", () => {
      captureMessage("test warning", "warning");
      expect(logger.warn).toHaveBeenCalledWith("test warning", undefined);
    });

    it("defaults to info level", () => {
      captureMessage("default level");
      expect(logger.info).toHaveBeenCalled();
      expect(logger.warn).not.toHaveBeenCalled();
    });
  });

  describe("setUser", () => {
    it("logs user context when user is provided", () => {
      setUser({ id: "usr_123", email: "test@test.com", role: "admin" });
      expect(logger.info).toHaveBeenCalledWith(
        "User context set",
        expect.objectContaining({ userId: "usr_123", role: "admin" })
      );
    });

    it("does not log when user is null", () => {
      setUser(null);
      expect(logger.info).not.toHaveBeenCalled();
    });
  });
});
