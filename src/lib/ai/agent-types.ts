/**
 * ─── Atlas AI Ajan Katmanı — Tip & Konfigürasyon ───
 * 
 * Modern Ajanik Yığın (Modern Agentic Stack) üç katmanlı protokol:
 *   1. A2UI — Bildirimsel bileşen kataloğu (component-catalog.ts)
 *   2. AG-UI — Gerçek zamanlı state senkronizasyonu (bu dosya)
 *   3. MCP — Model Context Protocol araç katmanı (bu dosya)
 * 
 * Güvenlik kuralları:
 *   - Ham HTML/CSS üretimi yasak
 *   - Gatekeeper Agent her kararı denetler
 *   - Human-in-the-Loop onayı zorunlu
 */

// ─── AJAN TİPLERİ ───

/**
 * Ajan eylem türleri
 */
export type AgentActionType =
  | "query_data"        // Veri sorgulama
  | "generate_ui"       // UI bileşenleri üretme
  | "analyze_spatial"   // Mekansal analiz
  | "create_chart"      // Grafik oluşturma
  | "filter_data"       // Veri filtreleme
  | "navigate"          // Sayfa yönlendirme
  | "explain"           // Açıklama üretme
  ;

/**
 * Ajan güven seviyesi
 */
export type AgentConfidenceLevel = "high" | "medium" | "low";

/**
 * Ajan eylem talebi — AG-UI Runtime tarafından işlenir
 */
export interface AgentAction {
  id: string;
  type: AgentActionType;
  description: string;
  confidence: number;                   // 0-1 güven skoru
  confidenceLevel: AgentConfidenceLevel;
  requiresApproval: boolean;            // Human-in-the-Loop kontrolü
  parameters: Record<string, unknown>;
  targetComponentId?: string;           // A2UI katalog ID'si
  estimatedDuration?: number;           // ms cinsinden tahmini süre
  createdAt: Date;
}

/**
 * Ajan eylem sonucu
 */
export interface AgentActionResult {
  actionId: string;
  success: boolean;
  data?: unknown;
  error?: string;
  componentProps?: Record<string, unknown>; // Üretilen bileşene geçilecek proplar
  duration: number;                          // Gerçek süre (ms)
}

// ─── AJAN OTURUM TİPLERİ ───

/**
 * Ajan sohbet mesajı
 */
export interface AgentMessage {
  id: string;
  role: "user" | "agent" | "system" | "gatekeeper";
  content: string;
  actions?: AgentAction[];              // Mesaja bağlı eylemler
  metadata?: {
    model?: string;
    tokens?: number;
    processingTime?: number;
  };
  timestamp: Date;
}

/**
 * Ajan oturumu
 */
export interface AgentSession {
  id: string;
  userId: string;
  messages: AgentMessage[];
  activeActions: AgentAction[];
  status: "idle" | "processing" | "awaiting_approval" | "error";
  createdAt: Date;
  updatedAt: Date;
}

// ─── MCP (MODEL CONTEXT PROTOCOL) TİPLERİ ───

/**
 * MCP araç türleri — ajanların dış dünyayla iletişim noktaları
 */
export type MCPToolType =
  | "database_query"     // Veritabanı sorgulama
  | "spatial_analysis"   // Mekansal analiz hesaplama
  | "file_read"          // Dosya okuma
  | "api_call"           // Dış API çağrısı
  | "user_session"       // Kullanıcı oturum bilgisi
  ;

/**
 * MCP araç tanımı
 */
export interface MCPTool {
  name: string;
  type: MCPToolType;
  description: string;
  inputSchema: Record<string, unknown>;  // JSON Schema
  outputSchema: Record<string, unknown>;
  requiresAuth: boolean;
  rateLimit?: {
    maxCalls: number;
    windowMs: number;
  };
}

/**
 * MCP Sunucu konfigürasyonu
 */
export interface MCPServerConfig {
  name: string;
  version: string;
  tools: MCPTool[];
  capabilities: {
    prompts: boolean;
    resources: boolean;
    tools: boolean;
  };
}

// ─── GATEKEEPER AJAN (SAVUNMA AJANI) ───

/**
 * Gatekeeper denetim kuralı
 */
export interface GatekeeperRule {
  id: string;
  name: string;
  description: string;
  check: (action: AgentAction) => GatekeeperVerdict;
}

/**
 * Gatekeeper denetim sonucu
 */
export interface GatekeeperVerdict {
  approved: boolean;
  reason: string;
  riskLevel: "none" | "low" | "medium" | "high" | "critical";
  suggestedModifications?: Partial<AgentAction>;
}

// ─── VARSAYILAN GATEKEEPER KURALLARI ───

export const defaultGatekeeperRules: GatekeeperRule[] = [
  {
    id: "no-raw-html",
    name: "Ham HTML/CSS Yasağı",
    description: "Ajanların doğrudan HTML veya CSS üretmesini engeller",
    check: (action) => {
      if (action.type === "generate_ui" && !action.targetComponentId) {
        return {
          approved: false,
          reason: "UI üretimi A2UI kataloğu dışında yapılamaz. targetComponentId zorunludur.",
          riskLevel: "critical",
        };
      }
      return { approved: true, reason: "OK", riskLevel: "none" };
    },
  },
  {
    id: "confidence-threshold",
    name: "Güven Eşiği Kontrolü",
    description: "Düşük güvenli eylemleri otomatik onaya yönlendirir",
    check: (action) => {
      if (action.confidence < 0.6) {
        return {
          approved: false,
          reason: `Güven skoru çok düşük (${action.confidence}). İnsan onayı gerekli.`,
          riskLevel: "high",
          suggestedModifications: { requiresApproval: true },
        };
      }
      if (action.confidence < 0.8) {
        return {
          approved: true,
          reason: "Orta güven — kullanıcıya bildirim gönderilmeli",
          riskLevel: "medium",
        };
      }
      return { approved: true, reason: "Yüksek güven", riskLevel: "none" };
    },
  },
  {
    id: "rate-limit",
    name: "Hız Limiti Kontrolü",
    description: "Ajanların aşırı eylem üretmesini engeller",
    check: (action) => {
      // Not: Gerçek implementasyonda rate limit state'i kontrol edilir
      return { approved: true, reason: "Hız limiti dahilinde", riskLevel: "none" };
    },
  },
];

// ─── AJAN KONFİGÜRASYONU ───

export const agentConfig = {
  /** Generative UI maksimum üretim süresi (ms) */
  maxGenerationTime: 5000,
  
  /** İnsan onayı gerektiren minimum güven skoru */
  approvalThreshold: 0.7,
  
  /** Ajan oturumu maksimum mesaj sayısı */
  maxSessionMessages: 100,
  
  /** Gatekeeper kontrolü aktif mi */
  gatekeeperEnabled: true,
  
  /** Desteklenen diller */
  supportedLanguages: ["tr", "en"] as const,
  
  /** Varsayılan sistem promptu */
  defaultSystemPrompt: `Sen Atlas platformunun yapay zeka asistanısın. 
Kullanıcılara e-ticaret süreçleri, envanter yönetimi, sipariş takibi ve 
mekansal veri analizi konularında yardımcı olursun.

Kurallar:
- Yalnızca A2UI kataloğundaki onaylanmış bileşenleri kullan
- Her kritik eylemde kullanıcı onayı iste (Human-in-the-Loop)
- Dark Pattern kullanma — sahtaci aciliyet, duygusal CTA yasak
- Şeffaf ol — kararlarının nedenini açıkla (Explainable AI)`,
} as const;
