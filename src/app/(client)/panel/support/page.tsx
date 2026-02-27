"use client";

/**
 * Atlas Destek & Formlar — ABD form sistemi gibi numaralı formlar
 * Kategoriler, form kataloğu, gönderim geçmişi
 */

import { useState, useEffect, useMemo } from "react";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PageHeader } from "@/components/shared/page-header";
import { cn, formatDate } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import {
  FORM_CATEGORIES,
  getFormsByCategory,
  getActiveForms,
  searchForms,
  type FormCategory,
} from "@/lib/forms";
import {
  FORM_SUBMISSION_STATUS_LABELS,
  FORM_SUBMISSION_STATUS_COLORS,
  type FormSubmissionStatus,
} from "@/lib/forms/types";
import {
  Search,
  Clock,
  FileText,
  ChevronRight,
  ArrowLeft,
  Building2,
  Truck,
  Calculator,
  Megaphone,
  Share2,
  Palette,
  LifeBuoy,
  Send,
  Filter,
  History,
} from "lucide-react";

// ─── Icon Map ───
const ICON_MAP: Record<string, React.ElementType> = {
  Building2,
  Truck,
  Calculator,
  Megaphone,
  Share2,
  Palette,
  LifeBuoy,
};

// ─── Types ───
interface FormSubmissionRow {
  id: string;
  form_code: string;
  status: string;
  created_at: string;
  updated_at: string;
}

export default function SupportFormsPage() {
  const router = useRouter();
  const supabase = createClient();

  const [activeTab, setActiveTab] = useState<"forms" | "history">("forms");
  const [selectedCategory, setSelectedCategory] = useState<FormCategory | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [submissions, setSubmissions] = useState<FormSubmissionRow[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(true);

  // Fetch user's form submissions
  useEffect(() => {
    async function fetchSubmissions() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setLoadingHistory(false); return; }

      const { data } = await supabase
        .from("form_submissions")
        .select("id, form_code, status, created_at, updated_at")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      setSubmissions(data ?? []);
      setLoadingHistory(false);
    }
    fetchSubmissions();
  }, [supabase]);

  // Filtered forms
  const displayedForms = useMemo(() => {
    if (searchQuery.length >= 2) return searchForms(searchQuery);
    if (selectedCategory) return getFormsByCategory(selectedCategory);
    return getActiveForms();
  }, [searchQuery, selectedCategory]);

  const selectedCategoryMeta = selectedCategory
    ? FORM_CATEGORIES.find((c) => c.id === selectedCategory)
    : null;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Destek & Formlar"
        description="İhtiyacınıza uygun formu doldurun, taleplerinizi takip edin. Tüm süreçler form üzerinden yürütülür."
      />

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "forms" | "history")}>
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="forms" className="gap-2">
            <FileText className="h-4 w-4" />
            Formlar
          </TabsTrigger>
          <TabsTrigger value="history" className="gap-2">
            <History className="h-4 w-4" />
            Gönderdiklerim ({submissions.length})
          </TabsTrigger>
        </TabsList>

        {/* ═══════════════════════════════════════════════ */}
        {/* TAB: FORM KATALOĞU                             */}
        {/* ═══════════════════════════════════════════════ */}
        <TabsContent value="forms" className="space-y-6 mt-6">
          {/* Search */}
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Form ara... (ATL-101, LLC, muhasebe...)"
              className="pl-10"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                if (e.target.value.length >= 2) setSelectedCategory(null);
              }}
            />
          </div>

          {/* Category breadcrumb */}
          {selectedCategory && !searchQuery && (
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" onClick={() => setSelectedCategory(null)}>
                <ArrowLeft className="mr-1 h-4 w-4" />
                Tüm Kategoriler
              </Button>
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">{selectedCategoryMeta?.label}</span>
            </div>
          )}

          {/* Category Cards */}
          {!selectedCategory && !searchQuery && (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {FORM_CATEGORIES.map((cat, i) => {
                const Icon = ICON_MAP[cat.icon] ?? FileText;
                const formCount = getFormsByCategory(cat.id).length;
                return (
                  <motion.button
                    key={cat.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.05 }}
                    onClick={() => setSelectedCategory(cat.id)}
                    className={cn(
                      "group relative rounded-xl border bg-card p-5 text-left transition-all duration-200",
                      "hover:border-primary/30 hover:shadow-md hover:shadow-primary/5"
                    )}
                  >
                    <div className={cn(
                      "flex h-10 w-10 items-center justify-center rounded-lg mb-3",
                      cat.color.replace("text-", "bg-").replace("500", "500/10")
                    )}>
                      <Icon className={cn("h-5 w-5", cat.color)} />
                    </div>
                    <h3 className="text-sm font-semibold mb-1 group-hover:text-primary transition-colors">
                      {cat.label}
                    </h3>
                    <p className="text-xs text-muted-foreground line-clamp-2">
                      {cat.description}
                    </p>
                    <div className="flex items-center justify-between mt-3 pt-3 border-t border-border/50">
                      <Badge variant="secondary" className="text-[10px]">
                        {formCount} form
                      </Badge>
                      <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
                    </div>
                  </motion.button>
                );
              })}
            </div>
          )}

          {/* Form List (when category selected or searching) */}
          {(selectedCategory || searchQuery) && (
            <div className="space-y-3">
              {searchQuery && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Filter className="h-4 w-4" />
                  {displayedForms.length} sonuç
                </div>
              )}

              {displayedForms.length === 0 ? (
                <div className="rounded-xl border bg-card p-12 text-center">
                  <FileText className="mx-auto h-10 w-10 text-muted-foreground/30 mb-3" />
                  <p className="text-sm text-muted-foreground">
                    {searchQuery ? "Aramanızla eşleşen form bulunamadı." : "Bu kategoride aktif form bulunmuyor."}
                  </p>
                </div>
              ) : (
                <div className="grid gap-3">
                  {displayedForms.map((form, i) => {
                    const fieldCount = form.sections.reduce(
                      (acc, s) => acc + s.fields.filter((f) => f.type !== "heading" && f.type !== "separator").length,
                      0
                    );
                    return (
                      <motion.div
                        key={form.code}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.04 }}
                      >
                        <button
                          onClick={() => router.push(`/panel/support/forms/${form.code}`)}
                          className={cn(
                            "w-full rounded-xl border bg-card p-4 text-left transition-all duration-200",
                            "hover:border-primary/30 hover:shadow-sm"
                          )}
                        >
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <Badge variant="outline" className="text-[10px] font-mono shrink-0">
                                  {form.code}
                                </Badge>
                                <h4 className="text-sm font-semibold truncate">{form.title}</h4>
                              </div>
                              <p className="text-xs text-muted-foreground line-clamp-1">{form.description}</p>
                              <div className="flex items-center gap-3 mt-2">
                                {form.estimatedMinutes && (
                                  <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
                                    <Clock className="h-3 w-3" />
                                    ~{form.estimatedMinutes} dk
                                  </span>
                                )}
                                <span className="text-[10px] text-muted-foreground">{fieldCount} alan</span>
                              </div>
                            </div>
                            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
                              <Send className="h-4 w-4 text-primary" />
                            </div>
                          </div>
                        </button>
                      </motion.div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </TabsContent>

        {/* ═══════════════════════════════════════════════ */}
        {/* TAB: GÖNDERDİKLERİM                            */}
        {/* ═══════════════════════════════════════════════ */}
        <TabsContent value="history" className="space-y-4 mt-6">
          {loadingHistory ? (
            <div className="rounded-xl border bg-card p-12 text-center">
              <p className="text-sm text-muted-foreground">Yükleniyor...</p>
            </div>
          ) : submissions.length === 0 ? (
            <div className="rounded-xl border bg-card p-12 text-center">
              <History className="mx-auto h-10 w-10 text-muted-foreground/30 mb-3" />
              <p className="text-sm text-muted-foreground mb-3">Henüz form gönderimi yapmadınız.</p>
              <Button variant="outline" onClick={() => setActiveTab("forms")}>
                <FileText className="mr-2 h-4 w-4" />
                Formları İncele
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {submissions.map((sub, i) => {
                const status = sub.status as FormSubmissionStatus;
                const statusColors = FORM_SUBMISSION_STATUS_COLORS[status] ?? "text-muted-foreground bg-muted";
                const formDef = getActiveForms().find((f) => f.code === sub.form_code);
                return (
                  <motion.div
                    key={sub.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.04 }}
                  >
                    <button
                      onClick={() => router.push(`/panel/support/submissions/${sub.id}`)}
                      className={cn(
                        "w-full rounded-xl border bg-card p-4 text-left transition-all",
                        "hover:border-primary/30 hover:shadow-sm"
                      )}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <Badge variant="outline" className="text-[10px] font-mono shrink-0">
                              {sub.form_code}
                            </Badge>
                            <h4 className="text-sm font-medium truncate">
                              {formDef?.title ?? sub.form_code}
                            </h4>
                          </div>
                          <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
                            <span>{formatDate(sub.created_at)}</span>
                          </div>
                        </div>
                        <Badge className={cn("text-[10px] shrink-0", statusColors)}>
                          {FORM_SUBMISSION_STATUS_LABELS[status] ?? status}
                        </Badge>
                      </div>
                    </button>
                  </motion.div>
                );
              })}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
