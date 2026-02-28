// ─── Atlas Copilot — Intent Analyzer ─────────────────────────────────────────
// Multi-signal intent classification for Turkish + English queries.
// Uses keyword matching, pattern recognition, and contextual analysis.
// ─────────────────────────────────────────────────────────────────────────────
import type { AgentRole, IntentSignal } from "./types";

// ─── Keyword Taxonomy ───────────────────────────────────────────────────────
// Weighted keywords: longer/more specific = higher weight
const TAXONOMY: Record<Exclude<AgentRole, "coordinator">, { keywords: string[]; weight: number }[]> = {
  customer: [
    { keywords: ["müşteri", "customer", "kullanıcı", "user", "client"], weight: 3 },
    { keywords: ["şirket", "company", "llc", "corporation", "firma", "inc"], weight: 3 },
    { keywords: ["onboarding", "kayıt", "register", "signup", "profil"], weight: 2 },
    { keywords: ["abonelik", "subscription", "plan", "paket", "üyelik"], weight: 2 },
    { keywords: ["fatura", "invoice", "billing", "ödeme", "payment"], weight: 2 },
    { keywords: ["rol", "role", "yetki", "permission", "davet", "invitation"], weight: 1 },
    { keywords: ["hesap", "account", "eposta", "email"], weight: 1 },
  ],
  commerce: [
    { keywords: ["sipariş", "order", "siparişler"], weight: 3 },
    { keywords: ["ürün", "product", "ürünler", "products"], weight: 3 },
    { keywords: ["stok", "stock", "envanter", "inventory"], weight: 3 },
    { keywords: ["depo", "warehouse", "warehousing", "depolama"], weight: 2 },
    { keywords: ["kargo", "shipment", "shipping", "sevkiyat", "lojistik", "logistics"], weight: 2 },
    { keywords: ["teslimat", "delivery", "gümrük", "customs", "tracking"], weight: 2 },
    { keywords: ["sku", "barkod", "barcode", "paket", "fiyat", "price"], weight: 1 },
  ],
  marketing: [
    { keywords: ["pazaryeri", "marketplace", "pazaryerleri"], weight: 3 },
    { keywords: ["amazon", "ebay", "etsy", "shopify", "walmart", "tiktok shop"], weight: 3 },
    { keywords: ["sosyal medya", "social media", "sosyal", "social"], weight: 3 },
    { keywords: ["instagram", "facebook", "youtube", "tiktok", "twitter", "pinterest", "linkedin"], weight: 2 },
    { keywords: ["reklam", "campaign", "kampanya", "ads", "advertising"], weight: 2 },
    { keywords: ["ppc", "roas", "cpc", "ctr", "impression", "tıklama", "click"], weight: 2 },
    { keywords: ["mağaza", "store", "listing", "takipçi", "follower", "engagement"], weight: 1 },
  ],
  finance: [
    { keywords: ["finans", "finance", "financial", "mali"], weight: 3 },
    { keywords: ["gelir", "revenue", "income", "ciro", "turnover"], weight: 3 },
    { keywords: ["gider", "expense", "harcama", "maliyet", "cost"], weight: 3 },
    { keywords: ["kâr", "profit", "zarar", "loss", "net", "brüt", "gross"], weight: 3 },
    { keywords: ["bütçe", "budget"], weight: 2 },
    { keywords: ["para", "money", "usd", "dolar", "try", "lira", "currency"], weight: 1 },
    { keywords: ["vergi", "tax", "ein", "muhasebe", "accounting"], weight: 1 },
  ],
  operations: [
    { keywords: ["destek", "support", "ticket", "talep", "sorun", "problem"], weight: 3 },
    { keywords: ["form", "başvuru", "submission", "başvurular"], weight: 2 },
    { keywords: ["görev", "task", "workflow", "iş akışı", "süreç", "process"], weight: 2 },
    { keywords: ["bildirim", "notification", "alert", "uyarı"], weight: 2 },
    { keywords: ["iletişim", "contact", "leads", "lead"], weight: 1 },
  ],
  strategy: [
    { keywords: ["rapor", "report", "analiz", "analysis", "analytics"], weight: 3 },
    { keywords: ["dashboard", "özet", "summary", "overview", "genel bakış", "genel durum"], weight: 3 },
    { keywords: ["trend", "büyüme", "growth", "performans", "performance"], weight: 2 },
    { keywords: ["kpi", "metrik", "metric", "istatistik", "stats", "statistics"], weight: 2 },
    { keywords: ["karşılaştırma", "comparison", "benchmark", "tahmin", "forecast", "prediction"], weight: 2 },
    { keywords: ["strateji", "strategy", "plan", "hedef", "goal", "öneri", "recommendation"], weight: 1 },
    { keywords: ["toplam", "total", "aylık", "monthly", "haftalık", "weekly", "yıllık", "yearly"], weight: 1 },
    { keywords: ["kaç", "sayı", "count", "ne kadar", "how many", "how much"], weight: 1 },
  ],
};

// ─── Query Pattern Detection ────────────────────────────────────────────────
interface QueryPattern {
  pattern: RegExp;
  domain: AgentRole;
  type: string;
  boost: number;
}

const QUERY_PATTERNS: QueryPattern[] = [
  // Count queries
  { pattern: /kaç\s+(müşteri|kullanıcı|user|customer)/i, domain: "customer", type: "count", boost: 4 },
  { pattern: /kaç\s+(sipariş|order)/i, domain: "commerce", type: "count", boost: 4 },
  { pattern: /kaç\s+(ürün|product)/i, domain: "commerce", type: "count", boost: 4 },
  { pattern: /kaç\s+(şirket|company|firma)/i, domain: "customer", type: "count", boost: 4 },
  { pattern: /kaç\s+(ticket|talep|destek)/i, domain: "operations", type: "count", boost: 4 },

  // Overview/summary queries
  { pattern: /(genel\s+durum|özet|summary|overview)/i, domain: "strategy", type: "overview", boost: 5 },
  { pattern: /(neler\s+oluyor|neler\s+var|ne\s+durumda)/i, domain: "strategy", type: "overview", boost: 4 },
  { pattern: /(son\s+durum|güncel|current\s+state)/i, domain: "strategy", type: "overview", boost: 4 },

  // Financial queries
  { pattern: /(toplam\s+gelir|total\s+revenue|ciro)/i, domain: "finance", type: "aggregate", boost: 5 },
  { pattern: /(kâr|zarar|profit|loss)/i, domain: "finance", type: "aggregate", boost: 5 },
  { pattern: /(gelir.?gider|income.?expense)/i, domain: "finance", type: "aggregate", boost: 5 },

  // Time-based queries
  { pattern: /(bu\s+ay|bu\s+hafta|this\s+month|this\s+week)/i, domain: "strategy", type: "trend", boost: 2 },
  { pattern: /(son\s+\d+\s+gün|last\s+\d+\s+days)/i, domain: "strategy", type: "trend", boost: 2 },

  // Comparison/analysis queries
  { pattern: /(karşılaştır|compare|vs|fark)/i, domain: "strategy", type: "comparison", boost: 3 },
  { pattern: /(en\s+çok|en\s+az|top|worst|best)/i, domain: "strategy", type: "ranking", boost: 3 },

  // Problem detection
  { pattern: /(sorun|problem|hata|error|issue|kritik|critical)/i, domain: "operations", type: "alert", boost: 3 },
  { pattern: /(düşük\s+stok|low\s+stock|stok\s+az)/i, domain: "commerce", type: "alert", boost: 4 },
  { pattern: /(gecik|delay|bekle|pending|overdue)/i, domain: "operations", type: "alert", boost: 3 },
];

// ─── Core Intent Analysis ───────────────────────────────────────────────────

export function analyzeIntent(message: string): IntentSignal[] {
  const msg = message.toLowerCase().trim();
  const scores: Record<AgentRole, { score: number; keywords: string[]; patterns: string[] }> = {
    coordinator: { score: 0, keywords: [], patterns: [] },
    customer: { score: 0, keywords: [], patterns: [] },
    commerce: { score: 0, keywords: [], patterns: [] },
    marketing: { score: 0, keywords: [], patterns: [] },
    finance: { score: 0, keywords: [], patterns: [] },
    operations: { score: 0, keywords: [], patterns: [] },
    strategy: { score: 0, keywords: [], patterns: [] },
  };

  // Phase 1: Keyword matching with weights
  for (const [domain, groups] of Object.entries(TAXONOMY)) {
    for (const group of groups) {
      for (const kw of group.keywords) {
        if (msg.includes(kw.toLowerCase())) {
          scores[domain as AgentRole].score += group.weight;
          scores[domain as AgentRole].keywords.push(kw);
        }
      }
    }
  }

  // Phase 2: Pattern matching with boost
  for (const { pattern, domain, type, boost } of QUERY_PATTERNS) {
    if (pattern.test(msg)) {
      scores[domain].score += boost;
      scores[domain].patterns.push(type);
    }
  }

  // Phase 3: Short/vague message detection → default to strategy
  const wordCount = msg.split(/\s+/).length;
  if (wordCount <= 3) {
    const totalScore = Object.values(scores).reduce((sum, s) => sum + s.score, 0);
    if (totalScore < 3) {
      scores.strategy.score += 3;
      scores.strategy.patterns.push("short_query_default");
    }
  }

  // Phase 4: Greeting detection
  const greetingPatterns = /^(merhaba|selam|hey|hi|hello|günaydın|iyi\s+(akşamlar|günler))/i;
  if (greetingPatterns.test(msg)) {
    scores.strategy.score += 5;
    scores.strategy.patterns.push("greeting");
  }

  // Convert to signals, normalize confidence
  const maxScore = Math.max(...Object.values(scores).map(s => s.score), 1);
  const signals: IntentSignal[] = Object.entries(scores)
    .filter(([, s]) => s.score > 0)
    .map(([domain, s]) => ({
      domain: domain as AgentRole,
      confidence: Math.min(s.score / maxScore, 1),
      keywords: [...new Set(s.keywords)],
      patterns: [...new Set(s.patterns)],
    }))
    .sort((a, b) => b.confidence - a.confidence);

  // Ensure at least strategy is present
  if (signals.length === 0) {
    signals.push({
      domain: "strategy",
      confidence: 0.5,
      keywords: [],
      patterns: ["fallback"],
    });
  }

  return signals;
}

/** Get the primary agent for a set of signals */
export function getPrimaryAgent(signals: IntentSignal[]): AgentRole {
  return signals[0]?.domain ?? "strategy";
}

/** Get supporting agents (confidence > 0.3, not primary) */
export function getSupportingAgents(signals: IntentSignal[]): AgentRole[] {
  const primary = getPrimaryAgent(signals);
  return signals
    .filter(s => s.domain !== primary && s.confidence > 0.3)
    .slice(0, 2) // max 2 supporting agents
    .map(s => s.domain);
}
