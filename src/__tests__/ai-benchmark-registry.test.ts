import { describe, expect, it } from "vitest";
import { getBenchmarkSuites, summarizeBenchmarkSuites } from "@/lib/ai/benchmarks/registry";

describe("Atlas benchmark registry", () => {
  it("always exposes the internal atlas suite as ready", () => {
    const suites = getBenchmarkSuites();
    const atlasSuite = suites.find((suite) => suite.id === "atlas-ops-v1");

    expect(atlasSuite).toBeTruthy();
    expect(atlasSuite?.status).toBe("ready");
    expect(atlasSuite?.source).toBe("atlas_internal");
    expect(atlasSuite?.tasks.length).toBeGreaterThanOrEqual(5);
  });

  it("summarizes suite readiness for UI consumption", () => {
    const summaries = summarizeBenchmarkSuites(getBenchmarkSuites());
    const external = summaries.find((suite) => suite.source === "gaia");

    expect(summaries.some((suite) => suite.id === "atlas-ops-v1")).toBe(true);
    expect(external).toBeTruthy();
    expect(["ready", "requires_config"]).toContain(external?.status);

    if (external?.status === "ready") {
      expect(external.taskCount).toBeGreaterThan(0);
    } else {
      expect(external?.taskCount).toBe(0);
      expect(external?.configurationHint).toContain("ATLAS_BENCHMARK_GAIA_FIXTURE");
    }
  });
});
