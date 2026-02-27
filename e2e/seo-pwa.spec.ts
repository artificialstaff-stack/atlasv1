import { test, expect } from '@playwright/test';

test.describe('SEO & Meta Tags', () => {
  const pages = [
    { path: '/', name: 'Homepage' },
    { path: '/about', name: 'About' },
    { path: '/pricing', name: 'Pricing' },
    { path: '/contact', name: 'Contact' },
    { path: '/login', name: 'Login' },
    { path: '/register', name: 'Register' },
  ];

  for (const p of pages) {
    test(`${p.name} page has meta description`, async ({ page }) => {
      await page.goto(p.path);
      const meta = page.locator('meta[name="description"]');
      await expect(meta).toHaveAttribute('content', /.+/);
    });

    test(`${p.name} page has viewport meta`, async ({ page }) => {
      await page.goto(p.path);
      const viewport = page.locator('meta[name="viewport"]');
      await expect(viewport).toHaveAttribute('content', /width/);
    });
  }

  test('robots.txt is accessible', async ({ request }) => {
    const response = await request.get('/robots.txt');
    expect(response.ok()).toBeTruthy();
    const text = await response.text();
    expect(text).toContain('User-agent');
  });

  test('sitemap.xml is accessible', async ({ request }) => {
    const response = await request.get('/sitemap.xml');
    expect(response.ok()).toBeTruthy();
    const text = await response.text();
    expect(text).toContain('urlset');
  });

  test('OG image endpoint works', async ({ request }) => {
    const response = await request.get('/api/og');
    expect(response.ok()).toBeTruthy();
    const contentType = response.headers()['content-type'];
    expect(contentType).toContain('image');
  });
});

test.describe('PWA Manifest & Offline', () => {
  test('manifest.json is accessible', async ({ request }) => {
    const response = await request.get('/manifest.json');
    expect(response.ok()).toBeTruthy();
    const body = await response.json();
    expect(body).toHaveProperty('name');
    expect(body).toHaveProperty('icons');
    expect(body).toHaveProperty('start_url');
  });

  test('offline page loads', async ({ page }) => {
    await page.goto('/offline');
    await expect(page).toHaveTitle(/ATLAS/);
  });
});
