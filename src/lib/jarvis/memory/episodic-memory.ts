/**
 * ─── Episodic Memory ───
 *
 * Records run traces, observer findings, failure/recovery episodes.
 * Stored in Supabase jarvis_episodes table + synced to HQTT via traceIngest.
 */

import { createAdminClient } from "@/lib/supabase/admin";
import { JarvisCoreAdapter } from "../core-adapter";
import type { JarvisEpisode } from "./types";
import type { JarvisTraceRecord } from "../brain-types";
import { randomUUID } from "node:crypto";

export async function recordEpisode(params: Omit<JarvisEpisode, "id" | "createdAt">): Promise<JarvisEpisode | null> {
  const supabase = createAdminClient();
  const episode: JarvisEpisode = {
    ...params,
    id: randomUUID(),
    createdAt: new Date().toISOString(),
  };

  const { error } = await (supabase
    .from as any)("jarvis_episodes")
    .insert({
      id: episode.id,
      run_id: episode.runId,
      trace_type: episode.traceType,
      input: episode.input,
      tool_calls: episode.toolCalls,
      approval_decisions: episode.approvalDecisions,
      artifacts: episode.artifacts,
      failures: episode.failures,
      fallback_path: episode.fallbackPath,
      self_report_snapshot: episode.selfReportSnapshot,
      provider: episode.provider,
      model: episode.model,
      duration_ms: episode.durationMs,
    })
    .single();

  if (error) {
    console.error("[jarvis:episodic] Failed to record episode:", error.message);
  }

  // Fire-and-forget: ingest trace into HQTT
  const trace: JarvisTraceRecord = {
    id: episode.id,
    runId: episode.runId as JarvisTraceRecord["runId"],
    traceType: episode.traceType,
    input: episode.input,
    provider: episode.provider as JarvisTraceRecord["provider"],
    model: episode.model,
    toolCalls: episode.toolCalls,
    approvalDecisions: episode.approvalDecisions,
    artifacts: episode.artifacts,
    failures: episode.failures,
    fallbackPath: episode.fallbackPath ?? undefined,
    startTime: episode.createdAt,
    endTime: new Date().toISOString(),
    durationMs: episode.durationMs,
  };
  JarvisCoreAdapter.traceIngest(trace).catch(() => {});

  return episode;
}

export async function getRecentEpisodes(
  limit: number = 50,
  traceType?: JarvisEpisode["traceType"],
): Promise<JarvisEpisode[]> {
  const supabase = createAdminClient();
  let query = (supabase.from as any)("jarvis_episodes")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (traceType) {
    query = query.eq("trace_type", traceType);
  }

  const { data, error } = await query;
  if (error || !data) return [];

  return (data as any[]).map((row: any) => ({
    id: row.id,
    runId: row.run_id,
    traceType: row.trace_type,
    input: row.input,
    toolCalls: (row.tool_calls ?? []) as JarvisEpisode["toolCalls"],
    approvalDecisions: (row.approval_decisions ?? []) as JarvisEpisode["approvalDecisions"],
    artifacts: row.artifacts ?? [],
    failures: row.failures ?? [],
    fallbackPath: row.fallback_path ?? null,
    selfReportSnapshot: row.self_report_snapshot as Record<string, unknown> | null,
    provider: row.provider,
    model: row.model,
    durationMs: row.duration_ms,
    createdAt: row.created_at,
  }));
}
