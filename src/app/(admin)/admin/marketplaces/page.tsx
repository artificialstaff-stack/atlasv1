"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
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
import { PageHeader } from "@/components/shared/page-header";
import {
  AtlasEmptySurface,
  AtlasInsightCard,
  AtlasSectionPanel,
  AtlasStackGrid,
  AtlasTableShell,
} from "@/components/portal/atlas-widget-kit";
import { ShoppingBag, Plus, Search, RefreshCw, ExternalLink, Star } from "lucide-react";
import { toast } from "sonner";

interface UserInfo { id: string; first_name: string; last_name: string; email: string; }

interface MarketplaceAccount {
  id: string;
  user_id: string;
  company_id: string | null;
  platform: string;
  store_name: string;
  store_url: string | null;
  seller_id: string | null;
  status: string;
  seller_rating: number | null;
  total_listings: number;
  total_sales: number;
  monthly_revenue: number;
  api_connected: boolean;
  notes: string | null;
  admin_notes: string | null;
  created_at: string;
  user?: UserInfo;
}

const PLATFORMS: Record<string, string> = {
  amazon: "Amazon",
  ebay: "eBay",
  walmart: "Walmart",
  etsy: "Etsy",
  shopify: "Shopify",
  tiktok_shop: "TikTok Shop",
  facebook_marketplace: "Facebook Marketplace",
  google_shopping: "Google Shopping",
  target_plus: "Target+",
  wayfair: "Wayfair",
  other: "Diğer",
};

const STATUS_LABELS: Record<string, string> = {
  pending_setup: "Kurulum Bekleniyor",
  under_review: "İnceleniyor",
  active: "Aktif",
  suspended: "Askıda",
  vacation_mode: "Tatil Modu",
  closed: "Kapatıldı",
};

const STATUS_COLORS: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  active: "default",
  pending_setup: "outline",
  under_review: "secondary",
  suspended: "destructive",
  vacation_mode: "secondary",
  closed: "destructive",
};

export default function AdminMarketplacesPage() {
  const supabase = createClient();
  const [accounts, setAccounts] = useState<MarketplaceAccount[]>([]);
  const [users, setUsers] = useState<UserInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [platformFilter, setPlatformFilter] = useState("all");
  const [showDialog, setShowDialog] = useState(false);
  const [editing, setEditing] = useState<MarketplaceAccount | null>(null);

  const [form, setForm] = useState({
    user_id: "", platform: "amazon", store_name: "", store_url: "",
    seller_id: "", status: "pending_setup", seller_rating: "",
    total_listings: "0", total_sales: "0", monthly_revenue: "0",
    api_connected: false, notes: "", admin_notes: "",
  });

  const fetchData = useCallback(async () => {
    setLoading(true);
    const [accRes, userRes] = await Promise.all([
      supabase.from("marketplace_accounts").select("*").order("created_at", { ascending: false }),
      supabase.from("users").select("id, first_name, last_name, email"),
    ]);
    if (accRes.data && userRes.data) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const userMap = Object.fromEntries((userRes.data as any[]).map((u) => [u.id, u]));
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      setAccounts((accRes.data as any[]).map((a) => ({ ...a, user: userMap[a.user_id] })));
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      setUsers(userRes.data as any[]);
    }
    setLoading(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const resetForm = () => {
    setForm({
      user_id: "", platform: "amazon", store_name: "", store_url: "",
      seller_id: "", status: "pending_setup", seller_rating: "",
      total_listings: "0", total_sales: "0", monthly_revenue: "0",
      api_connected: false, notes: "", admin_notes: "",
    });
    setEditing(null);
  };

  const openCreate = () => { resetForm(); setShowDialog(true); };

  const openEdit = (a: MarketplaceAccount) => {
    setEditing(a);
    setForm({
      user_id: a.user_id, platform: a.platform, store_name: a.store_name,
      store_url: a.store_url || "", seller_id: a.seller_id || "",
      status: a.status, seller_rating: a.seller_rating?.toString() || "",
      total_listings: a.total_listings.toString(),
      total_sales: a.total_sales.toString(),
      monthly_revenue: a.monthly_revenue.toString(),
      api_connected: a.api_connected, notes: a.notes || "", admin_notes: a.admin_notes || "",
    });
    setShowDialog(true);
  };

  const handleSave = async () => {
    if (!form.user_id || !form.store_name) {
      toast.error("Müşteri ve mağaza adı zorunludur"); return;
    }
    const { data: companies } = await supabase
      .from("customer_companies")
      .select("id")
      .eq("user_id", form.user_id)
      .order("created_at", { ascending: false })
      .limit(1);

    const payload = {
      user_id: form.user_id, platform: form.platform, store_name: form.store_name,
      company_id: companies?.[0]?.id ?? null,
      store_url: form.store_url || null, seller_id: form.seller_id || null,
      status: form.status, seller_rating: form.seller_rating ? parseFloat(form.seller_rating) : null,
      total_listings: parseInt(form.total_listings) || 0,
      total_sales: parseInt(form.total_sales) || 0,
      monthly_revenue: parseFloat(form.monthly_revenue) || 0,
      api_connected: form.api_connected,
      notes: form.notes || null, admin_notes: form.admin_notes || null,
    };

    const { error } = editing
      ? await supabase.from("marketplace_accounts").update(payload).eq("id", editing.id)
      : await supabase.from("marketplace_accounts").insert(payload);

    if (error) { toast.error("Hata: " + error.message); return; }
    toast.success(editing ? "Güncellendi" : "Eklendi");
    setShowDialog(false); resetForm(); fetchData();
  };

  const filtered = accounts.filter((a) => {
    const matchSearch =
      a.store_name.toLowerCase().includes(search.toLowerCase()) ||
      a.user?.first_name?.toLowerCase().includes(search.toLowerCase()) ||
      a.seller_id?.toLowerCase().includes(search.toLowerCase());
    const matchPlatform = platformFilter === "all" || a.platform === platformFilter;
    return matchSearch && matchPlatform;
  });

  const totalRevenue = accounts.filter((a) => a.status === "active").reduce((s, a) => s + a.monthly_revenue, 0);
  const activeAccounts = accounts.filter((a) => a.status === "active").length;
  const platformCount = new Set(accounts.map((a) => a.platform)).size;

  return (
    <div className="space-y-6 p-6">
      <PageHeader
        title="Pazaryeri Hesapları"
        description="Amazon, Walmart, Shopify, eBay ve diger kanallarin operator yonetimini tek tabloda toplayin."
      >
        <Button variant="outline" size="icon" onClick={fetchData}>
          <RefreshCw className="h-4 w-4" />
        </Button>
        <Button onClick={openCreate}>
          <Plus className="mr-2 h-4 w-4" />
          Yeni Hesap
        </Button>
      </PageHeader>

      <AtlasStackGrid columns="four">
        <AtlasInsightCard
          eyebrow="Marketplace Footprint"
          title={`${accounts.length}`}
          description="Takip edilen toplam store ve seller hesabı."
          badge="Toplam hesap"
          tone="cobalt"
        />
        <AtlasInsightCard
          eyebrow="Active Accounts"
          title={`${activeAccounts}`}
          description="Su an aktif ve operasyona dahil hesaplar."
          badge="Aktif"
          tone="success"
        />
        <AtlasInsightCard
          eyebrow="Revenue Surface"
          title={`$${totalRevenue.toLocaleString()}`}
          description="Aktif hesaplardan raporlanan toplam aylik gelir."
          badge="Aylik gelir"
          tone="primary"
        />
        <AtlasInsightCard
          eyebrow="Channel Spread"
          title={`${platformCount}`}
          description="Aktif olarak kullanilan farkli platform sayisi."
          badge="Platform cesidi"
          tone="warning"
        />
      </AtlasStackGrid>

      <AtlasSectionPanel
        eyebrow="Marketplace Controls"
        title="Arama ve platform filtresi"
        description="Magaza, musteri veya seller ID bazinda hesap listesini daraltin."
      >
        <div className="flex gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Magaza, musteri veya seller ID ara..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10" />
          </div>
          <Select value={platformFilter} onValueChange={setPlatformFilter}>
            <SelectTrigger className="w-48"><SelectValue placeholder="Platform" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tum platformlar</SelectItem>
              {Object.entries(PLATFORMS).map(([k, v]) => (
                <SelectItem key={k} value={k}>{v}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </AtlasSectionPanel>

      <AtlasTableShell
        eyebrow="Marketplace Ledger"
        title={`Hesaplar (${filtered.length})`}
        description="Store sagligi, gelir ve seller metrikleri tek operator tablosunda okunur."
        badge={`${filtered.length} kayit`}
      >
          {loading ? (
            <div className="text-center py-8 text-muted-foreground">Yukleniyor...</div>
          ) : filtered.length === 0 ? (
            <AtlasEmptySurface
              title="Kayit bulunamadi"
              description="Bu filtre seti icin gosterilecek pazaryeri hesabi yok."
              tone="neutral"
            />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Mağaza</TableHead>
                  <TableHead>Müşteri</TableHead>
                  <TableHead>Platform</TableHead>
                  <TableHead>Rating</TableHead>
                  <TableHead>Ürünler</TableHead>
                  <TableHead>Satışlar</TableHead>
                  <TableHead>Aylık Gelir</TableHead>
                  <TableHead>Durum</TableHead>
                  <TableHead className="text-right">İşlem</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((a) => (
                  <TableRow key={a.id}>
                    <TableCell className="font-medium">
                      {a.store_name}
                      {a.store_url && (
                        <a href={a.store_url} target="_blank" rel="noreferrer" className="ml-1">
                          <ExternalLink className="inline h-3 w-3 text-muted-foreground" />
                        </a>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">{a.user?.first_name} {a.user?.last_name}</div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{PLATFORMS[a.platform] || a.platform}</Badge>
                    </TableCell>
                    <TableCell>
                      {a.seller_rating ? (
                        <span className="flex items-center gap-1">
                          <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                          {a.seller_rating}
                        </span>
                      ) : "—"}
                    </TableCell>
                    <TableCell>{a.total_listings.toLocaleString()}</TableCell>
                    <TableCell>{a.total_sales.toLocaleString()}</TableCell>
                    <TableCell className="font-medium">${a.monthly_revenue.toLocaleString()}</TableCell>
                    <TableCell>
                      <Badge variant={STATUS_COLORS[a.status] || "outline"}>
                        {STATUS_LABELS[a.status] || a.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="sm" onClick={() => openEdit(a)}>Düzenle</Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
      </AtlasTableShell>

      {/* Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? "Hesabı Düzenle" : "Yeni Pazaryeri Hesabı"}</DialogTitle>
            <DialogDescription>Pazaryeri hesap bilgilerini girin</DialogDescription>
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
              <Label>Mağaza Adı *</Label>
              <Input value={form.store_name} onChange={(e) => setForm({ ...form, store_name: e.target.value })} />
            </div>
            <div>
              <Label>Mağaza URL</Label>
              <Input value={form.store_url} onChange={(e) => setForm({ ...form, store_url: e.target.value })} placeholder="https://" />
            </div>
            <div>
              <Label>Seller ID</Label>
              <Input value={form.seller_id} onChange={(e) => setForm({ ...form, seller_id: e.target.value })} />
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
              <Label>Seller Rating</Label>
              <Input type="number" step="0.01" value={form.seller_rating} onChange={(e) => setForm({ ...form, seller_rating: e.target.value })} />
            </div>
            <div>
              <Label>Toplam Ürün</Label>
              <Input type="number" value={form.total_listings} onChange={(e) => setForm({ ...form, total_listings: e.target.value })} />
            </div>
            <div>
              <Label>Toplam Satış</Label>
              <Input type="number" value={form.total_sales} onChange={(e) => setForm({ ...form, total_sales: e.target.value })} />
            </div>
            <div>
              <Label>Aylık Gelir ($)</Label>
              <Input type="number" step="0.01" value={form.monthly_revenue} onChange={(e) => setForm({ ...form, monthly_revenue: e.target.value })} />
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
