import { describe, expect, it } from "vitest";
import {
  buildCustomerFacingNoteFromConversation,
  buildCustomerFacingTaskDraftFromConversation,
  buildCustomerNotificationDraftFromConversation,
  buildEnglishCustomerNoteFromConversation,
  buildShorterCustomerNoteFromConversation,
} from "@/lib/admin-copilot/agent-fallback";

describe("admin copilot customer note follow-up", () => {
  it("builds a customer-facing note from the previous Atlas turn", () => {
    const result = buildCustomerFacingNoteFromConversation({
      commandText: "bunu musteriye kisa not olarak yaz",
      scope: {
        type: "customer",
        refId: "6a3e8856-ef67-4ec1-a856-b92f53795ea1",
        label: "Yusuf Keser",
      },
      conversationContext: [
        "Bu istek devam eden bir sohbetin parçası.",
        "",
        "Kullanıcı: hangisi eksik bilgi bekliyor",
        "Atlas: ## Eksik bilgi / bekleyen adımlar",
        "1. ATL-102 — under_review — llc_name: Teknofix Finance LLC",
        "## İlgili açık görevler",
        "1. Amazon mağaza onboarding planını hazırla — in_progress",
      ].join("\n"),
    });

    expect(result).not.toBeNull();
    expect(result?.summary).toContain("Yusuf Keser");
    expect(result?.details).toContain("Merhaba Yusuf");
    expect(result?.details).toContain("ATL-102");
    expect(result?.steps.some((step) => step.type === "observation")).toBe(true);
  });

  it("builds a customer notification draft from the previous Atlas turn", () => {
    const result = buildCustomerNotificationDraftFromConversation({
      commandText: "bu notu müşteriye bildirim taslağına dönüştür",
      scope: {
        type: "customer",
        refId: "6a3e8856-ef67-4ec1-a856-b92f53795ea1",
        label: "Yusuf Keser",
      },
      conversationContext: [
        "Bu istek devam eden bir sohbetin parçası.",
        "",
        "Kullanıcı: bunu müşteriye kısa not olarak yaz",
        "Atlas: Merhaba Yusuf,",
        "Hesabınızla ilgili kısa bir güncelleme paylaşalım:",
        "- ATL-102 — under_review — llc_name: Teknofix Finance LLC.",
        "- EIN Başvurusu Yap (IRS SS-4) — in_progress.",
      ].join("\n"),
    });

    expect(result).not.toBeNull();
    expect(result?.summary).toContain("bildirim");
    expect(result?.details).toContain("Başlık:");
    expect(result?.details).toContain("Yusuf Keser hesabında son durum güncellendi.");
  });

  it("shortens a previous customer note in the same conversation", () => {
    const result = buildShorterCustomerNoteFromConversation({
      commandText: "bu notu daha kısa hale getir",
      scope: {
        type: "customer",
        refId: "6a3e8856-ef67-4ec1-a856-b92f53795ea1",
        label: "Yusuf Keser",
      },
      conversationContext: [
        "Kullanıcı: bunu müşteriye kısa not olarak yaz",
        "Atlas: Merhaba Yusuf,",
        "Hesabınızla ilgili kısa bir güncelleme paylaşalım:",
        "- ATL-102 — under_review — llc_name: Teknofix Finance LLC.",
        "- EIN Başvurusu Yap (IRS SS-4) — in_progress.",
      ].join("\n"),
    });

    expect(result).not.toBeNull();
    expect(result?.summary).toContain("kısalttım");
    expect(result?.details).toContain("Merhaba Yusuf");
  });

  it("builds an english customer note from the previous Atlas turn", () => {
    const result = buildEnglishCustomerNoteFromConversation({
      commandText: "bu notu İngilizce hazırla",
      scope: {
        type: "customer",
        refId: "6a3e8856-ef67-4ec1-a856-b92f53795ea1",
        label: "Yusuf Keser",
      },
      conversationContext: [
        "Kullanıcı: bunu müşteriye kısa not olarak yaz",
        "Atlas: Merhaba Yusuf,",
        "Hesabınızla ilgili kısa bir güncelleme paylaşalım:",
        "- ATL-102 — under_review — llc_name: Teknofix Finance LLC.",
      ].join("\n"),
    });

    expect(result).not.toBeNull();
    expect(result?.details).toContain("Hello Yusuf");
    expect(result?.summary).toContain("İngilizce");
  });

  it("builds a customer-facing task draft from pending items", () => {
    const result = buildCustomerFacingTaskDraftFromConversation({
      commandText: "müşteri için eksik alanları customer-facing göreve çevir",
      scope: {
        type: "customer",
        refId: "6a3e8856-ef67-4ec1-a856-b92f53795ea1",
        label: "Yusuf Keser",
      },
      conversationContext: [
        "Kullanıcı: hangisi eksik bilgi bekliyor",
        "Atlas: ## Eksik bilgi / bekleyen adımlar",
        "1. ATL-102 — under_review — llc_name: Teknofix Finance LLC",
        "2. EIN Başvurusu Yap (IRS SS-4) — in_progress",
      ].join("\n"),
    });

    expect(result).not.toBeNull();
    expect(result?.summary).toContain("iç görev taslağını");
    expect(result?.details).toContain("İç görev taslağı");
    expect(result?.details).toContain("under_review");
  });
});
