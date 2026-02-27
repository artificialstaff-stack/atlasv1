/**
 * ─── Atlas Platform — Feature Flags Service ───
 * Simple config-based feature flags with role/user targeting.
 */

export interface FeatureFlag {
  key: string;
  description: string;
  enabled: boolean;
  /** Roles allowed to see this feature (empty = all) */
  allowedRoles?: string[];
  /** Specific user IDs (for beta testing) */
  allowedUsers?: string[];
  /** Percentage rollout (0-100) */
  rolloutPercentage?: number;
}

/** Feature flags registry */
const FLAGS: Map<string, FeatureFlag> = new Map();

/** Default feature flags */
const DEFAULT_FLAGS: FeatureFlag[] = [
  {
    key: "ai_copilot",
    description: "CopilotKit AI assistant in dashboard",
    enabled: true,
    allowedRoles: ["admin", "super_admin", "moderator"],
  },
  {
    key: "advanced_analytics",
    description: "Advanced analytics and custom reports",
    enabled: true,
    allowedRoles: ["admin", "super_admin"],
  },
  {
    key: "bulk_import",
    description: "CSV/JSON bulk product import",
    enabled: true,
  },
  {
    key: "webhook_system",
    description: "Webhook event delivery system",
    enabled: true,
    allowedRoles: ["admin", "super_admin"],
  },
  {
    key: "pdf_export",
    description: "PDF invoice/report export",
    enabled: true,
  },
  {
    key: "realtime_notifications",
    description: "Real-time push notifications",
    enabled: true,
  },
  {
    key: "sla_monitoring",
    description: "SLA tracking and alerts",
    enabled: true,
    allowedRoles: ["admin", "super_admin", "moderator"],
  },
  {
    key: "dark_mode",
    description: "Dark mode theme toggle",
    enabled: false,
    rolloutPercentage: 0,
  },
  {
    key: "customer_portal",
    description: "Public-facing customer order portal",
    enabled: true,
  },
  {
    key: "multi_language",
    description: "Multi-language i18n support",
    enabled: true,
  },
];

// Initialize default flags
DEFAULT_FLAGS.forEach((f) => FLAGS.set(f.key, f));

/** Check if a feature is enabled for a given context */
export function isFeatureEnabled(
  key: string,
  context?: { userId?: string; role?: string }
): boolean {
  const flag = FLAGS.get(key);
  if (!flag) return false;
  if (!flag.enabled) return false;

  // Check role restriction
  if (flag.allowedRoles && flag.allowedRoles.length > 0) {
    if (!context?.role || !flag.allowedRoles.includes(context.role)) {
      // Check specific user override
      if (flag.allowedUsers?.includes(context?.userId ?? "")) return true;
      return false;
    }
  }

  // Check user allowlist
  if (flag.allowedUsers && flag.allowedUsers.length > 0) {
    if (!context?.userId || !flag.allowedUsers.includes(context.userId)) {
      // If role check already passed, allow
      if (!flag.allowedRoles || flag.allowedRoles.length === 0) return false;
    }
  }

  // Check percentage rollout
  if (flag.rolloutPercentage !== undefined && flag.rolloutPercentage < 100) {
    if (!context?.userId) return false;
    const hash = simpleHash(context.userId + key);
    if (hash % 100 >= flag.rolloutPercentage) return false;
  }

  return true;
}

/** Get all feature flags (admin view) */
export function getAllFlags(): FeatureFlag[] {
  return Array.from(FLAGS.values());
}

/** Update a feature flag */
export function updateFlag(key: string, updates: Partial<FeatureFlag>): boolean {
  const flag = FLAGS.get(key);
  if (!flag) return false;
  FLAGS.set(key, { ...flag, ...updates, key }); // key is immutable
  return true;
}

/** Register a new feature flag */
export function registerFlag(flag: FeatureFlag): void {
  FLAGS.set(flag.key, flag);
}

/** Simple deterministic hash for percentage rollout */
function simpleHash(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0; // Convert to 32bit integer
  }
  return Math.abs(hash);
}
