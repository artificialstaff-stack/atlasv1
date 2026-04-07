import type { StoreOfferCategory } from "@/lib/payments";

export type PortalAssignedActionKind =
  | "form_request"
  | "view_submission"
  | "open_settings"
  | "open_orders"
  | "open_billing"
  | "open_support"
  | "open_process"
  | "open_documents"
  | "open_services"
  | "open_reports";

export interface PortalAssignedAction {
  id: string;
  kind: PortalAssignedActionKind;
  label: string;
  description: string;
  href: string;
  formCode?: string | null;
}

export type PortalSurfaceVariant = "hero" | "secondary" | "list" | "locked";

export interface ClientQuickAction {
  id: string;
  label: string;
  href: string;
  description: string;
  kind: PortalAssignedActionKind | "custom";
  emphasis?: "primary" | "secondary" | "ghost";
}

export interface LockedModuleHint {
  label: string;
  description: string;
  tone: "locked" | "observer" | "live";
}

export interface ClientPageHeroProps {
  eyebrow: string;
  title: string;
  description: string;
  surfaceVariant?: PortalSurfaceVariant;
  badges?: string[];
  primaryAction?: ClientQuickAction | null;
  secondaryAction?: ClientQuickAction | null;
}

export interface ClientGuidanceMetric {
  label: string;
  value: string;
}

export interface ClientGuidanceState {
  areaLabel: string;
  focusLabel: string;
  summary: string;
  pendingCount?: number;
  metrics?: ClientGuidanceMetric[];
  primaryAction?: ClientQuickAction | null;
  secondaryAction?: ClientQuickAction | null;
  helperText?: string;
  lockedHint?: LockedModuleHint | null;
}

export interface PortalJourneyCTA extends PortalAssignedAction {
  emphasis: "primary" | "secondary";
}

export interface PortalFormRequest {
  id: string;
  formCode: string;
  title: string;
  summary: string;
  description: string;
  status: "pending" | "submitted" | "completed";
  requestedAt: string;
  updatedAt: string;
  requestedFields: string[];
  primaryAction: PortalJourneyCTA;
  secondaryAction: PortalJourneyCTA | null;
  latestSubmission:
    | {
        id: string;
        status: string;
        updatedAt: string;
      }
    | null;
}

export interface PortalAssistantSuggestion extends PortalJourneyCTA {
  reason?: string | null;
}

export interface PortalSupportOverview {
  assignedRequests: PortalFormRequest[];
  submissionHistory: Array<{
    id: string;
    formCode: string;
    title: string;
    status: string;
    createdAt: string;
    updatedAt: string;
  }>;
  availableFormCodes: string[];
  unlockContext?: PortalSupportUnlockContext | null;
}

export interface PortalSupportUnlockContext {
  intent: string | null;
  fromKey: string | null;
  fromLabel: string;
  offerType: StoreOfferCategory | null;
  offerKey: string | null;
  offerTitle: string;
  offerSummary: string;
  priceLabel: string | null;
  supportHubHref: string;
  supportFormHref: string;
  billingHref: string | null;
  threadSubjectPrefix: string;
  threadMessagePrefix: string;
}

export interface PortalAssistantResponse {
  answer: string;
  confidence: "high" | "medium" | "low";
  suggestedAction: PortalAssistantSuggestion | null;
  suggestedFormCode: string | null;
  deepLink: string | null;
  fallbackReason: string | null;
  suggestions: PortalAssistantSuggestion[];
}
