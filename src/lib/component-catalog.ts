/**
 * ─── Atlas A2UI Bileşen Kataloğu ───
 * 
 * Google A2UI Standardı uyumlu, makine tarafından okunabilir bileşen kataloğu.
 * Yapay zeka ajanları bu kataloğu kullanarak Generative UI üretir.
 * 
 * Kurallar:
 * - Ajanlar YALNIZCA bu katalogdaki bileşenleri çağırabilir
 * - Ham HTML/CSS üretimi güvenlik riskleri nedeniyle yasak
 * - Her bileşen Zod şemasıyla doğrulanır
 * - Katı isimlendirme standardı: Category / Variant / State
 */

import { z } from "zod";

// ─── BİLEŞEN KATEGORİLERİ ───

export const ComponentCategory = z.enum([
  "layout",
  "navigation",
  "data-display",
  "data-input",
  "feedback",
  "overlay",
  "spatial",
  "chart",
  "ai-agent",
]);
export type ComponentCategory = z.infer<typeof ComponentCategory>;

// ─── BİLEŞEN DURUMU ───

export const ComponentState = z.enum([
  "default",
  "hover",
  "active",
  "disabled",
  "loading",
  "error",
  "success",
  "empty",
]);
export type ComponentState = z.infer<typeof ComponentState>;

// ─── BİLEŞEN PROP TİPLERİ ───

export const PropType = z.enum([
  "string",
  "number",
  "boolean",
  "array",
  "object",
  "function",
  "ReactNode",
  "enum",
  "bigint",
  "date",
]);
export type PropType = z.infer<typeof PropType>;

// ─── BİLEŞEN PROP TANIMI ───

export const PropDefinition = z.object({
  name: z.string(),
  type: PropType,
  required: z.boolean().default(false),
  description: z.string(),
  defaultValue: z.unknown().optional(),
  enumValues: z.array(z.string()).optional(),
  validation: z.string().optional(), // Zod şema referansı
});
export type PropDefinition = z.infer<typeof PropDefinition>;

// ─── A2UI BİLEŞEN GİRİŞİ ───

export const A2UIComponentEntry = z.object({
  id: z.string().regex(/^[a-z]+(-[a-z]+)*\/[a-z]+(-[a-z]+)*$/), // "category/component-name"
  name: z.string(),
  displayName: z.string(),
  category: ComponentCategory,
  description: z.string(),
  states: z.array(ComponentState),
  props: z.array(PropDefinition),
  constraints: z.array(z.string()).default([]), // Kullanım kısıtlamaları
  securityLevel: z.enum(["public", "authenticated", "admin"]).default("public"),
  importPath: z.string(),
});
export type A2UIComponentEntry = z.infer<typeof A2UIComponentEntry>;

// ─── BİLEŞEN KATALOĞU ───

export const componentCatalog: A2UIComponentEntry[] = [
  // ─── LAYOUT BİLEŞENLERİ ───
  {
    id: "layout/page-header",
    name: "PageHeader",
    displayName: "Sayfa Başlığı",
    category: "layout",
    description: "Sayfa üst alanında breadcrumb ve başlık gösteren layout bileşeni",
    states: ["default"],
    props: [
      { name: "title", type: "string", required: true, description: "Sayfa başlığı" },
      { name: "description", type: "string", required: false, description: "Alt açıklama" },
      { name: "actions", type: "ReactNode", required: false, description: "Sağ taraftaki eylem butonları" },
    ],
    constraints: ["Yalnızca sayfa seviyesinde kullanılmalı"],
    securityLevel: "authenticated",
    importPath: "@/components/shared/page-header",
  },

  // ─── VERİ GÖSTERİM BİLEŞENLERİ ───
  {
    id: "data-display/stat-card",
    name: "StatCard",
    displayName: "İstatistik Kartı",
    category: "data-display",
    description: "KPI veya metrik gösteren tek değerli kart bileşeni",
    states: ["default", "loading", "error"],
    props: [
      { name: "title", type: "string", required: true, description: "Metrik başlığı" },
      { name: "value", type: "string", required: true, description: "Metrik değeri" },
      { name: "change", type: "number", required: false, description: "Yüzde değişim" },
      { name: "icon", type: "ReactNode", required: false, description: "Sol üst ikon" },
      { name: "trend", type: "enum", required: false, description: "Artış/azalış trendi", enumValues: ["up", "down", "neutral"] },
    ],
    constraints: ["Grid layout içinde 2-4 sütun düzeninde kullanılmalı"],
    securityLevel: "authenticated",
    importPath: "@/components/shared/stat-card",
  },
  {
    id: "data-display/data-table",
    name: "DataTable",
    displayName: "Veri Tablosu",
    category: "data-display",
    description: "Sıralanabilir, filtrelenebilir, sayfalanabilir veri tablosu",
    states: ["default", "loading", "empty", "error"],
    props: [
      { name: "columns", type: "array", required: true, description: "Kolon tanımları" },
      { name: "data", type: "array", required: true, description: "Satır verileri" },
      { name: "pagination", type: "boolean", required: false, description: "Sayfalama aktif mi", defaultValue: true },
      { name: "searchable", type: "boolean", required: false, description: "Arama aktif mi", defaultValue: false },
    ],
    constraints: ["Min 400px genişlik gerektirir"],
    securityLevel: "authenticated",
    importPath: "@/components/shared/data-table",
  },

  // ─── VERİ GİRDİ BİLEŞENLERİ ───
  {
    id: "data-input/search-command",
    name: "SearchCommand",
    displayName: "Komut Arama",
    category: "data-input",
    description: "cmdk tabanlı aramam/komut paleti — ajan konsoluna da bağlanabilir",
    states: ["default", "active", "loading"],
    props: [
      { name: "placeholder", type: "string", required: false, description: "Arama alanı placeholder" },
      { name: "onSelect", type: "function", required: true, description: "Seçim callback'i" },
      { name: "items", type: "array", required: true, description: "Arama ögeleri" },
    ],
    constraints: ["Modal veya inline modda kullanılabilir"],
    securityLevel: "authenticated",
    importPath: "@/components/shared/search-command",
  },

  // ─── GERİ BİLDİRİM BİLEŞENLERİ ───
  {
    id: "feedback/empty-state",
    name: "EmptyState",
    displayName: "Boş Durum",
    category: "feedback",
    description: "Veri bulunamadığında gösterilen boş durum bileşeni",
    states: ["default"],
    props: [
      { name: "icon", type: "ReactNode", required: false, description: "Merkez ikon" },
      { name: "title", type: "string", required: true, description: "Başlık" },
      { name: "description", type: "string", required: false, description: "Açıklama metni" },
      { name: "action", type: "ReactNode", required: false, description: "Eylem butonu" },
    ],
    constraints: ["Tablo, liste veya kart grid'lerinde içerik olmadığında kullanılır"],
    securityLevel: "public",
    importPath: "@/components/shared/empty-state",
  },
  {
    id: "feedback/loading-skeleton",
    name: "LoadingSkeleton",
    displayName: "Yükleme İskeleti",
    category: "feedback",
    description: "İçerik yüklenirken gösterilen iskelet animasyonu",
    states: ["default"],
    props: [
      { name: "variant", type: "enum", required: false, description: "Çeşit", enumValues: ["card", "table", "chart", "map"], defaultValue: "card" },
      { name: "count", type: "number", required: false, description: "Tekrar sayısı", defaultValue: 3 },
    ],
    constraints: ["Gerçek bir bileşenin boyutuna yakın olmalı"],
    securityLevel: "public",
    importPath: "@/components/shared/loading-skeleton",
  },

  // ─── MEKANSAL BİLEŞENLER ───
  {
    id: "spatial/map-view",
    name: "MapView",
    displayName: "Harita Görünümü",
    category: "spatial",
    description: "WebGPU destekli Deck.gl v9 + MapLibre v5 Globe View harita bileşeni",
    states: ["default", "loading", "error"],
    props: [
      { name: "layers", type: "array", required: false, description: "Deck.gl katmanları" },
      { name: "viewState", type: "object", required: false, description: "Kamera konumu (lng, lat, zoom)" },
      { name: "onViewStateChange", type: "function", required: false, description: "Kamera hareket callback" },
      { name: "globeView", type: "boolean", required: false, description: "Globe modu aktif mi", defaultValue: true },
    ],
    constraints: [
      "WebGPU desteklenmeyen cihazlarda WebGL2 fallback kullanır",
      "Min 600x400 viewport gerektirir",
    ],
    securityLevel: "authenticated",
    importPath: "@/components/spatial/map-view",
  },
  {
    id: "spatial/a5-pentagon-layer",
    name: "A5PentagonLayer",
    displayName: "A5 Beşgen Katmanı",
    category: "spatial",
    description: "A5 DGGS beşgen grid sistemi ile mekansal veri görselleştirme katmanı",
    states: ["default", "loading"],
    props: [
      { name: "data", type: "array", required: true, description: "A5 hücre verileri (64-bit BigInt)" },
      { name: "getFillColor", type: "function", required: false, description: "Hücre dolgu rengi accessor" },
      { name: "getElevation", type: "function", required: false, description: "3D yükseklik accessor" },
      { name: "resolution", type: "number", required: false, description: "A5 çözünürlük seviyesi (1-22)", defaultValue: 5 },
    ],
    constraints: [
      "MapView içinde layer olarak kullanılmalı",
      "GPU'da render edilir — CPU'ya yük bindirmez",
    ],
    securityLevel: "authenticated",
    importPath: "@/components/spatial/a5-pentagon-layer",
  },

  // ─── GRAFİK BİLEŞENLERİ ───
  {
    id: "chart/metric-chart",
    name: "MetricChart",
    displayName: "Metrik Grafiği",
    category: "chart",
    description: "Zaman serisi veya karşılaştırma grafikleri — çizgi, çubuk, alan varyantları",
    states: ["default", "loading", "empty", "error"],
    props: [
      { name: "type", type: "enum", required: true, description: "Grafik türü", enumValues: ["line", "bar", "area", "pie"] },
      { name: "data", type: "array", required: true, description: "Veri dizisi" },
      { name: "xKey", type: "string", required: true, description: "X ekseni anahtar" },
      { name: "yKey", type: "string", required: true, description: "Y ekseni anahtar" },
      { name: "title", type: "string", required: false, description: "Grafik başlığı" },
    ],
    constraints: ["Min 300px genişlik gerektirir"],
    securityLevel: "authenticated",
    importPath: "@/components/shared/metric-chart",
  },

  // ─── AI AJAN BİLEŞENLERİ ───
  {
    id: "ai-agent/agent-action-card",
    name: "AgentActionCard",
    displayName: "Ajan Eylem Kartı",
    category: "ai-agent",
    description: "Ajanın önerdiği bir eylemi onay/red seçenekleriyle gösteren kart",
    states: ["default", "loading", "success", "error"],
    props: [
      { name: "title", type: "string", required: true, description: "Eylem başlığı" },
      { name: "description", type: "string", required: true, description: "Detay açıklaması" },
      { name: "onApprove", type: "function", required: true, description: "Onay callback" },
      { name: "onReject", type: "function", required: true, description: "Red callback" },
      { name: "confidence", type: "number", required: false, description: "Güven skoru (0-1)" },
    ],
    constraints: [
      "Human-in-the-Loop — her ajan kararı kullanıcı onayı gerektirir",
      "Undo mekanizması zorunlu",
    ],
    securityLevel: "authenticated",
    importPath: "@/components/ai/agent-action-card",
  },
];

// ─── KATALOG YARDS YARDIMCILARI ───

/**
 * Bileşen ID'sine göre katalogdan bileşen bul
 * A2UI standardı: Ajanlar yalnızca bu fonksiyon üzerinden bileşen çağırabilir
 */
export function findComponent(id: string): A2UIComponentEntry | undefined {
  return componentCatalog.find((c) => c.id === id);
}

/**
 * Kategoriye göre bileşenleri listele
 */
export function getComponentsByCategory(category: ComponentCategory): A2UIComponentEntry[] {
  return componentCatalog.filter((c) => c.category === category);
}

/**
 * Güvenlik seviyesine göre erişilebilir bileşenleri filtrele
 */
export function getAccessibleComponents(
  userLevel: "public" | "authenticated" | "admin"
): A2UIComponentEntry[] {
  const levelOrder = { public: 0, authenticated: 1, admin: 2 };
  return componentCatalog.filter(
    (c) => levelOrder[c.securityLevel] <= levelOrder[userLevel]
  );
}

/**
 * Bileşen prop'larını Zod şemasıyla doğrula
 * Ajan tarafından gönderilen verilerin güvenlik kontrolü
 */
export function validateComponentProps(
  componentId: string,
  props: Record<string, unknown>
): { valid: boolean; errors: string[] } {
  const component = findComponent(componentId);
  if (!component) {
    return { valid: false, errors: [`Bileşen bulunamadı: ${componentId}`] };
  }

  const errors: string[] = [];
  
  // Zorunlu prop kontrolü
  component.props
    .filter((p) => p.required)
    .forEach((p) => {
      if (!(p.name in props)) {
        errors.push(`Zorunlu prop eksik: ${p.name}`);
      }
    });

  // Bilinmeyen prop kontrolü (güvenlik)
  const knownProps = new Set(component.props.map((p) => p.name));
  Object.keys(props).forEach((key) => {
    if (!knownProps.has(key)) {
      errors.push(`Tanımsız prop: ${key} — güvenlik ihlali`);
    }
  });

  return { valid: errors.length === 0, errors };
}

// ─── TİP İHRACATLARI ───

export type CatalogComponentId = (typeof componentCatalog)[number]["id"];
