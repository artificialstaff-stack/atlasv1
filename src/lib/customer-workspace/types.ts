import type {
  MarketplaceChannelKey,
  OperationalFeeNote,
  StoreAddonClusterKey,
  StoreAddonOffer,
  StoreBundleOffer,
  StoreMarketplaceOffer,
  StoreOfferQuery,
  StoreOfferTone,
} from "@/lib/payments";
import type { CustomerJourneyViewModel } from "@/lib/workflows/types";

export type CustomerWorkstreamKey =
  | "company_setup"
  | "catalog_intake"
  | "website"
  | "marketplaces"
  | "ads"
  | "social"
  | "seo"
  | "fulfillment";

export type CustomerWorkstreamStatus =
  | "pending"
  | "in_progress"
  | "blocked"
  | "ready"
  | "completed"
  | "locked";

export type CustomerLaunchPhase =
  | "application"
  | "llc_setup"
  | "ein_setup"
  | "plan_ready"
  | "channel_selection"
  | "store_setup"
  | "go_live_ready"
  | "live";

export type CustomerModuleKey =
  | "dashboard"
  | "process"
  | "services"
  | "companies"
  | "store"
  | "marketplaces"
  | "products"
  | "warehouse"
  | "social"
  | "finance"
  | "documents"
  | "billing"
  | "support"
  | "orders"
  | "reports"
  | "advertising"
  | "settings";

export type CustomerModuleVisibility = "hidden" | "locked" | "active";

export type CustomerLockedModuleState = "not_purchased" | "processing" | "blocked";

export interface CustomerLockedModuleAction {
  label: string;
  href: string;
  description: string | null;
}

export interface CustomerModuleAccess {
  key: CustomerModuleKey;
  label: string;
  href: string;
  visibility: CustomerModuleVisibility;
  description: string;
  reason: string | null;
  lockedState: CustomerLockedModuleState | null;
  lockedSummary: string | null;
  lockedNextStep: string | null;
  lockedAction: CustomerLockedModuleAction | null;
  secondaryAction: CustomerLockedModuleAction | null;
  lockedOffers: StoreOfferQuery[];
}

export interface CustomerServiceCatalogItem {
  id: string;
  title: string;
  summary: string;
  upfrontPrice: number;
  recurringPrice: number | null;
  currency: string;
  status: "selected" | "recommended" | "available" | "locked";
  ctaLabel: string;
  includes: string[];
  lineItems?: Array<{
    label: string;
    price: number;
  }>;
  href: string;
}

export interface StoreHeroAction {
  label: string;
  href: string;
}

export interface StoreHeroMetric {
  label: string;
  value: string;
  tone?: "default" | "primary" | "warning" | "success";
}

export interface StoreReadinessItem {
  id: string;
  label: string;
  value: string;
  summary: string;
  tone: StoreOfferTone;
}

export interface StoreHeroSpotlight {
  title: string;
  summary: string;
  stateLabel: string;
  href: string | null;
}

export interface StoreHeroViewModel {
  eyebrow: string;
  title: string;
  description: string;
  statusLabel: string;
  metrics: StoreHeroMetric[];
  primaryAction: StoreHeroAction;
  secondaryAction: StoreHeroAction;
  readinessItems: StoreReadinessItem[];
  spotlight: StoreHeroSpotlight | null;
}

export type StoreMarketplaceCardState = "selected" | "active" | "available" | "disabled";

export interface StoreExperienceMarketplaceCard extends StoreMarketplaceOffer {
  state: StoreMarketplaceCardState;
  stateLabel: string;
  stateSummary: string;
  billingHref: string;
  supportHref: string;
  canSelect: boolean;
  hasActiveAccount: boolean;
}

export interface StoreAddonCardViewModel extends StoreAddonOffer {
  statusLabel: string | null;
  statusTone: StoreOfferTone | null;
  supportHref: string;
}

export interface StoreAddonClusterViewModel {
  key: StoreAddonClusterKey;
  title: string;
  summary: string;
  tone: StoreOfferTone;
  offers: StoreAddonCardViewModel[];
}

export interface StoreBundleCardViewModel extends StoreBundleOffer {
  supportHref: string;
}

export interface StoreTimelineStep {
  id: string;
  label: string;
  title: string;
  summary: string;
  status: "completed" | "current" | "upcoming";
  tone: StoreOfferTone;
}

export interface StoreActiveAccountItem {
  id: string;
  platform: MarketplaceChannelKey | string;
  platformLabel: string;
  storeName: string;
  status: string;
  statusLabel: string;
  storeUrl: string | null;
  sellerId: string | null;
  isPrimary: boolean;
}

export interface StoreExperienceViewModel {
  hero: StoreHeroViewModel;
  selectedChannelKey: MarketplaceChannelKey | null;
  channelSelectionLocked: boolean;
  marketplaceCards: StoreExperienceMarketplaceCard[];
  addonClusters: StoreAddonClusterViewModel[];
  bundleCards: StoreBundleCardViewModel[];
  operationalNotes: OperationalFeeNote[];
  timelineSteps: StoreTimelineStep[];
  activeAccounts: StoreActiveAccountItem[];
  activeAccountsSummary: string;
}

export type CustomerPaymentState = "none" | "pending" | "paid" | "confirmed";

export interface CustomerSelectedMarketplace {
  key: string;
  title: string;
  status: "requested" | "invoice_pending" | "activation_in_progress" | "active";
  source: "workflow_event" | "invoice" | "marketplace";
  requestedAt: string | null;
  planTier: string | null;
  monthlyPrice: number | null;
}

export type CustomerRequestThreadStatus =
  | "open"
  | "waiting_on_customer"
  | "waiting_on_atlas"
  | "resolved";

export type CustomerRequestThreadType =
  | "support"
  | "catalog_intake"
  | "form_followup"
  | "document_request";

export type CustomerDeliverableStatus =
  | "draft"
  | "ready"
  | "awaiting_approval"
  | "published"
  | "completed";

export type LaunchJourneyStageKey =
  | "onboarding_company_setup"
  | "catalog_intake"
  | "brand_asset_readiness"
  | "channel_setup"
  | "go_live"
  | "first_sale";

export type CustomerHubModalTab = "actions" | "forms" | "documents" | "history";
export type AdminHubModalTab =
  | "waiting_on_customer"
  | "sent_to_customer"
  | "internal_operations"
  | "deliverables";
export type HubModalTab = CustomerHubModalTab | AdminHubModalTab;
export type HubType = "customer_requests" | "admin_operations";
export type HubEntityType =
  | "action_item"
  | "submitted_form"
  | "document"
  | "history_event"
  | "waiting_on_customer"
  | "sent_request"
  | "internal_task"
  | "deliverable";

export interface HubSelectedEntity {
  entityType: HubEntityType;
  entityId: string;
  defaultTab: HubModalTab;
}

export interface HubModalState {
  hubType: HubType;
  activeTab: HubModalTab;
  selectedEntityId: string | null;
  selectedEntityType: HubEntityType | null;
  launchSource: string | null;
}

export interface HubCardDescriptor {
  id: string;
  title: string;
  summary: string;
  value: string;
  tab: HubModalTab;
  tone?: "default" | "primary" | "warning" | "success";
}

export interface HubCardAction {
  id: string;
  title: string;
  description: string;
  tab: HubModalTab;
  href?: string | null;
  tone?: "default" | "primary" | "warning" | "success";
}

export interface CustomerRequestMessage {
  id: string;
  authorType: "customer" | "admin" | "system";
  authorLabel: string;
  body: string;
  createdAt: string;
  messageKind: string;
  attachments: string[];
}

export interface CustomerRequestThread {
  id: string;
  subject: string;
  summary: string;
  status: CustomerRequestThreadStatus;
  threadType: CustomerRequestThreadType;
  workstreamKey: CustomerWorkstreamKey | null;
  sourceSubmissionId: string | null;
  sourceTicketId: string | null;
  createdAt: string;
  updatedAt: string;
  lastMessageAt: string;
  primaryAction: {
    label: string;
    href: string;
  } | null;
  latestMessage: CustomerRequestMessage | null;
  messages: CustomerRequestMessage[];
}

export interface CustomerDeliverable {
  id: string;
  title: string;
  summary: string;
  status: CustomerDeliverableStatus;
  deliverableType: string;
  workstreamKey: CustomerWorkstreamKey | null;
  artifactUrl: string | null;
  artifactLabel: string | null;
  approvalRequired: boolean;
  approvedAt: string | null;
  createdAt: string;
  updatedAt: string;
  sourceSubmissionId: string | null;
}

export interface PerformanceSnapshot {
  headline: string;
  summary: string;
  ordersLast30Days: number;
  revenueLast30Days: number;
  deliveredOrdersLast30Days: number;
  averageOrderValue: number;
  activeCampaignCount: number;
  estimatedAdSpend: number;
  liveMarketplaceCount: number;
  activeSocialChannelCount: number;
  monthOverMonthOrderDeltaPct: number | null;
  monthOverMonthRevenueDeltaPct: number | null;
  topChannels: Array<{
    label: string;
    value: number;
  }>;
}

export interface CustomerWorkstreamViewModel {
  key: CustomerWorkstreamKey;
  title: string;
  shortLabel: string;
  description: string;
  status: CustomerWorkstreamStatus;
  ownerLabel: string;
  observerMode: "workstream" | "executive" | "locked";
  blockerReason: string | null;
  latestOutput: string | null;
  nextStep: string;
  customerAction: string;
  adminAction: string;
  detailHref: string;
  metrics: Array<{
    label: string;
    value: string;
  }>;
}

export interface LaunchJourneyStage {
  key: LaunchJourneyStageKey;
  title: string;
  status: CustomerWorkstreamStatus;
  atlasAction: string;
  customerAction: string;
  blockerReason: string | null;
  requiredInputs: string[];
  expectedDeliverable: string;
}

export interface CustomerHubActionItem {
  id: string;
  title: string;
  summary: string;
  status: CustomerRequestThreadStatus | CustomerWorkstreamStatus;
  sourceLabel: string;
  workstreamLabel?: string | null;
  href: string | null;
  createdAt: string;
}

export interface CustomerHubFormItem {
  id: string;
  formCode: string;
  title: string;
  summary: string;
  status: string;
  submittedAt: string;
  updatedAt: string;
  href: string;
  adminNotes: string | null;
}

export interface CustomerHubDocumentItem {
  id: string;
  title: string;
  summary: string;
  status: string;
  typeLabel: string;
  href: string | null;
  createdAt: string;
}

export interface CustomerHubHistoryItem {
  id: string;
  title: string;
  description: string;
  createdAt: string;
  kind: string;
}

export interface CustomerRequestsHubViewModel {
  cards: HubCardDescriptor[];
  actionItems: CustomerHubActionItem[];
  submittedForms: CustomerHubFormItem[];
  documents: CustomerHubDocumentItem[];
  history: CustomerHubHistoryItem[];
}

export interface CustomerDashboardPanelMetric {
  label: string;
  value: string;
  tone?: "default" | "primary" | "warning" | "success";
}

export interface CustomerDashboardPanel {
  title: string;
  statusLabel: string;
  headline: string;
  summary: string;
  detail: string;
  metrics: CustomerDashboardPanelMetric[];
  primaryAction: HubCardAction | null;
  secondaryAction: HubCardAction | null;
}

export interface CustomerSecondaryMetric {
  id: string;
  title: string;
  value: string;
  summary: string;
  tone?: "default" | "primary" | "warning" | "success";
  href?: string | null;
  tab?: CustomerHubModalTab | null;
}

export interface CustomerHubStateDefaults {
  activeTab: CustomerHubModalTab;
  selectedEntity: Partial<Record<CustomerHubModalTab, string | null>>;
}

export interface AdminOperationsHubViewModel {
  waitingOnCustomer: Array<{
    id: string;
    title: string;
    summary: string;
    status: string;
    createdAt: string;
  }>;
  sentToCustomer: Array<{
    id: string;
    title: string;
    summary: string;
    status: string;
    createdAt: string;
  }>;
  internalOperations: Array<{
    id: string;
    title: string;
    summary: string;
    status: string;
    createdAt: string;
  }>;
  deliverableItems: Array<{
    id: string;
    title: string;
    summary: string;
    status: string;
    createdAt: string;
  }>;
}

export interface CustomerWorkspaceViewModel {
  customerId: string;
  displayName: string;
  companyName: string | null;
  launchPhase: CustomerLaunchPhase;
  starterPaymentState: CustomerPaymentState;
  managementPaymentState: CustomerPaymentState;
  selectedMarketplace: CustomerSelectedMarketplace | null;
  pendingInvoiceCount: number;
  headline: string;
  summary: string;
  primaryAction: {
    label: string;
    href: string;
  } | null;
  latestNotification: CustomerJourneyViewModel["latestNotification"];
  firstSaleStatus: "not_started" | "launching" | "live_waiting_sale" | "first_sale";
  launchStageLabel: string;
  requestCount: number;
  deliverableCount: number;
  blockedWorkstreamCount: number;
  activeWorkstreamCount: number;
  journey: CustomerJourneyViewModel;
  workstreams: CustomerWorkstreamViewModel[];
  moduleAccess: CustomerModuleAccess[];
  requestThreads: CustomerRequestThread[];
  deliverables: CustomerDeliverable[];
  performance: PerformanceSnapshot;
  launchJourney: LaunchJourneyStage[];
  serviceCatalog: CustomerServiceCatalogItem[];
  allowedFormCodes: string[];
  actionItems: CustomerHubActionItem[];
  submittedForms: CustomerHubFormItem[];
  documents: CustomerHubDocumentItem[];
  history: CustomerHubHistoryItem[];
  requestsHub: CustomerRequestsHubViewModel;
  customerFocusPanel: CustomerDashboardPanel;
  atlasActivityPanel: CustomerDashboardPanel;
  secondaryMetrics: CustomerSecondaryMetric[];
  hubStateDefaults: CustomerHubStateDefaults;
}
