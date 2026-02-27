import { test, expect } from '@playwright/test';

test.describe('Responsive Design — Mobile', () => {
  // Uses mobile-chrome project viewport (Pixel 5: 393x851)

  test('homepage renders on mobile', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('body')).toBeVisible();
    // Should not have horizontal scroll
    const bodyWidth = await page.evaluate(() => document.body.scrollWidth);
    const viewportWidth = await page.evaluate(() => window.innerWidth);
    expect(bodyWidth).toBeLessThanOrEqual(viewportWidth + 5); // Small tolerance
  });

  test('navigation is accessible on mobile', async ({ page }) => {
    await page.goto('/');
    // Should have hamburger menu or mobile nav
    const nav = page.locator('nav');
    await expect(nav).toBeVisible();
  });

  test('login form is usable on mobile', async ({ page }) => {
    await page.goto('/login');
    const emailInput = page.locator('input[type="email"], input[name="email"]');
    await expect(emailInput).toBeVisible();
    // Input should be wide enough to type in
    const box = await emailInput.boundingBox();
    expect(box?.width).toBeGreaterThan(200);
  });

  test('pricing cards stack on mobile', async ({ page }) => {
    await page.goto('/pricing');
    await expect(page.locator('body')).toBeVisible();
    // Page should render without overflow
    const bodyWidth = await page.evaluate(() => document.body.scrollWidth);
    const viewportWidth = await page.evaluate(() => window.innerWidth);
    expect(bodyWidth).toBeLessThanOrEqual(viewportWidth + 5);
  });
});
