"use client";

import { useState, useCallback } from "react";
import { motion } from "framer-motion";
import {
  Eye,
  Lightbulb,
  Zap,
  Rocket,
  ShieldAlert,
  Info,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

/**
 * Autonomy Levels — CTO Raporu Bölüm 7
 * 0 = Salt Okunur
 * 1 = Öneri (aksiyon önerir, kullanıcı onaylar)
 * 2 = Otomatik + Bildirim (düşük riskli otomatik)
 * 3 = Tam Otonom (tüm aksiyonlar bağımsız)
 */

export type AutonomyLevel = 0 | 1 | 2 | 3;

interface LevelConfig {
  level: AutonomyLevel;
  label: string;
  description: string;
  icon: typeof Eye;
  color: string;
  bgColor: string;
  riskLabel: string;
}

const LEVELS: LevelConfig[] = [
  {
    level: 0,
    label: "Salt Okunur",
    description: "Sadece bilgi sorgulama, hiçbir değişiklik yapamaz",
    icon: Eye,
    color: "text-muted-foreground",
    bgColor: "bg-muted",
    riskLabel: "Risk yok",
  },
  {
    level: 1,
    label: "Öneri",
    description: "Aksiyon önerir, her adımda kullanıcı onayı gerekir",
    icon: Lightbulb,
    color: "text-blue-400",
    bgColor: "bg-blue-400/10",
    riskLabel: "Düşük risk",
  },
  {
    level: 2,
    label: "Otomatik + Bildirim",
    description: "Düşük riskli aksiyonları otomatik yapar, bildirimle raporlar",
    icon: Zap,
    color: "text-amber-400",
    bgColor: "bg-amber-400/10",
    riskLabel: "Orta risk",
  },
  {
    level: 3,
    label: "Tam Otonom",
    description: "Tüm aksiyonları bağımsız yürütür, sadece sonucu raporlar",
    icon: Rocket,
    color: "text-red-400",
    bgColor: "bg-red-400/10",
    riskLabel: "Yüksek risk",
  },
];

interface AutonomyControlProps {
  /** Current autonomy level */
  currentLevel: AutonomyLevel;
  /** Callback when level changes */
  onLevelChange: (level: AutonomyLevel) => void;
  /** Compact mode for inline use */
  compact?: boolean;
  className?: string;
}

/**
 * AutonomyControl — AI ajan otonomi seviye kontrolü
 * Level 2+ seçiminde onay dialog'u gösterir (Human-in-the-Loop)
 */
export function AutonomyControl({
  currentLevel,
  onLevelChange,
  compact = false,
  className,
}: AutonomyControlProps) {
  const [pendingLevel, setPendingLevel] = useState<AutonomyLevel | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const handleSelect = useCallback(
    (level: AutonomyLevel) => {
      if (level === currentLevel) return;

      // Level 2+ requires confirmation dialog (HITL)
      if (level >= 2) {
        setPendingLevel(level);
        setConfirmOpen(true);
      } else {
        onLevelChange(level);
      }
    },
    [currentLevel, onLevelChange]
  );

  const handleConfirm = useCallback(() => {
    if (pendingLevel !== null) {
      onLevelChange(pendingLevel);
    }
    setConfirmOpen(false);
    setPendingLevel(null);
  }, [pendingLevel, onLevelChange]);

  const handleCancel = useCallback(() => {
    setConfirmOpen(false);
    setPendingLevel(null);
  }, []);

  const currentConfig = LEVELS[currentLevel];

  if (compact) {
    return (
      <div className={cn("flex items-center gap-2", className)}>
        {LEVELS.map((lvl) => {
          const Icon = lvl.icon;
          const isActive = lvl.level === currentLevel;

          return (
            <button
              key={lvl.level}
              onClick={() => handleSelect(lvl.level)}
              title={`${lvl.label}: ${lvl.description}`}
              className={cn(
                "relative flex h-8 w-8 items-center justify-center rounded-lg transition-all duration-200",
                isActive
                  ? cn(lvl.bgColor, lvl.color, "ring-1 ring-current/30")
                  : "text-muted-foreground/50 hover:text-muted-foreground hover:bg-muted"
              )}
            >
              <Icon className="h-4 w-4" />
              {isActive && (
                <motion.div
                  layoutId="autonomy-indicator"
                  className={cn(
                    "absolute -bottom-1 h-0.5 w-4 rounded-full",
                    lvl.level === 0 && "bg-muted-foreground",
                    lvl.level === 1 && "bg-blue-400",
                    lvl.level === 2 && "bg-amber-400",
                    lvl.level === 3 && "bg-red-400"
                  )}
                  transition={{ type: "spring", stiffness: 500, damping: 30 }}
                />
              )}
            </button>
          );
        })}

        {/* Confirmation Dialog */}
        <ConfirmDialog
          open={confirmOpen}
          pendingLevel={pendingLevel}
          onConfirm={handleConfirm}
          onCancel={handleCancel}
        />
      </div>
    );
  }

  // Full mode
  return (
    <div className={cn("space-y-3", className)}>
      {/* Current Status Header */}
      <div className="flex items-center gap-3 p-3 rounded-xl border bg-card/50">
        <div
          className={cn(
            "flex h-10 w-10 items-center justify-center rounded-lg shrink-0",
            currentConfig.bgColor
          )}
        >
          <currentConfig.icon className={cn("h-5 w-5", currentConfig.color)} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold">{currentConfig.label}</p>
          <p className="text-xs text-muted-foreground">
            {currentConfig.description}
          </p>
        </div>
        <span
          className={cn(
            "text-[10px] font-medium px-2 py-0.5 rounded-full",
            currentConfig.bgColor,
            currentConfig.color
          )}
        >
          Seviye {currentLevel}
        </span>
      </div>

      {/* Level Selection Grid */}
      <div className="grid grid-cols-2 gap-2">
        {LEVELS.map((lvl) => {
          const Icon = lvl.icon;
          const isActive = lvl.level === currentLevel;

          return (
            <motion.button
              key={lvl.level}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => handleSelect(lvl.level)}
              className={cn(
                "relative flex flex-col items-start gap-1.5 p-3 rounded-xl border text-left transition-all duration-200",
                isActive
                  ? cn(
                      "border-current/20",
                      lvl.bgColor,
                      "ring-1 ring-current/10"
                    )
                  : "border-border/50 hover:border-border hover:bg-muted/30"
              )}
            >
              <div className="flex items-center gap-2 w-full">
                <div
                  className={cn(
                    "flex h-7 w-7 items-center justify-center rounded-md",
                    isActive ? lvl.bgColor : "bg-muted"
                  )}
                >
                  <Icon
                    className={cn(
                      "h-3.5 w-3.5",
                      isActive ? lvl.color : "text-muted-foreground"
                    )}
                  />
                </div>
                <span
                  className={cn(
                    "text-xs font-medium",
                    isActive ? lvl.color : "text-foreground"
                  )}
                >
                  {lvl.label}
                </span>
              </div>
              <p className="text-[10px] text-muted-foreground leading-tight">
                {lvl.description}
              </p>
              <span
                className={cn(
                  "text-[9px] px-1.5 py-0.5 rounded-full",
                  lvl.level >= 2
                    ? "bg-amber-400/10 text-amber-400"
                    : "bg-muted text-muted-foreground"
                )}
              >
                {lvl.riskLabel}
              </span>
            </motion.button>
          );
        })}
      </div>

      {/* Info */}
      <div className="flex items-start gap-2 px-3 py-2 rounded-lg bg-muted/50">
        <Info className="h-3.5 w-3.5 text-muted-foreground shrink-0 mt-0.5" />
        <p className="text-[10px] text-muted-foreground leading-relaxed">
          Seviye 2 ve üzeri seçimlerde güvenlik onayı istenir.
          Tüm ajan aksiyonları denetim kaydına alınır.
        </p>
      </div>

      {/* Confirmation Dialog */}
      <ConfirmDialog
        open={confirmOpen}
        pendingLevel={pendingLevel}
        onConfirm={handleConfirm}
        onCancel={handleCancel}
      />
    </div>
  );
}

// ─────────────────────────────────────────

function ConfirmDialog({
  open,
  pendingLevel,
  onConfirm,
  onCancel,
}: {
  open: boolean;
  pendingLevel: AutonomyLevel | null;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const config = pendingLevel !== null ? LEVELS[pendingLevel] : null;

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onCancel()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShieldAlert className="h-5 w-5 text-amber-400" />
            Otonomi Seviyesi Değişikliği
          </DialogTitle>
          <DialogDescription>
            AI ajanının otonomi seviyesini{" "}
            <strong className="text-foreground">
              Seviye {pendingLevel} — {config?.label}
            </strong>{" "}
            olarak değiştirmek üzeresiniz.
          </DialogDescription>
        </DialogHeader>

        {config && (
          <div className="space-y-3 py-2">
            <div
              className={cn(
                "flex items-start gap-3 p-3 rounded-lg",
                config.bgColor
              )}
            >
              <config.icon className={cn("h-5 w-5 mt-0.5", config.color)} />
              <div>
                <p className={cn("text-sm font-medium", config.color)}>
                  {config.label}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {config.description}
                </p>
              </div>
            </div>

            {pendingLevel === 3 && (
              <div className="flex items-start gap-2 p-3 rounded-lg bg-red-400/5 border border-red-400/20">
                <ShieldAlert className="h-4 w-4 text-red-400 shrink-0 mt-0.5" />
                <p className="text-xs text-red-300">
                  <strong>Uyarı:</strong> Tam otonom modda ajan sipariş
                  oluşturma, envanter değiştirme ve toplu işlem gibi yüksek
                  riskli aksiyonları onay almadan yürütebilir.
                </p>
              </div>
            )}
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={onCancel}>
            İptal
          </Button>
          <Button
            onClick={onConfirm}
            className={cn(
              pendingLevel === 3 &&
                "bg-red-500 hover:bg-red-600 text-white"
            )}
          >
            Onayla — Seviye {pendingLevel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
