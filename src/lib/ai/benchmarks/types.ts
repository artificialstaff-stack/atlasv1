import type { ReActStep, ToolContext } from "@/lib/ai/autonomous/react-engine";

export type BenchmarkRiskLevel = "safe" | "mutating";
export type BenchmarkMode = "query" | "analysis" | "action";
export type BenchmarkSuiteSource = "atlas_internal" | "gaia" | "osworld" | "webarena" | "tau_bench";
export type BenchmarkSuiteStatus = "ready" | "requires_config";
export type BenchmarkGateStatus = "pass" | "watch" | "blocked";
export type BenchmarkProviderInfo = ReturnType<typeof import("@/lib/ai/client").getModelRoutingInfo>;

export interface BenchmarkTask {
  id: string;
  title: string;
  description: string;
  goal: string;
  context: string;
  successCriteria: string[];
  preferredToolNames?: string[];
  requiredToolNames?: string[];
  expectedKeywords?: string[];
  forbiddenKeywords?: string[];
  minimumSteps?: number;
  mode: BenchmarkMode;
  riskLevel: BenchmarkRiskLevel;
  maxAttempts?: number;
}

export interface ActionVerificationResult {
  passed: boolean;
  score: number;
  confidence: number;
  reasons: string[];
  missingCriteria: string[];
  suggestedNextStep?: string;
}

export interface ActionModelRunResult {
  taskId: string;
  success: boolean;
  finalAnswer: string;
  steps: ReActStep[];
  attemptsUsed: number;
  verification: ActionVerificationResult;
  toolsConsidered: string[];
  durationMs: number;
}

export type ActionModelEvent =
  | {
      type: "attempt_start";
      taskId: string;
      attempt: number;
      maxAttempts: number;
      goal: string;
    }
  | {
      type: "step";
      taskId: string;
      attempt: number;
      step: ReActStep;
    }
  | {
      type: "verification";
      taskId: string;
      attempt: number;
      verification: ActionVerificationResult;
    }
  | {
      type: "task_complete";
      taskId: string;
      result: ActionModelRunResult;
    };

export interface BenchmarkSuite {
  id: string;
  name: string;
  description: string;
  source: BenchmarkSuiteSource;
  status: BenchmarkSuiteStatus;
  configurationHint?: string;
  tasks: BenchmarkTask[];
}

export interface BenchmarkTaskResult {
  task: BenchmarkTask;
  run: ActionModelRunResult;
}

export interface BenchmarkSuiteSummary {
  id: string;
  name: string;
  description: string;
  source: BenchmarkSuiteSource;
  status: BenchmarkSuiteStatus;
  configurationHint?: string;
  taskCount: number;
}

export interface BenchmarkRunHistoryItem {
  id: string;
  suiteId: string;
  suiteName: string;
  suiteSource: BenchmarkSuiteSource;
  provider: string;
  model: string;
  passRate: number;
  averageScore: number;
  completedTasks: number;
  failedTasks: number;
  taskCount: number;
  totalDurationMs: number;
  createdAt: string;
  evaluation?: BenchmarkRunEvaluation;
}

export interface BenchmarkRunEvaluation {
  gateStatus: BenchmarkGateStatus;
  gateLabel: string;
  isReleaseAnchor: boolean;
  freshnessHours: number;
  passRateDelta: number | null;
  averageScoreDelta: number | null;
}

export interface BenchmarkReleaseGate {
  status: BenchmarkGateStatus;
  label: string;
  summary: string;
  reasons: string[];
  latestAtlasRunId: string | null;
  freshnessHours: number | null;
  passRateDelta: number | null;
  averageScoreDelta: number | null;
}

export interface BenchmarkSuiteResult {
  suite: {
    id: string;
    name: string;
    description: string;
    taskCount: number;
    source?: BenchmarkSuiteSource;
  };
  provider: BenchmarkProviderInfo;
  passRate: number;
  averageScore: number;
  completedTasks: number;
  failedTasks: number;
  totalDurationMs: number;
  taskResults: BenchmarkTaskResult[];
  runId?: string;
  createdAt?: string;
}

export interface ActionModelOptions {
  toolContext: ToolContext;
  verifier?: (task: BenchmarkTask, result: {
    finalAnswer: string;
    steps: ReActStep[];
    success: boolean;
  }) => Promise<ActionVerificationResult>;
  onEvent?: (event: ActionModelEvent) => void;
}

export interface BenchmarkMetaResponse {
  status: string;
  provider: BenchmarkProviderInfo;
  suites: BenchmarkSuiteSummary[];
  recentRuns: BenchmarkRunHistoryItem[];
  health: BenchmarkReleaseGate;
}
