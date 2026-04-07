import { getFormByCode } from "@/lib/forms";
import {
  FORM_SUBMISSION_STATUS_LABELS,
  type FormSubmissionStatus,
} from "@/lib/forms/types";
import type {
  CustomerActionTarget,
  CustomerJourneyViewModel,
  CustomerMilestone,
  CustomerServiceCard,
  FormSubmissionRow,
  NotificationRow,
  ProcessTaskRow,
  WorkflowEventRow,
} from "./types";

const ACTIVE_SUBMISSION_STATUSES: FormSubmissionStatus[] = [
  "submitted",
  "under_review",
  "needs_correction",
  "approved",
];

const ACTIONABLE_TYPES = new Set(["open-form", "open-upload", "open-support"]);

function normalizeTaskKey(task: ProcessTaskRow) {
  return (task.customer_title ?? task.task_name).trim().toLowerCase();
}

function taskQualityScore(task: ProcessTaskRow) {
  let score = 0;

  if (task.source_submission_id) score += 5;
  if (task.customer_title) score += 3;
  if (task.customer_summary) score += 3;
  if (task.task_status === "in_progress") score += 2;
  if (task.task_status === "blocked") score += 1;
  if (
    task.task_kind === "milestone" ||
    task.task_kind === "followup" ||
    task.task_kind === "customer_followup" ||
    task.task_kind === "service_execution"
  ) {
    score += 1;
  }

  return score;
}

function collapseDuplicateTasks(tasks: ProcessTaskRow[]) {
  const grouped = new Map<string, ProcessTaskRow[]>();

  for (const task of tasks) {
    const key = normalizeTaskKey(task);
    const bucket = grouped.get(key) ?? [];
    bucket.push(task);
    grouped.set(key, bucket);
  }

  return Array.from(grouped.values())
    .map((bucket) =>
      [...bucket].sort((left, right) => {
        const scoreDelta = taskQualityScore(right) - taskQualityScore(left);
        if (scoreDelta !== 0) return scoreDelta;

        return (
          new Date(right.updated_at).getTime() - new Date(left.updated_at).getTime()
        );
      })[0]
    )
    .sort((left, right) => left.sort_order - right.sort_order);
}

function getNotificationMetadata(notification: NotificationRow) {
  return notification.metadata && typeof notification.metadata === "object"
    ? (notification.metadata as Record<string, unknown>)
    : null;
}

function getNotificationSubmissionId(notification: NotificationRow) {
  const metadata = getNotificationMetadata(notification);

  const submissionId = metadata?.submission_id ?? metadata?.submissionId;
  return typeof submissionId === "string" ? submissionId : null;
}

function extractFormCodeFromText(text: string | null | undefined) {
  if (!text) return null;
  const match = text.match(/ATL-\d{3}/i);
  return match?.[0]?.toUpperCase() ?? null;
}

function getNotificationFormCode(notification: NotificationRow) {
  const metadata = getNotificationMetadata(notification);
  const metadataFormCode = metadata?.formCode ?? metadata?.form_code;

  if (typeof metadataFormCode === "string") {
    return metadataFormCode.toUpperCase();
  }

  return extractFormCodeFromText(notification.action_url) ?? extractFormCodeFromText(notification.body);
}

function buildActionTargetFromHref(href: string | null): CustomerActionTarget | null {
  if (!href || !href.startsWith("/panel/")) return null;

  if (href.startsWith("/panel/support/forms/")) {
    return {
      type: "open-form",
      label: "Formu doldur",
      href,
      description: "Istenen bilgileri bu form ile Atlas'a gonderin.",
    };
  }

  if (href.startsWith("/panel/documents")) {
    return {
      type: "open-upload",
      label: "Belgeleri yukle",
      href,
      description: "Gerekli dosyalari bu ekrandan yukleyin.",
    };
  }

  if (href.startsWith("/panel/support")) {
    return {
      type: "open-support",
      label: "Destek talebi ac",
      href,
      description: "Bu konu icin Atlas ekibine destek talebi gonderin.",
    };
  }

  return {
    type: "view-status",
    label: href.startsWith("/panel/process") ? "Durumu gor" : "Gorevleri gor",
    href,
    description: "Son durumu ve onceki adimlari panelden inceleyin.",
  };
}

function notificationPriority(
  notification: NotificationRow,
  prioritySubmissionId: string | null
) {
  const title = notification.title.toLowerCase();
  if (title.includes("hoş geldin") || title.includes("hos geldin")) return -1000;

  const action = buildActionTargetFromHref(notification.action_url);
  let score = 0;

  if (action && ACTIONABLE_TYPES.has(action.type)) score += 140;
  if (notification.type === "warning") score += 35;
  if (notification.type === "success") score += 10;
  if (notification.type === "info") score += 5;
  if (prioritySubmissionId && getNotificationSubmissionId(notification) === prioritySubmissionId) {
    score += 70;
  }
  if (action?.type === "view-status") score += 20;
  if (notification.action_url?.startsWith("/panel/")) score += 10;

  return score;
}

function pickRelevantNotification(
  notifications: NotificationRow[],
  prioritySubmissionId: string | null
) {
  return [...notifications]
    .sort((left, right) => {
      const scoreDelta =
        notificationPriority(right, prioritySubmissionId) -
        notificationPriority(left, prioritySubmissionId);

      if (scoreDelta !== 0) return scoreDelta;

      return (
        new Date(right.created_at).getTime() - new Date(left.created_at).getTime()
      );
    })[0] ?? null;
}

function getVisibleSubmissions(submissions: FormSubmissionRow[]) {
  const groups = new Map<string, FormSubmissionRow[]>();

  for (const submission of submissions) {
    const bucket = groups.get(submission.form_code) ?? [];
    bucket.push(submission);
    groups.set(submission.form_code, bucket);
  }

  return Array.from(groups.values())
    .map((group) => {
      const sorted = [...group].sort(
        (left, right) =>
          new Date(right.updated_at).getTime() - new Date(left.updated_at).getTime()
      );

      return (
        sorted.find((submission) =>
          ACTIVE_SUBMISSION_STATUSES.includes(submission.status as FormSubmissionStatus)
        ) ?? sorted[0]
      );
    })
    .sort(
      (left, right) =>
        new Date(right.updated_at).getTime() - new Date(left.updated_at).getTime()
    );
}

type SubmissionCopy = {
  title: string;
  summary: string;
  status: CustomerMilestone["status"];
  atlasAction: string;
  customerAction: string;
  documents: string[];
  nextStepLabel: string;
};

function buildFallbackCopy(submission: FormSubmissionRow): SubmissionCopy {
  const form = getFormByCode(submission.form_code);
  const serviceTitle = form?.title ?? submission.form_code;

  switch (submission.status as FormSubmissionStatus) {
    case "submitted":
      /* i18n-exempt */
      return {
        title: "Talebiniz alındı",
        summary: `${serviceTitle} talebiniz kaydedildi ve Atlas sırasına eklendi.`,
        status: "pending",
        atlasAction: "Atlas ekibi formu ön kontrol ve kapsam doğrulamasına alıyor.",
        customerAction:
          "Şu an sizden ek bir aksiyon beklenmiyor. Gerekirse panel bildirimi gelecektir.",
        documents: ["Başvuru özeti", "Ek bilgi talebi çıkarsa panel bildirimi"],
        nextStepLabel: "Talebin incelenmesini bekleyin",
      };
    case "under_review":
      return {
        title: "Atlas inceliyor",
        summary: `${serviceTitle} için verdiğiniz bilgiler Atlas ekibi tarafından inceleniyor.`,
        status: "in_progress",
        atlasAction:
          "Ekibimiz form alanlarını, belge ihtiyaçlarını ve operasyon kapsamını kontrol ediyor.",
        customerAction: "Panel bildirimlerini takip edin. Gerekirse ek bilgi isteyeceğiz.",
        documents: ["Form yanıtları", "Varsa admin notları"],
        nextStepLabel: "İnceleme sonucunu bekleyin",
      };
    case "needs_correction":
      return {
        title: "Ek bilgi gerekiyor",
        summary: `${serviceTitle} için ek bilgi veya düzeltme gerekiyor.`,
        status: "blocked",
        atlasAction:
          "Eksik veya uyumsuz alanları işaretledik ve size geri bildirim hazırladık.",
        customerAction:
          "Aşağıdaki aksiyonu açıp istenen bilgi veya düzeltmeyi panelden gönderin.",
        documents: ["Admin notları", "Güncellenmesi gereken alanlar"],
        nextStepLabel: "Eksik bilgiyi gönderin",
      };
    case "approved":
      /* i18n-exempt */
      return {
        title: "Atlas sizin için çalışıyor",
        summary: `${serviceTitle} artık aktif operasyon akışında ilerliyor.`,
        status: "in_progress",
        atlasAction: "Atlas ekibi gerekli iç operasyon adımlarını sizin adınıza yürütüyor.",
        customerAction:
          "Sizden yeni bir bilgi gerekirse burada net bir görev ve bildirim göreceksiniz.",
        documents: ["Operasyon özeti", "Hazırlık notları"],
        nextStepLabel: "Durumu takip edin",
      };
    case "completed":
      /* i18n-exempt */
      return {
        title: "Hizmet tamamlandı",
        summary: `${serviceTitle} hizmeti tamamlandı ve son durum panelinize yansıtıldı.`,
        status: "completed",
        atlasAction: "Teslim kayıtları ve son notlar sisteme işlenmiş durumda.",
        customerAction: "Tamamlanan kaydı ve son notları inceleyebilirsiniz.",
        documents: ["Teslim notları", "Tamamlanma özeti"],
        nextStepLabel: "Tamamlanan kaydı inceleyin",
      };
    case "rejected":
      return {
        title: "Basvuru kapatildi",
        summary: `${serviceTitle} basvurusu ilerletilmedi veya kapatildi.`,
        status: "blocked",
        atlasAction: "Basvuruya ait kapanis notu sisteme eklendi.",
        customerAction:
          "Gerekirse destek talebi acabilir veya yeni bir basvuru baslatabilirsiniz.",
        documents: ["Kapanis notlari"],
        nextStepLabel: "Detaylari gor",
      };
    default:
      return {
        title:
          FORM_SUBMISSION_STATUS_LABELS[submission.status as FormSubmissionStatus] ??
          "Durum guncelleniyor",
        summary: `${serviceTitle} icin son durum panelinize yansitiliyor.`,
        status: "pending",
        atlasAction: "Atlas ekibi kaydi isliyor.",
        customerAction: "Paneldeki son durum kartini takip edin.",
        documents: [],
        nextStepLabel: "Durumu izle",
      };
  }
}

function buildHistory(events: WorkflowEventRow[]) {
  return events.map((event) => ({
    id: event.id,
    title:
      event.title ??
      (event.payload &&
      typeof event.payload === "object" &&
      typeof (event.payload as Record<string, unknown>).title === "string"
        ? ((event.payload as Record<string, unknown>).title as string)
        : event.event_type),
    description:
      event.description ??
      (event.payload &&
      typeof event.payload === "object" &&
      typeof (event.payload as Record<string, unknown>).description === "string"
        ? ((event.payload as Record<string, unknown>).description as string)
        : ""),
    createdAt: event.created_at,
    actorType: event.actor_type,
  }));
}

function buildDefaultPrimaryAction(input: {
  submission: FormSubmissionRow | null;
  task: ProcessTaskRow;
  formCode: string | null;
}) {
  const { submission, task, formCode } = input;
  const status = submission?.status as FormSubmissionStatus | undefined;
  const canOpenFollowupForm =
    Boolean(formCode) &&
    !submission &&
    (task.task_kind === "customer_followup" || task.task_kind === "followup");

  if (canOpenFollowupForm && formCode) {
    return {
      type: "open-form" as const,
      label: "Formu doldur",
      href: `/panel/support/forms/${formCode}`,
      description: "Eksik bilgileri bu form ile gonderin.",
    };
  }

  if (task.task_status === "blocked" || status === "needs_correction") {
    return {
      type: "view-status" as const,
      label: "Gorevi ac",
      href: "/panel/services",
      description: "Eksik bilgi notlarini ve sonraki adimi acin.",
    };
  }

  if (task.task_status === "completed" || status === "completed") {
    return {
      type: "view-status" as const,
      label: "Tamamlananlari gor",
      href: "/panel/services",
      description: "Tamamlanan kayitlari panelden inceleyin.",
    };
  }

  return {
    type: "view-status" as const,
    label: "Durumu gor",
    href: "/panel/process",
    description: "Atlas'in su anda ne yaptigini panelden takip edin.",
  };
}

function buildSecondaryAction(primaryAction: CustomerActionTarget | null) {
  if (!primaryAction) return null;

  if (ACTIONABLE_TYPES.has(primaryAction.type)) {
    return {
      type: "view-status" as const,
      label: "Sureci gor",
      href: "/panel/process",
      description: "Bu gorevin Atlas akisindaki yerini gorun.",
    };
  }

  if (primaryAction.href !== "/panel/services") {
    return {
      type: "view-status" as const,
      label: "Tum gorevleri gor",
      href: "/panel/services",
      description: "Tum acik gorev ve hizmet kartlarini ayni yerde gorun.",
    };
  }

  return null;
}

function deriveMilestoneActions(input: {
  task: ProcessTaskRow;
  submission: FormSubmissionRow | null;
  notifications: NotificationRow[];
  fallback: SubmissionCopy | null;
}) {
  const { task, submission, notifications, fallback } = input;
  const derivedFormCode =
    submission?.form_code ??
    extractFormCodeFromText(task.notes) ??
    extractFormCodeFromText(task.customer_summary) ??
    null;
  const derivedForm = derivedFormCode ? getFormByCode(derivedFormCode) : null;

  const actionNotification = [...notifications]
    .sort(
      (left, right) =>
        new Date(right.created_at).getTime() - new Date(left.created_at).getTime()
    )
    .find((notification) => {
      const action = buildActionTargetFromHref(notification.action_url);
      if (!action) return false;

      if (submission && getNotificationSubmissionId(notification) === submission.id) {
        return true;
      }

      const notificationFormCode = getNotificationFormCode(notification);
      if (derivedFormCode && notificationFormCode === derivedFormCode) {
        return true;
      }

      return !submission && ACTIONABLE_TYPES.has(action.type);
    });

  const primaryAction =
    buildActionTargetFromHref(actionNotification?.action_url ?? null) ??
    buildDefaultPrimaryAction({
      submission,
      task,
      formCode: derivedFormCode,
    });

  const estimatedMinutes = derivedForm?.estimatedMinutes ?? null;
  const whyNeeded =
    actionNotification?.body ??
    task.customer_summary ??
    fallback?.summary ??
    derivedForm?.description ??
    null;

  let customerActionText = fallback?.customerAction ?? "Atlas sizin icin bu adimi takip ediyor.";

  if (primaryAction.type === "open-form") {
    customerActionText = estimatedMinutes
      ? `Asagidaki dugmeyle formu acip bilgileri gonderin. Bu islem yaklasik ${estimatedMinutes} dakika surer.`
      : "Asagidaki dugmeyle formu acip istenen bilgileri gonderin.";
  } else if (primaryAction.type === "open-upload") {
    customerActionText = "Asagidaki dugmeyle gerekli belgeleri yukleyin.";
  } else if (primaryAction.type === "open-support") {
    customerActionText = "Asagidaki dugmeyle destek talebi acarak Atlas ekibine yazin.";
  } else if (primaryAction.type === "view-status" && task.task_status === "completed") {
    customerActionText = "Bu adim tamamlandi. Dilerseniz detaylari ayni ekrandan gorebilirsiniz.";
  } else if (primaryAction.type === "view-status" && task.task_status === "blocked") {
    customerActionText =
      "Asagidaki dugmeyle gorevi acip Atlas'in sizden ne bekledigini tek ekranda gorun.";
  }

  return {
    estimatedMinutes,
    whyNeeded,
    primaryAction,
    secondaryAction: buildSecondaryAction(primaryAction),
    customerActionText,
  };
}

function buildMilestoneFromTask(input: {
  task: ProcessTaskRow;
  submission: FormSubmissionRow | null;
  history: WorkflowEventRow[];
  notifications: NotificationRow[];
}): CustomerMilestone {
  const { task, submission, history, notifications } = input;
  const serviceTitle = submission
    ? getFormByCode(submission.form_code)?.title ?? submission.form_code
    : "Atlas hizmeti";
  const fallback = submission ? buildFallbackCopy(submission) : null;
  const actions = deriveMilestoneActions({
    task,
    submission,
    notifications,
    fallback,
  });

  return {
    id: task.id,
    submissionId: task.source_submission_id ?? task.form_submission_id,
    formCode: submission?.form_code ?? extractFormCodeFromText(task.notes) ?? null,
    serviceTitle,
    title: task.customer_title ?? task.task_name,
    summary:
      task.customer_summary ??
      task.notes ??
      fallback?.summary ??
      "Atlas bu hizmeti sizin icin ilerletiyor.",
    status:
      task.task_status === "completed"
        ? "completed"
        : task.task_status === "in_progress"
          ? "in_progress"
          : task.task_status === "blocked"
            ? "blocked"
            : "pending",
    category: task.task_category,
    createdAt: task.created_at,
    updatedAt: task.updated_at,
    estimatedMinutes: actions.estimatedMinutes,
    whyNeeded: actions.whyNeeded,
    primaryAction: actions.primaryAction,
    secondaryAction: actions.secondaryAction,
    tabSummary: {
      status: fallback?.summary ?? "Servis durumu Atlas tarafinda guncelleniyor.",
      atlasAction:
        fallback?.atlasAction ??
        "Atlas ekibi operasyonun sonraki adimini sizin adiniza yurutuyor.",
      customerAction: actions.customerActionText,
      documents: fallback?.documents ?? [],
      history: buildHistory(history),
    },
  };
}

function buildFallbackMilestone(input: {
  submission: FormSubmissionRow;
  history: WorkflowEventRow[];
  notifications: NotificationRow[];
}): CustomerMilestone {
  const { submission, history, notifications } = input;
  const copy = buildFallbackCopy(submission);
  const serviceTitle = getFormByCode(submission.form_code)?.title ?? submission.form_code;
  const actionNotification = notifications.find(
    (notification) => getNotificationSubmissionId(notification) === submission.id
  );
  const primaryAction =
    buildActionTargetFromHref(actionNotification?.action_url ?? null) ??
    ({
      type: "view-status" as const,
      label:
        submission.status === "completed" ? "Tamamlananlari gor" : "Durumu gor",
      href:
        submission.status === "completed" ? "/panel/services" : "/panel/process",
      description:
        submission.status === "completed"
          ? "Tamamlanan kaydi ve son notlari acin."
          : "Atlas'in su an ne yaptigini panelden takip edin.",
    } satisfies CustomerActionTarget);

  return {
    id: `fallback-${submission.id}`,
    submissionId: submission.id,
    formCode: submission.form_code,
    serviceTitle,
    title: copy.title,
    summary: copy.summary,
    status: copy.status,
    category: null,
    createdAt: submission.created_at,
    updatedAt: submission.updated_at,
    estimatedMinutes: getFormByCode(submission.form_code)?.estimatedMinutes ?? null,
    whyNeeded: actionNotification?.body ?? copy.summary,
    primaryAction,
    secondaryAction: buildSecondaryAction(primaryAction),
    tabSummary: {
      status: copy.summary,
      atlasAction: copy.atlasAction,
      customerAction:
        primaryAction.type === "view-status"
          ? "Asagidaki dugmeyle son durumu ve onceki adimlari acabilirsiniz."
          : copy.customerAction,
      documents: copy.documents,
      history: buildHistory(history),
    },
  };
}

function milestonePriority(milestone: CustomerMilestone) {
  let score = 0;

  if (milestone.status === "blocked") score += 100;
  if (milestone.primaryAction && ACTIONABLE_TYPES.has(milestone.primaryAction.type)) score += 60;
  if (milestone.status === "in_progress") score += 30;
  if (milestone.status === "pending") score += 20;
  if (milestone.status === "completed") score -= 20;

  return score;
}

function serviceCardStateGroup(
  status: FormSubmissionStatus,
  linkedMilestones: CustomerMilestone[]
): CustomerServiceCard["stateGroup"] {
  if (
    status === "needs_correction" ||
    linkedMilestones.some(
      (milestone) =>
        milestone.status === "blocked" &&
        milestone.primaryAction &&
        ACTIONABLE_TYPES.has(milestone.primaryAction.type)
    )
  ) {
    return "action_required";
  }

  if (status === "completed") return "completed";

  return "atlas_working";
}

export function buildCustomerJourneyView(input: {
  submissions: FormSubmissionRow[];
  tasks: ProcessTaskRow[];
  notifications: NotificationRow[];
  events?: WorkflowEventRow[];
}): CustomerJourneyViewModel {
  const submissions = [...input.submissions].sort(
    (left, right) =>
      new Date(right.updated_at).getTime() - new Date(left.updated_at).getTime()
  );
  const customerTasks = input.tasks
    .filter((task) => task.visibility !== "admin_internal")
    .sort((left, right) => left.sort_order - right.sort_order);
  const events = input.events ?? [];
  const notifications = [...input.notifications].sort(
    (left, right) =>
      new Date(right.created_at).getTime() - new Date(left.created_at).getTime()
  );
  const visibleSubmissions = getVisibleSubmissions(submissions);

  const tasksBySubmission = new Map<string, ProcessTaskRow[]>();
  for (const task of customerTasks) {
    const submissionId = task.source_submission_id ?? task.form_submission_id;
    if (!submissionId) continue;
    const bucket = tasksBySubmission.get(submissionId) ?? [];
    bucket.push(task);
    tasksBySubmission.set(submissionId, bucket);
  }

  const eventsBySubmission = new Map<string, WorkflowEventRow[]>();
  for (const event of events) {
    if (!event.submission_id) continue;
    const bucket = eventsBySubmission.get(event.submission_id) ?? [];
    bucket.push(event);
    eventsBySubmission.set(event.submission_id, bucket);
  }

  const milestonesFromSubmissions: CustomerMilestone[] = visibleSubmissions.flatMap(
    (submission) => {
      const submissionTasks = collapseDuplicateTasks(
        tasksBySubmission.get(submission.id) ?? []
      );
      const history = (eventsBySubmission.get(submission.id) ?? []).sort(
        (left, right) =>
          new Date(right.created_at).getTime() - new Date(left.created_at).getTime()
      );
      const submissionNotifications = notifications.filter(
        (notification) => getNotificationSubmissionId(notification) === submission.id
      );

      if (submissionTasks.length > 0) {
        return submissionTasks.map((task) =>
          buildMilestoneFromTask({
            task,
            submission,
            history,
            notifications: submissionNotifications,
          })
        );
      }

      return [
        buildFallbackMilestone({
          submission,
          history,
          notifications: submissionNotifications,
        }),
      ];
    }
  );

  const standaloneMilestones = collapseDuplicateTasks(
    customerTasks.filter((task) => {
      const hasLinkedSubmission = Boolean(task.source_submission_id ?? task.form_submission_id);
      if (hasLinkedSubmission) return false;

      if (visibleSubmissions.length === 0) return true;

      return (
        (task.task_kind === "followup" || task.task_kind === "customer_followup") &&
        Boolean(task.customer_title ?? task.customer_summary)
      );
    })
  ).map((task) =>
    buildMilestoneFromTask({
      task,
      submission: null,
      history: [],
      notifications,
    })
  );

  const milestones: CustomerMilestone[] = [
    ...milestonesFromSubmissions,
    ...standaloneMilestones,
  ].sort((left, right) => {
    const scoreDelta = milestonePriority(right) - milestonePriority(left);
    if (scoreDelta !== 0) return scoreDelta;

    return (
      new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime()
    );
  });

  const completedCount = milestones.filter(
    (milestone) => milestone.status === "completed"
  ).length;
  const blockerCount = milestones.filter(
    (milestone) => milestone.status === "blocked"
  ).length;
  const totalCount = milestones.length;
  const progressPct =
    totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  const priorityService =
    visibleSubmissions.find((submission) =>
      ACTIVE_SUBMISSION_STATUSES.includes(submission.status as FormSubmissionStatus)
    ) ??
    visibleSubmissions[0] ??
    null;

  const priorityMilestone =
    milestones.find(
      (milestone) =>
        milestone.primaryAction && ACTIONABLE_TYPES.has(milestone.primaryAction.type)
    ) ??
    milestones.find((milestone) => milestone.status === "blocked") ??
    milestones.find((milestone) =>
      priorityService ? milestone.submissionId === priorityService.id : milestone.status !== "completed"
    ) ??
    milestones[0] ??
    null;

  const latestNotificationRow = pickRelevantNotification(
    notifications,
    priorityService?.id ?? null
  );

  const latestNotification = latestNotificationRow
    ? {
        id: latestNotificationRow.id,
        title: latestNotificationRow.title,
        body: latestNotificationRow.body,
        createdAt: latestNotificationRow.created_at,
        actionUrl: latestNotificationRow.action_url,
      }
    : null;

  const serviceCards: CustomerServiceCard[] = visibleSubmissions.map((submission) => {
    const form = getFormByCode(submission.form_code);
    const fallbackCopy = buildFallbackCopy(submission);
    const linkedMilestones = milestones.filter(
      (milestone) => milestone.submissionId === submission.id
    );
    const cardCompleted = linkedMilestones.filter(
      (milestone) => milestone.status === "completed"
    ).length;
    const cardPct =
      linkedMilestones.length > 0
        ? Math.round((cardCompleted / linkedMilestones.length) * 100)
        : fallbackCopy.status === "completed"
          ? 100
          : fallbackCopy.status === "blocked"
            ? 0
            : 35;

    const leadMilestone =
      linkedMilestones.find(
        (milestone) =>
          milestone.primaryAction && ACTIONABLE_TYPES.has(milestone.primaryAction.type)
      ) ??
      linkedMilestones.find((milestone) => milestone.status === "blocked") ??
      linkedMilestones[0] ??
      null;

    return {
      submissionId: submission.id,
      formCode: submission.form_code,
      title: form?.title ?? submission.form_code,
      description: leadMilestone?.summary ?? fallbackCopy.summary,
      status: submission.status as FormSubmissionStatus,
      statusLabel:
        FORM_SUBMISSION_STATUS_LABELS[submission.status as FormSubmissionStatus] ??
        submission.status,
      progressPct: cardPct,
      milestoneCount: linkedMilestones.length,
      nextStepLabel:
        leadMilestone?.primaryAction?.label ??
        leadMilestone?.tabSummary.customerAction ??
        fallbackCopy.nextStepLabel,
      updatedAt: submission.updated_at,
      stateGroup: serviceCardStateGroup(
        submission.status as FormSubmissionStatus,
        linkedMilestones
      ),
      primaryAction:
        leadMilestone?.primaryAction ??
        ({
          type: "view-status" as const,
          label:
            submission.status === "completed"
              ? "Tamamlananlari gor"
              : "Durumu gor",
          href:
            submission.status === "completed"
              ? "/panel/services"
              : "/panel/process",
          description:
            submission.status === "completed"
              ? "Tamamlanan kaydi ve son notlari acin."
              : "Atlas'in bu hizmette ne yaptigini acin.",
        } satisfies CustomerActionTarget),
      secondaryAction:
        leadMilestone?.secondaryAction ??
        ({
          type: "view-status" as const,
          label: "Gorevleri gor",
          href: "/panel/services",
          description: "Tum gorev ve hizmet kartlarini ayni yerde acin.",
        } satisfies CustomerActionTarget),
    };
  });

  const headline = priorityMilestone
    ? priorityMilestone.title
    : visibleSubmissions.length > 0
      ? "Atlas hizmetiniz isleniyor"
      : "Atlas panelinize hos geldiniz";

  const summary = priorityMilestone
    ? priorityMilestone.summary
    : "Baslattiginiz hizmetler burada Atlas ekibinin guncel durumu ile gorunur.";

  const nextStepLabel =
    priorityMilestone?.primaryAction?.label ??
    priorityMilestone?.tabSummary.customerAction ??
    (visibleSubmissions.length > 0
      ? "Gorevlerinizi panelden takip edin."
      : "Yeni bir hizmet baslatmak icin form gonderin.");

  const nextStepDescription =
    priorityMilestone?.whyNeeded ??
    latestNotification?.body ??
    summary;

  return {
    headline,
    summary,
    progressPct,
    completedCount,
    totalCount,
    blockerCount,
    nextStepLabel,
    nextStepDescription,
    latestNotification,
    primaryAction:
      priorityMilestone?.primaryAction ??
      buildActionTargetFromHref(latestNotification?.actionUrl ?? null),
    milestones,
    serviceCards,
  };
}
