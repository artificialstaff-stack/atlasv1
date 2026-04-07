import { describe, expect, it } from "vitest";
import { assessRunOutputQuality, buildExecutionRecoveryConversation } from "@/lib/admin-copilot/service";
import { shouldFallbackToLocalModel } from "@/lib/ai/autonomous/react-engine";

describe("admin copilot output quality gate", () => {
  it("passes when agent output has verified observations and a direct final answer", () => {
    const quality = assessRunOutputQuality({
      mode: "agent",
      summary: "Yusuf Keser için son üç form okundu.",
      details: "ATL-705 submitted, ATL-801 under_review ve ATL-102 approved olarak bulundu. Son kayıt alan önizlemeleri eklendi.",
      agentSteps: [
        { type: "action", toolResult: undefined },
        { type: "observation", toolResult: { success: true } },
        { type: "final_answer", toolResult: undefined },
      ],
    });

    expect(quality.passed).toBe(true);
    expect(quality.score).toBeGreaterThanOrEqual(60);
  });

  it("fails meta-plan style agent dumps even if they are long", () => {
    const quality = assessRunOutputQuality({
      mode: "agent",
      summary: "Ajan zinciri görevi işledi ve sonuç üretti.",
      details: [
        "**İstek Analizi**",
        "Kullanıcının isteğini anlamak için plan oluşturacağım.",
        "",
        "**Araç Seçimi**",
        "list_form_submissions ve get_submission_by_id kullanabilirim.",
        "",
        "**Eylem Planı**",
        "Önce kayıtları listeleyeceğim, sonra ayrıntıları okuyacağım.",
      ].join("\n"),
      agentSteps: [
        { type: "thought", toolResult: undefined },
        { type: "final_answer", toolResult: undefined },
      ],
    });

    expect(quality.passed).toBe(false);
    expect(quality.missingCriteria).toContain("Yanıt meta-plan diline kaydı; doğrudan sonuç üretmedi.");
  });

  it("fails agent outputs that end in tool error text without successful observation", () => {
    const quality = assessRunOutputQuality({
      mode: "agent",
      summary: "Ajan zinciri görevi işledi ve sonuç üretti.",
      details: "db_read_table_rows hatası: Invalid relation name: relation must be a non-empty string.",
      agentSteps: [
        { type: "action", toolResult: undefined },
        { type: "observation", toolResult: { success: false } },
        { type: "final_answer", toolResult: undefined },
      ],
    });

    expect(quality.passed).toBe(false);
    expect(quality.missingCriteria).toContain("Ajan araç zinciri oluştu ama başarılı gözlem üretmedi.");
    expect(quality.missingCriteria).toContain("Yanıt hata metni içeriyor; teslim kalitesi yetersiz.");
  });

  it("maps provider rate limits to a conversational recovery response", () => {
    const recovery = buildExecutionRecoveryConversation({
      message: "Rate limit reached for model llama. retry after 94",
      scope: { type: "global" },
      commandText: "Yusuf Keser den gelen son formları oku",
      lane: "agent",
    });

    expect(recovery.summary).toContain("model katmanı");
    expect(recovery.details).toContain("Sohbet açık kaldı");
    expect(recovery.nextSuggestions[0]).toContain("Yusuf Keser");
  });

  it("detects provider failures that should fall back to the local model", () => {
    expect(shouldFallbackToLocalModel(new Error("Rate limit reached for model llama-3.3-70b-versatile"))).toBe(true);
    expect(shouldFallbackToLocalModel(new Error("retry after 94 seconds"))).toBe(true);
    expect(shouldFallbackToLocalModel(new Error("validation error"))).toBe(false);
  });
});
