"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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

const STATUS_LABELS: Record<string, string> = {
  pending: "Beklemede",
  formation_in_progress: "Kuruluyor",
  active: "Aktif",
  suspended: "Askıda",
  dissolved: "Kapatıldı",
};

const STATUS_COLORS: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  pending: "outline",
  formation_in_progress: "secondary",
  active: "default",
  suspended: "destructive",
  dissolved: "destructive",
};

const COMPANY_TYPES: Record<string, string> = {
  llc: "LLC",
  corporation: "Corporation",
  sole_proprietorship: "Sole Proprietorship",
  partnership: "Partnership",
  other: "Diğer",
};

const US_STATES = [
  "Alabama","Alaska","Arizona","Arkansas","California","Colorado","Connecticut",
  "Delaware","Florida","Georgia","Hawaii","Idaho","Illinois","Indiana","Iowa",
  "Kansas","Kentucky","Louisiana","Maine","Maryland","Massachusetts","Michigan",
  "Minnesota","Mississippi","Missouri","Montana","Nebraska","Nevada","New Hampshire",
  "New Jersey","New Mexico","New York","North Carolina","North Dakota","Ohio",
  "Oklahoma","Oregon","Pennsylvania","Rhode Island","South Carolina","South Dakota",
  "Tennessee","Texas","Utah","Vermont","Virginia","Washington","West Virginia",
  "Wisconsin","Wyoming",
];

export default function AdminCompaniesPage() {
  const supabase = createClient();
  const [companies, setCompanies] = useState<Company[]>([]);
  const [users, setUsers] = useState<UserInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [showDialog, setShowDialog] = useState(false);
  const [editingCompany, setEditingCompany] = useState<Company | null>(null);

  // Form state
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

  const fetchData = useCallback(async () => {
    setLoading(true);
    const [companyRes, userRes] = await Promise.all([
      supabase.from("customer_companies").select("*").order("created_at", { ascending: false }),
      supabase.from("users").select("id, first_name, last_name, email, company_name"),
    ]);

    if (companyRes.data && userRes.data) {
      const userMap = Object.fromEntries(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (userRes.data as any[]).map((u) => [u.id, u])
      );
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const enriched = (companyRes.data as any[]).map((c) => ({
        ...c,
        user: userMap[c.user_id],
      }));
      setCompanies(enriched);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      setUsers(userRes.data as any[]);
    }
    setLoading(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const resetForm = () => {
    setForm({
      user_id: "", company_name: "", company_type: "llc",
      state_of_formation: "Wyoming", ein_number: "", formation_date: "",
      status: "pending", registered_agent_name: "", bank_name: "",
      bank_account_status: "not_opened", business_city: "", business_state: "",
      company_email: "", website: "", notes: "", admin_notes: "",
    });
    setEditingCompany(null);
  };

  const openCreate = () => { resetForm(); setShowDialog(true); };

  const openEdit = (c: Company) => {
    setEditingCompany(c);
    setForm({
      user_id: c.user_id,
      company_name: c.company_name,
      company_type: c.company_type,
      state_of_formation: c.state_of_formation,
      ein_number: c.ein_number || "",
      formation_date: c.formation_date || "",
      status: c.status,
      registered_agent_name: c.registered_agent_name || "",
      bank_name: c.bank_name || "",
      bank_account_status: c.bank_account_status || "not_opened",
      business_city: c.business_city || "",
      business_state: c.business_state || "",
      company_email: c.company_email || "",
      website: c.website || "",
      notes: c.notes || "",
      admin_notes: c.admin_notes || "",
    });
    setShowDialog(true);
  };

  const handleSave = async () => {
    if (!form.user_id || !form.company_name) {
      toast.error("Müşteri ve şirket adı zorunludur");
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
      if (error) { toast.error("Güncelleme hatası: " + error.message); return; }
      toast.success("Şirket güncellendi");
    } else {
      const { error } = await supabase
        .from("customer_companies")
        .insert(payload);
      if (error) { toast.error("Ekleme hatası: " + error.message); return; }
      toast.success("Yeni şirket eklendi");
    }

    setShowDialog(false);
    resetForm();
    fetchData();
  };

  const filtered = companies.filter((c) => {
    const matchSearch =
      c.company_name.toLowerCase().includes(search.toLowerCase()) ||
      c.user?.first_name?.toLowerCase().includes(search.toLowerCase()) ||
      c.user?.email?.toLowerCase().includes(search.toLowerCase()) ||
      c.ein_number?.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === "all" || c.status === statusFilter;
    return matchSearch && matchStatus;
  });

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">LLC / Şirket Yönetimi</h1>
          <p className="text-muted-foreground">Müşterilerin ABD şirketlerini yönetin</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="icon" onClick={fetchData}>
            <RefreshCw className="h-4 w-4" />
          </Button>
          <Button onClick={openCreate}>
            <Plus className="h-4 w-4 mr-2" /> Yeni Şirket
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Şirket, müşteri veya EIN ara..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Durum" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tüm Durumlar</SelectItem>
                {Object.entries(STATUS_LABELS).map(([k, v]) => (
                  <SelectItem key={k} value={k}>{v}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {Object.entries(STATUS_LABELS).map(([key, label]) => (
          <Card key={key}>
            <CardHeader className="pb-2">
              <CardDescription>{label}</CardDescription>
              <CardTitle className="text-2xl">
                {companies.filter((c) => c.status === key).length}
              </CardTitle>
            </CardHeader>
          </Card>
        ))}
      </div>

      {/* Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            Şirketler ({filtered.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8 text-muted-foreground">Yükleniyor...</div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">Kayıt bulunamadı</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Şirket Adı</TableHead>
                  <TableHead>Müşteri</TableHead>
                  <TableHead>Tür</TableHead>
                  <TableHead>Eyalet</TableHead>
                  <TableHead>EIN</TableHead>
                  <TableHead>Banka</TableHead>
                  <TableHead>Durum</TableHead>
                  <TableHead className="text-right">İşlem</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell className="font-medium">
                      {c.company_name}
                      {c.website && (
                        <a href={c.website} target="_blank" rel="noreferrer" className="ml-1">
                          <ExternalLink className="inline h-3 w-3 text-muted-foreground" />
                        </a>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">{c.user?.first_name} {c.user?.last_name}</div>
                      <div className="text-xs text-muted-foreground">{c.user?.email}</div>
                    </TableCell>
                    <TableCell>{COMPANY_TYPES[c.company_type] || c.company_type}</TableCell>
                    <TableCell>{c.state_of_formation}</TableCell>
                    <TableCell className="font-mono text-xs">{c.ein_number || "—"}</TableCell>
                    <TableCell>
                      <Badge variant={c.bank_account_status === "active" ? "default" : "outline"}>
                        {c.bank_account_status === "active" ? "Açık" :
                         c.bank_account_status === "pending" ? "Bekliyor" :
                         c.bank_account_status === "closed" ? "Kapandı" : "Açılmadı"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={STATUS_COLORS[c.status] || "outline"}>
                        {STATUS_LABELS[c.status] || c.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="sm" onClick={() => openEdit(c)}>
                        Düzenle
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Create/Edit Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingCompany ? "Şirketi Düzenle" : "Yeni Şirket Ekle"}
            </DialogTitle>
            <DialogDescription>
              Müşterinin ABD şirket bilgilerini girin
            </DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <Label>Müşteri *</Label>
              <Select value={form.user_id} onValueChange={(v) => setForm({ ...form, user_id: v })}>
                <SelectTrigger><SelectValue placeholder="Müşteri seçin" /></SelectTrigger>
                <SelectContent>
                  {users.map((u) => (
                    <SelectItem key={u.id} value={u.id}>
                      {u.first_name} {u.last_name} — {u.email}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="col-span-2">
              <Label>Şirket Adı *</Label>
              <Input value={form.company_name} onChange={(e) => setForm({ ...form, company_name: e.target.value })} placeholder="ABC Trading LLC" />
            </div>

            <div>
              <Label>Şirket Türü</Label>
              <Select value={form.company_type} onValueChange={(v) => setForm({ ...form, company_type: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(COMPANY_TYPES).map(([k, v]) => (
                    <SelectItem key={k} value={k}>{v}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Kuruluş Eyaleti</Label>
              <Select value={form.state_of_formation} onValueChange={(v) => setForm({ ...form, state_of_formation: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {US_STATES.map((s) => (
                    <SelectItem key={s} value={s}>{s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>EIN Numarası</Label>
              <Input value={form.ein_number} onChange={(e) => setForm({ ...form, ein_number: e.target.value })} placeholder="XX-XXXXXXX" />
            </div>

            <div>
              <Label>Kuruluş Tarihi</Label>
              <Input type="date" value={form.formation_date} onChange={(e) => setForm({ ...form, formation_date: e.target.value })} />
            </div>

            <div>
              <Label>Durum</Label>
              <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(STATUS_LABELS).map(([k, v]) => (
                    <SelectItem key={k} value={k}>{v}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Banka Hesap Durumu</Label>
              <Select value={form.bank_account_status} onValueChange={(v) => setForm({ ...form, bank_account_status: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="not_opened">Açılmadı</SelectItem>
                  <SelectItem value="pending">Bekliyor</SelectItem>
                  <SelectItem value="active">Aktif</SelectItem>
                  <SelectItem value="closed">Kapandı</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Registered Agent</Label>
              <Input value={form.registered_agent_name} onChange={(e) => setForm({ ...form, registered_agent_name: e.target.value })} />
            </div>

            <div>
              <Label>Banka Adı</Label>
              <Input value={form.bank_name} onChange={(e) => setForm({ ...form, bank_name: e.target.value })} placeholder="Mercury, Relay, Chase" />
            </div>

            <div>
              <Label>Şirket E-posta</Label>
              <Input value={form.company_email} onChange={(e) => setForm({ ...form, company_email: e.target.value })} />
            </div>

            <div>
              <Label>Website</Label>
              <Input value={form.website} onChange={(e) => setForm({ ...form, website: e.target.value })} placeholder="https://" />
            </div>

            <div className="col-span-2">
              <Label>Notlar</Label>
              <Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={2} />
            </div>

            <div className="col-span-2">
              <Label>Admin Notları (müşteri göremez)</Label>
              <Textarea value={form.admin_notes} onChange={(e) => setForm({ ...form, admin_notes: e.target.value })} rows={2} />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>İptal</Button>
            <Button onClick={handleSave}>
              {editingCompany ? "Güncelle" : "Ekle"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
