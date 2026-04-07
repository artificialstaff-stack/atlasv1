"use server";

import { mkdir, writeFile } from "node:fs/promises";
import { resolveAtlasOutputPath } from "@/lib/runtime-paths";
import { listAtlasAuditableSurfaces } from "./surfaces";
import type { AtlasSurfaceContract } from "./types";

type BrowserModule = typeof import("@playwright/test");

type RouteAuditIssue = {
  route: string;
  kind:
    | "layout_break"
    | "copy_conflict"
    | "empty_surface"
    | "modal_surface_violation"
    | "widget_hierarchy_gap"
    | "console_or_performance_regression";
  severity: "p0" | "p1" | "p2";
  title: string;
  summary: string;
  screenshot?: string | null;
  detail?: string | null;
};

type RouteAuditSummary = {
  generatedAt: string;
  status: "ok" | "failed";
  screenshots: string[];
  issues: RouteAuditIssue[];
  auditedRoutes: string[];
  error?: string | null;
};

type RouteAuditProgress = {
  completed: number;
  total: number;
  route: string;
  title: string;
  owner: AtlasSurfaceContract["owner"];
  issueCount: number;
};

type RunJarvisRouteAuditOptions = {
  onSurfaceAudited?: (progress: RouteAuditProgress, summary: RouteAuditSummary) => Promise<void> | void;
};

function routeAuditEnabled() {
  return process.env.ATLAS_JARVIS_ROUTE_AUDIT_ENABLED !== "0";
}

function getPortalUrl(pathname: string) {
  const base = process.env.ATLAS_PORTAL_BASE_URL ?? "http://portal.atlas.localhost:3000";
  return `${base}${pathname}`;
}

function getAdminUrl(pathname: string) {
  const base = process.env.ATLAS_ADMIN_BASE_URL ?? "http://admin.atlas.localhost:3000";
  return `${base}${pathname}`;
}

function getPublicUrl(pathname: string) {
  const base = process.env.ATLAS_BASE_URL ?? "http://localhost:3000";
  return `${base}${pathname}`;
}

function getAuditCredentials() {
  return {
    customerEmail: process.env.ATLAS_JARVIS_AUDIT_EMAIL ?? "alpy726@gmail.com",
    customerPassword: process.env.ATLAS_JARVIS_AUDIT_PASSWORD ?? "Musteri2025!",
    adminEmail: process.env.ATLAS_JARVIS_ADMIN_EMAIL ?? "admin@atlas.com",
    adminPassword: process.env.ATLAS_JARVIS_ADMIN_PASSWORD ?? "Atlas2025!",
  };
}

async function importPlaywright(): Promise<BrowserModule> {
  return import("@playwright/test");
}

async function loginCustomer(page: any) {
  const { customerEmail, customerPassword } = getAuditCredentials();
  await page.goto(getPortalUrl("/login"), { waitUntil: "networkidle", timeout: 60_000 });
  await page.locator('input[name="email"], input[type="email"]').first().fill(customerEmail);
  await page.locator('input[name="password"], input[type="password"]').first().fill(customerPassword);
  await page.locator("form button").filter({ hasText: /\S/ }).last().click();
  await page.waitForURL("**/panel/dashboard", { timeout: 60_000 });
}

async function loginAdmin(page: any) {
  const { adminEmail, adminPassword } = getAuditCredentials();
  await page.goto(getAdminUrl("/admin/login"), { waitUntil: "networkidle", timeout: 60_000 });
  await page.locator('input[name="email"], input[type="email"]').first().fill(adminEmail);
  await page.locator('input[name="password"], input[type="password"]').first().fill(adminPassword);
  await page.locator("form button").filter({ hasText: /\S/ }).last().click();
  await page.waitForURL(/\/admin(\/dashboard|\/customers|\/ai)/, { timeout: 60_000 });
}

function slugifyRoute(route: string) {
  return route
    .replace(/^\//, "")
    .replace(/[^\w/.-]+/g, "-")
    .replace(/\//g, "__")
    .replace(/^-+|-+$/g, "")
    .toLowerCase() || "root";
}

function resolveSurfaceUrl(surface: AtlasSurfaceContract) {
  const route = surface.auditPath ?? surface.route;
  if (surface.owner === "admin" || route.startsWith("/admin/")) {
    return getAdminUrl(route);
  }
  if (surface.owner === "customer" || route.startsWith("/panel/")) {
    return getPortalUrl(route);
  }
  return getPublicUrl(route);
}

async function collectRouteDiagnostics(page: any, surface: AtlasSurfaceContract) {
  return page.evaluate((input: { surfaceKind: AtlasSurfaceContract["surfaceKind"] }) => {
    const allElements = Array.from(document.querySelectorAll<HTMLElement>("body *"));
    const auditElements = allElements.filter((element) => {
      const tagName = element.tagName.toLowerCase();
      const role = element.getAttribute("role") ?? "";
      const semanticTag = ["main", "section", "article", "aside", "nav", "header", "footer", "form", "table", "ul", "ol"].includes(tagName);
      const landmarkRole = ["main", "region", "navigation", "banner", "complementary", "contentinfo", "form", "dialog", "table", "grid"].includes(role);
      const jarvisSurface =
        element.hasAttribute("data-jarvis-empty-surface")
        || element.hasAttribute("data-jarvis-modal-content")
        || element.hasAttribute("data-jarvis-workspace-shell")
        || element.hasAttribute("data-jarvis-workspace-main")
        || element.hasAttribute("data-jarvis-workspace-rail");

      return semanticTag || landmarkRole || jarvisSurface;
    });
    const documentOverflowAmount =
      Math.max(
        document.documentElement.scrollWidth || 0,
        document.body.scrollWidth || 0,
      ) - window.innerWidth;

    const horizontalOverflow = auditElements.some((element) => {
      const style = window.getComputedStyle(element);
      if (style.display === "none" || style.visibility === "hidden") return false;
      if ((Number.parseFloat(style.opacity || "1") || 1) < 0.35) return false;
      if (style.position === "absolute" || style.position === "fixed") return false;
      if (element.clientWidth <= 360) return false;
      if (style.overflowX === "hidden") return false;
      const rect = element.getBoundingClientRect();
      const widthOvershoot =
        rect.right > window.innerWidth + 24 || rect.left < -24 || rect.width > window.innerWidth + 24;
      const internalOverflow = element.scrollWidth > element.clientWidth + 24;
      return widthOvershoot || internalOverflow;
    }) || documentOverflowAmount > 96;

    const visibleHeadings = Array.from(document.querySelectorAll<HTMLElement>("h1, h2, h3"))
      .map((element) => (element.innerText ?? "").trim())
      .filter((text) => text.length >= 12);
    const duplicateHeadings = Array.from(new Set(visibleHeadings.filter((text, index) => visibleHeadings.indexOf(text) !== index)));

    const bodyText = document.body.innerText ?? "";
    const rawKeyMatches = Array.from(
      new Set(bodyText.match(/\b(?:portal|workspace|common|admin)\.[a-z0-9_.-]+\b/ig) ?? []),
    ).filter((match) => {
      const lowered = match.toLowerCase();
      return !(
        lowered === "admin.atlas.localhost"
        || lowered === "portal.atlas.localhost"
        || lowered.endsWith(".localhost")
        || lowered.includes("127.0.0.1")
      );
    });
    const emptySurfaces = Array.from(document.querySelectorAll<HTMLElement>("[data-jarvis-empty-surface]")).map((surfaceElement) => ({
      text: (surfaceElement.innerText ?? "").trim().slice(0, 220),
      actionCount: surfaceElement.querySelectorAll("button, a").length,
    }));
    const unexpectedDialogs =
      input.surfaceKind === "page_only"
        ? document.querySelectorAll('[role="dialog"], [data-jarvis-modal-content]').length
        : 0;

    return {
      bodyText,
      rawKeyLeak: rawKeyMatches.length > 0,
      rawKeyMatches,
      horizontalOverflow,
      duplicateHeadings,
      emptySurfaces,
      unexpectedDialogs,
      pageTitle: document.title,
      visibleHeadingCount: visibleHeadings.length,
    };
  }, { surfaceKind: surface.surfaceKind });
}

async function warmPageForAudit(page: any) {
  await page.evaluate(async () => {
    const scrollRoot = document.scrollingElement ?? document.documentElement;
    const maxScroll = Math.max(0, scrollRoot.scrollHeight - window.innerHeight);
    if (maxScroll <= 0) {
      return;
    }

    const steps = Math.min(8, Math.max(3, Math.ceil(maxScroll / Math.max(window.innerHeight, 1))));

    for (let index = 0; index <= steps; index += 1) {
      const nextTop = Math.round((maxScroll * index) / steps);
      window.scrollTo({ top: nextTop, behavior: "auto" });
      await new Promise((resolve) => window.setTimeout(resolve, 180));
    }

    window.scrollTo({ top: 0, behavior: "auto" });
    await new Promise((resolve) => window.setTimeout(resolve, 220));
  });
}

function pushConsoleIssues(
  summary: RouteAuditSummary,
  surface: AtlasSurfaceContract,
  screenshotPath: string,
  consoleErrors: string[],
  pageErrors: string[],
  requestFailures: string[],
) {
  const messages = [...pageErrors, ...consoleErrors, ...requestFailures].filter(Boolean);
  if (messages.length === 0) {
    return;
  }

  summary.issues.push({
    route: surface.route,
    kind: "console_or_performance_regression",
    severity: "p0",
    title: `${surface.title} route audit hata verdi`,
    summary: messages.slice(0, 2).join(" | "),
    screenshot: screenshotPath,
    detail: messages.slice(0, 6).join(" || "),
  });
}

function pushDiagnosticIssues(
  summary: RouteAuditSummary,
  surface: AtlasSurfaceContract,
  screenshotPath: string,
  diagnostics: Awaited<ReturnType<typeof collectRouteDiagnostics>>,
) {
  if (diagnostics.rawKeyLeak) {
    summary.issues.push({
      route: surface.route,
      kind: "copy_conflict",
      severity: "p1",
      title: `${surface.title} sayfasinda ham i18n anahtari gorunuyor`,
      summary: "Kullanıcıya veya operatöre raw translation key sızıyor.",
      screenshot: screenshotPath,
      detail: diagnostics.rawKeyMatches.join(" | ") || (surface.auditPath ?? surface.route),
    });
  }

  if (diagnostics.horizontalOverflow) {
    summary.issues.push({
      route: surface.route,
      kind: "layout_break",
      severity: "p1",
      title: `${surface.title} sayfasinda yatay tasma var`,
      summary: "Route içinde bazı bileşenler yatay overflow üretiyor.",
      screenshot: screenshotPath,
      detail: surface.auditPath ?? surface.route,
    });
  }

  if (diagnostics.duplicateHeadings.length > 0) {
    summary.issues.push({
      route: surface.route,
      kind: "widget_hierarchy_gap",
      severity: "p2",
      title: `${surface.title} sayfasinda tekrar eden baslik var`,
      summary: "Aynı heading birden fazla kez görünerek sayfa hiyerarşisini bulanıklaştırıyor.",
      screenshot: screenshotPath,
      detail: diagnostics.duplicateHeadings.join(" | "),
    });
  }

  if (diagnostics.unexpectedDialogs > 0) {
    summary.issues.push({
      route: surface.route,
      kind: "modal_surface_violation",
      severity: "p1",
      title: `${surface.title} route'u beklenmedik acik modal ile geliyor`,
      summary: "Page-only route üzerinde açık dialog/modal render edildi.",
      screenshot: screenshotPath,
      detail: `dialogs=${diagnostics.unexpectedDialogs}`,
    });
  }

  for (const emptySurface of diagnostics.emptySurfaces) {
    if (emptySurface.actionCount > 0) {
      continue;
    }

    summary.issues.push({
      route: surface.route,
      kind: "empty_surface",
      severity: "p1",
      title: `${surface.title} bos durumda yonlendirici aksiyon sunmuyor`,
      summary: "Empty state görünüyor ama kullanıcıyı sonraki adıma taşıyan CTA yok.",
      screenshot: screenshotPath,
      detail: emptySurface.text || "empty_surface_without_action",
    });
  }
}

async function auditSurface(context: any, surface: AtlasSurfaceContract, summary: RouteAuditSummary) {
  const page = await context.newPage();
  const consoleErrors: string[] = [];
  const pageErrors: string[] = [];
  const requestFailures: string[] = [];
  const screenshotPath = resolveAtlasOutputPath("jarvis", "route-audit", `${slugifyRoute(surface.route)}.png`);

  page.on("console", (message: any) => {
    if (message.type() === "error") {
      consoleErrors.push(message.text());
    }
  });
  page.on("pageerror", (error: Error) => {
    pageErrors.push(error.message);
  });
  page.on("requestfailed", (request: any) => {
    const url = request.url();
    const errorText = request.failure()?.errorText ?? "request_failed";
    const isAbortedRscPrefetch =
      request.method() === "GET"
      && url.includes("_rsc=")
      && /ERR_ABORTED/i.test(errorText);

    if (isAbortedRscPrefetch) {
      return;
    }

    requestFailures.push(`${request.method()} ${url} :: ${errorText}`);
  });

  try {
    const targetUrl = resolveSurfaceUrl(surface);
    summary.auditedRoutes.push(surface.auditPath ?? surface.route);
    await page.goto(targetUrl, { waitUntil: "domcontentloaded", timeout: 35_000 });
    await page.waitForLoadState("networkidle", { timeout: 12_000 }).catch(() => null);
    await warmPageForAudit(page);
    await page.waitForTimeout(900);
    await page.screenshot({ path: screenshotPath, fullPage: true });
    summary.screenshots.push(screenshotPath);

    pushConsoleIssues(summary, surface, screenshotPath, consoleErrors, pageErrors, requestFailures);
    const diagnostics = await collectRouteDiagnostics(page, surface);
    pushDiagnosticIssues(summary, surface, screenshotPath, diagnostics);
  } catch (error) {
    summary.auditedRoutes.push(surface.auditPath ?? surface.route);
    summary.issues.push({
      route: surface.route,
      kind: "console_or_performance_regression",
      severity: "p0",
      title: `${surface.title} route'u acilamadi`,
      summary: error instanceof Error ? error.message : "route_audit_failed",
      screenshot: null,
      detail: surface.auditPath ?? surface.route,
    });
  } finally {
    await page.close().catch(() => null);
  }
}

export async function runJarvisRouteAudit(
  options?: RunJarvisRouteAuditOptions,
): Promise<RouteAuditSummary | null> {
  if (!routeAuditEnabled()) {
    return null;
  }

  await mkdir(resolveAtlasOutputPath("jarvis", "route-audit"), { recursive: true });
  const summaryPath = resolveAtlasOutputPath("jarvis", "route-audit-summary.json");
  const summary: RouteAuditSummary = {
    generatedAt: new Date().toISOString(),
    status: "ok",
    screenshots: [],
    issues: [],
    auditedRoutes: [],
    error: null,
  };
  const persistSummary = async () => {
    await writeFile(summaryPath, JSON.stringify(summary, null, 2), "utf8");
  };

  let browser: any = null;

  try {
    const { chromium } = await importPlaywright();
    const sharedArgs = [
      "--host-resolver-rules=MAP portal.atlas.localhost 127.0.0.1,MAP admin.atlas.localhost 127.0.0.1,MAP *.atlas.localhost 127.0.0.1",
    ];

    try {
      browser = await chromium.launch({ channel: "chrome", headless: true, args: sharedArgs });
    } catch {
      browser = await chromium.launch({ headless: true, args: sharedArgs });
    }

    const customerSurfaces = listAtlasAuditableSurfaces().filter((surface) => surface.owner === "customer");
    const adminSurfaces = listAtlasAuditableSurfaces().filter((surface) => surface.owner === "admin");
    const publicSurfaces = listAtlasAuditableSurfaces().filter((surface) => surface.owner === "marketing" || surface.owner === "shared");

    const customerContext = await browser.newContext({ viewport: { width: 1600, height: 1100 } });
    const customerLoginPage = await customerContext.newPage();
    await loginCustomer(customerLoginPage);
    await customerLoginPage.close().catch(() => null);
    const allSurfaces = [...customerSurfaces, ...adminSurfaces, ...publicSurfaces];
    let completedSurfaces = 0;
    const recordProgress = async (surface: AtlasSurfaceContract) => {
      completedSurfaces += 1;
      await persistSummary();
      await options?.onSurfaceAudited?.({
        completed: completedSurfaces,
        total: allSurfaces.length,
        route: surface.auditPath ?? surface.route,
        title: surface.title,
        owner: surface.owner,
        issueCount: summary.issues.length,
      }, summary);
    };
    for (const surface of customerSurfaces) {
      await auditSurface(customerContext, surface, summary);
      await recordProgress(surface);
    }
    await customerContext.close().catch(() => null);

    const adminContext = await browser.newContext({ viewport: { width: 1600, height: 1100 } });
    const adminLoginPage = await adminContext.newPage();
    await loginAdmin(adminLoginPage);
    await adminLoginPage.close().catch(() => null);
    for (const surface of adminSurfaces) {
      await auditSurface(adminContext, surface, summary);
      await recordProgress(surface);
    }
    await adminContext.close().catch(() => null);

    const publicContext = await browser.newContext({ viewport: { width: 1600, height: 1100 } });
    for (const surface of publicSurfaces) {
      await auditSurface(publicContext, surface, summary);
      await recordProgress(surface);
    }
    await publicContext.close().catch(() => null);
  } catch (error) {
    summary.status = "failed";
    summary.error = error instanceof Error ? error.message : "route_audit_failed";
  } finally {
    await browser?.close().catch(() => null);
    await persistSummary();
  }

  return summary;
}
