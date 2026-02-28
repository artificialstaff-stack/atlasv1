import { create } from "zustand";
import { persist } from "zustand/middleware";

/**
 * Agent State Store — AI ajan oturum yönetimi
 * Autonomy seviyeleri persist edilir (localStorage)
 *
 * Not: CopilotKit devre dışı olduğu için @/lib/ai import'ları kaldırıldı.
 * Etkinleştirildiğinde geri eklenecek.
 */

/** Autonomy Level — 0-3 arası */
export type AutonomyLevel = 0 | 1 | 2 | 3;

/** Session placeholder */
interface AgentSession {
  id: string;
  userId: string;
  status: "idle" | "processing" | "completed" | "error";
  messages: AgentMessage[];
  createdAt: string;
}

/** Message placeholder */
interface AgentMessage {
  id: string;
  role: "user" | "assistant" | "system" | "tool";
  content: string;
  timestamp: string;
}

/** Bir ajan aksiyonunun log kaydı (client-side) */
export interface AgentActionLog {
  id: string;
  agentRole: string;
  actionType: string;
  status: "pending" | "approved" | "rejected" | "executed" | "failed";
  description: string;
  timestamp: string;
}

interface AgentState {
  // Oturum
  session: AgentSession | null;
  initSession: (userId: string) => void;
  endSession: () => void;

  // Mesajlar
  sendMessage: (content: string) => void;
  addSystemMessage: (content: string) => void;

  // Panel durumu
  panelOpen: boolean;
  setPanelOpen: (open: boolean) => void;
  togglePanel: () => void;

  // İşlem durumu
  isProcessing: boolean;
  setProcessing: (processing: boolean) => void;

  // Son hata
  lastError: string | null;
  setError: (error: string | null) => void;

  // ─── Autonomy (Katman 10) ───
  autonomyLevel: AutonomyLevel;
  setAutonomyLevel: (level: AutonomyLevel) => void;

  // ─── Action Logs (client-side audit trail) ───
  actionLogs: AgentActionLog[];
  addActionLog: (log: Omit<AgentActionLog, "id" | "timestamp">) => void;
  clearActionLogs: () => void;
}

export const useAgentStore = create<AgentState>()(
  persist(
    (set, get) => ({
      // Oturum
      session: null,
      initSession: (userId) =>
        set({
          session: {
            id: crypto.randomUUID(),
            userId,
            status: "idle",
            messages: [],
            createdAt: new Date().toISOString(),
          },
          lastError: null,
        }),
      endSession: () =>
        set({ session: null, isProcessing: false, lastError: null }),

      // Mesajlar
      sendMessage: (content) => {
        const { session } = get();
        if (!session) return;

        const userMessage: AgentMessage = {
          id: crypto.randomUUID(),
          role: "user",
          content,
          timestamp: new Date().toISOString(),
        };
        set({
          session: {
            ...session,
            status: "processing",
            messages: [...session.messages, userMessage],
          },
          isProcessing: true,
        });
      },
      addSystemMessage: (content) => {
        const { session } = get();
        if (!session) return;

        const sysMessage: AgentMessage = {
          id: crypto.randomUUID(),
          role: "system",
          content,
          timestamp: new Date().toISOString(),
        };
        set({
          session: {
            ...session,
            messages: [...session.messages, sysMessage],
          },
        });
      },

      // Panel
      panelOpen: false,
      setPanelOpen: (open) => set({ panelOpen: open }),
      togglePanel: () => set((state) => ({ panelOpen: !state.panelOpen })),

      // İşlem
      isProcessing: false,
      setProcessing: (processing) => set({ isProcessing: processing }),

      // Hata
      lastError: null,
      setError: (error) => set({ lastError: error }),

      // Autonomy
      autonomyLevel: 0 as AutonomyLevel,
      setAutonomyLevel: (level) => set({ autonomyLevel: level }),

      // Action Logs
      actionLogs: [],
      addActionLog: (log) =>
        set((state) => ({
          actionLogs: [
            {
              ...log,
              id: crypto.randomUUID(),
              timestamp: new Date().toISOString(),
            },
            ...state.actionLogs,
          ].slice(0, 200), // Keep last 200 entries
        })),
      clearActionLogs: () => set({ actionLogs: [] }),
    }),
    {
      name: "atlas-agent-store",
      // Only persist autonomyLevel and actionLogs
      partialize: (state) => ({
        autonomyLevel: state.autonomyLevel,
        actionLogs: state.actionLogs,
      }),
    }
  )
);
