"use client";

import { useId } from "react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useI18n } from "@/i18n/provider";

type AtlasBrandVariant = "portal" | "admin";

function AtlasShieldMonogram({
  variant,
  className,
}: {
  variant: AtlasBrandVariant;
  className?: string;
}) {
  const accent = variant === "portal" ? "#4F8CFF" : "#6F8BFF";
  const glow = variant === "portal" ? "rgba(79,140,255,0.24)" : "rgba(111,139,255,0.2)";
  const gradientId = useId().replace(/:/g, "");

  return (
    <div
      className={cn("relative flex items-center justify-center rounded-[1rem] border shadow-[0_16px_44px_rgba(15,23,42,0.32)]", "h-11 w-11 shrink-0 border-white/10 bg-[linear-gradient(180deg,rgba(15,23,42,0.96),rgba(10,14,24,0.92))]", className)}
      style={{ boxShadow: `0 16px 44px rgba(15,23,42,0.32), inset 0 0 0 1px ${glow}` }}
    >
      <svg viewBox="0 0 44 44" className="h-7 w-7" aria-hidden="true">
        <defs>
          <linearGradient id={gradientId} x1="8" y1="6" x2="34" y2="36" gradientUnits="userSpaceOnUse">
            <stop stopColor={accent} stopOpacity="0.95" />
            <stop offset="1" stopColor="#DDF5FF" stopOpacity="0.92" />
          </linearGradient>
        </defs>
        <path
          d="M22 4.5 34 9v10.5c0 8.7-5.8 15-12 18.2C15.8 34.5 10 28.2 10 19.5V9L22 4.5Z"
          fill={`url(#${gradientId})`}
          fillOpacity="0.12"
          stroke={accent}
          strokeWidth="1.5"
        />
        <path
          d="M22 8.8 30.6 12v7.5c0 6.2-3.9 10.7-8.6 13.2-4.7-2.5-8.6-7-8.6-13.2V12L22 8.8Z"
          fill="none"
          stroke={accent}
          strokeOpacity="0.75"
          strokeWidth="1.35"
        />
        <path d="M22 12.4 27.9 24.8h-3.6l-2.1-4.2-2.2 4.2h-3.7L22 12.4Z" fill={accent} />
        <path d="M19.6 21h4.8" stroke="#DDF5FF" strokeWidth="1.25" strokeLinecap="round" strokeOpacity="0.7" />
      </svg>
      <div className="pointer-events-none absolute inset-0 rounded-[1rem] bg-[radial-gradient(circle_at_30%_20%,rgba(255,255,255,0.18),transparent_55%)]" />
    </div>
  );
}

export function AtlasBrandShell({
  variant,
  compact = false,
  className,
}: {
  variant: AtlasBrandVariant;
  compact?: boolean;
  className?: string;
}) {
  const isPortal = variant === "portal";
  const { t } = useI18n();
  const badge = isPortal ? t("shell.portal.badge") : t("shell.admin.badge");
  const sublabel = isPortal ? t("shell.portal.sublabel") : t("shell.admin.sublabel");
  const description = isPortal
    ? t("shell.portal.managedByAtlas")
    : t("shell.admin.stableSummary");
  const badgeTone = isPortal
    ? "border-primary/20 bg-primary/10 text-primary"
    : "border-indigo-300/18 bg-indigo-400/10 text-indigo-200";

  return (
    <div
      className={cn(
        "group flex min-w-0 items-center gap-3 rounded-[1.2rem] border border-white/10",
        "bg-[linear-gradient(180deg,rgba(13,18,32,0.94),rgba(9,13,24,0.92))] px-3 py-2.5",
        "shadow-[0_18px_48px_rgba(2,6,23,0.34)] transition-colors hover:bg-[linear-gradient(180deg,rgba(14,20,36,0.96),rgba(10,14,25,0.94))]",
        compact && "rounded-[1rem] px-2.5 py-2",
        className,
      )}
    >
      <AtlasShieldMonogram variant={variant} className={compact ? "h-10 w-10" : undefined} />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2.5">
          <span className="truncate text-[0.98rem] font-semibold tracking-[0.12em] text-white">
            ATLAS
          </span>
          <Badge
            variant="outline"
            className={cn(
              "rounded-full px-2 py-0 text-[9px] font-medium uppercase tracking-[0.16em]",
              badgeTone,
            )}
          >
            {badge}
          </Badge>
        </div>
        <p className="mt-0.5 text-[9px] uppercase tracking-[0.28em] text-muted-foreground/90">
          {sublabel}
        </p>
        <p className="mt-1.5 truncate text-[10px] leading-5 text-slate-300/78">
          {description}
        </p>
      </div>
    </div>
  );
}
