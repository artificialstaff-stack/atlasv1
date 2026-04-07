import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/require-admin";
import { createProcedure, getProcedures } from "@/lib/jarvis/memory/procedural-memory";
import type { JarvisProcedureKind, JarvisSeverity } from "@/lib/jarvis/memory/types";

interface SeedProcedure {
  kind: JarvisProcedureKind;
  name: string;
  description: string;
  conditions: string[];
  actions: string[];
  severity: JarvisSeverity;
  confidence: number;
}

const SEED_PROCEDURES: SeedProcedure[] = [
  // ── Policies ──
  {
    kind: "policy",
    name: "UI Freeze Policy",
    description: "Customer & admin panel UI components must not be altered without explicit approval.",
    conditions: ["file_modified:src/components/ui/*", "file_modified:src/components/admin/*"],
    actions: ["block_change", "notify_admin", "log_violation"],
    severity: "critical",
    confidence: 0.95,
  },
  {
    kind: "policy",
    name: "API Contract Stability",
    description: "Public API response shapes must remain backward-compatible.",
    conditions: ["api_response_schema_changed", "breaking_change_detected"],
    actions: ["flag_breaking_change", "suggest_versioned_endpoint"],
    severity: "high",
    confidence: 0.9,
  },
  {
    kind: "policy",
    name: "Security Header Enforcement",
    description: "All API responses must include security headers (CSP, X-Frame-Options, etc.).",
    conditions: ["missing_security_headers", "csp_violation"],
    actions: ["inject_headers", "log_violation"],
    severity: "high",
    confidence: 0.85,
  },

  // ── Playbooks ──
  {
    kind: "playbook",
    name: "Degraded to Healthy Recovery",
    description: "Steps to recover when system status goes from healthy to degraded.",
    conditions: ["health_status:degraded", "provider_fallback_active"],
    actions: [
      "check_hqtt_connectivity",
      "verify_api_keys",
      "test_groq_fallback",
      "run_quick_health_check",
      "update_dashboard_status",
    ],
    severity: "high",
    confidence: 0.8,
  },
  {
    kind: "playbook",
    name: "New Deployment Validation",
    description: "Post-deployment checklist: run visual audit, API contract check, perf baseline.",
    conditions: ["deployment_detected", "version_changed"],
    actions: [
      "run_visual_audit",
      "verify_api_contracts",
      "run_performance_baseline",
      "check_i18n_completeness",
      "generate_self_report",
    ],
    severity: "medium",
    confidence: 0.75,
  },

  // ── Self-Heal Rules ──
  {
    kind: "self_heal_rule",
    name: "Auto-Restart Stopped Loop",
    description: "If background loop stops unexpectedly, attempt restart after 60s cooldown.",
    conditions: ["loop_stopped_unexpectedly", "no_manual_stop"],
    actions: ["wait_60s", "restart_background_loop", "log_auto_restart"],
    severity: "high",
    confidence: 0.85,
  },
  {
    kind: "self_heal_rule",
    name: "Provider Fallback Chain",
    description: "If primary AI provider fails, automatically cascade to fallback providers.",
    conditions: ["hqtt_unreachable", "primary_provider_error"],
    actions: ["switch_to_groq", "if_groq_fails_switch_to_ollama", "log_fallback"],
    severity: "high",
    confidence: 0.9,
  },
  {
    kind: "self_heal_rule",
    name: "Stale Lock Recovery",
    description: "Detect and recover stale DB locks from crashed instances.",
    conditions: ["lock_age_exceeds_5min", "no_heartbeat"],
    actions: ["release_stale_lock", "log_recovery"],
    severity: "medium",
    confidence: 0.8,
  },

  // ── Benchmark Strategies ──
  {
    kind: "benchmark_strategy",
    name: "Response Time Baseline",
    description: "Track API response times; alert if p95 exceeds 500ms.",
    conditions: ["p95_latency_above_500ms", "endpoint_slow"],
    actions: ["log_slow_endpoint", "suggest_optimization", "update_perf_report"],
    severity: "medium",
    confidence: 0.7,
  },
  {
    kind: "benchmark_strategy",
    name: "Memory Growth Monitor",
    description: "Track Jarvis memory layer growth rates; alert on anomalies.",
    conditions: ["memory_growth_spike", "episodes_per_hour_above_threshold"],
    actions: ["analyze_episode_patterns", "suggest_consolidation", "update_metrics"],
    severity: "low",
    confidence: 0.65,
  },
];

export async function POST() {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Check existing procedures to avoid duplicates
  const existing = await getProcedures();
  const existingNames = new Set(existing.map((p) => p.name));

  const created: string[] = [];
  const skipped: string[] = [];

  for (const seed of SEED_PROCEDURES) {
    if (existingNames.has(seed.name)) {
      skipped.push(seed.name);
      continue;
    }

    const result = await createProcedure({
      kind: seed.kind,
      name: seed.name,
      description: seed.description,
      conditions: seed.conditions,
      actions: seed.actions,
      severity: seed.severity,
      enabled: true,
      source: "manual",
      confidence: seed.confidence,
    });

    if (result) {
      created.push(result.name);
    }
  }

  return NextResponse.json({
    success: true,
    created: created.length,
    skipped: skipped.length,
    details: { created, skipped },
  });
}
