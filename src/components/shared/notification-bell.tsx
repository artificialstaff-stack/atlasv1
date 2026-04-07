"use client";

import { useState, useRef, useEffect, useMemo } from "react";
import Link from "next/link";
import { Bell, CheckCheck, Info, AlertTriangle, CheckCircle2, XCircle, Inbox } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useNotifications } from "@/hooks/use-notifications";
import type { Notification } from "@/lib/notifications";

const typeConfig: Record<
  Notification["type"],
  { icon: typeof Info; color: string; bg: string }
> = {
  info: { icon: Info, color: "text-blue-500", bg: "bg-blue-500/10" },
  success: {
    icon: CheckCircle2,
    color: "text-green-500",
    bg: "bg-green-500/10",
  },
  warning: {
    icon: AlertTriangle,
    color: "text-amber-500",
    bg: "bg-amber-500/10",
  },
  error: { icon: XCircle, color: "text-red-500", bg: "bg-red-500/10" },
  system: { icon: Bell, color: "text-violet-400", bg: "bg-violet-500/10" },
};

function groupByDate(notifications: Notification[]): Array<{ label: string; items: Notification[] }> {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today.getTime() - 86400000);

  const groups: Record<string, Notification[]> = {};
  for (const n of notifications) {
    const d = new Date(n.created_at);
    const day = new Date(d.getFullYear(), d.getMonth(), d.getDate());
    let label: string;
    if (day.getTime() === today.getTime()) label = "Bugün";
    else if (day.getTime() === yesterday.getTime()) label = "Dün";
    else label = d.toLocaleDateString("tr-TR", { day: "numeric", month: "short" });
    (groups[label] ??= []).push(n);
  }
  return Object.entries(groups).map(([label, items]) => ({ label, items }));
}

export function NotificationBell() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const { notifications, unreadCount, markRead, markAllRead } = useNotifications();

  const grouped = useMemo(() => groupByDate(notifications), [notifications]);

  // Close on click outside
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) {
      document.addEventListener("mousedown", handleClick);
    }
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  return (
    <div ref={ref} className="relative">
      {/* Bell Button */}
      <Button
        variant="ghost"
        size="icon"
        className="relative h-9 w-9"
        onClick={() => setOpen(!open)}
        aria-label={`Bildirimler${unreadCount > 0 ? ` (${unreadCount} okunmamış)` : ""}`}
      >
        <motion.div
          animate={unreadCount > 0 ? { rotate: [0, -8, 8, -6, 6, 0] } : {}}
          transition={{ duration: 0.5, delay: 0.3 }}
        >
          <Bell className="h-4.5 w-4.5" />
        </motion.div>
        <AnimatePresence>
          {unreadCount > 0 && (
            <motion.span
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0 }}
              className="absolute -top-0.5 -right-0.5 flex h-4.5 min-w-4.5 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-bold text-destructive-foreground"
            >
              {unreadCount > 9 ? "9+" : unreadCount}
            </motion.span>
          )}
        </AnimatePresence>
        {/* Pulse ring for unread */}
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 h-4.5 w-4.5 animate-ping rounded-full bg-destructive/40" />
        )}
      </Button>

      {/* Dropdown */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.96 }}
            transition={{ duration: 0.15, ease: [0.4, 0, 0.2, 1] as const }}
            className="absolute right-0 top-11 z-50 w-80 rounded-xl border bg-popover shadow-xl"
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b px-4 py-3">
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-semibold">Bildirimler</h3>
                {unreadCount > 0 && (
                  <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                    {unreadCount}
                  </Badge>
                )}
              </div>
              <div className="flex items-center gap-1">
                {unreadCount > 0 && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    onClick={markAllRead}
                    title="Tümünü okundu işaretle"
                  >
                    <CheckCheck className="h-3.5 w-3.5" />
                  </Button>
                )}
              </div>
            </div>

            {/* Notification List */}
            <ScrollArea className="max-h-96">
              {notifications.length > 0 ? (
                <div>
                  {grouped.map((group) => (
                    <div key={group.label}>
                      <div className="sticky top-0 z-10 bg-popover/95 backdrop-blur-sm px-4 py-1.5">
                        <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/60">
                          {group.label}
                        </p>
                      </div>
                      <div className="divide-y">
                        {group.items.map((n, i) => {
                          const config = typeConfig[n.type];
                          const Icon = config.icon;
                          return (
                            <motion.div
                              key={n.id}
                              initial={{ opacity: 0, x: -10 }}
                              animate={{ opacity: 1, x: 0 }}
                              transition={{ delay: i * 0.03 }}
                              className={cn(
                                "flex gap-3 px-4 py-3 transition-colors hover:bg-muted/50 cursor-pointer",
                                !n.is_read && "bg-primary/[0.03]"
                              )}
                              onClick={() => !n.is_read && markRead(n.id)}
                            >
                              <div
                                className={cn(
                                  "mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg",
                                  config.bg
                                )}
                              >
                                <Icon className={cn("h-3.5 w-3.5", config.color)} />
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-start justify-between gap-2">
                                  <p
                                    className={cn(
                                      "text-xs leading-snug",
                                      !n.is_read ? "font-semibold" : "font-medium"
                                    )}
                                  >
                                    {n.title}
                                  </p>
                                  {!n.is_read && (
                                    <div className="mt-1 h-2 w-2 shrink-0 rounded-full bg-primary" />
                                  )}
                                </div>
                                {n.body && (
                                  <p className="mt-0.5 text-[11px] text-muted-foreground line-clamp-2">
                                    {n.body}
                                  </p>
                                )}
                                <p className="mt-1 text-[10px] text-muted-foreground/60">
                                  {formatTimeAgo(new Date(n.created_at))}
                                </p>
                                {n.action_url && (
                                  <Link
                                    href={n.action_url}
                                    className="mt-2 inline-flex text-[11px] font-medium text-primary hover:underline"
                                    onClick={() => setOpen(false)}
                                  >
                                    Detaya git
                                  </Link>
                                )}
                              </div>
                            </motion.div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <motion.div
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ type: "spring", damping: 12 }}
                  >
                    <Inbox className="h-10 w-10 text-muted-foreground/20 mb-3 mx-auto" />
                  </motion.div>
                  <p className="text-xs font-medium text-muted-foreground/60">
                    Henüz bildirim yok
                  </p>
                  <p className="mt-1 text-[11px] text-muted-foreground/40">
                    Atlas işlem yaptıkça burada görünecek
                  </p>
                </div>
              )}
            </ScrollArea>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function formatTimeAgo(date: Date): string {
  const now = new Date();
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (seconds < 60) return "Az önce";
  if (seconds < 3600) return `${Math.floor(seconds / 60)} dk önce`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)} saat önce`;
  if (seconds < 604800) return `${Math.floor(seconds / 86400)} gün önce`;
  return date.toLocaleDateString("tr-TR");
}
