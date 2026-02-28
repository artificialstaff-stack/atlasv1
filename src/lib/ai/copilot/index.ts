// ─── Atlas Copilot — Public API (v3 — Manus AI-level) ───────────────────────

// Core engine
export { runCopilotPipeline, getSystemInfo } from "./engine";

// Intent & Planning
export { analyzeIntent, getPrimaryAgent, getSupportingAgents } from "./intent";
export { createQueryPlan, getAgentLabel, getAgentIcon } from "./planner";

// Data
export { fetchDomainData } from "./data-queries";

// Prompts
export { buildSystemPrompt, buildThinkingPrompt, getExpertPrompt } from "./prompts";

// Memory (Manus-level)
export { buildMemoryContext, extractEntities, persistMessage, summarizeConversation } from "./memory";
export type { MemoryContext, EntityFact } from "./memory";

// Actions (Manus-level)
export { detectActions, executeAction, formatActionResults } from "./actions";
export type { ActionRequest, ActionResult, ActionType } from "./actions";

// Deep Analysis (Manus-level)
export { runDeepAnalysis, formatAnalysisForPrompt } from "./deep-analysis";
export type { DeepAnalysisResult, TrendAnalysis, AnomalyFlag, HealthScore } from "./deep-analysis";

// Artifacts (Manus-level)
export {
  generateExecutiveSummary,
  generateDataTable,
  generateChecklist,
  detectArtifactRequest,
} from "./artifacts";
export type { Artifact, ArtifactType } from "./artifacts";

// Task Decomposition (Manus-level)
export { decomposeTask } from "./task-decomposer";
export type { SubTask, TaskPlan } from "./task-decomposer";

// Types
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
