/**
 * ─── Atlas Analytics — Event Tracking ───
 * PostHog / Plausible / custom analytics wrapper.
 * API key yoksa dev modda sadece loglar.
 */
/* eslint-disable @typescript-eslint/no-explicit-any */

export type EventName =
  | "page_view"
  | "sign_up"
  | "sign_in"
  | "order_created"
  | "product_added"
  | "document_uploaded"
  | "support_ticket_created"
  | "ai_chat_message"
  | "ai_action_triggered"
  | "subscription_started"
  | "payment_completed"
  | "feature_used";

interface EventProperties {
  [key: string]: string | number | boolean | null;
}

interface AnalyticsConfig {
  posthogKey?: string;
  posthogHost?: string;
  enabled: boolean;
}

let config: AnalyticsConfig = {
  enabled: false,
};

/**
 * Analytics başlat — client-side önce çağır
 */
export function initAnalytics() {
  const key = process.env.NEXT_PUBLIC_POSTHOG_KEY;
  const host = process.env.NEXT_PUBLIC_POSTHOG_HOST ?? "https://app.posthog.com";

  config = {
    posthogKey: key,
    posthogHost: host,
    enabled: !!key,
  };

  if (!key) {
    if (process.env.NODE_ENV === "development") {
      console.log("[analytics] NEXT_PUBLIC_POSTHOG_KEY yok, analytics dev modda");
    }
    return;
  }

  // PostHog lazy-load
  if (typeof window !== "undefined") {
    // @ts-expect-error — posthog-js is an optional peer dependency
    import("posthog-js")
      .then((posthog: any) => {
        posthog.default.init(key, {
          api_host: host,
          capture_pageview: true,
          capture_pageleave: true,
          autocapture: false, // Manuel kontrol
          persistence: "localStorage",
          loaded: (ph: any) => {
            if (process.env.NODE_ENV === "development") ph.opt_out_capturing();
          },
        });
      })
      .catch(() => {
        // posthog-js yüklü değilse sessizce atla
      });
  }
}

/**
 * Event izle
 */
export function trackEvent(event: EventName, properties?: EventProperties) {
  if (!config.enabled) {
    if (process.env.NODE_ENV === "development") {
      console.log("[analytics:dev]", event, properties);
    }
    return;
  }

  try {
    if (typeof window !== "undefined") {
      // @ts-expect-error — posthog-js is an optional peer dependency
      import("posthog-js").then((posthog: any) => {
        posthog.default.capture(event, properties ?? {});
      }).catch(() => {});
    }
  } catch {
    // sessiz hata
  }
}

/**
 * Kullanıcı tanımla (login sonrası)
 */
export function identifyUser(userId: string, traits?: EventProperties) {
  if (!config.enabled) {
    if (process.env.NODE_ENV === "development") {
      console.log("[analytics:dev] identify", userId, traits);
    }
    return;
  }

  try {
    if (typeof window !== "undefined") {
      // @ts-expect-error — posthog-js is an optional peer dependency
      import("posthog-js").then((posthog: any) => {
        posthog.default.identify(userId, traits ?? {});
      }).catch(() => {});
    }
  } catch {
    // sessiz hata
  }
}

/**
 * Sayfa görüntüleme
 */
export function trackPageView(path: string) {
  trackEvent("page_view", { path });
}
