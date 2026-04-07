import { describe, expect, it } from "vitest";
import { buildCustomerJourneyView } from "@/lib/workflows/journey";
import type {
  FormSubmissionRow,
  NotificationRow,
  ProcessTaskRow,
} from "@/lib/workflows/types";

function submission(overrides: Partial<FormSubmissionRow>): FormSubmissionRow {
  return {
    id: "sub-1",
    form_code: "ATL-102",
    user_id: "user-1",
    data: {},
    status: "approved",
    admin_notes: null,
    assigned_to: null,
    created_at: "2026-03-16T10:00:00.000Z",
    updated_at: "2026-03-16T12:00:00.000Z",
    ...overrides,
  } as FormSubmissionRow;
}

function task(overrides: Partial<ProcessTaskRow>): ProcessTaskRow {
  return {
    id: "task-1",
    user_id: "user-1",
    task_name: "EIN Basvurusu Yap (IRS SS-4)",
    task_category: "tax",
    task_status: "pending",
    sort_order: 1,
    notes: "IRS'e EIN basvurusu yapilacak",
    completed_at: null,
    created_at: "2026-03-16T10:00:00.000Z",
    updated_at: "2026-03-16T12:00:00.000Z",
    form_submission_id: "sub-1",
    visibility: "customer",
    task_kind: "milestone",
    customer_title: null,
    customer_summary: null,
    source_submission_id: "sub-1",
    ...overrides,
  } as ProcessTaskRow;
}

function notification(overrides: Partial<NotificationRow>): NotificationRow {
  return {
    id: "notif-1",
    user_id: "user-1",
    title: "Atlas basvurunuzu incelemeye aldi",
    body: "Ekibimiz bilgilerinizi dogruluyor ve operasyon planini hazirliyor.",
    type: "info",
    channel: "in_app",
    is_read: false,
    action_url: "/panel/process",
    metadata: {
      submission_id: "sub-1",
    },
    created_at: "2026-03-16T12:30:00.000Z",
    read_at: null,
    ...overrides,
  } as NotificationRow;
}

describe("buildCustomerJourneyView", () => {
  it("collapses duplicate customer tasks for the same submission", () => {
    const journey = buildCustomerJourneyView({
      submissions: [submission({})],
      tasks: [
        task({
          id: "task-rich",
          task_status: "in_progress",
          customer_summary: "Atlas bu adimi sizin adiniza yurutuyor.",
        }),
        task({
          id: "task-duplicate",
          updated_at: "2026-03-16T13:00:00.000Z",
          source_submission_id: null,
          customer_summary: null,
        }),
        task({
          id: "task-confirmation",
          task_name: "EIN Confirmation Letter Teslim Et",
          customer_title: "EIN Confirmation Letter Teslim Et",
          customer_summary: "EIN numarasi alindiktan sonra teslim edilecek",
          sort_order: 2,
        }),
      ],
      notifications: [notification({})],
      events: [],
    });

    expect(journey.totalCount).toBe(2);
    expect(journey.milestones.map((milestone) => milestone.id)).toContain("task-rich");
    expect(journey.milestones.map((milestone) => milestone.id)).not.toContain("task-duplicate");
  });

  it("suppresses standalone legacy tasks when there is an active service submission", () => {
    const journey = buildCustomerJourneyView({
      submissions: [submission({})],
      tasks: [
        task({}),
        task({
          id: "legacy-standalone",
          form_submission_id: null,
          source_submission_id: null,
          task_name: "LLC kurulus paketini baslat",
          customer_title: "LLC kurulus paketini baslat",
          task_status: "blocked",
        }),
      ],
      notifications: [notification({})],
      events: [],
    });

    expect(journey.milestones).toHaveLength(1);
    expect(journey.blockerCount).toBe(0);
  });

  it("prefers operational notifications over generic welcome messages", () => {
    const journey = buildCustomerJourneyView({
      submissions: [submission({})],
      tasks: [task({})],
      notifications: [
        notification({
          id: "welcome",
          title: "Hos geldiniz",
          body: "Genel tanisma mesaji",
          created_at: "2026-03-16T13:00:00.000Z",
          metadata: { source: "atlas_admin_copilot" },
          action_url: "/panel/reports",
        }),
        notification({}),
      ],
      events: [],
    });

    expect(journey.latestNotification?.id).toBe("notif-1");
    expect(journey.nextStepDescription).toContain("operasyon planini");
  });
});
