/**
 * ─── Atlas AI Katmanı — Barrel Export ───
 * 
 * Kullanım:
 *   import { agentConfig, createAgentSession, atlasMCPServerConfig } from "@/lib/ai";
 *   import { routeToAgent, createAllAgentTools } from "@/lib/ai";
 *   import { predictStockDepletion, generateStockRecommendations } from "@/lib/ai";
 */

// Ajan tipleri & konfigürasyon
export type {
  AgentActionType,
  AgentConfidenceLevel,
  AgentAction as AgentActionLegacy,
  AgentActionResult,
  AgentMessage as AgentMessageLegacy,
  AgentSession,
  MCPToolType,
  MCPTool,
  MCPServerConfig,
  GatekeeperRule,
  GatekeeperVerdict,
} from "./agent-types";

export { agentConfig, defaultGatekeeperRules } from "./agent-types";

// MCP konfigürasyonu
export {
  atlasMCPServerConfig,
  findMCPTool,
  getMCPToolsByType,
  canCallTool,
} from "./mcp-config";

// MCP handlers — server-only, import directly:
//   import { MCP_TOOLS, handleToolCall } from "@/lib/ai/mcp-handlers";

// AG-UI runtime
export type { AGUIEventType, AGUIEvent } from "./ag-ui-runtime";

export {
  createAgentAction,
  createAgentMessage,
  createAgentSession,
  runGatekeeper,
  addMessageToSession,
  addActionToSession,
  resolveAction,
  createAGUIEvent,
  buildAgentContext,
} from "./ag-ui-runtime";

// Multi-Agent System (agents/) — types & pure functions only
// Server-only tool creators: import directly from "@/lib/ai/agents"
export type {
  AgentRole,
  AutonomyLevel,
  AgentMessage,
  AgentAction,
  AgentTool,
} from "./agents/types";

export {
  AUTONOMY_LABELS,
  ACTION_RISK_LEVELS,
} from "./agents/types";

export {
  ORCHESTRATOR_SYSTEM_PROMPT,
  routeToAgent,
  mergeAgentResults,
} from "./agents/orchestrator";

// Anticipatory Intelligence
export type { UserRoutine, Recommendation, RecommendationType } from "./anticipatory";

export {
  predictStockDepletion,
  estimateProcessCompletion,
  generateStockRecommendations,
  generateTaskReminders,
  shouldNotifyNow,
  generateCostSavingTips,
} from "./anticipatory";

export {
  getActiveAiProvider,
  getModelRoutingInfo,
} from "./client";

export { runActionModelTask } from "./autonomous/action-model";
export { createAtlasOpsBenchmarkSuite } from "./benchmarks/atlas-ops";
export {
  getBenchmarkSuites,
  getReadyBenchmarkSuites,
  getBenchmarkSuiteById,
  summarizeBenchmarkSuites,
} from "./benchmarks/registry";
export {
  listRecentBenchmarkRuns,
  persistBenchmarkResult,
} from "./benchmarks/history";
export { runBenchmarkSuite, summarizeBenchmarkSuite } from "./benchmarks/runner";
export { evaluateBenchmarkHistory } from "./benchmarks/evaluation";
export type {
  BenchmarkTask,
  BenchmarkSuite,
  BenchmarkSuiteSummary,
  BenchmarkSuiteResult,
  BenchmarkTaskResult,
  BenchmarkRunHistoryItem,
  BenchmarkRunEvaluation,
  BenchmarkReleaseGate,
  BenchmarkGateStatus,
  ActionModelRunResult,
  ActionVerificationResult,
  BenchmarkMetaResponse,
} from "./benchmarks/types";
