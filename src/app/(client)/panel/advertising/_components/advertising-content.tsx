"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Megaphone,
  TrendingUp,
  MousePointerClick,
  Eye,
  DollarSign,
} from "lucide-react";

interface AdCampaign {
  id: string;
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
  created_at: string;
}

const PLATFORMS: Record<string, string> = {
  google_ads: "Google Ads",
  facebook_ads: "Facebook Ads",
  instagram_ads: "Instagram Ads",
  tiktok_ads: "TikTok Ads",
  amazon_ppc: "Amazon PPC",
  walmart_ads: "Walmart Ads",
  ebay_promoted: "eBay Promoted",
  pinterest_ads: "Pinterest Ads",
  youtube_ads: "YouTube Ads",
  snapchat_ads: "Snapchat Ads",
  twitter_ads: "X Ads",
  other: "Diğer",
};

const CAMPAIGN_TYPES: Record<string, string> = {
  awareness: "Bilinirlik",
  traffic: "Trafik",
  conversion: "Dönüşüm",
  retargeting: "Retargeting",
  brand: "Marka",
  other: "Diğer",
};

const STATUS_LABELS: Record<string, string> = {
  draft: "Taslak",
  pending_approval: "Onay Bekleniyor",
  active: "Aktif",
  paused: "Duraklatıldı",
  completed: "Tamamlandı",
  cancelled: "İptal",
};

const STATUS_COLORS: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  active: "default",
  draft: "outline",
  pending_approval: "secondary",
  paused: "secondary",
  completed: "default",
  cancelled: "destructive",
};

function fmtMoney(n: number): string {
  return "$" + n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function fmtNum(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + "M";
  if (n >= 1_000) return (n / 1_000).toFixed(1) + "K";
  return n.toString();
}

export function AdvertisingContent({ campaigns }: { campaigns: AdCampaign[] }) {
  if (campaigns.length === 0) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Reklamlarım</h1>
          <p className="text-muted-foreground">Reklam kampanyalarınızın performansını takip edin</p>
        </div>
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <Megaphone className="h-12 w-12 text-muted-foreground/30 mb-4" />
            <h3 className="text-lg font-semibold">Henüz reklam kampanyası yok</h3>
            <p className="text-sm text-muted-foreground mt-1">
              Reklam kampanyalarınız başladığında burada görünecektir.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const activeCount = campaigns.filter((c) => c.status === "active").length;
  const totalSpent = campaigns.reduce((s, c) => s + (c.spent_amount || 0), 0);
  const totalRevenue = campaigns.reduce((s, c) => s + (c.revenue_generated || 0), 0);
  const overallRoas = totalSpent > 0 ? totalRevenue / totalSpent : 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Reklamlarım</h1>
        <p className="text-muted-foreground">Reklam kampanyalarınızın performansını takip edin</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{campaigns.length}</div>
            <p className="text-xs text-muted-foreground">Toplam Kampanya</p>
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
            <div className="text-2xl font-bold text-red-500">{fmtMoney(totalSpent)}</div>
            <p className="text-xs text-muted-foreground">Toplam Harcama</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-primary">{overallRoas.toFixed(2)}x</div>
            <p className="text-xs text-muted-foreground">ROAS</p>
          </CardContent>
        </Card>
      </div>

      {/* Campaign Cards */}
      <div className="grid gap-4">
        {campaigns.map((campaign) => (
          <Card key={campaign.id}>
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Megaphone className="h-4 w-4" />
                    {campaign.campaign_name}
                  </CardTitle>
                  <CardDescription>
                    {PLATFORMS[campaign.platform] || campaign.platform}
                    {" • "}
                    {CAMPAIGN_TYPES[campaign.campaign_type] || campaign.campaign_type}
                    {campaign.start_date &&
                      ` • ${new Date(campaign.start_date).toLocaleDateString("tr-TR")}`}
                    {campaign.end_date &&
                      ` — ${new Date(campaign.end_date).toLocaleDateString("tr-TR")}`}
                  </CardDescription>
                </div>
                <Badge variant={STATUS_COLORS[campaign.status] || "outline"}>
                  {STATUS_LABELS[campaign.status] || campaign.status}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-sm">
                <div className="flex items-center gap-1.5">
                  <Eye className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="font-medium">{fmtNum(campaign.impressions || 0)}</span>
                  <span className="text-muted-foreground text-xs">gösterim</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <MousePointerClick className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="font-medium">{fmtNum(campaign.clicks || 0)}</span>
                  <span className="text-muted-foreground text-xs">tıklama</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <DollarSign className="h-3.5 w-3.5 text-red-400" />
                  <span className="font-medium">{fmtMoney(campaign.spent_amount || 0)}</span>
                  <span className="text-muted-foreground text-xs">harcama</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <TrendingUp className="h-3.5 w-3.5 text-green-500" />
                  <span className="font-medium">
                    {fmtMoney(campaign.revenue_generated || 0)}
                  </span>
                  <span className="text-muted-foreground text-xs">gelir</span>
                </div>
                <div>
                  <span className="text-muted-foreground text-xs">ROAS: </span>
                  <span className="font-medium">{(campaign.roas || 0).toFixed(2)}x</span>
                  <span className="text-muted-foreground text-xs ml-2">CTR: </span>
                  <span className="font-medium">
                    %{((campaign.ctr || 0) * 100).toFixed(2)}
                  </span>
                </div>
              </div>
              {campaign.total_budget && campaign.spent_amount != null && (
                <div className="mt-3">
                  <div className="flex justify-between text-xs text-muted-foreground mb-1">
                    <span>Bütçe Kullanımı</span>
                    <span>
                      {fmtMoney(campaign.spent_amount)} / {fmtMoney(campaign.total_budget)}
                    </span>
                  </div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary rounded-full transition-all"
                      style={{
                        width: `${Math.min(100, ((campaign.spent_amount || 0) / campaign.total_budget) * 100)}%`,
                      }}
                    />
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
