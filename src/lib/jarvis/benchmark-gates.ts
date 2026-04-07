/**
 * ─── Benchmark Gates ───
 *
 * Quality gates that the background loop and CI/CD pipeline
 * can check before promoting changes. Each gate returns pass/fail
 * with details about what was checked.
 *
 * Gates:
 * 1. Health gate — system must be healthy/degraded (not unhealthy)
 * 2. Confidence gate — self-report confidence must be above threshold
 * 3. Gap gate — critical gaps must be zero
 * 4. Failure motif gate — recurring failure patterns must be below threshold
 * 5. Memory coherence gate — memory layers must respond
 */

import { JarvisCoreAdapter } from "./core-adapter";
import { generateSelfReport } from "./self-model";
import { generateGapReport } from "./gap-report";
import type { JarvisSelfReport, JarvisGapReport } from "./brain-types";

// ──────────────────────────────────────
// Types
// ──────────────────────────────────────

export interface BenchmarkGateResult {
  gate: string;
  passed: boolean;
  detail: string;
  value?: number;
  threshold?: number;
}

export interface BenchmarkReport {
  timestamp: string;
  allPassed: boolean;
  gates: BenchmarkGateResult[];
}

// ──────────────────────────────────────
// Individual Gates
// ──────────────────────────────────────

function healthGate(report: JarvisSelfReport): BenchmarkGateResult {
  const passed = report.health.status !== "unhealthy";
  return {
    gate: "health",
    passed,
    detail: passed
      ? `System is ${report.health.status}`
      : "System is unhealthy — cannot promote",
  };
}

function confidenceGate(report: JarvisSelfReport, threshold = 0.4): BenchmarkGateResult {
  const passed = report.confidenceLevel >= threshold;
  return {
    gate: "confidence",
    passed,
    detail: passed
      ? `Confidence ${(report.confidenceLevel * 100).toFixed(0)}% ≥ ${(threshold * 100).toFixed(0)}%`
      : `Confidence ${(report.confidenceLevel * 100).toFixed(0)}% < ${(threshold * 100).toFixed(0)}%`,
    value: report.confidenceLevel,
    threshold,
  };
}

function criticalGapGate(gapReport: JarvisGapReport): BenchmarkGateResult {
  const criticals = [
    ...gapReport.failingTests,
    ...gapReport.degradedTools,
    ...gapReport.securityFindings,
  ].filter((g) => g.severity === "critical");

  const passed = criticals.length === 0;
  return {
    gate: "critical_gaps",
    passed,
    detail: passed
      ? "No critical gaps detected"
      : `${criticals.length} critical gap(s) found`,
    value: criticals.length,
    threshold: 0,
  };
}

function failureMotifGate(report: JarvisSelfReport, maxMotifs = 3): BenchmarkGateResult {
  const count = report.recurringFailureMotifs.length;
  const passed = count <= maxMotifs;
  return {
    gate: "failure_motifs",
    passed,
    detail: passed
      ? `${count} recurring motif(s) ≤ ${maxMotifs}`
      : `${count} recurring motif(s) > ${maxMotifs} — too many recurring failures`,
    value: count,
    threshold: maxMotifs,
  };
}

async function memoryCoherenceGate(): Promise<BenchmarkGateResult> {
  const health = await JarvisCoreAdapter.health();
  const stats = health.memoryStats;
  const hasData = stats.threadMessages > 0 || stats.userFacts > 0 || stats.episodes > 0;
  return {
    gate: "memory_coherence",
    passed: true, // Memory is always "gateable" — empty is OK for fresh systems
    detail: hasData
      ? `Memory active: ${stats.threadMessages} threads, ${stats.userFacts} facts, ${stats.episodes} episodes`
      : "Memory layers responding but empty — fresh system",
  };
}

// ──────────────────────────────────────
// Public API
// ──────────────────────────────────────

/**
 * Run all benchmark gates and return a report.
 */
export async function runBenchmarkGates(options?: {
  confidenceThreshold?: number;
  maxMotifs?: number;
}): Promise<BenchmarkReport> {
  const [selfReport, gapReport, memGate] = await Promise.all([
    generateSelfReport(),
    generateGapReport(),
    memoryCoherenceGate(),
  ]);

  const gates: BenchmarkGateResult[] = [
    healthGate(selfReport),
    confidenceGate(selfReport, options?.confidenceThreshold),
    criticalGapGate(gapReport),
    failureMotifGate(selfReport, options?.maxMotifs),
    memGate,
  ];

  return {
    timestamp: new Date().toISOString(),
    allPassed: gates.every((g) => g.passed),
    gates,
  };
}
