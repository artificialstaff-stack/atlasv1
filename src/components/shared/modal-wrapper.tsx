"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

interface ModalWrapperProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  children: ReactNode;
  className?: string;
  contentClassName?: string;
  bodyClassName?: string;
  size?: "default" | "wide" | "full" | "workspace";
  workspacePreset?: "default" | "compact" | "dense";
  hideHeader?: boolean;
}

/**
 * Genel Modal Sarmalayıcı
 * Tüm Dialog'lar bu bileşen üzerinden açılır
 */
export function ModalWrapper({
  open,
  onOpenChange,
  title,
  description,
  children,
  className,
  contentClassName,
  bodyClassName,
  size = "wide",
  workspacePreset = "default",
  hideHeader = false,
}: ModalWrapperProps) {
  const sizeClassName =
    size === "workspace"
      ? workspacePreset === "compact"
        ? "!h-[90vh] !w-[calc(100vw-3rem)] !max-w-[1480px]"
        : workspacePreset === "dense"
          ? "!h-[91vh] !w-[calc(100vw-3rem)] !max-w-[1600px]"
          : "!h-[92vh] !w-[calc(100vw-3rem)] !max-w-[1680px]"
      : size === "full"
      ? "w-[min(96vw,1320px)] max-w-[1320px]"
      : size === "default"
        ? "w-[min(92vw,760px)] max-w-[760px]"
        : "w-[min(95vw,1180px)] max-w-[1180px]";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        data-jarvis-modal-content={size === "workspace" ? "workspace" : "standard"}
        showCloseButton={!hideHeader}
        className={cn(
          "overflow-hidden border border-white/10 bg-[#0a1020]/95 p-0 text-foreground shadow-[0_32px_120px_rgba(2,8,23,0.65)] backdrop-blur-xl",
          size === "workspace" ? "max-h-[93vh] rounded-[2rem]" : "max-h-[90vh]",
          sizeClassName,
          contentClassName,
          className,
        )}
      >
        {!hideHeader ? (
          <>
            <DialogHeader className="border-b border-white/8 bg-white/[0.02] px-6 py-5">
              <DialogTitle className="text-lg font-semibold tracking-tight">{title}</DialogTitle>
              {description && (
                <DialogDescription className="mt-1 text-sm text-muted-foreground">
                  {description}
                </DialogDescription>
              )}
            </DialogHeader>
            <div className={cn("max-h-[calc(90vh-88px)] overflow-y-auto px-6 py-5", bodyClassName)}>
              {children}
            </div>
          </>
        ) : (
          <>
            <DialogHeader className="sr-only">
              <DialogTitle>{title}</DialogTitle>
              {description ? <DialogDescription>{description}</DialogDescription> : null}
            </DialogHeader>
            <div className={cn("h-full min-h-0", bodyClassName)}>{children}</div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
