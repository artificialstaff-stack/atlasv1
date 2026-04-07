import { describe, expect, it } from "vitest";
import { resolveConversationWorkspaceState } from "@/lib/admin-copilot/service";

describe("admin copilot workspace ownership", () => {
  it("claims an unowned workspace for the current admin", () => {
    const result = resolveConversationWorkspaceState({
      workspaceStatus: "unclaimed",
      workspaceOwnerId: null,
      workspaceOwnerLabel: null,
      workspaceOwnerEmail: null,
      workspaceClaimedAt: null,
      handoffChecklist: [],
    }, {
      actor: {
        id: "admin-1",
        email: "ops-admin@atlas.local",
      },
      workspaceAction: "claim",
      handoffChecklist: ["ATL-102 kontrol et", "Bildirim taslagini oku"],
    });

    expect(result.workspaceStatus).toBe("claimed");
    expect(result.workspaceOwnerId).toBe("admin-1");
    expect(result.workspaceOwnerLabel).toBe("ops-admin@atlas.local");
    expect(result.handoffChecklist).toEqual(["ATL-102 kontrol et", "Bildirim taslagini oku"]);
  });

  it("rejects edits when another admin currently owns the workspace", () => {
    expect(() => resolveConversationWorkspaceState({
      workspaceStatus: "claimed",
      workspaceOwnerId: "admin-1",
      workspaceOwnerLabel: "owner@atlas.local",
      workspaceOwnerEmail: "owner@atlas.local",
      workspaceClaimedAt: "2026-03-21T12:00:00.000Z",
      handoffChecklist: [],
    }, {
      actor: {
        id: "admin-2",
        email: "other@atlas.local",
      },
      handoffChecklist: ["Yeni not"],
    })).toThrow(/başka bir admin/i);
  });

  it("releases the workspace when the current owner drops it", () => {
    const result = resolveConversationWorkspaceState({
      workspaceStatus: "claimed",
      workspaceOwnerId: "admin-1",
      workspaceOwnerLabel: "ops-admin@atlas.local",
      workspaceOwnerEmail: "ops-admin@atlas.local",
      workspaceClaimedAt: "2026-03-21T12:00:00.000Z",
      handoffChecklist: ["EIN kontrol"],
    }, {
      actor: {
        id: "admin-1",
        email: "ops-admin@atlas.local",
      },
      workspaceAction: "release",
    });

    expect(result.workspaceStatus).toBe("unclaimed");
    expect(result.workspaceOwnerId).toBeNull();
    expect(result.workspaceClaimedAt).toBeNull();
  });

  it("marks the workspace handoff ready and preserves owner identity", () => {
    const result = resolveConversationWorkspaceState({
      workspaceStatus: "claimed",
      workspaceOwnerId: "admin-1",
      workspaceOwnerLabel: "ops-admin@atlas.local",
      workspaceOwnerEmail: "ops-admin@atlas.local",
      workspaceClaimedAt: "2026-03-21T12:00:00.000Z",
      handoffChecklist: ["ATL-102 kontrol"],
    }, {
      actor: {
        id: "admin-1",
        email: "ops-admin@atlas.local",
      },
      workspaceAction: "handoff_ready",
      handoffChecklist: ["ATL-102 kontrol", "Musteri notunu son kez oku"],
    });

    expect(result.workspaceStatus).toBe("handoff_ready");
    expect(result.workspaceOwnerId).toBe("admin-1");
    expect(result.handoffChecklist).toEqual(["ATL-102 kontrol", "Musteri notunu son kez oku"]);
  });
});
