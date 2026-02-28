"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Share2, Users, Heart, ExternalLink } from "lucide-react";

interface SocialAccount {
  id: string;
  platform: string;
  account_name: string;
  profile_url: string | null;
  status: string;
  followers_count: number;
  following_count: number;
  posts_count: number;
  engagement_rate: number;
  managed_by_us: boolean;
  last_post_at: string | null;
  notes: string | null;
  created_at: string;
}

const PLATFORMS: Record<string, string> = {
  instagram: "Instagram",
  facebook: "Facebook",
  tiktok: "TikTok",
  youtube: "YouTube",
  twitter_x: "X (Twitter)",
  pinterest: "Pinterest",
  linkedin: "LinkedIn",
  snapchat: "Snapchat",
  threads: "Threads",
  other: "Diğer",
};

const STATUS_LABELS: Record<string, string> = {
  pending_setup: "Kurulum Bekleniyor",
  active: "Aktif",
  suspended: "Askıda",
  deactivated: "Deaktif",
};

const STATUS_COLORS: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  active: "default",
  pending_setup: "outline",
  suspended: "destructive",
  deactivated: "destructive",
};

function formatNumber(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + "M";
  if (n >= 1_000) return (n / 1_000).toFixed(1) + "K";
  return n.toString();
}

export function SocialMediaContent({ accounts }: { accounts: SocialAccount[] }) {
  if (accounts.length === 0) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Sosyal Medya</h1>
          <p className="text-muted-foreground">ABD pazarına yönelik sosyal medya hesaplarınız</p>
        </div>
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <Share2 className="h-12 w-12 text-muted-foreground/30 mb-4" />
            <h3 className="text-lg font-semibold">Henüz sosyal medya hesabı yok</h3>
            <p className="text-sm text-muted-foreground mt-1">
              Sosyal medya hesaplarınız eklendiğinde burada görünecektir.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const totalFollowers = accounts.reduce((s, a) => s + (a.followers_count || 0), 0);
  const activeCount = accounts.filter((a) => a.status === "active").length;
  const avgEngagement =
    accounts.length > 0
      ? accounts.reduce((s, a) => s + (a.engagement_rate || 0), 0) / accounts.length
      : 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Sosyal Medya</h1>
        <p className="text-muted-foreground">ABD pazarına yönelik sosyal medya hesaplarınız</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{accounts.length}</div>
            <p className="text-xs text-muted-foreground">Toplam Hesap</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-green-600">{activeCount}</div>
            <p className="text-xs text-muted-foreground">Aktif</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{formatNumber(totalFollowers)}</div>
            <p className="text-xs text-muted-foreground">Toplam Takipçi</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-primary">%{avgEngagement.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">Ort. Etkileşim</p>
          </CardContent>
        </Card>
      </div>

      {/* Account Cards */}
      <div className="grid md:grid-cols-2 gap-4">
        {accounts.map((account) => (
          <Card key={account.id}>
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Share2 className="h-4 w-4" />
                    {account.account_name}
                  </CardTitle>
                  <CardDescription>{PLATFORMS[account.platform] || account.platform}</CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={STATUS_COLORS[account.status] || "outline"}>
                    {STATUS_LABELS[account.status] || account.status}
                  </Badge>
                  {account.profile_url && (
                    <a
                      href={account.profile_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-muted-foreground hover:text-foreground"
                    >
                      <ExternalLink className="h-4 w-4" />
                    </a>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-3 text-sm">
                <div className="flex items-center gap-1.5">
                  <Users className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="font-medium">{formatNumber(account.followers_count)}</span>
                  <span className="text-muted-foreground text-xs">takipçi</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="font-medium">{formatNumber(account.posts_count)}</span>
                  <span className="text-muted-foreground text-xs">paylaşım</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Heart className="h-3.5 w-3.5 text-red-400" />
                  <span className="font-medium">%{(account.engagement_rate || 0).toFixed(2)}</span>
                </div>
              </div>
              {account.managed_by_us && (
                <div className="mt-3">
                  <Badge variant="outline" className="text-primary border-primary/30">
                    Atlas Yönetiminde
                  </Badge>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
