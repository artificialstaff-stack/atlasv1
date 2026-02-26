/**
 * ─── Atlas Spatial Render Engine — Temel Konfigürasyon ───
 * 
 * 4. Sütun: Mekansal İşleme Motoru
 * 
 * Teknoloji Yığını:
 *   - WebGPU (GPU hesaplama) + WebGL2 (fallback)
 *   - Deck.gl v9 (veri katmanları)
 *   - MapLibre v5 (vektör harita)
 *   - A5 DGGS (Beşgen Grid Sistemi)
 * 
 * Performans Hedefleri:
 *   - 1M+ nokta verisi 60fps render
 *   - <16ms frame bütçesi
 *   - GPU-accelerated mekansal sorgular
 */

import { designTokens } from "@/lib/design-tokens";

// ─── WEBGPU ALGILAMA ───

export interface GPUCapability {
  webgpu: boolean;
  webgl2: boolean;
  maxTextureSize: number;
  maxComputeWorkgroups?: number;
  vendor?: string;
  renderer?: string;
}

/**
 * Tarayıcının GPU kapasitesini algılar.
 * Sunucu tarafında çağrılırsa güvenli varsayılan döner.
 */
export async function detectGPUCapability(): Promise<GPUCapability> {
  // SSR kontrolü
  if (typeof window === "undefined" || typeof navigator === "undefined") {
    return {
      webgpu: false,
      webgl2: false,
      maxTextureSize: 0,
    };
  }

  const result: GPUCapability = {
    webgpu: false,
    webgl2: false,
    maxTextureSize: 0,
  };

  // WebGPU kontrolü
  if ("gpu" in navigator) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const gpu = (navigator as any).gpu;
      const adapter = await gpu.requestAdapter();
      if (adapter) {
        result.webgpu = true;
        const info = await adapter.requestAdapterInfo();
        result.vendor = info.vendor;
        result.renderer = info.description;
        
        const limits = adapter.limits;
        result.maxComputeWorkgroups = limits.maxComputeWorkgroupsPerDimension;
      }
    } catch {
      // WebGPU mevcut ama kullanılamıyor
    }
  }

  // WebGL2 kontrolü (fallback)
  try {
    const canvas = document.createElement("canvas");
    const gl = canvas.getContext("webgl2");
    if (gl) {
      result.webgl2 = true;
      result.maxTextureSize = gl.getParameter(gl.MAX_TEXTURE_SIZE) as number;

      const debugInfo = gl.getExtension("WEBGL_debug_renderer_info");
      if (debugInfo && !result.vendor) {
        result.vendor = gl.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL) as string;
        result.renderer = gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL) as string;
      }
    }
  } catch {
    // WebGL2 kullanılamıyor
  }

  return result;
}

/**
 * Render backend'i seçer: webgpu > webgl2 > none
 */
export function selectRenderBackend(
  capability: GPUCapability
): "webgpu" | "webgl2" | "none" {
  if (capability.webgpu) return "webgpu";
  if (capability.webgl2) return "webgl2";
  return "none";
}

// ─── DECK.GL KONFİGÜRASYONU ───

/**
 * Deck.gl viewport state
 */
export interface DeckViewState {
  longitude: number;
  latitude: number;
  zoom: number;
  pitch: number;
  bearing: number;
  transitionDuration?: number;
  transitionEasing?: (t: number) => number;
}

/**
 * Varsayılan viewport — Türkiye merkezi
 */
export const defaultViewState: DeckViewState = {
  longitude: designTokens.spatialTokens.map.defaultCenter[1],
  latitude: designTokens.spatialTokens.map.defaultCenter[0],
  zoom: designTokens.spatialTokens.map.defaultZoom,
  pitch: 0,
  bearing: 0,
  transitionDuration: 800,
};

/**
 * Deck.gl katman tipleri
 */
export type AtlasLayerType =
  | "scatterplot"     // Nokta verisi
  | "heatmap"         // Isı haritası
  | "hexagon"         // Hexagonal grid
  | "pentagon"        // A5 DGGS beşgen
  | "arc"             // Bağlantı çizgileri
  | "icon"            // İkon katmanı
  | "geojson"         // GeoJSON poligon/çizgi
  | "trip"            // Animasyonlu rota
  ;

/**
 * Atlas katman konfigürasyonu
 */
export interface AtlasLayerConfig {
  id: string;
  type: AtlasLayerType;
  visible: boolean;
  opacity: number;               // 0-1
  pickable: boolean;             // Tıklama/hover etkileşimi
  dataSource?: string;           // MCP tool adı veya URL
  colorScale?: string[];         // Renk paleti
  elevationScale?: number;       // 3D yükseklik çarpanı
  radiusRange?: [number, number];
  coverage?: number;             // 0-1 hücre doluluk oranı
}

/**
 * Varsayılan katman ayarları
 */
export const defaultLayerConfigs: Record<AtlasLayerType, Partial<AtlasLayerConfig>> = {
  scatterplot: {
    opacity: 0.8,
    pickable: true,
    radiusRange: [2, 20],
    colorScale: [designTokens.colors.spatial.heatLow, designTokens.colors.spatial.heatMid, designTokens.colors.spatial.heatHigh],
  },
  heatmap: {
    opacity: 0.6,
    pickable: false,
    colorScale: [designTokens.colors.spatial.heatLow, designTokens.colors.spatial.heatMid, designTokens.colors.spatial.heatHigh],
  },
  hexagon: {
    opacity: 0.7,
    pickable: true,
    elevationScale: 100,
    coverage: 0.85,
    colorScale: [designTokens.colors.spatial.heatLow, designTokens.colors.spatial.heatMid, designTokens.colors.spatial.heatHigh],
  },
  pentagon: {
    opacity: 0.75,
    pickable: true,
    elevationScale: 50,
    coverage: 0.9,
    colorScale: [designTokens.colors.spatial.heatLow, designTokens.colors.spatial.heatMid, designTokens.colors.spatial.heatHigh],
  },
  arc: {
    opacity: 0.5,
    pickable: true,
    colorScale: [designTokens.colors.brand.primary, designTokens.colors.brand.accent],
  },
  icon: {
    opacity: 1,
    pickable: true,
    radiusRange: [16, 32],
  },
  geojson: {
    opacity: 0.6,
    pickable: true,
  },
  trip: {
    opacity: 0.8,
    pickable: false,
  },
};

// ─── A5 DGGS (Discrete Global Grid System) ───

/**
 * A5 DGGS beşgen hücre temsili
 */
export interface A5Cell {
  cellId: bigint;             // 64-bit beşgen hücre ID
  resolution: number;         // 0-15 çözünürlük seviyesi
  center: [number, number];   // [lat, lng]
  vertices: [number, number][];  // 5 köşe noktası
  area: number;               // Metre kare cinsinden alan
}

/**
 * A5 çözünürlük seviyeleri ve yaklaşık alanları
 */
export const A5_RESOLUTIONS: Record<number, { name: string; approxArea: string }> = {
  0: { name: "Kıta", approxArea: "~51M km²" },
  1: { name: "Alt-kıta", approxArea: "~10.2M km²" },
  2: { name: "Ülke", approxArea: "~2M km²" },
  3: { name: "Bölge", approxArea: "~408K km²" },
  4: { name: "İl", approxArea: "~81.6K km²" },
  5: { name: "İlçe", approxArea: "~16.3K km²" },
  6: { name: "Mahalle", approxArea: "~3.3K km²" },
  7: { name: "Semt", approxArea: "~653 km²" },
  8: { name: "Sokak grubu", approxArea: "~131 km²" },
  9: { name: "Bina grubu", approxArea: "~26 km²" },
  10: { name: "Bina", approxArea: "~5.2 km²" },
};

/**
 * Zoom seviyesine göre önerilen A5 çözünürlüğü
 */
export function getA5ResolutionForZoom(zoom: number): number {
  if (zoom < 3) return 0;
  if (zoom < 5) return 2;
  if (zoom < 7) return 4;
  if (zoom < 9) return 5;
  if (zoom < 11) return 6;
  if (zoom < 13) return 7;
  if (zoom < 15) return 8;
  if (zoom < 17) return 9;
  return 10;
}

// ─── MAPLIBRE KONFİGÜRASYONU ───

/**
 * MapLibre harita stili
 */
export interface AtlasMapStyle {
  id: string;
  name: string;
  url: string;
  thumbnail?: string;
}

/**
 * Varsayılan harita stilleri — ücretsiz tile sağlayıcıları
 */
export const defaultMapStyles: AtlasMapStyle[] = [
  {
    id: "positron",
    name: "Açık (Positron)",
    url: "https://basemaps.cartocdn.com/gl/positron-gl-style/style.json",
  },
  {
    id: "dark-matter",
    name: "Koyu (Dark Matter)",
    url: "https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json",
  },
  {
    id: "voyager",
    name: "Renkli (Voyager)",
    url: "https://basemaps.cartocdn.com/gl/voyager-gl-style/style.json",
  },
];

// ─── PERFORMANS İZLEME ───

/**
 * Mekansal motor performans metrikleri
 */
export interface SpatialPerformanceMetrics {
  fps: number;
  frameTime: number;          // ms
  gpuMemoryUsage: number;     // MB
  visibleDataPoints: number;
  totalDataPoints: number;
  activeLayerCount: number;
  renderBackend: "webgpu" | "webgl2" | "none";
}

/**
 * Performans bütçesi kontrolü
 */
export function isWithinPerformanceBudget(
  metrics: SpatialPerformanceMetrics
): boolean {
  const { targetFPS } = designTokens.spatialTokens;
  const maxFrameTime = 1000 / targetFPS; // 16.67ms @ 60fps

  return (
    metrics.fps >= targetFPS * 0.9 &&      // %90 hedef FPS
    metrics.frameTime <= maxFrameTime * 1.2 // %20 tolerans
  );
}

/**
 * Veri noktası sayısına göre önerilen render stratejisi
 */
export function suggestRenderStrategy(
  dataPointCount: number,
  backend: "webgpu" | "webgl2" | "none"
): {
  strategy: "direct" | "aggregated" | "tiled" | "unsupported";
  recommendation: string;
} {
  if (backend === "none") {
    return {
      strategy: "unsupported",
      recommendation: "GPU desteği bulunamadı. Tablo görünümüne geçiş önerilir.",
    };
  }

  const { maxDataPoints } = designTokens.spatialTokens;

  if (dataPointCount <= 10_000) {
    return {
      strategy: "direct",
      recommendation: "Doğrudan render. Tüm noktalar GPU'ya gönderilebilir.",
    };
  }

  if (dataPointCount <= 100_000) {
    return {
      strategy: "aggregated",
      recommendation: "A5 DGGS kümeleme önerilir. Zoom seviyesine göre hücrelere toplanabilir.",
    };
  }

  if (dataPointCount <= maxDataPoints) {
    return {
      strategy: "tiled",
      recommendation: "Tile-based lazy loading önerilir. Viewport'a göre veri yüklenecek.",
    };
  }

  return {
    strategy: "tiled",
    recommendation: `Veri noktası sayısı çok yüksek (${dataPointCount.toLocaleString("tr-TR")}). Sunucu taraflı kümeleme zorunlu.`,
  };
}
