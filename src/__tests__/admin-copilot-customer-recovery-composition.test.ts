import { afterEach, describe, expect, it, vi } from "vitest";

const mockedExecuteSubAgent = vi.fn();

vi.mock("@/lib/ai/autonomous/sub-agents", () => ({
  getAgentName: (agent: string) => `Ajan:${agent}`,
  executeSubAgent: mockedExecuteSubAgent,
}));

describe("admin copilot customer recovery composition", () => {
  afterEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  it("extends customer recovery into internal note and checklist in the same turn", async () => {
    mockedExecuteSubAgent
      .mockResolvedValueOnce({
        summary: "İç ekip notu hazırlandı",
        text: "LLC tarafında under_review kayıt var. Amazon onboarding görevi açık; önce intake ve EIN takibini netleştirelim.",
      })
      .mockResolvedValueOnce({
        summary: "Kontrol listesi hazırlandı",
        text: "1. ATL-102 için eksik alanı doğrula\n2. EIN başvuru takibini netleştir\n3. Amazon onboarding planını görev sahibine bağla",
      })
      .mockResolvedValueOnce({
        summary: "Kalite kontrolü tamamlandı: 94/100",
        text: "Genel: 94",
      });

    const { buildComposedCustomerRecoveryResponse } = await import("@/lib/admin-copilot/agent-fallback");
    const result = await buildComposedCustomerRecoveryResponse({
      commandText: "Yusuf Keser tarafinda launch icin ne eksik gorunuyor, once durumu ozetle sonra ic ekip icin kisa not hazirla ve en sonda 3 maddelik bir kontrol listesi cikar.",
      scope: {
        type: "customer",
        refId: "6a3e8856-ef67-4ec1-a856-b92f53795ea1",
        label: "Yusuf Keser",
      },
      recovery: {
        details: [
          "## Eksik bilgi / bekleyen adımlar",
          "1. ATL-102 — under_review — llc_name: Teknofix Finance LLC",
          "## İlgili açık görevler",
          "1. Amazon mağaza onboarding planını hazırla — in_progress",
        ].join("\n"),
        steps: [
          {
            type: "action",
            content: "customer_read_recovery",
            toolName: "customer_read_recovery",
            timestamp: Date.now(),
          },
          {
            type: "final_answer",
            content: "placeholder",
            timestamp: Date.now(),
          },
        ],
      },
      toolContext: {
        supabase: {} as never,
        userId: "admin-test",
        sessionId: "session-test",
      },
    });

    expect(result).not.toBeNull();
    expect(result?.summary).toContain("Yusuf Keser");
    expect(result?.details).toContain("## Durum özeti");
    expect(result?.details).toContain("## İç ekip notu");
    expect(result?.details).toContain("## Kontrol listesi");
    expect(result?.details).toContain("## Kalite notu");
    expect(result?.steps.filter((step) => step.toolName === "subagent.writer").length).toBe(4);
    expect(result?.steps.some((step) => step.toolName === "subagent.quality_checker")).toBe(true);
    expect(result?.steps.at(-1)?.type).toBe("final_answer");
  }, 15_000);
});
