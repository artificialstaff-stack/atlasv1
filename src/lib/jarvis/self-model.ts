/**
 * ─── Self-Model ───
 *
 * Builds Jarvis's self-report by aggregating data from:
 * - HQTT brain (via core-adapter)
 * - Local observer runs (via store)
 * - Memory layer stats (Supabase counts)
 * - Episode + trace history
 *
 * The self-report is the brain's introspection snapshot:
 * "What do I know? What am I good/bad at? What's broken?"
 */

import { createAdminClient } from "@/lib/supabase/admin";
import { JarvisCoreAdapter } from "./core-adapter";
import { getJarvisDashboard } from "./store";
import { getJarvisRoutingInfo } from "@/lib/ai/client";
import { generateProviderReport } from "./brain-opinions";
import type {
  JarvisSelfReport,
  JarvisHealthSnapshot,
  JarvisBrainGrowth,
  JarvisFailureMotif,
} from "./brain-types";

// ──────────────────────────────────────
// Memory Statistics
// ──────────────────────────────────────

async function fetchMemoryStats(): Promise<JarvisHealthSnapshot["memoryStats"]> {
  const supabase = createAdminClient();
  const [threads, facts, episodes, procedures] = await Promise.all([
    supabase.from("agent_conversations").select("id", { count: "exact", head: true }),
    (supabase.from as any)("jarvis_user_memory").select("id", { count: "exact", head: true }),
    (supabase.from as any)("jarvis_episodes").select("id", { count: "exact", head: true }),
    (supabase.from as any)("jarvis_procedures").select("id", { count: "exact", head: true }),
  ]);
  return {
    threadMessages: threads.count ?? 0,
    userFacts: facts.count ?? 0,
    episodes: episodes.count ?? 0,
    procedures: procedures.count ?? 0,
  };
}

// ──────────────────────────────────────
// Recent Failure Analysis
// ──────────────────────────────────────

interface RecentFailureRow {
  run_id: string;
  failures: string[];
  created_at: string;
}

async function fetchRecentFailures(limit = 20): Promise<JarvisSelfReport["recentFailures"]> {
  const supabase = createAdminClient();
  const { data } = await (supabase.from as any)("jarvis_episodes")
    .select("run_id, failures, created_at")
    .not("failures", "eq", "{}")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (!data) return [];
  return (data as RecentFailureRow[]).flatMap((row) =>
    row.failures.map((f) => ({
      runId: row.run_id,
      error: f,
      timestamp: row.created_at,
    })),
  );
}

function detectFailureMotifs(
  failures: JarvisSelfReport["recentFailures"],
): JarvisFailureMotif[] {
  const patternMap = new Map<string, JarvisFailureMotif>();

  for (const f of failures) {
    // Normalize error to pattern key: strip UUIDs, numbers, timestamps
    const pattern = f.error
      .replace(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi, "<uuid>")
      .replace(/\d{4}-\d{2}-\d{2}T[\d:.Z]+/g, "<ts>")
      .replace(/\d+/g, "<n>")
      .trim();

    const existing = patternMap.get(pattern);
    if (existing) {
      existing.count++;
      if (f.timestamp > existing.lastSeen) existing.lastSeen = f.timestamp;
    } else {
      patternMap.set(pattern, {
        pattern,
        count: 1,
        lastSeen: f.timestamp,
        affectedRoutes: [],
      });
    }
  }

  return Array.from(patternMap.values())
    .filter((m) => m.count >= 2)
    .sort((a, b) => b.count - a.count);
}

// ──────────────────────────────────────
// Observer Integration
// ──────────────────────────────────────

async function extractCapabilitiesFromDashboard(): Promise<{
  active: string[];
  disabled: string[];
  pendingRepairs: JarvisSelfReport["pendingRepairs"];
}> {
  const routing = getJarvisRoutingInfo();
  const provider = { lane: routing.provider, model: routing.model, fallback: routing.fallbackModel, hqttEnabled: routing.hqttEnabled };
  const dashboard = await getJarvisDashboard(provider);
  const active: string[] = ["observer", "chat", "autofix_proposals"];
  const disabled: string[] = [];
  const pendingRepairs: JarvisSelfReport["pendingRepairs"] = [];

  if (dashboard?.proposals) {
    for (const p of dashboard.proposals) {
      if (p.status === "draft" || p.status === "prepared") {
        pendingRepairs.push({
          id: p.id,
          description: p.summary,
          severity: p.riskLevel === "auto-safe" ? "low" : p.riskLevel === "review-required" ? "medium" : "high",
          proposedAt: p.createdAt,
        });
      }
    }
  }

  if (process.env.ATLAS_OBSERVER_ENABLED !== "1") {
    disabled.push("observer_background");
  }

  return { active, disabled, pendingRepairs };
}

// ──────────────────────────────────────
// Public API
// ──────────────────────────────────────

/**
 * Generate a comprehensive self-report combining local + HQTT data.
 * This is the brain's self-awareness snapshot.
 */
export async function generateSelfReport(): Promise<JarvisSelfReport> {
  const [health, hqttReport, memoryStats, recentFailures] = await Promise.all([
    JarvisCoreAdapter.health(),
    JarvisCoreAdapter.selfReport(),
    fetchMemoryStats(),
    fetchRecentFailures(),
  ]);

  // Update health with fresh memory stats
  health.memoryStats = memoryStats;

  const motifs = detectFailureMotifs(recentFailures);
  const { active, disabled, pendingRepairs } = await extractCapabilitiesFromDashboard();

  // Merge HQTT data when available
  const brainGrowth: JarvisBrainGrowth | null = hqttReport.brainGrowth ?? null;

  const confidenceLevel = computeConfidence(health, motifs, brainGrowth);

  // Provider routing intelligence
  const providerReport = generateProviderReport();

  return {
    generatedAt: new Date().toISOString(),
    health,
    activeCapabilities: [...new Set([...active, ...(hqttReport.activeCapabilities ?? [])])],
    disabledTools: [...new Set([...disabled, ...(hqttReport.disabledTools ?? [])])],
    recentFailures,
    recurringFailureMotifs: motifs,
    confidenceLevel,
    pendingRepairs,
    learnedNotes: [
      ...(hqttReport.learnedNotes ?? []),
      ...providerReport.summary,
      ...providerReport.recommendations,
    ],
    brainGrowth,
    physiology: hqttReport.physiology ?? null,
    residency: hqttReport.residency ?? null,
  };
}

/**
 * Computes an overall confidence score [0-1] from health, failure patterns, and brain growth.
 */
function computeConfidence(
  health: JarvisHealthSnapshot,
  motifs: JarvisFailureMotif[],
  brainGrowth: JarvisBrainGrowth | null,
): number {
  let score = 0.5;

  // Health contribution
  if (health.status === "healthy") score += 0.2;
  else if (health.status === "degraded") score += 0.05;
  else score -= 0.1;

  // HQTT connection bonus
  if (health.hqttConnected) score += 0.1;

  // Failure motifs penalty
  score -= Math.min(motifs.length * 0.05, 0.2);

  // Brain growth bonus
  if (brainGrowth) {
    const fieldCount = brainGrowth.semanticFieldCount + brainGrowth.worldSchemaFieldCount;
    score += Math.min(fieldCount / 100, 0.15);
  }

  return Math.max(0, Math.min(1, score));
}
