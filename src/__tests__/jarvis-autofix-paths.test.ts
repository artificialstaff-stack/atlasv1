import { describe, expect, it } from "vitest";
import { buildJarvisBranchName, buildJarvisWorktreePath } from "@/lib/jarvis";

describe("jarvis autofix paths", () => {
  it("creates codex branch names for proposals", () => {
    const branchName = buildJarvisBranchName("/panel/store", "jarvis-proposal-12345678");
    expect(branchName.startsWith("codex/jarvis-")).toBe(true);
    expect(branchName).toContain("panel-store");
  });

  it("places proposal worktrees outside the repo tree by default", () => {
    const worktreePath = buildJarvisWorktreePath("codex/jarvis-panel-store-12345678", "jarvis-proposal-12345678");
    expect(worktreePath.replace(/\\/g, "/")).toContain("/.codex/worktrees/jarvis/");
  });
});
