/**
 * ─── User Memory ───
 *
 * Long-term user/app memory: preferences, customer context, operation history.
 * Stored in Supabase jarvis_user_memory table.
 */

import { createAdminClient } from "@/lib/supabase/admin";
import { JarvisCoreAdapter } from "../core-adapter";
import type { JarvisUserFact } from "./types";
import { randomUUID } from "node:crypto";

export async function writeUserFact(params: {
  userId: string;
  key: string;
  value: string;
  confidence?: number;
  source?: string;
}): Promise<JarvisUserFact | null> {
  const supabase = createAdminClient();
  const now = new Date().toISOString();

  // Upsert: update if key exists for this user, insert otherwise
  const { data: existing } = await (supabase.from as any)("jarvis_user_memory")
    .select("id")
    .eq("user_id", params.userId)
    .eq("key", params.key)
    .single();

  if (existing) {
    const { data, error } = await (supabase
      .from as any)("jarvis_user_memory")
      .update({
        value: params.value,
        confidence: params.confidence ?? 0.8,
        source: params.source ?? "atlas",
        last_accessed_at: now,
        updated_at: now,
      })
      .eq("id", existing.id)
      .select()
      .single();

    if (error || !data) return null;
    const fact = mapRow(data);
    syncToHqtt(fact);
    return fact;
  }

  const { data, error } = await (supabase
    .from as any)("jarvis_user_memory")
    .insert({
      id: randomUUID(),
      user_id: params.userId,
      key: params.key,
      value: params.value,
      confidence: params.confidence ?? 0.8,
      source: params.source ?? "atlas",
      last_accessed_at: now,
    })
    .select()
    .single();

  if (error || !data) return null;
  const fact = mapRow(data);
  syncToHqtt(fact);
  return fact;
}

export async function readUserFact(userId: string, key: string): Promise<JarvisUserFact | null> {
  const supabase = createAdminClient();
  const { data, error } = await (supabase.from as any)("jarvis_user_memory")
    .select("*")
    .eq("user_id", userId)
    .eq("key", key)
    .single();

  if (error || !data) return null;

  // Touch last_accessed_at
  (supabase.from as any)("jarvis_user_memory")
    .update({ last_accessed_at: new Date().toISOString() })
    .eq("id", data.id)
    .then(() => {});

  return mapRow(data);
}

export async function getUserFacts(userId: string, limit: number = 100): Promise<JarvisUserFact[]> {
  const supabase = createAdminClient();
  const { data, error } = await (supabase.from as any)("jarvis_user_memory")
    .select("*")
    .eq("user_id", userId)
    .order("last_accessed_at", { ascending: false })
    .limit(limit);

  if (error || !data) return [];
  return data.map(mapRow);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapRow(row: any): JarvisUserFact {
  return {
    id: row.id,
    userId: row.user_id,
    key: row.key,
    value: row.value,
    confidence: row.confidence ?? 0.5,
    source: row.source ?? "unknown",
    lastAccessedAt: row.last_accessed_at ?? row.updated_at ?? row.created_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function syncToHqtt(fact: JarvisUserFact): void {
  JarvisCoreAdapter.memoryWrite({
    layer: "user",
    key: `${fact.userId}:${fact.key}`,
    value: fact.value,
    metadata: { source: fact.source, confidence: fact.confidence },
    confidence: fact.confidence,
    source: "atlas_user_memory",
  }).catch(() => {});
}
