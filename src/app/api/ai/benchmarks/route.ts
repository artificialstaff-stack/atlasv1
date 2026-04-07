import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import { requireAdmin } from "@/features/auth/guards";
import { evaluateBenchmarkHistory } from "@/lib/ai/benchmarks/evaluation";
import { listRecentBenchmarkRuns, persistBenchmarkResult } from "@/lib/ai/benchmarks/history";
import { getBenchmarkSuiteById, getBenchmarkSuites, summarizeBenchmarkSuites } from "@/lib/ai/benchmarks/registry";
import { hasBenchmarkServiceAccess } from "@/lib/ai/benchmarks/service-auth";
import { runBenchmarkSuite } from "@/lib/ai/benchmarks/runner";
import { getModelRoutingInfo } from "@/lib/ai/client";

function getAdminClient() {
  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
}

export async function GET(request: Request) {
  const serviceAccess = hasBenchmarkServiceAccess(request);
  const admin = serviceAccess ? { id: "benchmark-service" } : await requireAdmin().catch(() => null);
  if (!admin) {
    return Response.json({ error: "Yetkiniz yok." }, { status: 401 });
  }

  const supabase = getAdminClient();
  const suites = getBenchmarkSuites();
  const suiteSummaries = summarizeBenchmarkSuites(suites);
  const recentRuns = await listRecentBenchmarkRuns(supabase);
  const evaluation = evaluateBenchmarkHistory(recentRuns, suiteSummaries);

  return Response.json({
    status: "ready",
    provider: getModelRoutingInfo(),
    suites: suiteSummaries,
    recentRuns: evaluation.recentRuns,
    health: evaluation.health,
  });
}

export async function POST(req: Request) {
  const serviceAccess = hasBenchmarkServiceAccess(req);
  const admin = serviceAccess ? { id: "benchmark-service" } : await requireAdmin().catch(() => null);
  if (!admin) {
    return Response.json({ error: "Yetkiniz yok." }, { status: 401 });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const suiteId = typeof body.suiteId === "string" && body.suiteId.trim().length > 0
      ? body.suiteId.trim()
      : "atlas-ops-v1";
    const maxTasks =
      typeof body.maxTasks === "number" && body.maxTasks > 0
        ? Math.min(body.maxTasks, 20)
        : undefined;

    const suite = getBenchmarkSuiteById(suiteId);
    if (!suite) {
      return Response.json({ error: "Benchmark suite bulunamadı." }, { status: 404 });
    }
    if (suite.status !== "ready") {
      return Response.json(
        {
          error: "Benchmark suite henüz yapılandırılmamış.",
          detail: suite.configurationHint ?? "Gerekli fixture yapılandırmasını tamamlayın.",
        },
        { status: 400 },
      );
    }

    const supabase = getAdminClient();

    const rawResult = await runBenchmarkSuite(suite, {
      maxTasks,
      toolContext: {
        supabase,
        userId: admin.id ?? "system",
        sessionId: crypto.randomUUID(),
      },
    });
    let result = rawResult;
    try {
      result = await persistBenchmarkResult(supabase, admin.id ?? "system", rawResult);
    } catch (persistError) {
      console.warn("[ai/benchmarks] persistence skipped:", persistError);
    }

    return Response.json(result);
  } catch (error) {
    console.error("[ai/benchmarks] route error:", error);
    return Response.json(
      {
        error: "Benchmark çalıştırılamadı.",
        detail: error instanceof Error ? error.message : "Bilinmeyen hata",
      },
      { status: 500 },
    );
  }
}
