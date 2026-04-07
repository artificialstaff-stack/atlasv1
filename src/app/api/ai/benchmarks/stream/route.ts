import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import { requireAdmin } from "@/features/auth/guards";
import { runActionModelTask } from "@/lib/ai/autonomous/action-model";
import { persistBenchmarkResult } from "@/lib/ai/benchmarks/history";
import { getBenchmarkSuiteById } from "@/lib/ai/benchmarks/registry";
import { summarizeBenchmarkSuite } from "@/lib/ai/benchmarks/runner";
import type { BenchmarkTaskResult } from "@/lib/ai/benchmarks/types";
import { getModelRoutingInfo } from "@/lib/ai/client";

function getAdminClient() {
  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
}

function encodeSSE(payload: Record<string, unknown>) {
  return new TextEncoder().encode(`data: ${JSON.stringify(payload)}\n\n`);
}

export async function POST(req: Request) {
  const admin = await requireAdmin().catch(() => null);
  if (!admin) {
    return Response.json({ error: "Yetkiniz yok." }, { status: 401 });
  }

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
  const tasks = suite.tasks.slice(0, maxTasks ?? suite.tasks.length);

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const safeEnqueue = (payload: Record<string, unknown>) => {
        try {
          controller.enqueue(encodeSSE(payload));
        } catch {
          // stream closed
        }
      };
      const safeClose = () => {
        try {
          controller.close();
        } catch {
          // already closed
        }
      };

      const taskResults: BenchmarkTaskResult[] = [];
      const sessionId = crypto.randomUUID();

      try {
        safeEnqueue({
          type: "benchmark_start",
          data: {
            suite: {
              id: suite.id,
              name: suite.name,
              description: suite.description,
              source: suite.source,
              taskCount: tasks.length,
            },
            provider: getModelRoutingInfo(),
          },
        });

        for (const task of tasks) {
          safeEnqueue({
            type: "task_start",
            data: {
              taskId: task.id,
              title: task.title,
              description: task.description,
              successCriteria: task.successCriteria,
            },
          });

          const run = await runActionModelTask(task, {
            toolContext: {
              supabase,
              userId: admin.id ?? "system",
              sessionId,
            },
            onEvent: (event) => {
              safeEnqueue({
                type: "task_event",
                data: event,
              });
            },
          });

          taskResults.push({ task, run });

          safeEnqueue({
            type: "task_complete",
            data: {
              taskId: task.id,
              success: run.success,
              score: run.verification.score,
              durationMs: run.durationMs,
              finalAnswer: run.finalAnswer,
            },
          });
        }

        const rawResult = summarizeBenchmarkSuite({ ...suite, tasks }, taskResults);
        let result = rawResult;
        try {
          result = await persistBenchmarkResult(supabase, admin.id ?? "system", rawResult);
        } catch (persistError) {
          safeEnqueue({
            type: "benchmark_warning",
            data: {
              message: "Benchmark sonucu canlı veritabanına kaydedilemedi; sonuç yine de üretildi.",
              detail: persistError instanceof Error ? persistError.message : String(persistError),
            },
          });
        }

        safeEnqueue({
          type: "benchmark_complete",
          data: result,
        });
      } catch (error) {
        safeEnqueue({
          type: "error",
          data: {
            message: error instanceof Error ? error.message : "Benchmark stream hatası",
          },
        });
      } finally {
        safeClose();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-store, must-revalidate",
      Connection: "keep-alive",
      "X-Atlas-Benchmark": suite.id,
    },
  });
}
