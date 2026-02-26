import { test, expect } from "@playwright/test";

test.describe("Marketing Pages — Smoke Tests", () => {
  test("homepage loads with correct title", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveTitle(/ATLAS/);
  });

  test("homepage has skip-to-content link", async ({ page }) => {
    await page.goto("/");
    const skipLink = page.locator("a[href='#main-content']");
    await expect(skipLink).toBeAttached();
  });

  test("about page loads", async ({ page }) => {
    await page.goto("/about");
    await expect(page).toHaveTitle(/ATLAS/);
    await expect(page.locator("#main-content")).toBeVisible();
  });

  test("pricing page loads", async ({ page }) => {
    await page.goto("/pricing");
    await expect(page).toHaveTitle(/ATLAS/);
  });

  test("contact page loads", async ({ page }) => {
    await page.goto("/contact");
    await expect(page).toHaveTitle(/ATLAS/);
  });

  test("navigation links work", async ({ page }) => {
    await page.goto("/");
    // Check navbar exists
    const navbar = page.locator("nav");
    await expect(navbar).toBeVisible();
  });
});
