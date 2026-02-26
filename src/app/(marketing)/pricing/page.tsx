import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, ArrowRight } from "lucide-react";
import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Fiyatlandırma",
  description: "ATLAS Platform paket seçenekleri ve fiyatlandırma.",
};

const plans = [
  {
    name: "Başlangıç",
    tier: "starter",
    price: "$499",
    period: "/ay",
    description: "ABD pazarına ilk adım atacak firmalar için.",
    popular: false,
    features: [
      "LLC Kurulumu & EIN Kaydı",
      "Temel gümrük danışmanlığı",
      "50 ürüne kadar depo alanı",
      "Aylık raporlama",
      "E-posta desteği",
    ],
  },
  {
    name: "Büyüme",
    tier: "growth",
    price: "$999",
    period: "/ay",
    description: "Aktif satış yapan ve büyümek isteyen firmalar.",
    popular: true,
    features: [
      "Başlangıç paketindeki tüm özellikler",
      "200 ürüne kadar depo alanı",
      "Amazon FBA entegrasyon desteği",
      "Haftalık raporlama",
      "Öncelikli destek",
      "Sipariş karşılama hizmeti",
    ],
  },
  {
    name: "Profesyonel",
    tier: "professional",
    price: "$1,999",
    period: "/ay",
    description: "Çoklu platformda faaliyet gösteren firmalar.",
    popular: false,
    features: [
      "Büyüme paketindeki tüm özellikler",
      "500 ürüne kadar depo alanı",
      "Amazon + Shopify + Walmart desteği",
      "Özel müşteri temsilcisi",
      "Günlük raporlama",
      "Express kargo seçeneği",
      "Gümrük broker hizmeti",
    ],
  },
  {
    name: "Global Ölçek",
    tier: "global_scale",
    price: "Özel",
    period: "",
    description: "Yüksek hacimli operasyonlar için özel çözüm.",
    popular: false,
    features: [
      "Profesyonel paketindeki tüm özellikler",
      "Sınırsız depo alanı",
      "Tüm pazar yerleri desteği",
      "7/24 özel destek",
      "Özel lojistik çözümleri",
      "API entegrasyon desteği",
      "Stratejik danışmanlık",
    ],
  },
];

export default function PricingPage() {
  return (
    <div className="py-20">
      <div className="container mx-auto px-4">
        {/* Header */}
        <div className="text-center space-y-3 mb-16">
          <h1 className="text-4xl font-bold tracking-tight">
            Şeffaf Fiyatlandırma
          </h1>
          <p className="text-muted-foreground max-w-xl mx-auto text-lg">
            İhtiyacınıza uygun paketi seçin. Gizli ücret yok, taahhüt yok.
          </p>
        </div>

        {/* Plans Grid */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {plans.map((plan) => (
            <Card
              key={plan.tier}
              className={`relative flex flex-col ${
                plan.popular ? "border-primary shadow-lg scale-105" : ""
              }`}
            >
              {plan.popular && (
                <Badge className="absolute -top-3 left-1/2 -translate-x-1/2">
                  En Popüler
                </Badge>
              )}
              <CardHeader>
                <CardTitle className="text-xl">{plan.name}</CardTitle>
                <CardDescription>{plan.description}</CardDescription>
                <div className="pt-4">
                  <span className="text-4xl font-bold">{plan.price}</span>
                  <span className="text-muted-foreground">{plan.period}</span>
                </div>
              </CardHeader>
              <CardContent className="flex-1 flex flex-col justify-between">
                <ul className="space-y-3 mb-6">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-2">
                      <CheckCircle2 className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                      <span className="text-sm">{feature}</span>
                    </li>
                  ))}
                </ul>
                <Button
                  className="w-full"
                  variant={plan.popular ? "default" : "outline"}
                  asChild
                >
                  <Link href="/contact">
                    Başvuru Yap
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
