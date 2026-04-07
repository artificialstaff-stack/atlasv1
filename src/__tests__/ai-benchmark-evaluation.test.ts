import { describe, expect, it } from "vitest";
import { evaluateBenchmarkHistory } from "@/lib/ai/benchmarks/evaluation";
import type { BenchmarkRunHistoryItem, BenchmarkSuiteSummary } from "@/lib/ai/benchmarks/types";

const suites: BenchmarkSuiteSummary[] = [
  {
    id: "atlas-ops-v1",
    name: "AtlasOps v1",
    description: "Internal suite",
    source: "atlas_internal",
    status: "ready",
    taskCount: 6,
  },
];

function createRun(overrides: Partial<BenchmarkRunHistoryItem>): BenchmarkRunHistoryItem {
  return {
    id: overrides.id ?? "run-1",
    suiteId: overrides.suiteId ?? "atlas-ops-v1",
    suiteName: overrides.suiteName ?? "AtlasOps v1",
    suiteSource: overrides.suiteSource ?? "atlas_internal",
    provider: overrides.provider ?? "groq",
    model: overrides.model ?? "llama-3.3-70b-versatile",
    passRate: overrides.passRate ?? 84,
    averageScore: overrides.averageScore ?? 86,
    completedTasks: overrides.completedTasks ?? 5,
    failedTasks: overrides.failedTasks ?? 1,
    taskCount: overrides.taskCount ?? 6,
    totalDurationMs: overrides.totalDurationMs ?? 15_000,
    createdAt: overrides.createdAt ?? "2026-03-20T12:00:00.000Z",
    evaluation: overrides.evaluation,
  };
}

describe("evaluateBenchmarkHistory", () => {
  it("blocks release when no internal benchmark run exists", () => {
    const evaluation = evaluateBenchmarkHistory([], suites, new Date("2026-03-20T13:00:00.000Z"));

    expect(evaluation.health.status).toBe("blocked");
    expect(evaluation.health.summary).toContain("Release gate kapalı");
  });

  it("passes a fresh high-quality internal benchmark", () => {
    const evaluation = evaluateBenchmarkHistory(
      [
        createRun({ id: "latest", createdAt: "2026-03-20T11:30:00.000Z", passRate: 86, averageScore: 88 }),
        createRun({ id: "prev", createdAt: "2026-03-19T09:00:00.000Z", passRate: 81, averageScore: 82 }),
      ],
      suites,
      new Date("2026-03-20T13:00:00.000Z"),
    );

    expect(evaluation.health.status).toBe("pass");
    expect(evaluation.recentRuns[0].evaluation?.isReleaseAnchor).toBe(true);
    expect(evaluation.recentRuns[0].evaluation?.gateStatus).toBe("pass");
  });

  it("watches a regressing but still borderline internal benchmark", () => {
    const evaluation = evaluateBenchmarkHistory(
      [
        createRun({ id: "latest", createdAt: "2026-03-20T10:00:00.000Z", passRate: 72, averageScore: 74 }),
        createRun({ id: "prev", createdAt: "2026-03-19T10:00:00.000Z", passRate: 85, averageScore: 87 }),
      ],
      suites,
      new Date("2026-03-20T13:00:00.000Z"),
    );

    expect(evaluation.health.status).toBe("watch");
    expect(evaluation.health.reasons.join(" ")).toContain("düşüş");
  });

  it("blocks weak internal benchmark output", () => {
    const evaluation = evaluateBenchmarkHistory(
      [createRun({ id: "latest", createdAt: "2026-03-20T10:00:00.000Z", passRate: 45, averageScore: 58 })],
      suites,
      new Date("2026-03-20T13:00:00.000Z"),
    );

    expect(evaluation.health.status).toBe("blocked");
    expect(evaluation.recentRuns[0].evaluation?.gateStatus).toBe("blocked");
  });
});
