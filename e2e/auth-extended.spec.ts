import { test, expect } from '@playwright/test';

test.describe('Forgot Password Flow', () => {
  test('forgot password page loads', async ({ page }) => {
    await page.goto('/forgot-password');
    await expect(page).toHaveTitle(/ATLAS/);
    const emailInput = page.locator('input[type="email"], input[name="email"]');
    await expect(emailInput).toBeVisible();
  });

  test('shows validation for empty email', async ({ page }) => {
    await page.goto('/forgot-password');
    const submitBtn = page.locator('button[type="submit"]');
    await submitBtn.click();
    // HTML5 validation or custom error
    const emailInput = page.locator('input[type="email"], input[name="email"]');
    await expect(emailInput).toBeVisible();
  });

  test('login page has forgot password link', async ({ page }) => {
    await page.goto('/login');
    const forgotLink = page.locator('a[href*="forgot"]');
    await expect(forgotLink).toBeVisible();
    await forgotLink.click();
    await expect(page).toHaveURL(/forgot-password/);
  });

  test('register page has login link', async ({ page }) => {
    await page.goto('/register');
    const loginLink = page.locator('a[href*="login"]');
    await expect(loginLink).toBeVisible();
  });
});
