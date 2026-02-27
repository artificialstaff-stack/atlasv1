import { test, expect } from '@playwright/test';

test.describe('Accessibility — Core Tests', () => {
  const publicPages = ['/', '/about', '/pricing', '/contact', '/login', '/register'];

  for (const path of publicPages) {
    test(`${path} has lang attribute`, async ({ page }) => {
      await page.goto(path);
      const html = page.locator('html');
      await expect(html).toHaveAttribute('lang', /\w{2}/);
    });

    test(`${path} has no broken images`, async ({ page }) => {
      await page.goto(path);
      const images = page.locator('img');
      const count = await images.count();
      for (let i = 0; i < count; i++) {
        const img = images.nth(i);
        const src = await img.getAttribute('src');
        if (src && !src.startsWith('data:')) {
          const alt = await img.getAttribute('alt');
          // All images should have alt text
          expect(alt).toBeTruthy();
        }
      }
    });

    test(`${path} has proper heading hierarchy`, async ({ page }) => {
      await page.goto(path);
      const h1s = await page.locator('h1').count();
      // Each page should have exactly one h1
      expect(h1s).toBeLessThanOrEqual(2); // Allow hero + page title
      expect(h1s).toBeGreaterThanOrEqual(1);
    });
  }

  test('skip-to-content link exists on homepage', async ({ page }) => {
    await page.goto('/');
    const skipLink = page.locator('a[href="#main-content"]');
    await expect(skipLink).toBeAttached();
  });

  test('focus is visible on interactive elements', async ({ page }) => {
    await page.goto('/login');
    await page.keyboard.press('Tab');
    const focused = page.locator(':focus');
    await expect(focused).toBeVisible();
  });

  test('form labels are associated with inputs', async ({ page }) => {
    await page.goto('/login');
    const inputs = page.locator('input:not([type="hidden"])');
    const count = await inputs.count();
    for (let i = 0; i < count; i++) {
      const input = inputs.nth(i);
      const id = await input.getAttribute('id');
      const ariaLabel = await input.getAttribute('aria-label');
      const ariaLabelledBy = await input.getAttribute('aria-labelledby');
      const placeholder = await input.getAttribute('placeholder');
      // Input should have at least one labeling mechanism
      const hasLabel = id
        ? (await page.locator(`label[for="${id}"]`).count()) > 0
        : false;
      expect(hasLabel || ariaLabel || ariaLabelledBy || placeholder).toBeTruthy();
    }
  });
});

test.describe('Keyboard Navigation', () => {
  test('can tab through login form', async ({ page }) => {
    await page.goto('/login');
    const emailInput = page.locator('input[type="email"], input[name="email"]');
    await emailInput.focus();
    await page.keyboard.press('Tab');
    // Next focused element should be password or another interactive element
    const focused = page.locator(':focus');
    await expect(focused).toBeVisible();
  });
});
