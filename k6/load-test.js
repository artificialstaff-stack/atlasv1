/**
 * ─── Atlas Platform — k6 Load Tests ───
 *
 * Install k6: https://k6.io/docs/getting-started/installation/
 * Run:   k6 run k6/load-test.js
 * Cloud: k6 cloud k6/load-test.js
 */

import http from "k6/http";
import { check, sleep, group } from "k6";
import { Rate, Trend } from "k6/metrics";

// Custom metrics
const errorRate = new Rate("errors");
const apiLatency = new Trend("api_latency", true);

// Test configuration
export const options = {
  stages: [
    // Ramp-up: 0 → 50 VU in 2 min
    { duration: "2m", target: 50 },
    // Steady: 50 VU for 5 min
    { duration: "5m", target: 50 },
    // Spike: 50 → 100 VU in 1 min
    { duration: "1m", target: 100 },
    // Hold spike: 100 VU for 2 min
    { duration: "2m", target: 100 },
    // Ramp-down: 100 → 0 in 2 min
    { duration: "2m", target: 0 },
  ],
  thresholds: {
    // SLA: %95 istekler 500ms'den kısa
    http_req_duration: ["p(95)<500", "p(99)<1500"],
    // Error oranı %1'den düşük
    errors: ["rate<0.01"],
    // API latency p95 < 300ms
    api_latency: ["p(95)<300"],
  },
};

const BASE_URL = __ENV.BASE_URL || "http://localhost:3000";

export default function () {
  // ─── Health Check ───
  group("Health Check", () => {
    const res = http.get(`${BASE_URL}/api/health`);
    check(res, {
      "health: status 200": (r) => r.status === 200,
      "health: response time < 200ms": (r) => r.timings.duration < 200,
    });
    errorRate.add(res.status !== 200);
    apiLatency.add(res.timings.duration);
  });

  sleep(0.5);

  // ─── Homepage ───
  group("Homepage", () => {
    const res = http.get(`${BASE_URL}/`);
    check(res, {
      "home: status 200": (r) => r.status === 200,
      "home: response time < 1000ms": (r) => r.timings.duration < 1000,
      "home: body contains ATLAS": (r) => r.body && r.body.includes("ATLAS"),
    });
    errorRate.add(res.status !== 200);
  });

  sleep(0.5);

  // ─── Login Page ───
  group("Login Page", () => {
    const res = http.get(`${BASE_URL}/login`);
    check(res, {
      "login: status 200": (r) => r.status === 200,
      "login: under 800ms": (r) => r.timings.duration < 800,
    });
    errorRate.add(res.status !== 200);
  });

  sleep(0.5);

  // ─── API: OG Image ───
  group("OG Image API", () => {
    const res = http.get(
      `${BASE_URL}/api/og?title=Load%20Test&subtitle=Performance`
    );
    check(res, {
      "og: status 200": (r) => r.status === 200,
      "og: content-type image": (r) =>
        r.headers["Content-Type"]?.includes("image") ?? false,
    });
    errorRate.add(res.status !== 200);
    apiLatency.add(res.timings.duration);
  });

  sleep(1);

  // ─── Rate Limiting Test ───
  group("Rate Limit", () => {
    // Burst 5 requests rapidly
    const responses = [];
    for (let i = 0; i < 5; i++) {
      responses.push(http.get(`${BASE_URL}/api/health`));
    }
    // Last one should still succeed (within limits)
    const last = responses[responses.length - 1];
    check(last, {
      "rate-limit: no 429 on normal load": (r) => r.status !== 429,
    });
  });

  sleep(1);
}

// Summary report
export function handleSummary(data) {
  return {
    "k6/results/summary.json": JSON.stringify(data, null, 2),
    stdout: textSummary(data, { indent: " ", enableColors: true }),
  };
}

// k6 text summary helper
function textSummary(data, opts) {
  // k6 built-in text summary
  try {
    const { textSummary: ts } = require("https://jslib.k6.io/k6-summary/0.0.2/index.js");
    return ts(data, opts);
  } catch {
    return JSON.stringify(data.metrics, null, 2);
  }
}
