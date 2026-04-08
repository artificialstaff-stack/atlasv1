"use server";

import { mkdir, writeFile } from "node:fs/promises";
import { buildSurfaceUrl } from "@/lib/app-surface";
import { resolveAtlasOutputPath } from "@/lib/runtime-paths";

type ModalAuditIssue = {
  route: string;
  tab: string;
  kind: "layout_break" | "copy_conflict" | "empty_surface" | "modal_surface_violation" | "widget_hierarchy_gap";
  severity: "p0" | "p1" | "p2";
  title: string;
  summary: string;
  screenshot?: string | null;
  detail?: string | null;
};

type ModalAuditSummary = {
  generatedAt: string;
  route: string;
  status: "ok" | "failed";
  screenshots: string[];
  issues: ModalAuditIssue[];
  error?: string | null;
};

type ModalAuditProgress = {
  completed: number;
  total: number;
  route: string;
  label: string;
  issueCount: number;
};

type RunJarvisModalAuditOptions = {
  onScenarioAudited?: (progress: ModalAuditProgress, summary: ModalAuditSummary) => Promise<void> | void;
};

type BrowserModule = typeof import("@playwright/test");

type ScenarioConfig = {
  route: string;
  screenshotPrefix: string;
  maxDialogWidth: number;
};

function modalAuditEnabled() {
  return process.env.ATLAS_JARVIS_MODAL_AUDIT_ENABLED !== "0";
}

function getPortalUrl(pathname: string) {
  return buildSurfaceUrl("portal", pathname);
}

function getAdminUrl(pathname: string) {
  return buildSurfaceUrl("admin", pathname);
}

function getAuditCustomerId() {
  return process.env.ATLAS_JARVIS_AUDIT_CUSTOMER_ID ?? "6a3e8856-ef67-4ec1-a856-b92f53795ea1";
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
  const submitButton = page.locator("form button").filter({ hasText: /\S/ }).last();
  await submitButton.waitFor({ state: "visible", timeout: 30_000 });
  await submitButton.click();
  await page.waitForURL("**/panel/dashboard", { timeout: 60_000 });
}

async function loginAdmin(page: any) {
  const { adminEmail, adminPassword } = getAuditCredentials();
  await page.goto(getAdminUrl("/admin/login"), { waitUntil: "networkidle", timeout: 60_000 });
  await page.locator('input[name="email"], input[type="email"]').first().fill(adminEmail);
  await page.locator('input[name="password"], input[type="password"]').first().fill(adminPassword);
  const submitButton = page.locator("form button").filter({ hasText: /\S/ }).last();
  await submitButton.waitFor({ state: "visible", timeout: 30_000 });
  await submitButton.click();
  await page.waitForURL(/\/admin(\/dashboard|\/customers\/.+)/, { timeout: 60_000 });
}

async function collectModalDiagnostics(page: any) {
  return page.evaluate(() => {
    const dialog =
      (document.querySelector('[data-jarvis-modal-content="workspace"]') as HTMLElement | null)
      ?? (document.querySelector('[role="dialog"]') as HTMLElement | null);
    const scope = dialog ?? document.body;
    const bodyText = scope.innerText;
    const allElements = Array.from(scope.querySelectorAll<HTMLElement>("*"));
    const leftRail = scope.querySelector('[data-jarvis-workspace-rail="left"]') as HTMLElement | null;
    const horizontalOverflow = allElements.some((element) => {
      const style = window.getComputedStyle(element);
      if (style.display === "none" || style.visibility === "hidden") return false;
      if (element.clientWidth <= 320) return false;
      if (element.closest('[data-jarvis-workspace-rail="left"]')) return false;
      if (style.overflowX === "hidden") return false;
      return element.scrollWidth > element.clientWidth + 18;
    });

    const mainPanel = scope.querySelector("[data-jarvis-workspace-main]") as HTMLElement | null;
    const emptySurface = scope.querySelector("[data-jarvis-empty-surface]") as HTMLElement | null;
    const visibleMainBlocks = mainPanel
      ? Array.from(mainPanel.children).filter(
          (element) => element instanceof HTMLElement && element.offsetHeight > 0 && element.offsetWidth > 0,
        )
      : [];

    const firstMainBlock = visibleMainBlocks[0] as HTMLElement | undefined;
    const secondMainBlock = visibleMainBlocks[1] as HTMLElement | undefined;
    const overlap =
      firstMainBlock && secondMainBlock
        ? secondMainBlock.getBoundingClientRect().top < firstMainBlock.getBoundingClientRect().bottom + 8
        : false;

    const dialogRect = dialog?.getBoundingClientRect() ?? null;
    const mainRect = mainPanel?.getBoundingClientRect() ?? null;
    const emptyRect = emptySurface?.getBoundingClientRect() ?? null;
    const leftRailRect = leftRail?.getBoundingClientRect() ?? null;
    const emptyCoverage =
      mainRect && emptyRect && mainRect.width > 0
        ? Number((emptyRect.width / mainRect.width).toFixed(3))
        : null;
    const headings = (mainPanel ? Array.from(mainPanel.querySelectorAll<HTMLElement>("h1, h2, h3, h4")) : [])
      .map((element) => (element.innerText ?? "").trim())
      .filter((text) => text.length >= 12);
    const duplicateHeadings = Array.from(new Set(headings.filter((text, index) => headings.indexOf(text) !== index)));
    const railHintLineCounts = leftRail
      ? Array.from(leftRail.querySelectorAll<HTMLElement>('[role="tab"] p:last-of-type')).map((element) => {
          const style = window.getComputedStyle(element);
          const lineHeight = Number.parseFloat(style.lineHeight || "0");
          if (!Number.isFinite(lineHeight) || lineHeight <= 0) {
            return 0;
          }

          return Number((element.getBoundingClientRect().height / lineHeight).toFixed(2));
        })
      : [];
    const denseRailHintCount = railHintLineCounts.filter((value) => value > 2.05).length;

    const loweredBody = bodyText.toLocaleLowerCase("tr-TR");
    const emptySignals = [
      "görünmüyor",
      "gorunmuyor",
      "henüz oluşmadı",
      "henüz olusmadi",
      "henüz oluşturulmadı",
      "henüz olusturulmadi",
      "kayıt görünmüyor",
      "kayit gorunmuyor",
    ];
    const hasEmptyStateSignal = emptySignals.some((signal) => loweredBody.includes(signal));
    const visibleParagraphs = allElements.filter((element) => {
      const style = window.getComputedStyle(element);
      const text = (element.innerText ?? "").trim();
      return (
        style.display !== "none" &&
        style.visibility !== "hidden" &&
        text.length >= 24 &&
        element.offsetHeight > 0 &&
        element.offsetWidth > 0
      );
    }).length;

    return {
      bodyText,
      horizontalOverflow,
      overlap,
      dialogWidth: dialogRect?.width ?? 0,
      dialogHeight: dialogRect?.height ?? 0,
      viewportWidth: window.innerWidth,
      viewportHeight: window.innerHeight,
      hasEmptyStateSignal,
      visibleParagraphs,
      mainPanelWidth: mainRect?.width ?? 0,
      emptySurfaceCoverage: emptyCoverage,
      hasEmptySurface: Boolean(emptySurface),
      leftRailWidth: leftRailRect?.width ?? 0,
      duplicateHeadings,
      denseRailHintCount,
    };
  });
}

function pushIssuesFromDiagnostics(
  summary: ModalAuditSummary,
  diagnostics: Awaited<ReturnType<typeof collectModalDiagnostics>>,
  screenshotPath: string,
  tabLabel: string,
  scenario: ScenarioConfig,
) {
  if (/\b(?:portal|workspace|common|admin)\.[a-z0-9_.-]+\b/i.test(diagnostics.bodyText)) {
    summary.issues.push({
      route: scenario.route,
      tab: tabLabel,
      kind: "copy_conflict",
      severity: "p1",
      title: `${tabLabel} modalinda ham i18n anahtari gorunuyor`,
      summary: "Modal içinde kullanıcıya raw translation key sızıyor.",
      screenshot: screenshotPath,
      detail: "regex_match: portal/workspace/common/admin.*",
    });
  }

  if (diagnostics.overlap || diagnostics.horizontalOverflow) {
    summary.issues.push({
      route: scenario.route,
      tab: tabLabel,
      kind: "layout_break",
      severity: diagnostics.overlap ? "p0" : "p1",
      title: `${tabLabel} modal yerlesiminde cakisama veya tasma var`,
      summary: diagnostics.overlap
        ? "Başlık, açıklama ve sonraki panel arasında dikey çakışma tespit edildi."
        : "Modal içinde yatay taşma veya clip tespit edildi.",
      screenshot: screenshotPath,
      detail: diagnostics.overlap ? "vertical_overlap" : "horizontal_overflow",
    });
  }

  if (diagnostics.dialogWidth > scenario.maxDialogWidth) {
    summary.issues.push({
      route: scenario.route,
      tab: tabLabel,
      kind: "modal_surface_violation",
      severity: "p1",
      title: `${tabLabel} modal yuzeyi gereksiz genis aciliyor`,
      summary: "Workspace modal gereğinden geniş açıldığı için içerik hiyerarşisi gevşiyor ve odak kayboluyor.",
      screenshot: screenshotPath,
      detail: `dialog_width=${Math.round(diagnostics.dialogWidth)}`,
    });
  }

  if (
    diagnostics.hasEmptyStateSignal
    && diagnostics.hasEmptySurface
    && (diagnostics.emptySurfaceCoverage === null || diagnostics.emptySurfaceCoverage < 0.9 || diagnostics.mainPanelWidth > 1120)
  ) {
    summary.issues.push({
      route: scenario.route,
      tab: tabLabel,
      kind: "empty_surface",
      severity: "p1",
      title: `${tabLabel} modal bos durumda olu alan uretiyor`,
      summary: "Boş durum modali ana paneli görev odaklı doldurmuyor; fazla ölü alan bırakıyor.",
      screenshot: screenshotPath,
      detail: `coverage=${diagnostics.emptySurfaceCoverage ?? "n/a"} main_width=${Math.round(diagnostics.mainPanelWidth)}`,
    });
  }

  if (diagnostics.duplicateHeadings.length > 0) {
    summary.issues.push({
      route: scenario.route,
      tab: tabLabel,
      kind: "widget_hierarchy_gap",
      severity: "p2",
      title: `${tabLabel} modalinda baslik tekrari var`,
      summary: "Ana bölüm başlığı ile boş state ya da detay başlığı aynı metni tekrar ediyor; yüzey gereksiz kalabalık görünüyor.",
      screenshot: screenshotPath,
      detail: diagnostics.duplicateHeadings.join(" | "),
    });
  }

  if (diagnostics.leftRailWidth > 0 && diagnostics.denseRailHintCount >= 2) {
    summary.issues.push({
      route: scenario.route,
      tab: tabLabel,
      kind: "widget_hierarchy_gap",
      severity: "p2",
      title: `${tabLabel} modal sol rail kartlari fazla yogun`,
      summary: "Sol rail ipucu metinleri kompakt çalışma modunda fazla sıkışıyor; görev kartları daha temiz bir özet düzenine çekilmeli.",
      screenshot: screenshotPath,
      detail: `left_rail_width=${Math.round(diagnostics.leftRailWidth)} dense_hints=${diagnostics.denseRailHintCount}`,
    });
  }
}

async function captureScenarioTabs(
  page: any,
  summary: ModalAuditSummary,
  scenario: ScenarioConfig,
  tabs: Array<{ label: string; activate: () => Promise<void> }>,
) {
  for (const tab of tabs) {
    await tab.activate();
    await page.waitForTimeout(700);

    const screenshotPath = resolveAtlasOutputPath("jarvis", "modal-audit", `${scenario.screenshotPrefix}-${tab.label}.png`);
    await page.screenshot({ path: screenshotPath, fullPage: true });
    summary.screenshots.push(screenshotPath);

    const diagnostics = await collectModalDiagnostics(page);
    pushIssuesFromDiagnostics(summary, diagnostics, screenshotPath, tab.label, scenario);
  }
}

async function captureSingleScenario(
  page: any,
  summary: ModalAuditSummary,
  scenario: ScenarioConfig,
  label: string,
) {
  await page.waitForTimeout(700);
  const screenshotPath = resolveAtlasOutputPath("jarvis", "modal-audit", `${scenario.screenshotPrefix}-${label}.png`);
  await page.screenshot({ path: screenshotPath, fullPage: true });
  summary.screenshots.push(screenshotPath);

  const diagnostics = await collectModalDiagnostics(page);
  pushIssuesFromDiagnostics(summary, diagnostics, screenshotPath, label, scenario);
}

async function auditCustomerRequestsModal(browser: any, summary: ModalAuditSummary) {
  const scenario: ScenarioConfig = {
    route: "/panel/requests#modal",
    screenshotPrefix: "customer-requests",
    maxDialogWidth: 1520,
  };

  const context = await browser.newContext({ viewport: { width: 1920, height: 1080 } });
  const page = await context.newPage();

  try {
    await loginCustomer(page);
    await page.goto(getPortalUrl("/panel/dashboard"), { waitUntil: "networkidle", timeout: 90_000 });
    await page.getByRole("button", { name: /Thread/i }).first().click();
    await page.waitForTimeout(1_200);

    const tabLabels = [
      { button: "Aksiyon", slug: "actions" },
      { button: "Form", slug: "forms" },
      { button: "Belge", slug: "documents" },
      { button: "Geçmiş", slug: "history" },
    ] as const;

    await captureScenarioTabs(
      page,
      summary,
      scenario,
      tabLabels.map((entry) => ({
        label: entry.slug,
        activate: async () => {
          await page.getByRole("tab", { name: new RegExp(`^${entry.button}`, "i") }).first().click();
        },
      })),
    );
  } finally {
    await context.close().catch(() => null);
  }
}

async function auditAdminOperationsModal(browser: any, summary: ModalAuditSummary) {
  const scenario: ScenarioConfig = {
    route: "/admin/customers/[id]#workspace",
    screenshotPrefix: "admin-workspace",
    maxDialogWidth: 1640,
  };

  const context = await browser.newContext({ viewport: { width: 1920, height: 1080 } });
  const page = await context.newPage();

  try {
    await loginAdmin(page);
    await page.goto(getAdminUrl("/admin/customers"), {
      waitUntil: "networkidle",
      timeout: 90_000,
    });
    const searchInput = page.locator('input[type="text"]').first();
    if (await searchInput.isVisible().catch(() => false)) {
      await searchInput.fill("alpy726@gmail.com");
      await page.waitForTimeout(700);
    }

    const customerLink = page.locator('a[href^="/admin/customers/"]').first();
    if (await customerLink.isVisible().catch(() => false)) {
      await customerLink.click();
      await page.waitForURL(/\/admin\/customers\/[^/]+$/, { timeout: 60_000 }).catch(() => null);
    } else {
      await page.goto(getAdminUrl(`/admin/customers/${getAuditCustomerId()}`), {
        waitUntil: "networkidle",
        timeout: 90_000,
      });
    }
    await page.waitForLoadState("networkidle", { timeout: 90_000 }).catch(() => null);
    const operationsHubButton = page
      .locator("button")
      .filter({ hasText: /Open waiting customer|Open internal operations|Musteriden beklenen|Ic operasyonlar|Operations Hub|Operasyon Merkezi/i })
      .first();
    await operationsHubButton.waitFor({ state: "visible", timeout: 30_000 });
    await operationsHubButton.scrollIntoViewIfNeeded().catch(() => null);
    await operationsHubButton.click({ force: true });
    await page.waitForTimeout(1_500);

    const tabLocators = await page.getByRole("tab").all();
    const tabs = await Promise.all(
      tabLocators.slice(0, 4).map(async (locator: any, index: number) => {
        const raw = (await locator.innerText()).trim();
        const label = raw
          ? raw
              .toLocaleLowerCase("tr-TR")
              .replace(/[^a-z0-9]+/gi, "-")
              .replace(/^-+|-+$/g, "")
          : `tab-${index + 1}`;
        return {
          label,
          activate: async () => {
            await locator.click();
          },
        };
      }),
    );

    await captureScenarioTabs(page, summary, scenario, tabs);
  } finally {
    await context.close().catch(() => null);
  }
}

async function auditAdminSupportModal(browser: any, summary: ModalAuditSummary) {
  const scenario: ScenarioConfig = {
    route: "/admin/support#reply-modal",
    screenshotPrefix: "admin-support",
    maxDialogWidth: 1180,
  };

  const context = await browser.newContext({ viewport: { width: 1600, height: 1100 } });
  const page = await context.newPage();

  try {
    await loginAdmin(page);
    await page.goto(getAdminUrl("/admin/support"), { waitUntil: "networkidle", timeout: 90_000 });
    const replyButton = page.getByRole("button", { name: /Yanıtla|Yanitla/i }).first();
    await replyButton.waitFor({ state: "visible", timeout: 30_000 });
    await replyButton.click();
    await captureSingleScenario(page, summary, scenario, "reply");
  } finally {
    await context.close().catch(() => null);
  }
}

async function auditAdminInventoryModal(browser: any, summary: ModalAuditSummary) {
  const scenario: ScenarioConfig = {
    route: "/admin/inventory#movement-modal",
    screenshotPrefix: "admin-inventory",
    maxDialogWidth: 980,
  };

  const context = await browser.newContext({ viewport: { width: 1600, height: 1100 } });
  const page = await context.newPage();

  try {
    await loginAdmin(page);
    await page.goto(getAdminUrl("/admin/inventory"), { waitUntil: "networkidle", timeout: 90_000 });
    const openButton = page.getByRole("button", { name: /Stok Hareketi/i }).first();
    await openButton.waitFor({ state: "visible", timeout: 30_000 });
    await openButton.click();
    await captureSingleScenario(page, summary, scenario, "movement");
  } finally {
    await context.close().catch(() => null);
  }
}

async function auditAdminFormsModal(browser: any, summary: ModalAuditSummary) {
  const scenario: ScenarioConfig = {
    route: "/admin/forms#detail-modal",
    screenshotPrefix: "admin-forms",
    maxDialogWidth: 1360,
  };

  const context = await browser.newContext({ viewport: { width: 1600, height: 1100 } });
  const page = await context.newPage();

  try {
    await loginAdmin(page);
    await page.goto(getAdminUrl("/admin/forms"), { waitUntil: "networkidle", timeout: 90_000 });
    const cardButton = page.locator("button.w-full.text-left, button:has(svg.lucide-eye)").first();
    const cardCount = await cardButton.count();
    if (cardCount === 0) {
      return;
    }

    const isVisible = await cardButton.isVisible().catch(() => false);
    if (!isVisible) {
      return;
    }

    await cardButton.click();
    await captureSingleScenario(page, summary, scenario, "detail");
  } finally {
    await context.close().catch(() => null);
  }
}

export async function runJarvisModalAudit(
  options?: RunJarvisModalAuditOptions,
): Promise<ModalAuditSummary | null> {
  if (!modalAuditEnabled()) {
    return null;
  }

  await mkdir(resolveAtlasOutputPath("jarvis", "modal-audit"), { recursive: true });
  const summaryPath = resolveAtlasOutputPath("jarvis", "modal-audit-summary.json");

  const summary: ModalAuditSummary = {
    generatedAt: new Date().toISOString(),
    route: "workspace-modal-family",
    status: "ok",
    screenshots: [],
    issues: [],
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

    const scenarios = [
      { label: "customer-requests", route: "/panel/requests#modal", run: auditCustomerRequestsModal },
      { label: "admin-workspace", route: "/admin/customers/[id]#workspace", run: auditAdminOperationsModal },
      { label: "admin-support-reply", route: "/admin/support#reply-modal", run: auditAdminSupportModal },
      { label: "admin-inventory-movement", route: "/admin/inventory#movement-modal", run: auditAdminInventoryModal },
      { label: "admin-forms-detail", route: "/admin/forms#detail-modal", run: auditAdminFormsModal },
    ] as const;

    let completedScenarios = 0;
    for (const scenario of scenarios) {
      await scenario.run(browser, summary);
      completedScenarios += 1;
      await persistSummary();
      await options?.onScenarioAudited?.({
        completed: completedScenarios,
        total: scenarios.length,
        route: scenario.route,
        label: scenario.label,
        issueCount: summary.issues.length,
      }, summary);
    }
  } catch (error) {
    summary.status = "failed";
    summary.error = error instanceof Error ? error.message : "Modal audit failed.";
  } finally {
    await browser?.close().catch(() => null);
    await persistSummary();
  }

  return summary;
}
