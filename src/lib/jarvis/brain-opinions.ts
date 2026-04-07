/**
 * ─── Brain Opinions — Provider Preference Learning ───
 *
 * Jarvis'in beyninin provider'lar hakkında fikir oluşturması.
 * Her API çağrısını gözlemler, istatistik toplar, tercih puanı üretir.
 * Procedural memory'ye kayıt eder ve self-report'a dahil eder.
 *
 * Beyin şunları söyleyebilir:
 *   "Groq hızlı ama limiti sık doluyor"
 *   "OpenAI kodda daha iyi sonuç veriyor"
 *   "Anthropic uzun context'te güvenilir"
 */

import {
  getAllProviderHealth,
  getMetricsBuffer,
  recomputeOpinions,
  getAllOpinions,
} from "@/lib/ai/provider-registry";
import type { ProviderOpinion, ProviderHealthSummary, AiModelSlot } from "@/lib/ai/provider-types";

// ──────────────────────────────────────
// Brain Opinion Report
// ──────────────────────────────────────

export interface BrainProviderReport {
  /** When this report was generated */
  generatedAt: string;
  /** Health status of all providers */
  providers: ProviderHealthSummary[];
  /** Brain's learned preferences per slot */
  opinions: ProviderOpinion[];
  /** High-level natural language assessment */
  summary: string[];
  /** Recommendations / warnings */
  recommendations: string[];
}

/**
 * Generate a comprehensive brain opinion report about all providers.
 * Called by self-report and admin API.
 */
export function generateProviderReport(): BrainProviderReport {
  recomputeOpinions();

  const providers = getAllProviderHealth();
  const opinions = getAllOpinions();
  const metrics = getMetricsBuffer();

  const summary: string[] = [];
  const recommendations: string[] = [];

  // Analyze overall state
  const available = providers.filter((p) => p.enabled && p.isAvailable && !p.isRateLimited);
  const rateLimited = providers.filter((p) => p.isRateLimited);
  const unavailable = providers.filter((p) => !p.isAvailable);

  if (available.length === 0) {
    summary.push("⚠️ Hiçbir provider kullanılabilir durumda değil!");
    recommendations.push("Acil: En az bir LLM API key'i ekleyin veya Ollama'yı başlatın.");
  } else if (available.length === 1) {
    summary.push(`Tek aktif provider: ${available[0].name}. Yedek provider eklenirse kesinti riski azalır.`);
    recommendations.push(`${available[0].name} tek başına çalışıyor — rate limit'e takılırsa beyin durur. İkinci bir provider eklemeyi düşünün.`);
  } else {
    summary.push(`${available.length} provider aktif — otomatik failover hazır.`);
  }

  // Rate limit warnings
  for (const p of rateLimited) {
    const resetIn = p.rateLimitResetAt ? Math.max(0, Math.round((p.rateLimitResetAt - Date.now()) / 1000)) : null;
    summary.push(`${p.name} rate-limited${resetIn ? ` — ${resetIn}s sonra düzelecek` : ""}.`);
  }

  // Unavailable warnings
  for (const p of unavailable) {
    summary.push(`${p.name} erişilemez${p.lastErrorType ? ` (${p.lastErrorType})` : ""}.`);
  }

  // Speed analysis
  const fastOps = opinions.filter((o) => o.slot === "fast" && o.sampleCount > 3);
  if (fastOps.length > 1) {
    const best = fastOps.sort((a, b) => b.preferenceScore - a.preferenceScore)[0];
    summary.push(`Hız slotu için en iyi: ${best.providerId} (skor: ${best.preferenceScore.toFixed(2)}).`);
  }

  // Code analysis
  const codeOps = opinions.filter((o) => o.slot === "code" && o.sampleCount > 3);
  if (codeOps.length > 1) {
    const best = codeOps.sort((a, b) => b.preferenceScore - a.preferenceScore)[0];
    summary.push(`Kod slotu için en iyi: ${best.providerId} (skor: ${best.preferenceScore.toFixed(2)}).`);
  }

  // Usage stats
  const totalRequests = providers.reduce((sum, p) => sum + p.requestCount, 0);
  if (totalRequests > 0) {
    summary.push(`Toplam ${totalRequests} istek işlendi.`);
  }

  // Per-provider recommendations
  for (const p of providers) {
    if (p.enabled && p.consecutiveErrors >= 3 && p.isAvailable) {
      recommendations.push(
        `${p.name}: ${p.consecutiveErrors} ardışık hata — API key'ini kontrol edin.`,
      );
    }
    if (p.averageLatencyMs > 5000 && p.requestCount > 5) {
      recommendations.push(
        `${p.name}: Ortalama ${p.averageLatencyMs}ms latency — yavaş, daha hızlı bir provider eklemeyi düşünün.`,
      );
    }
  }

  return {
    generatedAt: new Date().toISOString(),
    providers,
    opinions,
    summary,
    recommendations,
  };
}

/**
 * Get the brain's top recommendation for a specific slot.
 */
export function getBrainRecommendation(slot: AiModelSlot): {
  providerId: string;
  reason: string;
} | null {
  recomputeOpinions();
  const slotOpinions = getAllOpinions().filter(
    (o) => o.slot === slot && o.sampleCount >= 3,
  );
  if (slotOpinions.length === 0) return null;
  const best = slotOpinions.sort((a, b) => b.preferenceScore - a.preferenceScore)[0];
  return { providerId: best.providerId, reason: best.reason };
}
