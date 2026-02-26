/**
 * ─── Atlas Spatial Engine — Barrel Export ───
 * 
 * Kullanım:
 *   import { detectGPUCapability, defaultViewState, A5_RESOLUTIONS } from "@/lib/spatial";
 */

export type {
  GPUCapability,
  DeckViewState,
  AtlasLayerType,
  AtlasLayerConfig,
  A5Cell,
  AtlasMapStyle,
  SpatialPerformanceMetrics,
} from "./spatial-config";

export {
  detectGPUCapability,
  selectRenderBackend,
  defaultViewState,
  defaultLayerConfigs,
  A5_RESOLUTIONS,
  getA5ResolutionForZoom,
  defaultMapStyles,
  isWithinPerformanceBudget,
  suggestRenderStrategy,
} from "./spatial-config";
