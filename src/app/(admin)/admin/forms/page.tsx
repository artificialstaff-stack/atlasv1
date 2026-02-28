"use client";

/**
 * Admin — Form Başvuruları Yönetimi
 * /admin/forms
 * Tüm müşterilerden gelen form gönderimlerini listeler, filtreler ve yönetir
 */

import { useState, useEffect, useMemo } from "react";
import { motion } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ModalWrapper } from "@/components/shared/modal-wrapper";
import { PageHeader } from "@/components/shared/page-header";
import { cn, formatDate } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import { getFormByCode, FORM_CATEGORIES } from "@/lib/forms";
import {
  FORM_SUBMISSION_STATUS_LABELS,
  FORM_SUBMISSION_STATUS_COLORS,
  type FormSubmissionStatus,
} from "@/lib/forms/types";
import { getTaskTemplates } from "@/lib/forms/task-templates";
import {
  Search,
  FileText,
  Eye,
  MessageCircle,
  Filter,
  RefreshCw,
} from "lucide-react";
import { toast } from "sonner";

// ─── Types ───
interface UserInfo {
  id: string;
  first_name: string;
  last_name: string;
  company_name: string;
  email: string;
}

interface SubmissionRow {
  id: string;
  form_code: string;
  user_id: string;
  data: Record<string, unknown>;
  status: string;
  admin_notes: string | null;
  assigned_to: string | null;
  created_at: string;
  updated_at: string;
}

interface SubmissionWithUser extends SubmissionRow {
  users: {
    first_name: string;
    last_name: string;
    company_name: string;
    email: string;
  } | null;
}

const STATUS_OPTIONS: FormSubmissionStatus[] = [
  "submitted",
  "under_review",
  "needs_correction",
  "approved",
  "rejected",
  "completed",
];

export default function AdminFormsPage() {
  const supabase = createClient();
  const [submissions, setSubmissions] = useState<SubmissionWithUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");

  // Detail modal
  const [selectedSub, setSelectedSub] = useState<SubmissionWithUser | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [newStatus, setNewStatus] = useState<string>("");
  const [adminNotes, setAdminNotes] = useState("");
  const [updating, setUpdating] = useState(false);

  async function fetchSubmissions() {
    setLoading(true);

    // 1. Fetch submissions WITHOUT user embed (avoids FK ambiguity)
    const { data: rawSubmissions, error } = await supabase
      .from("form_submissions")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(200);

    if (error) {
      console.error("[admin/forms] fetch error:", error);
      toast.error("Gönderimler yüklenemedi", { description: error.message });
      setSubmissions([]);
      setLoading(false);
      return;
    }

    const subs = (rawSubmissions ?? []) as unknown as SubmissionRow[];

    // 2. Collect unique user_ids and fetch user data separately
    const userIds = [...new Set(subs.map((s) => s.user_id).filter(Boolean))];
    let userMap: Record<string, UserInfo> = {};

    if (userIds.length > 0) {
      const { data: usersData } = await supabase
        .from("users")
        .select("id, first_name, last_name, company_name, email")
        .in("id", userIds);

      if (usersData) {
        userMap = Object.fromEntries(
          (usersData as unknown as UserInfo[]).map((u) => [u.id, u])
        );
      }
    }

    // 3. Merge user data into submissions
    const merged: SubmissionWithUser[] = subs.map((s) => ({
      ...s,
      users: userMap[s.user_id] ?? null,
    }));

    setSubmissions(merged);
    setLoading(false);
  }

  useEffect(() => {
    fetchSubmissions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Filtered list
  const filtered = useMemo(() => {
    let result = submissions;

    if (statusFilter !== "all") {
      result = result.filter((s) => s.status === statusFilter);
    }

    if (categoryFilter !== "all") {
      result = result.filter((s) => {
        const form = getFormByCode(s.form_code);
        return form?.category === categoryFilter;
      });
    }

    if (searchQuery.length >= 2) {
      const q = searchQuery.toLowerCase();
      result = result.filter((s) => {
        const form = getFormByCode(s.form_code);
        return (
          s.form_code.toLowerCase().includes(q) ||
          form?.title.toLowerCase().includes(q) ||
          s.users?.company_name?.toLowerCase().includes(q) ||
          s.users?.email?.toLowerCase().includes(q)
        );
      });
    }

    return result;
  }, [submissions, statusFilter, categoryFilter, searchQuery]);

  // Open detail modal
  function openDetail(sub: SubmissionWithUser) {
    setSelectedSub(sub);
    setNewStatus(sub.status);
    setAdminNotes(sub.admin_notes ?? "");
    setDetailOpen(true);
  }

  // Update submission
  async function handleUpdate() {
    if (!selectedSub) return;
    setUpdating(true);

    const { error } = await supabase
      .from("form_submissions")
      .update({
        status: newStatus,
        admin_notes: adminNotes || null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", selectedSub.id);

    if (error) {
      toast.error("Güncelleme başarısız", { description: error.message });
    } else {
      // Auto-create process tasks when form is approved
      if (newStatus === "approved") {
        const templates = getTaskTemplates(selectedSub.form_code);
        if (templates.length > 0) {
          const tasksToInsert = templates.map((tmpl) => ({
            user_id: selectedSub.user_id,
            task_name: tmpl.task_name,
            task_category: tmpl.task_category,
            task_status: "pending",
            sort_order: tmpl.sort_order,
            notes: tmpl.notes_template,
            form_submission_id: selectedSub.id,
          }));

          const { error: taskError } = await supabase
            .from("process_tasks")
            .insert(tasksToInsert);

          if (taskError) {
            console.error("[admin/forms] Task create error:", taskError);
            toast.warning("Form onaylandı ancak görevler oluşturulamadı", {
              description: taskError.message,
            });
          } else {
            toast.success(
              `Form onaylandı — ${templates.length} görev otomatik oluşturuldu`
            );
          }
        } else {
          toast.success("Gönderim onaylandı");
        }
      } else {
        toast.success("Gönderim güncellendi");
      }
      setDetailOpen(false);
      fetchSubmissions();
    }
    setUpdating(false);
  }

  // Stats
  const stats = useMemo(() => {
    const total = submissions.length;
    const pending = submissions.filter((s) => s.status === "submitted" || s.status === "under_review").length;
    const completed = submissions.filter((s) => s.status === "completed" || s.status === "approved").length;
    return { total, pending, completed };
  }, [submissions]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Form Başvuruları"
        description="Müşterilerden gelen tüm form gönderimlerini yönetin."
      >
        <Button variant="outline" size="sm" onClick={fetchSubmissions}>
          <RefreshCw className="mr-1 h-4 w-4" />
          Yenile
        </Button>
      </PageHeader>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 max-w-md">
        <div className="rounded-lg border bg-card p-3 text-center">
          <p className="text-2xl font-bold">{stats.total}</p>
          <p className="text-[10px] text-muted-foreground uppercase">Toplam</p>
        </div>
        <div className="rounded-lg border bg-card p-3 text-center">
          <p className="text-2xl font-bold text-amber-500">{stats.pending}</p>
          <p className="text-[10px] text-muted-foreground uppercase">Bekleyen</p>
        </div>
        <div className="rounded-lg border bg-card p-3 text-center">
          <p className="text-2xl font-bold text-emerald-500">{stats.completed}</p>
          <p className="text-[10px] text-muted-foreground uppercase">Tamamlanan</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative max-w-xs flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Ara... (form kodu, müşteri)"
            className="pl-10"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[180px]">
            <Filter className="mr-1 h-3.5 w-3.5" />
            <SelectValue placeholder="Durum" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tüm Durumlar</SelectItem>
            {STATUS_OPTIONS.map((s) => (
              <SelectItem key={s} value={s}>
                {FORM_SUBMISSION_STATUS_LABELS[s]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="w-[180px]">
            <Filter className="mr-1 h-3.5 w-3.5" />
            <SelectValue placeholder="Kategori" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tüm Kategoriler</SelectItem>
            {FORM_CATEGORIES.map((c) => (
              <SelectItem key={c.id} value={c.id}>
                {c.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <div className="rounded-xl border bg-card overflow-hidden">
        {loading ? (
          <div className="p-12 text-center">
            <p className="text-sm text-muted-foreground">Yükleniyor...</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center">
            <FileText className="mx-auto h-10 w-10 text-muted-foreground/30 mb-3" />
            <p className="text-sm text-muted-foreground">
              {searchQuery || statusFilter !== "all" || categoryFilter !== "all"
                ? "Filtrelere uygun gönderim bulunamadı."
                : "Henüz form gönderimi yok."}
            </p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Form</TableHead>
                <TableHead>Müşteri</TableHead>
                <TableHead>Durum</TableHead>
                <TableHead>Tarih</TableHead>
                <TableHead className="w-[80px]" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((sub, i) => {
                const formDef = getFormByCode(sub.form_code);
                const status = sub.status as FormSubmissionStatus;
                const statusColors = FORM_SUBMISSION_STATUS_COLORS[status] ?? "text-muted-foreground bg-muted";

                return (
                  <motion.tr
                    key={sub.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: i * 0.02 }}
                    className="group"
                  >
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-[10px] font-mono shrink-0">
                          {sub.form_code}
                        </Badge>
                        <span className="text-sm font-medium truncate max-w-[200px]">
                          {formDef?.title ?? sub.form_code}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div>
                        <p className="text-sm font-medium">
                          {sub.users?.company_name ?? "—"}
                        </p>
                        <p className="text-[10px] text-muted-foreground">
                          {sub.users ? `${sub.users.first_name} ${sub.users.last_name}` : "—"}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge className={cn("text-[10px]", statusColors)}>
                        {FORM_SUBMISSION_STATUS_LABELS[status] ?? status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {formatDate(sub.created_at)}
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => openDetail(sub)}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </motion.tr>
                );
              })}
            </TableBody>
          </Table>
        )}
      </div>

      {/* Detail Modal */}
      <ModalWrapper
        open={detailOpen}
        onOpenChange={setDetailOpen}
        title={selectedSub ? `${selectedSub.form_code} — Gönderim Detayı` : ""}
        description={selectedSub ? `${selectedSub.users?.company_name ?? "—"} tarafından gönderildi` : ""}
        className="max-w-2xl max-h-[80vh] overflow-y-auto"
      >
        {selectedSub && (
          <div className="space-y-6">
            {/* Form Data */}
            <div className="space-y-3">
              <h4 className="text-sm font-semibold">Form Verileri</h4>
              {(() => {
                const formDef = getFormByCode(selectedSub.form_code);
                if (!formDef) {
                  // Raw data fallback
                  return (
                    <div className="grid gap-2 sm:grid-cols-2">
                      {Object.entries(selectedSub.data).map(([key, value]) => (
                        <div key={key} className="space-y-0.5">
                          <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">{key}</p>
                          <p className="text-sm">{Array.isArray(value) ? value.join(", ") : String(value ?? "—")}</p>
                        </div>
                      ))}
                    </div>
                  );
                }
                return formDef.sections.map((section, sIdx) => {
                  const fields = section.fields.filter(
                    (f) => f.type !== "heading" && f.type !== "separator" && selectedSub.data[f.name] !== undefined && selectedSub.data[f.name] !== ""
                  );
                  if (!fields.length) return null;
                  return (
                    <div key={sIdx} className="space-y-2 p-3 rounded-lg bg-muted/30">
                      <p className="text-xs font-semibold text-muted-foreground">{section.title}</p>
                      <div className="grid gap-2 sm:grid-cols-2">
                        {fields.map((field) => {
                          const val = selectedSub.data[field.name];
                          const display = Array.isArray(val)
                            ? val.map((v) => field.options?.find((o) => o.value === v)?.label ?? v).join(", ")
                            : field.options?.find((o) => o.value === val)?.label ?? String(val ?? "—");
                          return (
                            <div key={field.name} className="space-y-0.5">
                              <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">{field.label}</p>
                              <p className="text-sm">{display}</p>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                });
              })()}
            </div>

            {/* Status Update */}
            <div className="space-y-3 pt-3 border-t">
              <h4 className="text-sm font-semibold">Durum Güncelle</h4>
              <Select value={newStatus} onValueChange={setNewStatus}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STATUS_OPTIONS.map((s) => (
                    <SelectItem key={s} value={s}>
                      {FORM_SUBMISSION_STATUS_LABELS[s]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <div className="space-y-1.5">
                <label className="text-sm font-medium flex items-center gap-1">
                  <MessageCircle className="h-3.5 w-3.5" />
                  Admin Notu
                </label>
                <Textarea
                  value={adminNotes}
                  onChange={(e) => setAdminNotes(e.target.value)}
                  placeholder="Müşteriye gösterilecek not..."
                  rows={3}
                />
              </div>

              <Button onClick={handleUpdate} disabled={updating} className="w-full">
                {updating ? "Güncelleniyor..." : "Güncelle"}
              </Button>
            </div>
          </div>
        )}
      </ModalWrapper>
    </div>
  );
}
