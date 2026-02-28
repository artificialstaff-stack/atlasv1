// ─── Atlas Copilot — Public API ──────────────────────────────────────────────
export { runCopilotPipeline, getSystemInfo } from "./engine";
export { analyzeIntent, getPrimaryAgent, getSupportingAgents } from "./intent";
export { createQueryPlan, getAgentLabel, getAgentIcon } from "./planner";
export { fetchDomainData } from "./data-queries";
export { buildSystemPrompt, buildThinkingPrompt, getExpertPrompt } from "./prompts";
export type {
  AgentRole,
  IntentSignal,
  QueryPlan,
  QuerySpec,
  DomainData,
  AssembledContext,
  SSEEvent,
  SSEEventType,
  CopilotMessage,
  PipelineStep,
} from "./types";
