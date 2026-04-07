import { getAllowedPortalFormCodes, getPortalSupportOverview } from "@/lib/customer-portal";
import { getFormByCode } from "@/lib/forms";
import {
  DEFAULT_LOCALE,
  formatCurrencyByLocale,
  formatDateByLocale,
  translate,
  type Locale,
} from "@/i18n";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  getBillingCatalogSections,
  getMarketplaceChannelOfferings,
  getPlanTierDefinition,
  getStoreMarketplaceOfferByKey,
  isMarketplaceChannelKey,
  type MarketplaceChannelKey,
  type PlanTier,
  type StoreOfferCategory,
} from "@/lib/payments";
import { buildCustomerJourneyView } from "@/lib/workflows/journey";
import type { Tables } from "@/types/database";
import {
  createCustomerSupportThread,
  listCustomerDeliverablesByUser,
  listCustomerRequestThreadsByUser,
} from "./store";
import { getCustomerActionLabels, getCustomerModuleBlueprint } from "./blueprint";
import type {
  CustomerDashboardPanel,
  CustomerDashboardPanelMetric,
  CustomerHubActionItem,
  CustomerHubDocumentItem,
  CustomerHubFormItem,
  CustomerHubHistoryItem,
  CustomerLaunchPhase,
  CustomerLockedModuleAction,
  CustomerLockedModuleState,
  CustomerModuleAccess,
  CustomerModuleKey,
  CustomerPaymentState,
  CustomerRequestsHubViewModel,
  CustomerSelectedMarketplace,
  CustomerSecondaryMetric,
  CustomerServiceCatalogItem,
  CustomerRequestThread,
  CustomerWorkspaceViewModel,
  CustomerWorkstreamKey,
  CustomerWorkstreamStatus,
  CustomerWorkstreamViewModel,
  HubCardDescriptor,
  LaunchJourneyStage,
  PerformanceSnapshot,
} from "./types";

type AdminClient = ReturnType<typeof createAdminClient>;

function adminDb() {
  return createAdminClient() as AdminClient;
}

async function resolveLocale(locale?: Locale): Promise<Locale> {
  return locale ?? DEFAULT_LOCALE;
}

type WorkspaceBundle = {
  user: Tables<"users"> | null;
  companies: Tables<"customer_companies">[];
  subscriptions: Tables<"user_subscriptions">[];
  invoices: Tables<"invoices">[];
  products: Tables<"products">[];
  orders: Tables<"orders">[];
  tasks: Tables<"process_tasks">[];
  submissions: Tables<"form_submissions">[];
  notifications: Tables<"notifications">[];
  events: Tables<"workflow_events">[];
  marketplaces: Array<Record<string, unknown>>;
  socials: Array<Record<string, unknown>>;
  campaigns: Array<Record<string, unknown>>;
  supportOverview: Awaited<ReturnType<typeof getPortalSupportOverview>>;
  deliverables: Awaited<ReturnType<typeof listCustomerDeliverablesByUser>>;
  requestThreads: CustomerRequestThread[];
  allowedFormCodes: string[];
};

type AtlasTaskMeta = {
  __atlasTaskMeta?: boolean;
  customerTitle?: string;
  customerSummary?: string;
  text?: string;
};

type WorkstreamMeta = {
  title: string;
  shortLabel: string;
  description: string;
  observerMode: "workstream" | "executive" | "locked";
  detailHref: string;
  adminAction: string;
  customerAction: string;
};

const WORKSTREAM_META: Record<CustomerWorkstreamKey, Pick<WorkstreamMeta, "observerMode" | "detailHref">> = {
  company_setup: {
    observerMode: "workstream",
    detailHref: "/panel/companies",
  },
  catalog_intake: {
    observerMode: "workstream",
    detailHref: "/panel/products",
  },
  website: {
    observerMode: "workstream",
    detailHref: "/panel/website",
  },
  marketplaces: {
    observerMode: "workstream",
    detailHref: "/panel/marketplaces",
  },
  ads: {
    observerMode: "workstream",
    detailHref: "/panel/advertising",
  },
  social: {
    observerMode: "workstream",
    detailHref: "/panel/social-media",
  },
  seo: {
    observerMode: "executive",
    detailHref: "/panel/performance",
  },
  fulfillment: {
    observerMode: "workstream",
    detailHref: "/panel/warehouse",
  },
};

const STAGES: Array<{
  key: LaunchJourneyStage["key"];
  workstreamKeys: CustomerWorkstreamKey[];
  requiredInputKeys: string[];
}> = [
  {
    key: "onboarding_company_setup",
    workstreamKeys: ["company_setup"],
    requiredInputKeys: ["companyDetails", "officialDocuments"],
  },
  {
    key: "catalog_intake",
    workstreamKeys: ["catalog_intake", "fulfillment"],
    requiredInputKeys: ["productList", "productFiles", "shipmentDetails"],
  },
  {
    key: "brand_asset_readiness",
    workstreamKeys: ["website", "social"],
    requiredInputKeys: ["logo", "visualAssets", "brandDirection"],
  },
  {
    key: "channel_setup",
    workstreamKeys: ["marketplaces", "ads", "seo"],
    requiredInputKeys: ["channelAccess", "publishingApproval"],
  },
  {
    key: "go_live",
    workstreamKeys: ["marketplaces", "website", "ads", "fulfillment"],
    requiredInputKeys: ["finalGoLiveApproval"],
  },
  {
    key: "first_sale",
    workstreamKeys: ["marketplaces", "ads", "social", "fulfillment"],
    requiredInputKeys: ["noExtraCustomerInputRequired"],
  },
];

function localizeWorkstreamMeta(locale: Locale, key: CustomerWorkstreamKey) {
  const base = WORKSTREAM_META[key];
  const prefix = `workspace.workstreams.${key}`;
  return {
    ...base,
    title: translate(locale, `${prefix}.title`),
    shortLabel: translate(locale, `${prefix}.shortLabel`),
    description: translate(locale, `${prefix}.description`),
    adminAction: translate(locale, `${prefix}.adminAction`),
    customerAction: translate(locale, `${prefix}.customerAction`),
  };
}

export function getCustomerWorkstreamMeta(locale: Locale, key: CustomerWorkstreamKey) {
  return localizeWorkstreamMeta(locale, key);
}

function localizeStage(locale: Locale, stage: (typeof STAGES)[number]) {
  const prefix = `workspace.stages.${stage.key}`;
  return {
    key: stage.key,
    workstreamKeys: stage.workstreamKeys,
    title: translate(locale, `${prefix}.title`),
    expectedDeliverable: translate(locale, `${prefix}.expectedDeliverable`),
    requiredInputs: stage.requiredInputKeys.map((inputKey) =>
      translate(locale, `${prefix}.requiredInputs.${inputKey}`),
    ),
  };
}

function localizeWorkstreamStatus(locale: Locale, status: CustomerWorkstreamStatus) {
  return translate(locale, `workspace.statuses.${status}`);
}

function formatCurrency(locale: Locale, value: number) {
  return formatCurrencyByLocale(locale, value);
}

function formatWorkspaceDate(locale: Locale, value: string) {
  return formatDateByLocale(locale, value, {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function safeDelta(current: number, previous: number) {
  if (previous <= 0) return current > 0 ? 100 : null;
  return Math.round(((current - previous) / previous) * 100);
}

function mapFormToWorkstream(formCode: string, category?: string | null): CustomerWorkstreamKey {
  if (formCode.startsWith("ATL-1")) return "company_setup";
  if (formCode.startsWith("ATL-2")) return "fulfillment";
  if (formCode.startsWith("ATL-4")) return formCode === "ATL-402" ? "seo" : "ads";
  if (formCode.startsWith("ATL-5")) return "social";
  if (formCode.startsWith("ATL-6")) return "website";
  if (formCode === "ATL-705") return "company_setup";
  if (category === "shipping-fulfillment") return "fulfillment";
  if (category === "branding-design") return "website";
  if (category === "social-media") return "social";
  if (category === "marketing-advertising") return "ads";
  return "catalog_intake";
}

function aggregateStatus(statuses: CustomerWorkstreamStatus[]): CustomerWorkstreamStatus {
  if (statuses.includes("blocked")) return "blocked";
  if (statuses.includes("in_progress")) return "in_progress";
  if (statuses.includes("ready")) return "ready";
  if (statuses.length > 0 && statuses.every((status) => status === "completed")) return "completed";
  return "pending";
}

function parseAtlasTaskMeta(notes: string | null) {
  if (!notes || !notes.trim().startsWith("{")) {
    return null;
  }

  try {
    const parsed = JSON.parse(notes) as AtlasTaskMeta;
    return parsed.__atlasTaskMeta ? parsed : null;
  } catch {
    return null;
  }
}

function normalizeOptionalText(value: string | null | undefined) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

function groupCustomerSubmissions(submissions: Tables<"form_submissions">[]) {
  const latestByCode = new Map<string, { latest: Tables<"form_submissions">; count: number }>();

  for (const submission of submissions) {
    const existing = latestByCode.get(submission.form_code);
    if (!existing) {
      latestByCode.set(submission.form_code, {
        latest: submission,
        count: 1,
      });
      continue;
    }

    existing.count += 1;
    if (new Date(submission.updated_at).getTime() > new Date(existing.latest.updated_at).getTime()) {
      existing.latest = submission;
    }
  }

  return Array.from(latestByCode.values()).sort(
    (left, right) => new Date(right.latest.updated_at).getTime() - new Date(left.latest.updated_at).getTime(),
  );
}

export function getCustomerVisibleProcessTasks(tasks: Tables<"process_tasks">[]) {
  const dedupedTasks = new Map<string, Tables<"process_tasks">>();

  for (const task of tasks) {
    if (task.visibility !== "customer") {
      continue;
    }

      const meta = parseAtlasTaskMeta(task.notes);
      const customerTitle = normalizeOptionalText(task.customer_title) ?? normalizeOptionalText(meta?.customerTitle);
      const customerSummary =
        normalizeOptionalText(task.customer_summary)
        ?? normalizeOptionalText(meta?.customerSummary)
        ?? normalizeOptionalText(meta?.text);

      const hasStructuredCustomerContext = Boolean(
        task.form_submission_id
        || task.source_submission_id
        || customerTitle
        || customerSummary
        || meta,
      );

      if (!hasStructuredCustomerContext) {
        continue;
      }

      const normalizedTask = {
        ...task,
        task_name: customerTitle ?? task.task_name,
        notes: customerSummary ?? (meta ? null : task.notes),
      };
      const signature = [
        normalizedTask.task_name,
        normalizedTask.task_status,
        normalizedTask.notes ?? "",
        normalizedTask.task_category ?? "",
        normalizedTask.task_kind ?? "",
      ].join("::");
      const existing = dedupedTasks.get(signature);

      if (!existing || new Date(normalizedTask.updated_at).getTime() > new Date(existing.updated_at).getTime()) {
        dedupedTasks.set(signature, normalizedTask);
      }
    }

  return Array.from(dedupedTasks.values()).sort((left, right) => {
    const sortDelta = Number(left.sort_order ?? 0) - Number(right.sort_order ?? 0);
    if (sortDelta !== 0) {
      return sortDelta;
    }

    return new Date(right.updated_at).getTime() - new Date(left.updated_at).getTime();
  });
}

async function getWorkspaceBundle(userId: string): Promise<WorkspaceBundle> {
  const db = adminDb();
  const [
    userRes,
    companiesRes,
    subscriptionsRes,
    invoicesRes,
    productsRes,
    ordersRes,
    tasksRes,
    submissionsRes,
    notificationsRes,
    eventsRes,
    marketplacesRes,
    socialsRes,
    campaignsRes,
    supportOverview,
    deliverables,
    requestThreads,
    allowedFormCodes,
  ] = await Promise.all([
    db.from("users").select("*").eq("id", userId).maybeSingle(),
    db.from("customer_companies").select("*").eq("user_id", userId).order("created_at", { ascending: false }),
    db.from("user_subscriptions").select("*").eq("user_id", userId).order("started_at", { ascending: false }),
    db.from("invoices").select("*").eq("user_id", userId).order("created_at", { ascending: false }),
    db.from("products").select("*").eq("owner_id", userId).order("created_at", { ascending: false }),
    db.from("orders").select("*").eq("user_id", userId).order("created_at", { ascending: false }),
    db.from("process_tasks").select("*").eq("user_id", userId).order("sort_order", { ascending: true }),
    db.from("form_submissions").select("*").eq("user_id", userId).order("created_at", { ascending: false }),
    db.from("notifications").select("*").eq("user_id", userId).order("created_at", { ascending: false }).limit(30),
    db.from("workflow_events").select("*").eq("user_id", userId).order("created_at", { ascending: false }).limit(60),
    db.from("marketplace_accounts").select("*").eq("user_id", userId).order("created_at", { ascending: false }),
    db.from("social_media_accounts").select("*").eq("user_id", userId).order("created_at", { ascending: false }),
    db.from("ad_campaigns").select("*").eq("user_id", userId).order("updated_at", { ascending: false }),
    getPortalSupportOverview(userId),
    listCustomerDeliverablesByUser(userId),
    listCustomerRequestThreadsByUser(userId),
    getAllowedPortalFormCodes(userId),
  ]);

  return {
    user: userRes.data ?? null,
    companies: companiesRes.data ?? [],
    subscriptions: subscriptionsRes.data ?? [],
    invoices: invoicesRes.data ?? [],
    products: productsRes.data ?? [],
    orders: ordersRes.data ?? [],
    tasks: tasksRes.data ?? [],
    submissions: submissionsRes.data ?? [],
    notifications: notificationsRes.data ?? [],
    events: eventsRes.data ?? [],
    marketplaces: (marketplacesRes.data ?? []) as Array<Record<string, unknown>>,
    socials: (socialsRes.data ?? []) as Array<Record<string, unknown>>,
    campaigns: (campaignsRes.data ?? []) as Array<Record<string, unknown>>,
    supportOverview,
    deliverables,
    requestThreads,
    allowedFormCodes,
  };
}

function buildPerformance(bundle: WorkspaceBundle, locale: Locale): PerformanceSnapshot {
  const now = new Date();
  const currentMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const previousMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const previousMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);

  const currentOrders = bundle.orders.filter((order) => new Date(order.created_at) >= currentMonth);
  const previousOrders = bundle.orders.filter((order) => {
    const createdAt = new Date(order.created_at);
    return createdAt >= previousMonth && createdAt <= previousMonthEnd;
  });

  const currentRevenue = currentOrders.reduce((sum, order) => sum + Number(order.total_amount ?? 0), 0);
  const previousRevenue = previousOrders.reduce((sum, order) => sum + Number(order.total_amount ?? 0), 0);
  const activeCampaignCount = bundle.campaigns.filter((campaign) => {
    const status = String(campaign.status ?? "").toLowerCase();
    return status === "active" || status === "running" || status === "in_progress";
  }).length;
  const estimatedAdSpend = bundle.campaigns.reduce((sum, campaign) => {
    const spend =
      Number(campaign.spend ?? 0)
      || Number(campaign.amount_spent ?? 0)
      || Number(campaign.budget_spent ?? 0)
      || Number(campaign.daily_budget ?? 0);
    return sum + spend;
  }, 0);

  const topChannels = Object.entries(
    bundle.orders.reduce<Record<string, number>>((acc, order) => {
      const key = order.platform?.trim() || "Atlas";
      acc[key] = (acc[key] ?? 0) + 1;
      return acc;
    }, {}),
  )
    .sort((left, right) => right[1] - left[1])
    .slice(0, 4)
    .map(([label, value]) => ({ label, value }));

  const liveMarketplaceCount = bundle.marketplaces.filter((account) => {
    const status = String(account.status ?? "").toLowerCase();
    return status === "active" || status === "connected" || status === "live";
  }).length;

  const activeSocialChannelCount = bundle.socials.filter((account) => {
    const status = String(account.status ?? "").toLowerCase();
    return status === "active" || status === "connected" || status === "live";
  }).length;

  return {
    headline:
      currentOrders.length > 0
        ? locale === "en"
          ? "ATLAS channels have started generating sales."
          : "Atlas kanalları satış üretmeye başladı."
        : liveMarketplaceCount > 0 || activeCampaignCount > 0
          ? locale === "en"
            ? "Launch setup is complete; first-sale performance is now being tracked."
            : "Yayın hazırlığı tamamlandı; şimdi ilk satış performansı takip ediliyor."
          : locale === "en"
            ? "The ATLAS team is continuing launch preparations."
            : "Atlas ekibi launch hazırlıklarını sürdürüyor.",
    summary:
      locale === "en"
        ? `${currentOrders.length} orders · ${formatCurrency(locale, currentRevenue)} revenue · ${liveMarketplaceCount} live channels${activeCampaignCount > 0 ? ` · ${activeCampaignCount} active campaigns` : ""}`
        : `${currentOrders.length} sipariş · ${formatCurrency(locale, currentRevenue)} gelir · ${liveMarketplaceCount} canlı kanal${activeCampaignCount > 0 ? ` · ${activeCampaignCount} aktif kampanya` : ""}`,
    ordersLast30Days: currentOrders.length,
    revenueLast30Days: currentRevenue,
    deliveredOrdersLast30Days: currentOrders.filter((order) => order.status === "delivered").length,
    averageOrderValue: currentOrders.length > 0 ? currentRevenue / currentOrders.length : 0,
    activeCampaignCount,
    estimatedAdSpend,
    liveMarketplaceCount,
    activeSocialChannelCount,
    monthOverMonthOrderDeltaPct: safeDelta(currentOrders.length, previousOrders.length),
    monthOverMonthRevenueDeltaPct: safeDelta(currentRevenue, previousRevenue),
    topChannels,
  };
}

function buildFallbackThreads(bundle: WorkspaceBundle, locale: Locale): CustomerRequestThread[] {
  const existingSubmissionIds = new Set(
    bundle.requestThreads
      .map((thread) => thread.sourceSubmissionId)
      .filter((value): value is string => Boolean(value)),
  );

  return bundle.supportOverview.assignedRequests
    .filter((request) => !existingSubmissionIds.has(request.latestSubmission?.id ?? ""))
    .map((request) => ({
      id: `legacy:${request.id}`,
      subject: request.title,
      summary: request.description,
      status:
        request.status === "completed"
          ? "resolved"
          : request.status === "submitted"
            ? "waiting_on_atlas"
            : "waiting_on_customer",
      threadType: request.formCode === "ATL-701" ? "support" : "form_followup",
      workstreamKey: mapFormToWorkstream(
        request.formCode,
        getFormByCode(request.formCode)?.category,
      ),
      sourceSubmissionId: request.latestSubmission?.id ?? null,
      sourceTicketId: null,
      createdAt: request.requestedAt,
      updatedAt: request.updatedAt,
      lastMessageAt: request.updatedAt,
      primaryAction: {
        label: request.primaryAction.label,
        href: request.primaryAction.href,
      },
      latestMessage: {
        id: `${request.id}:legacy`,
        authorType: "system",
        authorLabel: locale === "en" ? "ATLAS system" : "Atlas sistemi",
        body: request.description,
        createdAt: request.updatedAt,
        messageKind: "legacy_request",
        attachments: [],
      },
      messages: [
        {
          id: `${request.id}:legacy`,
          authorType: "system",
          authorLabel: locale === "en" ? "ATLAS system" : "Atlas sistemi",
          body: request.description,
          createdAt: request.updatedAt,
          messageKind: "legacy_request",
          attachments: [],
        },
      ],
    }));
}

function buildWorkstreams(bundle: WorkspaceBundle, locale: Locale): CustomerWorkstreamViewModel[] {
  const submissionsByWorkstream = new Map<CustomerWorkstreamKey, Tables<"form_submissions">[]>();
  const deliverablesByWorkstream = new Map<CustomerWorkstreamKey, typeof bundle.deliverables>();

  for (const submission of bundle.submissions) {
    const key = mapFormToWorkstream(submission.form_code, getFormByCode(submission.form_code)?.category);
    const bucket = submissionsByWorkstream.get(key) ?? [];
    bucket.push(submission);
    submissionsByWorkstream.set(key, bucket);
  }

  for (const deliverable of bundle.deliverables) {
    if (!deliverable.workstreamKey) continue;
    const bucket = deliverablesByWorkstream.get(deliverable.workstreamKey) ?? [];
    bucket.push(deliverable);
    deliverablesByWorkstream.set(deliverable.workstreamKey, bucket);
  }

  return (Object.keys(WORKSTREAM_META) as CustomerWorkstreamKey[]).map((key) => {
    const meta = localizeWorkstreamMeta(locale, key);
    const submissions = submissionsByWorkstream.get(key) ?? [];
    const deliverables = deliverablesByWorkstream.get(key) ?? [];
    const latestDeliverable = deliverables[0] ?? null;
    const blockedSubmission = submissions.find((submission) => submission.status === "needs_correction");
    const inFlightSubmission = submissions.find((submission) =>
      ["submitted", "under_review", "approved"].includes(submission.status),
    );

    let status: CustomerWorkstreamStatus = "pending";
    if (blockedSubmission) {
      status = "blocked";
    } else if (latestDeliverable && ["published", "completed"].includes(latestDeliverable.status)) {
      status = "completed";
    } else if (key === "company_setup" && bundle.companies.length > 0) {
      status = "ready";
    } else if (key === "catalog_intake" && bundle.products.length > 0) {
      status = "ready";
    } else if (key === "marketplaces" && bundle.marketplaces.length > 0) {
      status = bundle.orders.length > 0 ? "completed" : "ready";
    } else if (key === "social" && bundle.socials.length > 0) {
      status = "ready";
    } else if (key === "ads" && bundle.campaigns.length > 0) {
      status = bundle.orders.length > 0 ? "completed" : "in_progress";
    } else if (key === "website" && bundle.companies.some((company) => Boolean(company.website))) {
      status = "ready";
    } else if (key === "fulfillment" && (bundle.orders.length > 0 || submissions.length > 0)) {
      status = bundle.orders.length > 0 ? "ready" : "in_progress";
    } else if (inFlightSubmission) {
      status = "in_progress";
    }

    return {
      key,
      title: meta.title,
      shortLabel: meta.shortLabel,
      description: meta.description,
      status,
      ownerLabel: locale === "en" ? "ATLAS Operator Console" : "Atlas Operator Console",
      observerMode: meta.observerMode,
      blockerReason:
        blockedSubmission?.admin_notes
        ?? (blockedSubmission
          ? locale === "en"
            ? `Additional information is required for ${blockedSubmission.form_code}.`
            : `${blockedSubmission.form_code} için ek bilgi gerekiyor.`
          : null),
      latestOutput:
        latestDeliverable?.summary
        ?? (latestDeliverable ? latestDeliverable.title : null)
        ?? (submissions[0]
          ? locale === "en"
            ? `${submissions[0].form_code} form was processed.`
            : `${submissions[0].form_code} formu işlendi.`
          : null),
      nextStep:
        status === "completed"
          ? locale === "en"
            ? "The ATLAS team continues operating this area."
            : "Atlas ekibi bu alanı işletmeye devam ediyor."
          : status === "ready"
            ? locale === "en"
              ? "This area appears ready for launch or active operation."
              : "Bu alan yayına veya yürütmeye hazır görünüyor."
            : status === "in_progress"
              ? locale === "en"
                ? "The ATLAS team is actively working on this area."
                : "Atlas ekibi bu alan üzerinde aktif çalışıyor."
              : status === "blocked"
                ? locale === "en"
                  ? "Customer input or approval is required."
                  : "Müşteri girdisi veya onayı bekleniyor."
                : locale === "en"
                  ? "This area has not started yet."
                  : "Bu alan henüz başlatılmadı.",
      customerAction: meta.customerAction,
      adminAction: meta.adminAction,
      detailHref: meta.detailHref,
      metrics: [
        { label: locale === "en" ? "Requests" : "Talep", value: String(submissions.length) },
        { label: locale === "en" ? "Outputs" : "Çıktı", value: String(deliverables.length) },
        {
          label: locale === "en" ? "Status" : "Durum",
          value: localizeWorkstreamStatus(locale, status),
        },
      ],
    };
  });
}

function getPrimaryCompany(bundle: WorkspaceBundle) {
  return bundle.companies[0] ?? null;
}

function getLatestSubscription(bundle: WorkspaceBundle) {
  return bundle.subscriptions[0] ?? null;
}

function getLatestInvoice(bundle: WorkspaceBundle, predicate?: (invoice: Tables<"invoices">) => boolean) {
  return bundle.invoices.find((invoice) => (predicate ? predicate(invoice) : true)) ?? null;
}

function isInvoicePendingLike(status: string | null | undefined) {
  const normalized = String(status ?? "").toLowerCase();
  return normalized === "pending" || normalized === "paid";
}

function toPaymentState(invoice: Tables<"invoices"> | null): CustomerPaymentState {
  const status = String(invoice?.status ?? "").toLowerCase();

  if (status === "confirmed") return "confirmed";
  if (status === "paid") return "paid";
  if (status === "pending") return "pending";
  return "none";
}

function isManagementPlan(planTier: string | null | undefined): planTier is Exclude<PlanTier, "starter"> {
  return planTier === "growth" || planTier === "professional" || planTier === "global_scale";
}

function getStarterInvoice(bundle: WorkspaceBundle) {
  return getLatestInvoice(bundle, (invoice) => invoice.plan_tier === "starter");
}

function getLatestManagementInvoice(bundle: WorkspaceBundle) {
  return getLatestInvoice(bundle, (invoice) => isManagementPlan(invoice.plan_tier));
}

function countPendingInvoices(bundle: WorkspaceBundle) {
  return bundle.invoices.filter((invoice) => isInvoicePendingLike(invoice.status)).length;
}

function buildPanelHref(
  path: string,
  params?: Record<string, string | null | undefined>,
) {
  if (!params) return path;
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value) search.set(key, value);
  }
  const query = search.toString();
  return query ? `${path}?${query}` : path;
}

function createLockedAction(
  label: string,
  href: string,
  description: string | null = null,
): CustomerLockedModuleAction {
  return {
    label,
    href,
    description,
  };
}

function createActiveModule(input: {
  key: CustomerModuleAccess["key"];
  label: string;
  href: string;
  description: string;
}): CustomerModuleAccess {
  return {
    key: input.key,
    label: input.label,
    href: input.href,
    visibility: "active",
    description: input.description,
    reason: null,
    lockedState: null,
    lockedSummary: null,
    lockedNextStep: null,
    lockedAction: null,
    secondaryAction: null,
    lockedOffers: [],
  };
}

function createLockedModule(input: {
  key: CustomerModuleAccess["key"];
  label: string;
  href: string;
  description: string;
  state: CustomerLockedModuleState;
  summary: string;
  nextStep: string;
  action: CustomerLockedModuleAction | null;
  secondaryAction?: CustomerLockedModuleAction | null;
  offers?: CustomerModuleAccess["lockedOffers"];
}): CustomerModuleAccess {
  return {
    key: input.key,
    label: input.label,
    href: input.href,
    visibility: "locked",
    description: input.description,
    reason: input.summary,
    lockedState: input.state,
    lockedSummary: input.summary,
    lockedNextStep: input.nextStep,
    lockedAction: input.action,
    secondaryAction: input.secondaryAction ?? null,
    lockedOffers: input.offers ?? [],
  };
}

function buildOfferIntentHref(
  section: "support" | "billing",
  moduleKey: CustomerModuleAccess["key"],
  offerType: StoreOfferCategory,
  offerKey: string,
) {
  return buildPanelHref(`/panel/${section}`, {
    intent: "module_unlock",
    from: moduleKey,
    offerType,
    offerKey,
  });
}

function parseMarketplaceChannelKey(value: unknown): MarketplaceChannelKey | null {
  return isMarketplaceChannelKey(value) ? value : null;
}

function getMarketplaceChannelTitle(locale: Locale, key: MarketplaceChannelKey) {
  return getStoreMarketplaceOfferByKey(key)?.title ?? (locale === "en" ? "Marketplace" : "Pazaryeri");
}

function inferMarketplaceChannelKeyFromInvoice(invoice: Tables<"invoices"> | null): MarketplaceChannelKey | null {
  const haystack = `${invoice?.notes ?? ""} ${invoice?.plan_tier ?? ""}`.toLowerCase();

  for (const offer of getMarketplaceChannelOfferings()) {
    if (haystack.includes(offer.key) || haystack.includes(offer.title.toLowerCase())) {
      return offer.key;
    }
  }

  return null;
}

function resolveMarketplaceMonthlyPrice(
  channelKey: MarketplaceChannelKey,
  invoice: Tables<"invoices"> | null,
  planTier: Exclude<PlanTier, "starter"> | null,
) {
  const invoiceAmount = typeof invoice?.amount === "number" ? invoice.amount : null;
  if (invoiceAmount && invoiceAmount > 0) {
    return invoiceAmount;
  }

  const storeOffer = getStoreMarketplaceOfferByKey(channelKey);
  if (storeOffer?.monthlyPrice) {
    return storeOffer.monthlyPrice;
  }

  return planTier ? getPlanTierDefinition(planTier).price : null;
}

function getSelectedMarketplace(bundle: WorkspaceBundle, locale: Locale): CustomerSelectedMarketplace | null {
  const latestMarketplace = bundle.marketplaces[0];
  const latestManagementInvoice = getLatestManagementInvoice(bundle);
  const latestManagementPlan: Exclude<PlanTier, "starter"> | null =
    latestManagementInvoice && isManagementPlan(latestManagementInvoice.plan_tier)
      ? latestManagementInvoice.plan_tier
      : null;

  if (latestMarketplace) {
    const key = parseMarketplaceChannelKey(latestMarketplace.platform);
    if (key) {
      return {
        key,
        title: getMarketplaceChannelTitle(locale, key),
        status: isMarketplaceOperational(String(latestMarketplace.status ?? "")) ? "active" : "activation_in_progress",
        source: "marketplace",
        requestedAt: typeof latestMarketplace.created_at === "string" ? latestMarketplace.created_at : null,
        planTier: latestManagementPlan,
        monthlyPrice: resolveMarketplaceMonthlyPrice(key, latestManagementInvoice, latestManagementPlan),
      };
    }
  }

  const selectionEvent = bundle.events.find((event) => event.event_type === "marketplace_selection_requested");
  const channelKey = parseMarketplaceChannelKey(
    selectionEvent?.payload && typeof selectionEvent.payload === "object" && !Array.isArray(selectionEvent.payload)
      ? (selectionEvent.payload as Record<string, unknown>).channel
      : null,
  );

  if (!selectionEvent || !channelKey) {
    const invoiceChannelKey = inferMarketplaceChannelKeyFromInvoice(latestManagementInvoice);
    if (!invoiceChannelKey) {
      return null;
    }

    const paymentState = toPaymentState(latestManagementInvoice);
    return {
      key: invoiceChannelKey,
      title: getMarketplaceChannelTitle(locale, invoiceChannelKey),
      status:
        paymentState === "confirmed"
          ? "activation_in_progress"
          : paymentState === "pending" || paymentState === "paid"
            ? "invoice_pending"
            : "requested",
      source: "invoice",
      requestedAt: latestManagementInvoice?.created_at ?? null,
      planTier: latestManagementPlan,
      monthlyPrice: resolveMarketplaceMonthlyPrice(invoiceChannelKey, latestManagementInvoice, latestManagementPlan),
    };
  }

  const paymentState = toPaymentState(latestManagementInvoice);
  return {
    key: channelKey,
    title: getMarketplaceChannelTitle(locale, channelKey),
    status:
      paymentState === "confirmed"
        ? "activation_in_progress"
        : paymentState === "pending" || paymentState === "paid"
          ? "invoice_pending"
          : "requested",
    source: "workflow_event",
    requestedAt: selectionEvent.created_at,
    planTier: latestManagementPlan,
    monthlyPrice: resolveMarketplaceMonthlyPrice(channelKey, latestManagementInvoice, latestManagementPlan),
  };
}

function hasEIN(company: WorkspaceBundle["companies"][number] | null) {
  return Boolean(company?.ein_number?.trim());
}

function isMarketplaceOperational(status: string | null | undefined) {
  const normalized = String(status ?? "").toLowerCase();
  return normalized === "active" || normalized === "connected" || normalized === "live";
}

function buildLaunchPhase(bundle: WorkspaceBundle): CustomerLaunchPhase {
  const primaryCompany = getPrimaryCompany(bundle);
  const starterPaymentState = toPaymentState(getStarterInvoice(bundle));
  const selectedMarketplace = getSelectedMarketplace(bundle, DEFAULT_LOCALE);
  const companyExists = Boolean(primaryCompany);
  const companyHasEin = hasEIN(primaryCompany);
  const hasMarketplaces = bundle.marketplaces.length > 0;
  const hasOperationalMarketplace = bundle.marketplaces.some((account) =>
    isMarketplaceOperational(String(account.status ?? "")),
  );
  const hasOrders = bundle.orders.length > 0;
  const companyStatus = String(primaryCompany?.status ?? "").toLowerCase();

  if (hasOrders) {
    return "live";
  }

  if (hasOperationalMarketplace) {
    return "go_live_ready";
  }

  if (hasMarketplaces) {
    return "store_setup";
  }

  if (selectedMarketplace) {
    return "store_setup";
  }

  if (companyExists && companyHasEin) {
    return starterPaymentState === "confirmed" ? "channel_selection" : "plan_ready";
  }

  if (companyExists) {
    return companyStatus === "active" ? "ein_setup" : "llc_setup";
  }

  return "application";
}

function buildModuleAccess(bundle: WorkspaceBundle, locale: Locale, _launchPhase: CustomerLaunchPhase): CustomerModuleAccess[] {
  const company = getPrimaryCompany(bundle);
  const hasCompany = Boolean(company);
  const starterInvoice = getStarterInvoice(bundle);
  const latestManagementInvoice = getLatestManagementInvoice(bundle);
  const starterPaymentState = toPaymentState(starterInvoice);
  const managementPaymentState = toPaymentState(latestManagementInvoice);
  const selectedMarketplace = getSelectedMarketplace(bundle, locale);
  const hasMarketplaces = bundle.marketplaces.length > 0;
  const hasOperationalMarketplace = bundle.marketplaces.some((account) =>
    isMarketplaceOperational(String(account.status ?? "")),
  );
  const hasOrders = bundle.orders.length > 0;
  const hasProducts = bundle.products.length > 0;
  const hasSocialChannels = bundle.socials.length > 0;
  const hasCampaigns = bundle.campaigns.length > 0;
  const starterPurchased = starterPaymentState !== "none";
  const hasMarketplaceIntent = Boolean(selectedMarketplace) || managementPaymentState !== "none";
  const hasStoreOpenSignal = managementPaymentState === "confirmed" || hasMarketplaces;
  const hasWarehousePrerequisite = hasMarketplaces || managementPaymentState === "confirmed" || hasOperationalMarketplace;
  const hasMarketingPrerequisite = hasOperationalMarketplace || hasOrders;
  const marketplaceOfferQueries = getMarketplaceChannelOfferings().map((offer) => ({
    offerType: "marketplace" as const,
    offerKey: offer.key,
  }));
  const warehouseOfferQueries = ["fba_prep", "custom_packaging", "express_fulfillment"].map((offerKey) => ({
    offerType: "addon" as const,
    offerKey,
  }));
  const socialOfferQueries = [{ offerType: "addon" as const, offerKey: "social_media" }];
  const actionLabels = getCustomerActionLabels(locale);
  const moduleMeta = (key: CustomerModuleKey) => getCustomerModuleBlueprint(locale, key);
  const activeModule = (key: CustomerModuleKey, description?: string) => {
    const meta = moduleMeta(key);
    return createActiveModule({
      key,
      label: meta.resolvedLabel,
      href: meta.href,
      description: description ?? meta.resolvedDescription,
    });
  };
  const lockedModule = (input: {
    key: CustomerModuleKey;
    description?: string;
    state: CustomerLockedModuleState;
    summary: string;
    nextStep: string;
    action: CustomerLockedModuleAction | null;
    secondaryAction?: CustomerLockedModuleAction | null;
    offers?: CustomerModuleAccess["lockedOffers"];
  }) => {
    const meta = moduleMeta(input.key);
    return createLockedModule({
      key: input.key,
      label: meta.resolvedLabel,
      href: meta.href,
      description: input.description ?? meta.resolvedDescription,
      state: input.state,
      summary: input.summary,
      nextStep: input.nextStep,
      action: input.action,
      secondaryAction: input.secondaryAction,
      offers: input.offers,
    });
  };
  const { supportLabel, billingLabel, companiesLabel, storeLabel, marketplacesLabel } = actionLabels;

  return [
    activeModule("dashboard", locale === "en" ? "Launch overview and next step." : "Launch özeti ve sıradaki adım."),
    activeModule(
      "process",
      locale === "en"
        ? "Launch steps, blockers, and the current queue."
        : "Launch adımları, blokajlar ve mevcut sıra burada izlenir.",
    ),
    activeModule(
      "services",
      locale === "en"
        ? "Packages, setup lanes, and service scope live here."
        : "Paketler, kurulum akışları ve hizmet kapsamı burada görünür.",
    ),
    hasCompany
      ? activeModule(
          "companies",
          locale === "en"
            ? "US company formation, EIN, and compliance progress."
            : "ABD şirket kurulumu, EIN ve uyumluluk durumu.",
        )
      : lockedModule({
          key: "companies",
          description:
            locale === "en"
              ? "US company formation, EIN, and compliance progress."
              : "ABD şirket kurulumu, EIN ve uyumluluk durumu.",
          state: starterPurchased ? "processing" : "not_purchased",
          summary:
            starterPurchased
              ? locale === "en"
                ? "Your LLC + EIN request is being processed by ATLAS. The module opens after the company record is created."
                : "LLC + EIN talebiniz Atlas tarafından işleniyor. Şirket kaydı oluşturulduğunda modül açılır."
              : locale === "en"
                ? "This module opens after you start the LLC + EIN foundation package."
                : "Bu modül, LLC + EIN temel paketini başlattığınızda açılır.",
          nextStep:
            starterPurchased
              ? locale === "en"
                ? "ATLAS completes the filing and creates your company record in the system."
                : "Atlas dosyalamayı tamamlayıp şirket kaydınızı sisteme işler."
              : locale === "en"
                ? "Start the LLC + EIN package from this screen."
                : "LLC + EIN paketini bu ekrandan başlatın.",
          action: createLockedAction(
            locale === "en" ? "Start LLC + EIN" : "LLC + EIN Başlat",
            buildOfferIntentHref("support", "companies", "addon", "llc_ein"),
            locale === "en"
              ? "Request the LLC + EIN package directly from this module."
              : "LLC + EIN paketini doğrudan bu modülden talep edin.",
          ),
          secondaryAction: createLockedAction(
            billingLabel,
            buildOfferIntentHref("billing", "companies", "addon", "llc_ein"),
          ),
          offers: [{ offerType: "addon", offerKey: "llc_ein" }],
        }),
    hasCompany && hasStoreOpenSignal
      ? activeModule(
          "store",
          locale === "en"
            ? "Choose your first channel and review setup plus monthly operations."
            : "İlk kanalınızı seçin; kurulum ve aylık operasyon kapsamını görün.",
        )
      : !hasCompany
        ? lockedModule({
            key: "store",
            description:
              locale === "en"
                ? "Choose your first channel and review setup plus monthly operations."
                : "İlk kanalınızı seçin; kurulum ve aylık operasyon kapsamını görün.",
            state: "blocked",
            summary:
              locale === "en"
                ? "Store opens after the company setup is started and recorded."
                : "Mağaza, şirket kurulumu başlatılıp sisteme işlendiğinde açılır.",
            nextStep:
              locale === "en"
                ? "Start the LLC module first."
                : "Önce LLC modülünü başlatın.",
            action: createLockedAction(companiesLabel, "/panel/companies"),
            secondaryAction: createLockedAction(supportLabel, "/panel/support?intent=module_unlock&from=store"),
          })
        : hasMarketplaceIntent
          ? lockedModule({
              key: "store",
              description:
                locale === "en"
                  ? "Choose your first channel and review setup plus monthly operations."
                  : "İlk kanalınızı seçin; kurulum ve aylık operasyon kapsamını görün.",
              state: "processing",
              summary:
                locale === "en"
                  ? "Your marketplace package is being processed. Store opens after ATLAS confirms the setup lane."
                  : "Pazaryeri paketiniz işleniyor. Atlas kurulum hattını onayladığında mağaza açılır.",
              nextStep:
                locale === "en"
                  ? "Wait for the marketplace package confirmation or follow the billing thread."
                  : "Pazaryeri paket onayını bekleyin veya fatura akışını takip edin.",
              action: createLockedAction(supportLabel, "/panel/support?intent=module_unlock&from=store"),
              secondaryAction: createLockedAction(billingLabel, "/panel/billing?intent=module_unlock&from=store"),
            })
          : lockedModule({
              key: "store",
              description:
                locale === "en"
                  ? "Choose your first channel and review setup plus monthly operations."
                  : "İlk kanalınızı seçin; kurulum ve aylık operasyon kapsamını görün.",
              state: "not_purchased",
              summary:
                locale === "en"
                  ? "Choose and request your first marketplace package from this module."
                  : "İlk pazaryeri paketinizi bu modülden seçip başlatın.",
              nextStep:
                locale === "en"
                  ? "Select a marketplace package; ATLAS opens the store lane after it is processed."
                  : "Bir pazaryeri paketi seçin; Atlas paketi işlediğinde mağaza açılır.",
              action: createLockedAction(supportLabel, "/panel/support?intent=module_unlock&from=store"),
              secondaryAction: createLockedAction(billingLabel, "/panel/billing?intent=module_unlock&from=store"),
              offers: marketplaceOfferQueries,
            }),
    hasMarketplaces
      ? activeModule(
          "marketplaces",
          locale === "en"
            ? "Connected marketplace accounts and activation state."
            : "Bağlı pazaryeri hesapları ve aktivasyon durumu.",
        )
      : hasMarketplaceIntent
        ? lockedModule({
            key: "marketplaces",
            description:
              locale === "en"
                ? "Connected marketplace accounts and activation state."
                : "Bağlı pazaryeri hesapları ve aktivasyon durumu.",
            state: "processing",
            summary:
              locale === "en"
                ? "Marketplace account setup is being processed. The module opens after the first account record is created."
                : "Pazaryeri hesap kurulumu işleniyor. İlk hesap kaydı oluştuğunda modül açılır.",
            nextStep:
              locale === "en"
                ? "Follow the store and billing lane until the account appears here."
                : "Hesap burada görünene kadar mağaza ve fatura akışını takip edin.",
            action: createLockedAction(storeLabel, "/panel/store"),
            secondaryAction: createLockedAction(supportLabel, "/panel/support?intent=module_unlock&from=marketplaces"),
          })
        : lockedModule({
            key: "marketplaces",
            description:
              locale === "en"
                ? "Connected marketplace accounts and activation state."
                : "Bağlı pazaryeri hesapları ve aktivasyon durumu.",
            state: "blocked",
            summary:
              hasCompany
                ? locale === "en"
                  ? "Open the Store module first to start a marketplace package."
                  : "Önce bir pazaryeri paketi başlatmak için Mağaza modülünü açın."
                : locale === "en"
                  ? "Marketplace setup starts after company setup."
                  : "Pazaryeri kurulumu şirket kurulumundan sonra başlar.",
            nextStep:
              hasCompany
                ? locale === "en"
                  ? "Choose a channel in Store."
                  : "Mağaza modülünde bir kanal seçin."
                : locale === "en"
                  ? "Start LLC setup first."
                  : "Önce LLC kurulumunu başlatın.",
            action: createLockedAction(hasCompany ? storeLabel : companiesLabel, hasCompany ? "/panel/store" : "/panel/companies"),
            secondaryAction: createLockedAction(supportLabel, "/panel/support?intent=module_unlock&from=marketplaces"),
          }),
    hasProducts
      ? activeModule(
          "products",
          locale === "en"
            ? "Catalog intake, listings, and product readiness."
            : "Katalog girişi, listing hazırlığı ve ürün readiness burada tutulur.",
        )
      : hasMarketplaces || hasStoreOpenSignal
        ? lockedModule({
            key: "products",
            description:
              locale === "en"
                ? "Catalog intake, listings, and product readiness."
                : "Katalog girişi, listing hazırlığı ve ürün readiness burada tutulur.",
            state: "processing",
            summary:
              locale === "en"
                ? "Product intake opens after ATLAS creates the first catalog lane."
                : "Atlas ilk katalog hattını açtığında ürün intake alanı açılır.",
            nextStep:
              locale === "en"
                ? "Wait for ATLAS to create the first product or catalog record."
                : "Atlas'ın ilk ürün veya katalog kaydını açmasını bekleyin.",
            action: createLockedAction(supportLabel, "/panel/support?intent=module_unlock&from=products"),
            secondaryAction: createLockedAction(marketplacesLabel, "/panel/marketplaces"),
          })
        : lockedModule({
            key: "products",
            description:
              locale === "en"
                ? "Catalog intake, listings, and product readiness."
                : "Katalog girişi, listing hazırlığı ve ürün readiness burada tutulur.",
            state: "blocked",
            summary:
              locale === "en"
                ? "Products unlock after the store and marketplace setup is open."
                : "Ürünler, mağaza ve pazaryeri kurulumu açıldıktan sonra açılır.",
            nextStep:
              locale === "en"
                ? "Open Store or Marketplaces first."
                : "Önce Mağaza veya Pazaryerleri modülünü açın.",
            action: createLockedAction(storeLabel, "/panel/store"),
            secondaryAction: createLockedAction(supportLabel, "/panel/support?intent=module_unlock&from=products"),
          }),
    activeModule("documents", locale === "en" ? "Documents, outputs, and approvals." : "Belgeler, çıktılar ve onaylar."),
    activeModule(
      "billing",
      locale === "en"
        ? "Package pricing, invoices, and payment readiness."
        : "Paket fiyatları, faturalar ve ödeme hazırlığı.",
    ),
    activeModule("support", locale === "en" ? "Support center and request threads." : "Destek merkezi ve talep akışları."),
    hasOperationalMarketplace
      ? activeModule(
          "orders",
          locale === "en"
            ? "Orders open after the channel goes live."
            : "Siparişler kanal yayına girdikten sonra açılır.",
        )
      : lockedModule({
          key: "orders",
          description:
            locale === "en"
              ? "Orders open after the channel goes live."
              : "Siparişler kanal yayına girdikten sonra açılır.",
          state: "blocked",
          summary:
            locale === "en"
              ? "Orders unlock after the first live channel is active."
              : "Siparişler ilk canlı kanal aktif olduğunda açılır.",
          nextStep:
            locale === "en"
              ? "Complete the marketplace activation first."
              : "Önce pazaryeri aktivasyonunu tamamlayın.",
          action: createLockedAction(marketplacesLabel, "/panel/marketplaces"),
          secondaryAction: createLockedAction(supportLabel, "/panel/support?intent=module_unlock&from=orders"),
        }),
    hasOperationalMarketplace || hasOrders
      ? activeModule(
          "warehouse",
          locale === "en"
            ? "Inbound, stock, and fulfillment readiness."
            : "Gelen ürün, stok ve fulfillment hazırlığı burada izlenir.",
        )
      : hasWarehousePrerequisite
        ? lockedModule({
            key: "warehouse",
            description:
              locale === "en"
                ? "Inbound, stock, and fulfillment readiness."
                : "Gelen ürün, stok ve fulfillment hazırlığı burada izlenir.",
            state: "not_purchased",
            summary:
              locale === "en"
                ? "Warehouse and fulfillment services are still locked for this account."
                : "Bu hesap için depo ve fulfillment hizmetleri henüz kilitli.",
            nextStep:
              locale === "en"
                ? "Request the fulfillment add-ons from this module."
                : "Fulfillment eklentilerini bu modülden talep edin.",
            action: createLockedAction(supportLabel, "/panel/support?intent=module_unlock&from=warehouse"),
            secondaryAction: createLockedAction(marketplacesLabel, "/panel/marketplaces"),
            offers: warehouseOfferQueries,
          })
        : lockedModule({
            key: "warehouse",
            description:
              locale === "en"
                ? "Inbound, stock, and fulfillment readiness."
                : "Gelen ürün, stok ve fulfillment hazırlığı burada izlenir.",
            state: "blocked",
            summary:
              locale === "en"
                ? "Warehouse opens after the store path reaches marketplace readiness."
                : "Depo alanı, mağaza akışı pazaryeri hazırlığına ulaştığında açılır.",
            nextStep:
              locale === "en"
                ? "Open the marketplace path first."
                : "Önce pazaryeri yolunu açın.",
            action: createLockedAction(storeLabel, "/panel/store"),
            secondaryAction: createLockedAction(supportLabel, "/panel/support?intent=module_unlock&from=warehouse"),
          }),
    hasSocialChannels
      ? activeModule(
          "social",
          locale === "en"
            ? "Social presence, content requests, and brand coordination."
            : "Sosyal medya varlığı, içerik talepleri ve marka koordinasyonu burada görünür.",
        )
      : hasMarketingPrerequisite
        ? lockedModule({
            key: "social",
            description:
              locale === "en"
                ? "Social presence, content requests, and brand coordination."
                : "Sosyal medya varlığı, içerik talepleri ve marka koordinasyonu burada görünür.",
            state: "not_purchased",
            summary:
              locale === "en"
                ? "Social Media service has not been enabled for this account yet."
                : "Bu hesap için Sosyal Medya hizmeti henüz etkinleştirilmedi.",
            nextStep:
              locale === "en"
                ? "Request the Social Media package from this module."
                : "Sosyal Medya paketini bu modülden talep edin.",
            action: createLockedAction(supportLabel, buildOfferIntentHref("support", "social", "addon", "social_media")),
            secondaryAction: createLockedAction(billingLabel, buildOfferIntentHref("billing", "social", "addon", "social_media")),
            offers: socialOfferQueries,
          })
        : lockedModule({
            key: "social",
            description:
              locale === "en"
                ? "Social presence, content requests, and brand coordination."
                : "Sosyal medya varlığı, içerik talepleri ve marka koordinasyonu burada görünür.",
            state: "blocked",
            summary:
              locale === "en"
                ? "Social Media opens after the first channel goes live."
                : "Sosyal Medya alanı ilk kanal yayına girdikten sonra açılır.",
            nextStep:
              locale === "en"
                ? "Complete go-live first."
                : "Önce go-live aşamasını tamamlayın.",
            action: createLockedAction(marketplacesLabel, "/panel/marketplaces"),
            secondaryAction: createLockedAction(supportLabel, "/panel/support?intent=module_unlock&from=social"),
          }),
    hasOperationalMarketplace
      ? activeModule(
          "reports",
          locale === "en"
            ? "Performance reporting unlocks after first activity."
            : "Performans raporları ilk aktiviteden sonra açılır.",
        )
      : lockedModule({
          key: "reports",
          description:
            locale === "en"
              ? "Performance reporting unlocks after first activity."
              : "Performans raporları ilk aktiviteden sonra açılır.",
          state: "blocked",
          summary:
            locale === "en"
              ? "Reports open after the first channel becomes live."
              : "Raporlar ilk kanal canlıya geçtiğinde açılır.",
          nextStep:
            locale === "en"
              ? "Complete the launch and marketplace activation first."
              : "Önce launch ve pazaryeri aktivasyonunu tamamlayın.",
          action: createLockedAction(marketplacesLabel, "/panel/marketplaces"),
          secondaryAction: createLockedAction(supportLabel, "/panel/support?intent=module_unlock&from=reports"),
        }),
    hasCampaigns
      ? activeModule(
          "advertising",
          locale === "en"
            ? "Ads and growth lanes open after the store becomes operational."
            : "Reklam ve growth alanları mağaza operasyonel olduktan sonra açılır.",
        )
      : hasMarketingPrerequisite
        ? lockedModule({
            key: "advertising",
            description:
              locale === "en"
                ? "Ads and growth lanes open after the store becomes operational."
                : "Reklam ve growth alanları mağaza operasyonel olduktan sonra açılır.",
            state: "not_purchased",
            summary:
              locale === "en"
                ? "Advertising is still managed manually by ATLAS for this account."
                : "Bu hesapta reklam alanı hâlâ Atlas tarafından manuel yönetiliyor.",
            nextStep:
              locale === "en"
                ? "Request an ads lane from support."
                : "Destek üzerinden reklam hattı talep edin.",
            action: createLockedAction(supportLabel, "/panel/support?intent=module_unlock&from=advertising"),
            secondaryAction: createLockedAction(storeLabel, "/panel/store"),
          })
        : lockedModule({
            key: "advertising",
            description:
              locale === "en"
                ? "Ads and growth lanes open after the store becomes operational."
                : "Reklam ve growth alanları mağaza operasyonel olduktan sonra açılır.",
            state: "blocked",
            summary:
              locale === "en"
                ? "Advertising opens after the store is live."
                : "Reklam alanı mağaza canlıya geçtikten sonra açılır.",
            nextStep:
              locale === "en"
                ? "Complete go-live first."
                : "Önce go-live aşamasını tamamlayın.",
            action: createLockedAction(marketplacesLabel, "/panel/marketplaces"),
            secondaryAction: createLockedAction(supportLabel, "/panel/support?intent=module_unlock&from=advertising"),
          }),
    lockedModule({
      key: "finance",
      description:
        locale === "en"
          ? "Finance operations, reconciliation, and cash visibility."
          : "Finans operasyonu, mutabakat ve nakit görünürlüğü burada toplanır.",
      state: hasOperationalMarketplace ? "not_purchased" : "blocked",
      summary:
        hasOperationalMarketplace
          ? locale === "en"
            ? "Finance service is visible, but ATLAS still manages it manually for this account."
            : "Finans hizmeti görünür durumda, ancak bu hesapta Atlas tarafından manuel yürütülüyor."
          : locale === "en"
            ? "Finance becomes relevant after the first live channel is active."
            : "Finans alanı ilk canlı kanal aktif olduktan sonra anlamlı hale gelir.",
      nextStep:
        hasOperationalMarketplace
          ? locale === "en"
            ? "Open a support request if you want the finance lane enabled."
            : "Finans hattını açtırmak istiyorsanız destek talebi oluşturun."
          : locale === "en"
            ? "Complete go-live first."
            : "Önce go-live aşamasını tamamlayın.",
      action: createLockedAction(
        supportLabel,
        "/panel/support?intent=module_unlock&from=finance",
      ),
      secondaryAction: createLockedAction(
        hasOperationalMarketplace ? billingLabel : marketplacesLabel,
        hasOperationalMarketplace ? "/panel/billing" : "/panel/marketplaces",
      ),
    }),
    activeModule("settings", locale === "en" ? "Account and profile settings." : "Hesap ve profil ayarları."),
  ];
}

function buildServiceCatalog(bundle: WorkspaceBundle, locale: Locale): CustomerServiceCatalogItem[] {
  const primaryCompany = getPrimaryCompany(bundle);
  const companyHasEin = hasEIN(primaryCompany);
  const starterInvoice = getStarterInvoice(bundle);
  const latestManagementInvoice = getLatestManagementInvoice(bundle);
  const starterPaymentState = toPaymentState(starterInvoice);
  const starterConfirmed = starterPaymentState === "confirmed";
  const selectedPlan = latestManagementInvoice?.plan_tier ?? null;

  return getBillingCatalogSections().flatMap((section) =>
    section.packages.map((pkg) => {
      const isLaunchSection = section.key === "launch";
      const isManagementSection = section.key === "management";
      const isSelected = isLaunchSection
        ? Boolean(starterInvoice)
        : selectedPlan === "growth"
          ? pkg.name === "Marketplace Kurulum + Aylık Yönetim"
          : selectedPlan === "professional"
            ? pkg.name === "Çok Kanallı Kurulum + Aylık Yönetim"
            : selectedPlan === "global_scale"
              ? pkg.name === "Kurumsal / Custom"
              : false;

      const locked = isManagementSection && !starterConfirmed;
      const recommended = !isSelected && (
        (isLaunchSection && !starterInvoice)
        || (isManagementSection && starterConfirmed && !selectedPlan)
      );

      return {
        id: `${section.key}:${pkg.name.toLowerCase().replace(/\s+/g, "-")}`,
        title: pkg.name,
        summary: pkg.summary,
        upfrontPrice: pkg.cadence === "one_time" ? pkg.price : 0,
        recurringPrice: pkg.cadence === "monthly" ? pkg.price : null,
        currency: pkg.currency,
        status: isSelected ? "selected" : locked ? "locked" : recommended ? "recommended" : "available",
        ctaLabel:
          isLaunchSection && starterPaymentState === "pending"
            ? locale === "en"
              ? "Awaiting payment"
              : "Ödeme bekliyor"
            : isLaunchSection && starterPaymentState === "paid"
              ? locale === "en"
                ? "Awaiting approval"
                : "Onay bekliyor"
              : isSelected && latestManagementInvoice?.status === "pending"
                ? locale === "en"
                  ? "Awaiting payment"
                  : "Ödeme bekliyor"
                : isSelected && latestManagementInvoice?.status === "paid"
                  ? locale === "en"
                    ? "Awaiting approval"
                    : "Onay bekliyor"
                  : isSelected
            ? locale === "en"
              ? "Selected"
              : "Seçildi"
            : locked
              ? locale === "en"
                ? "Unlock after starter approval"
                : "Starter onayı sonrası açılır"
              : locale === "en"
                ? "Review package"
                : "Paketi incele",
        includes: pkg.features,
        lineItems: pkg.lineItems,
        href: section.key === "launch" ? "/panel/companies" : "/panel/store",
      } satisfies CustomerServiceCatalogItem;
    }),
  );
}

function buildLaunchJourney(
  workstreams: CustomerWorkstreamViewModel[],
  performance: PerformanceSnapshot,
  locale: Locale,
): LaunchJourneyStage[] {
  return STAGES.map((rawStage) => {
    const stage = localizeStage(locale, rawStage);
    const statuses = workstreams
      .filter((workstream) => stage.workstreamKeys.includes(workstream.key))
      .map((workstream) => workstream.status);

    const blocked = workstreams.find(
      (workstream) => stage.workstreamKeys.includes(workstream.key) && workstream.status === "blocked",
    );

    return {
      key: stage.key,
      title: stage.title,
      status:
        stage.key === "first_sale" && performance.ordersLast30Days > 0
          ? "completed"
          : aggregateStatus(statuses),
      atlasAction:
        workstreams.find((workstream) => stage.workstreamKeys.includes(workstream.key))?.adminAction
        ?? (locale === "en" ? "The ATLAS team is running this stage." : "Atlas ekibi bu aşamayı yürütüyor."),
      customerAction:
        workstreams.find((workstream) => stage.workstreamKeys.includes(workstream.key))?.customerAction
        ?? (locale === "en" ? "No additional customer action is required right now." : "Şu an ek müşteri aksiyonu yok."),
      blockerReason: blocked?.blockerReason ?? null,
      requiredInputs: stage.requiredInputs,
      expectedDeliverable: stage.expectedDeliverable,
    };
  });
}

function buildCustomerHubCards(input: {
  actionItems: CustomerHubActionItem[];
  submittedForms: CustomerHubFormItem[];
  documents: CustomerHubDocumentItem[];
  history: CustomerHubHistoryItem[];
}, locale: Locale): HubCardDescriptor[] {
  return [
    {
      id: "hub-actions",
      title: locale === "en" ? "Actions" : "Aksiyon",
      summary: locale === "en" ? "ATLAS collects the information and open flows it is waiting on from you here." : "Atlas sizden beklediği bilgi ve açık iş akışlarını burada toplar.",
      value: String(input.actionItems.length),
      tab: "actions",
      tone: input.actionItems.length > 0 ? "warning" : "default",
    },
    {
      id: "hub-forms",
      title: locale === "en" ? "Forms" : "Form",
      summary: locale === "en" ? "Submitted forms and records still being tracked stay in one place." : "Gönderdiğiniz ve halen takip edilen form kayıtları aynı yerde görünür.",
      value: String(input.submittedForms.length),
      tab: "forms",
      tone: "primary",
    },
    {
      id: "hub-documents",
      title: locale === "en" ? "Documents" : "Belge",
      summary: locale === "en" ? "ATLAS outputs and customer-visible files are kept together." : "Atlas çıktıları ve müşteriye görünür dosyalar bir arada tutulur.",
      value: String(input.documents.length),
      tab: "documents",
      tone: "success",
    },
    {
      id: "hub-history",
      title: locale === "en" ? "History" : "Geçmiş",
      summary: locale === "en" ? "Thread activity and status changes appear on one timeline." : "Thread hareketleri ve durum değişimleri tek zaman çizgisinde görünür.",
      value: String(input.history.length),
      tab: "history",
      tone: "default",
    },
  ];
}

function buildCustomerHub(bundle: WorkspaceBundle, requestThreads: CustomerRequestThread[], locale: Locale): CustomerRequestsHubViewModel {
  const groupedSubmissions = groupCustomerSubmissions(bundle.submissions);
  const actionItems: CustomerHubActionItem[] = [
    ...requestThreads
      .filter((thread) => thread.status === "waiting_on_customer" || thread.status === "open")
      .map((thread) => ({
        id: `thread:${thread.id}`,
        title: thread.subject,
        summary: thread.summary,
        status: thread.status,
        sourceLabel:
          thread.threadType === "catalog_intake"
            ? translate(locale, "portal.requestsHub.sourceLabels.catalogIntake")
            : translate(locale, "portal.requestsHub.sourceLabels.requestThread"),
        workstreamLabel: thread.workstreamKey ? localizeWorkstreamMeta(locale, thread.workstreamKey)?.title ?? null : null,
        href: thread.primaryAction?.href ?? "/panel/requests",
        createdAt: thread.updatedAt,
      })),
    ...groupedSubmissions
      .filter((entry) => entry.latest.status === "needs_correction")
      .map(({ latest, count }) => ({
        id: `submission:${latest.id}`,
        title: locale === "en" ? `Additional information required for ${latest.form_code}` : `${latest.form_code} için ek bilgi gerekiyor`,
        summary:
          normalizeOptionalText(latest.admin_notes)
          ?? (locale === "en"
            ? `Additional information is required to complete the ${getFormByCode(latest.form_code)?.title ?? latest.form_code} form${count > 1 ? ` (${count} submissions tracked)` : ""}.`
            : `${getFormByCode(latest.form_code)?.title ?? latest.form_code} formunu tamamlamak için ek bilgi bekleniyor${count > 1 ? ` (${count} kayıt takip ediliyor)` : ""}.`),
        status: "blocked" as const,
        sourceLabel: translate(locale, "portal.requestsHub.sourceLabels.formCorrection"),
        workstreamLabel: localizeWorkstreamMeta(locale, mapFormToWorkstream(latest.form_code, getFormByCode(latest.form_code)?.category))?.title ?? null,
        href: `/panel/support/submissions/${latest.id}`,
        createdAt: latest.updated_at,
      })),
  ]
    .sort((left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime());

  const submittedForms: CustomerHubFormItem[] = groupedSubmissions
    .map(({ latest, count }) => ({
      id: latest.id,
      formCode: latest.form_code,
      title: getFormByCode(latest.form_code)?.title ?? latest.form_code,
      summary:
        normalizeOptionalText(latest.admin_notes)
        ?? (locale === "en"
          ? `${latest.form_code} was submitted on ${formatWorkspaceDate(locale, latest.created_at)}${count > 1 ? ` and has ${count} tracked submissions` : ""}.`
          : `${latest.form_code} formu ${formatWorkspaceDate(locale, latest.created_at)} tarihinde gönderildi${count > 1 ? ` ve ${count} kayıt tek başlık altında takip ediliyor` : ""}.`),
      status: latest.status,
      submittedAt: latest.created_at,
      updatedAt: latest.updated_at,
      href: `/panel/support/submissions/${latest.id}`,
      adminNotes: normalizeOptionalText(latest.admin_notes),
    }))
    .sort((left, right) => new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime());

  const documents: CustomerHubDocumentItem[] = [
    ...bundle.deliverables.map((deliverable) => ({
      id: `deliverable:${deliverable.id}`,
      title: deliverable.title,
      summary: deliverable.summary,
      status: deliverable.status,
      typeLabel: deliverable.deliverableType,
      href: deliverable.artifactUrl,
      createdAt: deliverable.createdAt,
    })),
  ].sort((left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime());

  const history: CustomerHubHistoryItem[] = [
    ...requestThreads.map((thread) => ({
      id: `history:thread:${thread.id}`,
      title: thread.subject,
      description: thread.latestMessage?.body ?? thread.summary,
      createdAt: thread.lastMessageAt,
      kind: thread.threadType,
    })),
    ...bundle.events.map((event) => ({
      id: `history:event:${event.id}`,
      title: event.event_type?.replace(/_/g, " ") || translate(locale, "portal.requestsHub.sourceLabels.workflowEvent"),
      description: event.description ?? event.title ?? (locale === "en" ? "The process was updated." : "Süreç güncellendi."),
      createdAt: event.created_at,
      kind: "workflow_event",
    })),
  ]
    .sort((left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime())
    .slice(0, 24);

  return {
    cards: buildCustomerHubCards({ actionItems, submittedForms, documents, history }, locale),
    actionItems,
    submittedForms,
    documents,
    history,
  };
}

function buildPanelMetric(
  label: string,
  value: string | number,
  tone?: CustomerDashboardPanelMetric["tone"],
): CustomerDashboardPanelMetric {
  return {
    label,
    value: String(value),
    tone,
  };
}

function buildDashboardPanels(input: {
  locale: Locale;
  workspaceSummary: string;
  headline: string;
  launchStageLabel: string;
  blockedWorkstreamCount: number;
  activeWorkstreamCount: number;
  requestsHub: CustomerRequestsHubViewModel;
  performance: PerformanceSnapshot;
  requestThreads: CustomerRequestThread[];
  deliverableCount: number;
  totalProducts: number;
  totalStock: number;
  completedTasks: number;
  totalTasks: number;
}): Pick<
  CustomerWorkspaceViewModel,
  "customerFocusPanel" | "atlasActivityPanel" | "secondaryMetrics" | "hubStateDefaults"
> {
  const tx = (key: string, params?: Record<string, string | number>) => translate(input.locale, key, params);
  const waitingOnCustomerCount = input.requestsHub.actionItems.length;
  const waitingThreads = input.requestThreads.filter(
    (thread) => thread.status === "waiting_on_customer" || thread.status === "open",
  ).length;
  const pendingForms = input.requestsHub.submittedForms.filter(
    (item) => item.status === "pending" || item.status === "needs_correction",
  ).length;
  const nextAction = input.requestsHub.actionItems[0];
  const topWorkstream =
    input.activeWorkstreamCount > 0
      ? tx("workspace.dashboard.topWorkstream.active", { count: input.activeWorkstreamCount })
      : tx("workspace.dashboard.topWorkstream.idle");
  const completionPct = input.totalTasks > 0 ? Math.round((input.completedTasks / input.totalTasks) * 100) : 0;
  const defaultTab =
    input.requestsHub.actionItems.length > 0
      ? "actions"
      : input.requestsHub.submittedForms.length > 0
        ? "forms"
        : input.requestsHub.documents.length > 0
          ? "documents"
          : "history";

  const customerFocusPanel: CustomerDashboardPanel = {
    title: tx("workspace.dashboard.customerFocus.title"),
    statusLabel:
      waitingOnCustomerCount > 0
        ? tx("workspace.dashboard.customerFocus.openActionStatus", { count: waitingOnCustomerCount })
        : tx("workspace.dashboard.customerFocus.noCriticalAction"),
    headline: nextAction?.title ?? tx("workspace.dashboard.customerFocus.noCriticalHeadline"),
    summary:
      nextAction?.summary
      ?? tx("workspace.dashboard.customerFocus.noCriticalSummary"),
    detail:
      waitingOnCustomerCount > 0
        ? tx("workspace.dashboard.customerFocus.detailWhenWaiting")
        : tx("workspace.dashboard.customerFocus.detailWhenIdle"),
    metrics: [
      buildPanelMetric(tx("workspace.dashboard.customerFocus.pendingActions"), waitingOnCustomerCount, waitingOnCustomerCount > 0 ? "warning" : "default"),
      buildPanelMetric(tx("workspace.dashboard.customerFocus.openThreads"), waitingThreads, waitingThreads > 0 ? "primary" : "default"),
      buildPanelMetric(tx("workspace.dashboard.customerFocus.pendingForms"), pendingForms, pendingForms > 0 ? "warning" : "default"),
    ],
    primaryAction: {
      id: "customer-focus:actions",
      title: tx("workspace.dashboard.customerFocus.primaryAction"),
      description: tx("workspace.dashboard.customerFocus.primaryDescription"),
      tab: waitingOnCustomerCount > 0 ? "actions" : "forms",
      tone: waitingOnCustomerCount > 0 ? "warning" : "primary",
    },
    secondaryAction: {
      id: "customer-focus:support",
      title: tx("workspace.dashboard.customerFocus.secondaryAction"),
      description: tx("workspace.dashboard.customerFocus.secondaryDescription"),
      href: "/panel/support",
      tab: "actions",
    },
  };

  const atlasActivityPanel: CustomerDashboardPanel = {
    title: tx("workspace.dashboard.atlasActivity.title"),
    statusLabel: input.launchStageLabel,
    headline: input.headline,
    summary: input.workspaceSummary,
    detail:
      input.blockedWorkstreamCount > 0
        ? tx("workspace.dashboard.atlasActivity.blockedDetail", { count: input.blockedWorkstreamCount })
        : topWorkstream,
    metrics: [
      buildPanelMetric(tx("workspace.dashboard.atlasActivity.activeWorkstreams"), input.activeWorkstreamCount, "primary"),
      buildPanelMetric(tx("workspace.dashboard.atlasActivity.visibleOutputs"), input.deliverableCount, input.deliverableCount > 0 ? "success" : "default"),
      buildPanelMetric(tx("workspace.dashboard.atlasActivity.liveChannels"), input.performance.liveMarketplaceCount, "success"),
    ],
    primaryAction: {
      id: "atlas-activity:history",
      title: tx("workspace.dashboard.atlasActivity.primaryAction"),
      description: tx("workspace.dashboard.atlasActivity.primaryDescription"),
      tab: "history",
      tone: "primary",
    },
    secondaryAction: {
      id: "atlas-activity:services",
      title: tx("workspace.dashboard.atlasActivity.secondaryAction"),
      description: tx("workspace.dashboard.atlasActivity.secondaryDescription"),
      href: "/panel/services",
      tab: "history",
    },
  };

  const secondaryMetrics: CustomerSecondaryMetric[] = [
    {
      id: "secondary-progress",
      title: tx("workspace.dashboard.secondary.progressTitle"),
      value: `%${completionPct}`,
      summary: tx("workspace.dashboard.secondary.progressSummary", { done: input.completedTasks, total: input.totalTasks }),
      tone: "primary",
      tab: "history",
    },
    {
      id: "secondary-orders",
      title: tx("workspace.dashboard.secondary.activeOrdersTitle"),
      value: String(input.performance.ordersLast30Days),
      summary: tx("workspace.dashboard.secondary.activeOrdersSummary"),
      tone: input.performance.ordersLast30Days > 0 ? "success" : "default",
    },
    {
      id: "secondary-products",
      title: tx("workspace.dashboard.secondary.totalProductsTitle"),
      value: String(input.totalProducts),
      summary: tx("workspace.dashboard.secondary.totalProductsSummary"),
    },
    {
      id: "secondary-stock",
      title: tx("workspace.dashboard.secondary.totalStockTitle"),
      value: String(input.totalStock),
      summary: tx("workspace.dashboard.secondary.totalStockSummary"),
    },
  ];

  return {
    customerFocusPanel,
    atlasActivityPanel,
    secondaryMetrics,
    hubStateDefaults: {
      activeTab: defaultTab,
      selectedEntity: {
        actions: input.requestsHub.actionItems[0]?.id ?? null,
        forms: input.requestsHub.submittedForms[0]?.id ?? null,
        documents: input.requestsHub.documents[0]?.id ?? null,
        history: input.requestsHub.history[0]?.id ?? null,
      },
    },
  };
}

export async function getCustomerWorkspaceView(userId: string, localeInput?: Locale): Promise<CustomerWorkspaceViewModel> {
  const locale = await resolveLocale(localeInput);
  const bundle = await getWorkspaceBundle(userId);
  const customerVisibleTasks = getCustomerVisibleProcessTasks(bundle.tasks);
  const launchPhase = buildLaunchPhase(bundle);
  const journey = buildCustomerJourneyView({
    submissions: bundle.submissions,
    tasks: bundle.tasks,
    notifications: bundle.notifications,
    events: bundle.events,
  });
  const performance = buildPerformance(bundle, locale);
  const workstreams = buildWorkstreams(bundle, locale);
  const moduleAccess = buildModuleAccess(bundle, locale, launchPhase);
  const serviceCatalog = buildServiceCatalog(bundle, locale);
  const starterPaymentState = toPaymentState(getStarterInvoice(bundle));
  const managementPaymentState = toPaymentState(getLatestManagementInvoice(bundle));
  const selectedMarketplace = getSelectedMarketplace(bundle, locale);
  const pendingInvoiceCount = countPendingInvoices(bundle);
  const requestThreads = [...bundle.requestThreads, ...buildFallbackThreads(bundle, locale)]
    .sort((left, right) => new Date(right.lastMessageAt).getTime() - new Date(left.lastMessageAt).getTime());
  const launchJourney = buildLaunchJourney(workstreams, performance, locale);
  const requestsHub = buildCustomerHub(bundle, requestThreads, locale);
  const blockedWorkstreamCount = workstreams.filter((workstream) => workstream.status === "blocked").length;
  const activeWorkstreamCount = workstreams.filter((workstream) =>
    ["in_progress", "blocked", "ready", "completed"].includes(workstream.status),
  ).length;
  const completedTasks = customerVisibleTasks.filter((task) => task.task_status === "completed").length;

  const firstSaleStatus =
    performance.ordersLast30Days > 0
      ? "first_sale"
      : launchPhase === "go_live_ready"
        ? "live_waiting_sale"
        : launchPhase === "application"
          ? "not_started"
          : "launching";

  const displayName =
    [bundle.user?.first_name, bundle.user?.last_name].filter(Boolean).join(" ").trim()
    || bundle.user?.company_name
    || bundle.user?.email
    || (locale === "en" ? "Customer" : "Müşteri");
  const headline = translate(locale, `workspace.dashboard.headline.${firstSaleStatus}`);
  const summary =
    blockedWorkstreamCount > 0
      ? translate(locale, "workspace.dashboard.summary.blocked", { count: blockedWorkstreamCount })
      : translate(locale, "workspace.dashboard.summary.active", { count: activeWorkstreamCount });
  const launchStageLabel = translate(locale, `workspace.launchLabels.${firstSaleStatus}`);
  const totalStock = bundle.products.reduce(
    (sum, product) => sum + Number(product.stock_turkey ?? 0) + Number(product.stock_us ?? 0),
    0,
  );
  const dashboardPanels = buildDashboardPanels({
    locale,
    workspaceSummary: summary,
    headline,
    launchStageLabel,
    blockedWorkstreamCount,
    activeWorkstreamCount,
    requestsHub,
    performance,
    requestThreads,
    deliverableCount: bundle.deliverables.length,
    totalProducts: bundle.products.length,
    totalStock,
    completedTasks,
    totalTasks: customerVisibleTasks.length,
  });

  return {
    customerId: userId,
    displayName,
    companyName: bundle.user?.company_name ?? bundle.companies[0]?.company_name ?? null,
    launchPhase,
    starterPaymentState,
    managementPaymentState,
    selectedMarketplace,
    pendingInvoiceCount,
    headline,
    summary,
    primaryAction: requestThreads[0]?.primaryAction ?? journey.primaryAction,
    latestNotification: journey.latestNotification,
    firstSaleStatus,
    launchStageLabel,
    requestCount: requestThreads.length,
    deliverableCount: bundle.deliverables.length,
    blockedWorkstreamCount,
    activeWorkstreamCount,
    journey,
    workstreams,
    moduleAccess,
    requestThreads,
    deliverables: bundle.deliverables,
    performance,
    launchJourney,
    serviceCatalog,
    allowedFormCodes: bundle.allowedFormCodes,
    actionItems: requestsHub.actionItems,
    submittedForms: requestsHub.submittedForms,
    documents: requestsHub.documents,
    history: requestsHub.history,
    requestsHub,
    customerFocusPanel: dashboardPanels.customerFocusPanel,
    atlasActivityPanel: dashboardPanels.atlasActivityPanel,
    secondaryMetrics: dashboardPanels.secondaryMetrics,
    hubStateDefaults: dashboardPanels.hubStateDefaults,
  };
}

export async function getCustomerWorkspaceWorkstreams(userId: string, locale?: Locale) {
  const workspace = await getCustomerWorkspaceView(userId, locale);
  return workspace.workstreams;
}

export async function getCustomerWorkspaceDeliverables(userId: string, locale?: Locale) {
  const workspace = await getCustomerWorkspaceView(userId, locale);
  return workspace.deliverables;
}

export async function getCustomerWorkspacePerformance(userId: string, locale?: Locale) {
  const workspace = await getCustomerWorkspaceView(userId, locale);
  return workspace.performance;
}

export async function getCustomerRequestThreads(userId: string, locale?: Locale) {
  const workspace = await getCustomerWorkspaceView(userId, locale);
  return workspace.requestThreads;
}

export async function createCustomerRequest(input: {
  userId: string;
  subject: string;
  message: string;
  workstreamKey?: CustomerWorkstreamKey | null;
}) {
  return createCustomerSupportThread(input);
}
