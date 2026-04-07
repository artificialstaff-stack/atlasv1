export type AtlasSurfaceKind = "page_only" | "drawer_safe" | "modal_safe" | "inline_panel";

export type AtlasObservationKind =
  | "layout_break"
  | "modal_surface_violation"
  | "copy_conflict"
  | "state_transition_mismatch"
  | "cta_context_loss"
  | "empty_surface"
  | "widget_hierarchy_gap"
  | "console_or_performance_regression";

export type AtlasObservationSeverity = "p0" | "p1" | "p2";

export type AtlasObservationStatus =
  | "observed"
  | "triaged"
  | "fixed_branch"
  | "verified"
  | "rejected";

export type AtlasAutofixRisk = "auto-safe" | "review-required" | "operator-only" | "blocked";
export type AtlasAutofixStatus = "draft" | "prepared" | "verified" | "rejected";

export interface AtlasSurfaceContract {
  id: string;
  route: string;
  title: string;
  owner: "customer" | "admin" | "marketing" | "shared";
  surfaceKind: AtlasSurfaceKind;
  primaryJourney: string;
  stateSource: string;
  allowedEntryPoints: string[];
  auditPath?: string | null;
  auditEnabled?: boolean;
  targetFiles: string[];
  tags: string[];
}

export interface AtlasObservationArtifact {
  kind: "screenshot" | "trace" | "aria" | "console" | "report";
  path?: string | null;
  detail?: string | null;
}

export interface AtlasObservationFinding {
  id: string;
  runId: string;
  route: string;
  surfaceId?: string | null;
  persona: "customer" | "admin" | "public";
  kind: AtlasObservationKind;
  severity: AtlasObservationSeverity;
  confidence: number;
  title: string;
  summary: string;
  whyItMatters: string;
  suggestedFix: string;
  duplicateSignature: string;
  status: AtlasObservationStatus;
  riskLevel: AtlasAutofixRisk;
  targetFiles: string[];
  artifacts: AtlasObservationArtifact[];
  source: "playwright_audit" | "demo_backlog" | "manual_rule" | "console";
  createdAt: string;
  updatedAt: string;
}

export interface AtlasObservationRun {
  id: string;
  startedAt: string;
  completedAt?: string | null;
  status: "running" | "completed" | "failed";
  source: "manual" | "overnight";
  provider: string;
  model: string;
  journeys: string[];
  findingIds: string[];
  summary: string;
  error?: string | null;
}

export interface AtlasObservationDecision {
  id: string;
  findingId: string;
  actor: "jarvis" | "admin";
  action: "triaged" | "prepared_branch" | "verified" | "rejected";
  note?: string | null;
  createdAt: string;
}

export interface AtlasAutofixProposal {
  id: string;
  findingId: string;
  branchName: string;
  worktreePath: string;
  status: AtlasAutofixStatus;
  riskLevel: AtlasAutofixRisk;
  summary: string;
  targetFiles: string[];
  verificationSuite: string[];
  createdAt: string;
  preparedAt?: string | null;
  verifiedAt?: string | null;
  rejectedAt?: string | null;
  lastNote?: string | null;
}

export interface AtlasMorningBrief {
  id: string;
  createdAt: string;
  headline: string;
  summary: string;
  topFindings: string[];
  proposedActions: string[];
  stats: {
    journeysRun: number;
    p0: number;
    p1: number;
    p2: number;
    proposals: number;
  };
}

export interface AtlasJarvisDashboard {
  surfaces: AtlasSurfaceContract[];
  recentRuns: AtlasObservationRun[];
  activeFindings: AtlasObservationFinding[];
  proposals: AtlasAutofixProposal[];
  latestBrief: AtlasMorningBrief | null;
  provider: {
    lane: string;
    model: string;
    fallback: string;
    hqttEnabled: boolean;
  };
}

export interface AtlasJarvisStoreShape {
  recentRuns: AtlasObservationRun[];
  activeFindings: AtlasObservationFinding[];
  proposals: AtlasAutofixProposal[];
  briefs: AtlasMorningBrief[];
  decisions: AtlasObservationDecision[];
}
