import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import { requireAdmin } from "@/lib/auth/require-admin";
import { evaluateBenchmarkHistory } from "@/lib/ai/benchmarks/evaluation";
import { listRecentBenchmarkRuns } from "@/lib/ai/benchmarks/history";
import { getBenchmarkSuites, summarizeBenchmarkSuites } from "@/lib/ai/benchmarks/registry";
import { hasBenchmarkServiceAccess } from "@/lib/ai/benchmarks/service-auth";

function getAdminClient() {
  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
}

export async function GET(request: Request) {
  const admin = hasBenchmarkServiceAccess(request) ? { id: "benchmark-service" } : await requireAdmin();
  if (!admin) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const enforce = searchParams.get("enforce") === "1";
  const supabase = getAdminClient();
  const runs = await listRecentBenchmarkRuns(supabase, 20);
  const suites = summarizeBenchmarkSuites(getBenchmarkSuites());
  const evaluation = evaluateBenchmarkHistory(runs, suites);
  const releaseOpen = evaluation.health.status === "pass";

  if (enforce && !releaseOpen) {
    return Response.json(
      {
        error: "Release gate blocked",
        releaseOpen,
        health: evaluation.health,
      },
      { status: 409 },
    );
  }

  return Response.json({
    releaseOpen,
    health: evaluation.health,
  });
}
