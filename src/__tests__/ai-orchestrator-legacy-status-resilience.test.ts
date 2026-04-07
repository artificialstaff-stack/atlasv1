import { beforeEach, describe, expect, it, vi } from "vitest";

const projectMock = vi.fn(() => []);
const skillsMock = vi.fn(() => []);
const dashboardMock = vi.fn();
const routingInfoMock = vi.fn(() => ({
  provider: "groq",
  model: "openai/gpt-oss-120b",
}));
const toolRegistryMock = vi.fn(() => ({
  tools: [
    {
      id: "sdk:db_inspect_read_schema",
      name: "db_inspect_read_schema",
      description: "schema",
      domain: "operations",
      source: "sdk",
      approvalClass: "read_only",
      risk: "low",
      workerTarget: "database",
      enabled: true,
      requiredContext: [],
      inputSchema: [],
    },
  ],
}));
const toolRegistrySummaryMock = vi.fn(() => ({
  total: 1,
  enabled: 1,
  selectable: 1,
  pruned: 0,
  readOnly: 1,
  mutating: 0,
  browserTools: 0,
  sources: { sdk: 1, agent: 0 },
  domains: { customer: 0, catalog: 0, finance: 0, operations: 1, research: 0, global: 0 },
  healthy: 1,
  degraded: 0,
  unhealthy: 0,
  unknown: 0,
  verifiedAt: null,
}));
const applyPersistedToolHealthMock = vi.fn((snapshot) => snapshot);
const verifyToolRegistryHealthMock = vi.fn();

vi.mock("@/lib/admin-copilot/projects", () => ({
  getCopilotProjects: projectMock,
}));

vi.mock("@/lib/admin-copilot/skills", () => ({
  getCopilotSkills: skillsMock,
}));

vi.mock("@/lib/admin-copilot/service", () => ({
  getCopilotDashboard: dashboardMock,
  getCopilotRun: vi.fn(),
  resolveCopilotApproval: vi.fn(),
  submitCopilotCommand: vi.fn(),
}));

vi.mock("@/lib/ai/client", () => ({
  getModelRoutingInfo: routingInfoMock,
}));

vi.mock("@/lib/ai/orchestrator/registry", () => ({
  getUnifiedToolRegistry: toolRegistryMock,
  getUnifiedToolRegistrySummary: toolRegistrySummaryMock,
}));

vi.mock("@/lib/ai/orchestrator/health", () => ({
  applyPersistedToolHealth: applyPersistedToolHealthMock,
  verifyToolRegistryHealth: verifyToolRegistryHealthMock,
}));

describe("legacy route status resilience", () => {
  beforeEach(() => {
    vi.resetModules();
    projectMock.mockReset();
    skillsMock.mockReset();
    dashboardMock.mockReset();
    routingInfoMock.mockReset();
    toolRegistryMock.mockReset();
    toolRegistrySummaryMock.mockReset();
    applyPersistedToolHealthMock.mockReset();
    verifyToolRegistryHealthMock.mockReset();

    projectMock.mockReturnValue([]);
    skillsMock.mockReturnValue([]);
    dashboardMock.mockResolvedValue({
      dashboard: {
        recentRuns: [],
        pendingApprovals: [],
      },
    });
    routingInfoMock.mockReturnValue({
      provider: "groq",
      model: "openai/gpt-oss-120b",
    });
    toolRegistryMock.mockReturnValue({
      tools: [
        {
          id: "sdk:db_inspect_read_schema",
          name: "db_inspect_read_schema",
          description: "schema",
          domain: "operations",
          source: "sdk",
          approvalClass: "read_only",
          risk: "low",
          workerTarget: "database",
          enabled: true,
          requiredContext: [],
          inputSchema: [],
        },
      ],
    });
    toolRegistrySummaryMock.mockReturnValue({
      total: 1,
      enabled: 1,
      selectable: 1,
      pruned: 0,
      readOnly: 1,
      mutating: 0,
      browserTools: 0,
      sources: { sdk: 1, agent: 0 },
      domains: { customer: 0, catalog: 0, finance: 0, operations: 1, research: 0, global: 0 },
      healthy: 1,
      degraded: 0,
      unhealthy: 0,
      unknown: 0,
      verifiedAt: null,
    });
    applyPersistedToolHealthMock.mockImplementation((snapshot) => snapshot);
    verifyToolRegistryHealthMock.mockResolvedValue({ verifiedAt: new Date().toISOString() });
  });

  it("falls back to a local registry snapshot when registry verification fails", async () => {
    verifyToolRegistryHealthMock.mockRejectedValueOnce(new Error("registry down"));

    const { getLegacyRouteStatus } = await import("@/lib/ai/orchestrator/service");
    const status = await getLegacyRouteStatus("chat");

    expect(status.architecture).toBe("atlas-unified-orchestrator");
    expect(status.engine).toBe("atlas-unified-orchestrator");
    expect(status.engineInfo.source).toBe("chat-facade");
    expect(status.executionPath).toBe("unified-run");
    expect(status.registry.summary.total).toBe(1);
  });

  it("falls back to an empty dashboard when dashboard loading fails", async () => {
    dashboardMock.mockRejectedValueOnce(new Error("dashboard down"));

    const { getLegacyRouteStatus } = await import("@/lib/ai/orchestrator/service");
    const status = await getLegacyRouteStatus("copilot");

    expect(status.recentRuns).toEqual([]);
    expect(status.pendingApprovals).toBe(0);
    expect(status.engineInfo.source).toBe("copilot-facade");
  });
});
