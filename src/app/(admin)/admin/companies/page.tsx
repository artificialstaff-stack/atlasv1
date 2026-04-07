"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useI18n } from "@/i18n/provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { PageHeader } from "@/components/shared/page-header";
import {
  AtlasEmptySurface,
  AtlasInsightCard,
  AtlasSectionPanel,
  AtlasStackGrid,
  AtlasTableShell,
} from "@/components/portal/atlas-widget-kit";
import {
  Building2,
  Plus,
  Search,
  RefreshCw,
  ExternalLink,
} from "lucide-react";
import { toast } from "sonner";

interface UserInfo {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  company_name: string;
}

interface Company {
  id: string;
  user_id: string;
  company_name: string;
  company_type: string;
  state_of_formation: string;
  ein_number: string | null;
  formation_date: string | null;
  status: string;
  registered_agent_name: string | null;
  bank_name: string | null;
  bank_account_status: string | null;
  business_city: string | null;
  business_state: string | null;
  company_email: string | null;
  website: string | null;
  notes: string | null;
  admin_notes: string | null;
  created_at: string;
  user?: UserInfo;
}

const STATUS_COLORS: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  pending: "outline",
  formation_in_progress: "secondary",
  active: "default",
  suspended: "destructive",
  dissolved: "destructive",
};

/* i18n-exempt: official US state names */
const US_STATES = [
  "Alabama", "Alaska", "Arizona", "Arkansas", "California", "Colorado", "Connecticut",
  "Delaware", "Florida", "Georgia", "Hawaii", "Idaho", "Illinois", "Indiana", "Iowa",
  "Kansas", "Kentucky", "Louisiana", "Maine", "Maryland", "Massachusetts", "Michigan",
  "Minnesota", "Mississippi", "Missouri", "Montana", "Nebraska", "Nevada", "New Hampshire",
  "New Jersey", "New Mexico", "New York", "North Carolina", "North Dakota", "Ohio",
  "Oklahoma", "Oregon", "Pennsylvania", "Rhode Island", "South Carolina", "South Dakota",
  "Tennessee", "Texas", "Utah", "Vermont", "Virginia", "Washington", "West Virginia",
  "Wisconsin", "Wyoming",
];

export default function AdminCompaniesPage() {
  const supabase = createClient();
  const { t } = useI18n();
  const [companies, setCompanies] = useState<Company[]>([]);
  const [users, setUsers] = useState<UserInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [showDialog, setShowDialog] = useState(false);
  const [editingCompany, setEditingCompany] = useState<Company | null>(null);

  const [form, setForm] = useState({
    user_id: "",
    company_name: "",
    company_type: "llc",
    state_of_formation: "Wyoming",
    ein_number: "",
    formation_date: "",
    status: "pending",
    registered_agent_name: "",
    bank_name: "",
    bank_account_status: "not_opened",
    business_city: "",
    business_state: "",
    company_email: "",
    website: "",
    notes: "",
    admin_notes: "",
  });

  const companyStatusOptions = useMemo(
    () => [
      { value: "pending", label: t("admin.companies.statuses.pending") },
      { value: "formation_in_progress", label: t("admin.companies.statuses.formationInProgress") },
      { value: "active", label: t("admin.companies.statuses.active") },
      { value: "suspended", label: t("admin.companies.statuses.suspended") },
      { value: "dissolved", label: t("admin.companies.statuses.dissolved") },
    ],
    [t],
  );

  const companyTypeOptions = useMemo(
    () => [
      { value: "llc", label: "LLC" },
      { value: "corporation", label: t("admin.companies.companyTypes.corporation") },
      { value: "sole_proprietorship", label: t("admin.companies.companyTypes.soleProprietorship") },
      { value: "partnership", label: t("admin.companies.companyTypes.partnership") },
      { value: "other", label: t("admin.companies.companyTypes.other") },
    ],
    [t],
  );

  const bankStatusOptions = useMemo(
    () => [
      { value: "not_opened", label: t("admin.companies.bankStatuses.notOpened") },
      { value: "pending", label: t("admin.companies.bankStatuses.pending") },
      { value: "active", label: t("admin.companies.bankStatuses.active") },
      { value: "closed", label: t("admin.companies.bankStatuses.closed") },
    ],
    [t],
  );

  const getCompanyStatusLabel = useCallback(
    (status: string) =>
      companyStatusOptions.find((option) => option.value === status)?.label ?? status,
    [companyStatusOptions],
  );

  const getCompanyTypeLabel = useCallback(
    (companyType: string) =>
      companyTypeOptions.find((option) => option.value === companyType)?.label ?? companyType,
    [companyTypeOptions],
  );

  const getBankStatusLabel = useCallback(
    (status: string | null) =>
      bankStatusOptions.find((option) => option.value === status)?.label ?? t("common.notAvailable"),
    [bankStatusOptions, t],
  );

  const fetchData = useCallback(async () => {
    setLoading(true);
    const [companyRes, userRes] = await Promise.all([
      supabase.from("customer_companies").select("*").order("created_at", { ascending: false }),
      supabase.from("users").select("id, first_name, last_name, email, company_name"),
    ]);

    if (companyRes.data && userRes.data) {
      const userMap = Object.fromEntries(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (userRes.data as any[]).map((user) => [user.id, user]),
      );
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const enriched = (companyRes.data as any[]).map((company) => ({
        ...company,
        user: userMap[company.user_id],
      }));
      setCompanies(enriched);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      setUsers(userRes.data as any[]);
    }
    setLoading(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const resetForm = useCallback(() => {
    setForm({
      user_id: "",
      company_name: "",
      company_type: "llc",
      state_of_formation: "Wyoming",
      ein_number: "",
      formation_date: "",
      status: "pending",
      registered_agent_name: "",
      bank_name: "",
      bank_account_status: "not_opened",
      business_city: "",
      business_state: "",
      company_email: "",
      website: "",
      notes: "",
      admin_notes: "",
    });
    setEditingCompany(null);
  }, []);

  const openCreate = () => {
    resetForm();
    setShowDialog(true);
  };

  const openEdit = (company: Company) => {
    setEditingCompany(company);
    setForm({
      user_id: company.user_id,
      company_name: company.company_name,
      company_type: company.company_type,
      state_of_formation: company.state_of_formation,
      ein_number: company.ein_number || "",
      formation_date: company.formation_date || "",
      status: company.status,
      registered_agent_name: company.registered_agent_name || "",
      bank_name: company.bank_name || "",
      bank_account_status: company.bank_account_status || "not_opened",
      business_city: company.business_city || "",
      business_state: company.business_state || "",
      company_email: company.company_email || "",
      website: company.website || "",
      notes: company.notes || "",
      admin_notes: company.admin_notes || "",
    });
    setShowDialog(true);
  };

  const handleSave = async () => {
    if (!form.user_id || !form.company_name) {
      toast.error(t("admin.companies.validation.customerAndNameRequired"));
      return;
    }

    const payload = {
      user_id: form.user_id,
      company_name: form.company_name,
      company_type: form.company_type,
      state_of_formation: form.state_of_formation,
      ein_number: form.ein_number || null,
      formation_date: form.formation_date || null,
      status: form.status,
      registered_agent_name: form.registered_agent_name || null,
      bank_name: form.bank_name || null,
      bank_account_status: form.bank_account_status,
      business_city: form.business_city || null,
      business_state: form.business_state || null,
      company_email: form.company_email || null,
      website: form.website || null,
      notes: form.notes || null,
      admin_notes: form.admin_notes || null,
    };

    if (editingCompany) {
      const { error } = await supabase
        .from("customer_companies")
        .update(payload)
        .eq("id", editingCompany.id);
      if (error) {
        toast.error(`${t("admin.companies.toasts.updateError")} ${error.message}`);
        return;
      }
      toast.success(t("admin.companies.toasts.updated"));
    } else {
      const { error } = await supabase.from("customer_companies").insert(payload);
      if (error) {
        toast.error(`${t("admin.companies.toasts.createError")} ${error.message}`);
        return;
      }
      toast.success(t("admin.companies.toasts.created"));
    }

    setShowDialog(false);
    resetForm();
    fetchData();
  };

  const filtered = companies.filter((company) => {
    const normalized = search.toLowerCase();
    const matchesSearch =
      company.company_name.toLowerCase().includes(normalized) ||
      company.user?.first_name?.toLowerCase().includes(normalized) ||
      company.user?.email?.toLowerCase().includes(normalized) ||
      company.ein_number?.toLowerCase().includes(normalized);
    const matchesStatus = statusFilter === "all" || company.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const activeCompanies = companies.filter((company) => company.status === "active").length;
  const bankReadyCompanies = companies.filter((company) => company.bank_account_status === "active").length;

  return (
    <div className="space-y-6 p-6">
      <PageHeader
        title={t("admin.companies.title")}
        description={t("admin.companies.description")}
      >
        <Button variant="outline" size="icon" onClick={fetchData} aria-label={t("admin.companies.actions.refresh")}>
          <RefreshCw className="h-4 w-4" />
        </Button>
        <Button onClick={openCreate}>
          <Plus className="mr-2 h-4 w-4" />
          {t("admin.companies.actions.create")}
        </Button>
      </PageHeader>

      <AtlasStackGrid columns="four">
        <AtlasInsightCard
          eyebrow="Formation Queue"
          title={`${companies.length}`}
          description="Takip edilen toplam sirket olusturma kaydi."
          badge="Toplam kayit"
          tone="cobalt"
        />
        <AtlasInsightCard
          eyebrow="Active Entities"
          title={`${activeCompanies}`}
          description="Formation ve temel setup asamasini tamamlayan sirketler."
          badge="Aktif"
          tone="success"
        />
        <AtlasInsightCard
          eyebrow="Bank Ready"
          title={`${bankReadyCompanies}`}
          description="Banka hesabi aktif veya operasyona hazir durumdaki kayitlar."
          badge="Banka hazir"
          tone="primary"
        />
        <AtlasInsightCard
          eyebrow="Visible Rows"
          title={`${filtered.length}`}
          description="Arama ve durum filtresinden gecen kayit sayisi."
          badge="Filtreli gorunum"
          tone="warning"
        />
      </AtlasStackGrid>

      <AtlasSectionPanel
        eyebrow="Company Controls"
        title="Arama ve filtreler"
        description="Musteri, EIN veya durum bazinda sirket olusturma kayitlarini operator hiziyla daraltin."
      >
        <div className="flex gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder={t("admin.companies.searchPlaceholder")}
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder={t("admin.companies.filters.status")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("admin.companies.filters.all")}</SelectItem>
              {companyStatusOptions.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </AtlasSectionPanel>

      <AtlasTableShell
        eyebrow="Entity Ledger"
        title={t("admin.companies.table.title", { count: filtered.length.toString() })}
        description="LLC, corporation ve diger kurumsal kayitlar tek operator tablosunda yonetilir."
        badge={`${filtered.length} satir`}
      >
          {loading ? (
            <div className="py-8 text-center text-muted-foreground">{t("common.loading")}</div>
          ) : filtered.length === 0 ? (
            <AtlasEmptySurface
              title={t("admin.companies.table.empty")}
              description="Bu filtre seti icin gosterilecek sirket bulunmuyor."
              tone="neutral"
            />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("admin.companies.table.companyName")}</TableHead>
                  <TableHead>{t("admin.companies.table.customer")}</TableHead>
                  <TableHead>{t("admin.companies.table.type")}</TableHead>
                  <TableHead>{t("admin.companies.table.state")}</TableHead>
                  <TableHead>{t("admin.companies.table.ein")}</TableHead>
                  <TableHead>{t("admin.companies.table.bank")}</TableHead>
                  <TableHead>{t("admin.companies.table.status")}</TableHead>
                  <TableHead className="text-right">{t("admin.companies.table.actions")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((company) => (
                  <TableRow key={company.id}>
                    <TableCell className="font-medium">
                      {company.company_name}
                      {company.website && (
                        <a href={company.website} target="_blank" rel="noreferrer" className="ml-1">
                          <ExternalLink className="inline h-3 w-3 text-muted-foreground" />
                        </a>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">{company.user?.first_name} {company.user?.last_name}</div>
                      <div className="text-xs text-muted-foreground">{company.user?.email}</div>
                    </TableCell>
                    <TableCell>{getCompanyTypeLabel(company.company_type)}</TableCell>
                    <TableCell>{company.state_of_formation}</TableCell>
                    <TableCell className="font-mono text-xs">{company.ein_number || t("common.notAvailable")}</TableCell>
                    <TableCell>
                      <Badge variant={company.bank_account_status === "active" ? "default" : "outline"}>
                        {getBankStatusLabel(company.bank_account_status)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={STATUS_COLORS[company.status] || "outline"}>
                        {getCompanyStatusLabel(company.status)}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="sm" onClick={() => openEdit(company)}>
                        {t("common.edit")}
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
      </AtlasTableShell>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingCompany ? t("admin.companies.modal.editTitle") : t("admin.companies.modal.createTitle")}
            </DialogTitle>
            <DialogDescription>{t("admin.companies.modal.description")}</DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <Label>{t("admin.companies.fields.customer")}</Label>
              <Select value={form.user_id} onValueChange={(value) => setForm({ ...form, user_id: value })}>
                <SelectTrigger>
                  <SelectValue placeholder={t("admin.companies.fields.customerPlaceholder")} />
                </SelectTrigger>
                <SelectContent>
                  {users.map((user) => (
                    <SelectItem key={user.id} value={user.id}>
                      {user.first_name} {user.last_name} — {user.email}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="col-span-2">
              <Label>{t("admin.companies.fields.companyName")}</Label>
              <Input
                value={form.company_name}
                onChange={(event) => setForm({ ...form, company_name: event.target.value })}
                placeholder={t("admin.companies.fields.companyNamePlaceholder")}
              />
            </div>

            <div>
              <Label>{t("admin.companies.fields.companyType")}</Label>
              <Select value={form.company_type} onValueChange={(value) => setForm({ ...form, company_type: value })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {companyTypeOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>{t("admin.companies.fields.stateOfFormation")}</Label>
              <Select value={form.state_of_formation} onValueChange={(value) => setForm({ ...form, state_of_formation: value })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {US_STATES.map((state) => (
                    <SelectItem key={state} value={state}>
                      {state}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>{t("admin.companies.fields.einNumber")}</Label>
              <Input
                value={form.ein_number}
                onChange={(event) => setForm({ ...form, ein_number: event.target.value })}
                placeholder={t("admin.companies.fields.einPlaceholder")}
              />
            </div>

            <div>
              <Label>{t("admin.companies.fields.formationDate")}</Label>
              <Input
                type="date"
                value={form.formation_date}
                onChange={(event) => setForm({ ...form, formation_date: event.target.value })}
              />
            </div>

            <div>
              <Label>{t("admin.companies.fields.status")}</Label>
              <Select value={form.status} onValueChange={(value) => setForm({ ...form, status: value })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {companyStatusOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>{t("admin.companies.fields.bankAccountStatus")}</Label>
              <Select
                value={form.bank_account_status}
                onValueChange={(value) => setForm({ ...form, bank_account_status: value })}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {bankStatusOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>{t("admin.companies.fields.registeredAgent")}</Label>
              <Input
                value={form.registered_agent_name}
                onChange={(event) => setForm({ ...form, registered_agent_name: event.target.value })}
              />
            </div>

            <div>
              <Label>{t("admin.companies.fields.bankName")}</Label>
              <Input
                value={form.bank_name}
                onChange={(event) => setForm({ ...form, bank_name: event.target.value })}
                placeholder={t("admin.companies.fields.bankNamePlaceholder")}
              />
            </div>

            <div>
              <Label>{t("admin.companies.fields.companyEmail")}</Label>
              <Input
                value={form.company_email}
                onChange={(event) => setForm({ ...form, company_email: event.target.value })}
              />
            </div>

            <div>
              <Label>{t("admin.companies.fields.website")}</Label>
              <Input
                value={form.website}
                onChange={(event) => setForm({ ...form, website: event.target.value })}
                placeholder="https://"
              />
            </div>

            <div className="col-span-2">
              <Label>{t("admin.companies.fields.notes")}</Label>
              <Textarea value={form.notes} onChange={(event) => setForm({ ...form, notes: event.target.value })} rows={2} />
            </div>

            <div className="col-span-2">
              <Label>{t("admin.companies.fields.adminNotes")}</Label>
              <Textarea
                value={form.admin_notes}
                onChange={(event) => setForm({ ...form, admin_notes: event.target.value })}
                rows={2}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>
              {t("common.cancel")}
            </Button>
            <Button onClick={handleSave}>
              {editingCompany ? t("admin.companies.actions.update") : t("admin.companies.actions.add")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
