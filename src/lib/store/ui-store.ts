import { create } from "zustand";

/**
 * UI State Store — Senkron istemci durumu
 * Sidebar, tema, modal gibi anlık UI durumlarını yönetir
 */
interface UIState {
  // Sidebar
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
  toggleSidebar: () => void;

  // Tema (gelecek kullanım için hazır)
  theme: "light" | "dark" | "system";
  setTheme: (theme: "light" | "dark" | "system") => void;

  // Modal / Sheet
  activeModal: string | null;
  modalData: Record<string, unknown> | null;
  openModal: (id: string, data?: Record<string, unknown>) => void;
  closeModal: () => void;

  // Genel yükleme durumu
  globalLoading: boolean;
  setGlobalLoading: (loading: boolean) => void;
}

export const useUIStore = create<UIState>((set) => ({
  // Sidebar
  sidebarOpen: true,
  setSidebarOpen: (open) => set({ sidebarOpen: open }),
  toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),

  // Tema
  theme: "system",
  setTheme: (theme) => set({ theme }),

  // Modal / Sheet
  activeModal: null,
  modalData: null,
  openModal: (id, data = undefined) =>
    set({ activeModal: id, modalData: data ?? null }),
  closeModal: () => set({ activeModal: null, modalData: null }),

  // Genel yükleme
  globalLoading: false,
  setGlobalLoading: (loading) => set({ globalLoading: loading }),
}));
