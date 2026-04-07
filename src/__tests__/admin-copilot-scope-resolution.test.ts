import { describe, expect, it } from "vitest";
import {
  buildChatMemoryPreview,
  inheritConversationScope,
  resolveCustomerScopeFromDirectory,
  shouldBypassConversationScopeInheritance,
  shouldClarifyUnsupportedCommand,
} from "@/lib/admin-copilot/service";

describe("admin copilot scope resolution", () => {
  const directory = [
    {
      id: "6a3e8856-ef67-4ec1-a856-b92f53795ea1",
      email: "alpy726@gmail.com",
      first_name: "Yusuf",
      last_name: "Keser",
      company_name: "Teknofix Finance",
    },
    {
      id: "d24fb3e3-16f2-4f57-8ad5-3798f7d12bbb",
      email: "demo@example.com",
      first_name: "Ayse",
      last_name: "Demir",
      company_name: "Demo Trade",
    },
  ];

  it("resolves full customer names from global commands", () => {
    const resolved = resolveCustomerScopeFromDirectory(
      "Yusuf Keser den gelen son formları oku",
      directory,
    );

    expect(resolved).toEqual({
      type: "customer",
      refId: "6a3e8856-ef67-4ec1-a856-b92f53795ea1",
      label: "Yusuf Keser",
    });
  });

  it("resolves exact email mentions from global commands", () => {
    const resolved = resolveCustomerScopeFromDirectory(
      "alpy726@gmail.com için LLC ne durumda",
      directory,
    );

    expect(resolved?.type).toBe("customer");
    expect(resolved?.refId).toBe("6a3e8856-ef67-4ec1-a856-b92f53795ea1");
  });

  it("returns null when no confident customer match exists", () => {
    const resolved = resolveCustomerScopeFromDirectory(
      "bu hafta hangi alan geride kaldı",
      directory,
    );

    expect(resolved).toBeNull();
  });

  it("flags short vague global commands for clarification", () => {
    expect(shouldClarifyUnsupportedCommand("ne göndermiş", { type: "global" })).toBe(true);
    expect(shouldClarifyUnsupportedCommand("hangi durumda", { type: "global" })).toBe(true);
  });

  it("does not clarify when a richer unsupported command should reach the agent", () => {
    expect(
      shouldClarifyUnsupportedCommand(
        "Türkiye'den 10 üretici toptancı mail indexi topla ve kaynaklarını özetle",
        { type: "global" },
      ),
    ).toBe(false);
  });

  it("builds compact chat memory for follow-up turns", () => {
    const preview = buildChatMemoryPreview(
      [
        {
          commandText: "Yusuf Keser den gelen son formlari oku",
          summary: "Son formlari okudum.",
          responseText: "ATL-102 ve ATL-705 kayitlari gorundu.",
        },
        {
          commandText: "hangisi eksik bilgi bekliyor",
          summary: "Eksik alan bekleyen kayitlari ayirdim.",
          responseText: "ATL-705 formunda ek isletme bilgisi bekleniyor.",
        },
      ],
      "onu ozetle ve musteriye gidecek mesaji hazirla",
    );

    expect(preview).toContain("Kullanıcı: Yusuf Keser den gelen son formlari oku");
    expect(preview).toContain("Atlas: ATL-102 ve ATL-705 kayitlari gorundu.");
    expect(preview).toContain("Yeni mesaj: onu ozetle ve musteriye gidecek mesaji hazirla");
  });

  it("inherits the previous scoped customer for generic follow-up turns", () => {
    const inherited = inheritConversationScope(
      { type: "global" },
      { type: "global" },
      [
        {
          id: "run-1",
          sessionId: "session-1",
          requesterUserId: "admin-1",
          mode: "agent",
          scopeType: "customer",
          scopeRefId: "6a3e8856-ef67-4ec1-a856-b92f53795ea1",
          commandText: "Yusuf Keser den gelen son formlari oku",
          intent: "system.agent_task",
          toolName: "system.agent_task",
          toolInput: {},
          status: "completed",
          requiresApproval: false,
          summary: "Son formlar okundu.",
          responseText: "ATL-102 ve ATL-705 kayitlari bulundu.",
          metadata: { scopeLabel: "Yusuf Keser" },
          createdAt: "2026-03-21T10:00:00.000Z",
          completedAt: "2026-03-21T10:00:05.000Z",
        },
      ],
    );

    expect(inherited).toEqual({
      type: "customer",
      refId: "6a3e8856-ef67-4ec1-a856-b92f53795ea1",
      label: "Yusuf Keser",
    });
  });

  it("keeps schema and database exploration prompts in global scope", () => {
    expect(shouldBypassConversationScopeInheritance("schema goster")).toBe(true);
    expect(shouldBypassConversationScopeInheritance("users tablosunda yusuf ara")).toBe(true);
    expect(shouldBypassConversationScopeInheritance("hangisi eksik bilgi bekliyor")).toBe(false);
  });
});
