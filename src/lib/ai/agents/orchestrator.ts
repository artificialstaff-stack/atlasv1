/**
 * Orchestrator Agent — Koordinasyon Ajanı
 *
 * CTO Raporu Bölüm 6: Çoklu Ajan Mimarisi
 * Kullanıcı isteğini analiz eder, doğru uzman ajana yönlendirir,
 * sonuçları birleştirir.
 */

import type { AgentRole } from "./types";

export const ORCHESTRATOR_SYSTEM_PROMPT = `Sen Atlas platformunun Orchestrator ajanısın. Görevin:
- Kullanıcı isteklerini analiz et ve doğru uzman ajana yönlendir
- Compliance (LLC, EIN, vergi), Logistics (envanter, kargo, depo), Auditor (denetim) ajanları arasında koordinasyon sağla
- Çoklu ajan sonuçlarını birleştirip kullanıcıya sun
- Türkçe yanıt ver, teknik detayları basitleştir
- Belirsiz isteklerde önce netleştirme sorusu sor`;

/**
 * İsteği analiz edip hangi ajana yönlendirileceğini belirle
 */
export function routeToAgent(userMessage: string): AgentRole {
  const msg = userMessage.toLowerCase();

  // Compliance agent keywords
  if (
    msg.includes("llc") ||
    msg.includes("ein") ||
    msg.includes("vergi") ||
    msg.includes("tax") ||
    msg.includes("şirket kur") ||
    msg.includes("company") ||
    msg.includes("gümrük") ||
    msg.includes("customs") ||
    msg.includes("belge") ||
    msg.includes("document") ||
    msg.includes("uyum") ||
    msg.includes("compliance")
  ) {
    return "compliance";
  }

  // Logistics agent keywords
  if (
    msg.includes("sipariş") ||
    msg.includes("order") ||
    msg.includes("envanter") ||
    msg.includes("inventory") ||
    msg.includes("stok") ||
    msg.includes("stock") ||
    msg.includes("kargo") ||
    msg.includes("shipping") ||
    msg.includes("depo") ||
    msg.includes("warehouse") ||
    msg.includes("ürün") ||
    msg.includes("product")
  ) {
    return "logistics";
  }

  // Auditor keywords
  if (
    msg.includes("denetim") ||
    msg.includes("audit") ||
    msg.includes("güvenlik") ||
    msg.includes("security") ||
    msg.includes("risk") ||
    msg.includes("log")
  ) {
    return "auditor";
  }

  // Default: orchestrator handles it
  return "orchestrator";
}

/**
 * Birden fazla ajanın sonucunu birleştir
 */
export function mergeAgentResults(
  results: { agentRole: AgentRole; content: string }[]
): string {
  if (results.length === 0) return "Sonuç bulunamadı.";
  if (results.length === 1) return results[0].content;

  return results
    .map((r) => `**${r.agentRole.toUpperCase()}**: ${r.content}`)
    .join("\n\n");
}
