"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, ArrowRight, Sparkles, Zap, Crown, Rocket } from "lucide-react";
import Link from "next/link";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

const plans = [
  {
    name: "Başlangıç",
    tier: "starter",
    icon: Zap,
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
      "Platform erişimi",
    ],
  },
  {
    name: "Büyüme",
    tier: "growth",
    icon: Rocket,
    price: "$999",
    period: "/ay",
    description: "Aktif satış yapan ve büyümek isteyen firmalar.",
    popular: true,
    features: [
      "Başlangıç paketindeki tüm özellikler",
      "200 ürüne kadar depo alanı",
      "Amazon FBA entegrasyon desteği",
      "AI Copilot asistanı",
      "Haftalık raporlama & analytics",
      "Öncelikli destek",
      "Sipariş karşılama hizmeti",
    ],
  },
  {
    name: "Profesyonel",
    tier: "professional",
    icon: Crown,
    price: "$1,999",
    period: "/ay",
    description: "Çoklu platformda faaliyet gösteren firmalar.",
    popular: false,
    features: [
      "Büyüme paketindeki tüm özellikler",
      "500 ürüne kadar depo alanı",
      "Amazon + Shopify + Walmart desteği",
      "Özel müşteri temsilcisi",
      "Günlük raporlama & AI insights",
      "Express kargo seçeneği",
      "Gümrük broker hizmeti",
      "Marketplace optimizasyonu",
    ],
  },
  {
    name: "Kurumsal",
    tier: "enterprise",
    icon: Sparkles,
    price: "Özel",
    period: "",
    description: "Yüksek hacimli operasyonlar için özel çözüm.",
    popular: false,
    features: [
      "Profesyonel paketindeki tüm özellikler",
      "Sınırsız depo alanı",
      "Tüm pazar yerleri desteği",
      "7/24 dedicated destek hattı",
      "Özel lojistik çözümleri",
      "API entegrasyon desteği",
      "Stratejik danışmanlık",
      "SLA garantisi",
    ],
  },
];

const faqs = [
  {
    q: "Taahhüt var mı?",
    a: "Hayır. Aylık abonelik modeli ile istediğiniz zaman iptal edebilirsiniz.",
  },
  {
    q: "Hangi pazar yerlerini destekliyorsunuz?",
    a: "Amazon, Shopify, Walmart ve eBay dahil tüm büyük ABD pazar yerlerini destekliyoruz.",
  },
  {
    q: "LLC kurulumu ne kadar sürer?",
    a: "Genellikle 3-5 iş günü içinde tamamlanır. EIN kaydı ek 1-2 iş günü sürebilir.",
  },
  {
    q: "Mevcut şirketimi kullanabilir miyim?",
    a: "Evet, mevcut ABD LLC'niz varsa doğrudan depo ve lojistik hizmetlerimizden faydalanabilirsiniz.",
  },
];

export default function PricingPage() {
  return (
    <div className="pt-24">
      {/* ═══ HEADER ═══ */}
      <section className="relative overflow-hidden pb-20">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="orb orb-blue w-[400px] h-[400px] -top-40 left-1/4 opacity-20" />
          <div className="orb orb-purple w-[300px] h-[300px] top-10 right-0 opacity-15" />
        </div>

        <div className="container mx-auto px-4 md:px-6 relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7 }}
            className="text-center space-y-4 mb-16 max-w-3xl mx-auto"
          >
            <Badge variant="outline" className="border-primary/30 bg-primary/5">
              <Sparkles className="mr-2 h-3.5 w-3.5 text-primary" />
              Fiyatlandırma
            </Badge>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight">
              Şeffaf{" "}
              <span className="text-gradient">Fiyatlandırma</span>
            </h1>
            <p className="text-lg text-muted-foreground max-w-xl mx-auto">
              İhtiyacınıza uygun paketi seçin. Gizli ücret yok, taahhüt yok.
            </p>
          </motion.div>

          {/* Plans Grid */}
          <div className="grid gap-4 md:gap-6 md:grid-cols-2 lg:grid-cols-4">
            {plans.map((plan, i) => (
              <motion.div
                key={plan.tier}
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 + i * 0.1, duration: 0.5 }}
              >
                <Card
                  className={cn(
                    "relative flex flex-col h-full border-border/50 overflow-hidden transition-all duration-300",
                    plan.popular
                      ? "border-primary/50 shadow-lg shadow-primary/10 scale-[1.02]"
                      : "hover:border-primary/20"
                  )}
                >
                  {plan.popular && (
                    <>
                      <div className="absolute inset-0 bg-gradient-to-b from-primary/5 to-transparent" />
                      <Badge className="absolute -top-0 left-1/2 -translate-x-1/2 translate-y-2 z-10 shadow-sm">
                        En Popüler
                      </Badge>
                    </>
                  )}
                  <CardContent className={cn("relative flex flex-col flex-1 p-6", plan.popular && "pt-10")}>
                    <div className="space-y-4 mb-6">
                      <div className="inline-flex items-center justify-center w-10 h-10 rounded-xl bg-primary/10">
                        <plan.icon className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold">{plan.name}</h3>
                        <p className="text-xs text-muted-foreground mt-1">
                          {plan.description}
                        </p>
                      </div>
                      <div className="pt-2">
                        <span className="text-4xl font-bold">{plan.price}</span>
                        <span className="text-muted-foreground text-sm">
                          {plan.period}
                        </span>
                      </div>
                    </div>

                    <ul className="space-y-3 flex-1 mb-6">
                      {plan.features.map((feature) => (
                        <li key={feature} className="flex items-start gap-2.5">
                          <CheckCircle2 className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                          <span className="text-sm text-muted-foreground">
                            {feature}
                          </span>
                        </li>
                      ))}
                    </ul>

                    <Button
                      className={cn(
                        "w-full group",
                        plan.popular
                          ? "shadow-md shadow-primary/20"
                          : ""
                      )}
                      variant={plan.popular ? "default" : "outline"}
                      asChild
                    >
                      <Link href="/contact">
                        Başvuru Yap
                        <ArrowRight className="ml-2 h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
                      </Link>
                    </Button>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ FAQ ═══ */}
      <section className="py-20 bg-muted/20">
        <div className="container mx-auto px-4 md:px-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-12"
          >
            <h2 className="text-3xl font-bold tracking-tight mb-2">
              Sıkça Sorulan Sorular
            </h2>
            <p className="text-muted-foreground">
              Hâlâ sorunuz var mı?{" "}
              <Link href="/contact" className="text-primary hover:underline">
                Bize ulaşın
              </Link>
            </p>
          </motion.div>

          <div className="grid gap-4 md:grid-cols-2 max-w-4xl mx-auto">
            {faqs.map((faq, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.08, duration: 0.4 }}
              >
                <Card className="border-border/50 hover:border-primary/20 transition-colors">
                  <CardContent className="p-6">
                    <h3 className="font-semibold text-sm mb-2">{faq.q}</h3>
                    <p className="text-sm text-muted-foreground">{faq.a}</p>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
