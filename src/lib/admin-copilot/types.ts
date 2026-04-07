export type CopilotMode = "chat" | "autonomous" | "agent";

export type CopilotScopeType = "global" | "customer" | "company" | "marketplace";

export interface CopilotScope {
  type: CopilotScopeType;
  refId?: string | null;
  label?: string | null;
}

export type CopilotSkillDomain =
  | "customer"
  | "catalog"
  | "finance"
  | "operations"
  | "research"
  | "global";

export interface CopilotSkillResource {
  id: string;
  name: string;
  domain: CopilotSkillDomain;
  description: string;
  starter?: string;
  instructions: string;
  toolHints: string[];
}

export interface CopilotProjectContext {
  id: string;
  name: string;
  description: string;
  status: "active" | "template";
  scopeType: CopilotScopeType;
  scopeRefId?: string | null;
  defaultSkillIds: string[];
  instructions: string;
}

export type CommandIntent =
  | "customer.create_account"
  | "customer.update_profile"
  | "customer.get_360"
  | "customer.change_onboarding_status"
  | "company.create_llc"
  | "company.update_status"
  | "marketplace.create_account"
  | "marketplace.update_account"
  | "social.create_account"
  | "advertising.create_campaign_draft"
  | "finance.create_record_draft"
  | "report.generate_customer_report"
  | "artifact.publish_to_customer_portal"
  | "notification.send_to_customer"
  | "task.create_onboarding_tasks"
  | "task.update_process_task"
  | "document.request_or_attach"
  | "system.agent_task"
  | "system.global_summary"
  | "system.unsupported";

export type ApprovalPolicy = "auto" | "required" | "blocked";

export interface ToolPolicy {
  intent: CommandIntent;
  approval: ApprovalPolicy;
  blockedReason?: string;
}

export interface CommandParseResult {
  intent: CommandIntent;
  input: Record<string, unknown>;
  missingFields: string[];
  summary: string;
}

export interface CopilotTimelineStep {
  id: string;
  title: string;
  status: "pending" | "running" | "completed" | "failed" | "awaiting_approval" | "rejected";
  detail?: string;
  payload?: Record<string, unknown>;
  createdAt?: string;
  completedAt?: string | null;
}

export interface CopilotApprovalRecord {
  id: string;
  runId: string;
  title: string;
  description: string;
  status: "pending" | "approved" | "rejected";
  approvalType: "data_mutation" | "content_delivery" | "task_update" | "financial_change";
  toolName: string;
  createdAt: string;
  decidedAt?: string | null;
  decisionNote?: string | null;
  payload: Record<string, unknown>;
}

export interface CopilotArtifactRecord {
  id: string;
  runId: string;
  customerId?: string | null;
  artifactType: "report" | "notification_draft" | "customer_summary" | "document_request";
  title: string;
  content: string;
  status: "draft" | "published" | "archived";
  channel: "internal" | "portal" | "in_app" | "email";
  metadata: Record<string, unknown>;
  createdAt: string;
  publishedAt?: string | null;
}

export interface CopilotDeliveryRecord {
  id: string;
  artifactId: string;
  runId?: string | null;
  customerId?: string | null;
  targetType: "portal" | "notification" | "email" | "internal";
  status: "pending" | "delivered" | "failed";
  targetRef?: string | null;
  metadata: Record<string, unknown>;
  deliveredAt?: string | null;
  createdAt: string;
}

export interface CopilotRunRecord {
  id: string;
  sessionId: string;
  requesterUserId: string;
  mode: CopilotMode;
  scopeType: CopilotScopeType;
  scopeRefId?: string | null;
  commandText: string;
  intent?: string | null;
  toolName?: string | null;
  toolInput: Record<string, unknown>;
  status: "running" | "awaiting_approval" | "completed" | "failed" | "rejected";
  requiresApproval: boolean;
  summary?: string | null;
  responseText?: string | null;
  metadata: Record<string, unknown>;
  createdAt: string;
  completedAt?: string | null;
}

export interface CopilotCommandResponse {
  run: CopilotRunRecord;
  timeline: CopilotTimelineStep[];
  approvals: CopilotApprovalRecord[];
  operatorJobs?: CopilotOperatorJobRecord[];
  artifacts: CopilotArtifactRecord[];
  deliveries: CopilotDeliveryRecord[];
  response: {
    summary: string;
    details?: string;
    affectedRecords?: Array<{ type: string; id: string; label?: string }>;
    nextSuggestions: string[];
    missingFields?: string[];
  };
  customerContext?: Record<string, unknown> | null;
}

export interface ProvisionCustomerInput {
  email: string;
  firstName: string;
  lastName: string;
  companyName: string;
  phone?: string | null;
  planTier?: string;
  autoCreateCompany?: boolean;
  stateOfFormation?: string;
}

export interface CreateCompanyInput {
  userId: string;
  companyName: string;
  companyType?: string;
  stateOfFormation: string;
  status?: string;
  companyEmail?: string | null;
  website?: string | null;
  notes?: string | null;
}

export interface CreateMarketplaceInput {
  userId: string;
  companyId?: string | null;
  platform: string;
  storeName: string;
  storeUrl?: string | null;
  sellerId?: string | null;
  status?: string;
}

export interface CustomerDeliveryTarget {
  customerId: string;
  channel: "portal" | "in_app" | "email";
  artifactId: string;
}

export interface CopilotDashboardData {
  pendingApprovals: CopilotApprovalRecord[];
  recentRuns: CopilotRunRecord[];
  recentArtifacts: CopilotArtifactRecord[];
  customers: Array<{
    id: string;
    label: string;
    email: string;
    onboardingStatus: string;
  }>;
}

export interface CopilotConversationRecord {
  id: string;
  conversationId: string;
  sessionId: string;
  scopeType: CopilotScopeType;
  scopeRefId?: string | null;
  scopeLabel?: string | null;
  title: string;
  preview?: string | null;
  lastCommandText?: string | null;
  lastRunAt: string;
  status: CopilotRunRecord["status"] | "idle";
  runId?: string | null;
  generation: "current" | "legacy";
  projectId?: string | null;
  projectName?: string | null;
  workingGoal?: string | null;
  memorySummary?: string | null;
  memoryFacts: string[];
  handoffNote?: string | null;
  handoffChecklist: string[];
  workspaceStatus: CopilotWorkspaceStatus;
  workspaceOwnerId?: string | null;
  workspaceOwnerLabel?: string | null;
  workspaceOwnerEmail?: string | null;
  workspaceClaimedAt?: string | null;
  ownerIsCurrentAdmin: boolean;
  operatorJobStatus?: CopilotOperatorJobStatus | null;
}

export interface CopilotConversationMemoryRecord {
  conversationId: string;
  sessionId: string;
  title: string;
  scopeType: CopilotScopeType;
  scopeRefId?: string | null;
  scopeLabel?: string | null;
  projectId?: string | null;
  projectName?: string | null;
  workingGoal?: string | null;
  memorySummary?: string | null;
  memoryFacts: string[];
  handoffNote?: string | null;
  handoffChecklist: string[];
  workspaceStatus: CopilotWorkspaceStatus;
  workspaceOwnerId?: string | null;
  workspaceOwnerLabel?: string | null;
  workspaceOwnerEmail?: string | null;
  workspaceClaimedAt?: string | null;
  ownerIsCurrentAdmin: boolean;
  operatorJobStatus?: CopilotOperatorJobStatus | null;
  updatedAt: string;
}

export type ToolRisk = "low" | "medium" | "high";

export type CopilotOperatorSurface = "admin" | "portal" | "external";

export type CopilotWorkspaceStatus = "unclaimed" | "claimed" | "handoff_ready" | "shared";

export type CopilotOperatorJobStatus =
  | "pending"
  | "approved"
  | "paused"
  | "taken_over"
  | "rejected"
  | "failed"
  | "completed";

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

export type CopilotOperatorCompanionStatus = "online" | "busy" | "offline";

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

export type ApprovalClass =
  | "read_only"
  | "data_mutation"
  | "content_delivery"
  | "financial_change"
  | "browser_operator";

export type WorkerTarget =
  | "database"
  | "application"
  | "browser_local"
  | "browser_remote"
  | "llm";

export type ToolSource = "sdk" | "agent";

export type ToolHealthStatus = "unknown" | "healthy" | "degraded" | "unhealthy";

export interface ToolHealthRecord {
  toolId: string;
  status: ToolHealthStatus;
  summary: string;
  checks: string[];
  lastVerifiedAt?: string | null;
}

export interface ToolSpec {
  id: string;
  name: string;
  description: string;
  domain: CopilotSkillDomain;
  source: ToolSource;
  approvalClass: ApprovalClass;
  risk: ToolRisk;
  workerTarget: WorkerTarget;
  enabled: boolean;
  requiredContext: string[];
  inputSchema: string[];
  healthStatus: ToolHealthStatus;
  healthSummary?: string | null;
  healthChecks?: string[];
  lastVerifiedAt?: string | null;
  selectable: boolean;
  selectabilityReason?: string | null;
}

export interface ToolRegistrySummary {
  total: number;
  enabled: number;
  selectable: number;
  pruned: number;
  readOnly: number;
  mutating: number;
  browserTools: number;
  healthy: number;
  degraded: number;
  unhealthy: number;
  unknown: number;
  verifiedAt?: string | null;
  sources: Record<ToolSource, number>;
  domains: Record<CopilotSkillDomain, number>;
}

export type UnifiedRun = CopilotRunRecord;
export type UnifiedRunStep = CopilotTimelineStep;
export type ProjectContext = CopilotProjectContext;
export type SkillResource = CopilotSkillResource;

