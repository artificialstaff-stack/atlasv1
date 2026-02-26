/**
 * Atlas Multi-Agent System
 * 4 uzman ajan: Orchestrator, Compliance, Logistics, Auditor
 *
 * CTO Raporu Bölüm 6: Çoklu Ajan Mimarisi
 * Orchestrator → alt ajanlara yönlendirir
 * Compliance → LLC, EIN, vergi uyumu
 * Logistics → envanter, kargo, depo
 * Auditor → tüm aksiyonları denetler, log tutar
 */

import { createClient } from "@/lib/supabase/server";

// ─── Agent Tanımları ───

export type AgentRole = "orchestrator" | "compliance" | "logistics" | "auditor";

export interface AgentMessage {
  role: "user" | "agent" | "system";
  content: string;
  agentRole?: AgentRole;
  timestamp: string;
  metadata?: Record<string, unknown>;
}

export interface AgentAction {
  id: string;
  agentRole: AgentRole;
  actionType: string;
  description: string;
  status: "pending" | "approved" | "rejected" | "executed";
  /** Human-in-the-Loop: onay gerekli mi? */
  requiresApproval: boolean;
  payload: Record<string, unknown>;
  result?: Record<string, unknown>;
  createdAt: string;
  executedAt?: string;
}

// ─── Agent System Prompts ───

export const AGENT_SYSTEM_PROMPTS: Record<AgentRole, string> = {
  orchestrator: `Sen Atlas platformunun Orchestrator ajanısın. Görevin:
- Kullanıcı isteklerini analiz et ve doğru uzman ajana yönlendir
- Compliance (LLC, EIN, vergi), Logistics (envanter, kargo, depo), Auditor (denetim) ajanları arasında koordinasyon sağla
- Çoklu ajan sonuçlarını birleştirip kullanıcıya sun
- Türkçe yanıt ver, teknik detayları basitleştir
- Belirsiz isteklerde önce netleştirme sorusu sor`,

  compliance: `Sen Atlas platformunun Compliance (Uyum) ajanısın. Görevin:
- LLC kuruluş süreçleri hakkında bilgi ver
- EIN numarası başvuru durumunu kontrol et
- ABD vergi uyumu konusunda rehberlik yap
- Gümrük belgeleri ve ithalat/ihracat mevzuatı
- Sadece kendi alanındaki sorulara cevap ver
- Hassas kararlar için Human-in-the-Loop onayı iste`,

  logistics: `Sen Atlas platformunun Logistics (Lojistik) ajanısın. Görevin:
- Envanter durumunu sorgula (TR/US depoları)
- Sipariş durumlarını kontrol et
- Kargo takip bilgisi sağla
- Stok optimizasyonu önerileri sun
- Depo operasyonları hakkında bilgi ver
- Veri tabanlı yanıtlar üret, somut rakamlar kullan`,

  auditor: `Sen Atlas platformunun Auditor (Denetçi) ajanısın. Görevin:
- Tüm ajan aksiyonlarını denetle ve logla
- Güvenlik politikalarına uyumu kontrol et
- Anormal aktiviteleri tespit et
- Ajan kararlarının tutarlılığını doğrula
- Audit trail oluştur
- Risk skoru hesapla`,
};

// ─── Autonomy Levels (CTO Raporu: Otonom → İnsan Onaylı) ───

export type AutonomyLevel = 0 | 1 | 2 | 3;

export const AUTONOMY_LABELS: Record<AutonomyLevel, string> = {
  0: "Salt Okunur — Sadece bilgi sorgulama",
  1: "Öneri — Aksiyon önerir, kullanıcı onaylar",
  2: "Otomatik + Bildirim — Düşük riskli aksiyonları otomatik yapar",
  3: "Tam Otonom — Tüm aksiyonları bağımsız yürütür",
};

/**
 * Aksiyon risk seviyesi → minimum autonomy level gereksinimi
 */
export const ACTION_RISK_LEVELS: Record<string, AutonomyLevel> = {
  // Level 0 — herkes
  "query:products": 0,
  "query:orders": 0,
  "query:tasks": 0,
  "query:documents": 0,
  "query:tickets": 0,

  // Level 1 — öneri + onay
  "create:ticket": 1,
  "update:ticket": 1,
  "suggest:optimization": 1,

  // Level 2 — otomatik + bildirim
  "update:task_status": 2,
  "notify:low_stock": 2,
  "generate:report": 2,

  // Level 3 — tam otonom
  "create:order": 3,
  "update:order": 3,
  "modify:inventory": 3,
  "execute:bulk_action": 3,
};

// ─── Agent Tools (Supabase bağlantılı) ───

export interface AgentTool {
  name: string;
  description: string;
  agentRole: AgentRole;
  riskLevel: AutonomyLevel;
  handler: (params: Record<string, unknown>) => Promise<unknown>;
}

/**
 * Agent tool'larını oluştur — server-side only
 * Her tool Supabase'e bağlı, RLS ile korumalı
 */
export async function createAgentTools(userId: string): Promise<AgentTool[]> {
  const supabase = await createClient();

  return [
    // Logistics tools
    {
      name: "query_products",
      description: "Kullanıcının ürünlerini ve stok bilgilerini sorgula",
      agentRole: "logistics",
      riskLevel: 0,
      handler: async () => {
        const { data } = await supabase
          .from("products")
          .select("id, name, sku, stock_turkey, stock_us, base_price")
          .eq("owner_id", userId)
          .eq("is_active", true);
        return data;
      },
    },
    {
      name: "query_orders",
      description: "Kullanıcının siparişlerini sorgula",
      agentRole: "logistics",
      riskLevel: 0,
      handler: async () => {
        const { data } = await supabase
          .from("orders")
          .select("id, status, platform, platform_order_id, tracking_ref, created_at")
          .eq("user_id", userId)
          .order("created_at", { ascending: false })
          .limit(20);
        return data;
      },
    },
    {
      name: "query_inventory_alerts",
      description: "Düşük stok uyarılarını getir",
      agentRole: "logistics",
      riskLevel: 0,
      handler: async () => {
        const { data } = await supabase
          .from("products")
          .select("id, name, sku, stock_turkey, stock_us")
          .eq("owner_id", userId)
          .eq("is_active", true)
          .or("stock_turkey.lt.10,stock_us.lt.10");
        return data;
      },
    },

    // Compliance tools
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

    // Support tools
    {
      name: "query_tickets",
      description: "Destek taleplerini sorgula",
      agentRole: "orchestrator",
      riskLevel: 0,
      handler: async () => {
        const { data } = await supabase
          .from("support_tickets")
          .select("id, subject, status, priority, created_at")
          .eq("user_id", userId)
          .order("created_at", { ascending: false })
          .limit(10);
        return data;
      },
    },
    {
      name: "create_support_ticket",
      description: "Yeni destek talebi oluştur — onay gerektirir",
      agentRole: "orchestrator",
      riskLevel: 1,
      handler: async (params) => {
        const { data, error } = await supabase
          .from("support_tickets")
          .insert({
            user_id: userId,
            subject: params.subject as string,
            description: params.description as string,
            priority: (params.priority as string) ?? "medium",
          })
          .select()
          .single();
        if (error) throw error;
        return data;
      },
    },
  ];
}
