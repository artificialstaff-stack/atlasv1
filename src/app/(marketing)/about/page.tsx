"use client";

import {
  Globe,
  Users,
  Award,
  TrendingUp,
  Package,
  MapPin,
  Target,
  Eye,
  Building2,
  Plane,
  Ship,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { motion, useInView } from "framer-motion";
import { useRef, useEffect, useState } from "react";

const stats = [
  { icon: Users, label: "Aktif Müşteri", value: 100, suffix: "+" },
  { icon: Package, label: "Yönetilen Ürün", value: 5000, suffix: "+" },
  { icon: TrendingUp, label: "Karşılanan Sipariş", value: 10000, suffix: "+" },
  { icon: Globe, label: "Hizmet Yılı", value: 3, suffix: "+" },
];

const timeline = [
  { year: "2023", title: "Kuruluş", desc: "Virginia'da ilk depo ve LLC hizmetleri başlatıldı." },
  { year: "2024", title: "Büyüme", desc: "100+ müşteriye ulaşıldı, Amazon FBA entegrasyonu eklendi." },
  { year: "2025", title: "Genişleme", desc: "Shopify & Walmart desteği, 2. depo planlaması." },
  { year: "2026", title: "Platform", desc: "AI destekli ATLAS Platform lansmanı — uçtan uca otomasyon." },
];

function AnimatedCounter({ target, suffix = "" }: { target: number; suffix?: string }) {
  const [count, setCount] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  const isInView = useInView(ref, { once: true, margin: "-50px" });

  useEffect(() => {
    if (!isInView) return;
    const duration = 2000;
    const start = Date.now();
    const step = () => {
      const elapsed = Date.now() - start;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setCount(Math.floor(eased * target));
      if (progress < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }, [isInView, target]);

  return (
    <span ref={ref}>
      {count.toLocaleString("tr-TR")}{suffix}
    </span>
  );
}

export default function AboutPage() {
  return (
    <div className="pt-24">
      {/* ═══ HERO ═══ */}
      <section className="relative overflow-hidden pb-20">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="orb orb-blue w-[400px] h-[400px] -top-40 right-0 opacity-20" />
          <div className="orb orb-purple w-[300px] h-[300px] bottom-0 -left-20 opacity-15" />
        </div>

        <div className="container mx-auto px-4 md:px-6 relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7 }}
            className="text-center space-y-4 mb-16 max-w-3xl mx-auto"
          >
            <Badge variant="outline" className="border-primary/30 bg-primary/5">
              <Building2 className="mr-2 h-3.5 w-3.5 text-primary" />
              Hakkımızda
            </Badge>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight">
              Türk KOBİ&apos;lerin{" "}
              <span className="text-gradient">ABD Köprüsü</span>
            </h1>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto leading-relaxed">
              ATLAS, Türk girişimcilerin ABD&apos;nin en büyük e-ticaret
              platformlarında başarıyla satış yapmasını sağlayan bir altyapı
              platformudur.
            </p>
          </motion.div>

          {/* Stats */}
          <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
            {stats.map((stat, i) => (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 + i * 0.1, duration: 0.5 }}
              >
                <Card className="border-border/50 hover:border-primary/20 transition-colors group">
                  <CardContent className="flex flex-col items-center text-center p-6 space-y-2">
                    <stat.icon className="h-7 w-7 text-primary group-hover:scale-110 transition-transform" />
                    <div className="text-3xl md:text-4xl font-bold text-gradient">
                      <AnimatedCounter target={stat.value} suffix={stat.suffix} />
                    </div>
                    <div className="text-xs text-muted-foreground">{stat.label}</div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ MISSION & VISION ═══ */}
      <section className="py-20 bg-muted/20">
        <div className="container mx-auto px-4 md:px-6">
          <div className="grid gap-8 md:grid-cols-2">
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
            >
              <Card className="h-full border-border/50 overflow-hidden group hover:border-primary/20 transition-colors">
                <CardContent className="p-8 space-y-4">
                  <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-primary/10">
                    <Target className="h-6 w-6 text-primary" />
                  </div>
                  <h2 className="text-2xl font-bold">Misyonumuz</h2>
                  <p className="text-muted-foreground leading-relaxed">
                    Türk KOBİ&apos;lerin uluslararası ticaret süreçlerindeki
                    karmaşıklığı ortadan kaldırarak ABD pazarına erişimlerini
                    demokratikleştirmek. Şirket kurulumundan sipariş karşılamaya
                    kadar tüm süreçleri tek çatı altında sunarak, işletmelerin
                    asıl güçlerine — ürün geliştirme ve marka oluşturmaya —
                    odaklanmasını sağlamak.
                  </p>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
            >
              <Card className="h-full border-border/50 overflow-hidden group hover:border-primary/20 transition-colors">
                <CardContent className="p-8 space-y-4">
                  <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-secondary/10">
                    <Eye className="h-6 w-6 text-secondary" />
                  </div>
                  <h2 className="text-2xl font-bold">Vizyonumuz</h2>
                  <p className="text-muted-foreground leading-relaxed">
                    Türkiye&apos;nin en büyük sınır ötesi e-ticaret altyapı
                    platformu olmak. Virginia merkezli lojistik ağımızı genişleterek
                    her ölçekteki Türk işletmesinin ABD pazarına sorunsuz erişimini
                    sağlayan güvenilir köprü haline gelmek.
                  </p>
                </CardContent>
              </Card>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ═══ TIMELINE ═══ */}
      <section className="py-20">
        <div className="container mx-auto px-4 md:px-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <Badge variant="outline" className="border-primary/30 bg-primary/5 mb-4">
              <TrendingUp className="mr-2 h-3.5 w-3.5 text-primary" />
              Yolculuğumuz
            </Badge>
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight">
              Büyüme Hikayemiz
            </h2>
          </motion.div>

          <div className="relative max-w-3xl mx-auto">
            <div className="hidden md:block absolute left-1/2 top-0 bottom-0 w-px bg-gradient-to-b from-primary/50 via-primary/20 to-transparent -translate-x-1/2" />

            <div className="space-y-12">
              {timeline.map((item, i) => (
                <motion.div
                  key={item.year}
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.1, duration: 0.5 }}
                  className={`flex gap-8 items-start ${i % 2 === 0 ? "md:flex-row" : "md:flex-row-reverse"} flex-row`}
                >
                  <div className={`flex-1 ${i % 2 === 0 ? "md:text-right" : "md:text-left"}`}>
                    <Card className="border-border/50 hover:border-primary/20 transition-colors inline-block">
                      <CardContent className="p-6">
                        <div className="text-sm font-bold text-primary mb-1">{item.year}</div>
                        <h3 className="text-lg font-semibold mb-1">{item.title}</h3>
                        <p className="text-sm text-muted-foreground">{item.desc}</p>
                      </CardContent>
                    </Card>
                  </div>
                  <div className="hidden md:flex shrink-0 w-4 h-4 rounded-full bg-primary/20 border-2 border-primary mt-6 relative z-10" />
                  <div className="flex-1 hidden md:block" />
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ═══ LOCATION ═══ */}
      <section className="py-20 bg-muted/20">
        <div className="container mx-auto px-4 md:px-6">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="relative rounded-2xl overflow-hidden"
          >
            <div className="absolute inset-0 hero-gradient opacity-50" />
            <div className="relative z-10 p-8 md:p-16 text-center space-y-6">
              <MapPin className="h-10 w-10 text-primary mx-auto" />
              <h2 className="text-3xl md:text-4xl font-bold">Virginia, ABD</h2>
              <p className="text-muted-foreground max-w-2xl mx-auto text-lg leading-relaxed">
                DMV bölgesinde (Washington DC, Maryland, Virginia) konumlanmış
                depomuz, Port of Virginia limanı ve Dulles Uluslararası
                Havaalanı&apos;na yakınlığı sayesinde hızlı tedarik zinciri sunar.
              </p>
              <div className="flex flex-wrap justify-center gap-6 pt-4">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Ship className="h-4 w-4 text-primary" />
                  <span>Port of Virginia — 45 dk</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Plane className="h-4 w-4 text-primary" />
                  <span>Dulles Havaalanı — 30 dk</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Building2 className="h-4 w-4 text-primary" />
                  <span>Washington DC — 20 dk</span>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>
    </div>
  );
}
