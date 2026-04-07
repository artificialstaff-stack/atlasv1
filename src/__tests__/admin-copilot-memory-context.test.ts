import { describe, expect, it } from "vitest";
import { buildPersistedConversationMemoryContext } from "@/lib/admin-copilot/service";

describe("admin copilot persisted conversation memory context", () => {
  it("builds a pinned workspace context block from saved conversation memory", () => {
    const result = buildPersistedConversationMemoryContext({
      projectName: "Yusuf Keser Launch Workspace",
      workingGoal: "Yusuf Keser launch planini bitir ve eksik formlari customer-facing gorevlere cevir.",
      memorySummary: "Son turda form kayitlari tarandi ve eksik alanlar cikarildi.",
      memoryFacts: [
        "ATL-102 under_review durumda.",
        "EIN Basvurusu Yap gorevi in_progress.",
      ],
      handoffNote: "Bir sonraki adimda musteriye bildirim taslagi hazirlanacak.",
      handoffChecklist: [
        "ATL-102 eksik alanlarini kontrol et.",
        "Bildirim taslagini son kez oku.",
      ],
      workspaceStatus: "handoff_ready",
      workspaceOwnerLabel: "ops-admin@atlas.local",
    });

    expect(result).toContain("Pinned workspace: Yusuf Keser Launch Workspace");
    expect(result).toContain("Çalışma hedefi:");
    expect(result).toContain("Kalıcı özet:");
    expect(result).toContain("Kalıcı gerçekler:");
    expect(result).toContain("Handoff note:");
    expect(result).toContain("Workspace owner:");
    expect(result).toContain("Handoff checklist:");
  });
});
