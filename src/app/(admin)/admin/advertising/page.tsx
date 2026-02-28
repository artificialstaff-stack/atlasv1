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
import { Megaphone, Plus, Search, RefreshCw, TrendingUp } from "lucide-react";
import { toast } from "sonner";

interface UserInfo { id: string; first_name: string; last_name: string; email: string; }

interface AdCampaign {
  id: string;
  user_id: string;
  campaign_name: string;
  platform: string;
  campaign_type: string;
  status: string;
  daily_budget: number | null;
  total_budget: number | null;
  spent_amount: number;
  impressions: number;
  clicks: number;
  conversions: number;
  revenue_generated: number;
  roas: number;
  cpc: number;
  ctr: number;
  start_date: string | null;
  end_date: string | null;
  notes: string | null;
  admin_notes: string | null;
  created_at: string;
  user?: UserInfo;
}

const PLATFORMS: Record<string, string> = {
  google_ads: "Google Ads", facebook_ads: "Facebook Ads", instagram_ads: "Instagram Ads",
  tiktok_ads: "TikTok Ads", amazon_ppc: "Amazon PPC", walmart_ads: "Walmart Ads",
  ebay_promoted: "eBay Promoted", pinterest_ads: "Pinterest Ads", youtube_ads: "YouTube Ads",
  snapchat_ads: "Snapchat Ads", twitter_ads: "X Ads", other: "Diğer",
};

const CAMPAIGN_TYPES: Record<string, string> = {
  awareness: "Bilinirlik", traffic: "Trafik", conversion: "Dönüşüm",
  retargeting: "Retargeting", brand: "Marka", other: "Diğer",
};

const STATUS_LABELS: Record<string, string> = {
  draft: "Taslak", pending_approval: "Onay Bekleniyor", active: "Aktif",
  paused: "Duraklatıldı", completed: "Tamamlandı", cancelled: "İptal",
};

const STATUS_COLORS: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  active: "default", draft: "outline", pending_approval: "secondary",
  paused: "secondary", completed: "default", cancelled: "destructive",
};

export default function AdminAdvertisingPage() {
  const supabase = createClient();
  const [campaigns, setCampaigns] = useState<AdCampaign[]>([]);
  const [users, setUsers] = useState<UserInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [showDialog, setShowDialog] = useState(false);
  const [editing, setEditing] = useState<AdCampaign | null>(null);

  const [form, setForm] = useState({
    user_id: "", campaign_name: "", platform: "google_ads",
    campaign_type: "conversion", status: "draft",
    daily_budget: "", total_budget: "", start_date: "", end_date: "",
    target_audience: "", notes: "", admin_notes: "",
  });

  const fetchData = useCallback(async () => {
    setLoading(true);
    const [campRes, userRes] = await Promise.all([
      supabase.from("ad_campaigns").select("*").order("created_at", { ascending: false }),
      supabase.from("users").select("id, first_name, last_name, email"),
    ]);
    if (campRes.data && userRes.data) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const userMap = Object.fromEntries((userRes.data as any[]).map((u) => [u.id, u]));
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      setCampaigns((campRes.data as any[]).map((c) => ({ ...c, user: userMap[c.user_id] })));
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      setUsers(userRes.data as any[]);
    }
    setLoading(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const resetForm = () => {
    setForm({
      user_id: "", campaign_name: "", platform: "google_ads",
      campaign_type: "conversion", status: "draft",
      daily_budget: "", total_budget: "", start_date: "", end_date: "",
      target_audience: "", notes: "", admin_notes: "",
    });
    setEditing(null);
  };

  const openCreate = () => { resetForm(); setShowDialog(true); };
  const openEdit = (c: AdCampaign) => {
    setEditing(c);
    setForm({
      user_id: c.user_id, campaign_name: c.campaign_name, platform: c.platform,
      campaign_type: c.campaign_type, status: c.status,
      daily_budget: c.daily_budget?.toString() || "", total_budget: c.total_budget?.toString() || "",
      start_date: c.start_date || "", end_date: c.end_date || "",
      target_audience: "", notes: c.notes || "", admin_notes: c.admin_notes || "",
    });
    setShowDialog(true);
  };

  const handleSave = async () => {
    if (!form.user_id || !form.campaign_name) {
      toast.error("Müşteri ve kampanya adı zorunludur"); return;
    }
    const payload = {
      user_id: form.user_id, campaign_name: form.campaign_name,
      platform: form.platform, campaign_type: form.campaign_type, status: form.status,
      daily_budget: form.daily_budget ? parseFloat(form.daily_budget) : null,
      total_budget: form.total_budget ? parseFloat(form.total_budget) : null,
      start_date: form.start_date || null, end_date: form.end_date || null,
      target_audience: form.target_audience || null,
      notes: form.notes || null, admin_notes: form.admin_notes || null,
    };
    const { error } = editing
      ? await supabase.from("ad_campaigns").update(payload).eq("id", editing.id)
      : await supabase.from("ad_campaigns").insert(payload);
    if (error) { toast.error("Hata: " + error.message); return; }
    toast.success(editing ? "Güncellendi" : "Eklendi");
    setShowDialog(false); resetForm(); fetchData();
  };

  const filtered = campaigns.filter((c) => {
    const matchSearch =
      c.campaign_name.toLowerCase().includes(search.toLowerCase()) ||
      c.user?.first_name?.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === "all" || c.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const activeCampaigns = campaigns.filter((c) => c.status === "active");
  const totalSpent = campaigns.reduce((s, c) => s + c.spent_amount, 0);
  const totalRevenue = campaigns.reduce((s, c) => s + c.revenue_generated, 0);
  const avgRoas = activeCampaigns.length > 0
    ? activeCampaigns.reduce((s, c) => s + c.roas, 0) / activeCampaigns.length : 0;

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Reklam Yönetimi</h1>
          <p className="text-muted-foreground">Google, Facebook, Amazon PPC ve tüm reklam kampanyaları</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="icon" onClick={fetchData}><RefreshCw className="h-4 w-4" /></Button>
          <Button onClick={openCreate}><Plus className="h-4 w-4 mr-2" /> Yeni Kampanya</Button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card><CardHeader className="pb-2"><CardDescription>Toplam Kampanya</CardDescription>
          <CardTitle className="text-2xl">{campaigns.length}</CardTitle></CardHeader></Card>
        <Card><CardHeader className="pb-2"><CardDescription>Aktif</CardDescription>
          <CardTitle className="text-2xl text-green-600">{activeCampaigns.length}</CardTitle></CardHeader></Card>
        <Card><CardHeader className="pb-2"><CardDescription>Toplam Harcama</CardDescription>
          <CardTitle className="text-2xl">${totalSpent.toLocaleString()}</CardTitle></CardHeader></Card>
        <Card><CardHeader className="pb-2"><CardDescription>Toplam Gelir</CardDescription>
          <CardTitle className="text-2xl text-green-600">${totalRevenue.toLocaleString()}</CardTitle></CardHeader></Card>
        <Card><CardHeader className="pb-2"><CardDescription>Ort. ROAS</CardDescription>
          <CardTitle className="text-2xl">{avgRoas.toFixed(1)}x</CardTitle></CardHeader></Card>
      </div>

      <Card>
        <CardContent className="pt-6">
          <div className="flex gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Kampanya veya müşteri ara..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10" />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-48"><SelectValue placeholder="Durum" /></SelectTrigger>
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

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Megaphone className="h-5 w-5" /> Kampanyalar ({filtered.length})
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
                  <TableHead>Kampanya</TableHead>
                  <TableHead>Müşteri</TableHead>
                  <TableHead>Platform</TableHead>
                  <TableHead>Tür</TableHead>
                  <TableHead>Bütçe</TableHead>
                  <TableHead>Harcanan</TableHead>
                  <TableHead>Tıklama</TableHead>
                  <TableHead>Dönüşüm</TableHead>
                  <TableHead>ROAS</TableHead>
                  <TableHead>Durum</TableHead>
                  <TableHead className="text-right">İşlem</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell className="font-medium">{c.campaign_name}</TableCell>
                    <TableCell>{c.user?.first_name} {c.user?.last_name}</TableCell>
                    <TableCell><Badge variant="outline">{PLATFORMS[c.platform]}</Badge></TableCell>
                    <TableCell>{CAMPAIGN_TYPES[c.campaign_type]}</TableCell>
                    <TableCell>${(c.total_budget || 0).toLocaleString()}</TableCell>
                    <TableCell>${c.spent_amount.toLocaleString()}</TableCell>
                    <TableCell>{c.clicks.toLocaleString()}</TableCell>
                    <TableCell>{c.conversions}</TableCell>
                    <TableCell>
                      <span className="flex items-center gap-1">
                        <TrendingUp className="h-3 w-3" /> {c.roas.toFixed(1)}x
                      </span>
                    </TableCell>
                    <TableCell>
                      <Badge variant={STATUS_COLORS[c.status]}>{STATUS_LABELS[c.status]}</Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="sm" onClick={() => openEdit(c)}>Düzenle</Button>
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
            <DialogTitle>{editing ? "Kampanyayı Düzenle" : "Yeni Kampanya"}</DialogTitle>
            <DialogDescription>Reklam kampanyası bilgilerini girin</DialogDescription>
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
            <div className="col-span-2">
              <Label>Kampanya Adı *</Label>
              <Input value={form.campaign_name} onChange={(e) => setForm({ ...form, campaign_name: e.target.value })} />
            </div>
            <div>
              <Label>Platform</Label>
              <Select value={form.platform} onValueChange={(v) => setForm({ ...form, platform: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(PLATFORMS).map(([k, v]) => (
                    <SelectItem key={k} value={k}>{v}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Kampanya Türü</Label>
              <Select value={form.campaign_type} onValueChange={(v) => setForm({ ...form, campaign_type: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(CAMPAIGN_TYPES).map(([k, v]) => (
                    <SelectItem key={k} value={k}>{v}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
              <Label>Günlük Bütçe ($)</Label>
              <Input type="number" step="0.01" value={form.daily_budget} onChange={(e) => setForm({ ...form, daily_budget: e.target.value })} />
            </div>
            <div>
              <Label>Toplam Bütçe ($)</Label>
              <Input type="number" step="0.01" value={form.total_budget} onChange={(e) => setForm({ ...form, total_budget: e.target.value })} />
            </div>
            <div>
              <Label>Başlangıç</Label>
              <Input type="date" value={form.start_date} onChange={(e) => setForm({ ...form, start_date: e.target.value })} />
            </div>
            <div>
              <Label>Bitiş</Label>
              <Input type="date" value={form.end_date} onChange={(e) => setForm({ ...form, end_date: e.target.value })} />
            </div>
            <div className="col-span-2">
              <Label>Hedef Kitle</Label>
              <Textarea value={form.target_audience} onChange={(e) => setForm({ ...form, target_audience: e.target.value })} rows={2} />
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
