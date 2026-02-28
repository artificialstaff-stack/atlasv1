"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  Card, CardContent, CardDescription, CardHeader, CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  DollarSign, Plus, Search, RefreshCw, TrendingUp, TrendingDown, ArrowUpRight, ArrowDownRight,
} from "lucide-react";
import { toast } from "sonner";

interface UserInfo { id: string; first_name: string; last_name: string; email: string; }

interface FinancialRecord {
  id: string;
  user_id: string;
  record_type: "income" | "expense";
  category: string;
  description: string;
  amount: number;
  currency: string;
  transaction_date: string;
  is_verified: boolean;
  receipt_url: string | null;
  invoice_ref: string | null;
  notes: string | null;
  admin_notes: string | null;
  created_at: string;
  user?: UserInfo;
}

const INCOME_CATEGORIES: Record<string, string> = {
  marketplace_sales: "Pazaryeri Satışları",
  direct_sales: "Direkt Satışlar",
  refund_received: "İade Alındı",
  other_income: "Diğer Gelir",
};

const EXPENSE_CATEGORIES: Record<string, string> = {
  warehouse_rent: "Depo Kirası",
  warehouse_labor: "Depo İşçiliği",
  shipping_domestic: "ABD İç Kargo",
  shipping_international: "Uluslararası Kargo",
  customs_duty: "Gümrük Vergisi",
  customs_clearance: "Gümrükleme",
  packaging: "Paketleme",
  product_cost: "Ürün Maliyeti",
  marketplace_fees: "Pazaryeri Komisyonu",
  advertising: "Reklam",
  social_media_management: "Sosyal Medya",
  llc_formation: "LLC Kuruluş",
  llc_annual_fee: "LLC Yıllık Ücreti",
  registered_agent: "Registered Agent",
  bookkeeping: "Muhasebe",
  tax_filing: "Vergi Beyanı",
  insurance: "Sigorta",
  software_tools: "Yazılım/Araçlar",
  bank_fees: "Banka Komisyonları",
  return_processing: "İade İşleme",
  other_expense: "Diğer Gider",
};

const ALL_CATEGORIES = { ...INCOME_CATEGORIES, ...EXPENSE_CATEGORIES };

export default function AdminFinancePage() {
  const supabase = createClient();
  const [records, setRecords] = useState<FinancialRecord[]>([]);
  const [users, setUsers] = useState<UserInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [showDialog, setShowDialog] = useState(false);
  const [editing, setEditing] = useState<FinancialRecord | null>(null);

  const [form, setForm] = useState({
    user_id: "", record_type: "expense" as "income" | "expense",
    category: "product_cost", description: "", amount: "",
    currency: "USD", transaction_date: new Date().toISOString().split("T")[0],
    receipt_url: "", invoice_ref: "", notes: "", admin_notes: "",
  });

  const fetchData = useCallback(async () => {
    setLoading(true);
    const [recRes, userRes] = await Promise.all([
      supabase.from("financial_records").select("*").order("transaction_date", { ascending: false }),
      supabase.from("users").select("id, first_name, last_name, email"),
    ]);
    if (recRes.data && userRes.data) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const userMap = Object.fromEntries((userRes.data as any[]).map((u) => [u.id, u]));
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      setRecords((recRes.data as any[]).map((r) => ({ ...r, user: userMap[r.user_id] })));
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      setUsers(userRes.data as any[]);
    }
    setLoading(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const resetForm = () => {
    setForm({
      user_id: "", record_type: "expense", category: "product_cost",
      description: "", amount: "", currency: "USD",
      transaction_date: new Date().toISOString().split("T")[0],
      receipt_url: "", invoice_ref: "", notes: "", admin_notes: "",
    });
    setEditing(null);
  };

  const openCreate = () => { resetForm(); setShowDialog(true); };
  const openEdit = (r: FinancialRecord) => {
    setEditing(r);
    setForm({
      user_id: r.user_id, record_type: r.record_type, category: r.category,
      description: r.description, amount: r.amount.toString(), currency: r.currency,
      transaction_date: r.transaction_date, receipt_url: r.receipt_url || "",
      invoice_ref: r.invoice_ref || "", notes: r.notes || "",
      admin_notes: r.admin_notes || "",
    });
    setShowDialog(true);
  };

  const handleSave = async () => {
    if (!form.user_id || !form.description || !form.amount) {
      toast.error("Müşteri, açıklama ve tutar zorunludur"); return;
    }
    const payload = {
      user_id: form.user_id, record_type: form.record_type, category: form.category,
      description: form.description, amount: parseFloat(form.amount),
      currency: form.currency, transaction_date: form.transaction_date,
      receipt_url: form.receipt_url || null, invoice_ref: form.invoice_ref || null,
      notes: form.notes || null, admin_notes: form.admin_notes || null,
    };
    const { error } = editing
      ? await supabase.from("financial_records").update(payload).eq("id", editing.id)
      : await supabase.from("financial_records").insert(payload);
    if (error) { toast.error("Hata: " + error.message); return; }
    toast.success(editing ? "Güncellendi" : "Eklendi");
    setShowDialog(false); resetForm(); fetchData();
  };

  const toggleVerify = async (r: FinancialRecord) => {
    const { error } = await supabase
      .from("financial_records")
      .update({ is_verified: !r.is_verified })
      .eq("id", r.id);
    if (error) { toast.error(error.message); return; }
    toast.success(r.is_verified ? "Onay kaldırıldı" : "Onaylandı");
    fetchData();
  };

  const filtered = records.filter((r) => {
    const matchSearch =
      r.description.toLowerCase().includes(search.toLowerCase()) ||
      r.user?.first_name?.toLowerCase().includes(search.toLowerCase());
    const matchType = typeFilter === "all" || r.record_type === typeFilter;
    return matchSearch && matchType;
  });

  const totalIncome = records.filter((r) => r.record_type === "income").reduce((s, r) => s + r.amount, 0);
  const totalExpense = records.filter((r) => r.record_type === "expense").reduce((s, r) => s + r.amount, 0);
  const netProfit = totalIncome - totalExpense;

  const categories = form.record_type === "income" ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Finans Yönetimi</h1>
          <p className="text-muted-foreground">Gelir, gider, depo masrafları, komisyonlar ve tüm finansal kayıtlar</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="icon" onClick={fetchData}><RefreshCw className="h-4 w-4" /></Button>
          <Button onClick={openCreate}><Plus className="h-4 w-4 mr-2" /> Yeni Kayıt</Button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-1">
              <ArrowUpRight className="h-3 w-3 text-green-600" /> Toplam Gelir
            </CardDescription>
            <CardTitle className="text-2xl text-green-600">${totalIncome.toLocaleString()}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-1">
              <ArrowDownRight className="h-3 w-3 text-red-600" /> Toplam Gider
            </CardDescription>
            <CardTitle className="text-2xl text-red-600">${totalExpense.toLocaleString()}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Net Kar/Zarar</CardDescription>
            <CardTitle className={`text-2xl ${netProfit >= 0 ? "text-green-600" : "text-red-600"}`}>
              ${netProfit.toLocaleString()}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Kayıt Sayısı</CardDescription>
            <CardTitle className="text-2xl">{records.length}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      <Card>
        <CardContent className="pt-6">
          <div className="flex gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Açıklama veya müşteri ara..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10" />
            </div>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-48"><SelectValue placeholder="Tür" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tümü</SelectItem>
                <SelectItem value="income">Gelir</SelectItem>
                <SelectItem value="expense">Gider</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5" /> Finansal Kayıtlar ({filtered.length})
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
                  <TableHead>Tarih</TableHead>
                  <TableHead>Müşteri</TableHead>
                  <TableHead>Tür</TableHead>
                  <TableHead>Kategori</TableHead>
                  <TableHead>Açıklama</TableHead>
                  <TableHead className="text-right">Tutar</TableHead>
                  <TableHead>Onay</TableHead>
                  <TableHead className="text-right">İşlem</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="text-sm">{new Date(r.transaction_date).toLocaleDateString("tr-TR")}</TableCell>
                    <TableCell>{r.user?.first_name} {r.user?.last_name}</TableCell>
                    <TableCell>
                      {r.record_type === "income" ? (
                        <Badge variant="default" className="bg-green-600"><TrendingUp className="h-3 w-3 mr-1" /> Gelir</Badge>
                      ) : (
                        <Badge variant="destructive"><TrendingDown className="h-3 w-3 mr-1" /> Gider</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-sm">{ALL_CATEGORIES[r.category] || r.category}</TableCell>
                    <TableCell className="max-w-[200px] truncate">{r.description}</TableCell>
                    <TableCell className={`text-right font-medium ${r.record_type === "income" ? "text-green-600" : "text-red-600"}`}>
                      {r.record_type === "income" ? "+" : "-"}${r.amount.toLocaleString()}
                    </TableCell>
                    <TableCell>
                      <Button variant="ghost" size="sm" onClick={() => toggleVerify(r)}
                        className={r.is_verified ? "text-green-600" : "text-muted-foreground"}>
                        {r.is_verified ? "✓ Onaylı" : "Onayla"}
                      </Button>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="sm" onClick={() => openEdit(r)}>Düzenle</Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? "Kaydı Düzenle" : "Yeni Finansal Kayıt"}</DialogTitle>
            <DialogDescription>Gelir veya gider kaydı ekleyin</DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <Label>Müşteri *</Label>
              <Select value={form.user_id} onValueChange={(v) => setForm({ ...form, user_id: v })}>
                <SelectTrigger><SelectValue placeholder="Müşteri seçin" /></SelectTrigger>
                <SelectContent>
                  {users.map((u) => (
                    <SelectItem key={u.id} value={u.id}>{u.first_name} {u.last_name} — {u.email}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Tür *</Label>
              <Select value={form.record_type} onValueChange={(v) => setForm({ ...form, record_type: v as "income" | "expense", category: v === "income" ? "marketplace_sales" : "product_cost" })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="income">Gelir</SelectItem>
                  <SelectItem value="expense">Gider</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Kategori *</Label>
              <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(categories).map(([k, v]) => (
                    <SelectItem key={k} value={k}>{v}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="col-span-2">
              <Label>Açıklama *</Label>
              <Input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
            </div>
            <div>
              <Label>Tutar *</Label>
              <Input type="number" step="0.01" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} />
            </div>
            <div>
              <Label>Para Birimi</Label>
              <Select value={form.currency} onValueChange={(v) => setForm({ ...form, currency: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="USD">USD</SelectItem>
                  <SelectItem value="TRY">TRY</SelectItem>
                  <SelectItem value="EUR">EUR</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Tarih *</Label>
              <Input type="date" value={form.transaction_date} onChange={(e) => setForm({ ...form, transaction_date: e.target.value })} />
            </div>
            <div>
              <Label>Fatura Ref</Label>
              <Input value={form.invoice_ref} onChange={(e) => setForm({ ...form, invoice_ref: e.target.value })} />
            </div>
            <div className="col-span-2">
              <Label>Notlar</Label>
              <Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={2} />
            </div>
            <div className="col-span-2">
              <Label>Admin Notları</Label>
              <Textarea value={form.admin_notes} onChange={(e) => setForm({ ...form, admin_notes: e.target.value })} rows={2} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>İptal</Button>
            <Button onClick={handleSave}>{editing ? "Güncelle" : "Ekle"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
