/**
 * ─── Procedural Memory ───
 *
 * Policies, playbooks, self-heal rules, benchmark-derived strategies.
 * HQTT can propose new procedures; Atlas approves/rejects.
 */

import { createAdminClient } from "@/lib/supabase/admin";
import type { JarvisProcedure, JarvisProcedureKind } from "./types";
import { randomUUID } from "node:crypto";

export async function createProcedure(params: Omit<JarvisProcedure, "id" | "createdAt" | "updatedAt">): Promise<JarvisProcedure | null> {
  const supabase = createAdminClient();
  const now = new Date().toISOString();
  const id = randomUUID();

  const { data, error } = await (supabase
    .from as any)("jarvis_procedures")
    .insert({
      id,
      kind: params.kind,
      name: params.name,
      description: params.description,
      conditions: params.conditions,
      actions: params.actions,
      severity: params.severity,
      enabled: params.enabled,
      source: params.source,
      confidence: params.confidence,
    })
    .select()
    .single();

  if (error || !data) return null;
  return mapRow(data);
}

export async function getProcedures(opts?: {
  kind?: JarvisProcedureKind;
  enabledOnly?: boolean;
  limit?: number;
}): Promise<JarvisProcedure[]> {
  const supabase = createAdminClient();
  let query = (supabase.from as any)("jarvis_procedures")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(opts?.limit ?? 100);

  if (opts?.kind) query = query.eq("kind", opts.kind);
  if (opts?.enabledOnly) query = query.eq("enabled", true);

  const { data, error } = await query;
  if (error || !data) return [];
  return data.map(mapRow);
}

export async function toggleProcedure(id: string, enabled: boolean): Promise<boolean> {
  const supabase = createAdminClient();
  const { error } = await (supabase.from as any)("jarvis_procedures")
    .update({ enabled, updated_at: new Date().toISOString() })
    .eq("id", id);
  return !error;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapRow(row: any): JarvisProcedure {
  return {
    id: row.id,
    kind: row.kind,
    name: row.name,
    description: row.description,
    conditions: row.conditions ?? [],
    actions: row.actions ?? [],
    severity: row.severity ?? "medium",
    enabled: row.enabled ?? true,
    source: row.source ?? "manual",
    confidence: row.confidence ?? 0.5,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}
