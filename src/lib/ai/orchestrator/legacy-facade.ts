export type LegacyFacadeSource = "chat" | "autonomous" | "react" | "workflows" | "copilot";
export type LegacyFacadeTransport = "json" | "sse";

export const UNIFIED_ORCHESTRATOR_ENGINE_ID = "atlas-unified-orchestrator";
export const UNIFIED_ORCHESTRATOR_ENGINE_LABEL = "Unified Orchestrator";

export type LegacyFacadeDescriptor = {
  id: string;
  label: string;
  source: `${LegacyFacadeSource}-facade`;
  transport: LegacyFacadeTransport;
  legacyFacade: true;
  executionPath: "unified-run";
};

export function getLegacyFacadeDescriptor(
  source: LegacyFacadeSource,
  transport: LegacyFacadeTransport = "json",
): LegacyFacadeDescriptor {
  return {
    id: UNIFIED_ORCHESTRATOR_ENGINE_ID,
    label: UNIFIED_ORCHESTRATOR_ENGINE_LABEL,
    source: `${source}-facade`,
    transport,
    legacyFacade: true,
    executionPath: "unified-run",
  };
}

export function buildLegacySseHeaders(source: LegacyFacadeSource) {
  const descriptor = getLegacyFacadeDescriptor(source, "sse");
  return {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache, no-store, must-revalidate",
    Connection: "keep-alive",
    "X-Atlas-AI": descriptor.id,
    "X-Atlas-Source": descriptor.source,
    "X-Atlas-Execution-Path": descriptor.executionPath,
  } as const;
}

export function decorateLegacyJsonPayload<T extends Record<string, unknown>>(
  source: LegacyFacadeSource,
  payload: T,
) {
  const descriptor = getLegacyFacadeDescriptor(source, "json");
  return {
    ...payload,
    engine: descriptor.id,
    engineInfo: descriptor,
    executionPath: descriptor.executionPath,
  };
}
