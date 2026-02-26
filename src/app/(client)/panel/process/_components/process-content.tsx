"use client";

import { motion } from "framer-motion";
import { CheckCircle2, Clock, AlertCircle, Lock } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatDate } from "@/lib/utils";
import { TASK_CATEGORY_LABELS, type TaskCategory } from "@/types/enums";
import { BentoGrid, BentoCell } from "@/components/shared/bento-grid";
import { PageHeader } from "@/components/shared/page-header";
import { StatusTransition } from "@/components/shared/status-transition";
import { Badge } from "@/components/ui/badge";

interface Task {
  id: string;
  task_name: string;
  task_status: string;
  task_category?: string | null;
  notes?: string | null;
  completed_at?: string | null;
  sort_order?: number | null;
}

const statusConfig = {
  completed: {
    icon: CheckCircle2,
    color: "text-emerald-400",
    bg: "bg-emerald-400/10",
    ring: "ring-emerald-400/20",
    label: "Tamamlandı",
  },
  in_progress: {
    icon: Clock,
    color: "text-blue-400",
    bg: "bg-blue-400/10",
    ring: "ring-blue-400/20",
    label: "Devam Ediyor",
  },
  pending: {
    icon: Lock,
    color: "text-muted-foreground",
    bg: "bg-muted",
    ring: "ring-border",
    label: "Bekliyor",
  },
  blocked: {
    icon: AlertCircle,
    color: "text-red-400",
    bg: "bg-red-400/10",
    ring: "ring-red-400/20",
    label: "Engellendi",
  },
} as const;

type StatusKey = keyof typeof statusConfig;

const mapToTransitionStatus = (s: string) => {
  if (s === "completed") return "approved" as const;
  if (s === "in_progress") return "in_progress" as const;
  if (s === "blocked") return "crisis" as const;
  return "pending" as const;
};

export function ProcessContent({ tasks }: { tasks: Task[] }) {
  const totalTasks = tasks.length;
  const completedTasks = tasks.filter((t) => t.task_status === "completed").length;
  const inProgressTasks = tasks.filter((t) => t.task_status === "in_progress").length;
  const progressPct =
    totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  // Category breakdown
  const categories = tasks.reduce(
    (acc, task) => {
      const cat = task.task_category ?? "other";
      if (!acc[cat]) acc[cat] = { total: 0, completed: 0 };
      acc[cat].total++;
      if (task.task_status === "completed") acc[cat].completed++;
      return acc;
    },
    {} as Record<string, { total: number; completed: number }>
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Süreç Takibi"
        description="ABD operasyonlarınızın tüm aşamalarını buradan takip edin."
      />

      {/* Overview Bento Grid */}
      <BentoGrid cols={4}>
        {/* Progress Hero — 2 col */}
        <BentoCell span="2" hero>
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Genel İlerleme
          </p>
          <p className="mt-2 text-4xl font-bold tabular-nums text-primary">
            %{progressPct}
          </p>
          <div className="mt-3 h-2.5 w-full rounded-full bg-muted overflow-hidden">
            <motion.div
              className="h-full rounded-full bg-primary"
              initial={{ width: 0 }}
              animate={{ width: `${progressPct}%` }}
              transition={{ duration: 1, ease: [0.4, 0, 0.2, 1] as const, delay: 0.2 }}
            />
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            {completedTasks}/{totalTasks} görev tamamlandı
          </p>
        </BentoCell>

        {/* Quick stats */}
        <BentoCell>
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Devam Eden
          </p>
          <p className="mt-2 text-3xl font-bold tabular-nums text-blue-400">
            {inProgressTasks}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">aktif görev</p>
        </BentoCell>

        <BentoCell>
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Kategoriler
          </p>
          <div className="mt-2 space-y-1.5">
            {Object.entries(categories)
              .slice(0, 4)
              .map(([cat, { total, completed }]) => (
                <div key={cat} className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">
                    {TASK_CATEGORY_LABELS[cat as TaskCategory] ?? cat}
                  </span>
                  <span className="tabular-nums font-medium">
                    {completed}/{total}
                  </span>
                </div>
              ))}
          </div>
        </BentoCell>
      </BentoGrid>

      {/* Timeline */}
      <BentoCell className="w-full">
        <h3 className="mb-4 text-sm font-medium">Süreç Zaman Çizelgesi</h3>
        {tasks.length > 0 ? (
          <div className="relative space-y-0">
            {tasks.map((task, index) => {
              const config =
                statusConfig[task.task_status as StatusKey] ??
                statusConfig.pending;
              const Icon = config.icon;
              const isLast = index === tasks.length - 1;

              return (
                <motion.div
                  key={task.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{
                    duration: 0.35,
                    delay: index * 0.06,
                    ease: [0.4, 0, 0.2, 1] as const,
                  }}
                  className="flex gap-4"
                >
                  {/* Timeline line + dot */}
                  <div className="flex flex-col items-center">
                    <div
                      className={cn(
                        "flex h-8 w-8 items-center justify-center rounded-full shrink-0 ring-2",
                        config.bg,
                        config.ring
                      )}
                    >
                      <Icon className={cn("h-4 w-4", config.color)} />
                    </div>
                    {!isLast && (
                      <div className="w-0.5 flex-1 bg-border/50 min-h-[2rem]" />
                    )}
                  </div>

                  {/* Content */}
                  <div className="pb-6 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="text-sm font-semibold">{task.task_name}</h4>
                      <StatusTransition
                        status={mapToTransitionStatus(task.task_status)}
                        label={config.label}
                        size="sm"
                      />
                      {task.task_category && (
                        <Badge variant="secondary" className="text-xs">
                          {TASK_CATEGORY_LABELS[task.task_category as TaskCategory] ??
                            task.task_category}
                        </Badge>
                      )}
                    </div>
                    {task.notes && (
                      <p className="text-xs text-muted-foreground mt-1.5">
                        {task.notes}
                      </p>
                    )}
                    {task.completed_at && (
                      <p className="text-xs text-emerald-400 mt-1">
                        Tamamlandı: {formatDate(task.completed_at)}
                      </p>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground text-center py-8">
            Henüz süreç görevi oluşturulmamış.
          </p>
        )}
      </BentoCell>
    </div>
  );
}
