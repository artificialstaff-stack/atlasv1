/**
 * ─── Jarvis Brain-Shell Identifier Contracts ───
 *
 * Atlas ↔ HQTT arasında paylaşılan kimlik sözleşmesi.
 * Her iki tarafta (Atlas TS + HQTT Python) aynı anlam taşımalı.
 */

/** Unique conversation identifier — maps to a user-facing chat thread */
export type JarvisConversationId = string & { readonly __brand: "JarvisConversationId" };

/** Thread within a conversation (e.g. subtask chains) */
export type JarvisThreadId = string & { readonly __brand: "JarvisThreadId" };

/** Workspace ownership scope (admin claiming a conversation) */
export type JarvisWorkspaceId = string & { readonly __brand: "JarvisWorkspaceId" };

/** Unique identifier for a Jarvis run (observation, reflection, autofix) */
export type JarvisRunId = string & { readonly __brand: "JarvisRunId" };

/** Scope types for context isolation */
export type JarvisScopeType =
  | "global"
  | "customer"
  | "company"
  | "marketplace"
  | "order"
  | "product"
  | "operator";

/** Reference ID within a scope (e.g. company id, customer id) */
export type JarvisScopeRefId = string;

/** Memory layer classification */
export type JarvisMemoryLayer = "thread" | "user" | "episodic" | "procedural";

/** Provider lane for routing decisions — extensible via provider registry */
export type JarvisProviderLane = "hqtt" | "groq" | "ollama" | "openai" | "anthropic" | "deepseek" | (string & {});

/** Severity levels used across both systems */
export type JarvisSeverity = "critical" | "high" | "medium" | "low" | "info";

/** Risk classification for proposed actions */
export type JarvisActionRisk = "auto-safe" | "review-required" | "operator-only" | "blocked";

/** Health status shared between Atlas tool-health and HQTT living supervisor */
export type JarvisHealthStatus = "healthy" | "degraded" | "unhealthy" | "unknown";

/** Background loop task type classification */
export type JarvisBackgroundTaskType =
  | "visual_audit"
  | "code_quality"
  | "performance"
  | "dependency_audit"
  | "test_coverage"
  | "i18n_check"
  | "accessibility"
  | "api_contract"
  | "db_health"
  | "security_scan";

/** HQTT physiology signal names — maps to NATIVE_PHYSIOLOGY_BINDING_NAMES in hqtt_fly_sparse.py */
export type HqttPhysiologySignal =
  | "endogenous_curiosity"
  | "reflex_richness"
  | "reflex_readiness"
  | "dopamine_like_drive"
  | "serotonin_like_tone"
  | "octopamine_like_alert"
  | "replay_drive"
  | "sleep_drive"
  | "health_pressure"
  | "growth_demand";

/** HQTT residency metric names — maps to RESIDENCY_METRIC_SLOT_NAMES */
export type HqttResidencyMetric =
  | "action_residency"
  | "language_residency"
  | "memory_residency"
  | "planning_residency"
  | "organism_residency";

// ─── Branding helpers ───

export function conversationId(id: string): JarvisConversationId {
  return id as JarvisConversationId;
}
export function threadId(id: string): JarvisThreadId {
  return id as JarvisThreadId;
}
export function workspaceId(id: string): JarvisWorkspaceId {
  return id as JarvisWorkspaceId;
}
export function runId(id: string): JarvisRunId {
  return id as JarvisRunId;
}
