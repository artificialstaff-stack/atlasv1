/**
 * ─── Atlas Platform — Backup & Disaster Recovery Service ───
 * Application-level backup utilities for critical data.
 * Uses Supabase for data export/snapshot capabilities.
 */

import { createClient } from "@/lib/supabase/server";

export interface BackupManifest {
  id: string;
  createdAt: string;
  tables: string[];
  recordCounts: Record<string, number>;
  status: "pending" | "completed" | "failed";
  sizeEstimate: string;
}

const BACKUP_TABLES = [
  "users",
  "products",
  "orders",
  "invoices",
  "notifications",
  "audit_logs",
] as const;

/** Create a JSON snapshot of all user data (per-tenant backup) */
export async function createUserBackup(userId: string): Promise<{
  manifest: BackupManifest;
  data: Record<string, unknown[]>;
}> {
  const supabase = await createClient();
  const data: Record<string, unknown[]> = {};
  const recordCounts: Record<string, number> = {};

  // Export each table filtered by user_id
  for (const table of BACKUP_TABLES) {
    if (table === "users") {
      const { data: userData } = await supabase
        .from("users")
        .select("*")
        .eq("id", userId);
      data[table] = userData ?? [];
    } else if (table === "products") {
      const { data: tableData } = await supabase
        .from("products")
        .select("*")
        .eq("owner_id", userId);
      data[table] = tableData ?? [];
    } else {
      const { data: tableData } = await supabase
        .from(table)
        .select("*")
        .eq("user_id", userId);
      data[table] = tableData ?? [];
    }
    recordCounts[table] = data[table].length;
  }

  const jsonStr = JSON.stringify(data);
  const sizeKB = Math.round(new TextEncoder().encode(jsonStr).length / 1024);

  const manifest: BackupManifest = {
    id: `backup_${userId}_${Date.now()}`,
    createdAt: new Date().toISOString(),
    tables: [...BACKUP_TABLES],
    recordCounts,
    status: "completed",
    sizeEstimate: sizeKB > 1024 ? `${(sizeKB / 1024).toFixed(1)} MB` : `${sizeKB} KB`,
  };

  return { manifest, data };
}

/** Health check for critical database tables */
export async function checkDatabaseHealth(): Promise<{
  status: "healthy" | "degraded" | "unhealthy";
  checks: Record<string, { ok: boolean; latencyMs: number }>;
}> {
  const supabase = await createClient();
  const checks: Record<string, { ok: boolean; latencyMs: number }> = {};
  let failCount = 0;

  for (const table of BACKUP_TABLES) {
    const start = Date.now();
    try {
      const { error } = await supabase.from(table).select("id").limit(1);
      checks[table] = { ok: !error, latencyMs: Date.now() - start };
      if (error) failCount++;
    } catch {
      checks[table] = { ok: false, latencyMs: Date.now() - start };
      failCount++;
    }
  }

  return {
    status: failCount === 0 ? "healthy" : failCount <= 2 ? "degraded" : "unhealthy",
    checks,
  };
}

/** Recovery point objective: how recent is the latest data */
export async function getRecoveryPoint(userId: string): Promise<{
  latestUpdate: string | null;
  dataAge: string;
}> {
  const supabase = await createClient();

  // Find the most recent modification across all tables
  const tables = ["orders", "products", "invoices"] as const;
  let latestUpdate: string | null = null;

  for (const table of tables) {
    const userCol = table === "products" ? "owner_id" : "user_id";
    const { data } = await supabase
      .from(table)
      .select("updated_at")
      .eq(userCol, userId)
      .order("updated_at", { ascending: false })
      .limit(1);

    if (data?.[0]?.updated_at) {
      if (!latestUpdate || data[0].updated_at > latestUpdate) {
        latestUpdate = data[0].updated_at;
      }
    }
  }

  const ageMs = latestUpdate ? Date.now() - new Date(latestUpdate).getTime() : 0;
  const hours = Math.floor(ageMs / (1000 * 60 * 60));
  const minutes = Math.floor((ageMs % (1000 * 60 * 60)) / (1000 * 60));

  return {
    latestUpdate,
    dataAge: latestUpdate ? `${hours}h ${minutes}m` : "No data",
  };
}
