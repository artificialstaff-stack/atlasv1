import { describe, expect, it } from "vitest";
import { createAtlasOpsBenchmarkSuite } from "@/lib/ai/benchmarks/atlas-ops";
import { summarizeBenchmarkSuite } from "@/lib/ai/benchmarks/runner";

describe("Atlas benchmark harness", () => {
  it("builds the atlas ops suite with meaningful tasks", () => {
    const suite = createAtlasOpsBenchmarkSuite();

    expect(suite.id).toBe("atlas-ops-v1");
    expect(suite.tasks.length).toBeGreaterThanOrEqual(5);
    expect(suite.tasks.every((task) => task.successCriteria.length >= 3)).toBe(true);
  });

  it("summarizes benchmark results into pass rate and average score", () => {
    const suite = createAtlasOpsBenchmarkSuite();
    const summary = summarizeBenchmarkSuite(suite, [
      {
        task: suite.tasks[0],
        run: {
          taskId: suite.tasks[0].id,
          success: true,
          finalAnswer: "ok",
          steps: [],
          attemptsUsed: 1,
          verification: {
            passed: true,
            score: 88,
            confidence: 0.8,
            reasons: [],
            missingCriteria: [],
          },
          toolsConsidered: ["platform_health"],
          durationMs: 1200,
        },
      },
      {
        task: suite.tasks[1],
        run: {
          taskId: suite.tasks[1].id,
          success: false,
          finalAnswer: "no",
          steps: [],
          attemptsUsed: 2,
          verification: {
            passed: false,
            score: 52,
            confidence: 0.6,
            reasons: ["eksik"],
            missingCriteria: ["neden"],
          },
          toolsConsidered: ["query_database"],
          durationMs: 900,
        },
      },
    ]);

    expect(summary.passRate).toBe(16.7);
    expect(summary.averageScore).toBe(23.3);
    expect(summary.completedTasks).toBe(1);
    expect(summary.failedTasks).toBe(5);
  });
});
