/**
 * Error Tracking — Production error monitoring integration point
 *
 * This module provides a unified interface for error tracking.
 * Currently logs to structured logger; swap to Sentry/Axiom/Datadog when ready.
 *
 * Usage:
 *   import { captureError, captureMessage } from "@/lib/error-tracking";
 *   captureError(error, { context: "order-creation", userId: "abc" });
 */

import { logger } from "./logger";

interface ErrorContext {
  /** Human-readable context label */
  context?: string;
  /** User ID if available */
  userId?: string;
  /** Request ID for correlation */
  requestId?: string;
  /** Additional metadata */
  [key: string]: unknown;
}

/**
 * Capture and report an error to the error tracking service.
 * In development, logs to console. In production, would send to Sentry/Axiom.
 */
export function captureError(error: unknown, context?: ErrorContext): void {
  const err = error instanceof Error ? error : new Error(String(error));

  logger.error(err.message, {
    ...context,
    stack: err.stack,
    name: err.name,
  });

  // ─── Sentry Integration Point ───
  // When ready, uncomment and install @sentry/nextjs:
  //
  // if (typeof window !== "undefined") {
  //   Sentry.captureException(err, { extra: context });
  // } else {
  //   Sentry.captureException(err, { extra: context });
  // }
}

/**
 * Capture a non-error message (warning, info) to tracking service.
 */
export function captureMessage(
  message: string,
  level: "info" | "warning" = "info",
  context?: ErrorContext
): void {
  if (level === "warning") {
    logger.warn(message, context);
  } else {
    logger.info(message, context);
  }

  // Sentry.captureMessage(message, level);
}

/**
 * Set user context for error tracking (call after auth).
 */
export function setUser(user: {
  id: string;
  email?: string;
  role?: string;
} | null): void {
  if (user) {
    logger.info("User context set", {
      userId: user.id,
      role: user.role,
    });
  }

  // Sentry.setUser(user ? { id: user.id, email: user.email } : null);
}
