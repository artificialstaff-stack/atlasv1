/**
 * Compliance Agent — Yasal Uyum Ajanı
 *
 * CTO Raporu: LLC kuruluş süreçleri, EIN başvuru, ABD vergi uyumu,
 * gümrük belgeleri, ithalat/ihracat mevzuatı
 */

import { createClient } from "@/lib/supabase/server";
import type { AgentTool } from "./types";

export const COMPLIANCE_SYSTEM_PROMPT = `Sen Atlas platformunun Compliance (Uyum) ajanısın. Görevin:
- LLC kuruluş süreçleri hakkında bilgi ver
- EIN numarası başvuru durumunu kontrol et
- ABD vergi uyumu konusunda rehberlik yap
- Gümrük belgeleri ve ithalat/ihracat mevzuatı
- Sadece kendi alanındaki sorulara cevap ver
- Hassas kararlar için Human-in-the-Loop onayı iste`;

/**
 * Compliance agent tool'larını oluştur
 */
export async function createComplianceTools(userId: string): Promise<AgentTool[]> {
  const supabase = await createClient();

  return [
    {
      name: "query_process_tasks",
      description: "LLC/EIN süreç görevlerini sorgula",
      agentRole: "compliance",
      riskLevel: 0,
      handler: async () => {
        const { data } = await supabase
          .from("process_tasks")
          .select("*")
          .eq("user_id", userId)
          .order("sort_order", { ascending: true });
        return data;
      },
    },
    {
      name: "query_documents",
      description: "Kullanıcının belgelerini listele",
      agentRole: "compliance",
      riskLevel: 0,
      handler: async () => {
        const { data } = await supabase.storage
          .from("customer-documents")
          .list(userId, { limit: 50 });
        return data?.filter((f) => f.id !== null) ?? [];
      },
    },
  ];
}
