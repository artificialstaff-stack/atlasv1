import { describe, expect, it } from "vitest";
import {
  buildSurfaceUrl,
  detectSurfaceFromHost,
  detectSurfaceFromPath,
  getAppBaseUrl,
  getSurfaceBaseUrl,
  getSurfaceHostname,
  resolveSurfaceRedirect,
} from "@/lib/app-surface";

describe("app surface routing", () => {
  it("detects admin and portal hosts", () => {
    expect(detectSurfaceFromHost("admin.atlas.localhost:3000")).toBe("admin");
    expect(detectSurfaceFromHost("portal.atlas.localhost:3000")).toBe("portal");
    expect(detectSurfaceFromHost("127.0.0.1:3000")).toBe("public");
  });

  it("detects path surfaces", () => {
    expect(detectSurfaceFromPath("/admin/dashboard")).toBe("admin");
    expect(detectSurfaceFromPath("/panel/dashboard")).toBe("portal");
    expect(detectSurfaceFromPath("/login")).toBe("portal");
    expect(detectSurfaceFromPath("/pricing")).toBe("public");
  });

  it("builds local and custom surface hosts", () => {
    expect(getSurfaceHostname("127.0.0.1:3000", "admin")).toBe("admin.atlas.localhost");
    expect(getSurfaceHostname("portal.example.com", "admin")).toBe("admin.example.com");
    expect(getSurfaceHostname("example.com", "portal")).toBe("portal.example.com");
  });

  it("redirects wrong host traffic to the matching surface", () => {
    const toPortal = resolveSurfaceRedirect({
      url: new URL("http://admin.atlas.localhost:3000/panel/dashboard?x=1"),
      hostHeader: "admin.atlas.localhost:3000",
    });
    expect(toPortal?.toString()).toBe("http://portal.atlas.localhost:3000/panel/dashboard?x=1");

    const toAdmin = resolveSurfaceRedirect({
      url: new URL("http://portal.atlas.localhost:3000/admin/login"),
      hostHeader: "portal.atlas.localhost:3000",
    });
    expect(toAdmin?.toString()).toBe("http://admin.atlas.localhost:3000/admin/login");
  });

  it("redirects public pages on product hosts to their home surfaces", () => {
    const adminHome = resolveSurfaceRedirect({
      url: new URL("http://admin.atlas.localhost:3000/"),
      hostHeader: "admin.atlas.localhost:3000",
    });
    expect(adminHome?.toString()).toBe("http://admin.atlas.localhost:3000/admin/dashboard");

    const portalHome = resolveSurfaceRedirect({
      url: new URL("http://portal.atlas.localhost:3000/pricing"),
      hostHeader: "portal.atlas.localhost:3000",
    });
    expect(portalHome?.toString()).toBe("http://portal.atlas.localhost:3000/panel/dashboard");
  });

  it("keeps surface routes on localhost-style base hosts", () => {
    const portalRedirect = resolveSurfaceRedirect({
      url: new URL("http://127.0.0.1:3000/panel/dashboard"),
      hostHeader: "127.0.0.1:3000",
    });
    expect(portalRedirect).toBeNull();

    const loginRedirect = resolveSurfaceRedirect({
      url: new URL("http://localhost:3000/login?redirect=%2Fpanel%2Fdashboard"),
      hostHeader: "localhost:3000",
    });
    expect(loginRedirect).toBeNull();

    const adminRedirect = resolveSurfaceRedirect({
      url: new URL("http://127.0.0.1:3000/admin/dashboard"),
      hostHeader: "127.0.0.1:3000",
    });
    expect(adminRedirect).toBeNull();
  });

  it("still redirects surface routes from non-local public hosts", () => {
    const portalRedirect = resolveSurfaceRedirect({
      url: new URL("https://example.com/panel/dashboard"),
      hostHeader: "example.com",
    });
    expect(portalRedirect?.toString()).toBe("https://portal.example.com/panel/dashboard");

    const adminRedirect = resolveSurfaceRedirect({
      url: new URL("https://example.com/admin/dashboard"),
      hostHeader: "example.com",
    });
    expect(adminRedirect?.toString()).toBe("https://admin.example.com/admin/dashboard");
  });

  it("does not redirect public base host traffic", () => {
    const redirect = resolveSurfaceRedirect({
      url: new URL("http://127.0.0.1:3000/pricing"),
      hostHeader: "127.0.0.1:3000",
    });
    expect(redirect).toBeNull();
  });

  it("derives dynamic local surface ports from NEXT_PUBLIC_APP_URL", () => {
    const previousAppUrl = process.env.NEXT_PUBLIC_APP_URL;
    const previousAdminUrl = process.env.ATLAS_ADMIN_BASE_URL;
    const previousPortalUrl = process.env.ATLAS_PORTAL_BASE_URL;
    const previousBaseUrl = process.env.ATLAS_BASE_URL;

    process.env.NEXT_PUBLIC_APP_URL = "http://localhost:4312";
    delete process.env.ATLAS_ADMIN_BASE_URL;
    delete process.env.ATLAS_PORTAL_BASE_URL;
    delete process.env.ATLAS_BASE_URL;

    expect(getAppBaseUrl()).toBe("http://localhost:4312");
    expect(getSurfaceBaseUrl("portal")).toBe("http://portal.atlas.localhost:4312");
    expect(getSurfaceBaseUrl("admin")).toBe("http://admin.atlas.localhost:4312");
    expect(buildSurfaceUrl("portal", "/panel/dashboard")).toBe("http://portal.atlas.localhost:4312/panel/dashboard");

    process.env.NEXT_PUBLIC_APP_URL = previousAppUrl;
    process.env.ATLAS_ADMIN_BASE_URL = previousAdminUrl;
    process.env.ATLAS_PORTAL_BASE_URL = previousPortalUrl;
    process.env.ATLAS_BASE_URL = previousBaseUrl;
  });
});
