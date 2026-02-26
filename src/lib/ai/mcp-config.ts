/**
 * ─── Atlas MCP Server Konfigürasyonu ───
 * 
 * Model Context Protocol (MCP) — AI ajanlarının dış dünyayla
 * iletişim kurmasını sağlayan standart protokol.
 * 
 * MCP Araçları:
 *   - database_query : Supabase sorguları
 *   - spatial_analysis : A5 DGGS mekansal hesaplamalar
 *   - user_session : Kullanıcı oturum bilgisi
 *   - api_call : Dış API entegrasyonları
 * 
 * Not: Bu dosya Phase 4 (Sprint 14-17) tam implementasyon için
 * temel yapıyı tanımlar.
 */

import type { MCPServerConfig, MCPTool } from "./agent-types";

// ─── ATLAS MCP ARAÇLARI ───

const atlasMCPTools: MCPTool[] = [
  // Veritabanı Araçları
  {
    name: "atlas.db.customers",
    type: "database_query",
    description: "Müşteri verilerini sorgular. Filtreleme, arama ve sayfalama destekler.",
    inputSchema: {
      type: "object",
      properties: {
        query: { type: "string", description: "Arama terimi (isim, telefon, e-posta)" },
        status: { type: "string", enum: ["active", "passive"] },
        limit: { type: "number", default: 20, maximum: 100 },
        offset: { type: "number", default: 0 },
      },
    },
    outputSchema: {
      type: "object",
      properties: {
        data: { type: "array", items: { type: "object" } },
        total: { type: "number" },
      },
    },
    requiresAuth: true,
    rateLimit: { maxCalls: 60, windowMs: 60_000 },
  },
  {
    name: "atlas.db.orders",
    type: "database_query",
    description: "Sipariş verilerini sorgular. Durum filtresi ve tarih aralığı destekler.",
    inputSchema: {
      type: "object",
      properties: {
        customerId: { type: "string", format: "uuid" },
        status: { type: "string", enum: ["pending", "processing", "shipped", "delivered", "cancelled"] },
        dateFrom: { type: "string", format: "date" },
        dateTo: { type: "string", format: "date" },
        limit: { type: "number", default: 20, maximum: 100 },
      },
    },
    outputSchema: {
      type: "object",
      properties: {
        data: { type: "array", items: { type: "object" } },
        total: { type: "number" },
        summary: {
          type: "object",
          properties: {
            totalAmount: { type: "number" },
            averageAmount: { type: "number" },
          },
        },
      },
    },
    requiresAuth: true,
    rateLimit: { maxCalls: 60, windowMs: 60_000 },
  },
  {
    name: "atlas.db.inventory",
    type: "database_query",
    description: "Envanter verilerini sorgular. Stok durumu ve kategori filtresi destekler.",
    inputSchema: {
      type: "object",
      properties: {
        query: { type: "string", description: "Ürün adı veya SKU ile arama" },
        category: { type: "string" },
        lowStock: { type: "boolean", description: "Düşük stoklu ürünleri filtrele" },
        limit: { type: "number", default: 20, maximum: 100 },
      },
    },
    outputSchema: {
      type: "object",
      properties: {
        data: { type: "array", items: { type: "object" } },
        total: { type: "number" },
        lowStockCount: { type: "number" },
      },
    },
    requiresAuth: true,
    rateLimit: { maxCalls: 60, windowMs: 60_000 },
  },
  {
    name: "atlas.db.leads",
    type: "database_query",
    description: "Potansiyel müşteri (lead) verilerini sorgular ve analiz eder.",
    inputSchema: {
      type: "object",
      properties: {
        status: { type: "string", enum: ["new", "contacted", "qualified", "proposal", "won", "lost"] },
        source: { type: "string" },
        assignedTo: { type: "string", format: "uuid" },
        limit: { type: "number", default: 20, maximum: 100 },
      },
    },
    outputSchema: {
      type: "object",
      properties: {
        data: { type: "array", items: { type: "object" } },
        total: { type: "number" },
        conversionRate: { type: "number" },
      },
    },
    requiresAuth: true,
    rateLimit: { maxCalls: 30, windowMs: 60_000 },
  },
  
  // Mekansal Analiz Araçları
  {
    name: "atlas.spatial.heatmap",
    type: "spatial_analysis",
    description: "Belirtilen bölge ve veri kaynağı için ısı haritası verileri üretir.",
    inputSchema: {
      type: "object",
      properties: {
        bounds: {
          type: "object",
          properties: {
            north: { type: "number" },
            south: { type: "number" },
            east: { type: "number" },
            west: { type: "number" },
          },
          required: ["north", "south", "east", "west"],
        },
        dataSource: { type: "string", enum: ["orders", "customers", "leads"] },
        resolution: { type: "number", description: "A5 DGGS çözünürlük seviyesi (4-10)", minimum: 4, maximum: 10 },
      },
      required: ["bounds", "dataSource"],
    },
    outputSchema: {
      type: "object",
      properties: {
        cells: { type: "array", items: { type: "object" } },
        stats: { type: "object" },
      },
    },
    requiresAuth: true,
    rateLimit: { maxCalls: 10, windowMs: 60_000 },
  },
  {
    name: "atlas.spatial.cluster",
    type: "spatial_analysis",
    description: "Mekansal veri noktalarını kümeleyerek analiz eder.",
    inputSchema: {
      type: "object",
      properties: {
        dataSource: { type: "string", enum: ["orders", "customers", "leads"] },
        clusterRadius: { type: "number", default: 50, description: "Pixel cinsinden küme yarıçapı" },
        zoom: { type: "number", minimum: 0, maximum: 22 },
      },
      required: ["dataSource"],
    },
    outputSchema: {
      type: "object",
      properties: {
        clusters: { type: "array", items: { type: "object" } },
        totalPoints: { type: "number" },
        clusterCount: { type: "number" },
      },
    },
    requiresAuth: true,
    rateLimit: { maxCalls: 10, windowMs: 60_000 },
  },

  // Kullanıcı Oturum Araçları
  {
    name: "atlas.session.context",
    type: "user_session",
    description: "Aktif kullanıcının oturum bilgilerini ve rolünü döndürür.",
    inputSchema: {
      type: "object",
      properties: {},
    },
    outputSchema: {
      type: "object",
      properties: {
        userId: { type: "string" },
        email: { type: "string" },
        role: { type: "string", enum: ["admin", "client"] },
        currentPage: { type: "string" },
        preferences: { type: "object" },
      },
    },
    requiresAuth: true,
    rateLimit: { maxCalls: 120, windowMs: 60_000 },
  },
];

// ─── MCP SUNUCU KONFİGÜRASYONU ───

export const atlasMCPServerConfig: MCPServerConfig = {
  name: "atlas-mcp-server",
  version: "0.1.0",
  tools: atlasMCPTools,
  capabilities: {
    prompts: true,     // Prompt şablonları
    resources: true,   // Kaynak erişimi
    tools: true,       // Araç çağrıları
  },
};

// ─── YARDIMCI FONKSİYONLAR ───

/**
 * MCP aracını isimle bulur
 */
export function findMCPTool(name: string): MCPTool | undefined {
  return atlasMCPTools.find((t) => t.name === name);
}

/**
 * Belirtilen türdeki tüm araçları döndürür
 */
export function getMCPToolsByType(type: MCPTool["type"]): MCPTool[] {
  return atlasMCPTools.filter((t) => t.type === type);
}

/**
 * MCP araç çağrısını doğrular (güvenlik kontrolü)
 */
export function canCallTool(
  toolName: string,
  userRole: "admin" | "client"
): { allowed: boolean; reason?: string } {
  const tool = findMCPTool(toolName);
  if (!tool) {
    return { allowed: false, reason: `Bilinmeyen araç: ${toolName}` };
  }

  // Mekansal analiz araçları yalnızca admin'e açık (Phase 3 sonrası genişletilebilir)
  if (tool.type === "spatial_analysis" && userRole !== "admin") {
    return {
      allowed: false,
      reason: "Mekansal analiz araçları yalnızca yönetici rolüne açıktır.",
    };
  }

  return { allowed: true };
}
