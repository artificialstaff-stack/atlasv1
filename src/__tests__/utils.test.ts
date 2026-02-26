import { describe, it, expect } from "vitest";
import { cn, formatCurrency, shortenUUID, getStatusVariant } from "@/lib/utils";

describe("Utility Functions", () => {
  describe("cn — class merging", () => {
    it("birden fazla sınıfı birleştirir", () => {
      expect(cn("foo", "bar")).toBe("foo bar");
    });

    it("koşullu sınıfları destekler", () => {
      expect(cn("base", false && "hidden", "end")).toBe("base end");
    });

    it("Tailwind çakışmalarını çözer", () => {
      expect(cn("px-2", "px-4")).toBe("px-4");
    });

    it("undefined ve null değerleri yoksayar", () => {
      expect(cn("foo", undefined, null, "bar")).toBe("foo bar");
    });
  });

  describe("formatCurrency", () => {
    it("USD formatında döner", () => {
      const result = formatCurrency(1234.56);
      expect(result).toContain("1,234.56");
    });

    it("sıfır değeri formatlar", () => {
      const result = formatCurrency(0);
      expect(result).toContain("0.00");
    });
  });

  describe("shortenUUID", () => {
    it("UUID'nin ilk 8 karakterini döner", () => {
      expect(shortenUUID("550e8400-e29b-41d4-a716-446655440000")).toBe("550e8400");
    });
  });

  describe("getStatusVariant", () => {
    it("aktif durumlar için default döner", () => {
      expect(getStatusVariant("active")).toBe("default");
      expect(getStatusVariant("delivered")).toBe("default");
      expect(getStatusVariant("completed")).toBe("default");
    });

    it("devam eden durumlar için secondary döner", () => {
      expect(getStatusVariant("processing")).toBe("secondary");
      expect(getStatusVariant("onboarding")).toBe("secondary");
    });

    it("bekleyen durumlar için outline döner", () => {
      expect(getStatusVariant("pending")).toBe("outline");
      expect(getStatusVariant("new")).toBe("outline");
    });

    it("negatif durumlar için destructive döner", () => {
      expect(getStatusVariant("cancelled")).toBe("destructive");
      expect(getStatusVariant("suspended")).toBe("destructive");
    });

    it("bilinmeyen durumlar için outline döner", () => {
      expect(getStatusVariant("unknown_status")).toBe("outline");
    });
  });
});
