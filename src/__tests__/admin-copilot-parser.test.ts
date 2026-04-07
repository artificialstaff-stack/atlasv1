import { describe, expect, it } from "vitest";
import { parseCommand } from "@/lib/admin-copilot/parser";

describe("admin copilot parser", () => {
  const customerScope = {
    type: "customer" as const,
    refId: "6a3e8856-ef67-4ec1-a856-b92f53795ea1",
    label: "Yusuf Keser",
  };

  it("does not treat LLC status questions as company creation", () => {
    const result = parseCommand("Yusuf Keser LLC ne durumda?", customerScope);
    expect(result.intent).toBe("customer.get_360");
  });

  it("does not treat marketplace status questions as account creation", () => {
    const result = parseCommand("Shopify hesabı ne durumda?", customerScope);
    expect(result.intent).toBe("customer.get_360");
  });

  it("routes submission reading requests to customer context instead of mutation", () => {
    const result = parseCommand("Yusuf Keser'den gelen son formları oku", customerScope);
    expect(result.intent).toBe("customer.get_360");
  });

  it("routes schema exploration requests to the agent lane", () => {
    const result = parseCommand("schema göster", { type: "global" });
    expect(result.intent).toBe("system.agent_task");
    expect(result.input.readOnlyExploration).toBe(true);
  });

  it("routes read-only table search requests to the agent lane", () => {
    const result = parseCommand("users tablosunda yusuf ara", { type: "global" });
    expect(result.intent).toBe("system.agent_task");
    expect(result.input.readOnlyExploration).toBe(true);
  });

  it("routes normal conversational asks to the agent lane instead of unsupported", () => {
    const result = parseCommand("Hangisi eksik bilgi bekliyor, kısa kısa söyle", { type: "global" });
    expect(result.intent).toBe("system.agent_task");
    expect(result.input.rawCommand).toBe("Hangisi eksik bilgi bekliyor, kısa kısa söyle");
  });

  it("routes ultra-vague turns to the agent lane so the chat can clarify naturally", () => {
    const result = parseCommand("ne var", { type: "global" });
    expect(result.intent).toBe("system.agent_task");
    expect(result.input.vagueConversationalTurn).toBe(true);
  });

  it("routes short follow-up turns to the agent lane", () => {
    const result = parseCommand("devam et", { type: "global" });
    expect(result.intent).toBe("system.agent_task");
    expect(result.input.followUpTurn).toBe(true);
  });

  it("does not turn onboarding status questions into task creation", () => {
    const result = parseCommand("Yusuf onboarding ne durumda?", customerScope);
    expect(result.intent).toBe("customer.get_360");
  });

  it("does not turn document reading asks into document request drafts", () => {
    const result = parseCommand("Belgeleri göster", customerScope);
    expect(result.intent).toBe("system.agent_task");
  });

  it("does not generate a new report when the user is just asking about reports", () => {
    const result = parseCommand("Son raporu göster", customerScope);
    expect(result.intent).toBe("system.agent_task");
  });
});
