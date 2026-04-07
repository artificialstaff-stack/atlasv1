import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { resolveAtlasOutputPath, resolveAtlasProjectRoot } from "@/lib/runtime-paths";

const originalProjectRoot = process.env.ATLAS_PROJECT_ROOT;

afterEach(() => {
  if (originalProjectRoot === undefined) {
    delete process.env.ATLAS_PROJECT_ROOT;
  } else {
    process.env.ATLAS_PROJECT_ROOT = originalProjectRoot;
  }
});

describe("runtime paths", () => {
  it("uses an explicit project root when provided", () => {
    process.env.ATLAS_PROJECT_ROOT = "C:/atlas/custom-root";

    expect(resolveAtlasProjectRoot()).toBe(path.resolve("C:/atlas/custom-root"));
    expect(resolveAtlasOutputPath("operator-jobs", "jobs.json")).toBe(
      path.resolve("C:/atlas/custom-root", "output", "operator-jobs", "jobs.json"),
    );
  });

  it("falls back to the current repo root shape", () => {
    delete process.env.ATLAS_PROJECT_ROOT;

    const resolved = resolveAtlasProjectRoot().replace(/\\/g, "/");
    expect(resolved.endsWith("/atlas-platform")).toBe(true);
    expect(resolveAtlasOutputPath("tool-health", "registry-health.json").replace(/\\/g, "/")).toContain("/output/tool-health/");
  });
});
