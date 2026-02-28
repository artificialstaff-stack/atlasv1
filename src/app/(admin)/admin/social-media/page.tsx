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
import { Share2, Plus, Search, RefreshCw, ExternalLink, Users } from "lucide-react";
import { toast } from "sonner";

interface UserInfo { id: string; first_name: string; last_name: string; email: string; }

interface SocialAccount {
  id: string;
  user_id: string;
  platform: string;
  account_name: string;
  profile_url: string | null;
  status: string;
  followers_count: number;
  following_count: number;
  posts_count: number;
  engagement_rate: number;
  managed_by_us: boolean;
  notes: string | null;
  admin_notes: string | null;
  created_at: string;
  user?: UserInfo;
}

const PLATFORMS: Record<string, string> = {
  instagram: "Instagram", facebook: "Facebook", tiktok: "TikTok",
  youtube: "YouTube", twitter_x: "X (Twitter)", pinterest: "Pinterest",
  linkedin: "LinkedIn", snapchat: "Snapchat", threads: "Threads", other: "Diğer",
};

const STATUS_LABELS: Record<string, string> = {
  pending_setup: "Kurulum Bekleniyor", active: "Aktif",
  suspended: "Askıda", deactivated: "Deaktif",
};

const STATUS_COLORS: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  active: "default", pending_setup: "outline", suspended: "destructive", deactivated: "destructive",
};

export default function AdminSocialMediaPage() {
  const supabase = createClient();
  const [accounts, setAccounts] = useState<SocialAccount[]>([]);
  const [users, setUsers] = useState<UserInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [platformFilter, setPlatformFilter] = useState("all");
  const [showDialog, setShowDialog] = useState(false);
  const [editing, setEditing] = useState<SocialAccount | null>(null);

  const [form, setForm] = useState({
    user_id: "", platform: "instagram", account_name: "", profile_url: "",
    status: "pending_setup", followers_count: "0", following_count: "0",
    posts_count: "0", engagement_rate: "0", managed_by_us: true,
    content_calendar_url: "", notes: "", admin_notes: "",
  });

  const fetchData = useCallback(async () => {
    setLoading(true);
    const [accRes, userRes] = await Promise.all([
      supabase.from("social_media_accounts").select("*").order("created_at", { ascending: false }),
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
      user_id: "", platform: "instagram", account_name: "", profile_url: "",
      status: "pending_setup", followers_count: "0", following_count: "0",
      posts_count: "0", engagement_rate: "0", managed_by_us: true,
      content_calendar_url: "", notes: "", admin_notes: "",
    });
    setEditing(null);
  };

  const openCreate = () => { resetForm(); setShowDialog(true); };

  const openEdit = (a: SocialAccount) => {
    setEditing(a);
    setForm({
      user_id: a.user_id, platform: a.platform, account_name: a.account_name,
      profile_url: a.profile_url || "", status: a.status,
      followers_count: a.followers_count.toString(),
      following_count: a.following_count.toString(),
      posts_count: a.posts_count.toString(),
      engagement_rate: a.engagement_rate.toString(),
      managed_by_us: a.managed_by_us, content_calendar_url: "",
      notes: a.notes || "", admin_notes: a.admin_notes || "",
    });
    setShowDialog(true);
  };

  const handleSave = async () => {
    if (!form.user_id || !form.account_name) {
      toast.error("Müşteri ve hesap adı zorunludur"); return;
    }
    const payload = {
      user_id: form.user_id, platform: form.platform, account_name: form.account_name,
      profile_url: form.profile_url || null, status: form.status,
      followers_count: parseInt(form.followers_count) || 0,
      following_count: parseInt(form.following_count) || 0,
      posts_count: parseInt(form.posts_count) || 0,
      engagement_rate: parseFloat(form.engagement_rate) || 0,
      managed_by_us: form.managed_by_us,
      content_calendar_url: form.content_calendar_url || null,
      notes: form.notes || null, admin_notes: form.admin_notes || null,
    };
    const { error } = editing
      ? await supabase.from("social_media_accounts").update(payload).eq("id", editing.id)
      : await supabase.from("social_media_accounts").insert(payload);
    if (error) { toast.error("Hata: " + error.message); return; }
    toast.success(editing ? "Güncellendi" : "Eklendi");
    setShowDialog(false); resetForm(); fetchData();
  };

  const filtered = accounts.filter((a) => {
    const matchSearch =
      a.account_name.toLowerCase().includes(search.toLowerCase()) ||
      a.user?.first_name?.toLowerCase().includes(search.toLowerCase());
    const matchPlatform = platformFilter === "all" || a.platform === platformFilter;
    return matchSearch && matchPlatform;
  });

  const totalFollowers = accounts.reduce((s, a) => s + a.followers_count, 0);

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Sosyal Medya Yönetimi</h1>
          <p className="text-muted-foreground">Müşterilerin sosyal medya hesaplarını yönetin</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="icon" onClick={fetchData}><RefreshCw className="h-4 w-4" /></Button>
          <Button onClick={openCreate}><Plus className="h-4 w-4 mr-2" /> Yeni Hesap</Button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card><CardHeader className="pb-2"><CardDescription>Toplam Hesap</CardDescription>
          <CardTitle className="text-2xl">{accounts.length}</CardTitle></CardHeader></Card>
        <Card><CardHeader className="pb-2"><CardDescription>Aktif</CardDescription>
          <CardTitle className="text-2xl text-green-600">{accounts.filter((a) => a.status === "active").length}</CardTitle></CardHeader></Card>
        <Card><CardHeader className="pb-2"><CardDescription>Toplam Takipçi</CardDescription>
          <CardTitle className="text-2xl">{totalFollowers.toLocaleString()}</CardTitle></CardHeader></Card>
        <Card><CardHeader className="pb-2"><CardDescription>Biz Yönetiyoruz</CardDescription>
          <CardTitle className="text-2xl">{accounts.filter((a) => a.managed_by_us).length}</CardTitle></CardHeader></Card>
      </div>

      <Card>
        <CardContent className="pt-6">
          <div className="flex gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Hesap adı veya müşteri ara..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10" />
            </div>
            <Select value={platformFilter} onValueChange={setPlatformFilter}>
              <SelectTrigger className="w-48"><SelectValue placeholder="Platform" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tüm Platformlar</SelectItem>
                {Object.entries(PLATFORMS).map(([k, v]) => (
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
            <Share2 className="h-5 w-5" /> Hesaplar ({filtered.length})
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
                  <TableHead>Hesap</TableHead>
                  <TableHead>Müşteri</TableHead>
                  <TableHead>Platform</TableHead>
                  <TableHead>Takipçi</TableHead>
                  <TableHead>Paylaşım</TableHead>
                  <TableHead>Etkileşim</TableHead>
                  <TableHead>Yönetim</TableHead>
                  <TableHead>Durum</TableHead>
                  <TableHead className="text-right">İşlem</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((a) => (
                  <TableRow key={a.id}>
                    <TableCell className="font-medium">
                      {a.account_name}
                      {a.profile_url && (
                        <a href={a.profile_url} target="_blank" rel="noreferrer" className="ml-1">
                          <ExternalLink className="inline h-3 w-3 text-muted-foreground" />
                        </a>
                      )}
                    </TableCell>
                    <TableCell>{a.user?.first_name} {a.user?.last_name}</TableCell>
                    <TableCell><Badge variant="outline">{PLATFORMS[a.platform]}</Badge></TableCell>
                    <TableCell>
                      <span className="flex items-center gap-1">
                        <Users className="h-3 w-3" /> {a.followers_count.toLocaleString()}
                      </span>
                    </TableCell>
                    <TableCell>{a.posts_count.toLocaleString()}</TableCell>
                    <TableCell>{a.engagement_rate}%</TableCell>
                    <TableCell>
                      <Badge variant={a.managed_by_us ? "default" : "outline"}>
                        {a.managed_by_us ? "Biz" : "Müşteri"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={STATUS_COLORS[a.status]}>{STATUS_LABELS[a.status]}</Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="sm" onClick={() => openEdit(a)}>Düzenle</Button>
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
            <DialogTitle>{editing ? "Hesabı Düzenle" : "Yeni Sosyal Medya Hesabı"}</DialogTitle>
            <DialogDescription>Sosyal medya hesap bilgilerini girin</DialogDescription>
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
              <Label>Hesap Adı *</Label>
              <Input value={form.account_name} onChange={(e) => setForm({ ...form, account_name: e.target.value })} placeholder="@username" />
            </div>
            <div>
              <Label>Profil URL</Label>
              <Input value={form.profile_url} onChange={(e) => setForm({ ...form, profile_url: e.target.value })} />
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
              <Label>Takipçi</Label>
              <Input type="number" value={form.followers_count} onChange={(e) => setForm({ ...form, followers_count: e.target.value })} />
            </div>
            <div>
              <Label>Takip Edilen</Label>
              <Input type="number" value={form.following_count} onChange={(e) => setForm({ ...form, following_count: e.target.value })} />
            </div>
            <div>
              <Label>Paylaşım</Label>
              <Input type="number" value={form.posts_count} onChange={(e) => setForm({ ...form, posts_count: e.target.value })} />
            </div>
            <div>
              <Label>Etkileşim Oranı (%)</Label>
              <Input type="number" step="0.01" value={form.engagement_rate} onChange={(e) => setForm({ ...form, engagement_rate: e.target.value })} />
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
