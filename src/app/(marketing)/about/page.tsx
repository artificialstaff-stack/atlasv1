import { Globe, Users, Award, TrendingUp } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Hakkımızda",
  description: "ATLAS Platform hakkında detaylı bilgi.",
};

const stats = [
  { icon: Users, label: "Aktif Müşteri", value: "100+" },
  { icon: Package, label: "Yönetilen Ürün", value: "5,000+" },
  { icon: TrendingUp, label: "Karşılanan Sipariş", value: "10,000+" },
  { icon: Globe, label: "Hizmet Yılı", value: "3+" },
];

import { Package } from "lucide-react";

export default function AboutPage() {
  return (
    <div className="py-20">
      <div className="container mx-auto px-4">
        {/* Header */}
        <div className="text-center space-y-3 mb-16">
          <h1 className="text-4xl font-bold tracking-tight">Hakkımızda</h1>
          <p className="text-muted-foreground max-w-2xl mx-auto text-lg">
            ATLAS, Türk girişimcilerin ABD&apos;nin en büyük e-ticaret
            platformlarında başarıyla satış yapmasını sağlayan bir altyapı
            platformudur.
          </p>
        </div>

        {/* Stats */}
        <div className="grid gap-6 md:grid-cols-4 mb-16">
          {stats.map((stat) => (
            <Card key={stat.label}>
              <CardContent className="flex flex-col items-center text-center pt-6 space-y-2">
                <stat.icon className="h-8 w-8 text-primary" />
                <div className="text-3xl font-bold">{stat.value}</div>
                <div className="text-sm text-muted-foreground">{stat.label}</div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Misyon */}
        <div className="grid gap-12 md:grid-cols-2 mb-16">
          <div className="space-y-4">
            <h2 className="text-2xl font-bold flex items-center gap-2">
              <Award className="h-6 w-6 text-primary" />
              Misyonumuz
            </h2>
            <p className="text-muted-foreground leading-relaxed">
              Türk KOBİ&apos;lerin uluslararası ticaret süreçlerindeki
              karmaşıklığı ortadan kaldırarak ABD pazarına erişimlerini
              demokratikleştirmek. Şirket kurulumundan sipariş karşılamaya kadar
              tüm süreçleri tek çatı altında sunarak, işletmelerin asıl
              güçlerine — ürün geliştirme ve marka oluşturmaya — odaklanmasını
              sağlamak.
            </p>
          </div>
          <div className="space-y-4">
            <h2 className="text-2xl font-bold flex items-center gap-2">
              <Globe className="h-6 w-6 text-primary" />
              Vizyonumuz
            </h2>
            <p className="text-muted-foreground leading-relaxed">
              Türkiye&apos;nin en büyük sınır ötesi e-ticaret altyapı
              platformu olmak. Virginia merkezli lojistik ağımızı genişleterek
              her ölçekteki Türk işletmesinin ABD pazarına sorunsuz erişimini
              sağlayan güvenilir köprü haline gelmek.
            </p>
          </div>
        </div>

        {/* Konum */}
        <div className="rounded-xl bg-muted/30 p-8 md:p-12 text-center">
          <h2 className="text-2xl font-bold mb-4">Virginia, ABD</h2>
          <p className="text-muted-foreground max-w-xl mx-auto">
            DMV bölgesinde (Washington DC, Maryland, Virginia) konumlanmış
            depomuz, Port of Virginia limanı ve Dulles Uluslararası
            Havaalanı&apos;na yakınlığı sayesinde hızlı tedarik zinciri sunar.
          </p>
        </div>
      </div>
    </div>
  );
}
