/**
 * ─── Jarvis Memory Types ───
 *
 * Unified types for the 4-layer memory system:
 *   thread  — short-term conversation context
 *   user    — long-term user/app preferences
 *   episodic — run traces, observer findings, failure/recovery
 *   procedural — policies, playbooks, self-heal rules
 */

import type { JarvisMemoryLayer, JarvisSeverity, JarvisRunId, JarvisBackgroundTaskType } from "../contracts";

export type { JarvisSeverity } from "../contracts";

// ──────────────────────────────────────
// Thread Memory (short-term)
// ──────────────────────────────────────

export interface JarvisThreadMessage {
  id: string;
  sessionId: string;
  threadId: string;
  workspaceId: string | null;
  userId: string;
  role: "user" | "assistant" | "system" | "tool";
  content: string;
  metadata: Record<string, unknown>;
  tokenCount: number;
  createdAt: string;
}

// ──────────────────────────────────────
// User Memory (long-term)
// ──────────────────────────────────────

export interface JarvisUserFact {
  id: string;
  userId: string;
  key: string;
  value: string;
  confidence: number;
  source: string;
  lastAccessedAt: string;
  createdAt: string;
  updatedAt: string;
}

// ──────────────────────────────────────
// Episodic Memory (run traces)
// ──────────────────────────────────────

export interface JarvisEpisode {
  id: string;
  runId: string;
  traceType: "command" | "observation" | "reflection" | "autofix" | "background_scan";
  input: string;
  toolCalls: Array<{
    toolName: string;
    input: Record<string, unknown>;
    output?: Record<string, unknown>;
    durationMs: number;
    success: boolean;
  }>;
  approvalDecisions: Array<{
    approvalId: string;
    decision: "approved" | "rejected";
    actor: string;
  }>;
  artifacts: string[];
  failures: string[];
  fallbackPath: string | null;
  selfReportSnapshot: Record<string, unknown> | null;
  provider: string;
  model: string;
  durationMs: number;
  createdAt: string;
}

// ──────────────────────────────────────
// Procedural Memory (policies / playbooks)
// ──────────────────────────────────────

export type JarvisProcedureKind = "policy" | "playbook" | "self_heal_rule" | "benchmark_strategy";

export interface JarvisProcedure {
  id: string;
  kind: JarvisProcedureKind;
  name: string;
  description: string;
  conditions: string[];
  actions: string[];
  severity: JarvisSeverity;
  enabled: boolean;
  source: "manual" | "hqtt_evolution" | "observer_learning";
  confidence: number;
  createdAt: string;
  updatedAt: string;
}

// ──────────────────────────────────────
// Search & Query
// ──────────────────────────────────────

export interface JarvisMemorySearchOptions {
  layer: JarvisMemoryLayer;
  query: string;
  limit?: number;
  userId?: string;
  severity?: JarvisSeverity;
  dateRange?: { from: string; to: string };
}

export interface JarvisMemorySearchResult {
  items: Array<{
    id: string;
    layer: JarvisMemoryLayer;
    content: string;
    score: number;
    metadata: Record<string, unknown>;
  }>;
  totalCount: number;
}
