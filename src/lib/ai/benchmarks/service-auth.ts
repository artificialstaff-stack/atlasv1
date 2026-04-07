export function hasBenchmarkServiceAccess(request: Request) {
  const expectedToken = process.env.ATLAS_BENCHMARK_SERVICE_TOKEN;
  if (!expectedToken) {
    return false;
  }

  const authHeader = request.headers.get("authorization");
  const headerToken = authHeader?.startsWith("Bearer ") ? authHeader.slice(7).trim() : null;
  const directToken = request.headers.get("x-atlas-benchmark-token");
  const token = headerToken || directToken;

  return Boolean(token && token === expectedToken);
}
