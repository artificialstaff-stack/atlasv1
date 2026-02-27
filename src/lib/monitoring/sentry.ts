/**
 * ─── Sentry Error Monitoring Configuration ───
 * Client-side Sentry init. Server config'i sentry.server.config.ts'de.
 *
 * Kurulum: npm install @sentry/nextjs
 * Sonra next.config.ts'e withSentryConfig wrapper ekle.
 */
/* eslint-disable @typescript-eslint/no-explicit-any */

export function initSentry() {
  const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;
  if (!dsn) {
    if (process.env.NODE_ENV === "development") {
      console.log("[sentry] NEXT_PUBLIC_SENTRY_DSN yok, Sentry devre dışı");
    }
    return;
  }

  // Dynamic import — only load Sentry SDK when DSN is available
  // @ts-expect-error — @sentry/nextjs is an optional peer dependency
  import("@sentry/nextjs").then((Sentry: any) => {
    Sentry.init({
      dsn,
      environment: process.env.NODE_ENV,
      tracesSampleRate: process.env.NODE_ENV === "production" ? 0.2 : 1.0,
      replaysSessionSampleRate: 0.1,
      replaysOnErrorSampleRate: 1.0,
      integrations: [],
      beforeSend(event: any) {
        // PII temizliği
        if (event.user) {
          delete event.user.ip_address;
          delete event.user.email;
        }
        return event;
      },
    });
  }).catch(() => {
    // @sentry/nextjs yüklü değilse sessizce atla
  });
}

/**
 * Hata raporlama yardımcı fonksiyonu.
 * Sentry yüklüyse kullanır, değilse console.error.
 */
export function captureError(error: unknown, context?: Record<string, unknown>) {
  console.error("[error]", error, context);

  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const Sentry = require("@sentry/nextjs");
    if (context) {
      Sentry.withScope((scope: { setExtras: (extras: Record<string, unknown>) => void }) => {
        scope.setExtras(context);
        Sentry.captureException(error);
      });
    } else {
      Sentry.captureException(error);
    }
  } catch {
    // Sentry yüklü değil, console.error zaten yapıldı
  }
}
