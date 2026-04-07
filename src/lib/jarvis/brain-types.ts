/**
 * ─── Jarvis Brain Types ───
 *
 * Self-report, trace, memory, health, gap-report types
 * used by the JarvisCoreAdapter and the living brain subsystems.
 */

import type {
  JarvisRunId,
  JarvisConversationId,
  JarvisMemoryLayer,
  JarvisProviderLane,
  JarvisHealthStatus,
  JarvisSeverity,
  JarvisBackgroundTaskType,
  JarvisActionRisk,
  HqttPhysiologySignal,
  HqttResidencyMetric,
} from "./contracts";

// ──────────────────────────────────────
// Health Snapshot
// ──────────────────────────────────────

export interface JarvisToolStatus {
  id: string;
  name: string;
  status: JarvisHealthStatus;
  lastCheck: string;
  successRate: number;
  avgLatencyMs: number;
}

export interface JarvisHealthSnapshot {
  status: JarvisHealthStatus;
  uptimeSeconds: number;
  hqttConnected: boolean;
  hqttStubMode: boolean;
  hqttLatencyMs: number | null;
  activeProvider: JarvisProviderLane;
  fallbackProvider: JarvisProviderLane;
  tools: JarvisToolStatus[];
  lastObserverRun: string | null;
  lastSelfReportAt: string;
  memoryStats: {
    threadMessages: number;
    userFacts: number;
    episodes: number;
    procedures: number;
  };
}

// ──────────────────────────────────────
// Self-Report
// ──────────────────────────────────────

export interface JarvisFailureMotif {
  pattern: string;
  count: number;
  lastSeen: string;
  affectedRoutes: string[];
}

export interface JarvisSelfReport {
  generatedAt: string;
  health: JarvisHealthSnapshot;
  activeCapabilities: string[];
  disabledTools: string[];
  recentFailures: Array<{
    runId: string;
    error: string;
    timestamp: string;
  }>;
  recurringFailureMotifs: JarvisFailureMotif[];
  confidenceLevel: number; // 0-1
  pendingRepairs: Array<{
    id: string;
    description: string;
    severity: JarvisSeverity;
    proposedAt: string;
  }>;
  learnedNotes: string[];
  brainGrowth: JarvisBrainGrowth | null;
  physiology: Partial<Record<HqttPhysiologySignal, number>> | null;
  residency: Partial<Record<HqttResidencyMetric, number>> | null;
}

export interface JarvisBrainGrowth {
  semanticFieldCount: number;
  worldSchemaFieldCount: number;
  failureMotifCount: number;
  invariantMotifCount: number;
  replayTargetCount: number;
  antiPatternCount: number;
  selfHealRuleCount: number;
  consolidationPriorityCount: number;
  specialistRoleCount: number;
  healthSignalCount: number;
}

// ──────────────────────────────────────
// Gap Report
// ──────────────────────────────────────

export interface JarvisGapItem {
  id: string;
  category: JarvisBackgroundTaskType;
  severity: JarvisSeverity;
  title: string;
  description: string;
  location?: string;
  suggestedAction?: string;
  detectedAt: string;
}

export interface JarvisGapReport {
  generatedAt: string;
  runId: JarvisRunId;
  unauditedSurfaces: string[];
  failingTests: JarvisGapItem[];
  degradedTools: JarvisGapItem[];
  memoryGaps: JarvisGapItem[];
  performanceRegressions: JarvisGapItem[];
  codeQualityIssues: JarvisGapItem[];
  accessibilityIssues: JarvisGapItem[];
  securityFindings: JarvisGapItem[];
  suggestedImprovements: JarvisGapItem[];
  totalGapCount: number;
}

// ──────────────────────────────────────
// Trace Record
// ──────────────────────────────────────

export interface JarvisTraceToolCall {
  toolName: string;
  input: Record<string, unknown>;
  output?: Record<string, unknown>;
  durationMs: number;
  success: boolean;
}

export interface JarvisTraceRecord {
  id: string;
  runId: JarvisRunId;
  conversationId?: JarvisConversationId;
  traceType: "command" | "observation" | "reflection" | "autofix" | "background_scan";
  input: string;
  provider: JarvisProviderLane;
  model: string;
  toolCalls: JarvisTraceToolCall[];
  approvalDecisions: Array<{
    approvalId: string;
    decision: "approved" | "rejected";
    actor: string;
  }>;
  artifacts: string[];
  failures: string[];
  fallbackPath?: string;
  selfReportSnapshot?: JarvisSelfReport;
  startTime: string;
  endTime: string;
  durationMs: number;
}

// ──────────────────────────────────────
// Memory Envelope
// ──────────────────────────────────────

export interface JarvisMemoryEnvelope {
  id: string;
  layer: JarvisMemoryLayer;
  key: string;
  value: string;
  metadata: Record<string, unknown>;
  confidence: number;
  source: string;
  createdAt: string;
  updatedAt: string;
  expiresAt?: string;
}

// ──────────────────────────────────────
// Reflection
// ──────────────────────────────────────

export interface JarvisReflectionResult {
  runId: JarvisRunId;
  patterns: Array<{
    pattern: string;
    frequency: number;
    rootCause?: string;
    relatedFindingIds: string[];
  }>;
  priorities: Array<{
    findingId: string;
    impact: number;
    confidence: number;
    effort: number;
    score: number;
    suggestedAction: string;
    risk: JarvisActionRisk;
  }>;
  summary: string;
  generatedAt: string;
}

// ──────────────────────────────────────
// Background Loop State
// ──────────────────────────────────────

export interface JarvisBackgroundLoopState {
  running: boolean;
  currentTask: JarvisBackgroundTaskType | null;
  lastCycleAt: string | null;
  cycleCount: number;
  queuedTasks: JarvisBackgroundTaskType[];
  idleSince: string | null;
  findingsThisCycle: number;
}
