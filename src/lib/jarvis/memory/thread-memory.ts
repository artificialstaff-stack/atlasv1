/**
 * ─── Thread Memory ───
 *
 * Short-term conversation context. Wraps the existing agent_conversations
 * Supabase table and adds threadId/workspaceId tracking.
 * Syncs summaries to HQTT fast_episode_trace via the adapter.
 */

import { createAdminClient } from "@/lib/supabase/admin";
import { JarvisCoreAdapter } from "../core-adapter";
import type { JarvisThreadMessage } from "./types";

const MAX_THREAD_TOKENS = 8000;

function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

export async function saveThreadMessage(params: {
  sessionId: string;
  threadId: string;
  workspaceId?: string | null;
  userId: string;
  role: JarvisThreadMessage["role"];
  content: string;
  metadata?: Record<string, unknown>;
}): Promise<JarvisThreadMessage | null> {
  const supabase = createAdminClient();
  const tokenCount = estimateTokens(params.content);
  const record = {
    user_id: params.userId,
    session_id: params.sessionId,
    role: params.role,
    content: params.content,
    metadata: {
      ...(params.metadata ?? {}),
      threadId: params.threadId,
      workspaceId: params.workspaceId ?? null,
    },
    token_count: tokenCount,
  };

  const { data, error } = await supabase
    .from("agent_conversations")
    .insert(record as never)
    .select()
    .single();

  if (error || !data) return null;

  // Fire-and-forget: sync to HQTT thread memory
  JarvisCoreAdapter.memoryWrite({
    layer: "thread",
    key: `${params.sessionId}:${params.threadId}:${data.id}`,
    value: params.content,
    metadata: { role: params.role, userId: params.userId },
    confidence: 1,
    source: "atlas_thread",
  }).catch(() => {});

  return {
    id: data.id,
    sessionId: params.sessionId,
    threadId: params.threadId,
    workspaceId: params.workspaceId ?? null,
    userId: params.userId,
    role: params.role,
    content: params.content,
    metadata: record.metadata,
    tokenCount,
    createdAt: data.created_at,
  };
}

export async function getThreadMessages(
  sessionId: string,
  threadId?: string,
  maxTokens: number = MAX_THREAD_TOKENS,
): Promise<JarvisThreadMessage[]> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("agent_conversations")
    .select("*")
    .eq("session_id", sessionId)
    .order("created_at", { ascending: true });

  if (error || !data) return [];

  // Filter by threadId if provided
  const filtered = threadId
    ? data.filter((row) => {
        const meta = row.metadata as Record<string, unknown> | null;
        return meta?.threadId === threadId;
      })
    : data;

  // Apply token budget (take from end)
  let totalTokens = 0;
  const result: JarvisThreadMessage[] = [];
  for (let i = filtered.length - 1; i >= 0; i--) {
    const row = filtered[i];
    totalTokens += row.token_count ?? estimateTokens(row.content ?? "");
    if (totalTokens > maxTokens) break;
    const meta = (row.metadata ?? {}) as Record<string, unknown>;
    result.unshift({
      id: row.id,
      sessionId: row.session_id,
      threadId: (meta.threadId as string) ?? "",
      workspaceId: (meta.workspaceId as string) ?? null,
      userId: row.user_id,
      role: row.role as JarvisThreadMessage["role"],
      content: row.content,
      metadata: meta,
      tokenCount: row.token_count ?? 0,
      createdAt: row.created_at,
    });
  }
  return result;
}
