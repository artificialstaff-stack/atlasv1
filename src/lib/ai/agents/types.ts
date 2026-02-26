/**
 * Agent Types — Shared types for the multi-agent system
 */

export type AgentRole = "orchestrator" | "compliance" | "logistics" | "auditor";

export type AutonomyLevel = 0 | 1 | 2 | 3;

export interface AgentMessage {
  role: "user" | "agent" | "system";
  content: string;
  agentRole?: AgentRole;
  timestamp: string;
  metadata?: Record<string, unknown>;
}

export interface AgentAction {
  id: string;
  agentRole: AgentRole;
  actionType: string;
  description: string;
  status: "pending" | "approved" | "rejected" | "executed";
  requiresApproval: boolean;
  payload: Record<string, unknown>;
  result?: Record<string, unknown>;
  createdAt: string;
  executedAt?: string;
}

export interface AgentTool {
  name: string;
  description: string;
  agentRole: AgentRole;
  riskLevel: AutonomyLevel;
  handler: (params: Record<string, unknown>) => Promise<unknown>;
}

export const AUTONOMY_LABELS: Record<AutonomyLevel, string> = {
  0: "Salt Okunur — Sadece bilgi sorgulama",
  1: "Öneri — Aksiyon önerir, kullanıcı onaylar",
  2: "Otomatik + Bildirim — Düşük riskli aksiyonları otomatik yapar",
  3: "Tam Otonom — Tüm aksiyonları bağımsız yürütür",
};

export const ACTION_RISK_LEVELS: Record<string, AutonomyLevel> = {
  "query:products": 0,
  "query:orders": 0,
  "query:tasks": 0,
  "query:documents": 0,
  "query:tickets": 0,
  "create:ticket": 1,
  "update:ticket": 1,
  "suggest:optimization": 1,
  "update:task_status": 2,
  "notify:low_stock": 2,
  "generate:report": 2,
  "create:order": 3,
  "update:order": 3,
  "modify:inventory": 3,
  "execute:bulk_action": 3,
};

export const AGENT_SYSTEM_PROMPTS: Record<AgentRole, string> = {
  orchestrator: "", // Defined in orchestrator.ts
  compliance: "",   // Defined in compliance-agent.ts
  logistics: "",    // Defined in logistics-agent.ts
  auditor: "",      // Defined in auditor-agent.ts
};
