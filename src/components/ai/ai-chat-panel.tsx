"use client";

import { useState, lazy, Suspense, Component, ReactNode, ErrorInfo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Bot, X, Settings2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { AutonomyControl } from "./autonomy-control";
import { useAgentStore } from "@/lib/store/agent-store";

// React.lazy ile CopilotChat — sadece render edildiğinde yüklenir
const LazyCopilotChat = lazy(() =>
  import("@copilotkit/react-ui").then((mod) => ({
    default: mod.CopilotChat,
  }))
);

/**
 * Chat bileşeni için Error Boundary
 */
class ChatErrorBoundary extends Component<
  { children: ReactNode },
  { hasError: boolean }
> {
  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): { hasError: boolean } {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.warn("[AIChatPanel] Chat hatası:", error.message, info.componentStack);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex-1 flex items-center justify-center p-6 text-center">
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">AI Chat şu an kullanılamıyor.</p>
            <p className="text-xs text-muted-foreground/60">OpenAI API key gerekebilir.</p>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

/**
 * Güvenli CopilotChat wrapper — hata verirse fallback gösterir
 */
function SafeCopilotChat() {
  return (
    <ChatErrorBoundary>
      <Suspense
        fallback={
          <div className="flex-1 flex items-center justify-center p-6">
            <p className="text-sm text-muted-foreground animate-pulse">Chat yükleniyor...</p>
          </div>
        }
      >
        <LazyCopilotChat
          labels={{
            title: "",
            initial: "Merhaba! Size nasıl yardımcı olabilirim?",
            placeholder: "Bir şey sorun...",
          }}
          className="h-full"
        />
      </Suspense>
    </ChatErrorBoundary>
  );
}

/**
 * Atlas AI Chat Panel — sağ alt köşede floating chat
 * CopilotKit Chat UI + Autonomy Control entegre
 */
export function AIChatPanel() {
  const [open, setOpen] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const { autonomyLevel, setAutonomyLevel } = useAgentStore();

  return (
    <>
      {/* Floating Action Button */}
      <AnimatePresence>
        {!open && (
          <motion.div
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            className="fixed bottom-6 right-6 z-50"
          >
            <Button
              onClick={() => setOpen(true)}
              size="lg"
              className="h-14 w-14 rounded-full shadow-lg glow-brand"
            >
              <Bot className="h-6 w-6" />
            </Button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Chat Panel */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] as const }}
            className={cn(
              "fixed bottom-6 right-6 z-50",
              "w-[380px] h-[560px]",
              "rounded-2xl border bg-card shadow-2xl overflow-hidden",
              "flex flex-col"
            )}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b bg-card/80 backdrop-blur-sm">
              <div className="flex items-center gap-2">
                <div className="h-7 w-7 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Bot className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <p className="text-sm font-semibold">Atlas AI</p>
                  <p className="text-[10px] text-muted-foreground">
                    Seviye {autonomyLevel} — Akıllı asistan
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1">
                {/* Autonomy Compact Control */}
                <AutonomyControl
                  currentLevel={autonomyLevel}
                  onLevelChange={setAutonomyLevel}
                  compact
                />
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={() => setShowSettings(!showSettings)}
                >
                  <Settings2 className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={() => setOpen(false)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Settings Panel (Autonomy Detail) */}
            <AnimatePresence>
              {showSettings && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="border-b overflow-hidden"
                >
                  <div className="p-4">
                    <AutonomyControl
                      currentLevel={autonomyLevel}
                      onLevelChange={setAutonomyLevel}
                    />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Chat Content */}
            <div className="flex-1 overflow-hidden [&_.copilotKitChat]:h-full [&_.copilotKitChat]:border-0">
              <SafeCopilotChat />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
