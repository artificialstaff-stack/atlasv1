import { test, expect } from "@playwright/test";

test.describe("API Health Check", () => {
  test("health endpoint returns status", async ({ request }) => {
    const response = await request.get("/api/health");
    expect(response.ok()).toBeTruthy();

    const body = await response.json();
    expect(body).toHaveProperty("status");
    expect(body).toHaveProperty("timestamp");
    expect(body).toHaveProperty("version");
    expect(["healthy", "degraded", "unhealthy"]).toContain(body.status);
  });

  test("health endpoint returns security headers", async ({ request }) => {
    const response = await request.get("/api/health");
    const headers = response.headers();
    expect(headers["x-content-type-options"]).toBe("nosniff");
    expect(headers["x-frame-options"]).toBe("SAMEORIGIN");
  });

  test("non-existent API returns 404", async ({ request }) => {
    const response = await request.get("/api/nonexistent", {
      failOnStatusCode: false,
    });
    expect(response.status()).toBe(404);
  });
});
