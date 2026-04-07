import { afterEach, describe, expect, it, vi } from "vitest";

const mockedCreateMasterPlan = vi.fn();
const mockedAnalyzeCommandPreview = vi.fn();
const mockedExecuteSubAgent = vi.fn();

vi.mock("@/lib/ai/autonomous/planner", () => ({
  analyzeCommandPreview: mockedAnalyzeCommandPreview,
  createMasterPlan: mockedCreateMasterPlan,
}));

vi.mock("@/lib/ai/autonomous/sub-agents", () => ({
  getAgentName: (agent: string) => `Ajan:${agent}`,
  executeSubAgent: mockedExecuteSubAgent,
}));

describe("admin copilot autonomous delegation", () => {
  afterEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  it("spawns safe sub-agents for layered natural-language work", async () => {
    mockedAnalyzeCommandPreview.mockReturnValue({
      complexity: "complex",
      domains: ["analysis", "content"],
      requiresAnalysis: true,
      requiresContent: true,
      requiresScheduling: false,
    });

    mockedCreateMasterPlan.mockResolvedValue({
      id: "plan_test",
      commandId: "cmd_test",
      goal: "Operasyon özeti hazırla",
      reasoning: "Analiz, yazım ve kalite kontrol gerekiyor.",
      complexity: "complex",
      estimatedMs: 5000,
      requiresApproval: false,
      autonomyLevel: "full",
      status: "executing",
      createdAt: Date.now(),
      phases: [
        {
          id: 1,
          name: "Araştırma",
          description: "İlk bağlam",
          status: "pending",
          gateType: "auto",
          tasks: [
            {
              id: "task_research",
              phaseId: 1,
              agent: "researcher",
              action: "fetch_domain_data",
              description: "Veriyi çek",
              input: { domains: ["analysis"] },
              dependencies: [],
              status: "pending",
              priority: 1,
              retries: 0,
              maxRetries: 1,
            },
          ],
        },
        {
          id: 2,
          name: "İçerik",
          description: "Özet yaz",
          status: "pending",
          gateType: "auto",
          tasks: [
            {
              id: "task_writer",
              phaseId: 2,
              agent: "writer",
              action: "generate_content",
              description: "Kısa admin özeti yaz",
              input: { type: "report" },
              dependencies: ["task_research"],
              status: "pending",
              priority: 1,
              retries: 0,
              maxRetries: 1,
            },
            {
              id: "task_quality",
              phaseId: 2,
              agent: "quality_checker",
              action: "review_content",
              description: "Kalite kontrolü",
              input: {},
              dependencies: ["task_writer"],
              status: "pending",
              priority: 2,
              retries: 0,
              maxRetries: 1,
            },
          ],
        },
      ],
    });

    mockedExecuteSubAgent
      .mockResolvedValueOnce({ summary: "3 kayıt çekildi", text: "Veri toplandı." })
      .mockResolvedValueOnce({ summary: "Kısa admin özeti yazıldı", text: "Operasyon özeti hazır." })
      .mockResolvedValueOnce({ summary: "Kalite kontrolü tamamlandı", text: "Kalite skoru 92/100." });

    const { runAutonomousDelegation } = await import("@/lib/admin-copilot/agent-fallback");
    const result = await runAutonomousDelegation({
      commandText: "Operasyonu analiz et, kısa admin özeti yaz ve kontrol et.",
      scope: { type: "global" },
      toolContext: {
        supabase: {} as never,
        userId: "admin-test",
        sessionId: "session-test",
      },
    });

    expect(result).not.toBeNull();
    expect(result?.steps.some((step) => step.toolName === "subagent.researcher")).toBe(true);
    expect(result?.steps.some((step) => step.toolName === "subagent.writer")).toBe(true);
    expect(result?.steps.some((step) => step.toolName === "subagent.quality_checker")).toBe(true);
    expect(result?.steps.at(-1)?.type).toBe("final_answer");
    expect(result?.summary).toContain("Otonom ajan");
  }, 15_000);
});
