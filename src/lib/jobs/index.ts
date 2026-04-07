/**
 * ─── Atlas Platform — Background Job Queue ───
 * Simple in-process job queue for scheduled tasks.
 * Uses Vercel Cron Jobs or manual triggers via API.
 *
 * Jobs: stock sync, email reminders, report generation, cleanup.
 */

import { createAdminClient } from "@/lib/supabase/admin";
import { refreshJarvisBrief, runJarvisObservation } from "@/lib/jarvis";

// ─── Job Types ──────────────────────────────────────────
export type JobName =
  | "sync_stock"
  | "send_invoice_reminders"
  | "cleanup_expired_sessions"
  | "generate_weekly_reports"
  | "check_sla_deadlines"
  | "archive_old_audit_logs"
  | "run_jarvis_observer";

export interface JobResult {
  job: JobName;
  success: boolean;
  duration: number;
  message?: string;
  processedCount?: number;
}

interface JobHandler {
  name: JobName;
  description: string;
  handler: () => Promise<JobResult>;
}

// ─── Job Registry ───────────────────────────────────────
const jobRegistry = new Map<JobName, JobHandler>();

function registerJob(job: JobHandler) {
  jobRegistry.set(job.name, job);
}

export function getRegisteredJobs(): JobHandler[] {
  return Array.from(jobRegistry.values());
}

// ─── Job Execution ──────────────────────────────────────
export async function runJob(name: JobName): Promise<JobResult> {
  const job = jobRegistry.get(name);
  if (!job) {
    return {
      job: name,
      success: false,
      duration: 0,
      message: `Job "${name}" not found`,
    };
  }

  const start = Date.now();
  try {
    const result = await job.handler();
    return { ...result, duration: Date.now() - start };
  } catch (err) {
    return {
      job: name,
      success: false,
      duration: Date.now() - start,
      message: err instanceof Error ? err.message : "Unknown error",
    };
  }
}

export async function runAllJobs(): Promise<JobResult[]> {
  const results: JobResult[] = [];
  for (const [name] of jobRegistry) {
    results.push(await runJob(name));
  }
  return results;
}

// ─── Built-in Jobs ──────────────────────────────────────

registerJob({
  name: "run_jarvis_observer",
  description: "Run Atlas Jarvis overnight observer and morning brief refresh",
  handler: async () => {
    if (process.env.ATLAS_OBSERVER_ENABLED !== "1") {
      return {
        job: "run_jarvis_observer",
        success: false,
        duration: 0,
        message: "Jarvis observer disabled",
      };
    }

    const dashboard = await runJarvisObservation("overnight");
    const refreshed = await refreshJarvisBrief();

    return {
      job: "run_jarvis_observer",
      success: true,
      duration: 0,
      processedCount: dashboard.activeFindings.length,
      message: `Jarvis completed ${refreshed.activeFindings.length} open findings across ${refreshed.surfaces.length} surfaces`,
    };
  },
});

registerJob({
  name: "sync_stock",
  description: "Sync cached stock levels from inventory_movements",
  handler: async () => {
    const supabase = createAdminClient();
    // Refresh materialized view or recalculate stock
    const { data, error } = await supabase
      .from("products")
      .select("id", { count: "exact" })
      .eq("is_active", true);

    if (error) throw new Error(error.message);

    return {
      job: "sync_stock",
      success: true,
      duration: 0,
      processedCount: data?.length ?? 0,
      message: `Checked ${data?.length ?? 0} active products`,
    };
  },
});

registerJob({
  name: "send_invoice_reminders",
  description: "Send reminders for pending invoices older than 7 days",
  handler: async () => {
    const supabase = createAdminClient();
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const { data, error } = await supabase
      .from("invoices")
      .select("id, user_id, invoice_number, amount")
      .eq("status", "pending")
      .lt("created_at", sevenDaysAgo.toISOString());

    if (error) throw new Error(error.message);

    // In production, send emails via Resend here
    return {
      job: "send_invoice_reminders",
      success: true,
      duration: 0,
      processedCount: data?.length ?? 0,
      message: `Found ${data?.length ?? 0} overdue invoices`,
    };
  },
});

registerJob({
  name: "cleanup_expired_sessions",
  description: "Remove old notification reads and expired data",
  handler: async () => {
    const supabase = createAdminClient();
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    // Clean old read notifications
    const { count } = await supabase
      .from("notifications")
      .delete({ count: "exact" })
      .eq("is_read", true)
      .lt("created_at", thirtyDaysAgo.toISOString());

    return {
      job: "cleanup_expired_sessions",
      success: true,
      duration: 0,
      processedCount: count ?? 0,
      message: `Cleaned ${count ?? 0} old notifications`,
    };
  },
});

registerJob({
  name: "archive_old_audit_logs",
  description: "Archive audit logs older than 90 days",
  handler: async () => {
    const supabase = createAdminClient();
    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

    const { count } = await supabase
      .from("audit_logs")
      .select("id", { count: "exact" })
      .lt("created_at", ninetyDaysAgo.toISOString());

    return {
      job: "archive_old_audit_logs",
      success: true,
      duration: 0,
      processedCount: count ?? 0,
      message: `Found ${count ?? 0} logs eligible for archival`,
    };
  },
});
