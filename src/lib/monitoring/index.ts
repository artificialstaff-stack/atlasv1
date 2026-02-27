/**
 * ─── Atlas Platform — Performance Monitoring Service ───
 * In-memory request metrics, API timing, error tracking.
 */

export interface RequestMetric {
  path: string;
  method: string;
  statusCode: number;
  durationMs: number;
  timestamp: number;
}

export interface PerformanceSummary {
  totalRequests: number;
  avgResponseTime: number;
  p95ResponseTime: number;
  p99ResponseTime: number;
  errorRate: number;
  topEndpoints: { path: string; count: number; avgMs: number }[];
  statusCodes: Record<string, number>;
  uptime: number;
}

const MAX_METRICS = 10000;
const metrics: RequestMetric[] = [];
const startTime = Date.now();

/** Record a request metric */
export function recordMetric(metric: RequestMetric): void {
  metrics.push(metric);
  // Ring buffer — keep last N entries
  if (metrics.length > MAX_METRICS) {
    metrics.splice(0, metrics.length - MAX_METRICS);
  }
}

/** Create a timer for measuring request duration */
export function startTimer(): () => number {
  const start = performance.now();
  return () => Math.round(performance.now() - start);
}

/** Get performance summary for the last N minutes */
export function getPerformanceSummary(minutesBack = 60): PerformanceSummary {
  const cutoff = Date.now() - minutesBack * 60 * 1000;
  const recent = metrics.filter((m) => m.timestamp >= cutoff);

  if (recent.length === 0) {
    return {
      totalRequests: 0,
      avgResponseTime: 0,
      p95ResponseTime: 0,
      p99ResponseTime: 0,
      errorRate: 0,
      topEndpoints: [],
      statusCodes: {},
      uptime: Math.round((Date.now() - startTime) / 1000),
    };
  }

  const durations = recent.map((m) => m.durationMs).sort((a, b) => a - b);
  const errorCount = recent.filter((m) => m.statusCode >= 400).length;

  // Status code distribution
  const statusCodes: Record<string, number> = {};
  recent.forEach((m) => {
    const group = `${Math.floor(m.statusCode / 100)}xx`;
    statusCodes[group] = (statusCodes[group] || 0) + 1;
  });

  // Top endpoints by count
  const endpointMap = new Map<string, { count: number; totalMs: number }>();
  recent.forEach((m) => {
    const key = `${m.method} ${m.path}`;
    const existing = endpointMap.get(key) || { count: 0, totalMs: 0 };
    existing.count++;
    existing.totalMs += m.durationMs;
    endpointMap.set(key, existing);
  });

  const topEndpoints = Array.from(endpointMap.entries())
    .map(([path, stats]) => ({
      path,
      count: stats.count,
      avgMs: Math.round(stats.totalMs / stats.count),
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  return {
    totalRequests: recent.length,
    avgResponseTime: Math.round(durations.reduce((a, b) => a + b, 0) / durations.length),
    p95ResponseTime: durations[Math.floor(durations.length * 0.95)] ?? 0,
    p99ResponseTime: durations[Math.floor(durations.length * 0.99)] ?? 0,
    errorRate: Math.round((errorCount / recent.length) * 100 * 10) / 10,
    topEndpoints,
    statusCodes,
    uptime: Math.round((Date.now() - startTime) / 1000),
  };
}

/** Get raw metrics (admin only) */
export function getRawMetrics(limit = 100): RequestMetric[] {
  return metrics.slice(-limit);
}

/** Reset all metrics (admin/test utility) */
export function resetMetrics(): void {
  metrics.length = 0;
}
