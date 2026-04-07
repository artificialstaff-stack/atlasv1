import { DEFAULT_LOCALE, translate, type Locale } from "@/i18n";

import type { CustomerModuleAccess, CustomerModuleKey } from "./types";

export const ATLAS_BLUEPRINT_VERSION = "2026-03-28";

export type CustomerModuleGroupKey = "general" | "business" | "marketingFinance" | "other";
export type AtlasSurfaceFamily = "launch" | "operations" | "analytics" | "utility";

type LocalizedCopy = {
  tr: string;
  en: string;
};

type CustomerModuleBlueprintDefinition = {
  key: CustomerModuleKey;
  group: CustomerModuleGroupKey;
  family: AtlasSurfaceFamily;
  href: string;
  labelKey: string;
  label: LocalizedCopy;
  compactLabel: LocalizedCopy;
  description: LocalizedCopy;
};

type CustomerModuleBlueprintView = CustomerModuleBlueprintDefinition & {
  resolvedLabel: string;
  resolvedCompactLabel: string;
  resolvedDescription: string;
  groupLabel: string;
};

const GROUP_LABEL_KEYS: Record<CustomerModuleGroupKey, string> = {
  general: "portal.nav.groups.general",
  business: "portal.nav.groups.business",
  marketingFinance: "portal.nav.groups.marketingFinance",
  other: "portal.nav.groups.other",
};

const CUSTOMER_MODULE_BLUEPRINTS: CustomerModuleBlueprintDefinition[] = [
  {
    key: "dashboard",
    group: "general",
    family: "launch",
    href: "/panel/dashboard",
    labelKey: "portal.nav.dashboard",
    label: { tr: "Dashboard", en: "Dashboard" },
    compactLabel: { tr: "Dashboard", en: "Dashboard" },
    description: {
      tr: "Launch merkezi, sonraki aksiyon ve genel görünüm burada toplanır.",
      en: "Launch overview, next action, and global visibility live here.",
    },
  },
  {
    key: "process",
    group: "general",
    family: "launch",
    href: "/panel/process",
    labelKey: "portal.nav.process",
    label: { tr: "Süreç Takibi", en: "Process Tracking" },
    compactLabel: { tr: "Süreç", en: "Process" },
    description: {
      tr: "Aşamalar, blokajlar ve işlem sırası burada izlenir.",
      en: "Stages, blockers, and the current queue are tracked here.",
    },
  },
  {
    key: "services",
    group: "general",
    family: "launch",
    href: "/panel/services",
    labelKey: "portal.nav.services",
    label: { tr: "Hizmetlerim", en: "My Services" },
    compactLabel: { tr: "Hizmetler", en: "Services" },
    description: {
      tr: "Paketler, kapsam ve aktif servis katmanları burada görünür.",
      en: "Packages, scope, and active service lanes live here.",
    },
  },
  {
    key: "companies",
    group: "business",
    family: "operations",
    href: "/panel/companies",
    labelKey: "portal.nav.companies",
    label: { tr: "Şirket / LLC", en: "Company / LLC" },
    compactLabel: { tr: "Şirketler", en: "Companies" },
    description: {
      tr: "LLC, EIN ve resmi şirket detayları burada yönetilir.",
      en: "LLC, EIN, and official entity details are managed here.",
    },
  },
  {
    key: "store",
    group: "business",
    family: "launch",
    href: "/panel/store",
    labelKey: "portal.nav.store",
    label: { tr: "Mağaza", en: "Store" },
    compactLabel: { tr: "Mağaza", en: "Store" },
    description: {
      tr: "Kanal seçimi, paketler ve mağaza aktivasyon omurgası burada kurulur.",
      en: "Channel selection, package sales, and store activation are handled here.",
    },
  },
  {
    key: "marketplaces",
    group: "business",
    family: "operations",
    href: "/panel/marketplaces",
    labelKey: "portal.nav.marketplaces",
    label: { tr: "Pazaryerleri", en: "Marketplaces" },
    compactLabel: { tr: "Pazaryeri", en: "Channels" },
    description: {
      tr: "Açılan marketplace hesapları ve aktivasyon durumu burada görünür.",
      en: "Connected marketplace accounts and activation state appear here.",
    },
  },
  {
    key: "products",
    group: "business",
    family: "operations",
    href: "/panel/products",
    labelKey: "portal.nav.products",
    label: { tr: "Ürünlerim", en: "Products" },
    compactLabel: { tr: "Ürünler", en: "Products" },
    description: {
      tr: "Katalog, ürün intake ve listing hazırlığı burada yaşar.",
      en: "Catalog intake and listing readiness live here.",
    },
  },
  {
    key: "orders",
    group: "business",
    family: "operations",
    href: "/panel/orders",
    labelKey: "portal.nav.orders",
    label: { tr: "Siparişlerim", en: "Orders" },
    compactLabel: { tr: "Siparişler", en: "Orders" },
    description: {
      tr: "Canlı operasyon sonrası sipariş ve fulfillment akışı burada görünür.",
      en: "Orders and fulfillment activity appear here after go-live.",
    },
  },
  {
    key: "warehouse",
    group: "business",
    family: "operations",
    href: "/panel/warehouse",
    labelKey: "portal.nav.warehouse",
    label: { tr: "Depom", en: "Warehouse" },
    compactLabel: { tr: "Depo", en: "Warehouse" },
    description: {
      tr: "Depo, inbound ve fulfillment readiness burada toplanır.",
      en: "Warehouse, inbound, and fulfillment readiness are tracked here.",
    },
  },
  {
    key: "social",
    group: "marketingFinance",
    family: "analytics",
    href: "/panel/social-media",
    labelKey: "portal.nav.social",
    label: { tr: "Sosyal Medya", en: "Social Media" },
    compactLabel: { tr: "Sosyal Medya", en: "Social" },
    description: {
      tr: "Sosyal medya hesapları ve içerik koordinasyonu burada izlenir.",
      en: "Social channels and content coordination are tracked here.",
    },
  },
  {
    key: "advertising",
    group: "marketingFinance",
    family: "analytics",
    href: "/panel/advertising",
    labelKey: "portal.nav.advertising",
    label: { tr: "Reklamlarım", en: "Advertising" },
    compactLabel: { tr: "Reklamlar", en: "Ads" },
    description: {
      tr: "Performans ve growth kampanyaları burada açılır.",
      en: "Advertising and growth lanes are opened here.",
    },
  },
  {
    key: "finance",
    group: "marketingFinance",
    family: "analytics",
    href: "/panel/finance",
    labelKey: "portal.nav.finance",
    label: { tr: "Finans", en: "Finance" },
    compactLabel: { tr: "Finans", en: "Finance" },
    description: {
      tr: "Finans operasyonu, mutabakat ve cash görünürlüğü burada toplanır.",
      en: "Finance operations, reconciliation, and cash visibility live here.",
    },
  },
  {
    key: "billing",
    group: "marketingFinance",
    family: "utility",
    href: "/panel/billing",
    labelKey: "portal.nav.billing",
    label: { tr: "Faturalarım", en: "Billing" },
    compactLabel: { tr: "Faturalar", en: "Billing" },
    description: {
      tr: "Paket fiyatları, faturalar ve ödeme hazırlığı burada görünür.",
      en: "Package pricing, invoices, and payment readiness are shown here.",
    },
  },
  {
    key: "reports",
    group: "other",
    family: "analytics",
    href: "/panel/reports",
    labelKey: "portal.nav.reports",
    label: { tr: "Raporlar", en: "Reports" },
    compactLabel: { tr: "Raporlar", en: "Reports" },
    description: {
      tr: "Canlı operasyon sonrası performans raporları burada görünür.",
      en: "Performance reporting is shown here after activity starts.",
    },
  },
  {
    key: "documents",
    group: "other",
    family: "utility",
    href: "/panel/documents",
    labelKey: "portal.nav.documents",
    label: { tr: "Belgelerim", en: "Documents" },
    compactLabel: { tr: "Belgeler", en: "Documents" },
    description: {
      tr: "Dokümanlar, çıktılar ve onay dosyaları burada tutulur.",
      en: "Documents, outputs, and approval files are held here.",
    },
  },
  {
    key: "support",
    group: "other",
    family: "utility",
    href: "/panel/support",
    labelKey: "portal.nav.support",
    label: { tr: "Destek", en: "Support" },
    compactLabel: { tr: "Destek", en: "Support" },
    description: {
      tr: "Destek merkezi, form talepleri ve thread akışı burada yaşar.",
      en: "Support center, forms, and request threads live here.",
    },
  },
  {
    key: "settings",
    group: "other",
    family: "utility",
    href: "/panel/settings",
    labelKey: "portal.nav.settings",
    label: { tr: "Ayarlar", en: "Settings" },
    compactLabel: { tr: "Ayarlar", en: "Settings" },
    description: {
      tr: "Hesap, profil ve panel tercihleri burada yönetilir.",
      en: "Account, profile, and panel preferences are managed here.",
    },
  },
];

export const CUSTOMER_PAGE_FAMILY_BLUEPRINT = {
  launch: ["dashboard", "process", "services", "store"],
  operations: ["companies", "marketplaces", "products", "orders", "warehouse"],
  analytics: ["social", "advertising", "finance", "reports"],
  utility: ["documents", "billing", "support", "settings"],
} as const;

export const BLUEPRINT_DECISIONS = {
  sidebarStates: ["locked", "active"] as const,
  hiddenSidebarState: "hidden" as const,
  stableCoreModules: ["dashboard", "process", "services", "documents", "billing", "support", "settings"] as const,
  unlockModel: "package_or_provisioning_then_open",
};

function resolveCopy(locale: Locale, copy: LocalizedCopy) {
  return locale === "en" ? copy.en : copy.tr;
}

function tryTranslate(locale: Locale, key: string, fallback: string) {
  try {
    return translate(locale, key);
  } catch {
    return fallback;
  }
}

export function getCustomerModuleBlueprint(
  locale: Locale = DEFAULT_LOCALE,
  key: CustomerModuleKey,
): CustomerModuleBlueprintView {
  const definition = CUSTOMER_MODULE_BLUEPRINTS.find((module) => module.key === key);

  if (!definition) {
    throw new Error(`Missing customer module blueprint for ${key}`);
  }

  return {
    ...definition,
    resolvedLabel: tryTranslate(locale, definition.labelKey, resolveCopy(locale, definition.label)),
    resolvedCompactLabel: resolveCopy(locale, definition.compactLabel),
    resolvedDescription: resolveCopy(locale, definition.description),
    groupLabel: tryTranslate(
      locale,
      GROUP_LABEL_KEYS[definition.group],
      definition.group,
    ),
  };
}

export function getCustomerSidebarBlueprint(locale: Locale = DEFAULT_LOCALE) {
  const orderedGroups: CustomerModuleGroupKey[] = ["general", "business", "marketingFinance", "other"];

  return orderedGroups.map((group) => ({
    key: group,
    label: tryTranslate(locale, GROUP_LABEL_KEYS[group], group),
    modules: CUSTOMER_MODULE_BLUEPRINTS.filter((module) => module.group === group).map((module) =>
      getCustomerModuleBlueprint(locale, module.key),
    ),
  }));
}

export function getCustomerSidebarModules(locale: Locale, modules: CustomerModuleAccess[]) {
  const modulesByKey = new Map(modules.map((item) => [item.key, item]));

  return getCustomerSidebarBlueprint(locale)
    .map((group) => ({
      key: group.key,
      label: group.label,
      items: group.modules
        .map((blueprint) => {
          const runtimeModule = modulesByKey.get(blueprint.key);
          if (!runtimeModule || runtimeModule.visibility === "hidden") {
            return null;
          }

          return {
            ...runtimeModule,
            label: blueprint.resolvedLabel,
            compactLabel: blueprint.resolvedCompactLabel,
            blueprint,
          };
        })
        .filter((item): item is NonNullable<typeof item> => Boolean(item)),
    }))
    .filter((group) => group.items.length > 0);
}

export function getCustomerActionLabels(locale: Locale = DEFAULT_LOCALE) {
  return {
    supportLabel: locale === "en" ? "Continue with support" : "Destek ile ilerle",
    billingLabel: locale === "en" ? "Open billing" : "Faturaları aç",
    companiesLabel: locale === "en" ? "Open company setup" : "Şirket kurulumunu aç",
    storeLabel: locale === "en" ? "Open store" : "Mağazayı aç",
    marketplacesLabel: locale === "en" ? "Open marketplaces" : "Pazaryerlerini aç",
  };
}

