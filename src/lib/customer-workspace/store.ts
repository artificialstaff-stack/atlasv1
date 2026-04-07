import { randomUUID } from "node:crypto";
import { promises as fs } from "node:fs";
import path from "node:path";
import { createAdminClient } from "@/lib/supabase/admin";
import { resolveAtlasOutputPath } from "@/lib/runtime-paths";
import type { Json, Tables } from "@/types/database";
import type {
  CustomerDeliverable,
  CustomerRequestThread,
  CustomerRequestMessage,
  CustomerRequestThreadStatus,
  CustomerRequestThreadType,
  CustomerWorkstreamKey,
} from "./types";

type AdminClient = ReturnType<typeof createAdminClient>;
type RequestThreadRow = Tables<"customer_request_threads">;
type RequestMessageRow = Tables<"customer_request_messages">;
type DeliverableRow = Tables<"customer_deliverables">;
type LocalWorkspaceStore = {
  threads: RequestThreadRow[];
  messages: RequestMessageRow[];
  deliverables: DeliverableRow[];
  updatedAt: string | null;
};

const EMPTY_LOCAL_STORE: LocalWorkspaceStore = {
  threads: [],
  messages: [],
  deliverables: [],
  updatedAt: null,
};

function adminDb() {
  return createAdminClient() as AdminClient;
}

function isMissingRelationError(error: unknown) {
  if (!error || typeof error !== "object") {
    return false;
  }

  const candidate = error as { code?: string; message?: string; details?: string };
  const message = `${candidate.message ?? ""} ${candidate.details ?? ""}`.toLowerCase();

  return candidate.code === "42P01"
    || message.includes("does not exist")
    || message.includes("schema cache")
    || message.includes("could not find the table");
}

function getLocalWorkspaceStorePath() {
  return resolveAtlasOutputPath("customer-workspace", "observer-store.json");
}

async function ensureLocalWorkspaceStoreDir() {
  await fs.mkdir(path.dirname(getLocalWorkspaceStorePath()), { recursive: true });
}

async function readLocalWorkspaceStore(): Promise<LocalWorkspaceStore> {
  await ensureLocalWorkspaceStoreDir();

  try {
    const raw = await fs.readFile(getLocalWorkspaceStorePath(), "utf8");
    const parsed = JSON.parse(raw) as Partial<LocalWorkspaceStore>;

    return {
      threads: Array.isArray(parsed.threads) ? parsed.threads as RequestThreadRow[] : [],
      messages: Array.isArray(parsed.messages) ? parsed.messages as RequestMessageRow[] : [],
      deliverables: Array.isArray(parsed.deliverables) ? parsed.deliverables as DeliverableRow[] : [],
      updatedAt: typeof parsed.updatedAt === "string" ? parsed.updatedAt : null,
    };
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return { ...EMPTY_LOCAL_STORE };
    }

    return { ...EMPTY_LOCAL_STORE };
  }
}

async function writeLocalWorkspaceStore(store: LocalWorkspaceStore) {
  await ensureLocalWorkspaceStoreDir();
  await fs.writeFile(getLocalWorkspaceStorePath(), JSON.stringify(store, null, 2), "utf8");
}

function safeMetadata(value: Json | null | undefined) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {} as Record<string, unknown>;
  }
  return value as Record<string, unknown>;
}

function inferAuthorLabel(authorType: string, metadata: Record<string, unknown>) {
  const explicit =
    typeof metadata.authorLabel === "string"
      ? metadata.authorLabel
      : typeof metadata.author_label === "string"
        ? metadata.author_label
        : null;

  if (explicit) return explicit;
  if (authorType === "customer") return "Müşteri";
  if (authorType === "admin") return "Atlas ekibi";
  return "Atlas sistemi";
}

function mapMessage(row: Tables<"customer_request_messages">): CustomerRequestMessage {
  const metadata = safeMetadata(row.metadata);
  return {
    id: row.id,
    authorType:
      row.author_type === "customer" || row.author_type === "admin"
        ? row.author_type
        : "system",
    authorLabel: inferAuthorLabel(row.author_type, metadata),
    body: row.body,
    createdAt: row.created_at,
    messageKind: row.message_kind,
    attachments: Array.isArray(row.attachments)
      ? row.attachments.filter((value): value is string => typeof value === "string")
      : [],
  };
}

function mapDeliverable(row: Tables<"customer_deliverables">): CustomerDeliverable {
  return {
    id: row.id,
    title: row.title,
    summary: row.summary,
    status:
      row.status === "draft" ||
      row.status === "ready" ||
      row.status === "awaiting_approval" ||
      row.status === "published" ||
      row.status === "completed"
        ? row.status
        : "ready",
    deliverableType: row.deliverable_type,
    workstreamKey:
      typeof row.workstream_key === "string" ? (row.workstream_key as CustomerWorkstreamKey) : null,
    artifactUrl: row.artifact_url ?? null,
    artifactLabel: row.artifact_label ?? null,
    approvalRequired: row.approval_required,
    approvedAt: row.approved_at ?? null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    sourceSubmissionId: row.source_submission_id ?? null,
  };
}

async function ensureLocalCustomerRequestThread(input: {
  userId: string;
  subject: string;
  summary?: string | null;
  status?: CustomerRequestThreadStatus;
  threadType?: CustomerRequestThreadType;
  workstreamKey?: CustomerWorkstreamKey | null;
  sourceSubmissionId?: string | null;
  sourceTicketId?: string | null;
  createdBy?: string | null;
}) {
  const store = await readLocalWorkspaceStore();
  const now = new Date().toISOString();
  const normalizedSubject = input.subject.trim().toLowerCase();

  const existing = store.threads.find((thread) => {
    if (input.sourceSubmissionId && thread.source_submission_id === input.sourceSubmissionId) {
      return true;
    }

    if (input.sourceTicketId && thread.source_ticket_id === input.sourceTicketId) {
      return true;
    }

    return !input.sourceSubmissionId
      && !input.sourceTicketId
      && thread.user_id === input.userId
      && thread.thread_type === (input.threadType ?? "support")
      && thread.status !== "resolved"
      && thread.subject.trim().toLowerCase() === normalizedSubject;
  });

  if (existing) {
    existing.subject = input.subject;
    existing.summary = input.summary ?? existing.summary;
    existing.status = input.status ?? existing.status;
    existing.thread_type = input.threadType ?? existing.thread_type;
    existing.workstream_key = input.workstreamKey ?? existing.workstream_key;
    existing.updated_at = now;
    existing.last_message_at = existing.last_message_at ?? now;
    store.updatedAt = now;
    await writeLocalWorkspaceStore(store);
    return existing;
  }

  const thread: RequestThreadRow = {
    id: randomUUID(),
    user_id: input.userId,
    subject: input.subject,
    summary: input.summary ?? null,
    status: input.status ?? "open",
    thread_type: input.threadType ?? "support",
    workstream_key: input.workstreamKey ?? null,
    source_submission_id: input.sourceSubmissionId ?? null,
    source_ticket_id: input.sourceTicketId ?? null,
    created_by: input.createdBy ?? null,
    created_at: now,
    updated_at: now,
    last_message_at: now,
  };

  store.threads.unshift(thread);
  store.updatedAt = now;
  await writeLocalWorkspaceStore(store);
  return thread;
}

async function appendLocalCustomerRequestMessage(input: {
  threadId: string;
  userId: string;
  authorType: "customer" | "admin" | "system";
  authorId?: string | null;
  body: string;
  messageKind?: string;
  attachments?: string[];
  metadata?: Record<string, unknown>;
}) {
  const store = await readLocalWorkspaceStore();
  const now = new Date().toISOString();
  const row: RequestMessageRow = {
    id: randomUUID(),
    thread_id: input.threadId,
    user_id: input.userId,
    author_type: input.authorType,
    author_id: input.authorId ?? null,
    body: input.body,
    message_kind: input.messageKind ?? "message",
    attachments: input.attachments ?? [],
    metadata: (input.metadata ?? {}) as Json,
    created_at: now,
  };

  store.messages.push(row);
  const thread = store.threads.find((item) => item.id === input.threadId);
  if (thread) {
    thread.updated_at = now;
    thread.last_message_at = now;
  }
  store.updatedAt = now;
  await writeLocalWorkspaceStore(store);
  return mapMessage(row);
}

async function createLocalCustomerDeliverable(input: {
  userId: string;
  title: string;
  summary: string;
  workstreamKey?: CustomerWorkstreamKey | null;
  deliverableType?: string;
  artifactUrl?: string | null;
  artifactLabel?: string | null;
  approvalRequired?: boolean;
  status?: CustomerDeliverable["status"];
  sourceSubmissionId?: string | null;
  createdBy?: string | null;
  metadata?: Record<string, unknown>;
}) {
  const store = await readLocalWorkspaceStore();
  const now = new Date().toISOString();

  const existing = input.sourceSubmissionId
    ? store.deliverables.find((deliverable) =>
        deliverable.user_id === input.userId
        && deliverable.source_submission_id === input.sourceSubmissionId
        && deliverable.deliverable_type === (input.deliverableType ?? "update"))
    : null;

  if (existing) {
    existing.title = input.title;
    existing.summary = input.summary;
    existing.workstream_key = input.workstreamKey ?? existing.workstream_key;
    existing.artifact_url = input.artifactUrl ?? existing.artifact_url;
    existing.artifact_label = input.artifactLabel ?? existing.artifact_label;
    existing.approval_required = input.approvalRequired ?? existing.approval_required;
    existing.status = input.status ?? existing.status;
    existing.metadata = (input.metadata ?? existing.metadata ?? {}) as Json;
    existing.updated_at = now;
    store.updatedAt = now;
    await writeLocalWorkspaceStore(store);
    return mapDeliverable(existing);
  }

  const row: DeliverableRow = {
    id: randomUUID(),
    user_id: input.userId,
    title: input.title,
    summary: input.summary,
    workstream_key: input.workstreamKey ?? null,
    deliverable_type: input.deliverableType ?? "update",
    artifact_url: input.artifactUrl ?? null,
    artifact_label: input.artifactLabel ?? null,
    approval_required: input.approvalRequired ?? false,
    approved_at: null,
    status: input.status ?? (input.approvalRequired ? "awaiting_approval" : "ready"),
    source_submission_id: input.sourceSubmissionId ?? null,
    created_by: input.createdBy ?? null,
    metadata: (input.metadata ?? {}) as Json,
    created_at: now,
    updated_at: now,
  };

  store.deliverables.unshift(row);
  store.updatedAt = now;
  await writeLocalWorkspaceStore(store);
  return mapDeliverable(row);
}

export async function ensureCustomerRequestThread(input: {
  userId: string;
  subject: string;
  summary?: string | null;
  status?: CustomerRequestThreadStatus;
  threadType?: CustomerRequestThreadType;
  workstreamKey?: CustomerWorkstreamKey | null;
  sourceSubmissionId?: string | null;
  sourceTicketId?: string | null;
  createdBy?: string | null;
}) {
  try {
    const db = adminDb();

    if (input.sourceSubmissionId) {
      const { data: existing } = await db
        .from("customer_request_threads")
        .select("*")
        .eq("source_submission_id", input.sourceSubmissionId)
        .maybeSingle();

      if (existing) {
        const { data: updated, error } = await db
          .from("customer_request_threads")
          .update({
            subject: input.subject,
            summary: input.summary ?? existing.summary,
            status: input.status ?? existing.status,
            thread_type: input.threadType ?? existing.thread_type,
            workstream_key: input.workstreamKey ?? existing.workstream_key,
            updated_at: new Date().toISOString(),
          })
          .eq("id", existing.id)
          .select("*")
          .single();

        if (error) throw error;
        return updated;
      }
    }

    if (input.sourceTicketId) {
      const { data: existing } = await db
        .from("customer_request_threads")
        .select("*")
        .eq("source_ticket_id", input.sourceTicketId)
        .maybeSingle();

      if (existing) return existing;
    }

    const normalizedSubject = input.subject.trim().toLowerCase();
    if (!input.sourceSubmissionId && !input.sourceTicketId && normalizedSubject.length > 0) {
      const { data: existing } = await db
        .from("customer_request_threads")
        .select("*")
        .eq("user_id", input.userId)
        .eq("thread_type", input.threadType ?? "support")
        .neq("status", "resolved")
        .order("updated_at", { ascending: false });

      const matched = (existing ?? []).find(
        (thread) => thread.subject.trim().toLowerCase() === normalizedSubject,
      );

      if (matched) {
        const { data: updated, error } = await db
          .from("customer_request_threads")
          .update({
            summary: input.summary ?? matched.summary,
            status: input.status ?? matched.status,
            workstream_key: input.workstreamKey ?? matched.workstream_key,
            updated_at: new Date().toISOString(),
          })
          .eq("id", matched.id)
          .select("*")
          .single();

        if (error) throw error;
        return updated;
      }
    }

    const { data, error } = await db
      .from("customer_request_threads")
      .insert({
        user_id: input.userId,
        subject: input.subject,
        summary: input.summary ?? null,
        status: input.status ?? "open",
        thread_type: input.threadType ?? "support",
        workstream_key: input.workstreamKey ?? null,
        source_submission_id: input.sourceSubmissionId ?? null,
        source_ticket_id: input.sourceTicketId ?? null,
        created_by: input.createdBy ?? null,
      })
      .select("*")
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    if (!isMissingRelationError(error)) {
      throw error;
    }

    return ensureLocalCustomerRequestThread(input);
  }
}

export async function appendCustomerRequestMessage(input: {
  threadId: string;
  userId: string;
  authorType: "customer" | "admin" | "system";
  authorId?: string | null;
  body: string;
  messageKind?: string;
  attachments?: string[];
  metadata?: Record<string, unknown>;
}) {
  try {
    const db = adminDb();
    const now = new Date().toISOString();

    const { data, error } = await db
      .from("customer_request_messages")
      .insert({
        thread_id: input.threadId,
        user_id: input.userId,
        author_type: input.authorType,
        author_id: input.authorId ?? null,
        body: input.body,
        message_kind: input.messageKind ?? "message",
        attachments: input.attachments ?? [],
        metadata: (input.metadata ?? {}) as Json,
      })
      .select("*")
      .single();

    if (error) throw error;

    await db
      .from("customer_request_threads")
      .update({
        last_message_at: now,
        updated_at: now,
      })
      .eq("id", input.threadId);

    return mapMessage(data);
  } catch (error) {
    if (!isMissingRelationError(error)) {
      throw error;
    }

    return appendLocalCustomerRequestMessage(input);
  }
}

export async function createCustomerSupportThread(input: {
  userId: string;
  subject: string;
  message: string;
  workstreamKey?: CustomerWorkstreamKey | null;
}) {
  let ticket:
    | {
        id: string;
        user_id: string;
        subject: string;
        description: string;
        status: string;
        priority: string;
        created_at: string;
      }
    | null = null;

  try {
    const db = adminDb();
    const { data, error: ticketError } = await db
      .from("support_tickets")
      .insert({
        user_id: input.userId,
        subject: input.subject,
        description: input.message,
        status: "open",
        priority: "medium",
      })
      .select("*")
      .single();

    if (ticketError) throw ticketError;
    ticket = data;
  } catch (error) {
    const now = new Date().toISOString();
    ticket = {
      id: `local:${randomUUID()}`,
      user_id: input.userId,
      subject: input.subject,
      description: input.message,
      status: "open",
      priority: "medium",
      created_at: now,
    };

    if (!isMissingRelationError(error)) {
      console.warn("[customer-workspace] support ticket fallback activated", error);
    }
  }

  const thread = await ensureCustomerRequestThread({
    userId: input.userId,
    subject: input.subject,
    summary: input.message,
    status: "waiting_on_atlas",
    threadType: "support",
    workstreamKey: input.workstreamKey ?? null,
    sourceTicketId: ticket.id,
  });

  await appendCustomerRequestMessage({
    threadId: thread.id,
    userId: input.userId,
    authorType: "customer",
    authorId: input.userId,
    body: input.message,
    messageKind: "message",
  });

  return { ticket, thread };
}

export async function createCustomerDeliverable(input: {
  userId: string;
  title: string;
  summary: string;
  workstreamKey?: CustomerWorkstreamKey | null;
  deliverableType?: string;
  artifactUrl?: string | null;
  artifactLabel?: string | null;
  approvalRequired?: boolean;
  status?: CustomerDeliverable["status"];
  sourceSubmissionId?: string | null;
  createdBy?: string | null;
  metadata?: Record<string, unknown>;
}) {
  try {
    const db = adminDb();
    if (input.sourceSubmissionId) {
      const { data: existing } = await db
        .from("customer_deliverables")
        .select("*")
        .eq("user_id", input.userId)
        .eq("source_submission_id", input.sourceSubmissionId)
        .eq("deliverable_type", input.deliverableType ?? "update")
        .maybeSingle();

      if (existing) {
        const { data: updated, error } = await db
          .from("customer_deliverables")
          .update({
            title: input.title,
            summary: input.summary,
            workstream_key: input.workstreamKey ?? existing.workstream_key,
            artifact_url: input.artifactUrl ?? existing.artifact_url,
            artifact_label: input.artifactLabel ?? existing.artifact_label,
            approval_required: input.approvalRequired ?? existing.approval_required,
            status: input.status ?? existing.status,
            updated_at: new Date().toISOString(),
            metadata: (input.metadata ?? existing.metadata ?? {}) as Json,
          })
          .eq("id", existing.id)
          .select("*")
          .single();

        if (error) throw error;
        return mapDeliverable(updated);
      }
    }

    const { data, error } = await db
      .from("customer_deliverables")
      .insert({
        user_id: input.userId,
        title: input.title,
        summary: input.summary,
        workstream_key: input.workstreamKey ?? null,
        deliverable_type: input.deliverableType ?? "update",
        artifact_url: input.artifactUrl ?? null,
        artifact_label: input.artifactLabel ?? null,
        approval_required: input.approvalRequired ?? false,
        status: input.status ?? (input.approvalRequired ? "awaiting_approval" : "ready"),
        source_submission_id: input.sourceSubmissionId ?? null,
        created_by: input.createdBy ?? null,
        metadata: (input.metadata ?? {}) as Json,
      })
      .select("*")
      .single();

    if (error) throw error;

    await db.from("notifications").insert({
      user_id: input.userId,
      title: input.title,
      body: input.summary,
      type: input.approvalRequired ? "info" : "success",
      channel: "in_app",
      action_url: "/panel/deliverables",
      metadata: {
        deliverableId: data.id,
        workstreamKey: input.workstreamKey ?? null,
        approvalRequired: input.approvalRequired ?? false,
      } as Json,
    });

    return mapDeliverable(data);
  } catch (error) {
    if (!isMissingRelationError(error)) {
      throw error;
    }

    return createLocalCustomerDeliverable(input);
  }
}

export async function listCustomerRequestThreadsByUser(userId: string): Promise<CustomerRequestThread[]> {
  try {
    const db = adminDb();
    const { data: threads, error } = await db
      .from("customer_request_threads")
      .select("*")
      .eq("user_id", userId)
      .order("last_message_at", { ascending: false });

    if (error) throw error;
    if (!threads || threads.length === 0) return [];

    const { data: messages, error: messageError } = await db
      .from("customer_request_messages")
      .select("*")
      .in("thread_id", threads.map((thread) => thread.id))
      .order("created_at", { ascending: true });

    if (messageError) throw messageError;

    const messageMap = new Map<string, CustomerRequestMessage[]>();
    for (const row of messages ?? []) {
      const bucket = messageMap.get(row.thread_id) ?? [];
      bucket.push(mapMessage(row));
      messageMap.set(row.thread_id, bucket);
    }

    return threads.map((thread) => {
      const mappedMessages = messageMap.get(thread.id) ?? [];
      const latestMessage = mappedMessages[mappedMessages.length - 1] ?? null;
      return {
        id: thread.id,
        subject: thread.subject,
        summary: thread.summary ?? latestMessage?.body ?? "Atlas ile guncel talep akisi",
        status:
          thread.status === "open" ||
          thread.status === "waiting_on_customer" ||
          thread.status === "waiting_on_atlas" ||
          thread.status === "resolved"
            ? thread.status
            : "open",
        threadType:
          thread.thread_type === "catalog_intake" ||
          thread.thread_type === "form_followup" ||
          thread.thread_type === "document_request"
            ? thread.thread_type
            : "support",
        workstreamKey:
          typeof thread.workstream_key === "string"
            ? (thread.workstream_key as CustomerWorkstreamKey)
            : null,
        sourceSubmissionId: thread.source_submission_id ?? null,
        sourceTicketId: thread.source_ticket_id ?? null,
        createdAt: thread.created_at,
        updatedAt: thread.updated_at,
        lastMessageAt: thread.last_message_at,
        primaryAction: {
          label: "Thread'i ac",
          href: thread.source_submission_id
            ? `/panel/support/submissions/${thread.source_submission_id}`
            : "/panel/requests",
        },
        latestMessage,
        messages: mappedMessages,
      };
    });
  } catch (error) {
    if (!isMissingRelationError(error)) {
      throw error;
    }

    const store = await readLocalWorkspaceStore();
    const threads = store.threads
      .filter((thread) => thread.user_id === userId)
      .sort((left, right) => new Date(right.last_message_at).getTime() - new Date(left.last_message_at).getTime());
    const messages = store.messages
      .filter((message) => message.user_id === userId)
      .sort((left, right) => new Date(left.created_at).getTime() - new Date(right.created_at).getTime());

    const messageMap = new Map<string, CustomerRequestMessage[]>();
    for (const row of messages) {
      const bucket = messageMap.get(row.thread_id) ?? [];
      bucket.push(mapMessage(row));
      messageMap.set(row.thread_id, bucket);
    }

    return threads.map((thread) => {
      const mappedMessages = messageMap.get(thread.id) ?? [];
      const latestMessage = mappedMessages[mappedMessages.length - 1] ?? null;
      return {
        id: thread.id,
        subject: thread.subject,
        summary: thread.summary ?? latestMessage?.body ?? "Atlas ile guncel talep akisi",
        status:
          thread.status === "open" ||
          thread.status === "waiting_on_customer" ||
          thread.status === "waiting_on_atlas" ||
          thread.status === "resolved"
            ? thread.status
            : "open",
        threadType:
          thread.thread_type === "catalog_intake" ||
          thread.thread_type === "form_followup" ||
          thread.thread_type === "document_request"
            ? thread.thread_type
            : "support",
        workstreamKey:
          typeof thread.workstream_key === "string"
            ? (thread.workstream_key as CustomerWorkstreamKey)
            : null,
        sourceSubmissionId: thread.source_submission_id ?? null,
        sourceTicketId: thread.source_ticket_id ?? null,
        createdAt: thread.created_at,
        updatedAt: thread.updated_at,
        lastMessageAt: thread.last_message_at,
        primaryAction: {
          label: "Thread'i ac",
          href: thread.source_submission_id
            ? `/panel/support/submissions/${thread.source_submission_id}`
            : "/panel/requests",
        },
        latestMessage,
        messages: mappedMessages,
      };
    });
  }
}

export async function listCustomerDeliverablesByUser(userId: string): Promise<CustomerDeliverable[]> {
  try {
    const db = adminDb();
    const { data, error } = await db
      .from("customer_deliverables")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (error) throw error;
    return (data ?? []).map(mapDeliverable);
  } catch (error) {
    if (!isMissingRelationError(error)) {
      throw error;
    }

    const store = await readLocalWorkspaceStore();
    return store.deliverables
      .filter((deliverable) => deliverable.user_id === userId)
      .sort((left, right) => new Date(right.created_at).getTime() - new Date(left.created_at).getTime())
      .map(mapDeliverable);
  }
}
