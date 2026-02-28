"use client";

import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { getFormByCode } from "@/lib/forms";
import {
  FORM_SUBMISSION_STATUS_LABELS,
  FORM_SUBMISSION_STATUS_COLORS,
  type FormSubmissionStatus,
} from "@/lib/forms/types";
import {
  Search,
  FileText,
  CheckCircle2,
  Clock,
  AlertTriangle,
  ListChecks,
  ChevronRight,
  Package,
} from "lucide-react";

interface FormSubmission {
  id: string;
  form_code: string;
  user_id: string;
  data: Record<string, unknown>;
  status: string;
  admin_notes: string | null;
  created_at: string;
  updated_at: string;
}

interface ProcessTask {
  id: string;
  user_id: string;
  task_name: string;
  task_category: string | null;
  task_status: string;
  sort_order: number;
  notes: string | null;
  form_submission_id: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}

const TASK_STATUS_CONFIG: Record<string, { label: string; color: string; icon: typeof Clock }> = {
  pending: { label: "Bekliyor", color: "text-amber-500 bg-amber-500/10", icon: Clock },
  in_progress: { label: "Devam Ediyor", color: "text-blue-500 bg-blue-500/10", icon: ListChecks },
  completed: { label: "Tamamlandı", color: "text-emerald-500 bg-emerald-500/10", icon: CheckCircle2 },
  blocked: { label: "Engellendi", color: "text-red-500 bg-red-500/10", icon: AlertTriangle },
};

export function ServicesContent({
  submissions,
  tasks,
}: {
  submissions: FormSubmission[];
  tasks: ProcessTask[];
}) {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selectedSubmission, setSelectedSubmission] = useState<string | null>(null);

  // Group tasks by form_submission_id for easy lookup
  const tasksBySubmission = useMemo(() => {
    const map: Record<string, ProcessTask[]> = {};
    for (const task of tasks) {
      if (task.form_submission_id) {
        if (!map[task.form_submission_id]) map[task.form_submission_id] = [];
        map[task.form_submission_id].push(task);
      }
    }
    return map;
  }, [tasks]);

  // Standalone tasks (not linked to any submission)
  const standaloneTasks = useMemo(
    () => tasks.filter((t) => !t.form_submission_id),
    [tasks]
  );

  // Filter submissions
  const filteredSubmissions = useMemo(() => {
    let result = submissions;

    if (statusFilter !== "all") {
      result = result.filter((s) => s.status === statusFilter);
    }

    if (searchQuery.length >= 2) {
      const q = searchQuery.toLowerCase();
      result = result.filter((s) => {
        const form = getFormByCode(s.form_code);
        return (
          s.form_code.toLowerCase().includes(q) ||
          form?.title.toLowerCase().includes(q)
        );
      });
    }

    return result;
  }, [submissions, statusFilter, searchQuery]);

  // Stats
  const stats = useMemo(() => ({
    total: submissions.length,
    active: submissions.filter((s) =>
      ["submitted", "under_review", "approved"].includes(s.status)
    ).length,
    completed: submissions.filter((s) => s.status === "completed").length,
    tasksDone: tasks.filter((t) => t.task_status === "completed").length,
    tasksTotal: tasks.length,
  }), [submissions, tasks]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">Hizmetlerim</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Form başvurularınızın durumunu ve aktif hizmetlerinizi takip edin.
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Toplam Başvuru", value: stats.total, icon: FileText, color: "text-indigo-400" },
          { label: "Aktif Hizmet", value: stats.active, icon: Package, color: "text-blue-400" },
          { label: "Tamamlanan", value: stats.completed, icon: CheckCircle2, color: "text-emerald-400" },
          {
            label: "Görev İlerlemesi",
            value: `${stats.tasksDone}/${stats.tasksTotal}`,
            icon: ListChecks,
            color: "text-amber-400",
          },
        ].map((stat) => (
          <div
            key={stat.label}
            className="rounded-xl border bg-card p-4"
          >
            <div className="flex items-center gap-2">
              <stat.icon className={`h-4 w-4 ${stat.color}`} />
              <p className="text-xs text-muted-foreground">{stat.label}</p>
            </div>
            <p className="mt-1 text-2xl font-bold">{stat.value}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative max-w-xs flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Ara... (form kodu, başlık)"
            className="pl-10"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Durum" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tüm Durumlar</SelectItem>
            <SelectItem value="submitted">Gönderildi</SelectItem>
            <SelectItem value="under_review">İnceleniyor</SelectItem>
            <SelectItem value="approved">Onaylandı</SelectItem>
            <SelectItem value="completed">Tamamlandı</SelectItem>
            <SelectItem value="rejected">Reddedildi</SelectItem>
            <SelectItem value="needs_correction">Düzeltme Gerekli</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Submissions List */}
      {filteredSubmissions.length === 0 ? (
        <div className="rounded-xl border bg-card p-12 text-center">
          <FileText className="mx-auto h-10 w-10 text-muted-foreground/30 mb-3" />
          <p className="text-sm text-muted-foreground">
            {submissions.length === 0
              ? "Henüz form başvurunuz yok. Hizmet almak için form gönderin."
              : "Filtrelere uygun başvuru bulunamadı."}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredSubmissions.map((sub, i) => {
            const formDef = getFormByCode(sub.form_code);
            const status = sub.status as FormSubmissionStatus;
            const statusColors = FORM_SUBMISSION_STATUS_COLORS[status] ?? "text-muted-foreground bg-muted";
            const linkedTasks = tasksBySubmission[sub.id] ?? [];
            const isExpanded = selectedSubmission === sub.id;
            const completedTasks = linkedTasks.filter((t) => t.task_status === "completed").length;

            return (
              <motion.div
                key={sub.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.03 }}
                className="rounded-xl border bg-card overflow-hidden"
              >
                {/* Submission Header */}
                <button
                  onClick={() => setSelectedSubmission(isExpanded ? null : sub.id)}
                  className="w-full flex items-center justify-between p-4 hover:bg-muted/30 transition-colors text-left"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <Badge variant="outline" className="text-[10px] font-mono shrink-0">
                      {sub.form_code}
                    </Badge>
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">
                        {formDef?.title ?? sub.form_code}
                      </p>
                      <p className="text-[10px] text-muted-foreground">
                        {new Date(sub.created_at).toLocaleDateString("tr-TR")}
                        {linkedTasks.length > 0 && (
                          <span className="ml-2">
                            · {completedTasks}/{linkedTasks.length} görev tamamlandı
                          </span>
                        )}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Badge className={cn("text-[10px]", statusColors)}>
                      {FORM_SUBMISSION_STATUS_LABELS[status] ?? status}
                    </Badge>
                    <ChevronRight
                      className={cn(
                        "h-4 w-4 text-muted-foreground transition-transform",
                        isExpanded && "rotate-90"
                      )}
                    />
                  </div>
                </button>

                {/* Expanded Detail */}
                {isExpanded && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    className="border-t bg-muted/10 p-4 space-y-4"
                  >
                    {/* Admin Notes */}
                    {sub.admin_notes && (
                      <div className="rounded-lg bg-blue-500/5 border border-blue-500/20 p-3">
                        <p className="text-[10px] font-semibold text-blue-400 uppercase tracking-wider mb-1">
                          Admin Notu
                        </p>
                        <p className="text-sm">{sub.admin_notes}</p>
                      </div>
                    )}

                    {/* Linked Tasks */}
                    {linkedTasks.length > 0 && (
                      <div className="space-y-2">
                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                          Görev İlerlemesi
                        </p>
                        {/* Progress bar */}
                        <div className="h-2 rounded-full bg-muted overflow-hidden">
                          <div
                            className="h-full bg-emerald-500 rounded-full transition-all"
                            style={{
                              width: `${linkedTasks.length > 0 ? (completedTasks / linkedTasks.length) * 100 : 0}%`,
                            }}
                          />
                        </div>
                        <div className="space-y-1.5">
                          {linkedTasks
                            .sort((a, b) => a.sort_order - b.sort_order)
                            .map((task) => {
                              const cfg = TASK_STATUS_CONFIG[task.task_status] ?? TASK_STATUS_CONFIG.pending;
                              const TaskIcon = cfg.icon;
                              return (
                                <div
                                  key={task.id}
                                  className="flex items-center gap-3 rounded-lg bg-card p-2.5"
                                >
                                  <div className={cn("rounded-full p-1", cfg.color)}>
                                    <TaskIcon className="h-3 w-3" />
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium truncate">{task.task_name}</p>
                                    {task.notes && (
                                      <p className="text-[10px] text-muted-foreground truncate">
                                        {task.notes}
                                      </p>
                                    )}
                                  </div>
                                  <Badge className={cn("text-[10px] shrink-0", cfg.color)}>
                                    {cfg.label}
                                  </Badge>
                                </div>
                              );
                            })}
                        </div>
                      </div>
                    )}

                    {linkedTasks.length === 0 && (
                      <p className="text-xs text-muted-foreground text-center py-2">
                        {status === "approved"
                          ? "Görevler hazırlanıyor..."
                          : "Başvurunuz onaylandıktan sonra görevler burada görünecek."}
                      </p>
                    )}
                  </motion.div>
                )}
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Standalone Tasks (not linked to any submission) */}
      {standaloneTasks.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <ListChecks className="h-5 w-5 text-indigo-400" />
            Diğer Görevler
          </h2>
          <div className="space-y-2">
            {standaloneTasks
              .sort((a, b) => a.sort_order - b.sort_order)
              .map((task) => {
                const cfg = TASK_STATUS_CONFIG[task.task_status] ?? TASK_STATUS_CONFIG.pending;
                const TaskIcon = cfg.icon;
                return (
                  <div
                    key={task.id}
                    className="flex items-center gap-3 rounded-xl border bg-card p-3"
                  >
                    <div className={cn("rounded-full p-1.5", cfg.color)}>
                      <TaskIcon className="h-4 w-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium">{task.task_name}</p>
                      {task.notes && (
                        <p className="text-[10px] text-muted-foreground truncate">
                          {task.notes}
                        </p>
                      )}
                    </div>
                    <Badge className={cn("text-[10px]", cfg.color)}>{cfg.label}</Badge>
                  </div>
                );
              })}
          </div>
        </div>
      )}
    </div>
  );
}
