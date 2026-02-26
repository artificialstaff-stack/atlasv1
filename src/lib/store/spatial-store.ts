import { create } from "zustand";
import type { DeckViewState, AtlasLayerConfig, AtlasMapStyle } from "@/lib/spatial";
import { defaultViewState, defaultMapStyles } from "@/lib/spatial";

/**
 * Spatial State Store — Harita ve mekansal katman durumları
 * Deck.gl viewport, aktif katmanlar ve harita stili yönetimi
 */

interface SpatialState {
  // Viewport
  viewState: DeckViewState;
  setViewState: (vs: DeckViewState) => void;
  flyTo: (lng: number, lat: number, zoom?: number) => void;

  // Harita stili
  mapStyle: AtlasMapStyle;
  setMapStyle: (style: AtlasMapStyle) => void;

  // Katmanlar
  layers: AtlasLayerConfig[];
  addLayer: (layer: AtlasLayerConfig) => void;
  removeLayer: (layerId: string) => void;
  updateLayer: (layerId: string, updates: Partial<AtlasLayerConfig>) => void;
  toggleLayerVisibility: (layerId: string) => void;

  // Seçim
  selectedFeatureId: string | null;
  setSelectedFeatureId: (id: string | null) => void;

  // Performans
  fps: number;
  setFps: (fps: number) => void;

  // GPU durumu
  renderBackend: "webgpu" | "webgl2" | "none" | "detecting";
  setRenderBackend: (backend: "webgpu" | "webgl2" | "none") => void;
}

export const useSpatialStore = create<SpatialState>((set) => ({
  // Viewport
  viewState: defaultViewState,
  setViewState: (vs) => set({ viewState: vs }),
  flyTo: (lng, lat, zoom = 12) =>
    set({
      viewState: {
        longitude: lng,
        latitude: lat,
        zoom,
        pitch: 0,
        bearing: 0,
        transitionDuration: 1500,
      },
    }),

  // Harita stili — varsayılan Positron (açık)
  mapStyle: defaultMapStyles[0],
  setMapStyle: (style) => set({ mapStyle: style }),

  // Katmanlar
  layers: [],
  addLayer: (layer) =>
    set((state) => ({
      layers: [...state.layers.filter((l) => l.id !== layer.id), layer],
    })),
  removeLayer: (layerId) =>
    set((state) => ({
      layers: state.layers.filter((l) => l.id !== layerId),
    })),
  updateLayer: (layerId, updates) =>
    set((state) => ({
      layers: state.layers.map((l) =>
        l.id === layerId ? { ...l, ...updates } : l
      ),
    })),
  toggleLayerVisibility: (layerId) =>
    set((state) => ({
      layers: state.layers.map((l) =>
        l.id === layerId ? { ...l, visible: !l.visible } : l
      ),
    })),

  // Seçim
  selectedFeatureId: null,
  setSelectedFeatureId: (id) => set({ selectedFeatureId: id }),

  // Performans
  fps: 0,
  setFps: (fps) => set({ fps }),

  // GPU — başlangıçta algılanıyor durumunda
  renderBackend: "detecting",
  setRenderBackend: (backend) => set({ renderBackend: backend }),
}));
