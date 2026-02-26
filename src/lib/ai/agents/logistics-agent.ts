/**
 * Logistics Agent — Lojistik Ajanı
 *
 * CTO Raporu: Envanter durumu, sipariş kontrolü, kargo takibi,
 * stok optimizasyonu, depo operasyonları
 */

import { createClient } from "@/lib/supabase/server";
import type { AgentTool } from "./types";

export const LOGISTICS_SYSTEM_PROMPT = `Sen Atlas platformunun Logistics (Lojistik) ajanısın. Görevin:
- Envanter durumunu sorgula (TR/US depoları)
- Sipariş durumlarını kontrol et
- Kargo takip bilgisi sağla
- Stok optimizasyonu önerileri sun
- Depo operasyonları hakkında bilgi ver
- Veri tabanlı yanıtlar üret, somut rakamlar kullan`;

/**
 * Logistics agent tool'larını oluştur
 */
export async function createLogisticsTools(userId: string): Promise<AgentTool[]> {
  const supabase = await createClient();

  return [
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
  ];
}
