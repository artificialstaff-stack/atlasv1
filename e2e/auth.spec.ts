import { test, expect } from "@playwright/test";

test.describe("Auth Flow — E2E", () => {
  test("login page loads with form", async ({ page }) => {
    await page.goto("/login");
    await expect(page).toHaveTitle(/ATLAS/);
    // Should have email and password fields
    const emailInput = page.locator('input[type="email"], input[name="email"]');
    await expect(emailInput).toBeVisible();
  });

  test("register page loads with form", async ({ page }) => {
    await page.goto("/register");
    await expect(page).toHaveTitle(/ATLAS/);
  });

  test("unauthenticated user is redirected from admin", async ({ page }) => {
    await page.goto("/admin/dashboard");
    // Should redirect to login
    await page.waitForURL(/\/login/);
    await expect(page).toHaveURL(/\/login/);
  });

  test("unauthenticated user is redirected from panel", async ({ page }) => {
    await page.goto("/panel/dashboard");
    // Should redirect to login
    await page.waitForURL(/\/login/);
    await expect(page).toHaveURL(/\/login/);
  });
});
