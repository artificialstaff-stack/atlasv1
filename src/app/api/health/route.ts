import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { logger } from "@/lib/logger";

export const dynamic = "force-dynamic";

interface HealthCheck {
  status: "healthy" | "degraded" | "unhealthy";
  timestamp: string;
  version: string;
  service: string;
  uptime: number;
  checks: {
    database: { status: string; latency?: number };
    auth: { status: string };
    env: { status: string; missing?: string[] };
  };
}

const startTime = Date.now();

/**
 * Deep Health Check endpoint
 * GET /api/health
 *
 * Returns component-level health status for monitoring (UptimeRobot, Datadog, etc.)
 */
export async function GET() {
  const checks: HealthCheck["checks"] = {
    database: { status: "unknown" },
    auth: { status: "unknown" },
    env: { status: "unknown" },
  };

  let overallStatus: HealthCheck["status"] = "healthy";

  // ── Database Check ──
  try {
    const dbStart = Date.now();
    const supabase = await createClient();
    const { error } = await supabase.from("users").select("id").limit(1);
    const latency = Date.now() - dbStart;

    if (error) {
      checks.database = { status: "error", latency };
      overallStatus = "degraded";
    } else {
      checks.database = { status: "ok", latency };
    }
  } catch {
    checks.database = { status: "unreachable" };
    overallStatus = "unhealthy";
  }

  // ── Auth Service Check ──
  try {
    const supabase = await createClient();
    const { error } = await supabase.auth.getSession();
    checks.auth = { status: error ? "error" : "ok" };
    if (error) overallStatus = "degraded";
  } catch {
    checks.auth = { status: "unreachable" };
    overallStatus = "degraded";
  }

  // ── Environment Variables Check ──
  const requiredEnvVars = [
    "NEXT_PUBLIC_SUPABASE_URL",
    "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  ];
  const missing = requiredEnvVars.filter((v) => !process.env[v]);
  if (missing.length > 0) {
    checks.env = { status: "missing", missing };
    overallStatus = "unhealthy";
  } else {
    checks.env = { status: "ok" };
  }

  const health: HealthCheck = {
    status: overallStatus,
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version ?? "0.3.0",
    service: "atlas-platform",
    uptime: Math.floor((Date.now() - startTime) / 1000),
    checks,
  };

  if (overallStatus !== "healthy") {
    logger.warn("Health check degraded", { checks });
  }

  const httpStatus = overallStatus === "unhealthy" ? 503 : 200;
  return NextResponse.json(health, { status: httpStatus });
}
