// ─── Atlas Copilot — Memory System ──────────────────────────────────────────
// Manus AI-level persistent memory:
//   1. Conversation history (per-session, token-bounded)
//   2. Entity memory (learned facts about users, products, patterns)
//   3. Session summaries (auto-generated, searchable)
//
// Storage: Supabase tables (agent_conversations + in-memory entity store)
// No external dependencies — works with any LLM.
// ─────────────────────────────────────────────────────────────────────────────
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import type { CopilotMessage } from "./types";

type Db = SupabaseClient<Database>;

// ─── Entity Memory (in-memory per pipeline run) ────────────────────────────

export interface EntityFact {
  entity: string;       // "müşteri:Ali Yılmaz", "ürün:iPhone Kılıf", "şirket:ABC Ltd"
  fact: string;         // learned fact
  source: "user" | "data" | "inferred";
  confidence: number;   // 0-1
  timestamp: number;
}

export interface MemoryContext {
  recentMessages: CopilotMessage[];
  entityFacts: EntityFact[];
  sessionSummary: string | null;
  conversationCount: number;
  lastActiveAt: string | null;
}

// ─── Entity Extraction (Pattern-based, no LLM needed) ──────────────────────

const ENTITY_PATTERNS: Array<{ pattern: RegExp; type: string }> = [
  { pattern: /müşteri\w*\s+(\w+\s+\w+)/gi, type: "müşteri" },
  { pattern: /şirket\w*\s+["']?([^"',]+)["']?/gi, type: "şirket" },
  { pattern: /ürün\w*\s+["']?([^"',]+)["']?/gi, type: "ürün" },
  { pattern: /sipariş\w*\s+#?(\w+)/gi, type: "sipariş" },
  { pattern: /SKU\s*[:#]?\s*(\w+)/gi, type: "sku" },
  { pattern: /EIN\s*[:#]?\s*(\d[\d-]+)/gi, type: "ein" },
  { pattern: /LLC\s+["']?([^"',]+)["']?/gi, type: "llc" },
];

export function extractEntities(text: string): EntityFact[] {
  const facts: EntityFact[] = [];
  const seen = new Set<string>();

  for (const { pattern, type } of ENTITY_PATTERNS) {
    pattern.lastIndex = 0;
    let match: RegExpExecArray | null;
    while ((match = pattern.exec(text)) !== null) {
      const value = match[1]?.trim();
      if (!value || value.length < 2) continue;
      const key = `${type}:${value.toLowerCase()}`;
      if (seen.has(key)) continue;
      seen.add(key);
      facts.push({
        entity: `${type}:${value}`,
        fact: `Kullanıcı "${value}" ile ilgileniyor (${type})`,
        source: "user",
        confidence: 0.8,
        timestamp: Date.now(),
      });
    }
  }

  return facts;
}

// ─── Conversation Memory (Supabase-backed) ─────────────────────────────────

const MAX_CONTEXT_TOKENS = 6000;

/** Save a message to persistent conversation history */
export async function persistMessage(
  db: Db,
  params: {
    userId: string;
    sessionId: string;
    role: "user" | "assistant" | "system";
    content: string;
    metadata?: Record<string, unknown>;
  },
): Promise<void> {
  const tokenCount = Math.ceil(params.content.length / 4);

  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (db as any)
      .from("agent_conversations")
      .insert({
        user_id: params.userId,
        session_id: params.sessionId,
        role: params.role,
        content: params.content,
        metadata: params.metadata ?? {},
        token_count: tokenCount,
      });
  } catch (err) {
    console.error("[copilot-memory] persistMessage error:", err);
  }
}

/** Load recent conversation history for a session (token-bounded) */
export async function loadConversationHistory(
  db: Db,
  sessionId: string,
  maxTokens: number = MAX_CONTEXT_TOKENS,
): Promise<CopilotMessage[]> {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (db as any)
      .from("agent_conversations")
      .select("role, content, token_count")
      .eq("session_id", sessionId)
      .order("created_at", { ascending: false })
      .limit(50);

    if (error || !data) return [];

    const messages: CopilotMessage[] = [];
    let totalTokens = 0;

    for (const row of data as Array<{ role: string; content: string; token_count: number }>) {
      if (totalTokens + row.token_count > maxTokens) break;
      messages.unshift({ role: row.role as CopilotMessage["role"], content: row.content });
      totalTokens += row.token_count;
    }

    return messages;
  } catch {
    return [];
  }
}

/** Generate a simple session summary from recent messages */
export function summarizeConversation(messages: CopilotMessage[]): string | null {
  if (messages.length === 0) return null;

  const userMessages = messages.filter(m => m.role === "user");
  if (userMessages.length === 0) return null;

  // Extract main topics
  const topics = new Set<string>();
  const topicKeywords: Record<string, string[]> = {
    müşteri: ["müşteri", "kullanıcı", "kayıt", "onboarding", "abonelik"],
    sipariş: ["sipariş", "order", "kargo", "teslimat", "sevkiyat"],
    ürün: ["ürün", "stok", "envanter", "depo", "sku"],
    finans: ["gelir", "gider", "kâr", "fatura", "ödeme", "maliyet"],
    destek: ["destek", "ticket", "talep", "şikayet", "sorun"],
    pazarlama: ["amazon", "shopify", "reklam", "kampanya", "pazaryeri"],
    genel: ["genel", "durum", "rapor", "özet", "dashboard"],
  };

  for (const msg of userMessages) {
    const lower = msg.content.toLowerCase();
    for (const [topic, keywords] of Object.entries(topicKeywords)) {
      if (keywords.some(k => lower.includes(k))) topics.add(topic);
    }
  }

  if (topics.size === 0) topics.add("genel");

  return `Konuşma: ${userMessages.length} soru — konular: ${Array.from(topics).join(", ")}`;
}

/** Build full memory context for the pipeline */
export async function buildMemoryContext(
  db: Db,
  sessionId: string | null,
  currentMessages: CopilotMessage[],
): Promise<MemoryContext> {
  // Extract entities from all user messages
  const entityFacts: EntityFact[] = [];
  for (const msg of currentMessages) {
    if (msg.role === "user") {
      entityFacts.push(...extractEntities(msg.content));
    }
  }

  // Load conversation history if session exists
  let recentMessages: CopilotMessage[] = [];
  let conversationCount = 0;
  let lastActiveAt: string | null = null;

  if (sessionId) {
    try {
      recentMessages = await loadConversationHistory(db, sessionId);
      conversationCount = recentMessages.length;
      lastActiveAt = new Date().toISOString();
    } catch {
      // Ignore — memory is optional
    }
  }

  const sessionSummary = summarizeConversation([...recentMessages, ...currentMessages]);

  return {
    recentMessages,
    entityFacts,
    sessionSummary,
    conversationCount,
    lastActiveAt,
  };
}
