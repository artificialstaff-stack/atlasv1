/**
 * ─── Gap Report Generator ───
 *
 * Scans Atlas surfaces, tests, tools, and performance data
 * to detect unaudited areas, regressions, and missing coverage.
 *
 * Combines local analysis (surfaces, findings, procedures) with
 * HQTT brain gap-report data when available. The report answers:
 * "What's missing, broken, or degraded in this system right now?"
 */

import { randomUUID } from "node:crypto";
import { createAdminClient } from "@/lib/supabase/admin";
import { JarvisCoreAdapter } from "./core-adapter";
import { getJarvisDashboard } from "./store";
import { listAtlasSurfaces } from "./surfaces";
import { runId as toRunId } from "./contracts";
import { getJarvisRoutingInfo } from "@/lib/ai/client";
import type {
  JarvisGapReport,
  JarvisGapItem,
  JarvisBackgroundLoopState,
} from "./brain-types";
import type { JarvisBackgroundTaskType, JarvisSeverity } from "./contracts";

// ──────────────────────────────────────
// Helpers
// ──────────────────────────────────────

function gapItem(
  category: JarvisBackgroundTaskType,
  severity: JarvisSeverity,
  title: string,
  description: string,
  opts?: { location?: string; suggestedAction?: string },
): JarvisGapItem {
  return {
    id: randomUUID(),
    category,
    severity,
    title,
    description,
    location: opts?.location,
    suggestedAction: opts?.suggestedAction,
    detectedAt: new Date().toISOString(),
  };
}

// ──────────────────────────────────────
// Surface Coverage Analysis
// ──────────────────────────────────────

async function findUnauditedSurfaces(): Promise<string[]> {
  const surfaces = listAtlasSurfaces();
  const auditableSurfaces = surfaces.filter((s) => s.auditEnabled);
  if (auditableSurfaces.length === 0) return [];

  const routing = getJarvisRoutingInfo();
  const provider = { lane: routing.provider, model: routing.model, fallback: routing.fallbackModel, hqttEnabled: routing.hqttEnabled };
  const dashboard = await getJarvisDashboard(provider);

  // No runs at all → everything is unaudited
  if (!dashboard?.recentRuns?.length) {
    return auditableSurfaces.map((s) => s.id);
  }

  // Build a set of surface IDs that were actually audited.
  // Cross-reference: for each finding in recent runs, look up which surface it belongs to
  // via the finding's route/surfaceId field in activeFindings.
  const auditedSurfaceIds = new Set<string>();
  const findingMap = new Map<string, { route: string; surfaceId?: string | null }>();

  if (dashboard.activeFindings?.length) {
    for (const f of dashboard.activeFindings) {
      findingMap.set(f.id, { route: f.route, surfaceId: f.surfaceId });
    }
  }

  // Each run's findingIds tell us which findings were produced → those surfaces were audited
  for (const run of dashboard.recentRuns) {
    // Also mark surfaces whose journeys match the run's journeys
    if (run.journeys?.length) {
      for (const surface of auditableSurfaces) {
        if (run.journeys.includes(surface.primaryJourney)) {
          auditedSurfaceIds.add(surface.id);
        }
      }
    }

    // Mark surfaces that produced findings
    for (const fid of run.findingIds ?? []) {
      const finding = findingMap.get(fid);
      if (!finding) continue;

      // Direct surfaceId link
      if (finding.surfaceId) {
        auditedSurfaceIds.add(finding.surfaceId);
        continue;
      }

      // Match by route
      const match = auditableSurfaces.find((s) => s.route === finding.route);
      if (match) {
        auditedSurfaceIds.add(match.id);
      }
    }
  }

  return auditableSurfaces
    .filter((s) => !auditedSurfaceIds.has(s.id))
    .map((s) => s.id);
}

// ──────────────────────────────────────
// Active Finding → Gap Item Conversion
// ──────────────────────────────────────

async function findingsToGapItems(): Promise<JarvisGapItem[]> {
  const routing = getJarvisRoutingInfo();
  const provider = { lane: routing.provider, model: routing.model, fallback: routing.fallbackModel, hqttEnabled: routing.hqttEnabled };
  const dashboard = await getJarvisDashboard(provider);
  if (!dashboard?.activeFindings?.length) return [];

  return dashboard.activeFindings
    .filter((f) => f.status !== "fixed_branch" && f.status !== "verified")
    .map((f) => {
      const severityMap: Record<string, JarvisSeverity> = {
        p0: "critical",
        p1: "high",
        p2: "medium",
      };
      return gapItem(
        "visual_audit",
        severityMap[f.severity] ?? "medium",
        f.title,
        f.summary,
        { location: f.route },
      );
    });
}

// ──────────────────────────────────────
// Degraded Tools Check
// ──────────────────────────────────────

async function checkDegradedTools(): Promise<JarvisGapItem[]> {
  const gaps: JarvisGapItem[] = [];
  const health = await JarvisCoreAdapter.health();

  for (const tool of health.tools) {
    if (tool.status === "degraded" || tool.status === "unhealthy") {
      gaps.push(
        gapItem(
          "db_health",
          tool.status === "unhealthy" ? "high" : "medium",
          `Tool degraded: ${tool.name}`,
          `Success rate: ${(tool.successRate * 100).toFixed(0)}%, Latency: ${tool.avgLatencyMs}ms`,
          { suggestedAction: `Investigate ${tool.name} health` },
        ),
      );
    }
  }

  if (!health.hqttConnected) {
    gaps.push(
      gapItem(
        "db_health",
        "high",
        "HQTT brain not connected",
        "Jarvis operating in degraded mode without brain connection",
        { suggestedAction: "Check HQTT_BASE_URL and ensure frontier_openai_api.py is running" },
      ),
    );
  }

  return gaps;
}

// ──────────────────────────────────────
// Procedure Coverage
// ──────────────────────────────────────

async function checkProcedureCoverage(): Promise<JarvisGapItem[]> {
  const supabase = createAdminClient();
  const gaps: JarvisGapItem[] = [];

  const { count } = await (supabase.from as any)("jarvis_procedures")
    .select("id", { count: "exact", head: true })
    .eq("enabled", true);

  if ((count ?? 0) === 0) {
    gaps.push(
      gapItem(
        "code_quality",
        "medium",
        "No active procedures defined",
        "Jarvis has no policies, playbooks, or self-heal rules enabled",
        { suggestedAction: "Create baseline procedures for common failure scenarios" },
      ),
    );
  }

  return gaps;
}

// ──────────────────────────────────────
// Public API
// ──────────────────────────────────────

/**
 * Generate a comprehensive gap report combining local analysis and HQTT data.
 */
export async function generateGapReport(): Promise<JarvisGapReport> {
  const rid = toRunId(randomUUID());

  const [unauditedSurfaces, degradedTools, procedureGaps, hqttReport, findingGaps] =
    await Promise.all([
      findUnauditedSurfaces(),
      checkDegradedTools(),
      checkProcedureCoverage(),
      JarvisCoreAdapter.gapReport(),
      findingsToGapItems(),
    ]);

  // Merge HQTT gap data when available
  const failingTests = hqttReport?.failingTests ?? [];
  const performanceRegressions = hqttReport?.performanceRegressions ?? [];
  const codeQualityIssues = [...(hqttReport?.codeQualityIssues ?? []), ...procedureGaps];
  const accessibilityIssues = hqttReport?.accessibilityIssues ?? [];
  const securityFindings = hqttReport?.securityFindings ?? [];
  const suggestedImprovements = [
    ...findingGaps,
    ...(hqttReport?.suggestedImprovements ?? []),
  ];

  const allGaps = [
    ...failingTests,
    ...degradedTools,
    ...performanceRegressions,
    ...codeQualityIssues,
    ...accessibilityIssues,
    ...securityFindings,
    ...suggestedImprovements,
  ];

  return {
    generatedAt: new Date().toISOString(),
    runId: rid,
    unauditedSurfaces,
    failingTests,
    degradedTools,
    memoryGaps: hqttReport?.memoryGaps ?? [],
    performanceRegressions,
    codeQualityIssues,
    accessibilityIssues,
    securityFindings,
    suggestedImprovements,
    totalGapCount: allGaps.length,
  };
}
