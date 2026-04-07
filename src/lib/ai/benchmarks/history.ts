import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, Json } from "@/types/database";
import type {
  BenchmarkRunHistoryItem,
  BenchmarkSuiteResult,
} from "./types";

type Db = SupabaseClient<Database>;

export async function listRecentBenchmarkRuns(
  supabase: Db,
  limit = 8,
): Promise<BenchmarkRunHistoryItem[]> {
  const { data, error } = await supabase
    .from("ai_benchmark_runs")
    .select("id,suite_id,suite_name,suite_source,provider,model,pass_rate,average_score,completed_tasks,failed_tasks,task_count,total_duration_ms,created_at")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error || !data) {
    return [];
  }

  return data.map((run) => ({
    id: run.id,
    suiteId: run.suite_id,
    suiteName: run.suite_name,
    suiteSource: run.suite_source,
    provider: run.provider,
    model: run.model,
    passRate: Number(run.pass_rate),
    averageScore: Number(run.average_score),
    completedTasks: run.completed_tasks,
    failedTasks: run.failed_tasks,
    taskCount: run.task_count,
    totalDurationMs: run.total_duration_ms,
    createdAt: run.created_at,
  }));
}

export async function persistBenchmarkResult(
  supabase: Db,
  createdBy: string,
  result: BenchmarkSuiteResult,
): Promise<BenchmarkSuiteResult> {
  const { data: createdRun, error: runError } = await supabase
    .from("ai_benchmark_runs")
    .insert({
      suite_id: result.suite.id,
      suite_name: result.suite.name,
      suite_source: result.suite.source ?? "atlas_internal",
      provider: result.provider.provider,
      model: result.provider.model,
      pass_rate: result.passRate,
      average_score: result.averageScore,
      completed_tasks: result.completedTasks,
      failed_tasks: result.failedTasks,
      task_count: result.suite.taskCount,
      total_duration_ms: result.totalDurationMs,
      created_by: createdBy,
      provider_snapshot: result.provider as Json,
    })
    .select("id, created_at")
    .single();

  if (runError || !createdRun) {
    throw new Error(runError?.message ?? "Benchmark run kaydedilemedi.");
  }

  const taskRows = result.taskResults.map((taskResult) => ({
    benchmark_run_id: createdRun.id,
    task_id: taskResult.task.id,
    task_title: taskResult.task.title,
    success: taskResult.run.success,
    score: taskResult.run.verification.score,
    confidence: taskResult.run.verification.confidence,
    duration_ms: taskResult.run.durationMs,
    final_answer: taskResult.run.finalAnswer,
    reasons: taskResult.run.verification.reasons as Json,
    missing_criteria: taskResult.run.verification.missingCriteria as Json,
    suggested_next_step: taskResult.run.verification.suggestedNextStep ?? null,
  }));

  if (taskRows.length > 0) {
    const { error: taskError } = await supabase
      .from("ai_benchmark_task_results")
      .insert(taskRows);

    if (taskError) {
      throw new Error(taskError.message);
    }
  }

  return {
    ...result,
    runId: createdRun.id,
    createdAt: createdRun.created_at,
  };
}
