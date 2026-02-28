// ─── Atlas Autonomous AI — Public API ────────────────────────────────────────
// Re-exports all autonomous system modules.
// ─────────────────────────────────────────────────────────────────────────────

// Types
export type {
  AutonomousCommand,
  MasterPlan,
  Phase,
  AgentTask,
  SubAgentType,
  AutonomyLevel,
  PlanStatus,
  PhaseStatus,
  TaskStatus,
  GeneratedContent,
  ContentType,
  ContentStatus,
  SocialChannel,
  ContentMetadata,
  QualityScore,
  ApprovalRequest,
  ApprovalType,
  ProactiveAlert,
  AlertType,
  WorkflowTemplate,
  WorkflowTrigger,
  WorkflowStep,
  AutonomousSSEType,
} from "./types";

// Orchestrator (main entry point)
export {
  runAutonomousPipeline,
  getActivePlans,
  getPlan,
} from "./orchestrator";

// Planner
export { createMasterPlan, analyzeCommandPreview } from "./planner";

// Sub-agents
export {
  executeSubAgent,
  getAgentName,
  getAgentEmoji,
  getAvailableAgents,
} from "./sub-agents";

// Approval system
export {
  createApproval,
  resolveApproval,
  getPendingApprovals,
  getAllApprovals,
  getApproval,
  getApprovalsByPlan,
  getApprovalStats,
  clearExpiredApprovals,
} from "./approval";

// Content pipeline
export {
  generateContent,
  scoreContentQuality,
  adaptContentForChannel,
  getContent,
  getAllContent,
  getContentByStatus,
  updateContentStatus,
  getContentStats,
} from "./content-pipeline";

// Proactive intelligence
export {
  runProactiveCheck,
  getActiveAlerts,
  getAllAlerts,
  acknowledgeAlert,
  resolveAlert,
  dismissAlert,
  getAlertStats,
  shouldRunCheck,
} from "./proactive";

// Workflow engine
export {
  createWorkflowFromNL,
  getWorkflow,
  getAllWorkflows,
  getActiveWorkflows,
  toggleWorkflow,
  deleteWorkflow,
  incrementWorkflowRun,
  createPredefinedWorkflows,
  getWorkflowStats,
} from "./workflow-engine";
