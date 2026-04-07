export type CopilotMode = "chat" | "autonomous" | "agent";

export type CopilotScopeType = "global" | "customer" | "company" | "marketplace";

export interface CopilotScope {
  type: CopilotScopeType;
  refId?: string | null;
  label?: string | null;
}

export type CopilotOperatorSurface = "admin" | "portal" | "external";

export type CopilotOperatorJobStatus =
  | "pending"
  | "approved"
  | "paused"
  | "taken_over"
  | "rejected"
  | "failed"
  | "completed";

export type CopilotOperatorCompanionStatus = "online" | "busy" | "offline";

export type WorkerTarget =
  | "database"
  | "application"
  | "browser_local"
  | "browser_remote"
  | "llm";

export interface CopilotRunRecord {
  id: string;
  sessionId: string;
  requesterUserId: string;
  mode: CopilotMode;
  scopeType: CopilotScopeType;
  scopeRefId?: string | null;
  commandText: string;
  toolInput: Record<string, unknown>;
  status: "running" | "awaiting_approval" | "completed" | "failed" | "rejected";
  requiresApproval: boolean;
  summary?: string | null;
  responseText?: string | null;
  metadata: Record<string, unknown>;
  createdAt: string;
  completedAt?: string | null;
}

export interface CopilotOperatorJobRecord {
  id: string;
  runId: string;
  sessionId: string;
  conversationId?: string | null;
  requesterUserId: string;
  scopeType: CopilotScopeType;
  scopeRefId?: string | null;
  surface: CopilotOperatorSurface;
  workerTarget: WorkerTarget;
  title: string;
  description: string;
  commandText: string;
  target: string;
  status: CopilotOperatorJobStatus;
  allowlisted: boolean;
  allowlistRuleId?: string | null;
  signature: string;
  createdAt: string;
  updatedAt: string;
  decidedAt?: string | null;
  decidedBy?: string | null;
  decisionNote?: string | null;
  metadata: Record<string, unknown>;
}

export interface CopilotOperatorAllowlistRule {
  id: string;
  label: string;
  description: string;
  pattern: string;
  kind: "path_prefix" | "hostname";
}

export interface CopilotOperatorCompanionRecord {
  id: string;
  label: string;
  platform?: string | null;
  version?: string | null;
  capabilities: string[];
  status: CopilotOperatorCompanionStatus;
  claimedJobId?: string | null;
  claimedRunId?: string | null;
  lastHeartbeatAt: string;
  metadata: Record<string, unknown>;
}
