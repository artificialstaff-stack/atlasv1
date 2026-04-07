import { getFormByCode, getTaskTemplates } from "@/lib/forms";
import type { FormSubmissionStatus } from "@/lib/forms/types";
import { DEFAULT_LOCALE, type Locale, translate } from "@/i18n";
import {
  appendCustomerRequestMessage,
  createCustomerDeliverable,
  ensureCustomerRequestThread,
} from "@/lib/customer-workspace";
import type { CustomerWorkstreamKey } from "@/lib/customer-workspace";
import { createAdminClient } from "@/lib/supabase/admin";
import type { InsertTables, Tables } from "@/types/database";
import type {
  ProcessTaskKind,
  ProcessTaskVisibility,
  WorkflowTransitionRequest,
  WorkflowTransitionStatus,
} from "./types";

type AdminClient = ReturnType<typeof createAdminClient>;
type FormSubmissionRow = Tables<"form_submissions">;
type ProcessTaskRow = Tables<"process_tasks">;

function resolveWorkflowLocale(locale?: Locale): Locale {
  return locale ?? DEFAULT_LOCALE;
}

function getWorkflowFormTitle(formCode: string, locale?: Locale) {
  return getFormByCode(formCode, resolveWorkflowLocale(locale))?.title ?? formCode;
}

function workflowCopy(locale: Locale, key: string, params?: Record<string, string | number>) {
  return translate(locale, `workflow.${key}`, params);
}

const ACTION_URLS = {
  services: "/panel/requests",
  process: "/panel/process",
};

function workstreamFromFormCode(formCode: string, category?: string | null): CustomerWorkstreamKey {
  if (formCode.startsWith("ATL-1")) return "company_setup";
  if (formCode.startsWith("ATL-2")) return "catalog_intake";
  if (formCode.startsWith("ATL-4")) return formCode === "ATL-402" ? "seo" : "ads";
  if (formCode.startsWith("ATL-5")) return "social";
  if (formCode.startsWith("ATL-6")) return "website";
  if (formCode === "ATL-705") return "company_setup";
  if (category === "shipping-fulfillment") return "fulfillment";
  if (category === "social-media") return "social";
  if (category === "marketing-advertising") return "ads";
  if (category === "branding-design") return "website";
  return "catalog_intake";
}

function requestThreadStatus(status: WorkflowTransitionStatus): "waiting_on_customer" | "waiting_on_atlas" | "resolved" {
  switch (status) {
    case "needs_correction":
      return "waiting_on_customer";
    case "completed":
    case "rejected":
      return "resolved";
    default:
      return "waiting_on_atlas";
  }
}

async function syncSubmissionRequestThread(input: {
  submission: FormSubmissionRow;
  status: WorkflowTransitionStatus;
  actorUserId?: string | null;
  message: string;
  authorType: "customer" | "admin" | "system";
  locale?: Locale;
}) {
  const locale = resolveWorkflowLocale(input.locale);
  const form = getFormByCode(input.submission.form_code, locale);
  const workstreamKey = workstreamFromFormCode(input.submission.form_code, form?.category);
  const threadType = workstreamKey === "catalog_intake" ? "catalog_intake" : "form_followup";
  const thread = await ensureCustomerRequestThread({
    userId: input.submission.user_id,
    subject: form?.title ?? input.submission.form_code,
    summary: customerMilestoneCopy(input.submission, input.status, locale).summary,
    status: requestThreadStatus(input.status),
    threadType,
    workstreamKey,
    sourceSubmissionId: input.submission.id,
    createdBy: input.actorUserId ?? input.submission.user_id,
  });

  await appendCustomerRequestMessage({
    threadId: thread.id,
    userId: input.submission.user_id,
    authorType: input.authorType,
    authorId: input.actorUserId ?? null,
    body: input.message,
    messageKind: input.status === "needs_correction" ? "request_update" : "status_update",
    metadata: {
      formCode: input.submission.form_code,
      submissionId: input.submission.id,
      workstreamKey,
      status: input.status,
    },
  });
}

function linkedSubmissionClause(submissionId: string) {
  return `source_submission_id.eq.${submissionId},form_submission_id.eq.${submissionId}`;
}

function taskQualityScore(task: ProcessTaskRow) {
  let score = 0;

  if (task.source_submission_id) score += 5;
  if (task.customer_title) score += 3;
  if (task.customer_summary) score += 3;
  if (task.task_status === "in_progress") score += 2;
  if (task.task_status === "blocked") score += 1;
  if (task.task_kind === "followup" || task.task_kind === "milestone") score += 1;

  return score;
}

function pickBestLinkedTask(tasks: ProcessTaskRow[]) {
  return [...tasks].sort((left, right) => {
    const scoreDelta = taskQualityScore(right) - taskQualityScore(left);
    if (scoreDelta !== 0) return scoreDelta;

    return (
      new Date(right.updated_at ?? right.created_at).getTime() -
      new Date(left.updated_at ?? left.created_at).getTime()
    );
  })[0] ?? null;
}

function categoryFromFormCategory(formCategory?: string | null) {
  switch (formCategory) {
    case "llc-legal":
      return "legal";
    case "accounting-finance":
      return "tax";
    case "shipping-fulfillment":
      return "logistics";
    case "marketing-advertising":
    case "social-media":
      return "marketplace";
    default:
      return "other";
  }
}

function customerTaskStatus(status: WorkflowTransitionStatus) {
  if (status === "completed") return "completed";
  if (status === "needs_correction" || status === "rejected") return "blocked";
  if (status === "under_review" || status === "approved") return "in_progress";
  return "pending";
}

function customerMilestoneCopy(
  submission: FormSubmissionRow,
  status: WorkflowTransitionStatus,
  locale: Locale = DEFAULT_LOCALE,
) {
  const serviceTitle = getWorkflowFormTitle(submission.form_code, locale);

  switch (status) {
    case "submitted":
      return {
        title: workflowCopy(locale, "submissionLifecycle.submitted.title"),
        summary: workflowCopy(locale, "submissionLifecycle.submitted.summary", { serviceTitle }),
        notes: workflowCopy(locale, "submissionLifecycle.submitted.notes"),
      };
    case "under_review":
      return {
        title: workflowCopy(locale, "submissionLifecycle.under_review.title"),
        summary: workflowCopy(locale, "submissionLifecycle.under_review.summary", { serviceTitle }),
        notes: workflowCopy(locale, "submissionLifecycle.under_review.notes"),
      };
    case "needs_correction":
      return {
        title: workflowCopy(locale, "submissionLifecycle.needs_correction.title"),
        summary: workflowCopy(locale, "submissionLifecycle.needs_correction.summary", { serviceTitle }),
        notes: workflowCopy(locale, "submissionLifecycle.needs_correction.notes"),
      };
    case "approved":
      return {
        title: workflowCopy(locale, "submissionLifecycle.approved.title"),
        summary: workflowCopy(locale, "submissionLifecycle.approved.summary", { serviceTitle }),
        notes: workflowCopy(locale, "submissionLifecycle.approved.notes"),
      };
    case "completed":
      return {
        title: workflowCopy(locale, "submissionLifecycle.completed.title"),
        summary: workflowCopy(locale, "submissionLifecycle.completed.summary", { serviceTitle }),
        notes: workflowCopy(locale, "submissionLifecycle.completed.notes"),
      };
    case "rejected":
      return {
        title: workflowCopy(locale, "submissionLifecycle.rejected.title"),
        summary: workflowCopy(locale, "submissionLifecycle.rejected.summary", { serviceTitle }),
        notes: workflowCopy(locale, "submissionLifecycle.rejected.notes"),
      };
  }
}

function notificationCopy(
  submission: FormSubmissionRow,
  status: WorkflowTransitionStatus,
  locale: Locale = DEFAULT_LOCALE,
) {
  const serviceTitle = getWorkflowFormTitle(submission.form_code, locale);

  switch (status) {
    case "submitted":
      return {
        title: workflowCopy(locale, "notifications.submitted.title"),
        body: workflowCopy(locale, "notifications.submitted.body", { serviceTitle }),
        type: "info",
        actionUrl: ACTION_URLS.services,
      };
    case "under_review":
      return {
        title: workflowCopy(locale, "notifications.under_review.title"),
        body: workflowCopy(locale, "notifications.under_review.body", { serviceTitle }),
        type: "info",
        actionUrl: ACTION_URLS.process,
      };
    case "needs_correction":
      return {
        title: workflowCopy(locale, "notifications.needs_correction.title"),
        body: workflowCopy(locale, "notifications.needs_correction.body", { serviceTitle }),
        type: "warning",
        actionUrl: ACTION_URLS.services,
      };
    case "approved":
      return {
        title: workflowCopy(locale, "notifications.approved.title"),
        body: workflowCopy(locale, "notifications.approved.body", { serviceTitle }),
        type: "success",
        actionUrl: ACTION_URLS.process,
      };
    case "completed":
      return {
        title: workflowCopy(locale, "notifications.completed.title"),
        body: workflowCopy(locale, "notifications.completed.body", { serviceTitle }),
        type: "success",
        actionUrl: ACTION_URLS.services,
      };
    case "rejected":
      return {
        title: workflowCopy(locale, "notifications.rejected.title"),
        body: workflowCopy(locale, "notifications.rejected.body", { serviceTitle }),
        type: "error",
        actionUrl: ACTION_URLS.services,
      };
  }
}

async function insertWorkflowEvent(
  db: AdminClient,
  event: InsertTables<"workflow_events">
) {
  const { data, error } = await db
    .from("workflow_events")
    .insert(event)
    .select("id")
    .single();

  if (!error && data?.id) return data.id;

  if (error && error.code === "PGRST204") {
    const fallbackEvent = {
      user_id: event.user_id ?? null,
      entity_type: event.task_id ? "task" : event.submission_id ? "submission" : "customer",
      entity_id: event.task_id ?? event.submission_id ?? event.user_id,
      event_type: event.event_type,
      actor_type: event.actor_type ?? "system",
      actor_id: event.actor_id ?? null,
      payload: {
        ...(event.payload && typeof event.payload === "object" ? event.payload : {}),
        title: event.title,
        description: event.description ?? null,
        submissionId: event.submission_id ?? null,
        taskId: event.task_id ?? null,
      },
    };

    const retry = await db
      .from("workflow_events")
      .insert(fallbackEvent as never)
      .select("id")
      .single();

    if (retry.error || !retry.data?.id) {
      throw retry.error ?? error;
    }

    return retry.data.id;
  }

  throw error;
}

async function insertNotification(
  db: AdminClient,
  notification: InsertTables<"notifications">
) {
  const { data, error } = await db
    .from("notifications")
    .insert(notification)
    .select("id")
    .single();

  if (error) throw error;
  return data.id;
}

async function ensureCustomerMilestone(
  db: AdminClient,
  submission: FormSubmissionRow,
  status: WorkflowTransitionStatus,
  locale: Locale,
  cleanup: {
    insertedTaskIds: string[];
    revertedTasks: Array<{
      taskId: string;
      previous: Partial<ProcessTaskRow>;
    }>;
  }
) {
  const copy = customerMilestoneCopy(submission, status, locale);
  const nextTaskStatus = customerTaskStatus(status);
  const { data: existingTasks } = await db
    .from("process_tasks")
    .select("*")
    .eq("user_id", submission.user_id)
    .eq("visibility", "customer")
    .or(linkedSubmissionClause(submission.id));

  const existing = pickBestLinkedTask(existingTasks ?? []);

  if (existing) {
    cleanup.revertedTasks.push({
      taskId: existing.id,
      previous: {
        task_status: existing.task_status,
        task_name: existing.task_name,
        notes: existing.notes,
        customer_title: existing.customer_title,
        customer_summary: existing.customer_summary,
        updated_at: existing.updated_at,
      },
    });

    const { error } = await db
      .from("process_tasks")
      .update({
        task_name: copy.title,
        task_status: nextTaskStatus,
        notes: copy.notes,
        customer_title: copy.title,
        customer_summary: copy.summary,
        form_submission_id: submission.id,
        source_submission_id: submission.id,
        task_kind: status === "needs_correction" ? "customer_followup" : "service_execution",
      })
      .eq("id", existing.id);

    if (error) throw error;
    return existing.id;
  }

  const { data, error } = await db
    .from("process_tasks")
    .insert({
      user_id: submission.user_id,
      task_name: copy.title,
      task_category: categoryFromFormCategory(getFormByCode(submission.form_code)?.category),
      task_status: nextTaskStatus,
      sort_order: 1,
      notes: copy.notes,
      form_submission_id: submission.id,
      source_submission_id: submission.id,
      visibility: "customer" as ProcessTaskVisibility,
      task_kind: (status === "needs_correction" ? "customer_followup" : "service_execution") as ProcessTaskKind,
      customer_title: copy.title,
      customer_summary: copy.summary,
    })
    .select("id")
    .single();

  if (error) throw error;
  cleanup.insertedTaskIds.push(data.id);
  return data.id;
}

async function ensureAdminReviewTask(
  db: AdminClient,
  submission: FormSubmissionRow,
  locale: Locale,
  cleanup: {
    insertedTaskIds: string[];
    revertedTasks: Array<{
      taskId: string;
      previous: Partial<ProcessTaskRow>;
    }>;
  }
) {
  const form = getFormByCode(submission.form_code, locale);
  const taskName = workflowCopy(locale, "admin.reviewTaskName", { formCode: submission.form_code });
  const { data: existingTasks } = await db
    .from("process_tasks")
    .select("*")
    .eq("user_id", submission.user_id)
    .eq("visibility", "admin_internal")
    .in("task_kind", ["customer_followup", "intake", "followup"])
    .or(linkedSubmissionClause(submission.id));

  const existing = pickBestLinkedTask(existingTasks ?? []);

  if (existing) {
    cleanup.revertedTasks.push({
      taskId: existing.id,
      previous: {
        task_status: existing.task_status,
        notes: existing.notes,
      },
    });
    const { error } = await db
      .from("process_tasks")
      .update({
        task_status: "in_progress",
        task_kind: "intake",
        form_submission_id: submission.id,
        source_submission_id: submission.id,
        notes: workflowCopy(locale, "admin.reviewNotes", {
          serviceTitle: form?.title ?? submission.form_code,
        }),
      })
      .eq("id", existing.id);

    if (error) throw error;
    return existing.id;
  }

  const { data, error } = await db
    .from("process_tasks")
    .insert({
      user_id: submission.user_id,
      task_name: taskName,
      task_category: categoryFromFormCategory(form?.category),
      task_status: "pending",
      sort_order: 0,
      notes: `${form?.title ?? submission.form_code} basvurusu admin inceleme sirasinda.`,
      form_submission_id: submission.id,
      source_submission_id: submission.id,
      visibility: "admin_internal" as ProcessTaskVisibility,
      task_kind: "intake" as ProcessTaskKind,
    })
    .select("id")
    .single();

  if (error) throw error;
  cleanup.insertedTaskIds.push(data.id);
  return data.id;
}

async function ensureAdminExecutionTasks(
  db: AdminClient,
  submission: FormSubmissionRow,
  locale: Locale,
  cleanup: {
    insertedTaskIds: string[];
  }
) {
  const templates = getTaskTemplates(submission.form_code, locale);
  if (templates.length === 0) return [];

  const { data: existing } = await db
    .from("process_tasks")
    .select("*")
    .eq("user_id", submission.user_id)
    .eq("visibility", "admin_internal")
    .in("task_kind", ["execution", "service_execution"])
    .or(linkedSubmissionClause(submission.id));

  if ((existing ?? []).length > 0) {
    const { error } = await db
      .from("process_tasks")
      .update({
        form_submission_id: submission.id,
        source_submission_id: submission.id,
        task_kind: "service_execution",
      })
      .in(
        "id",
        (existing ?? []).map((task) => task.id)
      );

    if (error) throw error;
    return existing?.map((task) => task.id) ?? [];
  }

  const rows = templates.map((template) => ({
    user_id: submission.user_id,
    task_name: template.task_name,
    task_category: template.task_category,
    task_status: "pending",
    sort_order: template.sort_order,
    notes: template.notes_template,
    form_submission_id: submission.id,
    source_submission_id: submission.id,
    visibility: "admin_internal" as ProcessTaskVisibility,
      task_kind: "service_execution" as ProcessTaskKind,
  }));

  const { data, error } = await db
    .from("process_tasks")
    .insert(rows)
    .select("id");

  if (error) throw error;
  cleanup.insertedTaskIds.push(...(data ?? []).map((task) => task.id));
  return (data ?? []).map((task) => task.id);
}

async function cleanupTransitionArtifacts(
  db: AdminClient,
  cleanup: {
    insertedTaskIds: string[];
    insertedNotificationIds: string[];
    insertedEventIds: string[];
    revertedTasks: Array<{
      taskId: string;
      previous: Partial<ProcessTaskRow>;
    }>;
  }
) {
  if (cleanup.insertedEventIds.length > 0) {
    await db.from("workflow_events").delete().in("id", cleanup.insertedEventIds);
  }
  if (cleanup.insertedNotificationIds.length > 0) {
    await db.from("notifications").delete().in("id", cleanup.insertedNotificationIds);
  }
  if (cleanup.insertedTaskIds.length > 0) {
    await db.from("process_tasks").delete().in("id", cleanup.insertedTaskIds);
  }
  for (const revert of cleanup.revertedTasks.reverse()) {
    await db.from("process_tasks").update(revert.previous).eq("id", revert.taskId);
  }
}

export async function createFormSubmissionWithWorkflow(input: {
  userId: string;
  formCode: string;
  data: InsertTables<"form_submissions">["data"];
  locale?: Locale;
}) {
  const db = createAdminClient();
  const locale = resolveWorkflowLocale(input.locale);
  const cleanup = {
    insertedTaskIds: [] as string[],
    insertedNotificationIds: [] as string[],
    insertedEventIds: [] as string[],
    revertedTasks: [] as Array<{ taskId: string; previous: Partial<ProcessTaskRow> }>,
    submissionId: null as string | null,
  };

  try {
    const { data: submission, error } = await db
      .from("form_submissions")
      .insert({
        form_code: input.formCode,
        user_id: input.userId,
        data: input.data,
        status: "submitted",
      })
      .select("*")
      .single();

    if (error) throw error;
    cleanup.submissionId = submission.id;

    await syncSubmissionRequestThread({
      submission,
      status: "submitted",
      actorUserId: submission.user_id,
      authorType: "customer",
      locale,
      message: workflowCopy(locale, "messages.submissionSent", {
        serviceTitle: getWorkflowFormTitle(submission.form_code, locale),
      }),
    });

    await ensureAdminReviewTask(db, submission, locale, cleanup);
    const milestoneId = await ensureCustomerMilestone(db, submission, "submitted", locale, cleanup);
    cleanup.insertedEventIds.push(
      await insertWorkflowEvent(db, {
        user_id: submission.user_id,
        submission_id: submission.id,
        task_id: milestoneId,
        event_type: "submission_submitted",
        title: workflowCopy(locale, "events.submissionSubmitted.title"),
        description: workflowCopy(locale, "events.submissionSubmitted.description", {
          formCode: submission.form_code,
        }),
        actor_type: "customer",
        actor_id: submission.user_id,
        payload: { status: "submitted", formCode: submission.form_code },
      })
    );
    const notification = notificationCopy(submission, "submitted", locale);
    cleanup.insertedNotificationIds.push(
      await insertNotification(db, {
        user_id: submission.user_id,
        title: notification.title,
        body: notification.body,
        type: notification.type,
        channel: "in_app",
        action_url: notification.actionUrl,
        metadata: { submissionId: submission.id, status: "submitted" },
      })
    );

    return submission;
  } catch (error) {
    await cleanupTransitionArtifacts(db, cleanup);
    if (cleanup.submissionId) {
      await db.from("form_submissions").delete().eq("id", cleanup.submissionId);
    }
    throw error;
  }
}

export async function transitionFormSubmission({
  submissionId,
  nextStatus,
  adminNotes,
  actorUserId,
  locale: requestedLocale,
}: WorkflowTransitionRequest) {
  const db = createAdminClient();
  const locale = resolveWorkflowLocale(requestedLocale);
  const cleanup = {
    insertedTaskIds: [] as string[],
    insertedNotificationIds: [] as string[],
    insertedEventIds: [] as string[],
    revertedTasks: [] as Array<{ taskId: string; previous: Partial<ProcessTaskRow> }>,
  };

  const { data: submission, error: submissionError } = await db
    .from("form_submissions")
    .select("*")
    .eq("id", submissionId)
    .single();

  if (submissionError || !submission) {
    throw new Error(submissionError?.message ?? "Form gonderimi bulunamadi.");
  }

  try {
    const milestoneId = await ensureCustomerMilestone(db, submission, nextStatus, locale, cleanup);
    if (["under_review", "needs_correction", "approved"].includes(nextStatus)) {
      await ensureAdminReviewTask(db, submission, locale, cleanup);
    }

    if (nextStatus === "approved") {
      await ensureAdminExecutionTasks(db, submission, locale, cleanup);
      const { data: followupTasks } = await db
        .from("process_tasks")
        .select("*")
        .eq("visibility", "admin_internal")
        .in("task_kind", ["customer_followup", "intake", "followup"])
        .or(linkedSubmissionClause(submission.id));

      for (const task of followupTasks ?? []) {
        cleanup.revertedTasks.push({
          taskId: task.id,
          previous: {
            task_status: task.task_status,
            completed_at: task.completed_at,
          },
        });
        const { error } = await db
          .from("process_tasks")
          .update({
            task_status: "completed",
            completed_at: new Date().toISOString(),
            form_submission_id: submission.id,
            source_submission_id: submission.id,
            task_kind: "intake",
          })
          .eq("id", task.id);
        if (error) throw error;
      }
    }

    if (nextStatus === "completed") {
      const { data: linkedTasks } = await db
        .from("process_tasks")
        .select("*")
        .or(linkedSubmissionClause(submission.id));
      for (const task of linkedTasks ?? []) {
        if (task.task_status === "completed") continue;
        cleanup.revertedTasks.push({
          taskId: task.id,
          previous: {
            task_status: task.task_status,
            completed_at: task.completed_at,
          },
        });
        const { error } = await db
          .from("process_tasks")
          .update({
            task_status: "completed",
            completed_at: new Date().toISOString(),
            form_submission_id: submission.id,
            source_submission_id: submission.id,
          })
          .eq("id", task.id);
        if (error) throw error;
      }
    }

    cleanup.insertedEventIds.push(
      await insertWorkflowEvent(db, {
        user_id: submission.user_id,
        submission_id: submission.id,
        task_id: milestoneId,
        event_type: `submission_${nextStatus}`,
        title: workflowCopy(locale, "events.statusUpdated.title", { status: nextStatus }),
        description: adminNotes ?? customerMilestoneCopy(submission, nextStatus, locale).summary,
        actor_type: "admin",
        actor_id: actorUserId ?? null,
        payload: {
          fromStatus: submission.status,
          toStatus: nextStatus,
          formCode: submission.form_code,
        },
      })
    );

    const notification = notificationCopy(submission, nextStatus, locale);
    cleanup.insertedNotificationIds.push(
      await insertNotification(db, {
        user_id: submission.user_id,
        title: notification.title,
        body: adminNotes || notification.body,
        type: notification.type,
        channel: "in_app",
        action_url: notification.actionUrl,
        metadata: { submissionId: submission.id, status: nextStatus },
      })
    );

    const { data: updated, error: updateError } = await db
      .from("form_submissions")
      .update({
        status: nextStatus as FormSubmissionStatus,
        admin_notes: adminNotes ?? null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", submission.id)
      .select("*")
      .single();

    if (updateError) throw updateError;

    await syncSubmissionRequestThread({
      submission: updated,
      status: nextStatus,
      actorUserId,
      authorType: "admin",
      locale,
      message:
        adminNotes ??
        workflowCopy(locale, "messages.statusUpdated", {
          serviceTitle: getWorkflowFormTitle(updated.form_code, locale),
          status: nextStatus,
        }),
    });

    if (nextStatus === "completed") {
      const form = getFormByCode(updated.form_code, locale);
      await createCustomerDeliverable({
        userId: updated.user_id,
        title: workflowCopy(locale, "deliverable.title", {
          serviceTitle: form?.title ?? updated.form_code,
        }),
        summary:
          adminNotes ??
          workflowCopy(locale, "deliverable.summary", {
            serviceTitle: form?.title ?? updated.form_code,
          }),
        workstreamKey: workstreamFromFormCode(updated.form_code, form?.category),
        deliverableType: "workflow_completion",
        sourceSubmissionId: updated.id,
        createdBy: actorUserId ?? null,
      });
    }

    return updated;
  } catch (error) {
    await cleanupTransitionArtifacts(db, cleanup);
    throw error;
  }
}

export type CustomerCompletionFieldKey =
  | "website_url"
  | "instagram_profile"
  | "shopify_store_url"
  | "registered_agent_name"
  | "registered_agent_address"
  | "formation_date_confirmed"
  | "company_email"
  | "company_phone"
  | "bank_account_status";

export interface CustomerCompletionField {
  key: CustomerCompletionFieldKey;
  label: string;
  description: string;
}

function formatCompletionFieldList(fields: CustomerCompletionField[]) {
  return fields.map((field) => `• ${field.label}: ${field.description}`).join("\n");
}

async function syncPrimaryCompanyFromLatestSubmissions(db: AdminClient, userId: string) {
  const { data: company } = await db
    .from("customer_companies")
    .select("id, formation_date")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!company?.id || company.formation_date) return;

  const { data: submissions } = await db
    .from("form_submissions")
    .select("data")
    .eq("user_id", userId)
    .in("form_code", ["ATL-101", "ATL-102"])
    .order("created_at", { ascending: false });

  const formationDate = (submissions ?? [])
    .map((submission) => {
      const data =
        submission.data && typeof submission.data === "object"
          ? (submission.data as Record<string, unknown>)
          : null;
      return typeof data?.formation_date === "string" ? data.formation_date : null;
    })
    .find(Boolean);

  if (!formationDate) return;

  await db
    .from("customer_companies")
    .update({ formation_date: formationDate })
    .eq("id", company.id);
}

export async function getCustomerCompletionFields(
  userId: string,
  locale: Locale = DEFAULT_LOCALE,
): Promise<CustomerCompletionField[]> {
  const db = createAdminClient();
  await syncPrimaryCompanyFromLatestSubmissions(db, userId);

  const [{ data: user }, { data: company }, { data: marketplaces }, { data: socials }] = await Promise.all([
    db
      .from("users")
      .select("phone")
      .eq("id", userId)
      .maybeSingle(),
    db
      .from("customer_companies")
      .select("website,registered_agent_name,registered_agent_address,formation_date,company_email,company_phone,bank_account_status,bank_name")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    db
      .from("marketplace_accounts")
      .select("platform,store_url,store_name,status")
      .eq("user_id", userId),
    db
      .from("social_media_accounts")
      .select("platform,profile_url,account_name,status")
      .eq("user_id", userId),
  ]);

  const hasInstagram = (socials ?? []).some((account) => {
    const platform = account.platform?.toLowerCase();
    return platform === "instagram" && Boolean(account.profile_url || account.account_name);
  });

  const shopifyAccount = (marketplaces ?? []).find(
    (account) => account.platform?.toLowerCase() === "shopify"
  );
  const hasShopify = Boolean(shopifyAccount?.store_url || shopifyAccount?.store_name);

  const fields: CustomerCompletionField[] = [];

  if (!company?.website) {
    fields.push({
      key: "website_url",
      label: workflowCopy(locale, "completionFields.website_url.label"),
      description: workflowCopy(locale, "completionFields.website_url.description"),
    });
  }

  if (!hasInstagram) {
    fields.push({
      key: "instagram_profile",
      label: workflowCopy(locale, "completionFields.instagram_profile.label"),
      description: workflowCopy(locale, "completionFields.instagram_profile.description"),
    });
  }

  if (!hasShopify) {
    fields.push({
      key: "shopify_store_url",
      label: workflowCopy(locale, "completionFields.shopify_store_url.label"),
      description: workflowCopy(locale, "completionFields.shopify_store_url.description"),
    });
  }

  if (!company?.registered_agent_name) {
    fields.push({
      key: "registered_agent_name",
      label: workflowCopy(locale, "completionFields.registered_agent_name.label"),
      description: workflowCopy(locale, "completionFields.registered_agent_name.description"),
    });
  }

  if (!company?.registered_agent_address) {
    fields.push({
      key: "registered_agent_address",
      label: workflowCopy(locale, "completionFields.registered_agent_address.label"),
      description: workflowCopy(locale, "completionFields.registered_agent_address.description"),
    });
  }

  if (!company?.formation_date) {
    fields.push({
      key: "formation_date_confirmed",
      label: workflowCopy(locale, "completionFields.formation_date_confirmed.label"),
      description: workflowCopy(locale, "completionFields.formation_date_confirmed.description"),
    });
  }

  if (!company?.company_email) {
    fields.push({
      key: "company_email",
      label: workflowCopy(locale, "completionFields.company_email.label"),
      description: workflowCopy(locale, "completionFields.company_email.description"),
    });
  }

  if (!company?.company_phone && !user?.phone) {
    fields.push({
      key: "company_phone",
      label: workflowCopy(locale, "completionFields.company_phone.label"),
      description: workflowCopy(locale, "completionFields.company_phone.description"),
    });
  }

  if (!company?.bank_name || company.bank_account_status === "not_opened" || !company?.bank_account_status) {
    fields.push({
      key: "bank_account_status",
      label: workflowCopy(locale, "completionFields.bank_account_status.label"),
      description: workflowCopy(locale, "completionFields.bank_account_status.description"),
    });
  }

  return fields;
}

export interface RequestCustomerFormActionInput {
  userId: string;
  formCode: string;
  locale?: Locale;
  actorUserId?: string | null;
  title: string;
  summary: string;
  notes: string;
  requestedFields?: string[];
  customerTaskName?: string;
  customerTaskStatus?: WorkflowTransitionStatus | "blocked" | "pending" | "in_progress" | "completed";
  customerTaskCategory?: ProcessTaskRow["task_category"];
  customerSortOrder?: number;
  adminTaskName?: string;
  adminTaskNotes?: string;
  adminSortOrder?: number;
  notificationTitle?: string;
  notificationBody?: string;
  eventType?: string;
  eventTitle?: string;
}

export async function requestCustomerFormAction(input: RequestCustomerFormActionInput) {
  const db = createAdminClient();
  const locale = resolveWorkflowLocale(input.locale);
  const form = getFormByCode(input.formCode, locale);
  if (!form) {
    throw new Error(workflowCopy(locale, "requestFormAction.formNotFound", { formCode: input.formCode }));
  }

  const customerTaskName = input.customerTaskName ?? input.title;
  const customerTaskStatus = input.customerTaskStatus ?? "blocked";
  const customerTaskCategory = input.customerTaskCategory ?? "other";
  const customerSortOrder = input.customerSortOrder ?? 5;
  const adminTaskName =
    input.adminTaskName ?? workflowCopy(locale, "requestFormAction.adminTaskName", { formCode: input.formCode });
  const adminTaskNotes =
    input.adminTaskNotes ??
    workflowCopy(locale, "requestFormAction.adminTaskNotes", { formCode: input.formCode });

  const { data: customerTask } = await db
    .from("process_tasks")
    .select("id")
    .eq("user_id", input.userId)
    .eq("visibility", "customer")
    .eq("task_kind", "customer_followup")
    .eq("task_name", customerTaskName)
    .maybeSingle();

  let customerTaskId = customerTask?.id ?? null;

  if (customerTaskId) {
    const { error } = await db
      .from("process_tasks")
      .update({
        task_status: customerTaskStatus,
        task_category: customerTaskCategory,
        customer_title: input.title,
        customer_summary: input.summary,
        notes: input.notes,
        updated_at: new Date().toISOString(),
      })
      .eq("id", customerTaskId);

    if (error) throw error;
  } else {
    const { data, error } = await db
      .from("process_tasks")
      .insert({
        user_id: input.userId,
        task_name: customerTaskName,
        task_category: customerTaskCategory,
        task_status: customerTaskStatus,
        sort_order: customerSortOrder,
        notes: input.notes,
        visibility: "customer" as ProcessTaskVisibility,
        task_kind: "customer_followup" as ProcessTaskKind,
        customer_title: input.title,
        customer_summary: input.summary,
      })
      .select("id")
      .single();

    if (error) throw error;
    customerTaskId = data.id;
  }

  const { data: adminTask } = await db
    .from("process_tasks")
    .select("id")
    .eq("user_id", input.userId)
    .eq("visibility", "admin_internal")
    .eq("task_kind", "intake")
    .eq("task_name", adminTaskName)
    .maybeSingle();

  if (adminTask?.id) {
    await db
      .from("process_tasks")
      .update({
        task_status: "in_progress",
        notes: adminTaskNotes,
        updated_at: new Date().toISOString(),
      })
      .eq("id", adminTask.id);
  } else {
    await db.from("process_tasks").insert({
      user_id: input.userId,
      task_name: adminTaskName,
      task_category: customerTaskCategory,
      task_status: "in_progress",
      sort_order: input.adminSortOrder ?? customerSortOrder + 1,
      notes: adminTaskNotes,
      visibility: "admin_internal" as ProcessTaskVisibility,
      task_kind: "intake" as ProcessTaskKind,
    });
  }

  await insertWorkflowEvent(db, {
    user_id: input.userId,
    task_id: customerTaskId,
    event_type: input.eventType ?? "customer_form_requested",
    title:
      input.eventTitle ??
      workflowCopy(locale, "requestFormAction.eventTitle", { formCode: input.formCode }),
    description: input.notes,
    actor_type: "admin",
    actor_id: input.actorUserId ?? null,
    payload: {
      formCode: input.formCode,
      requestedFields: input.requestedFields ?? [],
    },
  });

  await insertNotification(db, {
    user_id: input.userId,
    title: input.notificationTitle ?? input.title,
    body:
      input.notificationBody ??
      workflowCopy(locale, "requestFormAction.notificationBody", {
        summary: input.summary,
        formCode: input.formCode,
      }),
    type: customerTaskStatus === "blocked" ? "warning" : "info",
    channel: "in_app",
    action_url: `/panel/support/forms/${input.formCode}`,
    metadata: {
      formCode: input.formCode,
      requestedFields: input.requestedFields ?? [],
      requestTitle: input.title,
    },
  });

  const thread = await ensureCustomerRequestThread({
    userId: input.userId,
    subject: input.title,
    summary: input.summary,
    status: "waiting_on_customer",
    threadType: input.formCode === "ATL-201" ? "catalog_intake" : "form_followup",
    workstreamKey: workstreamFromFormCode(input.formCode, form.category),
    createdBy: input.actorUserId ?? null,
  });

  await appendCustomerRequestMessage({
    threadId: thread.id,
    userId: input.userId,
    authorType: "admin",
    authorId: input.actorUserId ?? null,
    body: input.notes,
    messageKind: "request_update",
    metadata: {
      formCode: input.formCode,
      requestedFields: input.requestedFields ?? [],
      workstreamKey: workstreamFromFormCode(input.formCode, form.category),
    },
  });

  return {
    requested: true,
    formCode: input.formCode,
    customerTaskId,
    requestedFields: input.requestedFields ?? [],
  };
}

export async function requestCustomerCompletionDetails(input: {
  userId: string;
  actorUserId?: string | null;
  locale?: Locale;
}) {
  const locale = resolveWorkflowLocale(input.locale);
  const fields = await getCustomerCompletionFields(input.userId, locale);

  if (fields.length === 0) {
    return { requested: false, missingFields: [] as CustomerCompletionField[] };
  }

  const title = workflowCopy(locale, "completionRequest.title");
  const summary = workflowCopy(locale, "completionRequest.summary");
  const notes = [
    workflowCopy(locale, "completionRequest.notesIntro"),
    "",
    formatCompletionFieldList(fields),
    "",
    workflowCopy(locale, "completionRequest.formCodeLine"),
  ].join("\n");
  await requestCustomerFormAction({
    userId: input.userId,
    actorUserId: input.actorUserId,
    locale,
    formCode: "ATL-705",
    title,
    summary,
    notes,
    requestedFields: fields.map((field) => field.key),
    adminTaskName: workflowCopy(locale, "completionRequest.adminTaskName"),
    adminTaskNotes: workflowCopy(locale, "completionRequest.adminTaskNotes"),
    eventType: "customer_completion_requested",
    eventTitle: workflowCopy(locale, "completionRequest.eventTitle"),
    notificationTitle: workflowCopy(locale, "completionRequest.notificationTitle"),
  });

  return {
    requested: true,
    missingFields: fields,
  };
}
