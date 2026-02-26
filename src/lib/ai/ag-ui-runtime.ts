/**
 * ─── Atlas AG-UI Runtime ───
 * 
 * AG-UI (Agent-User Interaction) protokolü: Ajan ile kullanıcı
 * arasında gerçek zamanlı UI state senkronizasyonu sağlar.
 * 
 * Özellikler:
 *   - Streaming yanıtlar (TextMessageStart → TextMessageContent → TextMessageEnd)
 *   - Tool çağrı akışı (ToolCallStart → ToolCallArgs → ToolCallEnd)
 *   - State senkronizasyonu (StateSnapshot + StateDelta)
 *   - Human-in-the-Loop onay akışı
 * 
 * Not: Bu dosya React hooks ve yardımcı fonksiyonları içerir.
 * Phase 4'te CopilotKit ile entegre edilecek.
 */

import type {
  AgentAction,
  AgentActionResult,
  AgentMessage,
  AgentSession,
  GatekeeperRule,
  GatekeeperVerdict,
} from "./agent-types";
import { agentConfig, defaultGatekeeperRules } from "./agent-types";

// ─── AJAN AKSIYONLARI FABRİKA ───

let actionCounter = 0;

/**
 * Yeni bir ajan aksiyonu oluşturur
 */
export function createAgentAction(
  params: Pick<AgentAction, "type" | "description" | "parameters"> & {
    confidence: number;
    targetComponentId?: string;
  }
): AgentAction {
  actionCounter++;
  const confidenceLevel =
    params.confidence >= 0.8 ? "high" :
    params.confidence >= 0.5 ? "medium" : "low";

  return {
    id: `action_${Date.now()}_${actionCounter}`,
    type: params.type,
    description: params.description,
    confidence: params.confidence,
    confidenceLevel,
    requiresApproval: params.confidence < agentConfig.approvalThreshold,
    parameters: params.parameters,
    targetComponentId: params.targetComponentId,
    createdAt: new Date(),
  };
}

/**
 * Yeni bir ajan mesajı oluşturur
 */
export function createAgentMessage(
  role: AgentMessage["role"],
  content: string,
  actions?: AgentAction[]
): AgentMessage {
  return {
    id: `msg_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    role,
    content,
    actions,
    timestamp: new Date(),
  };
}

/**
 * Yeni bir ajan oturumu başlatır
 */
export function createAgentSession(userId: string): AgentSession {
  const now = new Date();
  return {
    id: `session_${Date.now()}`,
    userId,
    messages: [
      createAgentMessage("system", agentConfig.defaultSystemPrompt),
    ],
    activeActions: [],
    status: "idle",
    createdAt: now,
    updatedAt: now,
  };
}

// ─── GATEKEEPER ÇALIŞTIRICISI ───

/**
 * Bir aksiyonu tüm Gatekeeper kurallarından geçirir.
 * Herhangi bir kural reddederse aksiyon reddedilir.
 */
export function runGatekeeper(
  action: AgentAction,
  rules: GatekeeperRule[] = defaultGatekeeperRules
): GatekeeperVerdict {
  if (!agentConfig.gatekeeperEnabled) {
    return { approved: true, reason: "Gatekeeper devre dışı", riskLevel: "none" };
  }

  for (const rule of rules) {
    const verdict = rule.check(action);
    if (!verdict.approved) {
      return {
        ...verdict,
        reason: `[${rule.name}] ${verdict.reason}`,
      };
    }
    // En yüksek risk seviyesini kaydet
    if (verdict.riskLevel !== "none") {
      return {
        approved: true,
        reason: `[${rule.name}] ${verdict.reason}`,
        riskLevel: verdict.riskLevel,
      };
    }
  }

  return { approved: true, reason: "Tüm kontrollerden geçti", riskLevel: "none" };
}

// ─── OTURUM YÖNETİCİSİ ───

/**
 * Oturuma mesaj ekler ve güncelleme zamanını ayarlar
 */
export function addMessageToSession(
  session: AgentSession,
  message: AgentMessage
): AgentSession {
  // Oturum mesaj limiti kontrolü
  const messages = [...session.messages, message];
  const trimmedMessages = messages.length > agentConfig.maxSessionMessages
    ? [messages[0], ...messages.slice(-agentConfig.maxSessionMessages + 1)]
    : messages;

  return {
    ...session,
    messages: trimmedMessages,
    updatedAt: new Date(),
  };
}

/**
 * Oturuma aktif aksiyon ekler
 */
export function addActionToSession(
  session: AgentSession,
  action: AgentAction
): AgentSession {
  return {
    ...session,
    activeActions: [...session.activeActions, action],
    status: action.requiresApproval ? "awaiting_approval" : "processing",
    updatedAt: new Date(),
  };
}

/**
 * Aksiyon sonucunu işler ve oturumdan kaldırır
 */
export function resolveAction(
  session: AgentSession,
  result: AgentActionResult
): AgentSession {
  const activeActions = session.activeActions.filter(
    (a) => a.id !== result.actionId
  );

  const statusMessage = result.success
    ? `✅ Eylem tamamlandı: ${result.actionId} (${result.duration}ms)`
    : `❌ Eylem başarısız: ${result.actionId} — ${result.error}`;

  const systemMessage = createAgentMessage("system", statusMessage);

  return {
    ...session,
    activeActions,
    messages: [...session.messages, systemMessage],
    status: activeActions.length === 0 ? "idle" : "processing",
    updatedAt: new Date(),
  };
}

// ─── AG-UI EVENT TİPLERİ (Streaming) ───

/**
 * AG-UI streaming event türleri
 * CopilotKit + AG-UI protokolüne uyumlu
 */
export type AGUIEventType =
  | "TextMessageStart"
  | "TextMessageContent"
  | "TextMessageEnd"
  | "ToolCallStart"
  | "ToolCallArgs"
  | "ToolCallEnd"
  | "StateSnapshot"
  | "StateDelta"
  | "MessagesSnapshot"
  | "RunStarted"
  | "RunFinished"
  | "RunError"
  | "Custom"         // Atlas'a özgü eventler
  ;

/**
 * AG-UI streaming event'i
 */
export interface AGUIEvent {
  type: AGUIEventType;
  timestamp: number;
  payload: unknown;
}

/**
 * AG-UI event oluşturur
 */
export function createAGUIEvent(
  type: AGUIEventType,
  payload: unknown
): AGUIEvent {
  return {
    type,
    timestamp: Date.now(),
    payload,
  };
}

// ─── ATLAS AJAN İÇİN CONTEXT OLUŞTURUCU ───

/**
 * Aktif sayfaya göre ajan kontekstini oluşturur.
 * Bu kontekst, ajanın hangi verilere erişebileceğini belirler.
 */
export function buildAgentContext(params: {
  currentPath: string;
  userRole: "admin" | "client";
  locale: "tr" | "en";
}): Record<string, unknown> {
  const { currentPath, userRole, locale } = params;

  // Route-based context
  const routeContextMap: Record<string, string[]> = {
    "/admin/dashboard": ["atlas.db.orders", "atlas.db.customers", "atlas.db.leads", "atlas.session.context"],
    "/admin/customers": ["atlas.db.customers", "atlas.session.context"],
    "/admin/orders": ["atlas.db.orders", "atlas.db.customers", "atlas.session.context"],
    "/admin/inventory": ["atlas.db.inventory", "atlas.session.context"],
    "/admin/leads": ["atlas.db.leads", "atlas.session.context"],
    "/admin/map": ["atlas.spatial.heatmap", "atlas.spatial.cluster", "atlas.db.orders", "atlas.session.context"],
    "/client/dashboard": ["atlas.db.orders", "atlas.session.context"],
    "/client/orders": ["atlas.db.orders", "atlas.session.context"],
  };

  // Eşleşen route bul (prefix match)
  const matchedRoute = Object.keys(routeContextMap).find((route) =>
    currentPath.startsWith(route)
  );

  const availableTools = matchedRoute
    ? routeContextMap[matchedRoute]
    : ["atlas.session.context"];

  return {
    currentPath,
    userRole,
    locale,
    availableTools,
    platform: "atlas",
    version: "0.1.0",
  };
}
