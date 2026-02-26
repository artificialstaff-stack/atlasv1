/**
 * ─── Atlas AI Katmanı — Barrel Export ───
 * 
 * Kullanım:
 *   import { agentConfig, createAgentSession, atlasMCPServerConfig } from "@/lib/ai";
 */

// Ajan tipleri & konfigürasyon
export type {
  AgentActionType,
  AgentConfidenceLevel,
  AgentAction,
  AgentActionResult,
  AgentMessage,
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
