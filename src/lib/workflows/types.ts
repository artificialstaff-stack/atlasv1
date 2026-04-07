import type { FormSubmissionStatus } from "@/lib/forms/types";
import type { Locale } from "@/i18n";
import type { Tables } from "@/types/database";

export type ProcessTaskVisibility = "customer" | "admin_internal";
export type ProcessTaskKind =
  | "milestone"
  | "execution"
  | "followup"
  | "intake"
  | "service_execution"
  | "customer_followup"
  | "ops_maintenance";
export type WorkflowTransitionStatus = Exclude<FormSubmissionStatus, "draft">;

export type ProcessTaskRow = Tables<"process_tasks">;
export type FormSubmissionRow = Tables<"form_submissions">;
export type NotificationRow = Tables<"notifications">;
export type WorkflowEventRow = Tables<"workflow_events">;
export type CustomerActionTargetType =
  | "open-form"
  | "open-upload"
  | "open-support"
  | "view-status"
  | "wait";

export interface CustomerActionTarget {
  type: CustomerActionTargetType;
  label: string;
  href: string;
  description?: string;
}

export interface WorkflowTransitionRequest {
  submissionId: string;
  nextStatus: WorkflowTransitionStatus;
  adminNotes?: string | null;
  actorUserId?: string | null;
  locale?: Locale;
}

export interface CustomerMilestone {
  id: string;
  submissionId: string | null;
  formCode: string | null;
  serviceTitle: string;
  title: string;
  summary: string;
  status: "pending" | "in_progress" | "blocked" | "completed";
  category: string | null;
  createdAt: string;
  updatedAt: string;
  estimatedMinutes: number | null;
  whyNeeded: string | null;
  primaryAction: CustomerActionTarget | null;
  secondaryAction: CustomerActionTarget | null;
  tabSummary: {
    status: string;
    atlasAction: string;
    customerAction: string;
    documents: string[];
    history: Array<{
      id: string;
      title: string;
      description: string;
      createdAt: string;
      actorType: string;
    }>;
  };
}

export interface CustomerServiceCard {
  submissionId: string;
  formCode: string;
  title: string;
  description: string;
  status: FormSubmissionStatus;
  statusLabel: string;
  progressPct: number;
  milestoneCount: number;
  nextStepLabel: string;
  updatedAt: string;
  stateGroup: "action_required" | "atlas_working" | "completed";
  primaryAction: CustomerActionTarget | null;
  secondaryAction: CustomerActionTarget | null;
}

export interface CustomerJourneyViewModel {
  headline: string;
  summary: string;
  progressPct: number;
  completedCount: number;
  totalCount: number;
  blockerCount: number;
  nextStepLabel: string;
  nextStepDescription: string;
  latestNotification: {
    id: string;
    title: string;
    body: string;
    createdAt: string;
    actionUrl: string | null;
  } | null;
  primaryAction: CustomerActionTarget | null;
  milestones: CustomerMilestone[];
  serviceCards: CustomerServiceCard[];
}
