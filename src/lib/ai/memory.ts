/**
 * ─── Atlas Agent Memory — Conversation History Store ───
 * Persist AI agent conversations for context continuity.
 */

import { createClient } from "@/lib/supabase/server";

export interface ConversationMessage {
  id: string;
  user_id: string;
  session_id: string;
  role: "user" | "assistant" | "system" | "tool";
  content: string;
  metadata: Record<string, unknown>;
  token_count: number;
  created_at: string;
}

export interface ConversationSession {
  sessionId: string;
  messages: ConversationMessage[];
  totalTokens: number;
  createdAt: string;
  lastMessageAt: string;
}

const MAX_CONTEXT_TOKENS = 8000;

/**
 * Mesaj kaydet — agent conversation history'e ekle
 */
export async function saveMessage(params: {
  userId: string;
  sessionId: string;
  role: ConversationMessage["role"];
  content: string;
  metadata?: Record<string, unknown>;
}): Promise<ConversationMessage | null> {
  const supabase = await createClient();

  // Basit token tahmini (4 karakter ≈ 1 token)
  const tokenCount = Math.ceil(params.content.length / 4);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any)
    .from("agent_conversations")
    .insert({
      user_id: params.userId,
      session_id: params.sessionId,
      role: params.role,
      content: params.content,
      metadata: params.metadata ?? {},
      token_count: tokenCount,
    })
    .select()
    .single();

  if (error) {
    console.error("[agent-memory] Save error:", error);
    return null;
  }

  return data as ConversationMessage;
}

/**
 * Session mesajlarını getir (son N mesaj, token limiti dahilinde)
 */
export async function getSessionMessages(
  sessionId: string,
  maxTokens = MAX_CONTEXT_TOKENS
): Promise<ConversationMessage[]> {
  const supabase = await createClient();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any)
    .from("agent_conversations")
    .select("*")
    .eq("session_id", sessionId)
    .order("created_at", { ascending: false })
    .limit(100);

  if (error) {
    console.error("[agent-memory] Fetch error:", error);
    return [];
  }

  // Token limiti dahilinde ters sıralı mesajları topla
  const messages: ConversationMessage[] = [];
  let totalTokens = 0;

  for (const msg of (data ?? []) as ConversationMessage[]) {
    if (totalTokens + msg.token_count > maxTokens) break;
    messages.unshift(msg);
    totalTokens += msg.token_count;
  }

  return messages;
}

/**
 * Kullanıcının tüm session'larını getir
 */
export async function getUserSessions(
  userId: string,
  limit = 20
): Promise<ConversationSession[]> {
  const supabase = await createClient();

  // Session'ları grupla
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any)
    .from("agent_conversations")
    .select("session_id, created_at, token_count")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[agent-memory] Sessions error:", error);
    return [];
  }

  // Session'ları grupla
  const sessionMap = new Map<string, { tokens: number; first: string; last: string; count: number }>();

  for (const row of (data ?? []) as Array<{ session_id: string; created_at: string; token_count: number }>) {
    const existing = sessionMap.get(row.session_id);
    if (existing) {
      existing.tokens += row.token_count;
      existing.count++;
      if (row.created_at > existing.last) existing.last = row.created_at;
      if (row.created_at < existing.first) existing.first = row.created_at;
    } else {
      sessionMap.set(row.session_id, {
        tokens: row.token_count,
        first: row.created_at,
        last: row.created_at,
        count: 1,
      });
    }
  }

  return Array.from(sessionMap.entries())
    .map(([sessionId, info]) => ({
      sessionId,
      messages: [],
      totalTokens: info.tokens,
      createdAt: info.first,
      lastMessageAt: info.last,
    }))
    .slice(0, limit);
}

/**
 * Eski mesajları sil (30 günden eski)
 */
export async function pruneOldMessages(daysOld = 30): Promise<number> {
  const supabase = await createClient();
  const cutoff = new Date(Date.now() - daysOld * 24 * 60 * 60 * 1000).toISOString();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any)
    .from("agent_conversations")
    .delete()
    .lt("created_at", cutoff)
    .select("id");

  if (error) {
    console.error("[agent-memory] Prune error:", error);
    return 0;
  }

  return data?.length ?? 0;
}

/**
 * Session'ın özet bilgisini oluştur (LLM ile)
 * Son N mesajı alır ve kısa özet üretir.
 */
export async function getSessionSummary(sessionId: string): Promise<string> {
  const messages = await getSessionMessages(sessionId, 2000);

  if (messages.length === 0) return "Boş konuşma";

  // Basit özet — production'da LLM ile zenginleştirilir
  const firstUserMsg = messages.find((m) => m.role === "user");
  const topic = firstUserMsg?.content.slice(0, 100) ?? "Genel konuşma";
  const msgCount = messages.length;

  return `${topic}... (${msgCount} mesaj)`;
}
