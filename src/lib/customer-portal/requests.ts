import { getFormByCode } from "@/lib/forms";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Tables } from "@/types/database";
import type {
  PortalFormRequest,
  PortalSupportOverview,
} from "./types";

type ProcessTaskRow = Tables<"process_tasks">;
type NotificationRow = Tables<"notifications">;
type SubmissionRow = Pick<
  Tables<"form_submissions">,
  "id" | "form_code" | "status" | "created_at" | "updated_at"
>;

const ALWAYS_AVAILABLE_FORM_CODES = ["ATL-701"];
const ACTIVE_SUBMISSION_STATUSES = new Set([
  "submitted",
  "under_review",
  "needs_correction",
  "approved",
]);

function extractFormCodeFromText(text: string | null | undefined) {
  if (!text) return null;
  const match = text.match(/ATL-\d{3}/i);
  return match?.[0]?.toUpperCase() ?? null;
}

function getNotificationMetadata(notification: NotificationRow) {
  return notification.metadata && typeof notification.metadata === "object"
    ? (notification.metadata as Record<string, unknown>)
    : null;
}

function extractFormCodeFromNotification(notification: NotificationRow) {
  const metadata = getNotificationMetadata(notification);
  const metadataCode = metadata?.formCode ?? metadata?.form_code;
  if (typeof metadataCode === "string" && metadataCode.trim()) {
    return metadataCode.trim().toUpperCase();
  }

  return (
    extractFormCodeFromText(notification.action_url) ??
    extractFormCodeFromText(notification.body) ??
    extractFormCodeFromText(notification.title)
  );
}

function extractRequestedFields(notification: NotificationRow) {
  const metadata = getNotificationMetadata(notification);
  const requestedFields = metadata?.requestedFields ?? metadata?.requested_fields;
  if (!Array.isArray(requestedFields)) return [];

  return requestedFields.filter((value): value is string => typeof value === "string");
}

function extractFormCodeFromTask(task: ProcessTaskRow) {
  return (
    extractFormCodeFromText(task.notes) ??
    extractFormCodeFromText(task.task_name)
  );
}

function formatRequestStatus(submission: SubmissionRow | null) {
  if (!submission) return "pending" as const;
  if (submission.status === "completed") return "completed" as const;
  return "submitted" as const;
}

function buildRequestSummary(task: ProcessTaskRow, notification: NotificationRow | null) {
  const formCode =
    extractFormCodeFromTask(task) ??
    (notification ? extractFormCodeFromNotification(notification) : null);
  const form = formCode ? getFormByCode(formCode) : null;
  return {
    title: form?.title || task.task_name,
    summary:
      form?.description ||
      notification?.title ||
      "Atlas ekibi bu adim icin sizden bilgi bekliyor.",
    description:
      notification?.body?.trim() ||
      task.notes?.trim() ||
      form?.instructions ||
      "Formu doldurarak Atlas ekibinin surecte ilerlemesini saglayin.",
  };
}

function buildSubmissionHistory(submissions: SubmissionRow[]) {
  return submissions.map((submission) => ({
    id: submission.id,
    formCode: submission.form_code,
    title: getFormByCode(submission.form_code)?.title ?? submission.form_code,
    status: submission.status,
    createdAt: submission.created_at,
    updatedAt: submission.updated_at,
  }));
}

export async function getPortalSupportOverview(userId: string): Promise<PortalSupportOverview> {
  const db = createAdminClient();
  const [tasksRes, notificationsRes, submissionsRes] = await Promise.all([
    db
      .from("process_tasks")
      .select("*")
      .eq("user_id", userId)
      .eq("visibility", "customer")
      .in("task_kind", ["customer_followup", "followup"])
      .order("updated_at", { ascending: false }),
    db
      .from("notifications")
      .select("*")
      .eq("user_id", userId)
      .like("action_url", "/panel/support/forms/%")
      .order("created_at", { ascending: false })
      .limit(40),
    db
      .from("form_submissions")
      .select("id, form_code, status, created_at, updated_at")
      .eq("user_id", userId)
      .order("updated_at", { ascending: false }),
  ]);

  const tasks = tasksRes.data ?? [];
  const notifications = notificationsRes.data ?? [];
  const submissions = submissionsRes.data ?? [];

  const latestSubmissionByCode = new Map<string, SubmissionRow>();
  for (const submission of submissions) {
    if (!latestSubmissionByCode.has(submission.form_code)) {
      latestSubmissionByCode.set(submission.form_code, submission);
    }
  }

  const latestNotificationByCode = new Map<string, NotificationRow>();
  for (const notification of notifications) {
    const formCode = extractFormCodeFromNotification(notification);
    if (!formCode || latestNotificationByCode.has(formCode)) continue;
    latestNotificationByCode.set(formCode, notification);
  }

  const requestMap = new Map<string, PortalFormRequest>();

  for (const task of tasks) {
    const formCode = extractFormCodeFromTask(task);
    if (!formCode) continue;

    const notification = latestNotificationByCode.get(formCode) ?? null;
    const latestSubmission = latestSubmissionByCode.get(formCode) ?? null;
    const copy = buildRequestSummary(task, notification);
    const isResolved =
      latestSubmission &&
      new Date(latestSubmission.updated_at).getTime() >= new Date(task.updated_at).getTime();

    requestMap.set(formCode, {
      id: task.id,
      formCode,
      title: copy.title,
      summary: copy.summary,
      description: copy.description,
      status: isResolved ? formatRequestStatus(latestSubmission) : "pending",
      requestedAt: notification?.created_at ?? task.created_at,
      updatedAt: task.updated_at,
      requestedFields: notification ? extractRequestedFields(notification) : [],
      primaryAction: isResolved && latestSubmission
        ? {
            id: `${task.id}:view-submission`,
            kind: "view_submission",
            label: latestSubmission.status === "completed" ? "Gonderimi Incele" : "Durumu Gor",
            description: "Gonderdiginiz formun mevcut durumunu ve Atlas notlarini inceleyin.",
            href: `/panel/support/submissions/${latestSubmission.id}`,
            formCode,
            emphasis: "primary",
          }
        : {
            id: `${task.id}:open-form`,
            kind: "form_request",
            label: "Formu Doldur",
            description: "Atlas ekibinin istedigi bilgileri bu form ile gonderin.",
            href: `/panel/support/forms/${formCode}`,
            formCode,
            emphasis: "primary",
          },
      secondaryAction: {
        id: `${task.id}:open-services`,
        kind: "open_process",
        label: "Surec Takibini Ac",
        description: "Bu istegin onboarding icindeki yerini ve sonraki adimlari gorun.",
        href: "/panel/process",
        formCode,
        emphasis: "secondary",
      },
      latestSubmission: latestSubmission
        ? {
            id: latestSubmission.id,
            status: latestSubmission.status,
            updatedAt: latestSubmission.updated_at,
          }
        : null,
    });
  }

  for (const notification of notifications) {
    const formCode = extractFormCodeFromNotification(notification);
    if (!formCode || requestMap.has(formCode)) continue;

    const latestSubmission = latestSubmissionByCode.get(formCode) ?? null;
    requestMap.set(formCode, {
      id: notification.id,
      formCode,
      title: notification.title,
      summary: notification.title,
      description: notification.body,
      status: formatRequestStatus(latestSubmission),
      requestedAt: notification.created_at,
      updatedAt: notification.created_at,
      requestedFields: extractRequestedFields(notification),
      primaryAction: latestSubmission && ACTIVE_SUBMISSION_STATUSES.has(latestSubmission.status)
        ? {
            id: `${notification.id}:view-submission`,
            kind: "view_submission",
            label: "Durumu Gor",
            description: "Bu form icin mevcut gonderim durumunu goruntuleyin.",
            href: `/panel/support/submissions/${latestSubmission.id}`,
            formCode,
            emphasis: "primary",
          }
        : {
            id: `${notification.id}:open-form`,
            kind: "form_request",
            label: "Formu Ac",
            description: "Istenen bilgileri bu form ile Atlas ekibine iletin.",
            href: `/panel/support/forms/${formCode}`,
            formCode,
            emphasis: "primary",
          },
      secondaryAction: {
        id: `${notification.id}:open-support`,
        kind: "open_support",
        label: "Destek Merkezi",
        description: "Bu istegin gecmisini ve diger taleplerinizi goruntuleyin.",
        href: "/panel/support",
        formCode,
        emphasis: "secondary",
      },
      latestSubmission: latestSubmission
        ? {
            id: latestSubmission.id,
            status: latestSubmission.status,
            updatedAt: latestSubmission.updated_at,
          }
        : null,
    });
  }

  const assignedRequests = Array.from(requestMap.values()).sort(
    (left, right) =>
      new Date(right.requestedAt).getTime() - new Date(left.requestedAt).getTime(),
  );

  const availableFormCodes = Array.from(
    new Set([
      ...ALWAYS_AVAILABLE_FORM_CODES,
      ...assignedRequests.map((request) => request.formCode),
      ...submissions.map((submission) => submission.form_code),
    ]),
  );

  return {
    assignedRequests,
    submissionHistory: buildSubmissionHistory(submissions),
    availableFormCodes,
  };
}

export async function getAllowedPortalFormCodes(userId: string) {
  const overview = await getPortalSupportOverview(userId);
  return overview.availableFormCodes;
}
