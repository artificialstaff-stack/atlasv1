import { describe, expect, it } from "vitest";
import {
  UNIFIED_ORCHESTRATOR_ENGINE_ID,
  buildLegacySseHeaders,
  decorateLegacyJsonPayload,
  getLegacyFacadeDescriptor,
} from "@/lib/ai/orchestrator/legacy-facade";

describe("ai orchestrator legacy facade", () => {
  it("builds a consistent facade descriptor for every legacy source", () => {
    const descriptor = getLegacyFacadeDescriptor("chat", "sse");

    expect(descriptor.id).toBe(UNIFIED_ORCHESTRATOR_ENGINE_ID);
    expect(descriptor.source).toBe("chat-facade");
    expect(descriptor.transport).toBe("sse");
    expect(descriptor.legacyFacade).toBe(true);
    expect(descriptor.executionPath).toBe("unified-run");
  });

  it("returns the unified SSE headers for legacy streaming routes", () => {
    const headers = buildLegacySseHeaders("react");

    expect(headers["Content-Type"]).toBe("text/event-stream");
    expect(headers["X-Atlas-AI"]).toBe(UNIFIED_ORCHESTRATOR_ENGINE_ID);
    expect(headers["X-Atlas-Source"]).toBe("react-facade");
    expect(headers["X-Atlas-Execution-Path"]).toBe("unified-run");
  });

  it("decorates JSON payloads with engine and execution metadata", () => {
    const payload = decorateLegacyJsonPayload("workflows", { success: true });

    expect(payload.success).toBe(true);
    expect(payload.engine).toBe(UNIFIED_ORCHESTRATOR_ENGINE_ID);
    expect(payload.engineInfo.source).toBe("workflows-facade");
    expect(payload.executionPath).toBe("unified-run");
  });
});
