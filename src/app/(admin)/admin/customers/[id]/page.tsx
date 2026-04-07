"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
import { PageHeader } from "@/components/shared/page-header";
import { useQueryClient } from "@tanstack/react-query";
import {
  ONBOARDING_STATUS_LABELS,
  type OnboardingStatus,
  PLAN_TIER_LABELS,
  type PlanTier,
  PAYMENT_STATUS_LABELS,
  type PaymentStatus,
  ORDER_STATUS_LABELS,
  type OrderStatus,
  TASK_CATEGORY_LABELS,
  type TaskCategory,
  TASK_STATUS_LABELS,
  type TaskStatus,
} from "@/types/enums";
import {
  formatDate,
  formatCurrency,
  getStatusVariant,
} from "@/lib/utils";
import { useCustomerDetail, useCustomerOrders, useProcessTasks, useProducts } from "@/features/queries";
import { queryKeys } from "@/features/query-keys";
import { useUpdateOnboardingStatus } from "@/features/mutations";
import { getActiveForms } from "@/lib/forms";
import { getPlanTierDefinition } from "@/lib/payments/catalog";
import type { Tables } from "@/types/database";
import {
  ArrowLeft,
  ArrowRight,
  Building2,
  Mail,
  Phone,
  Hash,
  Calendar,
  Package,
  Sparkles,
  Loader2,
  Workflow,
  Send,
  FolderOpen,
  ShieldAlert,
} from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { AdminOperationsHubModal } from "./_components/admin-operations-hub-modal";
import { CustomerWorkspacePanel } from "./_components/customer-workspace-panel";
import { useI18n } from "@/i18n/provider";

type CustomerDetailRecord = Tables<"users"> & {
  user_subscriptions?: Tables<"user_subscriptions">[] | null;
};

type MissingField = {
  key: string;
  label: string;
  description: string;
};

function withViewTransition(action: () => void) {
  if (typeof document !== "undefined" && "startViewTransition" in document) {
    const transitionDocument = document as Document & {
      startViewTransition?: (callback: () => void) => void;
    };
    transitionDocument.startViewTransition?.(action);
    return;
  }

  action();
}

export default function CustomerDetailPage() {
  const params = useParams();
  const customerId = params.id as string;
  const queryClient = useQueryClient();
  const { locale } = useI18n();
  const copy = locale === "en"
    ? {
        loading: "Loading...",
        backToCustomers: "Customer List",
        intakeCenter: "Intake Center",
        processes: "Open Processes",
        observerFallbackTitle: "Observer Workspace",
        observerFallbackDescription: "Even when no CRM record exists, the portal and admin still read the same workspace model.",
        recordMissingTitle: "CRM record not found",
        recordMissingDescription: "This user is active in the portal observer cockpit, but the classic customer record has not been created yet. The same workspace spine still appears below on the admin side.",
        operationsHub: "Operations Hub",
        operationsHubHint: "Observer workspace is active. Open the detail flows inside the Operations Hub.",
        workbenchBadge: "Customer Workbench",
        blockerBadge: "{{count}} blocker",
        recordBadge: "Created: {{date}}",
        taxIdBadge: "Tax ID: {{value}}",
        planBadge: "Plan: {{value}}",
        openTasks: "Open Tasks",
        openTasksHelper: "Incomplete process steps.",
        orderFlow: "Order Flow",
        orderFlowHelper: "Orders not yet closed for delivery.",
        catalog: "Catalog",
        catalogHelper: "Active product visibility.",
        waitingCustomerBadge: "What we are waiting on",
        waitingCustomerSummary: "Missing fields, form requests you sent, and blocked customer-facing work all live in one hub.",
        nextStep: "Next step",
        nextStepBody: "Close the records waiting on customer input first, then review the form and completion request flow inside one hub.",
        waitingCustomerButton: "Open waiting customer",
        sentToCustomerButton: "Sent items",
        atlasRunningBadge: "What ATLAS is running now",
        atlasRunningSummary: "Internal tasks, operator lane work, and visible outputs are managed inside the same Operations Hub without route changes.",
        operationNote: "Operations note",
        operationNoteBody: "What was sent, how the customer responded, and which tasks remain open are all opened from one deep center instead of separate cards.",
        internalOperationsButton: "Open internal operations",
        deliverablesButton: "Open outputs",
        lifecycle: "Lifecycle",
        taskRhythm: "Task rhythm",
        blockage: "Blockage",
        subscription: "Subscription",
        quickSend: "Quick send",
        missingInfo: "Request missing info",
        missingInfoBody: "Use a completion request to send all missing fields to the portal at once.",
        missingInfoButton: "Send info request",
        sendForm: "Send portal form",
        sendFormBody: "The selected form is added to the customer support center and tracked in the same hub.",
        requestMessagePlaceholder: "A short note or context for the customer",
        sendFormButton: "Send form request",
        historyButton: "Open send history",
        profileSummary: "Profile summary",
        profileSummaryDesc: "Quick signals from the customer card and lifecycle.",
        subscriptionAndCatalog: "Subscription & catalog",
        subscriptionAndCatalogDesc: "Short summary of financial readiness and product visibility.",
        noSubscription: "No subscription record.",
        productCatalog: "Product catalog",
        activeProductVisibility: "Active product visibility.",
        loadingMissingFields: "Reading missing fields...",
        noMissingFields: "No required missing field is visible right now.",
        requestingMissingFields: "Creating request",
        requestMissingFields: "Request info from customer",
        selectForm: "Select form",
        requestMessagePlaceholder2: "Short guidance note for the customer",
        requestingForm: "Sending form request",
        requestSelectedForm: "Send selected form to customer",
        hubSummary: "Workspace summary",
        customerActions: "Customer actions",
        deliverableTitle: "Add new output",
        deliverableTitleField: "Output title",
        deliverableSummaryField: "Customer-visible summary",
        artifactUrl: "Artifact URL (optional)",
        artifactLabel: "Artifact label (optional)",
        saveDeliverable: "Save output",
        saving: "Saving",
        launchWorkstreams: "Launch workstreams",
        openCustomerView: "Open customer view",
        openCustomerDetail: "Open customer detail",
        detailTitle: "Submission Detail",
        detailSubmittedBy: "submitted by",
        detailCustomer: "Customer",
        detailCategory: "Category",
        detailReceived: "Received",
        detailData: "Form Data",
        detailUpdate: "Update Status",
        adminNote: "Admin Note",
        adminNotePlaceholder: "Note shown to the customer...",
        update: "Update",
        updating: "Updating...",
        noUser: "No user",
        noCategory: "General",
        noPlanLabel: "Plan: —",
        blockedLabel: "blocker",
        activeArea: "active area",
        requestCount: "request",
        deliverableCount: "deliverable",
      }
    : {
        loading: "Yükleniyor...",
        backToCustomers: "Müşteri Listesi",
        intakeCenter: "Intake Center",
        processes: "Süreçleri Aç",
        observerFallbackTitle: "Observer Workspace",
        observerFallbackDescription: "CRM kaydı bulunmasa bile portal ve admin aynı workspace modelini okumaya devam eder.",
        recordMissingTitle: "CRM kaydı bulunamadı",
        recordMissingDescription: "Bu kullanıcı portal observer cockpit tarafında aktif, ancak klasik müşteri kaydı henüz oluşmamış. Aşağıda aynı workspace omurgası yine admin tarafında görünür.",
        operationsHub: "Operations Hub",
        operationsHubHint: "Observer workspace aktif. Detay akışları tek Operations Hub içinde açın.",
        workbenchBadge: "Customer Workbench",
        blockerBadge: "{{count}} blocker",
        recordBadge: "Kayıt: {{date}}",
        taxIdBadge: "Tax ID: {{value}}",
        planBadge: "Plan: {{value}}",
        openTasks: "Açık Görev",
        openTasksHelper: "Tamamlanmamış süreç adımları.",
        orderFlow: "Sipariş Akışı",
        orderFlowHelper: "Teslime kapanmamış sipariş.",
        catalog: "Katalog",
        catalogHelper: "Aktif ürün görünürlüğü.",
        waitingCustomerBadge: "Müşteriden beklenenler",
        waitingCustomerSummary: "Müşteriden beklenen eksik alanlar, gönderdiğiniz form talepleri ve blocked customer-facing işler tek hub içinde toplanır.",
        nextStep: "İlk yapılacak iş",
        nextStepBody: "Önce müşteriden eksik bilgi bekleyen kayıtları kapatın, sonra gönderdiğiniz form ve completion request akışını tek hub içinde kontrol edin.",
        waitingCustomerButton: "Bekleyen müşteriyi aç",
        sentToCustomerButton: "Gönderdiklerim",
        atlasRunningBadge: "Atlas şu anda ne yürütüyor",
        atlasRunningSummary: "İç görevler, operator lane işleri ve görünür çıktılar route değişmeden aynı Operations Hub içinde yönetilir.",
        operationNote: "Operasyon notu",
        operationNoteBody: "Admin tarafında ne gönderildiği, müşterinin ne cevapladığı ve içeride hangi işlerin açık kaldığı ayrı kartlar yerine tek derin merkezden açılır.",
        internalOperationsButton: "İç operasyonu aç",
        deliverablesButton: "Çıktıları aç",
        lifecycle: "Lifecycle",
        taskRhythm: "Görev ritmi",
        blockage: "Blokaj",
        subscription: "Abonelik",
        quickSend: "Hızlı gönderim",
        missingInfo: "Eksik bilgi talebi",
        missingInfoBody: "Completion request ile müşteriden beklenen alanları tek seferde portala gönderin.",
        missingInfoButton: "Bilgi talebi gönder",
        sendForm: "Portal formu gönder",
        sendFormBody: "Seçtiğiniz form müşterinin destek merkezine eklenir ve aynı hub içinde takip edilir.",
        requestMessagePlaceholder: "Müşteriye görünecek kısa açıklama veya bağlam notu",
        sendFormButton: "Form isteği gönder",
        historyButton: "Gönderim geçmişini aç",
        profileSummary: "Profil özeti",
        profileSummaryDesc: "Müşteri kartı ve lifecycle hızlı işaretleri.",
        subscriptionAndCatalog: "Abonelik ve katalog",
        subscriptionAndCatalogDesc: "Finansal hazırlık ve ürün görünürlüğü kısa özeti.",
        noSubscription: "Abonelik kaydı yok.",
        productCatalog: "Ürün kataloğu",
        activeProductVisibility: "Aktif ürün görünürlüğü.",
        loadingMissingFields: "Eksik alanlar okunuyor...",
        noMissingFields: "Şu an zorunlu eksik alan görünmüyor.",
        requestingMissingFields: "Talep oluşturuluyor",
        requestMissingFields: "Müşteriden bilgi talep et",
        selectForm: "Form seçin",
        requestMessagePlaceholder2: "Müşteriye gönderilecek kısa yönlendirme notu",
        requestingForm: "Form isteği gönderiliyor",
        requestSelectedForm: "Seçili formu müşteriye gönder",
        hubSummary: "Workspace özeti",
        customerActions: "Müşteri aksiyonları",
        deliverableTitle: "Yeni çıktı ekle",
        deliverableTitleField: "Çıktı başlığı",
        deliverableSummaryField: "Müşteriye görünür özet",
        artifactUrl: "Artifact URL (opsiyonel)",
        artifactLabel: "Artifact etiketi (opsiyonel)",
        saveDeliverable: "Çıktıyı kaydet",
        saving: "Kaydediliyor",
        launchWorkstreams: "Launch workstreams",
        openCustomerView: "Müşteri görünümünü aç",
        openCustomerDetail: "Müşteri detayını aç",
        detailTitle: "Gönderim Detayı",
        detailSubmittedBy: "tarafından gönderildi",
        detailCustomer: "Müşteri",
        detailCategory: "Kategori",
        detailReceived: "Alınma",
        detailData: "Form Verileri",
        detailUpdate: "Durum Güncelle",
        adminNote: "Admin Notu",
        adminNotePlaceholder: "Müşteriye gösterilecek not...",
        update: "Güncelle",
        updating: "Güncelleniyor...",
        noUser: "Kullanıcı yok",
        noCategory: "Genel",
        noPlanLabel: "Plan: —",
        blockedLabel: "blocker",
        activeArea: "aktif alan",
        requestCount: "request",
        deliverableCount: "deliverable",
      };

  const { data: customerData, isLoading: loading } = useCustomerDetail(customerId);
  const customerRecord = customerData as CustomerDetailRecord | null;
  const customer = customerRecord ?? null;
  const subscriptions: Tables<"user_subscriptions">[] =
    customerRecord?.user_subscriptions ?? [];
  const { data: orders = [] } = useCustomerOrders(customerId);
  const { data: tasks = [] } = useProcessTasks(customerId);
  const { data: products = [] } = useProducts(customerId);
  const updateOnboarding = useUpdateOnboardingStatus();
  const latestSubscription = subscriptions[0] ?? null;
  const customerMilestones = tasks.filter((task) => task.visibility !== "admin_internal");
  const adminTasks = tasks.filter((task) => task.visibility === "admin_internal");
  const openTasks = adminTasks.filter((task) => task.task_status !== "completed");
  const blockedTasks = tasks.filter((task) => task.task_status === "blocked");
  const pendingOrders = orders.filter((order) => order.status !== "delivered");
  const [missingFields, setMissingFields] = useState<MissingField[]>([]);
  const [loadingMissingFields, setLoadingMissingFields] = useState(true);
  const [requestingMissingFields, setRequestingMissingFields] = useState(false);
  const requestableForms = useMemo(
    () => [...getActiveForms()].sort((left, right) => left.code.localeCompare(right.code)),
    []
  );
  const [selectedFormCode, setSelectedFormCode] = useState(requestableForms[0]?.code ?? "ATL-701");
  const [requestMessage, setRequestMessage] = useState("");
  const [requestingForm, setRequestingForm] = useState(false);
  const [operationsHubOpen, setOperationsHubOpen] = useState(false);
  const [operationsHubTab, setOperationsHubTab] = useState<
    "waiting_on_customer" | "sent_to_customer" | "internal_operations" | "deliverables"
  >("waiting_on_customer");

  function handleUpdateOnboarding(newStatus: string) {
    updateOnboarding.mutate({ customerId, status: newStatus });
  }

  async function loadMissingFields() {
    if (!customerId) return;

    setLoadingMissingFields(true);
    try {
      const response = await fetch(`/api/admin/customers/${customerId}/completion-request`, {
        cache: "no-store",
      });
      const payload = (await response.json().catch(() => null)) as
        | { missingFields?: MissingField[]; error?: string }
        | null;

      if (!response.ok) {
        throw new Error(payload?.error ?? "Eksik alanlar okunamadi.");
      }

      setMissingFields(payload?.missingFields ?? []);
    } catch (error) {
      toast.error("Eksik alanlar okunamadı", {
        description: error instanceof Error ? error.message : "Beklenmedik hata",
      });
      setMissingFields([]);
    } finally {
      setLoadingMissingFields(false);
    }
  }

  async function handleRequestMissingFields() {
    setRequestingMissingFields(true);
    try {
      const response = await fetch(`/api/admin/customers/${customerId}/completion-request`, {
        method: "POST",
      });
      const payload = (await response.json().catch(() => null)) as
        | { requested?: boolean; missingFields?: MissingField[]; error?: string }
        | null;

      if (!response.ok) {
        throw new Error(payload?.error ?? "Bilgi talebi oluşturulamadı.");
      }

      setMissingFields(payload?.missingFields ?? []);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.processTasks(customerId) }),
        queryClient.invalidateQueries({ queryKey: queryKeys.customer(customerId) }),
        queryClient.invalidateQueries({ queryKey: queryKeys.customerOrders(customerId) }),
        queryClient.invalidateQueries({ queryKey: queryKeys.products(customerId) }),
      ]);

      toast.success("Bilgi talebi müşteriye gönderildi", {
        description: "Yusuf için ATL-705 formu ve müşteri takibi oluşturuldu.",
      });
    } catch (error) {
      toast.error("Talep gönderilemedi", {
        description: error instanceof Error ? error.message : "Beklenmedik hata",
      });
    } finally {
      setRequestingMissingFields(false);
      await loadMissingFields();
    }
  }

  async function handleRequestForm() {
    if (!selectedFormCode) return;

    setRequestingForm(true);
    try {
      const response = await fetch(`/api/admin/customers/${customerId}/form-requests`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          formCode: selectedFormCode,
          message: requestMessage.trim() || undefined,
        }),
      });
      const payload = (await response.json().catch(() => null)) as
        | { error?: string; formCode?: string }
        | null;

      if (!response.ok) {
        throw new Error(payload?.error ?? "Form istegi olusturulamadi.");
      }

      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.processTasks(customerId) }),
        queryClient.invalidateQueries({ queryKey: queryKeys.customer(customerId) }),
        queryClient.invalidateQueries({ queryKey: queryKeys.customerOrders(customerId) }),
        queryClient.invalidateQueries({ queryKey: queryKeys.products(customerId) }),
      ]);

      const selectedForm = requestableForms.find((form) => form.code === selectedFormCode);
      toast.success("Form musterinin portalina gonderildi", {
        description: `${selectedForm?.title ?? selectedFormCode} artik destek merkezinde gorunur.`,
      });
      setRequestMessage("");
      await loadMissingFields();
    } catch (error) {
      toast.error("Form istegi gonderilemedi", {
        description: error instanceof Error ? error.message : "Beklenmedik hata",
      });
    } finally {
      setRequestingForm(false);
    }
  }

  function openOperationsHub(
    tab: "waiting_on_customer" | "sent_to_customer" | "internal_operations" | "deliverables",
  ) {
    withViewTransition(() => {
      setOperationsHubTab(tab);
      setOperationsHubOpen(true);
    });
  }

  useEffect(() => {
    void loadMissingFields();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [customerId]);

  if (loading) {
    return (
      <div className="py-20 text-center text-muted-foreground">
        {copy.loading}
      </div>
    );
  }

  if (!customer) {
    return (
      <div className="space-y-5">
      <PageHeader
        title={copy.observerFallbackTitle}
        description={copy.observerFallbackDescription}
      >
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" size="sm" asChild>
            <Link href="/admin/customers">
              <ArrowLeft className="mr-2 h-4 w-4" />
                {copy.backToCustomers}
            </Link>
          </Button>
          <Button size="sm" asChild>
              <Link href="/admin/forms">{copy.intakeCenter}</Link>
          </Button>
        </div>
      </PageHeader>

        <div className="atlas-workbench-panel rounded-[1.35rem] border-amber-500/20 bg-amber-500/5 p-5">
          <p className="text-sm font-medium text-amber-200">{copy.recordMissingTitle}</p>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            {copy.recordMissingDescription}
          </p>
        </div>

        <div className="atlas-workbench-panel rounded-[1.35rem] p-5">
          <p className="text-sm text-muted-foreground">
            {copy.operationsHubHint}
          </p>
          <Button className="mt-4 rounded-2xl" onClick={() => openOperationsHub("waiting_on_customer")}>
            {copy.operationsHub}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <PageHeader
        title={`${customer.first_name} ${customer.last_name}`}
        description={
          locale === "en"
            ? `Track lifecycle, operations, and revenue surfaces for ${customer.company_name} in one workbench.`
            : `${customer.company_name} için lifecycle, operasyon ve gelir yüzeylerini tek workbench'te izleyin.`
        }
      >
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" size="sm" asChild>
            <Link href="/admin/customers">
              <ArrowLeft className="mr-2 h-4 w-4" />
              {copy.backToCustomers}
            </Link>
          </Button>
          <Button variant="outline" size="sm" asChild>
            <Link href="/admin/forms">{copy.intakeCenter}</Link>
          </Button>
          <Button size="sm" asChild>
            <Link href="/admin/workflows">{copy.processes}</Link>
          </Button>
        </div>
      </PageHeader>

      <div className="atlas-workbench-panel-strong rounded-[1.7rem] p-5">
        <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <Badge className="border-0 bg-primary/15 text-primary">{copy.workbenchBadge}</Badge>
              <Badge variant={getStatusVariant(customer.onboarding_status)}>
                {ONBOARDING_STATUS_LABELS[customer.onboarding_status as OnboardingStatus] ?? customer.onboarding_status}
              </Badge>
              {blockedTasks.length > 0 && (
                <Badge className="border-0 bg-amber-500/15 text-amber-300">
                  {copy.blockerBadge.replace("{{count}}", String(blockedTasks.length))}
                </Badge>
              )}
            </div>
            <div>
              <h2 className="text-[1.45rem] font-semibold tracking-tight">
                {customer.company_name}
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                {customer.email}
                {customer.phone ? ` · ${customer.phone}` : ""}
              </p>
            </div>
            <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
              <span className="rounded-full border border-white/8 bg-background/45 px-3 py-1.5">
                {copy.recordBadge.replace("{{date}}", formatDate(customer.created_at))}
              </span>
              {customer.tax_id && (
                <span className="rounded-full border border-white/8 bg-background/45 px-3 py-1.5">
                  {copy.taxIdBadge.replace("{{value}}", customer.tax_id)}
                </span>
              )}
              {latestSubscription && (
                <span className="rounded-full border border-white/8 bg-background/45 px-3 py-1.5">
                  {copy.planBadge.replace(
                    "{{value}}",
                    PLAN_TIER_LABELS[latestSubscription.plan_tier as PlanTier] ?? latestSubscription.plan_tier,
                  )}
                </span>
              )}
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-3 xl:min-w-[420px]">
            <div className="rounded-2xl border border-white/8 bg-background/45 p-3">
              <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">{copy.openTasks}</p>
              <p className="mt-2 text-2xl font-semibold tracking-tight">{openTasks.length}</p>
              <p className="mt-1 text-xs text-muted-foreground">{copy.openTasksHelper}</p>
            </div>
            <div className="rounded-2xl border border-white/8 bg-background/45 p-3">
              <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">{copy.orderFlow}</p>
              <p className="mt-2 text-2xl font-semibold tracking-tight">{pendingOrders.length}</p>
              <p className="mt-1 text-xs text-muted-foreground">{copy.orderFlowHelper}</p>
            </div>
            <div className="rounded-2xl border border-white/8 bg-background/45 p-3">
              <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">{copy.catalog}</p>
              <p className="mt-2 text-2xl font-semibold tracking-tight">{products.length}</p>
              <p className="mt-1 text-xs text-muted-foreground">{copy.catalogHelper}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.08fr_0.92fr]">
        <Card className="atlas-workbench-panel-strong rounded-[1.65rem] border-amber-300/12 bg-[linear-gradient(135deg,rgba(28,23,14,0.96),rgba(10,15,27,0.96))]">
          <CardHeader className="pb-3">
            <div className="flex flex-wrap items-center gap-2">
              <Badge className="border-0 bg-amber-500/14 text-amber-300">{copy.waitingCustomerBadge}</Badge>
              <Badge variant="outline" className="border-white/10 bg-white/[0.03] text-slate-200">
                {missingFields.length + customerMilestones.filter((task) => task.task_status === "blocked").length} açık başlık
              </Badge>
            </div>
            <CardTitle className="text-[1.65rem] tracking-tight">
              {missingFields[0]?.label ?? (locale === "en" ? "Close the customer responses that are still blocking progress" : "Kritik müşteri cevabı bekleyen başlıkları kapatın")}
            </CardTitle>
            <CardDescription className="max-w-3xl text-sm leading-7">
              {missingFields[0]?.description ?? copy.waitingCustomerSummary}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-[1.2rem] border border-amber-300/15 bg-amber-500/6 px-4 py-3">
                <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">{copy.waitingCustomerBadge}</p>
                <p className="mt-2 text-[1.8rem] font-semibold tracking-tight text-white">{missingFields.length}</p>
              </div>
              <div className="rounded-[1.2rem] border border-white/8 bg-white/[0.03] px-4 py-3">
                <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">{copy.blockedLabel}</p>
                <p className="mt-2 text-[1.8rem] font-semibold tracking-tight text-white">
                  {customerMilestones.filter((task) => task.task_status === "blocked").length}
                </p>
              </div>
              <div className="rounded-[1.2rem] border border-primary/20 bg-primary/6 px-4 py-3">
                <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">{copy.requestCount}</p>
                <p className="mt-2 text-[1.8rem] font-semibold tracking-tight text-white">{customerMilestones.length}</p>
              </div>
            </div>

            <div className="rounded-[1.25rem] border border-white/8 bg-white/[0.03] p-4">
              <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">{copy.nextStep}</p>
              <p className="mt-3 text-sm leading-7 text-slate-300/88">
                {copy.nextStepBody}
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <Button className="rounded-2xl" onClick={() => openOperationsHub("waiting_on_customer")}>
                {copy.waitingCustomerButton}
              </Button>
              <Button variant="outline" className="rounded-2xl" onClick={() => openOperationsHub("sent_to_customer")}>
                {copy.sentToCustomerButton}
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="atlas-workbench-panel-strong rounded-[1.65rem] border-primary/16 bg-[linear-gradient(135deg,rgba(9,18,34,0.98),rgba(8,24,30,0.95))]">
          <CardHeader className="pb-3">
            <div className="flex flex-wrap items-center gap-2">
              <Badge className="border-0 bg-primary/14 text-primary">{copy.atlasRunningBadge}</Badge>
              <Badge variant="outline" className="border-white/10 bg-white/[0.03] text-slate-200">
                {ONBOARDING_STATUS_LABELS[customer.onboarding_status as OnboardingStatus] ?? customer.onboarding_status}
              </Badge>
            </div>
            <CardTitle className="text-[1.65rem] tracking-tight">
              {locale === "en" ? "Internal operations, deliverables, and ownership in one workspace" : "İç operasyon, deliverable ve sahiplik aynı çalışma alanında"}
            </CardTitle>
            <CardDescription className="max-w-3xl text-sm leading-7">
              {copy.atlasRunningSummary}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-[1.2rem] border border-primary/20 bg-primary/6 px-4 py-3">
                <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">{copy.internalOperationsButton}</p>
                <p className="mt-2 text-[1.8rem] font-semibold tracking-tight text-white">{adminTasks.length}</p>
              </div>
              <div className="rounded-[1.2rem] border border-white/8 bg-white/[0.03] px-4 py-3">
                <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">{copy.openTasks}</p>
                <p className="mt-2 text-[1.8rem] font-semibold tracking-tight text-white">{openTasks.length}</p>
              </div>
              <div className="rounded-[1.2rem] border border-emerald-400/15 bg-emerald-500/6 px-4 py-3">
                <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">{copy.deliverablesButton}</p>
                <p className="mt-2 text-[1.8rem] font-semibold tracking-tight text-white">{products.length}</p>
              </div>
            </div>

            <div className="rounded-[1.25rem] border border-white/8 bg-white/[0.03] p-4">
              <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">{copy.operationNote}</p>
              <p className="mt-3 text-sm leading-7 text-slate-300/88">
                {copy.operationNoteBody}
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <Button className="rounded-2xl" onClick={() => openOperationsHub("internal_operations")}>
                {copy.internalOperationsButton}
              </Button>
              <Button variant="outline" className="rounded-2xl" onClick={() => openOperationsHub("deliverables")}>
                {copy.deliverablesButton}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-3 xl:grid-cols-4">
        <div className="atlas-workbench-panel rounded-[1.3rem] p-4">
          <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">{copy.lifecycle}</p>
          <p className="mt-2 text-[1.5rem] font-semibold tracking-tight">
            {ONBOARDING_STATUS_LABELS[customer.onboarding_status as OnboardingStatus] ?? customer.onboarding_status}
          </p>
        </div>
        <div className="atlas-workbench-panel rounded-[1.3rem] border-primary/18 bg-primary/5 p-4">
          <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">{copy.taskRhythm}</p>
          <p className="mt-2 text-[1.5rem] font-semibold tracking-tight text-primary">{tasks.length}</p>
        </div>
        <div className="atlas-workbench-panel rounded-[1.3rem] border-amber-500/18 bg-amber-500/5 p-4">
          <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">{copy.blockage}</p>
          <p className="mt-2 text-[1.5rem] font-semibold tracking-tight text-amber-300">{blockedTasks.length}</p>
        </div>
        <div className="atlas-workbench-panel rounded-[1.3rem] border-emerald-500/18 bg-emerald-500/5 p-4">
          <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">{copy.subscription}</p>
          <p className="mt-2 text-[1.5rem] font-semibold tracking-tight text-emerald-300">
            {latestSubscription ? formatCurrency(latestSubscription.amount) : "—"}
          </p>
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.08fr_0.92fr]">
        <Card className="atlas-workbench-panel rounded-[1.55rem]">
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <Send className="h-4 w-4 text-primary" />
              <CardTitle className="text-base">{copy.quickSend}</CardTitle>
            </div>
            <CardDescription>
              {locale === "en"
                ? "Manage form requests and missing info from the same area; open the Operations Hub for deeper follow-up."
                : "Form isteme ve eksik bilgi talebini aynı alanda yönetin; derin takip için Operations Hub'ı açın."}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-[1.2rem] border border-white/8 bg-white/[0.03] p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-medium text-white">{copy.missingInfo}</p>
                  <p className="mt-1 text-sm leading-6 text-muted-foreground">
                    {copy.missingInfoBody}
                  </p>
                </div>
                <Button
                  className="rounded-2xl"
                  onClick={handleRequestMissingFields}
                  disabled={requestingMissingFields || loadingMissingFields}
                >
                  {requestingMissingFields ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                  {copy.missingInfoButton}
                </Button>
              </div>
            </div>

            <div className="space-y-3 rounded-[1.2rem] border border-white/8 bg-white/[0.03] p-4">
              <div>
                <p className="text-sm font-medium text-white">{copy.sendForm}</p>
                <p className="mt-1 text-sm leading-6 text-muted-foreground">
                  {copy.sendFormBody}
                </p>
              </div>

              <Select value={selectedFormCode} onValueChange={setSelectedFormCode}>
                <SelectTrigger className="rounded-2xl">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {requestableForms.map((form) => (
                    <SelectItem key={form.code} value={form.code}>
                      {form.code} · {form.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Textarea
                value={requestMessage}
                onChange={(event) => setRequestMessage(event.target.value)}
                placeholder={copy.requestMessagePlaceholder}
                className="min-h-[108px] rounded-2xl"
              />

              <div className="flex flex-wrap gap-2">
                <Button className="rounded-2xl" onClick={handleRequestForm} disabled={requestingForm}>
                  {requestingForm ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                  {copy.sendFormButton}
                </Button>
                <Button variant="outline" className="rounded-2xl" onClick={() => openOperationsHub("sent_to_customer")}>
                  {copy.historyButton}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card className="atlas-workbench-panel rounded-[1.55rem]">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">{copy.profileSummary}</CardTitle>
              <CardDescription>{copy.profileSummaryDesc}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <span>{customer.email}</span>
                </div>
                {customer.phone ? (
                  <div className="flex items-center gap-2">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    <span>{customer.phone}</span>
                  </div>
                ) : null}
                <div className="flex items-center gap-2">
                  <Building2 className="h-4 w-4 text-muted-foreground" />
                  <span>{customer.company_name}</span>
                </div>
                {customer.tax_id ? (
                  <div className="flex items-center gap-2">
                    <Hash className="h-4 w-4 text-muted-foreground" />
                    <span>{customer.tax_id}</span>
                  </div>
                ) : null}
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span>{formatDate(customer.created_at)}</span>
                </div>
              </div>

              <div className="space-y-2">
                <p className="text-xs font-medium text-muted-foreground">{copy.profileSummary}</p>
                <Badge variant={getStatusVariant(customer.onboarding_status)}>
                  {ONBOARDING_STATUS_LABELS[customer.onboarding_status as OnboardingStatus] ?? customer.onboarding_status}
                </Badge>
                <Select value={customer.onboarding_status} onValueChange={handleUpdateOnboarding}>
                  <SelectTrigger className="rounded-2xl">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {(Object.entries(ONBOARDING_STATUS_LABELS) as [OnboardingStatus, string][]).map(([val, label]) => (
                      <SelectItem key={val} value={val}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          <Card className="atlas-workbench-panel rounded-[1.55rem]">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">{copy.subscriptionAndCatalog}</CardTitle>
              <CardDescription>{copy.subscriptionAndCatalogDesc}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {subscriptions.length > 0 ? (
                subscriptions.slice(0, 1).map((sub) => (
                  <div key={sub.id} className="rounded-2xl border border-white/8 bg-background/45 p-3">
                    <div className="flex items-center justify-between gap-2">
                      <Badge variant="outline">
                        {PLAN_TIER_LABELS[sub.plan_tier as PlanTier] ?? sub.plan_tier}
                      </Badge>
                      <Badge variant={getStatusVariant(sub.payment_status)}>
                        {PAYMENT_STATUS_LABELS[sub.payment_status as PaymentStatus] ?? sub.payment_status}
                      </Badge>
                    </div>
                    <p className="mt-2 text-lg font-semibold">
                      {formatCurrency(sub.amount)} {getPlanTierDefinition(sub.plan_tier).cadence === "monthly" ? "/ ay" : "tek sefer"}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">Geçerlilik: {formatDate(sub.valid_until)}</p>
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted-foreground">{copy.noSubscription}</p>
              )}

              <div className="rounded-2xl border border-white/8 bg-background/45 p-3">
                <p className="text-xs font-medium text-muted-foreground">{copy.productCatalog}</p>
                <p className="mt-2 text-lg font-semibold">{products.length}</p>
                <p className="mt-1 text-xs text-muted-foreground">{copy.activeProductVisibility}</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <CustomerWorkspacePanel customerId={customerId} />

      <AdminOperationsHubModal
        open={operationsHubOpen}
        onOpenChange={setOperationsHubOpen}
        customerId={customerId}
        customerName={customer.company_name}
        adminTasks={adminTasks}
        missingFields={missingFields}
        loadingMissingFields={loadingMissingFields}
        requestingMissingFields={requestingMissingFields}
        onRequestMissingFields={handleRequestMissingFields}
        requestableForms={requestableForms.map((form) => ({ code: form.code, title: form.title }))}
        selectedFormCode={selectedFormCode}
        onSelectedFormCodeChange={setSelectedFormCode}
        requestMessage={requestMessage}
        onRequestMessageChange={setRequestMessage}
        requestingForm={requestingForm}
        onRequestForm={handleRequestForm}
        initialTab={operationsHubTab}
      />
    </div>
  );
}
