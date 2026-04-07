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
import { getFormByCode, getLocalizedFormCategories } from "@/lib/forms";
import {
  FORM_SUBMISSION_STATUS_COLORS,
  getFormSubmissionStatusLabel,
  type FormSubmissionStatus,
} from "@/lib/forms/types";
import {
  AlertTriangle,
  ArrowRight,
  Clock3,
  ClipboardList,
  Layers3,
  Search,
  FileText,
  Eye,
  MessageCircle,
  Filter,
  RefreshCw,
} from "lucide-react";
import { toast } from "sonner";
import { useI18n } from "@/i18n/provider";

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
  const { t, locale } = useI18n();
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
  const localizedCategories = useMemo(() => getLocalizedFormCategories(locale), [locale]);

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
      toast.error(t("common.error"), { description: error.message });
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
        const form = getFormByCode(s.form_code, locale);
        return form?.category === categoryFilter;
      });
    }

    if (searchQuery.length >= 2) {
      const q = searchQuery.toLowerCase();
      result = result.filter((s) => {
        const form = getFormByCode(s.form_code, locale);
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

    try {
      const response = await fetch(`/api/admin/forms/${selectedSub.id}/transition`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          status: newStatus,
          adminNotes: adminNotes || null,
        }),
      });

      const payload = (await response.json()) as { error?: string };
      if (!response.ok) {
        throw new Error(payload.error ?? t("admin.forms.updateFailed"));
      }

      toast.success(t("admin.forms.updateSuccess"));
      setDetailOpen(false);
      fetchSubmissions();
    } catch (error) {
      toast.error(t("admin.forms.updateFailedTitle"), {
        description: error instanceof Error ? error.message : t("admin.forms.updateFailedDescription"),
      });
    }
    setUpdating(false);
  }

  // Stats
  const stats = useMemo(() => {
    const total = submissions.length;
    const pending = submissions.filter((s) => s.status === "submitted" || s.status === "under_review").length;
    const completed = submissions.filter((s) => s.status === "completed" || s.status === "approved").length;
    const needsCorrection = submissions.filter((s) => s.status === "needs_correction").length;
    return { total, pending, completed, needsCorrection };
  }, [submissions]);

  const focusSubmissions = useMemo(
    () =>
      submissions.filter((s) =>
        s.status === "submitted" ||
        s.status === "under_review" ||
        s.status === "needs_correction"
      ).slice(0, 5),
    [submissions]
  );

  const latestActivity = focusSubmissions[0];

  return (
    <div className="space-y-5">
      <PageHeader
        title={t("admin.forms.title")}
        description={t("admin.forms.description")}
      >
        <Button variant="outline" size="sm" onClick={fetchSubmissions}>
          <RefreshCw className="mr-1 h-4 w-4" />
          {t("admin.forms.refresh")}
        </Button>
      </PageHeader>

      <div className="grid gap-3 xl:grid-cols-4">
        <div className="atlas-workbench-panel rounded-[1.35rem] p-4">
          <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">{t("admin.forms.stats.total")}</p>
          <p className="mt-1.5 text-[1.7rem] font-semibold tracking-tight">{stats.total}</p>
              <p className="mt-1 text-xs text-muted-foreground">{t("admin.forms.stats.totalHelper")}</p>
        </div>
        <div className="atlas-workbench-panel rounded-[1.35rem] border-primary/20 bg-primary/5 p-4">
          <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">{t("admin.forms.stats.pending")}</p>
          <p className="mt-1.5 text-[1.7rem] font-semibold tracking-tight text-primary">{stats.pending}</p>
          <p className="mt-1 text-xs text-muted-foreground">{t("admin.forms.stats.pendingHelper")}</p>
        </div>
        <div className="atlas-workbench-panel rounded-[1.35rem] border-amber-500/20 bg-amber-500/5 p-4">
          <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">{t("admin.forms.stats.needsCorrection")}</p>
          <p className="mt-1.5 text-[1.7rem] font-semibold tracking-tight text-amber-400">{stats.needsCorrection}</p>
              <p className="mt-1 text-xs text-muted-foreground">{t("admin.forms.stats.needsCorrectionHelper")}</p>
        </div>
        <div className="atlas-workbench-panel rounded-[1.35rem] border-emerald-500/20 bg-emerald-500/5 p-4">
          <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">{t("admin.forms.stats.completed")}</p>
          <p className="mt-1.5 text-[1.7rem] font-semibold tracking-tight text-emerald-400">{stats.completed}</p>
          <p className="mt-1 text-xs text-muted-foreground">{t("admin.forms.stats.completedHelper")}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="atlas-workbench-panel flex flex-wrap items-center gap-3 rounded-[1.25rem] p-3">
        <div className="relative max-w-xs flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={t("admin.forms.searchPlaceholder")}
            className="pl-10"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[180px]">
            <Filter className="mr-1 h-3.5 w-3.5" />
            <SelectValue placeholder={t("admin.forms.statusPlaceholder")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("admin.forms.allStatuses")}</SelectItem>
            {STATUS_OPTIONS.map((s) => (
              <SelectItem key={s} value={s}>
                {getFormSubmissionStatusLabel(s, locale)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="w-[180px]">
            <Filter className="mr-1 h-3.5 w-3.5" />
            <SelectValue placeholder={t("admin.forms.categoryPlaceholder")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("admin.forms.allCategories")}</SelectItem>
            {localizedCategories.map((c) => (
              <SelectItem key={c.id} value={c.id}>
                {c.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="grid items-start gap-4 xl:grid-cols-[0.92fr_1.08fr]">
        <div className="grid gap-4">
          <div className="atlas-workbench-panel-strong rounded-[1.55rem] p-4">
            <div className="flex items-center gap-2">
              <ClipboardList className="h-4 w-4 text-primary" />
              <h3 className="text-sm font-semibold">{t("admin.forms.focusTitle")}</h3>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              {t("admin.forms.focusDescription")}
            </p>
            <div className="mt-4 space-y-2.5">
              {loading ? (
                <div className="rounded-xl border border-dashed border-white/10 px-4 py-5 text-sm text-muted-foreground">
                  {t("admin.forms.focusLoading")}
                </div>
              ) : focusSubmissions.length > 0 ? (
                focusSubmissions.map((sub) => {
                  const status = sub.status as FormSubmissionStatus;
                  return (
                    <button
                      key={sub.id}
                      type="button"
                      onClick={() => openDetail(sub)}
                      className="w-full rounded-xl border border-white/8 bg-background/45 px-3 py-3 text-left transition-colors hover:border-primary/30 hover:bg-background/70"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium">
                            {getFormByCode(sub.form_code, locale)?.title ?? sub.form_code}
                          </p>
                          <p className="mt-0.5 text-xs text-muted-foreground">
                            {sub.users?.company_name ?? t("admin.forms.noCompany")} · {formatDate(sub.created_at)}
                          </p>
                        </div>
                        <Badge className={cn("shrink-0 text-[10px]", FORM_SUBMISSION_STATUS_COLORS[status])}>
                          {getFormSubmissionStatusLabel(status, locale)}
                        </Badge>
                      </div>
                    </button>
                  );
                })
              ) : (
                <div className="rounded-xl border border-dashed border-white/10 px-4 py-5 text-sm text-muted-foreground">
                  {t("admin.forms.focusEmpty")}
                </div>
              )}
            </div>
          </div>

          <div className="atlas-workbench-panel rounded-[1.55rem] p-4">
            <div className="flex items-center gap-2">
              <Layers3 className="h-4 w-4 text-primary" />
              <h3 className="text-sm font-semibold">{t("admin.forms.decisionRailTitle")}</h3>
            </div>
            <div className="mt-4 space-y-2.5">
              <div className="flex items-center justify-between rounded-xl border border-white/8 bg-background/45 px-3 py-3">
                <div className="flex items-center gap-2 text-sm">
                  <Clock3 className="h-4 w-4 text-primary" />
                  {t("admin.forms.lastActivity")}
                </div>
                <span className="text-xs text-muted-foreground">
                  {latestActivity ? formatDate(latestActivity.updated_at) : t("admin.forms.noActivity")}
                </span>
              </div>
              <div className="flex items-center justify-between rounded-xl border border-amber-500/15 bg-amber-500/5 px-3 py-3">
                <div className="flex items-center gap-2 text-sm">
                  <AlertTriangle className="h-4 w-4 text-amber-400" />
                  {t("admin.forms.customerReturn")}
                </div>
                <span className="text-sm font-semibold">{stats.needsCorrection}</span>
              </div>
              <Button
                type="button"
                variant="outline"
                className="w-full justify-between"
                onClick={() => {
                  setStatusFilter("submitted");
                  setCategoryFilter("all");
                }}
              >
                {t("admin.forms.openNewBriefs")}
                <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>

        <div className="atlas-workbench-panel rounded-[1.55rem] overflow-hidden">
          <div className="flex items-center justify-between border-b border-white/8 px-4 py-3">
            <div>
              <h3 className="text-sm font-semibold">{t("admin.forms.tableTitle")}</h3>
              <p className="text-xs text-muted-foreground">
                {t("admin.forms.filteredCount", { count: filtered.length })}
              </p>
            </div>
          </div>
          {loading ? (
            <div className="p-12 text-center">
              <p className="text-sm text-muted-foreground">{t("admin.forms.loading")}</p>
            </div>
          ) : filtered.length === 0 ? (
            <div className="p-12 text-center">
              <FileText className="mx-auto mb-3 h-10 w-10 text-muted-foreground/30" />
              <p className="text-sm text-muted-foreground">
                {searchQuery || statusFilter !== "all" || categoryFilter !== "all"
                  ? t("admin.forms.noFiltered")
                  : t("admin.forms.noSubmissions")}
              </p>
            </div>
          ) : (
            <div className="max-h-[560px] overflow-auto">
              <Table>
                <TableHeader className="sticky top-0 z-10 bg-card/95 backdrop-blur">
                  <TableRow>
                    <TableHead>{t("admin.forms.formHeader")}</TableHead>
                    <TableHead>{t("admin.forms.customerHeader")}</TableHead>
                    <TableHead>{t("admin.forms.statusHeader")}</TableHead>
                    <TableHead>{t("admin.forms.dateHeader")}</TableHead>
                    <TableHead className="w-[80px]" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((sub, i) => {
                    const formDef = getFormByCode(sub.form_code, locale);
                    const status = sub.status as FormSubmissionStatus;
                    const statusColors =
                      FORM_SUBMISSION_STATUS_COLORS[status] ?? "text-muted-foreground bg-muted";

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
                            <Badge variant="outline" className="shrink-0 text-[10px] font-mono">
                              {sub.form_code}
                            </Badge>
                            <span className="max-w-[220px] truncate text-sm font-medium">
                              {formDef?.title ?? sub.form_code}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div>
                            <p className="text-sm font-medium">{sub.users?.company_name ?? "—"}</p>
                            <p className="text-[10px] text-muted-foreground">
                              {sub.users ? `${sub.users.first_name} ${sub.users.last_name}` : "—"}
                            </p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge className={cn("text-[10px]", statusColors)}>
                            {getFormSubmissionStatusLabel(status, locale)}
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
            </div>
          )}
        </div>
      </div>

      {/* Detail Modal */}
      <ModalWrapper
        open={detailOpen}
        onOpenChange={setDetailOpen}
        title={selectedSub ? `${selectedSub.form_code} — ${t("admin.forms.detailTitle")}` : ""}
        description={selectedSub ? `${selectedSub.users?.company_name ?? "—"} ${t("admin.forms.submittedBy")}` : ""}
        size="full"
      >
        {selectedSub && (
          <div className="space-y-6">
            <div className="grid gap-3 lg:grid-cols-4">
              <div className="rounded-2xl border border-white/8 bg-background/45 p-3">
                <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">{t("admin.forms.statusLabel")}</p>
                <Badge
                  className={cn(
                    "mt-2 text-[10px]",
                    FORM_SUBMISSION_STATUS_COLORS[selectedSub.status as FormSubmissionStatus],
                  )}
                >
                  {getFormSubmissionStatusLabel(selectedSub.status as FormSubmissionStatus, locale)}
                </Badge>
              </div>
              <div className="rounded-2xl border border-white/8 bg-background/45 p-3">
                <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">{t("admin.forms.customerLabel")}</p>
                <p className="mt-2 text-sm font-medium">{selectedSub.users?.company_name ?? t("admin.forms.noCompany")}</p>
                <p className="text-xs text-muted-foreground">
                  {selectedSub.users
                    ? `${selectedSub.users.first_name} ${selectedSub.users.last_name}`
                    : t("admin.forms.noUser")}
                </p>
              </div>
              <div className="rounded-2xl border border-white/8 bg-background/45 p-3">
                <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">{t("admin.forms.categoryLabel")}</p>
                <p className="mt-2 text-sm font-medium">
                  {getFormByCode(selectedSub.form_code, locale)?.category ?? t("admin.forms.noCategory")}
                </p>
                <p className="text-xs text-muted-foreground">{selectedSub.form_code}</p>
              </div>
              <div className="rounded-2xl border border-white/8 bg-background/45 p-3">
                <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">{t("admin.forms.receivedLabel")}</p>
                <p className="mt-2 text-sm font-medium">{formatDate(selectedSub.created_at)}</p>
                <p className="text-xs text-muted-foreground">
                  {t("admin.forms.lastUpdatedLabel", { date: formatDate(selectedSub.updated_at) })}
                </p>
              </div>
            </div>

            {/* Form Data */}
            <div className="space-y-3">
              <h4 className="text-sm font-semibold">{t("admin.forms.formDataTitle")}</h4>
              {(() => {
                const formDef = getFormByCode(selectedSub.form_code, locale);
                if (!formDef) {
                  // Raw data fallback
                  return (
                    <div className="grid gap-2 sm:grid-cols-2">
                      {Object.entries(selectedSub.data).map(([key, value]) => (
                        <div key={key} className="space-y-0.5">
                          <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">{key}</p>
                          <p className="text-sm">
                            {Array.isArray(value) ? value.join(", ") : String(value ?? t("admin.forms.noValue"))}
                          </p>
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
                    <div key={sIdx} className="space-y-2 rounded-2xl border border-white/8 bg-background/40 p-4">
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
            <div className="space-y-3 border-t border-white/8 pt-3">
              <h4 className="text-sm font-semibold">{t("admin.forms.statusUpdateTitle")}</h4>
              <Select value={newStatus} onValueChange={setNewStatus}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STATUS_OPTIONS.map((s) => (
                    <SelectItem key={s} value={s}>
                      {getFormSubmissionStatusLabel(s, locale)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <div className="space-y-1.5">
                <label className="text-sm font-medium flex items-center gap-1">
                  <MessageCircle className="h-3.5 w-3.5" />
                  {t("admin.forms.adminNoteLabel")}
                </label>
                <Textarea
                  value={adminNotes}
                  onChange={(e) => setAdminNotes(e.target.value)}
                  placeholder={t("admin.forms.adminNotePlaceholder")}
                  rows={3}
                />
              </div>

              <Button onClick={handleUpdate} disabled={updating} className="w-full">
                {updating ? t("admin.forms.updatingButton") : t("admin.forms.updateButton")}
              </Button>
            </div>
          </div>
        )}
      </ModalWrapper>
    </div>
  );
}
