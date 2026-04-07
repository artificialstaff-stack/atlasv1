/* eslint-disable @typescript-eslint/no-explicit-any */
import { createAdminClient } from "@/lib/supabase/admin";
import type {
  CopilotApprovalRecord,
  CopilotArtifactRecord,
  CopilotConversationRecord,
  CopilotConversationMemoryRecord,
  CopilotDashboardData,
  CopilotDeliveryRecord,
  CopilotMode,
  CopilotRunRecord,
  CopilotScope,
  CopilotTimelineStep,
  CopilotWorkspaceStatus,
} from "./types";

function db() {
  return createAdminClient() as any;
}

export function applyScopeRefFilter<TQuery extends { eq: (...args: any[]) => TQuery; is: (...args: any[]) => TQuery }>(
  query: TQuery,
  scopeRefId?: string | null,
) {
  return scopeRefId ? query.eq("scope_ref_id", scopeRefId) : query.is("scope_ref_id", null);
}

function mapRun(row: any): CopilotRunRecord {
  return {
    id: row.id,
    sessionId: row.session_id,
    requesterUserId: row.requester_user_id,
    mode: row.mode,
    scopeType: row.scope_type,
    scopeRefId: row.scope_ref_id,
    commandText: row.command_text,
    intent: row.intent,
    toolName: row.tool_name,
    toolInput: row.tool_input ?? {},
    status: row.status,
    requiresApproval: row.requires_approval,
    summary: row.summary,
    responseText: row.response_text,
    metadata: row.metadata ?? {},
    createdAt: row.created_at,
    completedAt: row.completed_at,
  };
}

function mapStep(row: any): CopilotTimelineStep {
  return {
    id: row.id,
    title: row.title,
    status: row.status,
    detail: row.payload?.detail ?? row.payload?.summary ?? null,
    payload: row.payload ?? {},
    createdAt: row.created_at,
    completedAt: row.completed_at,
  };
}

function mapApproval(row: any): CopilotApprovalRecord {
  return {
    id: row.id,
    runId: row.run_id,
    title: row.title,
    description: row.description,
    status: row.status,
    approvalType: row.approval_type,
    toolName: row.tool_name,
    createdAt: row.created_at,
    decidedAt: row.decided_at,
    decisionNote: row.decision_note,
    payload: row.payload ?? {},
  };
}

function mapArtifact(row: any): CopilotArtifactRecord {
  return {
    id: row.id,
    runId: row.run_id,
    customerId: row.customer_id,
    artifactType: row.artifact_type,
    title: row.title,
    content: row.content,
    status: row.status,
    channel: row.channel,
    metadata: row.metadata ?? {},
    createdAt: row.created_at,
    publishedAt: row.published_at,
  };
}

function mapDelivery(row: any): CopilotDeliveryRecord {
  return {
    id: row.id,
    artifactId: row.artifact_id,
    runId: row.run_id,
    customerId: row.customer_id,
    targetType: row.target_type,
    status: row.status,
    targetRef: row.target_ref,
    metadata: row.metadata ?? {},
    deliveredAt: row.delivered_at,
    createdAt: row.created_at,
  };
}

export async function ensureSession(
  requesterUserId: string,
  scope: CopilotScope,
  conversationId?: string | null,
): Promise<string> {
  const client = db();
  let existingQuery = applyScopeRefFilter(
    client
    .from("ai_sessions")
    .select("id")
    .eq("requester_user_id", requesterUserId)
    .eq("scope_type", scope.type)
    .eq("status", "active")
    .order("created_at", { ascending: false })
    .limit(1),
    scope.refId,
  );

  if (conversationId) {
    existingQuery = existingQuery.contains("metadata", { conversationId });
  }

  const { data: existing } = await existingQuery.maybeSingle();

  if (existing?.id) {
    return existing.id as string;
  }

  const { data, error } = await client
    .from("ai_sessions")
    .insert({
      requester_user_id: requesterUserId,
      scope_type: scope.type,
      scope_ref_id: scope.refId ?? null,
      title: scope.label ?? null,
      metadata: {
        source: "atlas-admin-copilot",
        ...(conversationId ? { conversationId } : {}),
      },
      last_run_at: new Date().toISOString(),
    })
    .select("id")
    .single();

  if (error || !data?.id) {
    throw new Error(error?.message ?? "AI oturumu oluşturulamadı.");
  }

  return data.id as string;
}

export async function createRun(input: {
  sessionId: string;
  requesterUserId: string;
  mode: CopilotMode;
  scope: CopilotScope;
  commandText: string;
  intent: string;
  toolName?: string;
  toolInput?: Record<string, unknown>;
  requiresApproval?: boolean;
  metadata?: Record<string, unknown>;
  idempotencyKey?: string;
}): Promise<CopilotRunRecord> {
  const client = db();
  const { data, error } = await client
    .from("ai_runs")
    .insert({
      session_id: input.sessionId,
      requester_user_id: input.requesterUserId,
      mode: input.mode,
      scope_type: input.scope.type,
      scope_ref_id: input.scope.refId ?? null,
      command_text: input.commandText,
      intent: input.intent,
      tool_name: input.toolName ?? null,
      tool_input: input.toolInput ?? {},
      requires_approval: input.requiresApproval ?? false,
      status: "running",
      metadata: input.metadata ?? {},
      idempotency_key: input.idempotencyKey ?? null,
    })
    .select("*")
    .single();

  if (error || !data) {
    if (input.idempotencyKey) {
      const { data: existing } = await client
        .from("ai_runs")
        .select("*")
        .eq("idempotency_key", input.idempotencyKey)
        .maybeSingle();
      if (existing) {
        return mapRun(existing);
      }
    }
    throw new Error(error?.message ?? "AI run kaydı oluşturulamadı.");
  }

  await client
    .from("ai_sessions")
    .update({ last_run_at: data.created_at })
    .eq("id", input.sessionId);

  return mapRun(data);
}

export async function appendRunStep(input: {
  runId: string;
  stepOrder: number;
  stepType: string;
  title: string;
  status?: CopilotTimelineStep["status"];
  payload?: Record<string, unknown>;
}): Promise<CopilotTimelineStep> {
  const { data, error } = await db()
    .from("ai_run_steps")
    .insert({
      run_id: input.runId,
      step_order: input.stepOrder,
      step_type: input.stepType,
      title: input.title,
      status: input.status ?? "pending",
      payload: input.payload ?? {},
      completed_at:
        input.status === "completed" || input.status === "failed" ? new Date().toISOString() : null,
    })
    .select("*")
    .single();

  if (error || !data) {
    throw new Error(error?.message ?? "AI run adımı yazılamadı.");
  }

  return mapStep(data);
}

export async function updateRun(
  runId: string,
  patch: Partial<{
    status: CopilotRunRecord["status"];
    summary: string;
    responseText: string;
    metadata: Record<string, unknown>;
    completedAt: string | null;
  }>,
): Promise<CopilotRunRecord> {
  const { data, error } = await db()
    .from("ai_runs")
    .update({
      status: patch.status,
      summary: patch.summary,
      response_text: patch.responseText,
      metadata: patch.metadata,
      completed_at: patch.completedAt ?? (patch.status && patch.status !== "running" ? new Date().toISOString() : null),
    })
    .eq("id", runId)
    .select("*")
    .single();

  if (error || !data) {
    throw new Error(error?.message ?? "AI run güncellenemedi.");
  }

  return mapRun(data);
}

export async function updateSessionConversationState(input: {
  sessionId: string;
  suggestedTitle?: string | null;
  metadataPatch?: Record<string, unknown>;
  lastRunAt?: string | null;
}): Promise<void> {
  const client = db();
  const { data: session, error: sessionError } = await client
    .from("ai_sessions")
    .select("title,metadata")
    .eq("id", input.sessionId)
    .maybeSingle();

  if (sessionError) {
    throw new Error(sessionError.message ?? "Sohbet oturumu güncellenemedi.");
  }

  if (!session) {
    return;
  }

  const currentTitle =
    typeof session.title === "string" && session.title.trim().length > 0
      ? session.title.trim()
      : null;

  const { error } = await client
    .from("ai_sessions")
    .update({
      title: currentTitle ?? input.suggestedTitle ?? null,
      metadata: {
        ...(session.metadata ?? {}),
        ...(input.metadataPatch ?? {}),
      },
      last_run_at: input.lastRunAt ?? new Date().toISOString(),
    })
    .eq("id", input.sessionId);

  if (error) {
    throw new Error(error.message ?? "Sohbet hafızası kaydedilemedi.");
  }
}

export async function createApproval(input: {
  runId: string;
  stepId?: string | null;
  toolName: string;
  scope: CopilotScope;
  approvalType: CopilotApprovalRecord["approvalType"];
  requestedBy: string;
  title: string;
  description: string;
  payload: Record<string, unknown>;
}): Promise<CopilotApprovalRecord> {
  const { data, error } = await db()
    .from("ai_approvals")
    .insert({
      run_id: input.runId,
      step_id: input.stepId ?? null,
      tool_name: input.toolName,
      scope_type: input.scope.type,
      scope_ref_id: input.scope.refId ?? null,
      approval_type: input.approvalType,
      requested_by: input.requestedBy,
      title: input.title,
      description: input.description,
      payload: input.payload,
    })
    .select("*")
    .single();

  if (error || !data) {
    throw new Error(error?.message ?? "Approval oluşturulamadı.");
  }

  return mapApproval(data);
}

export async function resolveApproval(
  approvalId: string,
  decision: "approved" | "rejected",
  decidedBy: string,
  decisionNote?: string,
): Promise<CopilotApprovalRecord> {
  const { data, error } = await db()
    .from("ai_approvals")
    .update({
      status: decision,
      decided_by: decidedBy,
      decision_note: decisionNote ?? null,
      decided_at: new Date().toISOString(),
    })
    .eq("id", approvalId)
    .select("*")
    .single();

  if (error || !data) {
    throw new Error(error?.message ?? "Approval çözümlenemedi.");
  }

  return mapApproval(data);
}

export async function createArtifact(input: {
  runId: string;
  customerId?: string | null;
  artifactType: CopilotArtifactRecord["artifactType"];
  title: string;
  content: string;
  channel?: CopilotArtifactRecord["channel"];
  metadata?: Record<string, unknown>;
}): Promise<CopilotArtifactRecord> {
  const { data, error } = await db()
    .from("ai_artifacts")
    .insert({
      run_id: input.runId,
      customer_id: input.customerId ?? null,
      artifact_type: input.artifactType,
      title: input.title,
      content: input.content,
      channel: input.channel ?? "internal",
      metadata: input.metadata ?? {},
    })
    .select("*")
    .single();

  if (error || !data) {
    throw new Error(error?.message ?? "Artifact oluşturulamadı.");
  }

  return mapArtifact(data);
}

export async function publishArtifact(
  artifactId: string,
  channel: CopilotArtifactRecord["channel"],
): Promise<CopilotArtifactRecord> {
  const { data, error } = await db()
    .from("ai_artifacts")
    .update({
      status: "published",
      channel,
      published_at: new Date().toISOString(),
    })
    .eq("id", artifactId)
    .select("*")
    .single();

  if (error || !data) {
    throw new Error(error?.message ?? "Artifact publish edilemedi.");
  }

  return mapArtifact(data);
}

export async function createDelivery(input: {
  artifactId: string;
  runId?: string | null;
  customerId?: string | null;
  targetType: CopilotDeliveryRecord["targetType"];
  status?: CopilotDeliveryRecord["status"];
  targetRef?: string | null;
  metadata?: Record<string, unknown>;
}): Promise<CopilotDeliveryRecord> {
  const { data, error } = await db()
    .from("ai_deliveries")
    .insert({
      artifact_id: input.artifactId,
      run_id: input.runId ?? null,
      customer_id: input.customerId ?? null,
      target_type: input.targetType,
      status: input.status ?? "pending",
      target_ref: input.targetRef ?? null,
      metadata: input.metadata ?? {},
      delivered_at: input.status === "delivered" ? new Date().toISOString() : null,
    })
    .select("*")
    .single();

  if (error || !data) {
    throw new Error(error?.message ?? "Delivery oluşturulamadı.");
  }

  return mapDelivery(data);
}

export async function getRunBundle(runId: string): Promise<{
  run: CopilotRunRecord | null;
  timeline: CopilotTimelineStep[];
  approvals: CopilotApprovalRecord[];
  artifacts: CopilotArtifactRecord[];
  deliveries: CopilotDeliveryRecord[];
}> {
  const client = db();
  const [runRes, stepsRes, approvalsRes, artifactsRes] = await Promise.all([
    client.from("ai_runs").select("*").eq("id", runId).maybeSingle(),
    client.from("ai_run_steps").select("*").eq("run_id", runId).order("step_order"),
    client.from("ai_approvals").select("*").eq("run_id", runId).order("created_at"),
    client.from("ai_artifacts").select("*").eq("run_id", runId).order("created_at"),
  ]);

  const artifactIds = (artifactsRes.data ?? []).map((artifact: any) => artifact.id);
  const deliveriesRes = artifactIds.length
    ? await client.from("ai_deliveries").select("*").in("artifact_id", artifactIds).order("created_at")
    : { data: [] };

  return {
    run: runRes.data ? mapRun(runRes.data) : null,
    timeline: (stepsRes.data ?? []).map(mapStep),
    approvals: (approvalsRes.data ?? []).map(mapApproval),
    artifacts: (artifactsRes.data ?? []).map(mapArtifact),
    deliveries: (deliveriesRes.data ?? []).map(mapDelivery),
  };
}

export async function getDashboardData(): Promise<CopilotDashboardData> {
  const client = db();
  const [approvalsRes, runsRes, artifactsRes, customersRes] = await Promise.all([
    client.from("ai_approvals").select("*").eq("status", "pending").order("created_at", { ascending: true }).limit(20),
    client.from("ai_runs").select("*").order("created_at", { ascending: false }).limit(20),
    client.from("ai_artifacts").select("*").order("created_at", { ascending: false }).limit(20),
    client.from("users").select("id,email,first_name,last_name,company_name,onboarding_status").order("created_at", { ascending: false }).limit(100),
  ]);

  return {
    pendingApprovals: (approvalsRes.data ?? []).map(mapApproval),
    recentRuns: (runsRes.data ?? []).map(mapRun),
    recentArtifacts: (artifactsRes.data ?? []).map(mapArtifact),
    customers: (customersRes.data ?? []).map((customer: any) => ({
      id: customer.id,
      label: [customer.first_name, customer.last_name].filter(Boolean).join(" ").trim() || customer.company_name || customer.email,
      email: customer.email,
      onboardingStatus: customer.onboarding_status,
    })),
  };
}

function getMetadataString(metadata: Record<string, unknown> | null | undefined, key: string) {
  const value = metadata?.[key];
  return typeof value === "string" && value.trim().length > 0 ? value : null;
}

function getMetadataStringArray(metadata: Record<string, unknown> | null | undefined, key: string) {
  const value = metadata?.[key];
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string" && item.trim().length > 0)
    : [];
}

function getMetadataWorkspaceStatus(metadata: Record<string, unknown> | null | undefined): CopilotWorkspaceStatus {
  const value = metadata?.workspaceStatus;
  if (value === "claimed" || value === "handoff_ready" || value === "shared") {
    return value;
  }

  return "unclaimed";
}

function getConversationGeneration(run: CopilotRunRecord | null | undefined): CopilotConversationRecord["generation"] {
  const executionPath = typeof run?.metadata?.executionPath === "string" ? run.metadata.executionPath : null;
  const quality = run?.metadata?.quality;
  const qualityPassed =
    Boolean(quality)
    && typeof quality === "object"
    && (quality as Record<string, unknown>).passed === true;

  return executionPath === "orchestrator-first" && qualityPassed ? "current" : "legacy";
}

export async function getLatestSessionRun(sessionId: string): Promise<CopilotRunRecord | null> {
  const { data, error } = await db()
    .from("ai_runs")
    .select("*")
    .eq("session_id", sessionId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw new Error(error.message ?? "Oturumun son run kaydı okunamadı.");
  }

  return data ? mapRun(data) : null;
}

export async function getActiveSessionRuns(
  requesterUserId: string,
  scope: CopilotScope,
  limit = 20,
  conversationId?: string | null,
): Promise<CopilotRunRecord[]> {
  const client = db();
  let sessionQuery = applyScopeRefFilter(
    client
    .from("ai_sessions")
    .select("id")
    .eq("requester_user_id", requesterUserId)
    .eq("scope_type", scope.type)
    .eq("status", "active")
    .order("created_at", { ascending: false })
    .limit(1),
    scope.refId,
  );

  if (conversationId) {
    sessionQuery = sessionQuery.contains("metadata", { conversationId });
  }

  const { data: session, error: sessionError } = await sessionQuery.maybeSingle();

  if (sessionError) {
    throw new Error(sessionError.message ?? "Aktif AI oturumu okunamadı.");
  }

  if (!session?.id) {
    return [];
  }

  const { data, error } = await client
    .from("ai_runs")
    .select("*")
    .eq("session_id", session.id)
    .order("created_at", { ascending: true })
    .limit(limit);

  if (error) {
    throw new Error(error.message ?? "AI konuşma geçmişi okunamadı.");
  }

  return (data ?? []).map(mapRun);
}

export async function getConversationRuns(
  _requesterUserId: string,
  conversationId: string,
  limit = 24,
): Promise<CopilotRunRecord[]> {
  const client = db();
  const { data: sessions, error: sessionError } = await client
    .from("ai_sessions")
    .select("id")
    .eq("status", "active")
    .contains("metadata", { conversationId })
    .order("created_at", { ascending: true })
    .limit(12);

  if (sessionError) {
    throw new Error(sessionError.message ?? "Sohbet oturumları okunamadı.");
  }

  const sessionIds = (sessions ?? [])
    .map((session: any) => session.id)
    .filter((value: unknown): value is string => typeof value === "string" && value.length > 0);

  if (sessionIds.length === 0) {
    return [];
  }

  const { data, error } = await client
    .from("ai_runs")
    .select("*")
    .in("session_id", sessionIds)
    .order("created_at", { ascending: true })
    .limit(limit);

  if (error) {
    throw new Error(error.message ?? "Sohbet geçmişi okunamadı.");
  }

  return (data ?? []).map(mapRun);
}

export async function getConversationMemory(
  requesterUserId: string,
  conversationId: string,
): Promise<CopilotConversationMemoryRecord | null> {
  const client = db();
  const { data: session, error: sessionError } = await client
    .from("ai_sessions")
    .select("id,title,scope_type,scope_ref_id,metadata,updated_at")
    .eq("status", "active")
    .contains("metadata", { conversationId })
    .order("last_run_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (sessionError) {
    throw new Error(sessionError.message ?? "Sohbet hafızası okunamadı.");
  }

  if (!session) {
    return null;
  }

  const metadata = (session.metadata ?? {}) as Record<string, unknown>;
  const workspaceOwnerId = getMetadataString(metadata, "workspaceOwnerId");
  const workspaceOwnerEmail = getMetadataString(metadata, "workspaceOwnerEmail");

  return {
    conversationId,
    sessionId: session.id,
    title:
      (typeof session.title === "string" && session.title.trim().length > 0 ? session.title.trim() : null)
      ?? getMetadataString(metadata, "conversationTitle")
      ?? "Yeni sohbet",
    scopeType: session.scope_type,
    scopeRefId: session.scope_ref_id ?? null,
    scopeLabel: getMetadataString(metadata, "scopeLabel"),
    projectId: getMetadataString(metadata, "projectId"),
    projectName: getMetadataString(metadata, "projectName"),
    workingGoal: getMetadataString(metadata, "workingGoal"),
    memorySummary: getMetadataString(metadata, "memorySummary"),
    memoryFacts: getMetadataStringArray(metadata, "memoryFacts"),
    handoffNote: getMetadataString(metadata, "handoffNote"),
    handoffChecklist: getMetadataStringArray(metadata, "handoffChecklist"),
    workspaceStatus: getMetadataWorkspaceStatus(metadata),
    workspaceOwnerId,
    workspaceOwnerLabel: getMetadataString(metadata, "workspaceOwnerLabel"),
    workspaceOwnerEmail,
    workspaceClaimedAt: getMetadataString(metadata, "workspaceClaimedAt"),
    ownerIsCurrentAdmin: workspaceOwnerId === requesterUserId,
    operatorJobStatus: (getMetadataString(metadata, "operatorJobStatus") as CopilotConversationMemoryRecord["operatorJobStatus"]) ?? null,
    updatedAt: session.updated_at ?? new Date().toISOString(),
  };
}

export async function getRecentConversations(
  requesterUserId: string,
  limit = 16,
): Promise<CopilotConversationRecord[]> {
  const client = db();
  const { data: sessions, error: sessionError } = await client
    .from("ai_sessions")
    .select("id,title,scope_type,scope_ref_id,metadata,last_run_at,created_at")
    .eq("status", "active")
    .order("last_run_at", { ascending: false })
    .limit(limit);

  if (sessionError) {
    throw new Error(sessionError.message ?? "Sohbet oturumları okunamadı.");
  }

  const sessionRows = (sessions ?? []) as Array<{
    id: string;
    title?: string | null;
    scope_type: CopilotScope["type"];
    scope_ref_id?: string | null;
    metadata?: Record<string, unknown> | null;
    last_run_at?: string | null;
    created_at: string;
  }>;

  const sessionIds = sessionRows
    .map((session) => session.id)
    .filter((value): value is string => typeof value === "string" && value.length > 0);

  if (sessionIds.length === 0) {
    return [];
  }

  const { data: runs, error: runsError } = await client
    .from("ai_runs")
    .select("*")
    .in("session_id", sessionIds)
    .order("created_at", { ascending: false });

  if (runsError) {
    throw new Error(runsError.message ?? "Sohbet run geçmişi okunamadı.");
  }

  const latestRunBySession = new Map<string, CopilotRunRecord>();
  for (const row of (runs ?? [])) {
    const mapped = mapRun(row);
    if (!latestRunBySession.has(mapped.sessionId)) {
      latestRunBySession.set(mapped.sessionId, mapped);
    }
  }

  const conversationRecords = sessionRows.map((session) => {
    const metadata = (session.metadata ?? {}) as Record<string, unknown>;
    const latestRun = latestRunBySession.get(session.id) ?? null;
    const scopeLabel =
      typeof metadata.scopeLabel === "string"
        ? metadata.scopeLabel
        : typeof session.title === "string" && session.title.trim().length > 0
          ? session.title
          : null;
    const title =
      latestRun?.commandText?.trim()
      || (typeof session.title === "string" && session.title.trim().length > 0 ? session.title.trim() : "")
      || scopeLabel
      || "Yeni sohbet";
    const preview =
      latestRun?.responseText?.trim()
      || latestRun?.summary?.trim()
      || null;
    const conversationId =
      typeof metadata.conversationId === "string" && metadata.conversationId.trim().length > 0
        ? metadata.conversationId
        : session.id;
    const status: CopilotConversationRecord["status"] =
      latestRun?.status === "completed"
      || latestRun?.status === "failed"
      || latestRun?.status === "rejected"
      || latestRun?.status === "running"
      || latestRun?.status === "awaiting_approval"
        ? latestRun.status
        : "idle";
    const workspaceOwnerId = getMetadataString(metadata, "workspaceOwnerId");
    const workspaceOwnerEmail = getMetadataString(metadata, "workspaceOwnerEmail");

    return {
      id: conversationId,
      conversationId,
      sessionId: session.id,
      scopeType: session.scope_type,
      scopeRefId: session.scope_ref_id ?? null,
      scopeLabel,
      title,
      preview,
      lastCommandText: latestRun?.commandText ?? null,
      lastRunAt: latestRun?.createdAt ?? session.last_run_at ?? session.created_at,
      status,
      runId: latestRun?.id ?? null,
      generation: getConversationGeneration(latestRun),
      projectId: getMetadataString(metadata, "projectId"),
      projectName: getMetadataString(metadata, "projectName"),
      workingGoal: getMetadataString(metadata, "workingGoal"),
      memorySummary: getMetadataString(metadata, "memorySummary"),
      memoryFacts: getMetadataStringArray(metadata, "memoryFacts"),
      handoffNote: getMetadataString(metadata, "handoffNote"),
      handoffChecklist: getMetadataStringArray(metadata, "handoffChecklist"),
      workspaceStatus: getMetadataWorkspaceStatus(metadata),
      workspaceOwnerId,
      workspaceOwnerLabel: getMetadataString(metadata, "workspaceOwnerLabel"),
      workspaceOwnerEmail,
      workspaceClaimedAt: getMetadataString(metadata, "workspaceClaimedAt"),
      ownerIsCurrentAdmin: workspaceOwnerId === requesterUserId,
      operatorJobStatus: (getMetadataString(metadata, "operatorJobStatus") as CopilotConversationRecord["operatorJobStatus"]) ?? null,
    };
  });

  const dedupedConversations = new Map<string, CopilotConversationRecord>();
  for (const record of conversationRecords) {
    const current = dedupedConversations.get(record.conversationId);
    if (!current) {
      dedupedConversations.set(record.conversationId, record);
      continue;
    }

    const currentTime = new Date(current.lastRunAt ?? 0).getTime();
    const nextTime = new Date(record.lastRunAt ?? 0).getTime();
    if (nextTime >= currentTime) {
      dedupedConversations.set(record.conversationId, record);
    }
  }

  return [...dedupedConversations.values()].sort((left, right) => {
    const leftTime = new Date(left.lastRunAt ?? 0).getTime();
    const rightTime = new Date(right.lastRunAt ?? 0).getTime();
    return rightTime - leftTime;
  });
}

export async function updateConversationMemoryState(input: {
  conversationId: string;
  suggestedTitle?: string | null;
  metadataPatch?: Record<string, unknown>;
  lastRunAt?: string | null;
}) {
  const client = db();
  const { data: sessions, error: sessionError } = await client
    .from("ai_sessions")
    .select("id")
    .eq("status", "active")
    .contains("metadata", { conversationId: input.conversationId });

  if (sessionError) {
    throw new Error(sessionError.message ?? "Sohbet hafizasi toplu guncellenemedi.");
  }

  const sessionIds = (sessions ?? [])
    .map((session: any) => session.id)
    .filter((value: unknown): value is string => typeof value === "string" && value.length > 0);

  await Promise.all(sessionIds.map((sessionId: string) => updateSessionConversationState({
    sessionId,
    suggestedTitle: input.suggestedTitle ?? null,
    metadataPatch: input.metadataPatch ?? {},
    lastRunAt: input.lastRunAt ?? null,
  })));
}

