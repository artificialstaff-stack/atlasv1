"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ShoppingBag, Star, ExternalLink, TrendingUp } from "lucide-react";

interface MarketplaceAccount {
  id: string;
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
  created_at: string;
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

export function MarketplacesContent({ accounts }: { accounts: MarketplaceAccount[] }) {
  if (accounts.length === 0) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Pazaryerlerim</h1>
          <p className="text-muted-foreground">Amazon, eBay, Walmart ve diğer mağazalarınız</p>
        </div>
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <ShoppingBag className="h-12 w-12 text-muted-foreground/30 mb-4" />
            <h3 className="text-lg font-semibold">Henüz pazaryeri hesabı yok</h3>
            <p className="text-sm text-muted-foreground mt-1">
              Pazaryeri hesaplarınız eklendiğinde burada görünecektir.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const activeCount = accounts.filter((a) => a.status === "active").length;
  const totalRevenue = accounts.reduce((s, a) => s + (a.monthly_revenue || 0), 0);
  const totalListings = accounts.reduce((s, a) => s + (a.total_listings || 0), 0);
  const totalSales = accounts.reduce((s, a) => s + (a.total_sales || 0), 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Pazaryerlerim</h1>
        <p className="text-muted-foreground">Amazon, eBay, Walmart ve diğer mağazalarınız</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{accounts.length}</div>
            <p className="text-xs text-muted-foreground">Toplam Mağaza</p>
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
            <div className="text-2xl font-bold">{totalListings.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">Toplam Ürün</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-primary">
              ${totalRevenue.toLocaleString("en-US", { minimumFractionDigits: 2 })}
            </div>
            <p className="text-xs text-muted-foreground">Aylık Gelir</p>
          </CardContent>
        </Card>
      </div>

      {/* Account Cards */}
      <div className="grid gap-4">
        {accounts.map((account) => (
          <Card key={account.id}>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <ShoppingBag className="h-5 w-5" />
                    {account.store_name}
                  </CardTitle>
                  <CardDescription>
                    {PLATFORMS[account.platform] || account.platform}
                    {account.seller_id && ` • Seller ID: ${account.seller_id}`}
                  </CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={STATUS_COLORS[account.status] || "outline"}>
                    {STATUS_LABELS[account.status] || account.status}
                  </Badge>
                  {account.store_url && (
                    <a
                      href={account.store_url}
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
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {account.seller_rating != null && (
                  <div className="flex items-center gap-2 text-sm">
                    <Star className="h-4 w-4 text-yellow-500" />
                    <span className="font-medium">{account.seller_rating}</span>
                    <span className="text-muted-foreground">Rating</span>
                  </div>
                )}
                <div className="text-sm">
                  <span className="text-muted-foreground">Ürünler: </span>
                  <span className="font-medium">{account.total_listings}</span>
                </div>
                <div className="text-sm">
                  <span className="text-muted-foreground">Satışlar: </span>
                  <span className="font-medium">{account.total_sales}</span>
                </div>
                <div className="flex items-center gap-1 text-sm">
                  <TrendingUp className="h-4 w-4 text-green-500" />
                  <span className="font-medium">
                    ${(account.monthly_revenue || 0).toLocaleString("en-US", { minimumFractionDigits: 2 })}
                  </span>
                  <span className="text-muted-foreground">/ay</span>
                </div>
              </div>
              {account.api_connected && (
                <div className="mt-3">
                  <Badge variant="outline" className="text-green-600 border-green-300">
                    API Bağlı
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
