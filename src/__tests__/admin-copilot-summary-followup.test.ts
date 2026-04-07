import { describe, expect, it } from "vitest";
import { buildConversationSummaryFromConversation } from "@/lib/admin-copilot/agent-fallback";

describe("admin copilot conversational summary follow-up", () => {
  it("builds a short summary from the previous Atlas turn", () => {
    const result = buildConversationSummaryFromConversation({
      commandText: "sonucu ozetle",
      scope: {
        type: "customer",
        refId: "6a3e8856-ef67-4ec1-a856-b92f53795ea1",
        label: "Yusuf Keser",
      },
      conversationContext: [
        "Bu istek devam eden bir sohbetin parçası.",
        "",
        "Kullanıcı: yusuf keser den gelen son formlari oku",
        "Atlas: ## Son formlar",
        "1. ATL-102 — under_review — llc_name: Teknofix Finance LLC",
        "2. ATL-705 — submitted — store_goal: Amazon launch",
      ].join("\n"),
    });

    expect(result).not.toBeNull();
    expect(result?.summary).toContain("Yusuf Keser");
    expect(result?.details).toContain("Kısa özet");
    expect(result?.details).toContain("ATL-102");
    expect(result?.steps.some((step) => step.type === "observation")).toBe(true);
  });
});
