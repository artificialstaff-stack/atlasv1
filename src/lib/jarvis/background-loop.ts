/**
 * ─── Background Loop (Idle Brain) ───
 *
 * When Jarvis has no active user requests, the background loop
 * continuously cycles through system surfaces to:
 * - Detect visual regressions, bugs, and missing features
 * - Run code quality / dependency / accessibility checks
 * - Generate gap reports and self-reports
 * - Trigger reflection on accumulated findings
 * - Evolve the HQTT brain when patterns are found
 *
 * The loop runs server-side and is designed to be started once
 * (e.g. via an admin action or API route) and stopped gracefully.
 *
 * State is persisted to Supabase `jarvis_loop_state` table so
 * cycle count and last-cycle timestamps survive server restarts.
 * A heartbeat + lock mechanism prevents duplicate loops.
 *
 * Cycle order:
 *   visual_audit → code_quality → performance → dependency_audit →
 *   test_coverage → i18n_check → accessibility → api_contract →
 *   db_health → security_scan → (reflect + self-report) → repeat
 */

import { randomUUID } from "node:crypto";
import { JarvisCoreAdapter } from "./core-adapter";
import { generateSelfReport } from "./self-model";
import { generateGapReport } from "./gap-report";
import { runReflection } from "./reflection";
import { recordEpisode } from "./memory/episodic-memory";
import { runId as toRunId } from "./contracts";
import { createAdminClient } from "@/lib/supabase/admin";
import type { JarvisBackgroundLoopState } from "./brain-types";
import type { JarvisBackgroundTaskType } from "./contracts";

// ──────────────────────────────────────
// Task Queue
// ──────────────────────────────────────

const TASK_CYCLE: JarvisBackgroundTaskType[] = [
  "visual_audit",
  "code_quality",
  "performance",
  "dependency_audit",
  "test_coverage",
  "i18n_check",
  "accessibility",
  "api_contract",
  "db_health",
  "security_scan",
];

const DEFAULT_CYCLE_INTERVAL_MS = 60_000; // 1 minute between tasks
const MIN_CYCLE_INTERVAL_MS = 10_000;
const STALE_HEARTBEAT_MS = 3 * 60_000; // 3 minutes = stale lock

// ──────────────────────────────────────
// Internal State (process-local, backed by DB)
// ──────────────────────────────────────

let loopAbortController: AbortController | null = null;
let accumulatedFindings: string[] = [];
const instanceId = randomUUID();

// ──────────────────────────────────────
// Supabase Persistence Helpers
// ──────────────────────────────────────

interface LoopRow {
  running: boolean;
  current_task: string | null;
  last_cycle_at: string | null;
  cycle_count: number;
  queued_tasks: string[];
  idle_since: string | null;
  findings_this_cycle: number;
  heartbeat_at: string;
  locked_by: string | null;
  locked_at: string | null;
}

async function readLoopRow(): Promise<LoopRow | null> {
  try {
    const supabase = createAdminClient();
    const { data, error } = await (supabase.from as any)("jarvis_loop_state")
      .select("*")
      .eq("id", "singleton")
      .single();
    if (error || !data) {
      // Table may not exist yet — try to create the singleton row
      await (supabase.from as any)("jarvis_loop_state")
        .upsert({ id: "singleton", running: false, cycle_count: 0, findings_this_cycle: 0, queued_tasks: [], heartbeat_at: new Date().toISOString() })
        .select("*")
        .single();
      const retry = await (supabase.from as any)("jarvis_loop_state")
        .select("*")
        .eq("id", "singleton")
        .single();
      return (retry.data as LoopRow) ?? null;
    }
    return data as LoopRow;
  } catch {
    return null;
  }
}

async function updateLoopRow(patch: Partial<LoopRow>): Promise<void> {
  try {
    const supabase = createAdminClient();
    await (supabase.from as any)("jarvis_loop_state")
      .update({ ...patch, updated_at: new Date().toISOString() })
      .eq("id", "singleton");
  } catch {
    // DB unavailable — silently skip persistence
  }
}

/** Try to acquire the loop lock. Returns true if acquired. */
async function acquireLock(): Promise<boolean> {
  try {
    const row = await readLoopRow();
    if (!row) {
      // Table doesn't exist yet — fall back to process-local only
      return true;
    }

    // Already locked by another live instance?
    if (row.locked_by && row.locked_by !== instanceId) {
      const heartbeatAge = Date.now() - new Date(row.heartbeat_at).getTime();
      if (heartbeatAge < STALE_HEARTBEAT_MS) {
        return false; // another instance is alive
      }
      // Stale lock — take over
    }

    await updateLoopRow({
      running: true,
      locked_by: instanceId,
      locked_at: new Date().toISOString(),
      heartbeat_at: new Date().toISOString(),
    });
    return true;
  } catch {
    // DB error — allow local start as fallback
    return true;
  }
}

async function releaseLock(): Promise<void> {
  try {
    await updateLoopRow({
      running: false,
      locked_by: null,
      locked_at: null,
      current_task: null,
      idle_since: new Date().toISOString(),
    });
  } catch {
    // DB unavailable — silently continue
  }
}

// ──────────────────────────────────────
// Task Executors
// ──────────────────────────────────────

async function executeTask(task: JarvisBackgroundTaskType): Promise<string[]> {
  const findings: string[] = [];

  switch (task) {
    case "visual_audit": {
      // Ask HQTT to observe visual surfaces
      const result = await JarvisCoreAdapter.observe([
        "customer-dashboard",
        "admin-dashboard",
        "marketing-landing",
      ]);
      if (result?.findings) {
        findings.push(`[visual_audit] ${result.findings}`);
      }
      break;
    }

    case "code_quality": {
      const gap = await generateGapReport();
      for (const item of gap.codeQualityIssues) {
        findings.push(`[code_quality] ${item.title}: ${item.description}`);
      }
      break;
    }

    case "performance": {
      const gap = await generateGapReport();
      for (const item of gap.performanceRegressions) {
        findings.push(`[performance] ${item.title}: ${item.description}`);
      }
      break;
    }

    case "accessibility": {
      const gap = await generateGapReport();
      for (const item of gap.accessibilityIssues) {
        findings.push(`[accessibility] ${item.title}: ${item.description}`);
      }
      break;
    }

    case "security_scan": {
      const gap = await generateGapReport();
      for (const item of gap.securityFindings) {
        findings.push(`[security] ${item.title}: ${item.description}`);
      }
      break;
    }

    case "db_health": {
      const health = await JarvisCoreAdapter.health();
      if (health.status !== "healthy") {
        findings.push(`[db_health] System health: ${health.status}`);
      }
      for (const tool of health.tools) {
        if (tool.status !== "healthy") {
          findings.push(`[db_health] Tool ${tool.name}: ${tool.status} (${(tool.successRate * 100).toFixed(0)}%)`);
        }
      }
      break;
    }

    case "dependency_audit":
    case "test_coverage":
    case "i18n_check":
    case "api_contract": {
      // Ask HQTT brain for specialized analysis
      const result = await JarvisCoreAdapter.observe([task]);
      if (result?.findings) {
        findings.push(`[${task}] ${result.findings}`);
      }
      break;
    }
  }

  return findings;
}

// ──────────────────────────────────────
// Main Loop
// ──────────────────────────────────────

async function runLoop(signal: AbortSignal): Promise<void> {
  const intervalMs = Math.max(
    Number(process.env.JARVIS_CYCLE_INTERVAL_MS) || DEFAULT_CYCLE_INTERVAL_MS,
    MIN_CYCLE_INTERVAL_MS,
  );

  // Restore cycle count from DB
  const stored = await readLoopRow();
  let cycleCount = stored?.cycle_count ?? 0;
  let findingsThisCycle = 0;
  let taskIndex = 0;

  while (!signal.aborted) {
    const task = TASK_CYCLE[taskIndex % TASK_CYCLE.length];

    // Update DB: current task + heartbeat
    await updateLoopRow({
      current_task: task,
      heartbeat_at: new Date().toISOString(),
      idle_since: null,
    }).catch(() => {});

    const start = Date.now();
    try {
      const findings = await executeTask(task);
      accumulatedFindings.push(...findings);
      findingsThisCycle += findings.length;

      // Record episode
      await recordEpisode({
        runId: toRunId(randomUUID()),
        traceType: "background_scan",
        input: `Background task: ${task}`,
        toolCalls: [],
        approvalDecisions: [],
        artifacts: findings,
        failures: [],
        fallbackPath: null,
        selfReportSnapshot: null,
        provider: JarvisCoreAdapter.isConfigured ? "hqtt" : "groq",
        model: "",
        durationMs: Date.now() - start,
      }).catch(() => {});
    } catch (err) {
      // Record failure but don't stop the loop
      await recordEpisode({
        runId: toRunId(randomUUID()),
        traceType: "background_scan",
        input: `Background task: ${task}`,
        toolCalls: [],
        approvalDecisions: [],
        artifacts: [],
        failures: [err instanceof Error ? err.message : String(err)],
        fallbackPath: null,
        selfReportSnapshot: null,
        provider: "groq",
        model: "",
        durationMs: Date.now() - start,
      }).catch(() => {});
    }

    taskIndex++;

    // After a full cycle, run reflection + self-report
    if (taskIndex % TASK_CYCLE.length === 0) {
      cycleCount++;
      const cycleTime = new Date().toISOString();

      // Persist cycle metrics to DB
      await updateLoopRow({
        cycle_count: cycleCount,
        last_cycle_at: cycleTime,
        findings_this_cycle: findingsThisCycle,
      }).catch(() => {});

      // Reflect on accumulated findings
      if (accumulatedFindings.length > 0) {
        await runReflection(accumulatedFindings).catch(() => {});
      }

      // Generate self-report for dashboard
      await generateSelfReport().catch(() => {});

      // Try to evolve HQTT brain
      await JarvisCoreAdapter.evolve().catch(() => {});

      // Reset for next cycle
      accumulatedFindings = [];
      findingsThisCycle = 0;
    }

    // Update DB: idle
    await updateLoopRow({
      current_task: null,
      idle_since: new Date().toISOString(),
      heartbeat_at: new Date().toISOString(),
    }).catch(() => {});

    // Wait before next task
    await new Promise<void>((resolve) => {
      const timer = setTimeout(resolve, intervalMs);
      signal.addEventListener("abort", () => {
        clearTimeout(timer);
        resolve();
      }, { once: true });
    });
  }
}

// ──────────────────────────────────────
// Public API
// ──────────────────────────────────────

/**
 * Start the background brain loop.
 * Acquires a DB lock to prevent duplicate loops across instances.
 * Returns false if another instance holds the lock.
 */
export async function startBackgroundLoop(): Promise<boolean> {
  if (loopAbortController) return false; // already running locally

  const acquired = await acquireLock();
  if (!acquired) return false;

  loopAbortController = new AbortController();

  runLoop(loopAbortController.signal)
    .catch(() => {})
    .finally(async () => {
      loopAbortController = null;
      await releaseLock().catch(() => {});
    });

  return true;
}

/**
 * Stop the background loop gracefully.
 */
export async function stopBackgroundLoop(): Promise<boolean> {
  if (!loopAbortController) return false;
  loopAbortController.abort();
  return true;
}

/**
 * Get the current state of the background loop from the DB.
 * Falls back to process-local state if DB unavailable.
 */
export async function getBackgroundLoopState(): Promise<JarvisBackgroundLoopState> {
  const row = await readLoopRow();

  if (!row) {
    // DB unavailable — use process-local knowledge
    return {
      running: loopAbortController !== null,
      currentTask: null,
      lastCycleAt: null,
      cycleCount: 0,
      queuedTasks: [...TASK_CYCLE],
      idleSince: null,
      findingsThisCycle: 0,
    };
  }

  // Detect stale lock (no heartbeat for > STALE_HEARTBEAT_MS)
  const heartbeatAge = Date.now() - new Date(row.heartbeat_at).getTime();
  const isActuallyRunning = row.running && heartbeatAge < STALE_HEARTBEAT_MS;

  const taskIndex = row.current_task ? TASK_CYCLE.indexOf(row.current_task as JarvisBackgroundTaskType) : -1;
  const remaining = taskIndex >= 0
    ? TASK_CYCLE.slice(taskIndex + 1)
    : [...TASK_CYCLE];

  return {
    running: isActuallyRunning,
    currentTask: isActuallyRunning ? (row.current_task as JarvisBackgroundTaskType | null) : null,
    lastCycleAt: row.last_cycle_at,
    cycleCount: row.cycle_count,
    queuedTasks: remaining,
    idleSince: row.idle_since,
    findingsThisCycle: row.findings_this_cycle,
  };
}
