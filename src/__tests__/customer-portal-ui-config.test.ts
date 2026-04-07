import { describe, expect, it } from "vitest";
import { getClientPanelPageConfig, getDefaultClientGuidance } from "@/lib/customer-portal/ui-config";

describe("customer portal ui config", () => {
  it("maps main launch routes to their focused guidance", () => {
    const dashboard = getClientPanelPageConfig("/panel/dashboard");
    const services = getClientPanelPageConfig("/panel/services");
    const support = getClientPanelPageConfig("/panel/support");

    expect(dashboard.guidance.areaLabel).toBe("Genel Görünüm");
    expect(services.hero.title).toBe("Hizmetlerim");
    expect(support.guidance.focusLabel).toContain("ATLAS");
  });

  it("prefers the specific support form route over the generic support route", () => {
    const config = getClientPanelPageConfig("/panel/support/forms/ATL-701");

    expect(config.hero.title).toBe("Form Gönderimi");
    expect(config.guidance.areaLabel).toBe("Destek Akışı");
  });

  it("marks locked modules with a locked hint", () => {
    const config = getDefaultClientGuidance("/panel/companies");

    expect(config.lockedHint?.tone).toBe("locked");
    expect(config.lockedHint?.description).toContain("operator");
  });

  it("falls back to the panel default for unknown routes", () => {
    const config = getClientPanelPageConfig("/panel/unknown-space");

    expect(config.hero.title).toBe("Müşteri Paneli");
    expect(config.guidance.primaryAction?.href).toBe("/panel/dashboard");
  });
});
