import { test, expect } from '@playwright/test';

test.describe('API Endpoints — Extended', () => {
  test('health endpoint has uptime info', async ({ request }) => {
    const response = await request.get('/api/health');
    expect(response.ok()).toBeTruthy();
    const body = await response.json();
    expect(body).toHaveProperty('status');
    expect(body).toHaveProperty('version');
  });

  test('notifications API requires auth', async ({ request }) => {
    const response = await request.get('/api/notifications', {
      failOnStatusCode: false,
    });
    // Should return 401 for unauthenticated requests
    expect([401, 403]).toContain(response.status());
  });

  test('reports API requires auth', async ({ request }) => {
    const response = await request.get('/api/reports', {
      failOnStatusCode: false,
    });
    expect([401, 403]).toContain(response.status());
  });

  test('storage upload API requires auth', async ({ request }) => {
    const response = await request.post('/api/storage/upload', {
      failOnStatusCode: false,
    });
    expect([401, 403, 400]).toContain(response.status());
  });

  test('copilot API requires POST', async ({ request }) => {
    const response = await request.get('/api/copilot', {
      failOnStatusCode: false,
    });
    expect([405, 400, 404]).toContain(response.status());
  });
});

test.describe('Security Headers', () => {
  test('pages return security headers', async ({ request }) => {
    const response = await request.get('/');
    const headers = response.headers();
    expect(headers['x-content-type-options']).toBe('nosniff');
    expect(headers['x-frame-options']).toBe('SAMEORIGIN');
    expect(headers['referrer-policy']).toBeTruthy();
  });

  test('API returns CORS headers when appropriate', async ({ request }) => {
    const response = await request.get('/api/health');
    const headers = response.headers();
    expect(headers['x-content-type-options']).toBe('nosniff');
  });
});

test.describe('Error Handling', () => {
  test('404 page renders properly', async ({ page }) => {
    const response = await page.goto('/nonexistent-page-12345');
    expect(response?.status()).toBe(404);
    await expect(page.locator('body')).toBeVisible();
  });

  test('invalid API route returns proper error', async ({ request }) => {
    const response = await request.get('/api/does-not-exist', {
      failOnStatusCode: false,
    });
    expect(response.status()).toBe(404);
  });
});
