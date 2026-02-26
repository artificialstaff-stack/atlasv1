/**
 * Multi-Agent System — Barrel Export
 *
 * Atlas 4-Agent Architecture:
 *   Orchestrator → routes to specialists
 *   Compliance → LLC, EIN, tax, customs
 *   Logistics → inventory, shipping, warehouse
 *   Auditor → audit trail, risk scoring, security
 */

// Types
export type {
  AgentRole,
  AutonomyLevel,
  AgentMessage,
  AgentAction,
  AgentTool,
} from "./types";

export {
  AUTONOMY_LABELS,
  ACTION_RISK_LEVELS,
  AGENT_SYSTEM_PROMPTS,
} from "./types";

// Orchestrator
export {
  ORCHESTRATOR_SYSTEM_PROMPT,
  routeToAgent,
  mergeAgentResults,
} from "./orchestrator";

// Compliance
export {
  COMPLIANCE_SYSTEM_PROMPT,
  createComplianceTools,
} from "./compliance-agent";

// Logistics
export {
  LOGISTICS_SYSTEM_PROMPT,
  createLogisticsTools,
} from "./logistics-agent";

// Auditor
export {
  AUDITOR_SYSTEM_PROMPT,
  createAuditorTools,
  calculateRiskScore,
} from "./auditor-agent";

// ─── Factory: tüm ajan tool'larını topla ───

import { createComplianceTools } from "./compliance-agent";
import { createLogisticsTools } from "./logistics-agent";
import { createAuditorTools } from "./auditor-agent";
import type { AgentTool } from "./types";

/**
 * Tüm ajanların tool'larını bir araya getir
 */
export async function createAllAgentTools(userId: string): Promise<AgentTool[]> {
  const [compliance, logistics, auditor] = await Promise.all([
    createComplianceTools(userId),
    createLogisticsTools(userId),
    createAuditorTools(userId),
  ]);

  return [...compliance, ...logistics, ...auditor];
}
