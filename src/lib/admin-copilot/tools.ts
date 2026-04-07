/* eslint-disable @typescript-eslint/no-explicit-any */
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { createAuditLog } from "@/lib/audit";
import { getCustomerWorkspaceView } from "@/lib/customer-workspace";
import { getPlanTierAmount } from "@/lib/payments";
import {
  createArtifact,
  createDelivery,
  getDashboardData,
  publishArtifact,
} from "./store";
import type {
  CommandIntent,
  CopilotArtifactRecord,
  CopilotScope,
  CreateCompanyInput,
  CreateMarketplaceInput,
  CustomerDeliveryTarget,
  ProvisionCustomerInput,
} from "./types";

const provisionCustomerSchema = z.object({
  email: z.string().email(),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  companyName: z.string().min(1),
  phone: z.string().optional().nullable(),
  planTier: z.string().optional(),
  autoCreateCompany: z.boolean().optional(),
  stateOfFormation: z.string().optional(),
});

const createCompanySchema = z.object({
  userId: z.string().uuid(),
  companyName: z.string().min(1),
  companyType: z.string().optional(),
  stateOfFormation: z.string().min(1),
  status: z.string().optional(),
  companyEmail: z.string().email().optional().nullable(),
  website: z.string().url().optional().nullable(),
  notes: z.string().optional().nullable(),
});

const createMarketplaceSchema = z.object({
  userId: z.string().uuid(),
  companyId: z.string().uuid().optional().nullable(),
  platform: z.string().min(1),
  storeName: z.string().min(1),
  storeUrl: z.string().url().optional().nullable(),
  sellerId: z.string().optional().nullable(),
  status: z.string().optional(),
});

const updateProfileSchema = z.object({
  userId: z.string().uuid(),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  companyName: z.string().optional(),
  phone: z.string().optional().nullable(),
});

const onboardingStatusSchema = z.object({
  userId: z.string().uuid(),
  status: z.string().min(1),
});

const companyStatusSchema = z.object({
  companyId: z.string().uuid(),
  status: z.string().min(1),
});

const marketplaceUpdateSchema = z.object({
  marketplaceId: z.string().uuid(),
  status: z.string().optional(),
  storeName: z.string().optional(),
  storeUrl: z.string().url().optional().nullable(),
});

const socialCreateSchema = z.object({
  userId: z.string().uuid(),
  companyId: z.string().uuid().optional().nullable(),
  platform: z.string().min(1),
  accountName: z.string().min(1),
  profileUrl: z.string().url().optional().nullable(),
});

const adDraftSchema = z.object({
  userId: z.string().uuid(),
  companyId: z.string().uuid().optional().nullable(),
  campaignName: z.string().min(1),
  platform: z.string().min(1),
  totalBudget: z.number().optional(),
  dailyBudget: z.number().optional(),
});

const financeDraftSchema = z.object({
  userId: z.string().uuid(),
  companyId: z.string().uuid().optional().nullable(),
  recordType: z.enum(["income", "expense"]),
  category: z.string().min(1),
  description: z.string().min(1),
  amount: z.number().positive(),
});

const customerReportSchema = z.object({
  userId: z.string().uuid(),
  reportType: z.enum(["sales", "inventory", "compliance", "performance", "custom"]).optional(),
  title: z.string().min(1),
});

const publishArtifactSchema = z.object({
  artifactId: z.string().uuid().optional(),
  customerId: z.string().uuid(),
  channel: z.enum(["portal", "in_app", "email"]).optional(),
});

const notificationSchema = z.object({
  customerId: z.string().uuid(),
  title: z.string().min(1),
  body: z.string().min(1),
  channel: z.enum(["in_app", "email"]).optional(),
});

const createTasksSchema = z.object({
  userId: z.string().uuid(),
});

const updateTaskSchema = z.object({
  taskId: z.string().uuid(),
  status: z.string().min(1),
  notes: z.string().optional(),
});

const documentSchema = z.object({
  customerId: z.string().uuid(),
  title: z.string().min(1).optional(),
  description: z.string().min(1).optional(),
});

export interface ToolExecutionContext {
  requesterUserId: string;
  scope: CopilotScope;
  runId: string;
}

export interface ToolExecutionResult {
  summary: string;
  details?: string;
  affectedRecords: Array<{ type: string; id: string; label?: string }>;
  nextSuggestions?: string[];
  customerContext?: Record<string, unknown> | null;
  artifactIds?: string[];
}

function adminDb() {
  return createAdminClient() as any;
}

function randomPassword(): string {
  return `Atlas!${Math.random().toString(36).slice(2, 8)}${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
}

async function insertNotificationRecord(input: {
  userId: string;
  title: string;
  body: string;
  channel: "in_app" | "email";
  metadata?: Record<string, unknown>;
  actionUrl?: string | null;
}): Promise<string> {
  const { data, error } = await adminDb()
    .from("notifications")
    .insert({
      user_id: input.userId,
      title: input.title,
      body: input.body,
      type: "info",
      channel: input.channel,
      action_url: input.actionUrl ?? null,
      metadata: input.metadata ?? {},
    })
    .select("id")
    .single();

  if (error || !data?.id) {
    throw new Error(error?.message ?? "Bildirim kaydı oluşturulamadı.");
  }

  return data.id as string;
}

async function getUserLabel(userId: string): Promise<string> {
  const { data } = await adminDb()
    .from("users")
    .select("first_name,last_name,email,company_name")
    .eq("id", userId)
    .maybeSingle();

  if (!data) {
    return userId;
  }

  const fullName = [data.first_name, data.last_name].filter(Boolean).join(" ").trim();
  return fullName || data.company_name || data.email || userId;
}

async function getPrimaryCompanyId(userId: string): Promise<string | null> {
  const { data } = await adminDb()
    .from("customer_companies")
    .select("id")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  return data?.id ?? null;
}

export async function ensureOnboardingTasks(userId: string): Promise<string[]> {
  const client = adminDb();
  const defaultTasks = [
    { task_name: "Kimlik ve şirket bilgilerini doğrula", task_category: "onboarding", sort_order: 10 },
    { task_name: "LLC kuruluş paketini başlat", task_category: "llc", sort_order: 20 },
    { task_name: "EIN başvuru hazırlığı", task_category: "ein", sort_order: 30 },
    { task_name: "Pazaryeri hesap kurulum kontrolü", task_category: "marketplace", sort_order: 40 },
  ];

  const { data: existing } = await client
    .from("process_tasks")
    .select("id,task_name")
    .eq("user_id", userId)
    .in("task_name", defaultTasks.map(task => task.task_name));

  const existingNames = new Set((existing ?? []).map((task: any) => task.task_name));
  const toInsert = defaultTasks
    .filter(task => !existingNames.has(task.task_name))
    .map(task => ({
      user_id: userId,
      task_name: task.task_name,
      task_category: task.task_category,
      task_status: "pending",
      sort_order: task.sort_order,
    }));

  if (toInsert.length === 0) {
    return (existing ?? []).map((task: any) => task.id as string);
  }

  const { data, error } = await client
    .from("process_tasks")
    .insert(toInsert)
    .select("id");

  if (error) {
    throw new Error(error.message);
  }

  return [...(existing ?? []).map((task: any) => task.id as string), ...(data ?? []).map((task: any) => task.id as string)];
}

export async function getCustomer360(userId: string): Promise<Record<string, unknown>> {
  const client = adminDb();
  const [userRes, subRes, companyRes, marketplaceRes, socialRes, taskRes, reportRes, workspace] = await Promise.all([
    client.from("users").select("*").eq("id", userId).maybeSingle(),
    client.from("user_subscriptions").select("*").eq("user_id", userId).order("started_at", { ascending: false }).limit(1).maybeSingle(),
    client.from("customer_companies").select("*").eq("user_id", userId).order("created_at", { ascending: false }),
    client.from("marketplace_accounts").select("*").eq("user_id", userId).order("created_at", { ascending: false }),
    client.from("social_media_accounts").select("*").eq("user_id", userId).order("created_at", { ascending: false }),
    client.from("process_tasks").select("id,task_name,task_status,task_category,sort_order").eq("user_id", userId).order("sort_order"),
    client.from("ai_reports").select("id,title,report_type,status,created_at").eq("user_id", userId).order("created_at", { ascending: false }).limit(5),
    getCustomerWorkspaceView(userId),
  ]);

  return {
    user: userRes.data,
    subscription: subRes.data,
    companies: companyRes.data ?? [],
    marketplaces: marketplaceRes.data ?? [],
    socials: socialRes.data ?? [],
    tasks: taskRes.data ?? [],
    reports: reportRes.data ?? [],
    workspaceSummary: workspace,
    workstreams: workspace.workstreams,
    deliverables: workspace.deliverables,
    requestThreads: workspace.requestThreads,
    performance: workspace.performance,
  };
}

async function buildCustomerReport(input: { userId: string; title: string; reportType: string }) {
  const client = adminDb();
  const now = new Date();
  const from = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();

  const [customerContext, ordersRes, productsRes, recordsRes] = await Promise.all([
    getCustomer360(input.userId),
    client
      .from("orders")
      .select("id,total_amount,status,created_at")
      .eq("user_id", input.userId)
      .gte("created_at", from),
    client
      .from("products")
      .select("id,name,stock_turkey,stock_us")
      .eq("owner_id", input.userId)
      .eq("is_active", true),
    client
      .from("financial_records")
      .select("amount,record_type,transaction_date")
      .eq("user_id", input.userId)
      .gte("transaction_date", from.slice(0, 10)),
  ]);

  const orders = ordersRes.data ?? [];
  const products = productsRes.data ?? [];
  const finance = recordsRes.data ?? [];
  const companies = (customerContext.companies as any[]) ?? [];
  const marketplaces = (customerContext.marketplaces as any[]) ?? [];
  const tasks = (customerContext.tasks as any[]) ?? [];

  const completedTasks = tasks.filter(task => task.task_status === "completed").length;
  const pendingTasks = tasks.filter(task => task.task_status !== "completed").length;
  const totalRevenue = orders.reduce((sum: number, order: any) => sum + Number(order.total_amount ?? 0), 0);
  const avgOrderValue = orders.length > 0 ? totalRevenue / orders.length : 0;
  const income = finance
    .filter((record: any) => record.record_type === "income")
    .reduce((sum: number, record: any) => sum + Number(record.amount ?? 0), 0);
  const expense = finance
    .filter((record: any) => record.record_type === "expense")
    .reduce((sum: number, record: any) => sum + Number(record.amount ?? 0), 0);
  const lowStock = products.filter((product: any) => Number(product.stock_turkey ?? 0) < 10 || Number(product.stock_us ?? 0) < 10);

  const summary = `${orders.length} sipariş, $${totalRevenue.toFixed(2)} gelir, ${companies.length} şirket, ${marketplaces.length} pazaryeri, ${pendingTasks} açık süreç görevi.`;
  const content = [
    `# ${input.title}`,
    "",
    `Rapor tipi: ${input.reportType}`,
    "Dönem: Son 30 gün",
    "",
    "## Operasyon Özeti",
    `- Toplam sipariş: ${orders.length}`,
    `- Toplam gelir: $${totalRevenue.toFixed(2)}`,
    `- Ortalama sipariş değeri: $${avgOrderValue.toFixed(2)}`,
    `- Finansal net durum: $${(income - expense).toFixed(2)}`,
    "",
    "## Müşteri Varlıkları",
    `- Şirket sayısı: ${companies.length}`,
    `- Pazaryeri hesabı: ${marketplaces.length}`,
    `- Sosyal medya hesabı: ${((customerContext.socials as any[]) ?? []).length}`,
    `- Aktif ürün: ${products.length}`,
    "",
    "## Süreç Durumu",
    `- Tamamlanan görev: ${completedTasks}`,
    `- Açık görev: ${pendingTasks}`,
    "",
    "## Dikkat Gerektiren Noktalar",
    pendingTasks > 0 ? `- ${pendingTasks} görev henüz tamamlanmadı.` : "- Bekleyen görev yok.",
    lowStock.length > 0 ? `- ${lowStock.length} ürün düşük stok seviyesinde.` : "- Kritik stok uyarısı yok.",
    marketplaces.some((account: any) => account.status !== "active")
      ? "- Aktivasyonu tamamlanmamış pazaryeri hesapları var."
      : "- Pazaryeri hesapları aktif durumda.",
  ].join("\n");

  const { data: reportRow } = await client
    .from("ai_reports")
    .insert({
      user_id: input.userId,
      report_type: input.reportType,
      title: input.title,
      content,
      summary,
      status: "completed",
      data: {
        orderCount: orders.length,
        totalRevenue,
        totalIncome: income,
        totalExpense: expense,
        companyCount: companies.length,
        marketplaceCount: marketplaces.length,
        pendingTasks,
        lowStockCount: lowStock.length,
      },
      generated_at: new Date().toISOString(),
    })
    .select("id")
    .maybeSingle();

  return {
    reportId: reportRow?.id as string | undefined,
    content,
    summary,
  };
}

export async function deliverArtifactToCustomer(
  input: CustomerDeliveryTarget,
  options?: {
    runId?: string | null;
    title?: string;
    content?: string;
  },
): Promise<{
  artifact: CopilotArtifactRecord;
  deliveryIds: string[];
  notificationId?: string;
}> {
  const channel = input.channel;
  const artifact = await publishArtifact(input.artifactId, channel);
  const deliveryIds: string[] = [];
  let notificationId: string | undefined;

  if (channel === "portal") {
    const delivery = await createDelivery({
      artifactId: artifact.id,
      runId: options?.runId ?? artifact.runId,
      customerId: input.customerId,
      targetType: "portal",
      status: "delivered",
      targetRef: `/panel/reports?artifactId=${artifact.id}`,
      metadata: { source: "atlas_admin_copilot" },
    });
    deliveryIds.push(delivery.id);
  }

  if (channel === "in_app" || channel === "email") {
    notificationId = await insertNotificationRecord({
      userId: input.customerId,
      title: options?.title ?? artifact.title,
      body: options?.content ?? artifact.content.slice(0, 1000),
      channel,
      actionUrl: `/panel/reports?artifactId=${artifact.id}`,
      metadata: { artifactId: artifact.id, source: "atlas_admin_copilot" },
    });

    const delivery = await createDelivery({
      artifactId: artifact.id,
      runId: options?.runId ?? artifact.runId,
      customerId: input.customerId,
      targetType: channel === "email" ? "email" : "notification",
      status: "delivered",
      targetRef: notificationId,
      metadata: { channel, source: "atlas_admin_copilot" },
    });
    deliveryIds.push(delivery.id);
  }

  return { artifact, deliveryIds, notificationId };
}

async function executeProvisionCustomer(
  rawInput: ProvisionCustomerInput,
  ctx: ToolExecutionContext,
): Promise<ToolExecutionResult> {
  const input = provisionCustomerSchema.parse(rawInput);
  const client = adminDb();

  const { data: existingUser } = await client
    .from("users")
    .select("id,email")
    .eq("email", input.email)
    .maybeSingle();

  let userId = existingUser?.id as string | undefined;
  let passwordResetLink: string | undefined;

  if (!userId) {
    const temporaryPassword = randomPassword();
    const authResult = await client.auth.admin.createUser({
      email: input.email,
      password: temporaryPassword,
      email_confirm: true,
      user_metadata: {
        first_name: input.firstName,
        last_name: input.lastName,
        company_name: input.companyName,
        phone: input.phone ?? null,
        require_password_reset: true,
      },
      app_metadata: {
        user_role: "customer",
      },
    });

    if (authResult.error || !authResult.data.user) {
      throw new Error(authResult.error?.message ?? "Auth kullanıcısı oluşturulamadı.");
    }

    userId = authResult.data.user.id;

    try {
      const linkResult = await client.auth.admin.generateLink({
        type: "recovery",
        email: input.email,
      });
      passwordResetLink = linkResult?.data?.properties?.action_link;
    } catch {
      passwordResetLink = undefined;
    }
  }

  const { error: profileError } = await client
    .from("users")
    .upsert({
      id: userId,
      email: input.email,
      first_name: input.firstName,
      last_name: input.lastName,
      company_name: input.companyName,
      phone: input.phone ?? null,
      onboarding_status: "onboarding",
    }, { onConflict: "id" });

  if (profileError) {
    throw new Error(profileError.message);
  }

  await client
    .from("user_roles")
    .upsert({
      user_id: userId,
      role: "customer",
      is_active: true,
    }, { onConflict: "user_id" });

  await client
    .from("user_subscriptions")
    .upsert({
      user_id: userId,
      plan_tier: input.planTier ?? "starter",
      payment_status: "pending",
      amount: getPlanTierAmount(input.planTier ?? "starter"),
      valid_until: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
      notes: "Atlas Copilot provisioning akışı ile oluşturuldu",
    }, { onConflict: "user_id" });

  let companyId: string | undefined;
  if (input.autoCreateCompany) {
    const { data: existingCompany } = await client
      .from("customer_companies")
      .select("id")
      .eq("user_id", userId)
      .eq("company_name", input.companyName)
      .maybeSingle();

    if (existingCompany?.id) {
      companyId = existingCompany.id as string;
    } else {
      const { data: companyData, error: companyError } = await client
        .from("customer_companies")
        .insert({
          user_id: userId,
          company_name: input.companyName,
          company_type: "llc",
          state_of_formation: input.stateOfFormation ?? "Wyoming",
          status: "pending",
        })
        .select("id")
        .single();

      if (companyError) {
        throw new Error(companyError.message);
      }
      companyId = companyData.id as string;
    }
  }

  if (!userId) {
    throw new Error("Müşteri hesabı kimliği oluşturulamadı.");
  }

  const taskIds = await ensureOnboardingTasks(userId);

  const artifact = await createArtifact({
    runId: ctx.runId,
    customerId: userId,
    artifactType: "notification_draft",
    title: `${input.firstName} ${input.lastName} hoş geldin bildirimi`,
    content: [
      "# Hoş Geldiniz",
      "",
      `${input.companyName} hesabınız Atlas içinde oluşturuldu.`,
      "İlk adım olarak şifre belirleme ve onboarding görevlerini tamamlama akışı sizi bekliyor.",
      passwordResetLink ? "Şifre kurulum bağlantısı üretildi ve güvenli kanaldan paylaşılabilir." : "Şifre kurulum linki manuel olarak forgot-password akışından üretilebilir.",
    ].join("\n"),
    channel: "internal",
    metadata: {
      customerId: userId,
      companyId,
      passwordResetLinkAvailable: Boolean(passwordResetLink),
      passwordResetLink,
    },
  });

  await createAuditLog({
    userId: ctx.requesterUserId,
    action: "user.activated",
    entityType: "user",
    entityId: userId,
    metadata: {
      source: "atlas_copilot",
      runId: ctx.runId,
      companyId,
      taskCount: taskIds.length,
    },
  });

  return {
    summary: `${input.firstName} ${input.lastName} için müşteri hesabı, abonelik ve onboarding görevleri hazırlandı.`,
    details: passwordResetLink
      ? "Şifre reset bağlantısı üretildi. Müşteriye doğrudan parola gönderilmedi."
      : "Şifre reset bağlantısı üretilemedi; müşteriye forgot-password akışı üzerinden erişim verilmeli.",
    affectedRecords: [
      { type: "user", id: userId, label: input.email },
      ...(companyId ? [{ type: "company", id: companyId, label: input.companyName }] : []),
      ...taskIds.map(taskId => ({ type: "task", id: taskId })),
      { type: "artifact", id: artifact.id, label: artifact.title },
    ],
    nextSuggestions: [
      "Bu müşteri için LLC durumunu onayla",
      "Onboarding görevlerini müşteriyle paylaş",
      "Müşteri portalına hoş geldin içeriğini gönder",
    ],
    customerContext: await getCustomer360(userId),
    artifactIds: [artifact.id],
  };
}

async function executeUpdateProfile(rawInput: Record<string, unknown>, ctx: ToolExecutionContext): Promise<ToolExecutionResult> {
  const input = updateProfileSchema.parse(rawInput);
  const { data, error } = await adminDb()
    .from("users")
    .update({
      first_name: input.firstName,
      last_name: input.lastName,
      company_name: input.companyName,
      phone: input.phone ?? null,
    })
    .eq("id", input.userId)
    .select("id,email")
    .single();
  if (error || !data) throw new Error(error?.message ?? "Müşteri profili güncellenemedi.");

  await createAuditLog({
    userId: ctx.requesterUserId,
    action: "user.profile_updated",
    entityType: "user",
    entityId: input.userId,
    metadata: { source: "atlas_copilot", runId: ctx.runId },
  });

  return {
    summary: "Müşteri profili güncellendi.",
    affectedRecords: [{ type: "user", id: input.userId, label: data.email }],
    nextSuggestions: ["Müşteri 360 görünümünü yenile"],
    customerContext: await getCustomer360(input.userId),
  };
}

async function executeGetCustomer360(rawInput: Record<string, unknown>): Promise<ToolExecutionResult> {
  const userId = z.object({ userId: z.string().uuid() }).parse(rawInput).userId;
  const context = await getCustomer360(userId);
  const user = context.user as { first_name?: string; last_name?: string; email?: string } | null;
  const companies = context.companies as Array<{ company_name: string }>;
  const marketplaces = context.marketplaces as Array<{ store_name: string }>;
  const tasks = context.tasks as Array<{ task_name: string }>;

  return {
    summary: user
      ? `${user.first_name ?? ""} ${user.last_name ?? ""} için 360 görünüm hazır. ${companies.length} şirket, ${marketplaces.length} pazaryeri hesabı, ${tasks.length} süreç görevi var.`
      : "Müşteri 360 görünümü hazır.",
    affectedRecords: user ? [{ type: "user", id: userId, label: user.email }] : [],
    nextSuggestions: [
      "Bu müşteri için LLC ekle",
      "Onboarding görevlerini başlat",
      "Aylık rapor oluştur",
    ],
    customerContext: context,
  };
}

async function executeChangeOnboarding(rawInput: Record<string, unknown>, ctx: ToolExecutionContext): Promise<ToolExecutionResult> {
  const input = onboardingStatusSchema.parse(rawInput);
  const { data, error } = await adminDb()
    .from("users")
    .update({ onboarding_status: input.status })
    .eq("id", input.userId)
    .select("id,email,onboarding_status")
    .single();
  if (error || !data) throw new Error(error?.message ?? "Onboarding durumu güncellenemedi.");

  await createAuditLog({
    userId: ctx.requesterUserId,
    action: input.status === "active" ? "user.activated" : "user.profile_updated",
    entityType: "user",
    entityId: input.userId,
    metadata: { source: "atlas_copilot", runId: ctx.runId, onboardingStatus: input.status },
  });

  return {
    summary: `Müşteri onboarding durumu "${input.status}" olarak güncellendi.`,
    affectedRecords: [{ type: "user", id: input.userId, label: data.email }],
    nextSuggestions: ["Müşteri 360 görünümünü yenile"],
    customerContext: await getCustomer360(input.userId),
  };
}

async function executeCreateCompany(rawInput: CreateCompanyInput, ctx: ToolExecutionContext): Promise<ToolExecutionResult> {
  const input = createCompanySchema.parse(rawInput);
  const { data, error } = await adminDb()
    .from("customer_companies")
    .insert({
      user_id: input.userId,
      company_name: input.companyName,
      company_type: input.companyType ?? "llc",
      state_of_formation: input.stateOfFormation,
      status: input.status ?? "pending",
      company_email: input.companyEmail ?? null,
      website: input.website ?? null,
      notes: input.notes ?? null,
    })
    .select("id,company_name")
    .single();
  if (error || !data) throw new Error(error?.message ?? "Şirket oluşturulamadı.");

  await createAuditLog({
    userId: ctx.requesterUserId,
    action: "user.profile_updated",
    entityType: "setting",
    entityId: data.id,
    metadata: { source: "atlas_copilot", runId: ctx.runId, type: "company_create" },
  });

  return {
    summary: `${data.company_name} için LLC/şirket kaydı oluşturuldu.`,
    affectedRecords: [{ type: "company", id: data.id, label: data.company_name }],
    nextSuggestions: ["Pazaryeri hesabı ekle", "Şirket durumunu güncelle"],
    customerContext: await getCustomer360(input.userId),
  };
}

async function executeUpdateCompanyStatus(rawInput: Record<string, unknown>, ctx: ToolExecutionContext): Promise<ToolExecutionResult> {
  const input = companyStatusSchema.parse(rawInput);
  const { data, error } = await adminDb()
    .from("customer_companies")
    .update({ status: input.status })
    .eq("id", input.companyId)
    .select("id,user_id,company_name,status")
    .single();
  if (error || !data) throw new Error(error?.message ?? "Şirket durumu güncellenemedi.");

  await createAuditLog({
    userId: ctx.requesterUserId,
    action: "admin.settings_changed",
    entityType: "setting",
    entityId: input.companyId,
    metadata: { source: "atlas_copilot", runId: ctx.runId, status: input.status },
  });

  return {
    summary: `${data.company_name} durumu "${input.status}" olarak güncellendi.`,
    affectedRecords: [{ type: "company", id: data.id, label: data.company_name }],
    nextSuggestions: ["Müşteri 360 görünümünü yenile", "Pazaryeri hesabı ekle"],
    customerContext: await getCustomer360(data.user_id),
  };
}

async function executeCreateMarketplace(rawInput: CreateMarketplaceInput, ctx: ToolExecutionContext): Promise<ToolExecutionResult> {
  const input = createMarketplaceSchema.parse(rawInput);
  const client = adminDb();
  const companyId = input.companyId ?? await getPrimaryCompanyId(input.userId);

  const { data: existing } = await client
    .from("marketplace_accounts")
    .select("id,store_name")
    .eq("user_id", input.userId)
    .eq("platform", input.platform)
    .eq("store_name", input.storeName)
    .maybeSingle();

  const accountId = existing?.id
    ? existing.id
    : (await client
      .from("marketplace_accounts")
      .insert({
        user_id: input.userId,
        company_id: companyId,
        platform: input.platform,
        store_name: input.storeName,
        store_url: input.storeUrl ?? null,
        seller_id: input.sellerId ?? null,
        status: input.status ?? "pending_setup",
        total_listings: 0,
        total_sales: 0,
        monthly_revenue: 0,
        api_connected: false,
      })
      .select("id")
      .single()).data?.id;

  if (!accountId) {
    throw new Error("Pazaryeri hesabı oluşturulamadı.");
  }

  await createAuditLog({
    userId: ctx.requesterUserId,
    action: "admin.settings_changed",
    entityType: "setting",
    entityId: accountId,
    metadata: { source: "atlas_copilot", runId: ctx.runId, type: "marketplace_create" },
  });

  return {
    summary: `${input.platform} için pazaryeri hesabı hazırlandı.`,
    affectedRecords: [{ type: "marketplace", id: accountId, label: input.storeName }],
    nextSuggestions: ["Müşteri 360 görünümünü yenile", "Aylık performans raporu üret"],
    customerContext: await getCustomer360(input.userId),
  };
}

async function executeUpdateMarketplace(rawInput: Record<string, unknown>, ctx: ToolExecutionContext): Promise<ToolExecutionResult> {
  const input = marketplaceUpdateSchema.parse(rawInput);
  const payload: Record<string, unknown> = {};
  if (input.status) payload.status = input.status;
  if (input.storeName) payload.store_name = input.storeName;
  if (typeof input.storeUrl !== "undefined") payload.store_url = input.storeUrl;

  const { data, error } = await adminDb()
    .from("marketplace_accounts")
    .update(payload)
    .eq("id", input.marketplaceId)
    .select("id,user_id,store_name,status")
    .single();
  if (error || !data) throw new Error(error?.message ?? "Pazaryeri hesabı güncellenemedi.");

  await createAuditLog({
    userId: ctx.requesterUserId,
    action: "admin.settings_changed",
    entityType: "setting",
    entityId: input.marketplaceId,
    metadata: { source: "atlas_copilot", runId: ctx.runId, type: "marketplace_update" },
  });

  return {
    summary: `${data.store_name} pazaryeri hesabı güncellendi.`,
    affectedRecords: [{ type: "marketplace", id: data.id, label: data.store_name }],
    nextSuggestions: ["Müşteri 360 görünümünü yenile"],
    customerContext: await getCustomer360(data.user_id),
  };
}

async function executeCreateSocial(rawInput: Record<string, unknown>, ctx: ToolExecutionContext): Promise<ToolExecutionResult> {
  const input = socialCreateSchema.parse(rawInput);
  const { data, error } = await adminDb()
    .from("social_media_accounts")
    .insert({
      user_id: input.userId,
      company_id: input.companyId ?? null,
      platform: input.platform,
      account_name: input.accountName,
      profile_url: input.profileUrl ?? null,
      status: "pending_setup",
      followers_count: 0,
      following_count: 0,
      posts_count: 0,
      engagement_rate: 0,
      managed_by_us: true,
    })
    .select("id,account_name")
    .single();
  if (error || !data) throw new Error(error?.message ?? "Sosyal medya hesabı oluşturulamadı.");

  await createAuditLog({
    userId: ctx.requesterUserId,
    action: "admin.settings_changed",
    entityType: "setting",
    entityId: data.id,
    metadata: { source: "atlas_copilot", runId: ctx.runId, type: "social_create" },
  });

  return {
    summary: `${input.platform} için sosyal medya hesabı hazırlandı.`,
    affectedRecords: [{ type: "social_account", id: data.id, label: data.account_name }],
    nextSuggestions: ["Müşteri 360 görünümünü yenile", "İçerik talebi hazırla"],
    customerContext: await getCustomer360(input.userId),
  };
}

async function executeCreateAdDraft(rawInput: Record<string, unknown>, ctx: ToolExecutionContext): Promise<ToolExecutionResult> {
  const input = adDraftSchema.parse(rawInput);
  const { data, error } = await adminDb()
    .from("ad_campaigns")
    .insert({
      user_id: input.userId,
      campaign_name: input.campaignName,
      platform: input.platform,
      campaign_type: "conversion",
      status: "draft",
      daily_budget: input.dailyBudget ?? null,
      total_budget: input.totalBudget ?? null,
      spent_amount: 0,
      impressions: 0,
      clicks: 0,
      conversions: 0,
      revenue_generated: 0,
      roas: 0,
      cpc: 0,
      ctr: 0,
    })
    .select("id,campaign_name")
    .single();
  if (error || !data) throw new Error(error?.message ?? "Reklam kampanyası taslağı oluşturulamadı.");

  await createAuditLog({
    userId: ctx.requesterUserId,
    action: "admin.settings_changed",
    entityType: "setting",
    entityId: data.id,
    metadata: { source: "atlas_copilot", runId: ctx.runId, type: "ad_campaign_draft" },
  });

  return {
    summary: `${input.campaignName} reklam kampanyası taslak olarak oluşturuldu.`,
    affectedRecords: [{ type: "ad_campaign", id: data.id, label: data.campaign_name }],
    nextSuggestions: ["Müşteri raporu üret", "Müşteriye bildirim hazırla"],
    customerContext: await getCustomer360(input.userId),
  };
}

async function executeCreateFinanceDraft(rawInput: Record<string, unknown>, ctx: ToolExecutionContext): Promise<ToolExecutionResult> {
  const input = financeDraftSchema.parse(rawInput);
  const { data, error } = await adminDb()
    .from("financial_records")
    .insert({
      user_id: input.userId,
      record_type: input.recordType,
      category: input.category,
      description: input.description,
      amount: input.amount,
      currency: "USD",
      transaction_date: new Date().toISOString().slice(0, 10),
      is_verified: false,
    })
    .select("id,description")
    .single();
  if (error || !data) throw new Error(error?.message ?? "Finans kaydı taslağı oluşturulamadı.");

  await createAuditLog({
    userId: ctx.requesterUserId,
    action: "admin.settings_changed",
    entityType: "setting",
    entityId: data.id,
    metadata: { source: "atlas_copilot", runId: ctx.runId, type: "finance_draft" },
  });

  return {
    summary: `${input.description} için finans kaydı taslağı oluşturuldu.`,
    affectedRecords: [{ type: "financial_record", id: data.id, label: data.description }],
    nextSuggestions: ["Müşteri raporu üret", "Müşteri 360 görünümünü yenile"],
    customerContext: await getCustomer360(input.userId),
  };
}

async function executeGenerateReport(rawInput: Record<string, unknown>, ctx: ToolExecutionContext): Promise<ToolExecutionResult> {
  const input = customerReportSchema.parse(rawInput);
  const report = await buildCustomerReport({
    userId: input.userId,
    title: input.title,
    reportType: input.reportType ?? "sales",
  });

  const artifact = await createArtifact({
    runId: ctx.runId,
    customerId: input.userId,
    artifactType: "report",
    title: input.title,
    content: report.content,
    channel: "internal",
    metadata: {
      reportId: report.reportId,
      reportType: input.reportType ?? "sales",
      summary: report.summary,
    },
  });

  return {
    summary: `${input.title} raporu üretildi ve taslak artifact olarak kaydedildi.`,
    details: report.summary,
    affectedRecords: [
      ...(report.reportId ? [{ type: "report", id: report.reportId, label: input.title }] : []),
      { type: "artifact", id: artifact.id, label: artifact.title },
    ],
    nextSuggestions: ["Müşteri portalına gönder", "Müşteriye bildirim gönder"],
    customerContext: await getCustomer360(input.userId),
    artifactIds: [artifact.id],
  };
}

async function executePublishArtifact(rawInput: Record<string, unknown>, ctx: ToolExecutionContext): Promise<ToolExecutionResult> {
  const input = publishArtifactSchema.parse(rawInput);
  if (!input.artifactId) {
    throw new Error("Gönderilecek artifact belirtilmedi.");
  }

  const delivery = await deliverArtifactToCustomer({
    artifactId: input.artifactId,
    customerId: input.customerId,
    channel: input.channel ?? "portal",
  }, { runId: ctx.runId });

  return {
    summary: `${delivery.artifact.title} müşteri kanalına gönderildi.`,
    affectedRecords: [
      { type: "artifact", id: delivery.artifact.id, label: delivery.artifact.title },
      ...delivery.deliveryIds.map(id => ({ type: "delivery", id })),
      ...(delivery.notificationId ? [{ type: "notification", id: delivery.notificationId }] : []),
    ],
    nextSuggestions: ["Müşteri 360 görünümünü yenile", "Yeni rapor üret"],
    customerContext: await getCustomer360(input.customerId),
    artifactIds: [delivery.artifact.id],
  };
}

async function executeSendNotification(rawInput: Record<string, unknown>, ctx: ToolExecutionContext): Promise<ToolExecutionResult> {
  const input = notificationSchema.parse(rawInput);
  const artifact = await createArtifact({
    runId: ctx.runId,
    customerId: input.customerId,
    artifactType: "notification_draft",
    title: input.title,
    content: input.body,
    channel: "internal",
    metadata: { channel: input.channel ?? "in_app" },
  });

  const delivery = await deliverArtifactToCustomer({
    customerId: input.customerId,
    artifactId: artifact.id,
    channel: input.channel ?? "in_app",
  }, {
    runId: ctx.runId,
    title: input.title,
    content: input.body,
  });

  return {
    summary: "Müşteri bildirimi gönderildi ve artifact olarak kaydedildi.",
    affectedRecords: [
      { type: "artifact", id: artifact.id, label: artifact.title },
      ...delivery.deliveryIds.map(id => ({ type: "delivery", id })),
      ...(delivery.notificationId ? [{ type: "notification", id: delivery.notificationId }] : []),
    ],
    nextSuggestions: ["Müşteri 360 görünümünü yenile", "Rapor oluştur"],
    customerContext: await getCustomer360(input.customerId),
    artifactIds: [artifact.id],
  };
}

async function executeCreateTasks(rawInput: Record<string, unknown>): Promise<ToolExecutionResult> {
  const input = createTasksSchema.parse(rawInput);
  const taskIds = await ensureOnboardingTasks(input.userId);

  return {
    summary: "Onboarding görevleri hazır.",
    affectedRecords: taskIds.map(id => ({ type: "task", id })),
    nextSuggestions: ["Görevleri müşteriyle paylaş", "Müşteri 360 görünümünü yenile"],
    customerContext: await getCustomer360(input.userId),
  };
}

async function executeUpdateTask(rawInput: Record<string, unknown>, ctx: ToolExecutionContext): Promise<ToolExecutionResult> {
  const input = updateTaskSchema.parse(rawInput);
  const { data, error } = await adminDb()
    .from("process_tasks")
    .update({
      task_status: input.status,
      notes: input.notes ?? null,
      completed_at: input.status === "completed" ? new Date().toISOString() : null,
    })
    .eq("id", input.taskId)
    .select("id,user_id,task_name")
    .single();
  if (error || !data) throw new Error(error?.message ?? "Görev güncellenemedi.");

  await createAuditLog({
    userId: ctx.requesterUserId,
    action: "admin.settings_changed",
    entityType: "setting",
    entityId: data.id,
    metadata: { source: "atlas_copilot", runId: ctx.runId, type: "task_update", status: input.status },
  });

  return {
    summary: `${data.task_name} görevi "${input.status}" olarak güncellendi.`,
    affectedRecords: [{ type: "task", id: data.id, label: data.task_name }],
    nextSuggestions: ["Müşteri 360 görünümünü yenile", "Açık görevleri incele"],
    customerContext: await getCustomer360(data.user_id),
  };
}

async function executeDocumentRequest(rawInput: Record<string, unknown>, ctx: ToolExecutionContext): Promise<ToolExecutionResult> {
  const input = documentSchema.parse(rawInput);
  const artifact = await createArtifact({
    runId: ctx.runId,
    customerId: input.customerId,
    artifactType: "document_request",
    title: input.title ?? "Belge Talebi",
    content: input.description ?? "Müşteri hesabına belge talebi gönderimi için taslak oluşturuldu.",
    channel: "internal",
    metadata: { customerId: input.customerId },
  });

  return {
    summary: "Belge talebi taslağı oluşturuldu.",
    affectedRecords: [{ type: "artifact", id: artifact.id, label: artifact.title }],
    nextSuggestions: ["Müşteri portalına gönder", "Müşteriye bildirim gönder"],
    customerContext: await getCustomer360(input.customerId),
    artifactIds: [artifact.id],
  };
}

async function executeGlobalSummary(): Promise<ToolExecutionResult> {
  const dashboard = await getDashboardData();
  const client = adminDb();
  const [taskRes, companyRes, marketplaceRes] = await Promise.all([
    client.from("process_tasks").select("id,user_id,task_status,task_name").neq("task_status", "completed"),
    client.from("customer_companies").select("id,user_id,status").neq("status", "active"),
    client.from("marketplace_accounts").select("id,user_id,status,platform").neq("status", "active"),
  ]);

  const criticalUserIds = new Set<string>();
  for (const row of taskRes.data ?? []) criticalUserIds.add(row.user_id);
  for (const row of companyRes.data ?? []) criticalUserIds.add(row.user_id);
  for (const row of marketplaceRes.data ?? []) criticalUserIds.add(row.user_id);

  const criticalLabels = await Promise.all(Array.from(criticalUserIds).slice(0, 5).map(getUserLabel));

  return {
    summary: `${dashboard.customers.length} müşteri, ${dashboard.pendingApprovals.length} bekleyen onay, ${dashboard.recentArtifacts.length} son artifact, ${criticalUserIds.size} kritik müşteri sinyali tespit edildi.`,
    details: criticalLabels.length > 0
      ? `Öne çıkan kritik müşteri hesapları: ${criticalLabels.join(", ")}`
      : "Kritik müşteri sinyali bulunamadı.",
    affectedRecords: dashboard.pendingApprovals.map(approval => ({
      type: "approval",
      id: approval.id,
      label: approval.title,
    })),
    nextSuggestions: [
      "Bekleyen onayları incele",
      "Bir müşteri seçip 360 görünüm aç",
      "Aylık rapor üret",
    ],
    customerContext: {
      customerCount: dashboard.customers.length,
      pendingApprovalCount: dashboard.pendingApprovals.length,
      recentRunCount: dashboard.recentRuns.length,
      criticalCustomers: criticalLabels,
    },
  };
}

const handlers: Record<CommandIntent, (input: Record<string, unknown>, ctx: ToolExecutionContext) => Promise<ToolExecutionResult>> = {
  "customer.create_account": (input, ctx) => executeProvisionCustomer(input as unknown as ProvisionCustomerInput, ctx),
  "customer.update_profile": executeUpdateProfile,
  "customer.get_360": executeGetCustomer360,
  "customer.change_onboarding_status": executeChangeOnboarding,
  "company.create_llc": (input, ctx) => executeCreateCompany(input as unknown as CreateCompanyInput, ctx),
  "company.update_status": executeUpdateCompanyStatus,
  "marketplace.create_account": (input, ctx) => executeCreateMarketplace(input as unknown as CreateMarketplaceInput, ctx),
  "marketplace.update_account": executeUpdateMarketplace,
  "social.create_account": executeCreateSocial,
  "advertising.create_campaign_draft": executeCreateAdDraft,
  "finance.create_record_draft": executeCreateFinanceDraft,
  "report.generate_customer_report": executeGenerateReport,
  "artifact.publish_to_customer_portal": executePublishArtifact,
  "notification.send_to_customer": executeSendNotification,
  "task.create_onboarding_tasks": executeCreateTasks,
  "task.update_process_task": executeUpdateTask,
  "document.request_or_attach": executeDocumentRequest,
  "system.agent_task": async () => {
    throw new Error("system.agent_task intent'i doğrudan executeIntent üzerinden çalıştırılamaz.");
  },
  "system.global_summary": async (_input, _ctx) => executeGlobalSummary(),
  "system.unsupported": async () => {
    throw new Error("Bu mesaj doğrudan bir işlem olarak çözülemedi.");
  },
};

export async function executeIntent(
  intent: CommandIntent,
  input: Record<string, unknown>,
  ctx: ToolExecutionContext,
): Promise<ToolExecutionResult> {
  const handler = handlers[intent];
  if (!handler) {
    throw new Error(`Handler tanımlı değil: ${intent}`);
  }

  return handler(input, ctx);
}
