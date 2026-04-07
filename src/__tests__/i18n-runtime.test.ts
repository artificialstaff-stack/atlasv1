import { describe, expect, it } from "vitest";

import { createTranslator, formatCurrencyByLocale, formatDateByLocale, formatNumberByLocale } from "@/i18n";

describe("i18n runtime", () => {
  it("interpolates dictionary keys with locale-aware translator", () => {
    const t = createTranslator("en");
    expect(t("authPages.register.invitedAs", { email: "jane@atlas.test" })).toContain("jane@atlas.test");
    expect(t("authPages.register.title")).toBeTruthy();
  });

  it("formats numbers, currency, and dates per locale", () => {
    expect(formatNumberByLocale("tr", 1234.5)).toContain("1.234");
    expect(formatCurrencyByLocale("en", 149, "USD")).toContain("$149");
    expect(formatDateByLocale("tr", "2026-03-26T00:00:00.000Z")).toBeTruthy();
  });
});
