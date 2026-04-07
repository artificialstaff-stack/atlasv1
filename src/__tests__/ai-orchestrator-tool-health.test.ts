import { afterEach, describe, expect, it } from "vitest";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import type { ToolSpec } from "@/lib/admin-copilot/types";
import { applyPersistedToolHealth, filterSelectableAgentTools, isToolSelectable } from "@/lib/ai/orchestrator/health";

function createTool(partial: Partial<ToolSpec> = {}): ToolSpec {
  return {
    id: "agent:browser_extract_page",
    name: "browser_extract_page",
    description: "Browser page extractor",
    domain: "research",
    source: "agent",
    approvalClass: "read_only",
    risk: "low",
    workerTarget: "browser_local",
    enabled: true,
    requiredContext: [],
    inputSchema: ["url"],
    healthStatus: "degraded",
    healthSummary: "default",
    healthChecks: [],
    lastVerifiedAt: null,
    selectable: true,
    selectabilityReason: null,
    ...partial,
  };
}

describe("ai orchestrator tool health", () => {
  const originalStorePath = process.env.ATLAS_TOOL_HEALTH_STORE_PATH;

  afterEach(() => {
    if (originalStorePath) {
      process.env.ATLAS_TOOL_HEALTH_STORE_PATH = originalStorePath;
    } else {
      delete process.env.ATLAS_TOOL_HEALTH_STORE_PATH;
    }
  });

  it("applies persisted unhealthy records to the registry snapshot", () => {
    const tempDir = mkdtempSync(path.join(os.tmpdir(), "atlas-tool-health-"));
    const storePath = path.join(tempDir, "registry-health.json");
    process.env.ATLAS_TOOL_HEALTH_STORE_PATH = storePath;

    writeFileSync(storePath, JSON.stringify({
      verifiedAt: "2026-03-21T12:00:00.000Z",
      tools: {
        "agent:browser_extract_page": {
          toolId: "agent:browser_extract_page",
          status: "unhealthy",
          summary: "Playwright missing",
          checks: ["browser:playwright-missing"],
          lastVerifiedAt: "2026-03-21T12:00:00.000Z",
        },
      },
    }), "utf8");

    const snapshot = applyPersistedToolHealth([createTool()]);

    expect(snapshot.verifiedAt).toBe("2026-03-21T12:00:00.000Z");
    expect(snapshot.tools[0]?.healthStatus).toBe("unhealthy");
    expect(snapshot.tools[0]?.healthSummary).toContain("Playwright");

    rmSync(tempDir, { recursive: true, force: true });
  });

  it("blocks unhealthy tools from agent selection", () => {
    const tempDir = mkdtempSync(path.join(os.tmpdir(), "atlas-tool-health-"));
    const storePath = path.join(tempDir, "registry-health.json");
    process.env.ATLAS_TOOL_HEALTH_STORE_PATH = storePath;

    writeFileSync(storePath, JSON.stringify({
      verifiedAt: "2026-03-21T12:00:00.000Z",
      tools: {
        "agent:browser_extract_page": {
          toolId: "agent:browser_extract_page",
          status: "unhealthy",
          summary: "Playwright missing",
          checks: [],
          lastVerifiedAt: "2026-03-21T12:00:00.000Z",
        },
      },
    }), "utf8");

    expect(isToolSelectable("agent", "browser_extract_page")).toBe(false);

    const filtered = filterSelectableAgentTools([
      { name: "browser_extract_page" },
      { name: "fetch_webpage" },
    ]);

    expect(filtered.map((tool) => tool.name)).toEqual(["fetch_webpage"]);

    rmSync(tempDir, { recursive: true, force: true });
  });

  it("prunes unknown tools until they are verified", () => {
    const tempDir = mkdtempSync(path.join(os.tmpdir(), "atlas-tool-health-"));
    const storePath = path.join(tempDir, "registry-health.json");
    process.env.ATLAS_TOOL_HEALTH_STORE_PATH = storePath;

    writeFileSync(storePath, JSON.stringify({
      verifiedAt: "2026-03-21T12:00:00.000Z",
      tools: {
        "agent:browser_extract_page": {
          toolId: "agent:browser_extract_page",
          status: "unknown",
          summary: "Verification missing",
          checks: [],
          lastVerifiedAt: "2026-03-21T12:00:00.000Z",
        },
      },
    }), "utf8");

    const snapshot = applyPersistedToolHealth([createTool()]);

    expect(snapshot.tools[0]?.selectable).toBe(false);
    expect(snapshot.tools[0]?.selectabilityReason).toContain("prune");
    expect(isToolSelectable("agent", "browser_extract_page")).toBe(false);

    rmSync(tempDir, { recursive: true, force: true });
  });

  it("keeps degraded tools selectable", () => {
    const tempDir = mkdtempSync(path.join(os.tmpdir(), "atlas-tool-health-"));
    const storePath = path.join(tempDir, "registry-health.json");
    process.env.ATLAS_TOOL_HEALTH_STORE_PATH = storePath;

    writeFileSync(storePath, JSON.stringify({
      verifiedAt: "2026-03-21T12:00:00.000Z",
      tools: {
        "agent:browser_extract_page": {
          toolId: "agent:browser_extract_page",
          status: "degraded",
          summary: "Approval required",
          checks: [],
          lastVerifiedAt: "2026-03-21T12:00:00.000Z",
        },
      },
    }), "utf8");

    const snapshot = applyPersistedToolHealth([createTool()]);

    expect(snapshot.tools[0]?.selectable).toBe(true);
    expect(isToolSelectable("agent", "browser_extract_page")).toBe(true);

    rmSync(tempDir, { recursive: true, force: true });
  });
});
