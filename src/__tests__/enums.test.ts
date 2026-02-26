import { describe, it, expect } from "vitest";
import {
  ONBOARDING_STATUS,
  USER_ROLE,
  PLAN_TIER,
  ORDER_STATUS,
  TICKET_STATUS,
  ONBOARDING_STATUS_LABELS,
  USER_ROLE_LABELS,
  PLAN_TIER_LABELS,
  ORDER_STATUS_LABELS,
  TICKET_STATUS_LABELS,
} from "@/types/enums";

describe("Enum Değerleri", () => {
  describe("ONBOARDING_STATUS", () => {
    it("tüm durumları içerir", () => {
      expect(Object.values(ONBOARDING_STATUS)).toEqual([
        "lead",
        "verifying",
        "onboarding",
        "active",
        "suspended",
      ]);
    });

    it("her durum için Türkçe etiket vardır", () => {
      Object.values(ONBOARDING_STATUS).forEach((status) => {
        expect(ONBOARDING_STATUS_LABELS[status]).toBeDefined();
        expect(typeof ONBOARDING_STATUS_LABELS[status]).toBe("string");
      });
    });
  });

  describe("USER_ROLE", () => {
    it("5 rol tanımlıdır", () => {
      expect(Object.keys(USER_ROLE)).toHaveLength(5);
    });

    it("her rol için etiket vardır", () => {
      Object.values(USER_ROLE).forEach((role) => {
        expect(USER_ROLE_LABELS[role]).toBeDefined();
      });
    });
  });

  describe("PLAN_TIER", () => {
    it("4 plan seviyesi tanımlıdır", () => {
      expect(Object.keys(PLAN_TIER)).toHaveLength(4);
    });

    it("her plan için etiket vardır", () => {
      Object.values(PLAN_TIER).forEach((tier) => {
        expect(PLAN_TIER_LABELS[tier]).toBeDefined();
      });
    });
  });

  describe("ORDER_STATUS", () => {
    it("tüm sipariş durumlarını içerir", () => {
      const statuses = Object.values(ORDER_STATUS);
      expect(statuses).toContain("received");
      expect(statuses).toContain("processing");
      expect(statuses).toContain("delivered");
      expect(statuses).toContain("cancelled");
    });

    it("her durum için etiket vardır", () => {
      Object.values(ORDER_STATUS).forEach((status) => {
        expect(ORDER_STATUS_LABELS[status]).toBeDefined();
      });
    });
  });

  describe("TICKET_STATUS", () => {
    it("destek talebi durumlarını içerir", () => {
      const statuses = Object.values(TICKET_STATUS);
      expect(statuses).toContain("open");
      expect(statuses).toContain("resolved");
    });

    it("her durum için etiket vardır", () => {
      Object.values(TICKET_STATUS).forEach((status) => {
        expect(TICKET_STATUS_LABELS[status]).toBeDefined();
      });
    });
  });
});
