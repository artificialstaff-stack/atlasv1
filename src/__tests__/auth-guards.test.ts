import { describe, it, expect } from "vitest";
import { isAdmin, canViewAdmin, canEdit, canManageRoles } from "@/features/auth/guards";

describe("Auth Guard Helpers", () => {
  describe("isAdmin", () => {
    it("admin rolü için true döner", () => {
      expect(isAdmin("admin")).toBe(true);
    });

    it("super_admin rolü için true döner", () => {
      expect(isAdmin("super_admin")).toBe(true);
    });

    it("customer rolü için false döner", () => {
      expect(isAdmin("customer")).toBe(false);
    });

    it("moderator rolü için false döner", () => {
      expect(isAdmin("moderator")).toBe(false);
    });
  });

  describe("canViewAdmin", () => {
    it.each(["admin", "super_admin", "moderator", "viewer"])(
      "%s rolü admin panelini görebilir",
      (role) => {
        expect(canViewAdmin(role)).toBe(true);
      }
    );

    it("customer rolü admin panelini göremez", () => {
      expect(canViewAdmin("customer")).toBe(false);
    });
  });

  describe("canEdit", () => {
    it("admin düzenleyebilir", () => {
      expect(canEdit("admin")).toBe(true);
    });

    it("super_admin düzenleyebilir", () => {
      expect(canEdit("super_admin")).toBe(true);
    });

    it("moderator düzenleyemez", () => {
      expect(canEdit("moderator")).toBe(false);
    });
  });

  describe("canManageRoles", () => {
    it("sadece super_admin rol yönetebilir", () => {
      expect(canManageRoles("super_admin")).toBe(true);
      expect(canManageRoles("admin")).toBe(false);
      expect(canManageRoles("customer")).toBe(false);
    });
  });
});
