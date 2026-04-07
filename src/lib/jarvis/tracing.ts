/**
 * ─── Tracing ───
 *
 * Unified trace recording for all Jarvis operations.
 * Every chat, observation, reflection, autofix, and background scan
 * gets a trace record that persists to both Supabase and HQTT.
 *
 * Used by the admin dashboard for observability and
 * by the reflection pipeline for pattern detection.
 */

import { randomUUID } from "node:crypto";
import { createAdminClient } from "@/lib/supabase/admin";
import { JarvisCoreAdapter } from "./core-adapter";
import { runId as toRunId, conversationId as toConversationId } from "./contracts";
import type { JarvisTraceRecord, JarvisTraceToolCall } from "./brain-types";
import type { JarvisProviderLane, JarvisRunId } from "./contracts";

// ──────────────────────────────────────
// Trace Builder
// ──────────────────────────────────────

export function createTrace(params: {
  traceType: JarvisTraceRecord["traceType"];
  input: string;
  conversationId?: string;
}): TraceBuilder {
  return new TraceBuilder(params);
}

export class TraceBuilder {
  private record: JarvisTraceRecord;
  private startMs: number;

  constructor(params: {
    traceType: JarvisTraceRecord["traceType"];
    input: string;
    conversationId?: string;
  }) {
    this.startMs = Date.now();
    this.record = {
      id: randomUUID(),
      runId: toRunId(randomUUID()),
      conversationId: params.conversationId as JarvisTraceRecord["conversationId"],
      traceType: params.traceType,
      input: params.input,
      provider: "groq" as JarvisProviderLane,
      model: "",
      toolCalls: [],
      approvalDecisions: [],
      artifacts: [],
      failures: [],
      startTime: new Date(this.startMs).toISOString(),
      endTime: "",
      durationMs: 0,
    };
  }

  setProvider(provider: JarvisProviderLane, model: string): this {
    this.record.provider = provider;
    this.record.model = model;
    return this;
  }

  addToolCall(call: JarvisTraceToolCall): this {
    this.record.toolCalls.push(call);
    return this;
  }

  addApproval(approvalId: string, decision: "approved" | "rejected", actor: string): this {
    this.record.approvalDecisions.push({ approvalId, decision, actor });
    return this;
  }

  addArtifact(artifact: string): this {
    this.record.artifacts.push(artifact);
    return this;
  }

  addFailure(failure: string): this {
    this.record.failures.push(failure);
    return this;
  }

  setFallbackPath(path: string): this {
    this.record.fallbackPath = path;
    return this;
  }

  /**
   * Finalize and persist the trace to both Supabase and HQTT.
   */
  async finish(): Promise<JarvisTraceRecord> {
    const endMs = Date.now();
    this.record.endTime = new Date(endMs).toISOString();
    this.record.durationMs = endMs - this.startMs;

    // Persist to Supabase (fire-and-forget)
    persistTraceToSupabase(this.record).catch(() => {});

    // Sync to HQTT (fire-and-forget)
    JarvisCoreAdapter.traceIngest(this.record).catch(() => {});

    return this.record;
  }

  /** Get the current trace record without persisting */
  peek(): Readonly<JarvisTraceRecord> {
    return { ...this.record };
  }
}

// ──────────────────────────────────────
// Supabase Persistence
// ──────────────────────────────────────

async function persistTraceToSupabase(trace: JarvisTraceRecord): Promise<void> {
  const supabase = createAdminClient();
  await (supabase.from as any)("jarvis_traces").insert({
    id: trace.id,
    run_id: trace.runId,
    conversation_id: trace.conversationId ?? null,
    trace_type: trace.traceType,
    input: trace.input,
    provider: trace.provider,
    model: trace.model,
    tool_calls: trace.toolCalls,
    approval_decisions: trace.approvalDecisions,
    artifacts: trace.artifacts,
    failures: trace.failures,
    fallback_path: trace.fallbackPath ?? null,
    self_report_snapshot: trace.selfReportSnapshot ?? null,
    start_time: trace.startTime,
    end_time: trace.endTime,
    duration_ms: trace.durationMs,
  });
}

// ──────────────────────────────────────
// Trace Query
// ──────────────────────────────────────

export async function getRecentTraces(
  limit = 50,
  traceType?: JarvisTraceRecord["traceType"],
): Promise<JarvisTraceRecord[]> {
  const supabase = createAdminClient();
  let query = (supabase.from as any)("jarvis_traces")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (traceType) {
    query = query.eq("trace_type", traceType);
  }

  const { data } = await query;
  if (!data) return [];

  return (data as Record<string, unknown>[]).map((row) => ({
    id: String(row.id),
    runId: String(row.run_id) as JarvisRunId,
    conversationId: row.conversation_id ? toConversationId(String(row.conversation_id)) : undefined,
    traceType: String(row.trace_type) as JarvisTraceRecord["traceType"],
    input: String(row.input),
    provider: String(row.provider) as JarvisProviderLane,
    model: String(row.model),
    toolCalls: (row.tool_calls ?? []) as JarvisTraceToolCall[],
    approvalDecisions: (row.approval_decisions ?? []) as JarvisTraceRecord["approvalDecisions"],
    artifacts: (row.artifacts ?? []) as string[],
    failures: (row.failures ?? []) as string[],
    fallbackPath: row.fallback_path ? String(row.fallback_path) : undefined,
    selfReportSnapshot: row.self_report_snapshot as JarvisTraceRecord["selfReportSnapshot"],
    startTime: String(row.start_time),
    endTime: String(row.end_time),
    durationMs: Number(row.duration_ms),
  }));
}
