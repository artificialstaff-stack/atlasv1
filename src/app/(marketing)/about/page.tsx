"use client";

import { useEffect, useState } from "react";
import { Building2, Eye, Globe, MapPin, Package, Plane, Ship, Target, TrendingUp, Users } from "lucide-react";
import {
  AtlasHeroBoard,
  AtlasInsightCard,
  AtlasSectionPanel,
  AtlasStackGrid,
  AtlasTimelineRail,
} from "@/components/portal/atlas-widget-kit";

const stats = [
  { icon: Users, label: "Aktif Müşteri", value: 100, suffix: "+", tone: "primary" as const },
  { icon: Package, label: "Yönetilen Ürün", value: 5000, suffix: "+", tone: "cobalt" as const },
  { icon: TrendingUp, label: "Karşılanan Sipariş", value: 10000, suffix: "+", tone: "success" as const },
  { icon: Globe, label: "Hizmet Yılı", value: 3, suffix: "+", tone: "warning" as const },
];

const timeline = [
  { year: "2023", title: "Kuruluş", desc: "Virginia'da ilk depo ve LLC hizmetleri başlatıldı." },
  { year: "2024", title: "Büyüme", desc: "100+ müşteriye ulaşıldı, Amazon FBA entegrasyonu eklendi." },
  { year: "2025", title: "Genişleme", desc: "Shopify ve Walmart desteği, ikinci depo planlaması." },
  { year: "2026", title: "Platform", desc: "AI destekli ATLAS Platform ile uçtan uca operasyon görünürlüğü açıldı." },
];

function AnimatedCounter({ target, suffix = "" }: { target: number; suffix?: string }) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    const duration = 1600;
    const start = Date.now();
    const step = () => {
      const elapsed = Date.now() - start;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setCount(Math.floor(eased * target));
      if (progress < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }, [target]);

  return <>{count.toLocaleString("tr-TR")}{suffix}</>;
}

export default function AboutPage() {
  return (
    <div className="space-y-8 pt-24">
      <AtlasHeroBoard
        eyebrow="About Atlas"
        title="Türk KOBİ’lerin ABD operasyon köprüsü"
        description="ATLAS, Türk girişimcilerin ABD pazarına girişini şirket kuruluşundan fulfillment omurgasına kadar tek operasyon sistemi içinde yöneten bir platformdur."
        tone="cobalt"
        metrics={stats.map((stat) => ({
          label: stat.label,
          value: `${stat.value.toLocaleString("tr-TR")}${stat.suffix}`,
          tone: stat.tone,
        }))}
        primaryAction={{ label: "Başvuru yap", href: "/contact?intent=application" }}
        secondaryAction={{ label: "Fiyatlandırma", href: "/pricing", variant: "outline" }}
      >
        <div className="rounded-[1.2rem] border border-white/8 bg-black/20 px-4 py-3 text-sm leading-6 text-slate-300/84">
          Virginia merkezli operasyon yapımız şirket, marketplace, depo ve growth katmanlarını aynı çatıda toplar.
        </div>
      </AtlasHeroBoard>

      <AtlasSectionPanel
        eyebrow="Mission Layer"
        title="Neden varız"
        description="ATLAS yalnızca danışmanlık vermek için değil; ABD operasyon karmaşasını ürüne çevirip Türk satıcıyı komisyon baskısından çıkaracak bir çalışma sistemi kurmak için var."
        badge="Operating thesis"
      >
        <AtlasStackGrid columns="two">
          <AtlasInsightCard
            eyebrow="Misyon"
            title="Karmaşıklığı kaldırmak"
            description="Şirket kurulumundan sipariş karşılamaya kadar tüm sınır ötesi operasyonu tek akışta sunup işletmelerin ürün ve marka tarafına odaklanmasını sağlamak."
            tone="primary"
            icon={Target}
          />
          <AtlasInsightCard
            eyebrow="Vizyon"
            title="ABD operasyon altyapısı"
            description="Virginia merkezli lojistik ve operasyon ağını genişleterek Türkiye’den ABD’ye satış yapan işletmeler için güvenilir ana omurga olmak."
            tone="cobalt"
            icon={Eye}
          />
        </AtlasStackGrid>
      </AtlasSectionPanel>

      <AtlasSectionPanel
        eyebrow="Growth Timeline"
        title="Büyüme hikayesi"
        description="ATLAS’ın kuruluşundan platformlaşmasına kadar olan yol, operasyon kapsamının nasıl büyüdüğünü gösterir."
        badge="2023 → 2026"
      >
        <AtlasTimelineRail
          items={timeline.map((item) => ({
            id: item.year,
            title: `${item.year} · ${item.title}`,
            description: item.desc,
            badge: item.year,
            tone: "cobalt",
            icon: TrendingUp,
          }))}
        />
      </AtlasSectionPanel>

      <AtlasSectionPanel
        eyebrow="Location Proof"
        title="Virginia, ABD"
        description="DMV bölgesindeki konum, liman ve havaalanı yakınlığı sayesinde daha hızlı tedarik zinciri ve fulfillment kabiliyeti sağlar."
        badge="Operations proof"
      >
        <AtlasStackGrid columns="three">
          <AtlasInsightCard
            eyebrow="Hub"
            title="DMV bölgesi"
            description="Washington DC, Maryland ve Virginia hattındaki konumlama sayesinde resmi süreçler ve depo akışı aynı merkezden yönetilir."
            tone="cobalt"
            icon={MapPin}
          />
          <AtlasInsightCard
            eyebrow="Port Access"
            title="Port of Virginia"
            description="Deniz tarafındaki girişler ve inbound freight operasyonları için güçlü başlangıç noktası."
            tone="success"
            icon={Ship}
          />
          <AtlasInsightCard
            eyebrow="Air Access"
            title="Dulles Airport"
            description="Hızlı hava kargo ve acil replenishment akışları için kritik lojistik avantaj."
            tone="warning"
            icon={Plane}
          />
        </AtlasStackGrid>
      </AtlasSectionPanel>

      <AtlasSectionPanel
        eyebrow="Signals"
        title="Ölçek sinyalleri"
        description="Bugün yönetilen hacim, sadece vaat değil, gerçek operator yoğunluğunu ve altyapı ihtiyacını gösterir."
        badge="Live counters"
      >
        <AtlasStackGrid columns="four">
          {stats.map((stat) => (
            <AtlasInsightCard
              key={stat.label}
              eyebrow="Atlas metric"
              title={<AnimatedCounter target={stat.value} suffix={stat.suffix} />}
              description={stat.label}
              tone={stat.tone}
              icon={stat.icon}
            />
          ))}
        </AtlasStackGrid>
      </AtlasSectionPanel>
    </div>
  );
}
