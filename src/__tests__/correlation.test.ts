import { describe, it, expect } from "vitest";
import {
  generateRequestId,
  getRequestId,
  REQUEST_ID_HEADER,
} from "@/lib/correlation";

describe("Correlation — Request ID", () => {
  describe("generateRequestId", () => {
    it("returns a non-empty string", () => {
      const id = generateRequestId();
      expect(id).toBeTruthy();
      expect(typeof id).toBe("string");
    });

    it("generates unique IDs", () => {
      const ids = new Set(Array.from({ length: 100 }, () => generateRequestId()));
      expect(ids.size).toBe(100);
    });

    it("returns UUID format when crypto.randomUUID available", () => {
      const id = generateRequestId();
      // UUID v4 format: xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx
      expect(id).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
      );
    });
  });

  describe("getRequestId", () => {
    function makeRequest(headers: Record<string, string> = {}): Request {
      return new Request("https://example.com", {
        headers: new Headers(headers),
      });
    }

    it("returns x-request-id header when present", () => {
      const req = makeRequest({ "x-request-id": "req-abc-123" });
      expect(getRequestId(req)).toBe("req-abc-123");
    });

    it("returns x-correlation-id as fallback", () => {
      const req = makeRequest({ "x-correlation-id": "corr-xyz" });
      expect(getRequestId(req)).toBe("corr-xyz");
    });

    it("returns x-trace-id as second fallback", () => {
      const req = makeRequest({ "x-trace-id": "trace-999" });
      expect(getRequestId(req)).toBe("trace-999");
    });

    it("prefers x-request-id over others", () => {
      const req = makeRequest({
        "x-request-id": "preferred",
        "x-correlation-id": "fallback",
        "x-trace-id": "last",
      });
      expect(getRequestId(req)).toBe("preferred");
    });

    it("generates a new ID when no header is present", () => {
      const req = makeRequest();
      const id = getRequestId(req);
      expect(id).toBeTruthy();
      expect(id.length).toBeGreaterThan(10);
    });
  });

  describe("REQUEST_ID_HEADER", () => {
    it("is x-request-id", () => {
      expect(REQUEST_ID_HEADER).toBe("x-request-id");
    });
  });
});
