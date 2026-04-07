import type {
  ClientGuidanceState,
  ClientPageHeroProps,
  ClientQuickAction,
  LockedModuleHint,
} from "./types";
import { DEFAULT_LOCALE, type Locale, translate } from "@/i18n";

export interface ClientPanelPageConfig {
  routePrefix: string;
  hero: ClientPageHeroProps;
  guidance: ClientGuidanceState;
}

type TranslationKey = string;

type LocalizedActionSpec = {
  id: string;
  labelKey: TranslationKey;
  href: string;
  descriptionKey: TranslationKey;
  kind: ClientQuickAction["kind"];
  emphasis?: ClientQuickAction["emphasis"];
};

type LocalizedHeroSpec = {
  eyebrowKey: TranslationKey;
  titleKey: TranslationKey;
  descriptionKey: TranslationKey;
  surfaceVariant?: ClientPageHeroProps["surfaceVariant"];
  badgeKeys?: TranslationKey[];
  primaryAction?: LocalizedActionSpec | null;
  secondaryAction?: LocalizedActionSpec | null;
};

type LocalizedGuidanceSpec = {
  areaLabelKey: TranslationKey;
  focusLabelKey: TranslationKey;
  summaryKey: TranslationKey;
  primaryAction?: LocalizedActionSpec | null;
  secondaryAction?: LocalizedActionSpec | null;
  helperTextKey?: TranslationKey;
  lockedHintDescriptionKey?: TranslationKey;
};

type LocalizedPageConfigSpec = {
  routePrefix: string;
  hero: LocalizedHeroSpec;
  guidance: LocalizedGuidanceSpec;
};

function action(locale: Locale, input: LocalizedActionSpec): ClientQuickAction {
  return {
    id: input.id,
    label: translate(locale, input.labelKey),
    href: input.href,
    description: translate(locale, input.descriptionKey),
    kind: input.kind,
    emphasis: input.emphasis ?? "primary",
  };
}

function lockedHint(locale: Locale, descriptionKey: TranslationKey): LockedModuleHint {
  return {
    label: translate(locale, "portal.pageConfig.shared.lockedLabel"),
    description: translate(locale, descriptionKey),
    tone: "locked",
  };
}

function resolveHero(locale: Locale, spec: LocalizedHeroSpec): ClientPageHeroProps {
  return {
    eyebrow: translate(locale, spec.eyebrowKey),
    title: translate(locale, spec.titleKey),
    description: translate(locale, spec.descriptionKey),
    surfaceVariant: spec.surfaceVariant,
    badges: spec.badgeKeys?.map((key) => translate(locale, key)),
    primaryAction: spec.primaryAction ? action(locale, spec.primaryAction) : null,
    secondaryAction: spec.secondaryAction ? action(locale, spec.secondaryAction) : null,
  };
}

function resolveGuidance(locale: Locale, spec: LocalizedGuidanceSpec): ClientGuidanceState {
  return {
    areaLabel: translate(locale, spec.areaLabelKey),
    focusLabel: translate(locale, spec.focusLabelKey),
    summary: translate(locale, spec.summaryKey),
    primaryAction: spec.primaryAction ? action(locale, spec.primaryAction) : null,
    secondaryAction: spec.secondaryAction ? action(locale, spec.secondaryAction) : null,
    helperText: spec.helperTextKey ? translate(locale, spec.helperTextKey) : undefined,
    lockedHint: spec.lockedHintDescriptionKey
      ? lockedHint(locale, spec.lockedHintDescriptionKey)
      : undefined,
  };
}

function config(locale: Locale, spec: LocalizedPageConfigSpec): ClientPanelPageConfig {
  return {
    routePrefix: spec.routePrefix,
    hero: resolveHero(locale, spec.hero),
    guidance: resolveGuidance(locale, spec.guidance),
  };
}

const heroBackAction: LocalizedActionSpec = {
  id: "hero:services",
  labelKey: "portal.nav.services",
  href: "/panel/services",
  descriptionKey: "portal.pageConfig.shared.actionDescriptions.openServices",
  kind: "open_services",
  emphasis: "secondary",
};

const actionSpecs = {
  support: (id: string, descriptionKey: TranslationKey, emphasis?: ClientQuickAction["emphasis"]): LocalizedActionSpec => ({
    id,
    labelKey: "portal.nav.support",
    href: "/panel/support",
    descriptionKey,
    kind: "open_support",
    emphasis,
  }),
  process: (id: string, descriptionKey: TranslationKey, emphasis?: ClientQuickAction["emphasis"]): LocalizedActionSpec => ({
    id,
    labelKey: "portal.nav.process",
    href: "/panel/process",
    descriptionKey,
    kind: "open_process",
    emphasis,
  }),
  services: (id: string, descriptionKey: TranslationKey, emphasis?: ClientQuickAction["emphasis"]): LocalizedActionSpec => ({
    id,
    labelKey: "portal.nav.services",
    href: "/panel/services",
    descriptionKey,
    kind: "open_services",
    emphasis,
  }),
  orders: (id: string, descriptionKey: TranslationKey, emphasis?: ClientQuickAction["emphasis"]): LocalizedActionSpec => ({
    id,
    labelKey: "portal.nav.orders",
    href: "/panel/orders",
    descriptionKey,
    kind: "open_orders",
    emphasis,
  }),
  documents: (id: string, descriptionKey: TranslationKey, emphasis?: ClientQuickAction["emphasis"]): LocalizedActionSpec => ({
    id,
    labelKey: "portal.nav.documents",
    href: "/panel/documents",
    descriptionKey,
    kind: "open_documents",
    emphasis,
  }),
  reports: (id: string, descriptionKey: TranslationKey, emphasis?: ClientQuickAction["emphasis"]): LocalizedActionSpec => ({
    id,
    labelKey: "portal.nav.reports",
    href: "/panel/reports",
    descriptionKey,
    kind: "open_reports",
    emphasis,
  }),
  billing: (id: string, descriptionKey: TranslationKey, emphasis?: ClientQuickAction["emphasis"]): LocalizedActionSpec => ({
    id,
    labelKey: "portal.nav.billing",
    href: "/panel/billing",
    descriptionKey,
    kind: "open_billing",
    emphasis,
  }),
  dashboard: (id: string, descriptionKey: TranslationKey, emphasis?: ClientQuickAction["emphasis"]): LocalizedActionSpec => ({
    id,
    labelKey: "portal.nav.dashboard",
    href: "/panel/dashboard",
    descriptionKey,
    kind: "custom",
    emphasis,
  }),
  requests: (id: string, descriptionKey: TranslationKey, emphasis?: ClientQuickAction["emphasis"]): LocalizedActionSpec => ({
    id,
    labelKey: "portal.pageConfig.shared.actionLabels.requests",
    href: "/panel/requests",
    descriptionKey,
    kind: "open_support",
    emphasis,
  }),
  generalSupportForm: (id: string, descriptionKey: TranslationKey, emphasis?: ClientQuickAction["emphasis"]): LocalizedActionSpec => ({
    id,
    labelKey: "portal.pageConfig.shared.actionLabels.generalSupportForm",
    href: "/panel/support/forms/ATL-701",
    descriptionKey,
    kind: "form_request",
    emphasis,
  }),
} as const;

const CONFIG_SPECS: LocalizedPageConfigSpec[] = [
  {
    routePrefix: "/panel/support/forms/",
    hero: {
      eyebrowKey: "portal.pageConfig.supportForms.hero.eyebrow",
      titleKey: "portal.pageConfig.supportForms.hero.title",
      descriptionKey: "portal.pageConfig.supportForms.hero.description",
      surfaceVariant: "secondary",
      badgeKeys: ["portal.pageConfig.supportForms.hero.badges.assignedRequest"],
      primaryAction: actionSpecs.support("support-forms", "portal.pageConfig.shared.actionDescriptions.openSupportCenter"),
      secondaryAction: heroBackAction,
    },
    guidance: {
      areaLabelKey: "portal.pageConfig.supportForms.guidance.areaLabel",
      focusLabelKey: "portal.pageConfig.supportForms.guidance.focusLabel",
      summaryKey: "portal.pageConfig.supportForms.guidance.summary",
      primaryAction: actionSpecs.support("guidance:support-center", "portal.pageConfig.shared.actionDescriptions.openAllRequests"),
      secondaryAction: actionSpecs.process("guidance:process", "portal.pageConfig.shared.actionDescriptions.openMilestonePlacement", "secondary"),
      helperTextKey: "portal.pageConfig.supportForms.guidance.helperText",
    },
  },
  {
    routePrefix: "/panel/support/submissions/",
    hero: {
      eyebrowKey: "portal.pageConfig.supportSubmission.hero.eyebrow",
      titleKey: "portal.pageConfig.supportSubmission.hero.title",
      descriptionKey: "portal.pageConfig.supportSubmission.hero.description",
      surfaceVariant: "secondary",
      primaryAction: actionSpecs.support("submission-support", "portal.pageConfig.shared.actionDescriptions.returnToRequests"),
    },
    guidance: {
      areaLabelKey: "portal.pageConfig.supportSubmission.guidance.areaLabel",
      focusLabelKey: "portal.pageConfig.supportSubmission.guidance.focusLabel",
      summaryKey: "portal.pageConfig.supportSubmission.guidance.summary",
      primaryAction: actionSpecs.support("guidance:submission-support", "portal.pageConfig.shared.actionDescriptions.openAllRequests"),
      secondaryAction: heroBackAction,
    },
  },
  {
    routePrefix: "/panel/dashboard",
    hero: {
      eyebrowKey: "portal.pageConfig.dashboard.hero.eyebrow",
      titleKey: "portal.pageConfig.dashboard.hero.title",
      descriptionKey: "portal.pageConfig.dashboard.hero.description",
      surfaceVariant: "hero",
      badgeKeys: [
        "portal.pageConfig.dashboard.hero.badges.launchFocus",
        "portal.pageConfig.dashboard.hero.badges.premiumPortal",
      ],
      primaryAction: heroBackAction,
      secondaryAction: actionSpecs.support("dashboard-support", "portal.pageConfig.shared.actionDescriptions.openPendingRequests", "secondary"),
    },
    guidance: {
      areaLabelKey: "portal.pageConfig.dashboard.guidance.areaLabel",
      focusLabelKey: "portal.pageConfig.dashboard.guidance.focusLabel",
      summaryKey: "portal.pageConfig.dashboard.guidance.summary",
      primaryAction: heroBackAction,
      secondaryAction: actionSpecs.process("dashboard-process", "portal.pageConfig.shared.actionDescriptions.openMilestoneFlow", "secondary"),
      helperTextKey: "portal.pageConfig.dashboard.guidance.helperText",
    },
  },
  {
    routePrefix: "/panel/services",
    hero: {
      eyebrowKey: "portal.pageConfig.services.hero.eyebrow",
      titleKey: "portal.pageConfig.services.hero.title",
      descriptionKey: "portal.pageConfig.services.hero.description",
      surfaceVariant: "hero",
      primaryAction: actionSpecs.support("services-support", "portal.pageConfig.shared.actionDescriptions.openAssignedRequests"),
      secondaryAction: actionSpecs.process("services-process", "portal.pageConfig.shared.actionDescriptions.openMilestoneContext", "secondary"),
    },
    guidance: {
      areaLabelKey: "portal.pageConfig.services.guidance.areaLabel",
      focusLabelKey: "portal.pageConfig.services.guidance.focusLabel",
      summaryKey: "portal.pageConfig.services.guidance.summary",
      primaryAction: actionSpecs.support("guidance:services-support", "portal.pageConfig.shared.actionDescriptions.openAssignedRequests"),
      secondaryAction: actionSpecs.orders("guidance:services-orders", "portal.pageConfig.shared.actionDescriptions.openShipmentFlow", "secondary"),
    },
  },
  {
    routePrefix: "/panel/process",
    hero: {
      eyebrowKey: "portal.pageConfig.process.hero.eyebrow",
      titleKey: "portal.pageConfig.process.hero.title",
      descriptionKey: "portal.pageConfig.process.hero.description",
      surfaceVariant: "hero",
      primaryAction: actionSpecs.support("process-support", "portal.pageConfig.shared.actionDescriptions.openOpenRequests"),
      secondaryAction: heroBackAction,
    },
    guidance: {
      areaLabelKey: "portal.pageConfig.process.guidance.areaLabel",
      focusLabelKey: "portal.pageConfig.process.guidance.focusLabel",
      summaryKey: "portal.pageConfig.process.guidance.summary",
      primaryAction: actionSpecs.support("guidance:process-support", "portal.pageConfig.shared.actionDescriptions.openPendingRequests"),
      secondaryAction: actionSpecs.documents("guidance:process-documents", "portal.pageConfig.shared.actionDescriptions.openVisibleOutputs", "secondary"),
    },
  },
  {
    routePrefix: "/panel/support",
    hero: {
      eyebrowKey: "portal.pageConfig.support.hero.eyebrow",
      titleKey: "portal.pageConfig.support.hero.title",
      descriptionKey: "portal.pageConfig.support.hero.description",
      surfaceVariant: "hero",
      badgeKeys: ["portal.pageConfig.support.hero.badges.assignedRequests"],
      primaryAction: actionSpecs.generalSupportForm("support-general-form", "portal.pageConfig.shared.actionDescriptions.openGeneralSupportForm"),
      secondaryAction: heroBackAction,
    },
    guidance: {
      areaLabelKey: "portal.pageConfig.support.guidance.areaLabel",
      focusLabelKey: "portal.pageConfig.support.guidance.focusLabel",
      summaryKey: "portal.pageConfig.support.guidance.summary",
      primaryAction: actionSpecs.generalSupportForm("guidance:support-general", "portal.pageConfig.shared.actionDescriptions.openGeneralSupportForm"),
      secondaryAction: actionSpecs.process("guidance:support-process", "portal.pageConfig.shared.actionDescriptions.openMilestoneContext", "secondary"),
    },
  },
  {
    routePrefix: "/panel/requests",
    hero: {
      eyebrowKey: "portal.pageConfig.requests.hero.eyebrow",
      titleKey: "portal.pageConfig.requests.hero.title",
      descriptionKey: "portal.pageConfig.requests.hero.description",
      surfaceVariant: "secondary",
      primaryAction: actionSpecs.support("requests-support", "portal.pageConfig.shared.actionDescriptions.openSupportFlow"),
      secondaryAction: heroBackAction,
    },
    guidance: {
      areaLabelKey: "portal.pageConfig.requests.guidance.areaLabel",
      focusLabelKey: "portal.pageConfig.requests.guidance.focusLabel",
      summaryKey: "portal.pageConfig.requests.guidance.summary",
      primaryAction: actionSpecs.support("guidance:requests-support", "portal.pageConfig.shared.actionDescriptions.returnToRequestCenter"),
      secondaryAction: actionSpecs.services("guidance:requests-services", "portal.pageConfig.shared.actionDescriptions.openConnectedServiceFlow", "secondary"),
    },
  },
  {
    routePrefix: "/panel/deliverables",
    hero: {
      eyebrowKey: "portal.pageConfig.deliverables.hero.eyebrow",
      titleKey: "portal.pageConfig.deliverables.hero.title",
      descriptionKey: "portal.pageConfig.deliverables.hero.description",
      surfaceVariant: "secondary",
      primaryAction: heroBackAction,
      secondaryAction: actionSpecs.requests("deliverables-requests", "portal.pageConfig.shared.actionDescriptions.openRelatedRequestFlow", "secondary"),
    },
    guidance: {
      areaLabelKey: "portal.pageConfig.deliverables.guidance.areaLabel",
      focusLabelKey: "portal.pageConfig.deliverables.guidance.focusLabel",
      summaryKey: "portal.pageConfig.deliverables.guidance.summary",
      primaryAction: heroBackAction,
      secondaryAction: actionSpecs.requests("guidance:deliverables-requests", "portal.pageConfig.shared.actionDescriptions.openRelatedRequest", "secondary"),
    },
  },
  {
    routePrefix: "/panel/performance",
    hero: {
      eyebrowKey: "portal.pageConfig.performance.hero.eyebrow",
      titleKey: "portal.pageConfig.performance.hero.title",
      descriptionKey: "portal.pageConfig.performance.hero.description",
      surfaceVariant: "secondary",
      primaryAction: actionSpecs.reports("performance-reports", "portal.pageConfig.shared.actionDescriptions.returnToReports"),
      secondaryAction: heroBackAction,
    },
    guidance: {
      areaLabelKey: "portal.pageConfig.performance.guidance.areaLabel",
      focusLabelKey: "portal.pageConfig.performance.guidance.focusLabel",
      summaryKey: "portal.pageConfig.performance.guidance.summary",
      primaryAction: actionSpecs.reports("guidance:performance-reports", "portal.pageConfig.shared.actionDescriptions.openMainReportView"),
      secondaryAction: heroBackAction,
    },
  },
  {
    routePrefix: "/panel/orders/",
    hero: {
      eyebrowKey: "portal.pageConfig.orderDetail.hero.eyebrow",
      titleKey: "portal.pageConfig.orderDetail.hero.title",
      descriptionKey: "portal.pageConfig.orderDetail.hero.description",
      surfaceVariant: "secondary",
    },
    guidance: {
      areaLabelKey: "portal.pageConfig.orderDetail.guidance.areaLabel",
      focusLabelKey: "portal.pageConfig.orderDetail.guidance.focusLabel",
      summaryKey: "portal.pageConfig.orderDetail.guidance.summary",
      primaryAction: actionSpecs.orders("guidance:orders-list", "portal.pageConfig.shared.actionDescriptions.returnToOrderList"),
      secondaryAction: actionSpecs.support("guidance:orders-support", "portal.pageConfig.shared.actionDescriptions.openOrderSupport", "secondary"),
    },
  },
  {
    routePrefix: "/panel/orders",
    hero: {
      eyebrowKey: "portal.pageConfig.orders.hero.eyebrow",
      titleKey: "portal.pageConfig.orders.hero.title",
      descriptionKey: "portal.pageConfig.orders.hero.description",
      surfaceVariant: "secondary",
    },
    guidance: {
      areaLabelKey: "portal.pageConfig.orders.guidance.areaLabel",
      focusLabelKey: "portal.pageConfig.orders.guidance.focusLabel",
      summaryKey: "portal.pageConfig.orders.guidance.summary",
      primaryAction: actionSpecs.support("guidance:orders-support", "portal.pageConfig.shared.actionDescriptions.openHelpFlow"),
      secondaryAction: actionSpecs.documents("guidance:orders-documents", "portal.pageConfig.shared.actionDescriptions.openRelatedOutputs", "secondary"),
    },
  },
  {
    routePrefix: "/panel/documents",
    hero: {
      eyebrowKey: "portal.pageConfig.documents.hero.eyebrow",
      titleKey: "portal.pageConfig.documents.hero.title",
      descriptionKey: "portal.pageConfig.documents.hero.description",
      surfaceVariant: "secondary",
      primaryAction: actionSpecs.process("documents-process", "portal.pageConfig.shared.actionDescriptions.openRelatedMilestone"),
      secondaryAction: actionSpecs.support("documents-support", "portal.pageConfig.shared.actionDescriptions.openDocumentSupport", "secondary"),
    },
    guidance: {
      areaLabelKey: "portal.pageConfig.documents.guidance.areaLabel",
      focusLabelKey: "portal.pageConfig.documents.guidance.focusLabel",
      summaryKey: "portal.pageConfig.documents.guidance.summary",
      primaryAction: actionSpecs.process("guidance:documents-process", "portal.pageConfig.shared.actionDescriptions.openMilestoneView"),
      secondaryAction: actionSpecs.services("guidance:documents-services", "portal.pageConfig.shared.actionDescriptions.openConnectedServices", "secondary"),
    },
  },
  {
    routePrefix: "/panel/reports",
    hero: {
      eyebrowKey: "portal.pageConfig.reports.hero.eyebrow",
      titleKey: "portal.pageConfig.reports.hero.title",
      descriptionKey: "portal.pageConfig.reports.hero.description",
      surfaceVariant: "secondary",
    },
    guidance: {
      areaLabelKey: "portal.pageConfig.reports.guidance.areaLabel",
      focusLabelKey: "portal.pageConfig.reports.guidance.focusLabel",
      summaryKey: "portal.pageConfig.reports.guidance.summary",
      primaryAction: heroBackAction,
      secondaryAction: actionSpecs.orders("guidance:reports-orders", "portal.pageConfig.shared.actionDescriptions.openOrdersForReport", "secondary"),
    },
  },
  {
    routePrefix: "/panel/website",
    hero: {
      eyebrowKey: "portal.pageConfig.website.hero.eyebrow",
      titleKey: "portal.pageConfig.website.hero.title",
      descriptionKey: "portal.pageConfig.website.hero.description",
      surfaceVariant: "secondary",
      primaryAction: heroBackAction,
      secondaryAction: actionSpecs.requests("website-requests", "portal.pageConfig.shared.actionDescriptions.openSiteRequestFlow", "secondary"),
    },
    guidance: {
      areaLabelKey: "portal.pageConfig.website.guidance.areaLabel",
      focusLabelKey: "portal.pageConfig.website.guidance.focusLabel",
      summaryKey: "portal.pageConfig.website.guidance.summary",
      primaryAction: heroBackAction,
      secondaryAction: actionSpecs.requests("guidance:website-requests", "portal.pageConfig.shared.actionDescriptions.openContentRequests", "secondary"),
    },
  },
  {
    routePrefix: "/panel/settings",
    hero: {
      eyebrowKey: "portal.pageConfig.settings.hero.eyebrow",
      titleKey: "portal.pageConfig.settings.hero.title",
      descriptionKey: "portal.pageConfig.settings.hero.description",
      surfaceVariant: "secondary",
    },
    guidance: {
      areaLabelKey: "portal.pageConfig.settings.guidance.areaLabel",
      focusLabelKey: "portal.pageConfig.settings.guidance.focusLabel",
      summaryKey: "portal.pageConfig.settings.guidance.summary",
      primaryAction: actionSpecs.dashboard("guidance:settings-dashboard", "portal.pageConfig.shared.actionDescriptions.returnToDashboard"),
      secondaryAction: actionSpecs.support("guidance:settings-support", "portal.pageConfig.shared.actionDescriptions.openAccountSupport", "secondary"),
    },
  },
  {
    routePrefix: "/panel/billing",
    hero: {
      eyebrowKey: "portal.pageConfig.billing.hero.eyebrow",
      titleKey: "portal.pageConfig.billing.hero.title",
      descriptionKey: "portal.pageConfig.billing.hero.description",
      surfaceVariant: "secondary",
    },
    guidance: {
      areaLabelKey: "portal.pageConfig.billing.guidance.areaLabel",
      focusLabelKey: "portal.pageConfig.billing.guidance.focusLabel",
      summaryKey: "portal.pageConfig.billing.guidance.summary",
      primaryAction: actionSpecs.support("guidance:billing-support", "portal.pageConfig.shared.actionDescriptions.openBillingSupport"),
      secondaryAction: actionSpecs.documents("guidance:billing-documents", "portal.pageConfig.shared.actionDescriptions.openInvoicesAndDocuments", "secondary"),
    },
  },
  {
    routePrefix: "/panel/companies",
    hero: {
      eyebrowKey: "portal.pageConfig.companies.hero.eyebrow",
      titleKey: "portal.pageConfig.companies.hero.title",
      descriptionKey: "portal.pageConfig.companies.hero.description",
      surfaceVariant: "locked",
    },
    guidance: {
      areaLabelKey: "portal.pageConfig.companies.guidance.areaLabel",
      focusLabelKey: "portal.pageConfig.companies.guidance.focusLabel",
      summaryKey: "portal.pageConfig.companies.guidance.summary",
      primaryAction: actionSpecs.support("guidance:companies-support", "portal.pageConfig.shared.actionDescriptions.openActivationSupport"),
      secondaryAction: heroBackAction,
      lockedHintDescriptionKey: "portal.pageConfig.companies.guidance.lockedHint",
    },
  },
  {
    routePrefix: "/panel/marketplaces",
    hero: {
      eyebrowKey: "portal.pageConfig.marketplaces.hero.eyebrow",
      titleKey: "portal.pageConfig.marketplaces.hero.title",
      descriptionKey: "portal.pageConfig.marketplaces.hero.description",
      surfaceVariant: "locked",
    },
    guidance: {
      areaLabelKey: "portal.pageConfig.marketplaces.guidance.areaLabel",
      focusLabelKey: "portal.pageConfig.marketplaces.guidance.focusLabel",
      summaryKey: "portal.pageConfig.marketplaces.guidance.summary",
      primaryAction: actionSpecs.support("guidance:marketplaces-support", "portal.pageConfig.shared.actionDescriptions.openActivationSupport"),
      secondaryAction: heroBackAction,
      lockedHintDescriptionKey: "portal.pageConfig.marketplaces.guidance.lockedHint",
    },
  },
  {
    routePrefix: "/panel/products",
    hero: {
      eyebrowKey: "portal.pageConfig.products.hero.eyebrow",
      titleKey: "portal.pageConfig.products.hero.title",
      descriptionKey: "portal.pageConfig.products.hero.description",
      surfaceVariant: "locked",
    },
    guidance: {
      areaLabelKey: "portal.pageConfig.products.guidance.areaLabel",
      focusLabelKey: "portal.pageConfig.products.guidance.focusLabel",
      summaryKey: "portal.pageConfig.products.guidance.summary",
      primaryAction: actionSpecs.support("guidance:products-support", "portal.pageConfig.shared.actionDescriptions.openProductRequests"),
      secondaryAction: heroBackAction,
      lockedHintDescriptionKey: "portal.pageConfig.products.guidance.lockedHint",
    },
  },
  {
    routePrefix: "/panel/warehouse",
    hero: {
      eyebrowKey: "portal.pageConfig.warehouse.hero.eyebrow",
      titleKey: "portal.pageConfig.warehouse.hero.title",
      descriptionKey: "portal.pageConfig.warehouse.hero.description",
      surfaceVariant: "locked",
    },
    guidance: {
      areaLabelKey: "portal.pageConfig.warehouse.guidance.areaLabel",
      focusLabelKey: "portal.pageConfig.warehouse.guidance.focusLabel",
      summaryKey: "portal.pageConfig.warehouse.guidance.summary",
      primaryAction: actionSpecs.orders("guidance:warehouse-orders", "portal.pageConfig.shared.actionDescriptions.openShipmentFlow"),
      secondaryAction: actionSpecs.support("guidance:warehouse-support", "portal.pageConfig.shared.actionDescriptions.openWarehouseSupport", "secondary"),
      lockedHintDescriptionKey: "portal.pageConfig.warehouse.guidance.lockedHint",
    },
  },
  {
    routePrefix: "/panel/social-media",
    hero: {
      eyebrowKey: "portal.pageConfig.social.hero.eyebrow",
      titleKey: "portal.pageConfig.social.hero.title",
      descriptionKey: "portal.pageConfig.social.hero.description",
      surfaceVariant: "locked",
    },
    guidance: {
      areaLabelKey: "portal.pageConfig.social.guidance.areaLabel",
      focusLabelKey: "portal.pageConfig.social.guidance.focusLabel",
      summaryKey: "portal.pageConfig.social.guidance.summary",
      primaryAction: actionSpecs.support("guidance:social-support", "portal.pageConfig.shared.actionDescriptions.openActivationOrQuestionSupport"),
      secondaryAction: actionSpecs.reports("guidance:social-reports", "portal.pageConfig.shared.actionDescriptions.openPerformanceSummary", "secondary"),
      lockedHintDescriptionKey: "portal.pageConfig.social.guidance.lockedHint",
    },
  },
  {
    routePrefix: "/panel/advertising",
    hero: {
      eyebrowKey: "portal.pageConfig.advertising.hero.eyebrow",
      titleKey: "portal.pageConfig.advertising.hero.title",
      descriptionKey: "portal.pageConfig.advertising.hero.description",
      surfaceVariant: "locked",
    },
    guidance: {
      areaLabelKey: "portal.pageConfig.advertising.guidance.areaLabel",
      focusLabelKey: "portal.pageConfig.advertising.guidance.focusLabel",
      summaryKey: "portal.pageConfig.advertising.guidance.summary",
      primaryAction: actionSpecs.support("guidance:ads-support", "portal.pageConfig.shared.actionDescriptions.openActivationSupport"),
      secondaryAction: actionSpecs.reports("guidance:ads-reports", "portal.pageConfig.shared.actionDescriptions.openPerformanceSummary", "secondary"),
      lockedHintDescriptionKey: "portal.pageConfig.advertising.guidance.lockedHint",
    },
  },
  {
    routePrefix: "/panel/finance",
    hero: {
      eyebrowKey: "portal.pageConfig.finance.hero.eyebrow",
      titleKey: "portal.pageConfig.finance.hero.title",
      descriptionKey: "portal.pageConfig.finance.hero.description",
      surfaceVariant: "locked",
    },
    guidance: {
      areaLabelKey: "portal.pageConfig.finance.guidance.areaLabel",
      focusLabelKey: "portal.pageConfig.finance.guidance.focusLabel",
      summaryKey: "portal.pageConfig.finance.guidance.summary",
      primaryAction: actionSpecs.billing("guidance:finance-billing", "portal.pageConfig.shared.actionDescriptions.openPlanAndPayment"),
      secondaryAction: actionSpecs.support("guidance:finance-support", "portal.pageConfig.shared.actionDescriptions.openFinanceSupport", "secondary"),
      lockedHintDescriptionKey: "portal.pageConfig.finance.guidance.lockedHint",
    },
  },
];

const DEFAULT_CONFIG_SPEC: LocalizedPageConfigSpec = {
  routePrefix: "/panel",
  hero: {
    eyebrowKey: "portal.pageConfig.default.hero.eyebrow",
    titleKey: "portal.pageConfig.default.hero.title",
    descriptionKey: "portal.pageConfig.default.hero.description",
    surfaceVariant: "secondary",
  },
  guidance: {
    areaLabelKey: "portal.pageConfig.default.guidance.areaLabel",
    focusLabelKey: "portal.pageConfig.default.guidance.focusLabel",
    summaryKey: "portal.pageConfig.default.guidance.summary",
    primaryAction: actionSpecs.dashboard("guidance:default-dashboard", "portal.pageConfig.shared.actionDescriptions.returnToMainView"),
    secondaryAction: actionSpecs.support("guidance:default-support", "portal.pageConfig.shared.actionDescriptions.openHelpAndForms", "secondary"),
  },
};

export function getClientPanelPageConfig(
  pathname: string | null | undefined,
  locale: Locale = DEFAULT_LOCALE,
): ClientPanelPageConfig {
  if (!pathname) return config(locale, DEFAULT_CONFIG_SPEC);

  const match = CONFIG_SPECS
    .filter(
      (item) =>
        pathname === item.routePrefix ||
        pathname.startsWith(`${item.routePrefix}/`) ||
        (item.routePrefix.endsWith("/") && pathname.startsWith(item.routePrefix)),
    )
    .sort((left, right) => right.routePrefix.length - left.routePrefix.length)[0];

  return config(locale, match ?? DEFAULT_CONFIG_SPEC);
}

export function getDefaultClientGuidance(
  pathname: string | null | undefined,
  locale: Locale = DEFAULT_LOCALE,
) {
  return getClientPanelPageConfig(pathname, locale).guidance;
}
