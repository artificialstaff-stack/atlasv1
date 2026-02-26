"use client";

import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { CheckCircle2, Clock, AlertTriangle, Loader2 } from "lucide-react";

type Status = "pending" | "in_progress" | "approved" | "rejected" | "crisis";

interface StatusTransitionProps {
  status: Status;
  label?: string;
  className?: string;
  size?: "sm" | "md";
}

const STATUS_CONFIG: Record<
  Status,
  { icon: typeof Clock; color: string; bg: string; label: string }
> = {
  pending: {
    icon: Clock,
    color: "text-amber-400",
    bg: "bg-amber-400/10",
    label: "Bekliyor",
  },
  in_progress: {
    icon: Loader2,
    color: "text-blue-400",
    bg: "bg-blue-400/10",
    label: "İşleniyor",
  },
  approved: {
    icon: CheckCircle2,
    color: "text-emerald-400",
    bg: "bg-emerald-400/10",
    label: "Onaylandı",
  },
  rejected: {
    icon: AlertTriangle,
    color: "text-destructive",
    bg: "bg-destructive/10",
    label: "Reddedildi",
  },
  crisis: {
    icon: AlertTriangle,
    color: "text-red-500",
    bg: "bg-red-500/10",
    label: "Acil",
  },
};

export function StatusTransition({
  status,
  label,
  className,
  size = "md",
}: StatusTransitionProps) {
  const config = STATUS_CONFIG[status];
  const Icon = config.icon;
  const isSpinning = status === "in_progress";

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={status}
        initial={{ opacity: 0, scale: 0.9, filter: "blur(4px)" }}
        animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
        exit={{ opacity: 0, scale: 0.9, filter: "blur(4px)" }}
        transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] as const }}
        className={cn(
          "inline-flex items-center gap-1.5 rounded-full font-medium",
          config.bg,
          config.color,
          size === "sm" && "px-2 py-0.5 text-xs",
          size === "md" && "px-3 py-1 text-sm",
          className
        )}
      >
        <Icon
          className={cn(
            size === "sm" ? "h-3 w-3" : "h-3.5 w-3.5",
            isSpinning && "animate-spin"
          )}
        />
        <span>{label ?? config.label}</span>
      </motion.div>
    </AnimatePresence>
  );
}
