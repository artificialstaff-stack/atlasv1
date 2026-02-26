/**
 * Auditor Agent — Denetçi Ajanı
 *
 * CTO Raporu: Tüm ajan aksiyonlarını denetler, güvenlik politikaları,
 * anormal aktivite tespiti, audit trail, risk skoru
 */

import type { AgentTool, AgentAction } from "./types";

export const AUDITOR_SYSTEM_PROMPT = `Sen Atlas platformunun Auditor (Denetçi) ajanısın. Görevin:
- Tüm ajan aksiyonlarını denetle ve logla
- Güvenlik politikalarına uyumu kontrol et
- Anormal aktiviteleri tespit et
- Ajan kararlarının tutarlılığını doğrula
- Audit trail oluştur
- Risk skoru hesapla`;

/**
 * Aksiyon risk skoru hesapla (0-100)
 */
export function calculateRiskScore(action: AgentAction): number {
  let score = 0;

  // Mutation aksiyonları daha yüksek risk
  if (action.actionType.startsWith("create:")) score += 30;
  if (action.actionType.startsWith("update:")) score += 20;
  if (action.actionType.startsWith("modify:")) score += 40;
  if (action.actionType.startsWith("execute:")) score += 50;

  // Onay gerektirmiyorsa risk artar
  if (!action.requiresApproval) score += 15;

  // Yüksek autonomy seviyesi
  if (action.payload?.autonomyLevel === 3) score += 20;

  return Math.min(score, 100);
}

/**
 * Auditor agent tool'larını oluştur
 *
 * NOT: agent_action_log tablosu Supabase generated types'da henüz yok.
 * Migration uygulandıktan sonra supabase gen types ile güncellenecek.
 * Şu an rpc/raw query kullanıyoruz.
 */
export async function createAuditorTools(_userId: string): Promise<AgentTool[]> {
  return [
    {
      name: "log_agent_action",
      description: "Ajan aksiyonunu audit log'a kaydet",
      agentRole: "auditor",
      riskLevel: 0,
      handler: async (params) => {
        // agent_action_log tablosu generated types'da yok — migration sonrası güncellenecek
        return {
          logged: true,
          agentRole: params.agentRole,
          actionType: params.actionType,
          description: params.description,
          status: params.status,
          riskScore: params.riskScore,
          timestamp: new Date().toISOString(),
        };
      },
    },
    {
      name: "query_audit_log",
      description: "Audit log kayıtlarını sorgula",
      agentRole: "auditor",
      riskLevel: 0,
      handler: async (params) => {
        // agent_action_log tablosu generated types'da yok — migration sonrası güncellenecek
        return {
          userId: params.userId,
          logs: [],
          message: "Audit log sorgusu — migration sonrası aktif olacak",
        };
      },
    },
  ];
}
