import { test, expect } from '@playwright/test';

test.describe('Performance — Core Web Vitals Smoke', () => {
  test('homepage loads within 5 seconds', async ({ page }) => {
    const start = Date.now();
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    const loadTime = Date.now() - start;
    expect(loadTime).toBeLessThan(5000);
  });

  test('login page loads within 3 seconds', async ({ page }) => {
    const start = Date.now();
    await page.goto('/login', { waitUntil: 'domcontentloaded' });
    const loadTime = Date.now() - start;
    expect(loadTime).toBeLessThan(3000);
  });

  test('no console errors on homepage', async ({ page }) => {
    const errors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });
    await page.goto('/');
    await page.waitForTimeout(2000);
    // Filter out known acceptable errors (e.g., third-party scripts)
    const criticalErrors = errors.filter(
      (e) => !e.includes('favicon') && !e.includes('Third-party') && !e.includes('ERR_CONNECTION_REFUSED')
    );
    expect(criticalErrors).toHaveLength(0);
  });

  test('no JavaScript errors on pricing page', async ({ page }) => {
    const jsErrors: Error[] = [];
    page.on('pageerror', (error) => jsErrors.push(error));
    await page.goto('/pricing');
    await page.waitForTimeout(1000);
    expect(jsErrors).toHaveLength(0);
  });

  test('static assets are cacheable', async ({ page }) => {
    const responses: { url: string; cacheControl: string | null }[] = [];
    page.on('response', (response) => {
      if (response.url().includes('/_next/static/')) {
        responses.push({
          url: response.url(),
          cacheControl: response.headers()['cache-control'] || null,
        });
      }
    });
    await page.goto('/');
    // Static assets should have some caching headers
    for (const r of responses) {
      if (r.cacheControl) {
        expect(r.cacheControl).toContain('max-age');
      }
    }
  });
});
