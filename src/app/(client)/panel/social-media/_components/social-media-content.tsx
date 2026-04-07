"use client";

import { ExternalLink, Heart, Share2, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  AtlasEmptySurface,
  AtlasHeroBoard,
  AtlasInsightCard,
  AtlasSectionPanel,
  AtlasStackGrid,
  AtlasTimelineRail,
} from "@/components/portal/atlas-widget-kit";

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

function formatNumber(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return `${n}`;
}

function accountTone(status: string) {
  if (status === "active") return "success" as const;
  if (status === "pending_setup") return "warning" as const;
  if (status === "suspended" || status === "deactivated") return "danger" as const;
  return "primary" as const;
}

export function SocialMediaContent({ accounts }: { accounts: SocialAccount[] }) {
  const totalFollowers = accounts.reduce((sum, account) => sum + (account.followers_count || 0), 0);
  const activeCount = accounts.filter((account) => account.status === "active").length;
  const avgEngagement =
    accounts.length > 0
      ? accounts.reduce((sum, account) => sum + (account.engagement_rate || 0), 0) / accounts.length
      : 0;

  return (
    <div className="space-y-6">
      <AtlasHeroBoard
        eyebrow="Demand Layer"
        title="Sosyal Medya"
        description="ABD pazarına dönük sosyal medya hesapları, büyüme sinyalleri ve Atlas yönetimindeki kanallar bu modülde tutulur."
        tone="violet"
        surface="secondary"
        metrics={[
          { label: "Hesap", value: `${accounts.length}`, tone: "primary" },
          { label: "Aktif", value: `${activeCount}`, tone: "success" },
          { label: "Takipçi", value: formatNumber(totalFollowers), tone: "violet" },
          { label: "Ort. etkileşim", value: `%${avgEngagement.toFixed(2)}`, tone: "warning" },
        ]}
        primaryAction={{ label: "Hizmetler", href: "/panel/services" }}
        secondaryAction={{ label: "Destek merkezi", href: "/panel/support", variant: "outline" }}
      >
        <div className="rounded-[1.2rem] border border-white/8 bg-black/20 px-4 py-3 text-sm leading-6 text-slate-300/85">
          Sosyal medya modülü artık yalnızca hesap listesi değil; hesap health, engagement ve Atlas yönetim durumunu aynı yüzeyde toplar.
        </div>
      </AtlasHeroBoard>

      {accounts.length === 0 ? (
        <AtlasEmptySurface
          title="Henüz sosyal medya hesabı yok"
          description="Sosyal medya hizmeti açıldığında hesaplar, engagement ve campaign readiness kartları burada görünür."
          tone="violet"
          primaryAction={{ label: "Hizmet paketlerini aç", href: "/panel/services" }}
          secondaryAction={{ label: "Destek ile ilerle", href: "/panel/support", variant: "outline" }}
        />
      ) : (
        <AtlasSectionPanel
          eyebrow="Account Cluster"
          title="Sosyal hesaplar"
          description="Her kart platform tipi, audience büyüklüğü, paylaşım hacmi ve Atlas yönetim sinyalini birlikte taşır."
          badge={`${accounts.length} hesap`}
        >
          <AtlasStackGrid columns="two">
            {accounts.map((account) => {
              const timelineItems = [
                {
                  id: `${account.id}-audience`,
                  title: "Audience",
                  description: `${formatNumber(account.followers_count)} takipçi, ${formatNumber(account.following_count)} takip.`,
                  badge: formatNumber(account.followers_count),
                  tone: "violet" as const,
                  icon: Users,
                },
                {
                  id: `${account.id}-content`,
                  title: "Content cadence",
                  description: `${formatNumber(account.posts_count)} paylaşım ve %${(account.engagement_rate || 0).toFixed(2)} etkileşim.`,
                  badge: `${account.posts_count} post`,
                  tone: "primary" as const,
                  icon: Share2,
                },
                {
                  id: `${account.id}-management`,
                  title: "Atlas yönetimi",
                  description: account.managed_by_us
                    ? "Bu hesap Atlas tarafından yönetiliyor."
                    : "Hesap müşteriye ait ama destek akışına bağlı.",
                  badge: account.managed_by_us ? "Managed" : "Observed",
                  tone: account.managed_by_us ? ("success" as const) : ("warning" as const),
                  icon: Heart,
                },
              ];

              return (
                <AtlasInsightCard
                  key={account.id}
                  eyebrow={PLATFORMS[account.platform] || account.platform}
                  title={account.account_name}
                  description={`${STATUS_LABELS[account.status] || account.status} durumda. Audience, cadence ve operator handoff tek kartta görünür.`}
                  badge={STATUS_LABELS[account.status] || account.status}
                  tone={accountTone(account.status)}
                  icon={Share2}
                >
                  <AtlasStackGrid columns="three">
                    <div className="rounded-[1.15rem] border border-white/8 bg-black/20 p-4">
                      <p className="atlas-kicker">Takipçi</p>
                      <p className="mt-3 text-2xl font-semibold text-white">{formatNumber(account.followers_count)}</p>
                    </div>
                    <div className="rounded-[1.15rem] border border-white/8 bg-black/20 p-4">
                      <p className="atlas-kicker">Paylaşım</p>
                      <p className="mt-3 text-2xl font-semibold text-white">{formatNumber(account.posts_count)}</p>
                    </div>
                    <div className="rounded-[1.15rem] border border-white/8 bg-black/20 p-4">
                      <p className="atlas-kicker">Engagement</p>
                      <p className="mt-3 text-2xl font-semibold text-white">%{(account.engagement_rate || 0).toFixed(2)}</p>
                    </div>
                  </AtlasStackGrid>

                  <AtlasTimelineRail items={timelineItems} className="mt-5" />

                  <div className="mt-5 flex flex-wrap gap-2">
                    {account.profile_url ? (
                      <Button asChild className="rounded-2xl">
                        <a href={account.profile_url} target="_blank" rel="noopener noreferrer">
                          Profili aç
                          <ExternalLink className="ml-2 h-4 w-4" />
                        </a>
                      </Button>
                    ) : null}
                    <Badge variant="outline" className="border-white/10 bg-white/[0.03]">
                      {account.managed_by_us ? "Atlas Yönetiminde" : "Müşteri hesabı"}
                    </Badge>
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
      )}
    </div>
  );
}
