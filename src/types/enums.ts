// =============================================================================
// ATLAS PLATFORM — Enum Değerleri
// Veritabanı CHECK kısıtlamalarıyla senkron
// =============================================================================

import type { Locale } from "@/i18n";

export const ONBOARDING_STATUS = {
  LEAD: "lead",
  VERIFYING: "verifying",
  ONBOARDING: "onboarding",
  ACTIVE: "active",
  SUSPENDED: "suspended",
} as const;

export type OnboardingStatus =
  (typeof ONBOARDING_STATUS)[keyof typeof ONBOARDING_STATUS];

export const ONBOARDING_STATUS_LABELS: Record<OnboardingStatus, string> = {
  lead: "Aday",
  verifying: "Doğrulanıyor",
  onboarding: "Kurulum",
  active: "Aktif",
  suspended: "Askıda",
};

export function getOnboardingStatusLabel(status: OnboardingStatus, locale: Locale = "tr"): string {
  if (locale === "en") {
    return {
      lead: "Lead",
      verifying: "Verifying",
      onboarding: "Onboarding",
      active: "Active",
      suspended: "Suspended",
    }[status];
  }

  return ONBOARDING_STATUS_LABELS[status];
}

// ─────────────────────────────────────────────

export const USER_ROLE = {
  SUPER_ADMIN: "super_admin",
  ADMIN: "admin",
  MODERATOR: "moderator",
  VIEWER: "viewer",
  CUSTOMER: "customer",
} as const;

export type UserRole = (typeof USER_ROLE)[keyof typeof USER_ROLE];

export const USER_ROLE_LABELS: Record<UserRole, string> = {
  super_admin: "Süper Admin",
  admin: "Admin",
  moderator: "Moderatör",
  viewer: "İzleyici",
  customer: "Müşteri",
};

// ─────────────────────────────────────────────

export const PLAN_TIER = {
  STARTER: "starter",
  GROWTH: "growth",
  PROFESSIONAL: "professional",
  GLOBAL_SCALE: "global_scale",
} as const;

export type PlanTier = (typeof PLAN_TIER)[keyof typeof PLAN_TIER];

export const PLAN_TIER_LABELS: Record<PlanTier, string> = {
  starter: "Başlangıç",
  growth: "Büyüme",
  professional: "Profesyonel",
  global_scale: "Global Ölçek",
};

export function getPlanTierLabel(planTier: PlanTier, locale: Locale = "tr"): string {
  if (locale === "en") {
    return {
      starter: "Starter",
      growth: "Growth",
      professional: "Professional",
      global_scale: "Global Scale",
    }[planTier];
  }

  return PLAN_TIER_LABELS[planTier];
}

// ─────────────────────────────────────────────

export const PAYMENT_STATUS = {
  PENDING: "pending",
  CLEARED: "cleared",
  OVERDUE: "overdue",
  CANCELLED: "cancelled",
} as const;

export type PaymentStatus =
  (typeof PAYMENT_STATUS)[keyof typeof PAYMENT_STATUS];

export const PAYMENT_STATUS_LABELS: Record<PaymentStatus, string> = {
  pending: "Bekliyor",
  cleared: "Onaylandı",
  overdue: "Gecikmiş",
  cancelled: "İptal",
};

export function getPaymentStatusLabel(status: PaymentStatus, locale: Locale = "tr"): string {
  if (locale === "en") {
    return {
      pending: "Pending",
      cleared: "Cleared",
      overdue: "Overdue",
      cancelled: "Cancelled",
    }[status];
  }

  return PAYMENT_STATUS_LABELS[status];
}

// ─────────────────────────────────────────────

export const CONTACT_STATUS = {
  NEW: "new",
  CONTACTED: "contacted",
  QUALIFIED: "qualified",
  CONVERTED: "converted",
  REJECTED: "rejected",
} as const;

export type ContactStatus =
  (typeof CONTACT_STATUS)[keyof typeof CONTACT_STATUS];

export const CONTACT_STATUS_LABELS: Record<ContactStatus, string> = {
  new: "Yeni",
  contacted: "İletişime Geçildi",
  qualified: "Uygun",
  converted: "Dönüştürüldü",
  rejected: "Reddedildi",
};

// ─────────────────────────────────────────────

export const INVITATION_STATUS = {
  PENDING: "pending",
  ACCEPTED: "accepted",
  EXPIRED: "expired",
  REVOKED: "revoked",
} as const;

export type InvitationStatus =
  (typeof INVITATION_STATUS)[keyof typeof INVITATION_STATUS];

// ─────────────────────────────────────────────

export const MOVEMENT_TYPE = {
  INBOUND_RECEIPT: "inbound_receipt",
  ORDER_FULFILLMENT: "order_fulfillment",
  TRANSFER_IN: "transfer_in",
  TRANSFER_OUT: "transfer_out",
  SHRINKAGE: "shrinkage",
  ADJUSTMENT: "adjustment",
  RETURN: "return",
} as const;

export type MovementType =
  (typeof MOVEMENT_TYPE)[keyof typeof MOVEMENT_TYPE];

export const MOVEMENT_TYPE_LABELS: Record<MovementType, string> = {
  inbound_receipt: "Gelen Sevkiyat",
  order_fulfillment: "Sipariş Karşılama",
  transfer_in: "Transfer Giriş",
  transfer_out: "Transfer Çıkış",
  shrinkage: "Fire/Kayıp",
  adjustment: "Düzeltme",
  return: "İade",
};

// ─────────────────────────────────────────────

export const WAREHOUSE_LOCATION = {
  TR: "TR",
  US: "US",
} as const;

export type WarehouseLocation =
  (typeof WAREHOUSE_LOCATION)[keyof typeof WAREHOUSE_LOCATION];

export const WAREHOUSE_LOCATION_LABELS: Record<WarehouseLocation, string> = {
  TR: "Türkiye",
  US: "ABD (Virginia)",
};

// ─────────────────────────────────────────────

export const ORDER_STATUS = {
  RECEIVED: "received",
  PROCESSING: "processing",
  PACKING: "packing",
  SHIPPED: "shipped",
  DELIVERED: "delivered",
  CANCELLED: "cancelled",
  RETURNED: "returned",
} as const;

export type OrderStatus = (typeof ORDER_STATUS)[keyof typeof ORDER_STATUS];

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  received: "Alındı",
  processing: "İşleniyor",
  packing: "Paketleniyor",
  shipped: "Kargoda",
  delivered: "Teslim Edildi",
  cancelled: "İptal",
  returned: "İade",
};

export function getOrderStatusLabel(status: OrderStatus, locale: Locale = "tr"): string {
  if (locale === "en") {
    return {
      received: "Received",
      processing: "Processing",
      packing: "Packing",
      shipped: "Shipped",
      delivered: "Delivered",
      cancelled: "Cancelled",
      returned: "Returned",
    }[status];
  }

  return ORDER_STATUS_LABELS[status];
}

// ─────────────────────────────────────────────

export const PLATFORM = {
  AMAZON: "amazon",
  SHOPIFY: "shopify",
  WALMART: "walmart",
  ETSY: "etsy",
  DIRECT: "direct",
  OTHER: "other",
} as const;

export type Platform = (typeof PLATFORM)[keyof typeof PLATFORM];

export const PLATFORM_LABELS: Record<Platform, string> = {
  amazon: "Amazon",
  shopify: "Shopify",
  walmart: "Walmart",
  etsy: "Etsy",
  direct: "Doğrudan",
  other: "Diğer",
};

export function getPlatformLabel(platform: Platform, locale: Locale = "tr"): string {
  if (locale === "en") {
    return {
      amazon: "Amazon",
      shopify: "Shopify",
      walmart: "Walmart",
      etsy: "Etsy",
      direct: "Direct",
      other: "Other",
    }[platform];
  }

  return PLATFORM_LABELS[platform];
}

// ─────────────────────────────────────────────

export const TASK_STATUS = {
  PENDING: "pending",
  IN_PROGRESS: "in_progress",
  COMPLETED: "completed",
  BLOCKED: "blocked",
} as const;

export type TaskStatus = (typeof TASK_STATUS)[keyof typeof TASK_STATUS];

export const TASK_STATUS_LABELS: Record<TaskStatus, string> = {
  pending: "Bekliyor",
  in_progress: "Devam Ediyor",
  completed: "Tamamlandı",
  blocked: "Engellendi",
};

export function getTaskStatusLabel(status: TaskStatus, locale: Locale = "tr"): string {
  if (locale === "en") {
    return {
      pending: "Pending",
      in_progress: "In progress",
      completed: "Completed",
      blocked: "Blocked",
    }[status];
  }

  return TASK_STATUS_LABELS[status];
}

// ─────────────────────────────────────────────

export const TASK_CATEGORY = {
  LEGAL: "legal",
  TAX: "tax",
  CUSTOMS: "customs",
  LOGISTICS: "logistics",
  MARKETPLACE: "marketplace",
  OTHER: "other",
} as const;

export type TaskCategory =
  (typeof TASK_CATEGORY)[keyof typeof TASK_CATEGORY];

export const TASK_CATEGORY_LABELS: Record<TaskCategory, string> = {
  legal: "Hukuki",
  tax: "Vergi",
  customs: "Gümrük",
  logistics: "Lojistik",
  marketplace: "Pazar Yeri",
  other: "Diğer",
};

export function getTaskCategoryLabel(category: TaskCategory, locale: Locale = "tr"): string {
  if (locale === "en") {
    return {
      legal: "Legal",
      tax: "Tax",
      customs: "Customs",
      logistics: "Logistics",
      marketplace: "Marketplace",
      other: "Other",
    }[category];
  }

  return TASK_CATEGORY_LABELS[category];
}

// ─────────────────────────────────────────────

export const TICKET_STATUS = {
  OPEN: "open",
  INVESTIGATING: "investigating",
  WAITING_CUSTOMER: "waiting_customer",
  RESOLVED: "resolved",
  CLOSED: "closed",
} as const;

export type TicketStatus =
  (typeof TICKET_STATUS)[keyof typeof TICKET_STATUS];

export const TICKET_STATUS_LABELS: Record<TicketStatus, string> = {
  open: "Açık",
  investigating: "İnceleniyor",
  waiting_customer: "Müşteri Bekleniyor",
  resolved: "Çözüldü",
  closed: "Kapatıldı",
};

// ─────────────────────────────────────────────

export const TICKET_PRIORITY = {
  LOW: "low",
  MEDIUM: "medium",
  HIGH: "high",
  URGENT: "urgent",
} as const;

export type TicketPriority =
  (typeof TICKET_PRIORITY)[keyof typeof TICKET_PRIORITY];

export const TICKET_PRIORITY_LABELS: Record<TicketPriority, string> = {
  low: "Düşük",
  medium: "Orta",
  high: "Yüksek",
  urgent: "Acil",
};
