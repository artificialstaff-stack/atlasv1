import { describe, expect, it } from "vitest";
import {
  extractBrowserOperatorPath,
  extractBrowserOperatorUrl,
  isBrowserOperatorCommand,
} from "@/lib/admin-copilot/agent-fallback";
import { assessRunOutputQuality } from "@/lib/admin-copilot/service";

describe("admin copilot browser lane", () => {
  it("detects browser operator commands with explicit urls", () => {
    expect(isBrowserOperatorCommand("https://example.com sayfasini browser ile incele")).toBe(true);
    expect(extractBrowserOperatorUrl("https://example.com sayfasini browser ile incele")).toBe("https://example.com");
  });

  it("detects internal admin paths for the authenticated browser lane", () => {
    expect(isBrowserOperatorCommand("/admin/dashboard sayfasini browser ile incele")).toBe(true);
    expect(extractBrowserOperatorPath("/admin/dashboard sayfasini browser ile incele")).toBe("/admin/dashboard");
  });

  it("detects internal portal paths for the authenticated browser lane", () => {
    expect(isBrowserOperatorCommand("/panel/dashboard sayfasini browser ile incele")).toBe(true);
    expect(extractBrowserOperatorPath("/panel/dashboard sayfasini browser ile incele")).toBe("/panel/dashboard");
  });

  it("does not treat generic non-url commands as browser lane", () => {
    expect(isBrowserOperatorCommand("yusuf keser den gelen son formlari oku")).toBe(false);
    expect(extractBrowserOperatorUrl("yusuf keser den gelen son formlari oku")).toBeNull();
    expect(extractBrowserOperatorPath("yusuf keser den gelen son formlari oku")).toBeNull();
  });

  it("fails quality gate when browser lane returns page-open failure text", () => {
    const quality = assessRunOutputQuality({
      mode: "agent",
      summary: "Ajan zinciri browser/operator lane görevini tamamladı.",
      details: "Browser/operator lane sayfayı açamadı: timeout",
      agentSteps: [
        { type: "action" },
        { type: "observation", toolResult: { success: false } },
        { type: "final_answer" },
      ],
    });

    expect(quality.passed).toBe(false);
    expect(quality.missingCriteria.join(" ")).toContain("hata");
  });
});
