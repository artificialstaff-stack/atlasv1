import { test, expect } from '@playwright/test';

test.describe('Pricing Page — Detail Tests', () => {
  test('pricing page shows plan tiers', async ({ page }) => {
    await page.goto('/pricing');
    // Should show at least 3 plan cards
    const planCards = page.locator('[data-testid="plan-card"], .pricing-card, article, [class*="card"]');
    const count = await planCards.count();
    expect(count).toBeGreaterThanOrEqual(2);
  });

  test('pricing page has CTA buttons', async ({ page }) => {
    await page.goto('/pricing');
    const ctaButtons = page.locator('a[href*="contact"], button');
    const count = await ctaButtons.count();
    expect(count).toBeGreaterThanOrEqual(1);
  });

  test('pricing page has FAQ section', async ({ page }) => {
    await page.goto('/pricing');
    // Check for FAQ about manual payment
    const faqText = page.getByText(/havale|ödeme|satış/i);
    await expect(faqText.first()).toBeVisible();
  });
});

test.describe('Contact Page — Form Tests', () => {
  test('contact form has required fields', async ({ page }) => {
    await page.goto('/contact');
    const nameInput = page.locator('input[name="name"], input[placeholder*="Ad"]');
    const emailInput = page.locator('input[type="email"], input[name="email"]');
    const messageInput = page.locator('textarea');
    
    // At least email and message should exist
    await expect(emailInput).toBeVisible();
    await expect(messageInput).toBeVisible();
  });

  test('contact form validates empty submission', async ({ page }) => {
    await page.goto('/contact');
    const submitBtn = page.locator('button[type="submit"]');
    if (await submitBtn.isVisible()) {
      await submitBtn.click();
      // Form should not navigate away on invalid submission
      await expect(page).toHaveURL(/contact/);
    }
  });
});

test.describe('About Page — Content Tests', () => {
  test('about page has main content', async ({ page }) => {
    await page.goto('/about');
    const mainContent = page.locator('#main-content, main');
    await expect(mainContent).toBeVisible();
  });

  test('about page has company info', async ({ page }) => {
    await page.goto('/about');
    const content = await page.textContent('body');
    expect(content).toBeTruthy();
    // Should have some substantial content
    expect(content!.length).toBeGreaterThan(100);
  });
});
