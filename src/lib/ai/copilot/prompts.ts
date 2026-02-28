// ─── Atlas Copilot — Domain Expert Prompts ──────────────────────────────────
// Each agent has a specialized system prompt that shapes its personality,
// expertise, and response style. Turkish-first, professional tone.
// ─────────────────────────────────────────────────────────────────────────────
import type { AgentRole, AssembledContext } from "./types";

// ─── Base Identity ──────────────────────────────────────────────────────────
const BASE_IDENTITY = `Sen "Atlas AI" — Atlas Platform'un yapay zeka asistanısın.
Atlas, Türk girişimcilerin ABD pazarına açılmasına yardımcı olan bir B2B SaaS platformudur.

KRİTİK KURALLAR:
- SADECE Türkçe yaz — kesinlikle başka dil kullanma (Çince, İngilizce, vb. YASAK)
- Kullanıcının sorusuna DOĞRUDAN cevap ver — gereksiz rapor üretme
- Kısa ve öz ol — kullanıcı sormadığı bilgiyi verme
- Emin olmadığın bilgiyi UYDURMA — "bu veri mevcut değil" de
- SADECE sana verilen gerçek verileri kullan
- Robot gibi değil, samimi ve profesyonel bir danışman gibi konuş
- Soru soruluyorsa soru cevapla, analiz isteniyorsa analiz yap, sohbet ediliyorsa sohbet et`;

// ─── Domain Expert Descriptions (concise) ───────────────────────────────────

const EXPERT_ROLES: Record<Exclude<AgentRole, "coordinator">, string> = {
  customer: "Müşteri ilişkileri uzmanısın. Kullanıcılar, şirketler, abonelikler, faturalar konusunda bilgi verirsin.",
  commerce: "E-ticaret ve lojistik uzmanısın. Siparişler, ürünler, stok, sevkiyat konusunda bilgi verirsin.",
  marketing: "Dijital pazarlama uzmanısın. Pazaryerleri, sosyal medya, reklam kampanyaları konusunda bilgi verirsin.",
  finance: "Finans uzmanısın. Gelir, gider, kâr, nakit akışı, faturalar konusunda bilgi verirsin.",
  operations: "Operasyon uzmanısın. Destek talepleri, formlar, görevler, bildirimler konusunda bilgi verirsin.",
  strategy: "Strateji uzmanısın. Genel durum, KPI'lar, trendler, cross-domain analizler konusunda bilgi verirsin.",
};

// ─── Data Summarizer ────────────────────────────────────────────────────────

/** Convert raw domain data into concise Turkish text (not raw JSON) */
function summarizeDomainData(domains: AssembledContext["domains"]): string {
  if (domains.length === 0) return "Veritabanından veri çekilemedi.";

  const lines: string[] = [];

  for (const domain of domains) {
    const d = domain.data as Record<string, unknown>;
    lines.push(`\n## ${domain.label} (${domain.recordCount} kayıt)`);

    // Smart summarization - extract key metrics, skip raw arrays
    for (const [key, value] of Object.entries(d)) {
      if (value === null || value === undefined) continue;

      // Numbers → direct display
      if (typeof value === "number") {
        lines.push(`- ${formatKey(key)}: ${formatNumber(value)}`);
        continue;
      }

      // String → direct display
      if (typeof value === "string") {
        lines.push(`- ${formatKey(key)}: ${value}`);
        continue;
      }

      // Small object (distribution) → inline
      if (typeof value === "object" && !Array.isArray(value)) {
        const entries = Object.entries(value as Record<string, unknown>);
        if (entries.length <= 8) {
          const parts = entries.map(([k, v]) => `${k}: ${v}`).join(", ");
          lines.push(`- ${formatKey(key)}: ${parts}`);
        }
        continue;
      }

      // Array → summarize count + first few items
      if (Array.isArray(value)) {
        if (value.length === 0) {
          lines.push(`- ${formatKey(key)}: (boş)`);
        } else if (value.length <= 3) {
          // Show all items compactly
          for (const item of value) {
            if (typeof item === "object" && item !== null) {
              const compact = compactObject(item as Record<string, unknown>);
              lines.push(`  • ${compact}`);
            } else {
              lines.push(`  • ${String(item)}`);
            }
          }
        } else {
          // Show count + first 2
          lines.push(`- ${formatKey(key)}: ${value.length} kayıt`);
          for (const item of value.slice(0, 2)) {
            if (typeof item === "object" && item !== null) {
              const compact = compactObject(item as Record<string, unknown>);
              lines.push(`  • ${compact}`);
            }
          }
          if (value.length > 2) {
            lines.push(`  • ... ve ${value.length - 2} kayıt daha`);
          }
        }
        continue;
      }
    }
  }

  return lines.join("\n");
}

/** Format snake_case Turkish key to human-readable */
function formatKey(key: string): string {
  return key.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase());
}

/** Format number for readability */
function formatNumber(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toLocaleString("tr-TR");
}

/** Compact a row object into one-line summary */
function compactObject(obj: Record<string, unknown>): string {
  const important = ["id", "email", "company_name", "status", "amount", "title", "name",
    "first_name", "last_name", "plan_tier", "company_type", "platform", "created_at",
    "total_amount", "order_status", "onboarding_status", "account_name", "subject"];

  const parts: string[] = [];
  for (const key of important) {
    if (obj[key] !== null && obj[key] !== undefined) {
      parts.push(`${String(obj[key])}`);
    }
  }

  // If no important keys found, take first 3 values
  if (parts.length === 0) {
    const vals = Object.values(obj).filter(v => v != null).slice(0, 3);
    parts.push(...vals.map(v => String(v)));
  }

  return parts.join(" | ");
}

// ─── Context Injection ──────────────────────────────────────────────────────

/**
 * Build the complete system prompt for the LLM:
 * 1. Domain expert identity (concise)
 * 2. Summarized database context (NOT raw JSON)
 * 3. Conversation-first instructions
 */
export function buildSystemPrompt(context: AssembledContext): string {
  const primaryAgent = context.plan.primaryAgent === "coordinator"
    ? "strategy"
    : context.plan.primaryAgent;

  const expertRole = EXPERT_ROLES[primaryAgent as Exclude<AgentRole, "coordinator">] ?? EXPERT_ROLES.strategy;

  const dataSummary = summarizeDomainData(context.domains);

  return `${BASE_IDENTITY}
${expertRole}

## Mevcut Platform Verileri (${new Date().toLocaleDateString("tr-TR")})
${dataSummary}

ÖNEMLİ: Kullanıcının sorusuna DOĞRUDAN yanıt ver. Soru sormadığı konu hakkında uzun rapor yazma.`;
}

/**
 * Build a thinking/reasoning prompt — guides the LLM on how to respond.
 */
export function buildThinkingPrompt(context: AssembledContext, userMessage: string): string {
  return `Kullanıcı: "${userMessage}"

Bu soruya/talebe yanıt ver. Elindeki platform verilerini kullanarak doğrudan, kısa ve net cevap oluştur.
Kullanıcı sormadığı detayları verme. Sohbet ediyorsa sohbet et.`;
}

/** Get the expert role description for a specific agent (exported for testing) */
export function getExpertPrompt(agent: AgentRole): string {
  const key = agent === "coordinator" ? "strategy" : agent;
  return EXPERT_ROLES[key as Exclude<AgentRole, "coordinator">] ?? EXPERT_ROLES.strategy;
}
