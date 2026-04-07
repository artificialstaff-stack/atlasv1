import { readFileSync, statSync, readdirSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const AUTONOMOUS_ROOT = path.resolve(process.cwd(), "src/lib/ai/autonomous");

function collectTypeScriptFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((entry) => {
    const absolutePath = path.join(dir, entry);
    const stats = statSync(absolutePath);

    if (stats.isDirectory()) {
      return collectTypeScriptFiles(absolutePath);
    }

    return absolutePath.endsWith(".ts") || absolutePath.endsWith(".tsx")
      ? [absolutePath]
      : [];
  });
}

describe("ai autonomous modules", () => {
  it("do not import legacy copilot modules directly", () => {
    const files = collectTypeScriptFiles(AUTONOMOUS_ROOT);
    const offenders = files.filter((filePath) => {
      const source = readFileSync(filePath, "utf8");
      return source.includes("@/lib/ai/copilot/") || source.includes("../copilot/");
    });

    expect(offenders).toEqual([]);
  });

  it("keeps autonomous entrypoints focused on the active module boundary", () => {
    const topLevelFiles = readdirSync(AUTONOMOUS_ROOT);
    expect(topLevelFiles).toContain("planner.ts");
    expect(topLevelFiles).toContain("sub-agents.ts");
  });
});
