"use client";

import Link from "next/link";
import { ArrowRight, ExternalLink, ShoppingBag, Star, TrendingUp } from "lucide-react";
import type { CustomerWorkspaceViewModel } from "@/lib/customer-workspace";
import {
  AtlasActionCard,
  AtlasEmptySurface,
  AtlasHeroBoard,
  AtlasInsightCard,
  AtlasSectionPanel,
  AtlasStackGrid,
  AtlasTimelineRail,
} from "@/components/portal/atlas-widget-kit";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

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

const CHANNEL_OPTIONS = [
  {
    title: "Amazon",
    summary: "Hızlı katalog çıkışı ve ilk sipariş için en güçlü başlangıç yolu.",
    tone: "copper" as const,
  },
  {
    title: "Shopify",
    summary: "Kendi mağazanızı ve marka deneyimini daha fazla kontrol etmek için.",
    tone: "emerald" as const,
  },
  {
    title: "Walmart",
    summary: "Ek kanal açılımı ve operasyon genişletme için ikinci faz seçeneği.",
    tone: "cobalt" as const,
  },
];

function accountTone(status: string) {
  if (status === "active") return "success" as const;
  if (status === "under_review" || status === "pending_setup") return "warning" as const;
  if (status === "suspended" || status === "closed") return "danger" as const;
  return "primary" as const;
}

export function MarketplacesContent({
  accounts,
  workspace,
}: {
  accounts: MarketplaceAccount[];
  workspace?: CustomerWorkspaceViewModel;
  accessMode?: "active";
}) {
  const activeCount = accounts.filter((account) => account.status === "active").length;
  const totalRevenue = accounts.reduce((sum, account) => sum + (account.monthly_revenue || 0), 0);
  const totalListings = accounts.reduce((sum, account) => sum + (account.total_listings || 0), 0);
  const selectedChannel = workspace?.selectedMarketplace;

  return (
    <div className="space-y-6">
      <AtlasHeroBoard
        eyebrow="Marketplace Control"
        title="Pazaryerlerim"
        description="Atlas’ın kurduğu seller merkezi, storefront ve approval-ready hesapları bu modülde operasyonel seviyede görünür."
        tone="violet"
        surface="secondary"
        metrics={[
          { label: "Hesap", value: `${accounts.length}`, tone: "primary" },
          { label: "Aktif", value: `${activeCount}`, tone: "success" },
          { label: "Ürün", value: `${totalListings}`, tone: "cobalt" },
          {
            label: "Aylık gelir",
            value: `$${totalRevenue.toLocaleString("en-US", { minimumFractionDigits: 0 })}`,
            tone: "warning",
          },
        ]}
        primaryAction={{ label: "Mağaza modülü", href: "/panel/store" }}
        secondaryAction={{ label: "Destek merkezi", href: "/panel/support", variant: "outline" }}
      >
        <div className="rounded-[1.2rem] border border-white/8 bg-black/20 px-4 py-3 text-sm leading-6 text-slate-300/85">
          Artık kanal seçimi, ödeme ve aktivasyon ayrık kartlar halinde değil; seçili kanal, onay durumu ve açılmış seller hesabı aynı sayfa ailesi içinde okunuyor.
        </div>
      </AtlasHeroBoard>

      {accounts.length === 0 ? (
        <AtlasStackGrid columns="split">
          <AtlasSectionPanel
            eyebrow="Selection State"
            title={selectedChannel ? `${selectedChannel.title} seçimi alındı` : "Kanal seçimi açık"}
            description={
              selectedChannel
                ? workspace?.managementPaymentState === "confirmed"
                  ? "Ödeme onaylandı. Atlas aktivasyon kuyruğuna aldı; seller hesabı bu alanda görünecek."
                  : "Seçim kaydedildi. İlgili aylık yönetim paketi billing alanına düştü."
                : "İlk kanal yönünüzü seçtiğinizde setup ve aylık yönetim paketi aktifleşir."
            }
            badge={selectedChannel ? "Seçim mevcut" : "Henüz seçim yok"}
          >
            <AtlasStackGrid columns="three">
              {CHANNEL_OPTIONS.map((option) => (
                <AtlasInsightCard
                  key={option.title}
                  eyebrow="Primary lane"
                  title={option.title}
                  description={option.summary}
                  tone={option.tone}
                  badge={selectedChannel?.title === option.title ? "Seçildi" : "Hazır"}
                  icon={ShoppingBag}
                />
              ))}
            </AtlasStackGrid>
          </AtlasSectionPanel>

          <AtlasEmptySurface
            title="Henüz açılmış marketplace hesabı yok"
            description={
              selectedChannel
                ? `${selectedChannel.title} için seçim kaydedildi. Yönetim faturası ve admin onayı tamamlanınca seller hesabı burada görünür.`
                : "Amazon, Shopify veya Walmart yönünü seçtiğinizde ilgili seller hesabı ve launch readiness sinyalleri bu modüle düşer."
            }
            tone="violet"
            primaryAction={{ label: "Mağaza ile ilerle", href: "/panel/store" }}
            secondaryAction={{ label: "Faturalar", href: "/panel/billing", variant: "outline" }}
          />
        </AtlasStackGrid>
      ) : (
        <>
          <AtlasSectionPanel
            eyebrow="Account Registry"
            title="Aktif ve kurulmakta olan hesaplar"
            description="Her kart seller health, API bağlantısı, gelir sinyali ve storefront erişimini aynı yüzeyde taşır."
            badge={`${accounts.length} hesap`}
          >
            <AtlasStackGrid columns="three">
              {accounts.map((account) => {
                const timelineItems = [
                  {
                    id: `${account.id}-setup`,
                    title: "Setup durumu",
                    description: STATUS_LABELS[account.status] || account.status,
                    badge: account.api_connected ? "API hazır" : "Manual lane",
                    tone: account.api_connected ? ("success" as const) : ("warning" as const),
                    icon: ShoppingBag,
                  },
                  {
                    id: `${account.id}-catalog`,
                    title: "Katalog hacmi",
                    description: `${account.total_listings} ürün, ${account.total_sales} satış.`,
                    badge: `${account.total_listings} listing`,
                    tone: "cobalt" as const,
                    icon: TrendingUp,
                  },
                  {
                    id: `${account.id}-revenue`,
                    title: "Gelir sinyali",
                    description: `$${(account.monthly_revenue || 0).toLocaleString("en-US", {
                      minimumFractionDigits: 0,
                    })} aylık hacim.`,
                    badge: "Revenue",
                    tone: "success" as const,
                    icon: TrendingUp,
                  },
                ];

                return (
                  <AtlasInsightCard
                    key={account.id}
                    eyebrow={PLATFORMS[account.platform] || account.platform}
                    title={account.store_name}
                    description={`${STATUS_LABELS[account.status] || account.status} durumda. Seller health, storefront erişimi ve operasyon notları aynı kartta tutulur.`}
                    badge={STATUS_LABELS[account.status] || account.status}
                    tone={accountTone(account.status)}
                    icon={ShoppingBag}
                    primaryAction={
                      account.store_url
                        ? { label: "Mağazayı aç", href: account.store_url, icon: ExternalLink }
                        : undefined
                    }
                  >
                    <AtlasStackGrid columns="two">
                      <div className="rounded-[1.15rem] border border-white/8 bg-black/20 p-4">
                        <p className="atlas-kicker">Commerce health</p>
                        <div className="mt-3 space-y-2 text-sm text-slate-300/82">
                          <p>Seller ID: {account.seller_id ?? "Henüz atanmadı"}</p>
                          <p>Rating: {account.seller_rating != null ? `${account.seller_rating}` : "Hazır değil"}</p>
                          <p>API: {account.api_connected ? "Bağlı" : "Bağlı değil"}</p>
                        </div>
                      </div>
                      <div className="rounded-[1.15rem] border border-white/8 bg-black/20 p-4">
                        <p className="atlas-kicker">Ticari sinyal</p>
                        <div className="mt-3 space-y-2 text-sm text-slate-300/82">
                          <p>Ürün: {account.total_listings}</p>
                          <p>Satış: {account.total_sales}</p>
                          <p>Aylık gelir: ${account.monthly_revenue.toLocaleString("en-US", { minimumFractionDigits: 0 })}</p>
                        </div>
                      </div>
                    </AtlasStackGrid>

                    <AtlasTimelineRail items={timelineItems} className="mt-5" />

                    <div className="mt-5 flex flex-wrap gap-2">
                      {account.store_url ? (
                        <Button asChild className="rounded-2xl">
                          <a href={account.store_url} target="_blank" rel="noopener noreferrer">
                            Storefront aç
                            <ExternalLink className="ml-2 h-4 w-4" />
                          </a>
                        </Button>
                      ) : null}
                      <Button asChild variant="outline" className="rounded-2xl border-white/10 bg-white/[0.03]">
                        <Link href="/panel/support">Operasyon notu aç</Link>
                      </Button>
                    </div>

                    {account.notes ? (
                      <div className="mt-5 rounded-[1.2rem] border border-white/8 bg-black/20 p-4 text-sm leading-6 text-slate-300/82">
                        {account.notes}
                      </div>
                    ) : null}
                  </AtlasInsightCard>
                );
              })}
            </AtlasStackGrid>
          </AtlasSectionPanel>

          <AtlasSectionPanel
            eyebrow="Quick Access"
            title="Hızlı erişimler"
            description="Kurulum, destek ve mağaza karar yüzeylerine tek tıkla dönebilirsiniz."
            badge="Operator handoff"
          >
            <AtlasStackGrid columns="three">
              <AtlasActionCard
                title="Mağaza"
                value={selectedChannel?.title ?? "Kanal seç"}
                description="Primary channel ve paket seçim akışına geri dön."
                icon={ArrowRight}
                tone="violet"
                href="/panel/store"
                openLabel="Mağaza modülünü aç"
              />
              <AtlasActionCard
                title="Faturalandırma"
                value={workspace?.managementPaymentState === "confirmed" ? "Onaylı" : "Takip et"}
                description="Aylık yönetim paketinin ödeme ve onay akışını gör."
                icon={TrendingUp}
                tone="cobalt"
                href="/panel/billing"
                openLabel="Faturalara git"
              />
              <AtlasActionCard
                title="Destek"
                value="Atlas ekibi"
                description="Seller hesabı, storefront veya approval soruları için destek thread'i aç."
                icon={ShoppingBag}
                tone="primary"
                href="/panel/support"
                openLabel="Destek aç"
              />
            </AtlasStackGrid>
          </AtlasSectionPanel>
        </>
      )}
    </div>
  );
}
