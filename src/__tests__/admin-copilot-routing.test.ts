import { describe, expect, it } from "vitest";
import { shouldUseAutonomousDelegation } from "@/lib/admin-copilot/agent-fallback";
import {
  shouldForceConversationalAgentFlow,
  shouldPreferTypedExecution,
  shouldReturnPolicyBlock,
  shouldUseAgentFirstRouting,
} from "@/lib/admin-copilot/service";

describe("admin copilot routing", () => {
  it("keeps structured mutation intents on the typed execution path", () => {
    expect(shouldPreferTypedExecution("finance.create_record_draft")).toBe(true);
    expect(shouldPreferTypedExecution("task.update_process_task")).toBe(true);
  });

  it("treats read-only summary intents as agent-first candidates", () => {
    expect(shouldPreferTypedExecution("customer.get_360")).toBe(false);
    expect(shouldPreferTypedExecution("report.generate_customer_report")).toBe(false);
  });

  it("routes read-only chat requests to the orchestrator-first path", () => {
    expect(shouldUseAgentFirstRouting("chat", "customer.get_360", "auto")).toBe(true);
    expect(shouldUseAgentFirstRouting("chat", "system.global_summary", "auto")).toBe(true);
  });

  it("keeps chat and autonomous on the agent-first path even for typed mutations", () => {
    expect(shouldUseAgentFirstRouting("chat", "finance.create_record_draft", "auto")).toBe(true);
    expect(shouldUseAgentFirstRouting("chat", "task.update_process_task", "auto")).toBe(true);
    expect(shouldUseAgentFirstRouting("autonomous", "artifact.publish_to_customer_portal", "required")).toBe(true);
  });

  it("keeps dedicated agent mode on the agent-first path when approval is required", () => {
    expect(shouldUseAgentFirstRouting("agent", "task.update_process_task", "required")).toBe(true);
  });

  it("forces chat-first routing for natural multi-step requests even when they mention mutations", () => {
    expect(
      shouldForceConversationalAgentFlow({
        commandText: "Yusuf Keser icin Amazon magazasini hazirla ve sonra bana eksik belgeleri kisa kisa cikar",
        parsedIntent: "marketplace.create_account",
        hasConversationContext: true,
      }),
    ).toBe(true);
  });

  it("keeps short structured mutation asks on typed execution", () => {
    expect(
      shouldForceConversationalAgentFlow({
        commandText: "Amazon magazasi ac",
        parsedIntent: "marketplace.create_account",
        hasConversationContext: false,
      }),
    ).toBe(false);
  });

  it("routes unsupported conversational turns to the agent lane in every mode", () => {
    expect(shouldUseAgentFirstRouting("chat", "system.unsupported", "blocked")).toBe(true);
    expect(shouldUseAgentFirstRouting("agent", "system.unsupported", "blocked")).toBe(true);
    expect(shouldUseAgentFirstRouting("autonomous", "system.unsupported", "blocked")).toBe(true);
  });

  it("does not return a blocked response once an unsupported turn is delegated to the agent lane", () => {
    expect(shouldReturnPolicyBlock("blocked", false)).toBe(true);
    expect(shouldReturnPolicyBlock("blocked", true)).toBe(false);
    expect(shouldReturnPolicyBlock("auto", true)).toBe(false);
  });

  it("delegates layered natural-language asks to the autonomous sub-agent planner", () => {
    expect(
      shouldUseAutonomousDelegation("Yusuf Keser için eksik bilgi alanlarını çıkar, sonra kısa bir admin notu yaz ve son olarak kontrol listesi hazırla"),
    ).toBe(true);
    expect(shouldUseAutonomousDelegation("schema göster")).toBe(false);
  });
});
