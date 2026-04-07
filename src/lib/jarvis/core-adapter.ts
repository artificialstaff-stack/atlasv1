/**
 * ─── JarvisCoreAdapter ───
 *
 * Atlas ↔ HQTT brain-shell contract implementation.
 * All Atlas subsystems (orchestrator, observer, admin-copilot) communicate
 * with HQTT exclusively through this adapter.
 *
 * Transport: HTTP to HQTT's OpenAI-compatible API + custom /v1/jarvis/* endpoints.
 * Fallback: When HQTT is unavailable, degrades to local Groq/Ollama with reduced capabilities.
 */

import type {
  JarvisSelfReport,
  JarvisHealthSnapshot,
  JarvisGapReport,
  JarvisTraceRecord,
  JarvisMemoryEnvelope,
  JarvisReflectionResult,
  JarvisBrainGrowth,
} from "./brain-types";
import type {
  JarvisMemoryLayer,
  JarvisHealthStatus,
  JarvisProviderLane,
  JarvisRunId,
  HqttPhysiologySignal,
  HqttResidencyMetric,
} from "./contracts";
import { runId as toRunId } from "./contracts";

// ──────────────────────────────────────
// Configuration
// ──────────────────────────────────────

const HQTT_BASE_URL = process.env.HQTT_BASE_URL ?? "http://127.0.0.1:8020/v1";
const HQTT_API_KEY = process.env.HQTT_API_KEY ?? "hqtt-local";
const HQTT_TIMEOUT_MS = Number(process.env.HQTT_TIMEOUT_MS) || 30_000;
const HQTT_MAX_RETRIES = 2;

const hqttEnabled =
  process.env.ATLAS_JARVIS_ENABLED === "1" &&
  Boolean(process.env.HQTT_BASE_URL);

// ──────────────────────────────────────
// Internal State
// ──────────────────────────────────────

let cachedHealth: { snapshot: JarvisHealthSnapshot; fetchedAt: number } | null = null;
let cachedSelfReport: { report: JarvisSelfReport; fetchedAt: number } | null = null;
const HEALTH_CACHE_TTL_MS = 30_000;
const SELF_REPORT_CACHE_TTL_MS = 5 * 60 * 1000;

// ──────────────────────────────────────
// HTTP Transport
// ──────────────────────────────────────

interface HqttRequestOptions {
  path: string;
  method?: "GET" | "POST";
  body?: unknown;
  timeoutMs?: number;
}

async function hqttFetch<T>(opts: HqttRequestOptions): Promise<T> {
  const { path, method = "GET", body, timeoutMs = HQTT_TIMEOUT_MS } = opts;
  const url = `${HQTT_BASE_URL.replace(/\/v1\/?$/, "")}${path}`;
  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= HQTT_MAX_RETRIES; attempt++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const res = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${HQTT_API_KEY}`,
        },
        body: body ? JSON.stringify(body) : undefined,
        signal: controller.signal,
      });
      clearTimeout(timer);
      if (!res.ok) {
        throw new Error(`HQTT ${method} ${path} returned ${res.status}`);
      }
      return (await res.json()) as T;
    } catch (err) {
      clearTimeout(timer);
      lastError = err instanceof Error ? err : new Error(String(err));
      if (attempt < HQTT_MAX_RETRIES) {
        await new Promise((r) => setTimeout(r, 500 * 2 ** attempt));
      }
    }
  }
  throw lastError ?? new Error("HQTT request failed");
}

async function hqttAvailable(): Promise<boolean> {
  if (!hqttEnabled) return false;
  try {
    await hqttFetch({ path: "/v1/models", timeoutMs: 5000 });
    return true;
  } catch {
    return false;
  }
}

// ──────────────────────────────────────
// Chat (OpenAI-compatible)
// ──────────────────────────────────────

export interface JarvisChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface JarvisChatOptions {
  messages: JarvisChatMessage[];
  temperature?: number;
  maxTokens?: number;
}

export interface JarvisChatResult {
  content: string;
  provider: JarvisProviderLane;
  model: string;
  durationMs: number;
}

async function hqttChat(opts: JarvisChatOptions): Promise<JarvisChatResult> {
  const start = Date.now();
  const response = await hqttFetch<{
    choices: Array<{ message: { content: string } }>;
    model: string;
  }>({
    path: "/v1/chat/completions",
    method: "POST",
    body: {
      model: process.env.HQTT_MODEL ?? "hqtt-agi-os",
      messages: opts.messages,
      temperature: opts.temperature ?? 0.7,
      max_tokens: opts.maxTokens ?? 2048,
    },
  });
  return {
    content: response.choices[0]?.message?.content ?? "",
    provider: "hqtt",
    model: response.model ?? "hqtt-agi-os",
    durationMs: Date.now() - start,
  };
}

// ──────────────────────────────────────
// Health
// ──────────────────────────────────────

async function fetchHqttHealth(): Promise<Partial<JarvisHealthSnapshot>> {
  try {
    return await hqttFetch<Partial<JarvisHealthSnapshot>>({
      path: "/v1/jarvis/health",
      timeoutMs: 5000,
    });
  } catch {
    return {};
  }
}

function buildLocalHealthSnapshot(): JarvisHealthSnapshot {
  return {
    status: "degraded" as JarvisHealthStatus,
    uptimeSeconds: Math.floor(process.uptime()),
    hqttConnected: false,
    hqttStubMode: false,
    hqttLatencyMs: null,
    activeProvider: "groq",
    fallbackProvider: "ollama",
    tools: [],
    lastObserverRun: null,
    lastSelfReportAt: new Date().toISOString(),
    memoryStats: { threadMessages: 0, userFacts: 0, episodes: 0, procedures: 0 },
  };
}

// ──────────────────────────────────────
// Self Report
// ──────────────────────────────────────

async function fetchHqttSelfReport(): Promise<Partial<JarvisSelfReport>> {
  try {
    return await hqttFetch<Partial<JarvisSelfReport>>({
      path: "/v1/jarvis/self-report",
      timeoutMs: 10_000,
    });
  } catch {
    return {};
  }
}

function buildDegradedSelfReport(health: JarvisHealthSnapshot): JarvisSelfReport {
  return {
    generatedAt: new Date().toISOString(),
    health,
    activeCapabilities: [],
    disabledTools: [],
    recentFailures: [],
    recurringFailureMotifs: [],
    confidenceLevel: 0.3,
    pendingRepairs: [],
    learnedNotes: ["HQTT brain not connected — operating in degraded mode"],
    brainGrowth: null,
    physiology: null,
    residency: null,
  };
}

// ──────────────────────────────────────
// Public API — The JarvisCoreAdapter
// ──────────────────────────────────────

export const JarvisCoreAdapter = {
  /** Whether the HQTT brain is configured (env vars present) */
  get isConfigured(): boolean {
    return hqttEnabled;
  },

  /** Ping HQTT — returns true if reachable */
  async isAvailable(): Promise<boolean> {
    return hqttAvailable();
  },

  /**
   * Chat with the Jarvis brain.
   * Falls back to null when HQTT is unavailable (caller should use Groq/Ollama).
   */
  async chat(opts: JarvisChatOptions): Promise<JarvisChatResult | null> {
    if (!hqttEnabled) return null;
    try {
      return await hqttChat(opts);
    } catch {
      return null;
    }
  },

  /**
   * Ask HQTT to produce a multi-step plan for a given goal.
   */
  async plan(goal: string, context?: string): Promise<{ plan: string; provider: JarvisProviderLane } | null> {
    if (!hqttEnabled) return null;
    try {
      const res = await hqttChat({
        messages: [
          { role: "system", content: "You are Jarvis, Atlas platform's strategic planner. Respond with a structured plan." },
          { role: "user", content: context ? `Context: ${context}\n\nGoal: ${goal}` : goal },
        ],
        temperature: 0.4,
      });
      return { plan: res.content, provider: res.provider };
    } catch {
      return null;
    }
  },

  /**
   * Trigger an observation cycle via HQTT.
   */
  async observe(surfaces: string[]): Promise<{ findings: string; provider: JarvisProviderLane; isStub?: boolean } | null> {
    if (!hqttEnabled) return null;
    try {
      const result = await hqttFetch<{ findings: string; provider: JarvisProviderLane }>({
        path: "/v1/jarvis/observe",
        method: "POST",
        body: { surfaces },
      });
      // Detect stub responses — HQTT bridge returns "N surfaces requested" when not fully implemented
      const isStub = /^\d+ surfaces requested$/i.test(result.findings?.trim() ?? "");
      return { ...result, isStub };
    } catch {
      return null;
    }
  },

  /**
   * Ask HQTT to reflect on findings — detect patterns, root causes, priorities.
   */
  async reflect(findings: string[]): Promise<JarvisReflectionResult | null> {
    if (!hqttEnabled) return null;
    try {
      return await hqttFetch<JarvisReflectionResult>({
        path: "/v1/jarvis/reflect",
        method: "POST",
        body: { findings },
      });
    } catch {
      return null;
    }
  },

  /**
   * Get current self-report (cached for 5 min).
   */
  async selfReport(): Promise<JarvisSelfReport> {
    const now = Date.now();
    if (cachedSelfReport && now - cachedSelfReport.fetchedAt < SELF_REPORT_CACHE_TTL_MS) {
      return cachedSelfReport.report;
    }

    const health = await this.health();

    if (!hqttEnabled || !health.hqttConnected) {
      const degraded = buildDegradedSelfReport(health);
      cachedSelfReport = { report: degraded, fetchedAt: now };
      return degraded;
    }

    const hqttData = await fetchHqttSelfReport();
    const report: JarvisSelfReport = {
      generatedAt: new Date().toISOString(),
      health,
      activeCapabilities: hqttData.activeCapabilities ?? [],
      disabledTools: hqttData.disabledTools ?? [],
      recentFailures: hqttData.recentFailures ?? [],
      recurringFailureMotifs: hqttData.recurringFailureMotifs ?? [],
      confidenceLevel: hqttData.confidenceLevel ?? 0.5,
      pendingRepairs: hqttData.pendingRepairs ?? [],
      learnedNotes: hqttData.learnedNotes ?? [],
      brainGrowth: hqttData.brainGrowth ?? null,
      physiology: hqttData.physiology ?? null,
      residency: hqttData.residency ?? null,
    };
    cachedSelfReport = { report, fetchedAt: now };
    return report;
  },

  /**
   * Get health snapshot (cached for 30s).
   */
  async health(): Promise<JarvisHealthSnapshot> {
    const now = Date.now();
    if (cachedHealth && now - cachedHealth.fetchedAt < HEALTH_CACHE_TTL_MS) {
      return cachedHealth.snapshot;
    }

    if (!hqttEnabled) {
      const local = buildLocalHealthSnapshot();
      cachedHealth = { snapshot: local, fetchedAt: now };
      return local;
    }

    const start = Date.now();
    const available = await hqttAvailable();
    const latency = Date.now() - start;

    if (!available) {
      const local = buildLocalHealthSnapshot();
      cachedHealth = { snapshot: local, fetchedAt: now };
      return local;
    }

    const hqttHealth = await fetchHqttHealth();
    // Detect stub mode: if HQTT returns minimal/empty data with no real tools or memoryStats
    const isStub = (hqttHealth.tools ?? []).length === 0 &&
      (!hqttHealth.memoryStats || (hqttHealth.memoryStats.threadMessages === 0 &&
        hqttHealth.memoryStats.episodes === 0));
    const snapshot: JarvisHealthSnapshot = {
      status: (hqttHealth.status as JarvisHealthStatus) ?? "healthy",
      uptimeSeconds: hqttHealth.uptimeSeconds ?? Math.floor(process.uptime()),
      hqttConnected: true,
      hqttStubMode: isStub,
      hqttLatencyMs: latency,
      activeProvider: "hqtt",
      fallbackProvider: "groq",
      tools: hqttHealth.tools ?? [],
      lastObserverRun: hqttHealth.lastObserverRun ?? null,
      lastSelfReportAt: new Date().toISOString(),
      memoryStats: hqttHealth.memoryStats ?? {
        threadMessages: 0,
        userFacts: 0,
        episodes: 0,
        procedures: 0,
      },
    };
    cachedHealth = { snapshot, fetchedAt: now };
    return snapshot;
  },

  /**
   * Read memory from HQTT.
   */
  async memoryRead(layer: JarvisMemoryLayer, key: string): Promise<JarvisMemoryEnvelope | null> {
    if (!hqttEnabled) return null;
    try {
      return await hqttFetch<JarvisMemoryEnvelope>({
        path: "/v1/jarvis/memory",
        method: "POST",
        body: { action: "read", layer, key },
      });
    } catch {
      return null;
    }
  },

  /**
   * Write memory to HQTT.
   */
  async memoryWrite(envelope: Omit<JarvisMemoryEnvelope, "id" | "createdAt" | "updatedAt">): Promise<boolean> {
    if (!hqttEnabled) return false;
    try {
      await hqttFetch({
        path: "/v1/jarvis/memory",
        method: "POST",
        body: { action: "write", ...envelope },
      });
      return true;
    } catch {
      return false;
    }
  },

  /**
   * Ingest a trace record into HQTT's episodic memory.
   */
  async traceIngest(trace: JarvisTraceRecord): Promise<boolean> {
    if (!hqttEnabled) return false;
    try {
      await hqttFetch({
        path: "/v1/jarvis/trace",
        method: "POST",
        body: trace,
      });
      return true;
    } catch {
      return false;
    }
  },

  /**
   * Request a gap report from HQTT.
   */
  async gapReport(): Promise<JarvisGapReport | null> {
    if (!hqttEnabled) return null;
    try {
      return await hqttFetch<JarvisGapReport>({
        path: "/v1/jarvis/gap-report",
        timeoutMs: 15_000,
      });
    } catch {
      return null;
    }
  },

  /**
   * Trigger an evolution step in HQTT (generation / mutation).
   */
  async evolve(): Promise<{ success: boolean; generation?: number } | null> {
    if (!hqttEnabled) return null;
    try {
      return await hqttFetch({
        path: "/v1/jarvis/evolve",
        method: "POST",
        body: {},
      });
    } catch {
      return null;
    }
  },

  /**
   * Get HQTT living supervisor state.
   */
  async supervisorState(): Promise<{
    cycleCount: number;
    state: string;
    nextStepIndex: number;
    autoPromote: boolean;
    brainGrowth: JarvisBrainGrowth | null;
    physiology: Partial<Record<HqttPhysiologySignal, number>> | null;
    residency: Partial<Record<HqttResidencyMetric, number>> | null;
  } | null> {
    if (!hqttEnabled) return null;
    try {
      return await hqttFetch({
        path: "/v1/jarvis/supervisor",
        timeoutMs: 5000,
      });
    } catch {
      return null;
    }
  },

  /**
   * Get degradation info when HQTT is unavailable.
   */
  fallbackInfo(): {
    degraded: boolean;
    reason: string;
    availableCapabilities: string[];
    unavailableCapabilities: string[];
  } {
    return {
      degraded: !hqttEnabled,
      reason: hqttEnabled ? "HQTT configured" : "HQTT not configured or disabled",
      availableCapabilities: [
        "chat",
        "tool_execution",
        "observer_basic",
        "autofix_proposals",
      ],
      unavailableCapabilities: hqttEnabled
        ? []
        : [
            "reflection",
            "self_report_full",
            "gap_report",
            "brain_growth_tracking",
            "physiology_monitoring",
            "evolution",
            "episodic_memory_hqtt",
            "procedural_memory_hqtt",
          ],
    };
  },

  /** Invalidate cached health/self-report */
  invalidateCache(): void {
    cachedHealth = null;
    cachedSelfReport = null;
  },
};
