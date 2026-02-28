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
import { Warehouse, Plus, Search, RefreshCw } from "lucide-react";
import { toast } from "sonner";

interface UserInfo { id: string; first_name: string; last_name: string; email: string; }

interface WarehouseItem {
  id: string;
  user_id: string;
  warehouse_location: string;
  bin_number: string | null;
  quantity: number;
  unit_type: string;
  storage_cost_monthly: number;
  status: string;
  sku: string | null;
  barcode: string | null;
  notes: string | null;
  admin_notes: string | null;
  created_at: string;
  user?: UserInfo;
}

const STATUS_LABELS: Record<string, string> = {
  in_stock: "Stokta", reserved: "Rezerve", shipping: "Gönderimde",
  returned: "İade", damaged: "Hasarlı", disposed: "İmha",
};

const STATUS_COLORS: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  in_stock: "default", reserved: "secondary", shipping: "secondary",
  returned: "outline", damaged: "destructive", disposed: "destructive",
};

export default function AdminWarehousePage() {
  const supabase = createClient();
  const [items, setItems] = useState<WarehouseItem[]>([]);
  const [users, setUsers] = useState<UserInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [showDialog, setShowDialog] = useState(false);
  const [editing, setEditing] = useState<WarehouseItem | null>(null);

  const [form, setForm] = useState({
    user_id: "", warehouse_location: "US_MAIN", bin_number: "",
    quantity: "0", unit_type: "piece", storage_cost_monthly: "0",
    status: "in_stock", sku: "", barcode: "", notes: "", admin_notes: "",
  });

  const fetchData = useCallback(async () => {
    setLoading(true);
    const [itemRes, userRes] = await Promise.all([
      supabase.from("warehouse_items").select("*").order("created_at", { ascending: false }),
      supabase.from("users").select("id, first_name, last_name, email"),
    ]);
    if (itemRes.data && userRes.data) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const userMap = Object.fromEntries((userRes.data as any[]).map((u) => [u.id, u]));
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      setItems((itemRes.data as any[]).map((i) => ({ ...i, user: userMap[i.user_id] })));
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      setUsers(userRes.data as any[]);
    }
    setLoading(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const resetForm = () => {
    setForm({
      user_id: "", warehouse_location: "US_MAIN", bin_number: "",
      quantity: "0", unit_type: "piece", storage_cost_monthly: "0",
      status: "in_stock", sku: "", barcode: "", notes: "", admin_notes: "",
    });
    setEditing(null);
  };

  const openCreate = () => { resetForm(); setShowDialog(true); };
  const openEdit = (i: WarehouseItem) => {
    setEditing(i);
    setForm({
      user_id: i.user_id, warehouse_location: i.warehouse_location,
      bin_number: i.bin_number || "", quantity: i.quantity.toString(),
      unit_type: i.unit_type, storage_cost_monthly: i.storage_cost_monthly.toString(),
      status: i.status, sku: i.sku || "", barcode: i.barcode || "",
      notes: i.notes || "", admin_notes: i.admin_notes || "",
    });
    setShowDialog(true);
  };

  const handleSave = async () => {
    if (!form.user_id) { toast.error("Müşteri zorunludur"); return; }
    const payload = {
      user_id: form.user_id, warehouse_location: form.warehouse_location,
      bin_number: form.bin_number || null, quantity: parseInt(form.quantity) || 0,
      unit_type: form.unit_type, storage_cost_monthly: parseFloat(form.storage_cost_monthly) || 0,
      status: form.status, sku: form.sku || null, barcode: form.barcode || null,
      notes: form.notes || null, admin_notes: form.admin_notes || null,
    };
    const { error } = editing
      ? await supabase.from("warehouse_items").update(payload).eq("id", editing.id)
      : await supabase.from("warehouse_items").insert(payload);
    if (error) { toast.error("Hata: " + error.message); return; }
    toast.success(editing ? "Güncellendi" : "Eklendi");
    setShowDialog(false); resetForm(); fetchData();
  };

  const filtered = items.filter((i) => {
    const matchSearch =
      i.sku?.toLowerCase().includes(search.toLowerCase()) ||
      i.user?.first_name?.toLowerCase().includes(search.toLowerCase()) ||
      i.bin_number?.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === "all" || i.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const totalItems = items.reduce((s, i) => s + i.quantity, 0);
  const totalCost = items.reduce((s, i) => s + i.storage_cost_monthly, 0);

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Depo Yönetimi</h1>
          <p className="text-muted-foreground">ABD deposundaki ürünleri, stokları ve maliyetleri yönetin</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="icon" onClick={fetchData}><RefreshCw className="h-4 w-4" /></Button>
          <Button onClick={openCreate}><Plus className="h-4 w-4 mr-2" /> Yeni Ürün</Button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card><CardHeader className="pb-2"><CardDescription>Toplam Kalem</CardDescription>
          <CardTitle className="text-2xl">{items.length}</CardTitle></CardHeader></Card>
        <Card><CardHeader className="pb-2"><CardDescription>Toplam Adet</CardDescription>
          <CardTitle className="text-2xl">{totalItems.toLocaleString()}</CardTitle></CardHeader></Card>
        <Card><CardHeader className="pb-2"><CardDescription>Stokta</CardDescription>
          <CardTitle className="text-2xl text-green-600">{items.filter((i) => i.status === "in_stock").reduce((s, i) => s + i.quantity, 0).toLocaleString()}</CardTitle></CardHeader></Card>
        <Card><CardHeader className="pb-2"><CardDescription>Aylık Depo Maliyeti</CardDescription>
          <CardTitle className="text-2xl">${totalCost.toLocaleString()}</CardTitle></CardHeader></Card>
      </div>

      <Card>
        <CardContent className="pt-6">
          <div className="flex gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="SKU, müşteri veya raf ara..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10" />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-48"><SelectValue placeholder="Durum" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tümü</SelectItem>
                {Object.entries(STATUS_LABELS).map(([k, v]) => (
                  <SelectItem key={k} value={k}>{v}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Warehouse className="h-5 w-5" /> Depo Kalemleri ({filtered.length})
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
                  <TableHead>SKU</TableHead>
                  <TableHead>Müşteri</TableHead>
                  <TableHead>Lokasyon</TableHead>
                  <TableHead>Raf</TableHead>
                  <TableHead>Adet</TableHead>
                  <TableHead>Birim</TableHead>
                  <TableHead>Aylık Maliyet</TableHead>
                  <TableHead>Durum</TableHead>
                  <TableHead className="text-right">İşlem</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((i) => (
                  <TableRow key={i.id}>
                    <TableCell className="font-mono text-sm">{i.sku || "—"}</TableCell>
                    <TableCell>{i.user?.first_name} {i.user?.last_name}</TableCell>
                    <TableCell>{i.warehouse_location}</TableCell>
                    <TableCell>{i.bin_number || "—"}</TableCell>
                    <TableCell className="font-medium">{i.quantity.toLocaleString()}</TableCell>
                    <TableCell>{i.unit_type}</TableCell>
                    <TableCell>${i.storage_cost_monthly.toLocaleString()}</TableCell>
                    <TableCell>
                      <Badge variant={STATUS_COLORS[i.status]}>{STATUS_LABELS[i.status]}</Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="sm" onClick={() => openEdit(i)}>Düzenle</Button>
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
            <DialogTitle>{editing ? "Kalemi Düzenle" : "Yeni Depo Kalemi"}</DialogTitle>
            <DialogDescription>Depo ürün bilgilerini girin</DialogDescription>
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
              <Label>SKU</Label>
              <Input value={form.sku} onChange={(e) => setForm({ ...form, sku: e.target.value })} />
            </div>
            <div>
              <Label>Barkod</Label>
              <Input value={form.barcode} onChange={(e) => setForm({ ...form, barcode: e.target.value })} />
            </div>
            <div>
              <Label>Depo Lokasyonu</Label>
              <Input value={form.warehouse_location} onChange={(e) => setForm({ ...form, warehouse_location: e.target.value })} />
            </div>
            <div>
              <Label>Raf Numarası</Label>
              <Input value={form.bin_number} onChange={(e) => setForm({ ...form, bin_number: e.target.value })} />
            </div>
            <div>
              <Label>Adet</Label>
              <Input type="number" value={form.quantity} onChange={(e) => setForm({ ...form, quantity: e.target.value })} />
            </div>
            <div>
              <Label>Birim</Label>
              <Select value={form.unit_type} onValueChange={(v) => setForm({ ...form, unit_type: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="piece">Adet</SelectItem>
                  <SelectItem value="box">Kutu</SelectItem>
                  <SelectItem value="pallet">Palet</SelectItem>
                  <SelectItem value="kg">KG</SelectItem>
                  <SelectItem value="lbs">LBS</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Aylık Depo Ücreti ($)</Label>
              <Input type="number" step="0.01" value={form.storage_cost_monthly} onChange={(e) => setForm({ ...form, storage_cost_monthly: e.target.value })} />
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
