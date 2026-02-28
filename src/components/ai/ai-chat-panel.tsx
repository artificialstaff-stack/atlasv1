"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Bot, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * Atlas AI Chat Panel — sag alt kosede floating chat
 *
 * CopilotKit su an devre disi. Chat paneli acildiginda
 * placeholder mesaj gosterir.
 *
 * Aktif etmek icin:
 * 1. copilot-provider.tsx'de CopilotKit provider'i ac
 * 2. Bu dosyada CopilotChat componentini geri yukle
 */
export function AIChatPanel() {
  const [open, setOpen] = useState(false);

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
                    Yakinda aktif olacak
                  </p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={() => setOpen(false)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            {/* Placeholder Content */}
            <div className="flex-1 flex items-center justify-center p-6 text-center">
              <div className="space-y-3">
                <div className="h-12 w-12 mx-auto rounded-full bg-primary/10 flex items-center justify-center">
                  <Bot className="h-6 w-6 text-primary" />
                </div>
                <p className="text-sm font-medium">AI Chat yapilandiriliyor</p>
                <p className="text-xs text-muted-foreground max-w-[240px]">
                  OpenAI API key ve agent yapilandirmasi tamamlandiginda
                  AI asistan burada aktif olacaktir.
                </p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
