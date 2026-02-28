// ─── Atlas Copilot — Type Definitions ────────────────────────────────────────
// Multi-agent copilot architecture inspired by OpenAI Swarm & Microsoft AutoGen
// Adapted for Ollama local models (no tool-calling required)
// ─────────────────────────────────────────────────────────────────────────────

/** Domain expert types — each represents a "department head" in the holding */
export type AgentRole =
  | "coordinator"   // Cross-domain orchestrator — decides which experts to engage
  | "customer"      // CRM, onboarding, user management, subscriptions
  | "commerce"      // Orders, products, inventory, warehouse, shipments
  | "marketing"     // Marketplaces, social media, ad campaigns
  | "finance"       // Revenue, expenses, invoices, profit analysis
  | "operations"    // Support tickets, form submissions, tasks, workflows
  | "strategy";     // Cross-domain analytics, KPIs, trends, recommendations

/** Intent signal detected from user message */
export interface IntentSignal {
  domain: AgentRole;
  confidence: number;       // 0-1
  keywords: string[];       // matched keywords
  patterns: string[];       // matched patterns (e.g., "kaç müşteri" → count query)
}

/** Query plan — what data to fetch */
export interface QueryPlan {
  primaryAgent: AgentRole;
  supportingAgents: AgentRole[];
  queries: QuerySpec[];
  reasoning: string;        // Why this plan was chosen
}

/** Individual data query specification */
export interface QuerySpec {
  agent: AgentRole;
  table: string;
  type: "count" | "aggregate" | "list" | "distribution" | "trend";
  description: string;
  priority: number;         // 1=critical, 2=supporting, 3=nice-to-have
}

/** Fetched data from a domain */
export interface DomainData {
  agent: AgentRole;
  label: string;            // Turkish label for UI
  data: Record<string, unknown>;
  recordCount: number;
  fetchMs: number;
}

/** Complete context assembled for LLM */
export interface AssembledContext {
  intent: IntentSignal[];
  plan: QueryPlan;
  domains: DomainData[];
  totalRecords: number;
  totalFetchMs: number;
  conversationSummary?: string;
}

/** SSE event types for streaming protocol */
export type SSEEventType =
  | "status"       // Pipeline progress update
  | "intent"       // Intent analysis result
  | "plan"         // Query plan
  | "context"      // Data context summary
  | "agent"        // Active agent info
  | "thinking"     // Chain-of-thought reasoning
  | "text"         // LLM text token
  | "done"         // Completion signal
  | "error";       // Error event

/** SSE event payload */
export interface SSEEvent {
  type: SSEEventType;
  data: Record<string, unknown>;
  timestamp?: number;
}

/** Conversation message */
export interface CopilotMessage {
  role: "user" | "assistant" | "system";
  content: string;
}

/** Pipeline step for UI tracking */
export interface PipelineStep {
  id: string;
  label: string;
  status: "pending" | "running" | "done" | "error";
  durationMs?: number;
}
