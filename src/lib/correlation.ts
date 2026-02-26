/**
 * Request Correlation — Trace every request through the system
 *
 * Generates unique request IDs for correlation across logs, errors, and traces.
 * Attach to logger.child({ requestId }) for full request tracing.
 */

/**
 * Generate a unique request ID using crypto.randomUUID (Edge-compatible)
 */
export function generateRequestId(): string {
  return typeof crypto !== "undefined" && crypto.randomUUID
    ? crypto.randomUUID()
    : `req_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
}

/**
 * Extract or generate a request ID from incoming request headers.
 * Looks for standard headers: x-request-id, x-correlation-id, x-trace-id
 */
export function getRequestId(request: Request): string {
  return (
    request.headers.get("x-request-id") ??
    request.headers.get("x-correlation-id") ??
    request.headers.get("x-trace-id") ??
    generateRequestId()
  );
}

/**
 * Standard header name for request correlation
 */
export const REQUEST_ID_HEADER = "x-request-id";
