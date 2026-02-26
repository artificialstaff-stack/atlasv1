"use client";

import { motion } from "framer-motion";
import { Bot, Check, Loader2, AlertTriangle, ChevronDown, ChevronUp } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useState, ReactNode } from "react";

type ActionStatus = "pending" | "running" | "completed" | "failed";

interface AgentActionCardProps {
  title: string;
  description?: string;
  status: ActionStatus;
  agentName?: string;
  /** UI to render inside expanded area (Generative UI) */
  children?: ReactNode;
  /** Human-in-the-Loop: onay/red callback */
  onApprove?: () => void;
  onReject?: () => void;
  className?: string;
}

const statusIcons: Record<ActionStatus, typeof Bot> = {
  pending: Bot,
  running: Loader2,
  completed: Check,
  failed: AlertTriangle,
};

const statusColors: Record<ActionStatus, string> = {
  pending: "text-muted-foreground",
  running: "text-blue-400",
  completed: "text-emerald-400",
  failed: "text-red-400",
};

const statusBg: Record<ActionStatus, string> = {
  pending: "bg-muted",
  running: "bg-blue-400/10",
  completed: "bg-emerald-400/10",
  failed: "bg-red-400/10",
};

export function AgentActionCard({
  title,
  description,
  status,
  agentName = "Atlas AI",
  children,
  onApprove,
  onReject,
  className,
}: AgentActionCardProps) {
  const [expanded, setExpanded] = useState(false);
  const Icon = statusIcons[status];
  const isSpinning = status === "running";
  const needsApproval = status === "pending" && (onApprove || onReject);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className={cn(
        "rounded-xl border bg-card/80 backdrop-blur-sm overflow-hidden",
        className
      )}
    >
      {/* Header */}
      <div className="flex items-start gap-3 p-4">
        <div
          className={cn(
            "flex h-8 w-8 items-center justify-center rounded-lg shrink-0",
            statusBg[status]
          )}
        >
          <Icon
            className={cn(
              "h-4 w-4",
              statusColors[status],
              isSpinning && "animate-spin"
            )}
          />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="text-sm font-medium">{title}</p>
            <span className="text-[10px] text-muted-foreground px-1.5 py-0.5 rounded bg-muted">
              {agentName}
            </span>
          </div>
          {description && (
            <p className="text-xs text-muted-foreground mt-0.5">
              {description}
            </p>
          )}
        </div>

        {/* Expand toggle */}
        {children && (
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 shrink-0"
            onClick={() => setExpanded(!expanded)}
          >
            {expanded ? (
              <ChevronUp className="h-3.5 w-3.5" />
            ) : (
              <ChevronDown className="h-3.5 w-3.5" />
            )}
          </Button>
        )}
      </div>

      {/* Generative UI Content */}
      {children && expanded && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: "auto", opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          className="border-t px-4 py-3"
        >
          {children}
        </motion.div>
      )}

      {/* Human-in-the-Loop Approval */}
      {needsApproval && (
        <div className="border-t px-4 py-3 flex items-center gap-2">
          <p className="text-xs text-muted-foreground flex-1">
            Bu aksiyonu onaylamak istiyor musunuz?
          </p>
          <Button
            size="sm"
            variant="outline"
            className="text-xs h-7"
            onClick={onReject}
          >
            Reddet
          </Button>
          <Button
            size="sm"
            className="text-xs h-7"
            onClick={onApprove}
          >
            Onayla
          </Button>
        </div>
      )}
    </motion.div>
  );
}
