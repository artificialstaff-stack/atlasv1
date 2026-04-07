import { getModelRoutingInfo } from "@/lib/ai/client";
import { runActionModelTask } from "@/lib/ai/autonomous/action-model";
import type {
  BenchmarkSuite,
  BenchmarkSuiteResult,
  BenchmarkTaskResult,
  ActionModelOptions,
} from "./types";

export function summarizeBenchmarkSuite(
  suite: BenchmarkSuite,
  taskResults: BenchmarkTaskResult[],
): BenchmarkSuiteResult {
  const completedTasks = taskResults.filter((result) => result.run.success).length;
  const totalDurationMs = taskResults.reduce((sum, result) => sum + result.run.durationMs, 0);
  const totalScore = taskResults.reduce((sum, result) => sum + result.run.verification.score, 0);

  return {
    suite: {
      id: suite.id,
      name: suite.name,
      description: suite.description,
      taskCount: suite.tasks.length,
      source: suite.source,
    },
    provider: getModelRoutingInfo(),
    passRate: suite.tasks.length > 0 ? Number(((completedTasks / suite.tasks.length) * 100).toFixed(1)) : 0,
    averageScore: suite.tasks.length > 0 ? Number((totalScore / suite.tasks.length).toFixed(1)) : 0,
    completedTasks,
    failedTasks: suite.tasks.length - completedTasks,
    totalDurationMs,
    taskResults,
  };
}

export async function runBenchmarkSuite(
  suite: BenchmarkSuite,
  options: ActionModelOptions & { maxTasks?: number },
): Promise<BenchmarkSuiteResult> {
  const taskResults: BenchmarkTaskResult[] = [];
  const tasks = suite.tasks.slice(0, options.maxTasks ?? suite.tasks.length);

  for (const task of tasks) {
    const run = await runActionModelTask(task, options);
    taskResults.push({ task, run });
  }

  return summarizeBenchmarkSuite(
    { ...suite, tasks },
    taskResults,
  );
}
