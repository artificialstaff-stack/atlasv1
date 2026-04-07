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
