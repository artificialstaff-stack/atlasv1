// ─── Atlas Copilot — Query Planner ──────────────────────────────────────────
// Determines what data to fetch based on intent analysis.
// Optimizes query count to stay within token budget.
// ─────────────────────────────────────────────────────────────────────────────
import type { AgentRole, IntentSignal, QueryPlan, QuerySpec } from "./types";
import { getPrimaryAgent, getSupportingAgents } from "./intent";

// ─── Query Templates per Domain ─────────────────────────────────────────────
const DOMAIN_QUERIES: Record<Exclude<AgentRole, "coordinator">, QuerySpec[]> = {
  customer: [
    { agent: "customer", table: "users", type: "count", description: "Toplam kullanıcı sayısı", priority: 1 },
    { agent: "customer", table: "users", type: "list", description: "Son 7 gün kayıtlar", priority: 1 },
    { agent: "customer", table: "users", type: "distribution", description: "Onboarding durumu dağılımı", priority: 2 },
    { agent: "customer", table: "customer_companies", type: "count", description: "Toplam şirket sayısı", priority: 1 },
    { agent: "customer", table: "customer_companies", type: "list", description: "Son şirketler", priority: 2 },
    { agent: "customer", table: "user_subscriptions", type: "distribution", description: "Plan dağılımı", priority: 2 },
    { agent: "customer", table: "invoices", type: "aggregate", description: "Fatura özeti", priority: 2 },
  ],
  commerce: [
    { agent: "commerce", table: "orders", type: "count", description: "Toplam sipariş sayısı", priority: 1 },
    { agent: "commerce", table: "orders", type: "aggregate", description: "Sipariş gelir/durum analizi", priority: 1 },
    { agent: "commerce", table: "orders", type: "list", description: "Son 10 sipariş", priority: 2 },
    { agent: "commerce", table: "products", type: "count", description: "Toplam ürün sayısı", priority: 1 },
    { agent: "commerce", table: "products", type: "list", description: "Düşük stok ürünleri", priority: 1 },
    { agent: "commerce", table: "shipments", type: "distribution", description: "Sevkiyat durumları", priority: 2 },
    { agent: "commerce", table: "warehouse_items", type: "aggregate", description: "Depo özeti", priority: 3 },
  ],
  marketing: [
    { agent: "marketing", table: "marketplace_accounts", type: "aggregate", description: "Pazaryeri gelir analizi", priority: 1 },
    { agent: "marketing", table: "social_media_accounts", type: "aggregate", description: "Sosyal medya metrikleri", priority: 1 },
    { agent: "marketing", table: "ad_campaigns", type: "aggregate", description: "Reklam kampanya analizi", priority: 1 },
    { agent: "marketing", table: "marketplace_accounts", type: "list", description: "Aktif mağazalar", priority: 2 },
    { agent: "marketing", table: "ad_campaigns", type: "list", description: "Aktif kampanyalar", priority: 2 },
  ],
  finance: [
    { agent: "finance", table: "financial_records", type: "aggregate", description: "Gelir/gider özeti", priority: 1 },
    { agent: "finance", table: "invoices", type: "aggregate", description: "Fatura durumları", priority: 1 },
    { agent: "finance", table: "orders", type: "aggregate", description: "Sipariş geliri", priority: 2 },
    { agent: "finance", table: "ad_campaigns", type: "aggregate", description: "Reklam harcamaları", priority: 2 },
    { agent: "finance", table: "user_subscriptions", type: "aggregate", description: "Abonelik gelirleri", priority: 2 },
  ],
  operations: [
    { agent: "operations", table: "support_tickets", type: "distribution", description: "Destek talebi dağılımı", priority: 1 },
    { agent: "operations", table: "support_tickets", type: "list", description: "Açık destek talepleri", priority: 1 },
    { agent: "operations", table: "process_tasks", type: "distribution", description: "Görev durumları", priority: 2 },
    { agent: "operations", table: "form_submissions", type: "count", description: "Form başvuru sayısı", priority: 2 },
    { agent: "operations", table: "notifications", type: "count", description: "Okunmamış bildirimler", priority: 3 },
  ],
  strategy: [
    { agent: "strategy", table: "_counts", type: "count", description: "Tüm tablo sayıları", priority: 1 },
    { agent: "strategy", table: "financial_records", type: "aggregate", description: "Finansal özet", priority: 1 },
    { agent: "strategy", table: "orders", type: "aggregate", description: "Sipariş istatistikleri", priority: 1 },
    { agent: "strategy", table: "users", type: "count", description: "Kullanıcı sayısı", priority: 1 },
    { agent: "strategy", table: "audit_logs", type: "list", description: "Son aktiviteler", priority: 3 },
  ],
};

// ─── Plan Builder ───────────────────────────────────────────────────────────

export function createQueryPlan(signals: IntentSignal[]): QueryPlan {
  const primary = getPrimaryAgent(signals);
  const supporting = getSupportingAgents(signals);

  const queries: QuerySpec[] = [];
  const seen = new Set<string>();

  // Add primary agent queries (all priorities)
  for (const q of DOMAIN_QUERIES[primary === "coordinator" ? "strategy" : primary]) {
    const key = `${q.table}:${q.type}`;
    if (!seen.has(key)) {
      queries.push(q);
      seen.add(key);
    }
  }

  // Add supporting agent queries (priority 1 only to stay within token budget)
  for (const agent of supporting) {
    const agentKey = agent === "coordinator" ? "strategy" : agent;
    for (const q of DOMAIN_QUERIES[agentKey]) {
      const key = `${q.table}:${q.type}`;
      if (!seen.has(key) && q.priority === 1) {
        queries.push({ ...q, priority: 2 }); // downgrade to supporting
        seen.add(key);
      }
    }
  }

  // Strategy always gets basic counts if not primary
  if (primary !== "strategy" && !supporting.includes("strategy")) {
    const stratCounts = DOMAIN_QUERIES.strategy.find(q => q.table === "_counts");
    if (stratCounts) {
      const key = `${stratCounts.table}:${stratCounts.type}`;
      if (!seen.has(key)) {
        queries.push({ ...stratCounts, priority: 3 });
        seen.add(key);
      }
    }
  }

  // Build reasoning
  const primarySignal = signals.find(s => s.domain === primary);
  const reasoning = buildReasoning(primary, supporting, primarySignal);

  return {
    primaryAgent: primary,
    supportingAgents: supporting,
    queries: queries.sort((a, b) => a.priority - b.priority),
    reasoning,
  };
}

function buildReasoning(
  primary: AgentRole,
  supporting: AgentRole[],
  signal?: IntentSignal,
): string {
  const agentNames: Record<AgentRole, string> = {
    coordinator: "Koordinatör",
    customer: "Müşteri Uzmanı",
    commerce: "E-Ticaret Uzmanı",
    marketing: "Pazarlama Uzmanı",
    finance: "Finans Uzmanı",
    operations: "Operasyon Uzmanı",
    strategy: "Strateji Direktörü",
  };

  let r = `Ana uzman: ${agentNames[primary]}`;
  if (supporting.length > 0) {
    r += ` | Destek: ${supporting.map(a => agentNames[a]).join(", ")}`;
  }
  if (signal?.keywords.length) {
    r += ` | Anahtar kelimeler: ${signal.keywords.join(", ")}`;
  }
  if (signal?.patterns.length) {
    r += ` | Sorgu tipi: ${signal.patterns.join(", ")}`;
  }
  return r;
}

/** Get Turkish label for an agent role */
export function getAgentLabel(role: AgentRole): string {
  const labels: Record<AgentRole, string> = {
    coordinator: "Koordinatör",
    customer: "Müşteri Yönetimi",
    commerce: "E-Ticaret & Lojistik",
    marketing: "Pazarlama & Dijital",
    finance: "Finans & Muhasebe",
    operations: "Operasyon & Destek",
    strategy: "Strateji & Analiz",
  };
  return labels[role];
}

/** Get icon name for an agent role */
export function getAgentIcon(role: AgentRole): string {
  const icons: Record<AgentRole, string> = {
    coordinator: "brain",
    customer: "users",
    commerce: "shopping-cart",
    marketing: "megaphone",
    finance: "dollar-sign",
    operations: "settings",
    strategy: "bar-chart-3",
  };
  return icons[role];
}
