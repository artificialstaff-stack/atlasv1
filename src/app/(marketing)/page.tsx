"use client";

import Link from "next/link";
import { useRef, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Globe,
  Package,
  FileText,
  ShoppingCart,
  Truck,
  Shield,
  ArrowRight,
  CheckCircle2,
  Sparkles,
  Zap,
  BarChart3,
  Users,
  Star,
} from "lucide-react";
import { motion, useInView } from "framer-motion";

/* ─── Data ─── */
const services = [
  {
    icon: FileText,
    title: "LLC Kurulumu",
    description:
      "ABD'de şirket kurulumu ve EIN kaydı işlemlerini sizin adınıza yönetiyoruz.",
    gradient: "from-blue-500/10 to-purple-500/10",
  },
  {
    icon: Shield,
    title: "Gümrük İşlemleri",
    description:
      "Ürünlerinizin ABD'ye sorunsuz girişi için tüm gümrük prosedürlerini yürütüyoruz.",
    gradient: "from-purple-500/10 to-pink-500/10",
  },
  {
    icon: Package,
    title: "Depo & Stok Yönetimi",
    description: "Virginia'daki depomuzda ürünlerinizi güvenle depoluyoruz.",
    gradient: "from-teal-500/10 to-cyan-500/10",
  },
  {
    icon: ShoppingCart,
    title: "Pazar Yeri Entegrasyonu",
    description:
      "Amazon, Shopify, Walmart gibi platformlara mağaza kurulum desteği.",
    gradient: "from-orange-500/10 to-amber-500/10",
  },
  {
    icon: Truck,
    title: "Sipariş Karşılama",
    description:
      "Gelen siparişleri paketleyip müşterilerinize hızla ulaştırıyoruz.",
    gradient: "from-green-500/10 to-emerald-500/10",
  },
  {
    icon: Globe,
    title: "Uçtan Uca Destek",
    description:
      "Tüm sürecinizi şeffaf biçimde yönetim panelinizden izleyebilirsiniz.",
    gradient: "from-blue-500/10 to-teal-500/10",
  },
];

const processSteps = [
  {
    step: "01",
    title: "Başvuru",
    description: "Formu doldurun, uzman ekibimiz sizinle iletişime geçsin.",
  },
  {
    step: "02",
    title: "LLC & EIN",
    description: "ABD'de şirketinizi kurar ve vergi numaranızı alırız.",
  },
  {
    step: "03",
    title: "Mağaza Kurulumu",
    description: "Amazon, Shopify veya Walmart'ta mağazanızı açarız.",
  },
  {
    step: "04",
    title: "Depoya Gönderim",
    description: "Ürünlerinizi Virginia depomuzda teslim alır ve depolarız.",
  },
  {
    step: "05",
    title: "Satış & Karşılama",
    description: "Siparişler gelir, biz paketler ve müşteriye ulaştırırız.",
  },
];

const stats = [
  { value: 100, suffix: "+", label: "Aktif Müşteri", icon: Users },
  { value: 5000, suffix: "+", label: "Yönetilen Ürün", icon: Package },
  { value: 10000, suffix: "+", label: "Karşılanan Sipariş", icon: ShoppingCart },
  { value: 99, suffix: "%", label: "Müşteri Memnuniyeti", icon: Star },
];

const testimonials = [
  {
    name: "Ahmet Yılmaz",
    role: "CEO, TechTR Export",
    text: "ATLAS sayesinde Amazon'da ilk satışımızı 3 hafta içinde gerçekleştirdik. Tüm süreçler şeffaf ve profesyonel.",
    avatar: "AY",
  },
  {
    name: "Elif Demir",
    role: "Kurucu, Anatolian Crafts",
    text: "Gümrük ve lojistik konusunda hiç tecrübemiz yoktu. ATLAS her şeyi bizim için halletti.",
    avatar: "ED",
  },
  {
    name: "Burak Kaya",
    role: "COO, IstanbulGoods",
    text: "Virginia deposu harika çalışıyor. Siparişler aynı gün kargoya veriliyor, müşteri puanımız yükseldi.",
    avatar: "BK",
  },
];

const trustLogos = [
  "Amazon", "Shopify", "Walmart", "FedEx", "UPS", "DHL"
];

/* ─── Animated Counter ─── */
function AnimatedCounter({
  target,
  suffix = "",
}: {
  target: number;
  suffix?: string;
}) {
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
      {count.toLocaleString("tr-TR")}
      {suffix}
    </span>
  );
}

/* ─── Section Wrapper ─── */
function AnimatedSection({
  children,
  className = "",
  delay = 0,
}: {
  children: React.ReactNode;
  className?: string;
  delay?: number;
}) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-80px" });

  return (
    <motion.section
      ref={ref}
      initial={{ opacity: 0, y: 40 }}
      animate={isInView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.7, delay, ease: [0.25, 0.46, 0.45, 0.94] }}
      className={className}
    >
      {children}
    </motion.section>
  );
}

/* ─── Page ─── */
export default function HomePage() {
  return (
    <>
      {/* ═══ HERO ═══ */}
      <section className="relative min-h-[90vh] flex items-center overflow-hidden">
        {/* Animated orbs */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="orb orb-blue w-[500px] h-[500px] -top-40 -left-20" />
          <div className="orb orb-purple w-[400px] h-[400px] top-20 right-0" />
          <div className="orb orb-teal w-[350px] h-[350px] bottom-0 left-1/3" />
        </div>

        {/* Grid pattern overlay */}
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage:
              "linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)",
            backgroundSize: "60px 60px",
          }}
        />

        <div className="container mx-auto px-4 md:px-6 relative z-10 pt-24">
          <div className="mx-auto max-w-4xl text-center space-y-8">
            {/* Badge */}
            <motion.div
              initial={{ opacity: 0, y: 20, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ duration: 0.5 }}
            >
              <Badge
                variant="outline"
                className="px-4 py-1.5 text-sm border-primary/30 bg-primary/5"
              >
                <Sparkles className="mr-2 h-3.5 w-3.5 text-primary" />
                Türk KOBİ&apos;ler için ABD pazarı kapısı
              </Badge>
            </motion.div>

            {/* Headline */}
            <motion.h1
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.1 }}
              className="text-5xl font-bold tracking-tight sm:text-6xl md:text-7xl lg:text-8xl leading-[0.95]"
            >
              ABD Pazarına Giriş
              <br />
              <span className="text-gradient">Artık Çok Kolay</span>
            </motion.h1>

            {/* Subtitle */}
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.25 }}
              className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed"
            >
              LLC kurulumundan sipariş karşılamaya kadar tüm süreçleri tek
              platform üzerinden yönetin. Virginia merkezli depomuzla
              ürünleriniz Amerika&apos;ya ulaşsın.
            </motion.p>

            {/* CTA Buttons */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.4 }}
              className="flex flex-col sm:flex-row gap-4 justify-center"
            >
              <Button
                size="lg"
                className="h-12 px-8 text-base group shadow-lg shadow-primary/25"
                asChild
              >
                <Link href="/contact">
                  Ücretsiz Başvuru Yap
                  <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
                </Link>
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="h-12 px-8 text-base"
                asChild
              >
                <Link href="/pricing">Paketleri İncele</Link>
              </Button>
            </motion.div>

            {/* Trust Logos */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.6, delay: 0.6 }}
              className="pt-8 border-t border-border/50 mt-12"
            >
              <p className="text-xs text-muted-foreground/60 mb-4 uppercase tracking-wider">
                Entegrasyon Ortaklarımız
              </p>
              <div className="flex flex-wrap items-center justify-center gap-6 md:gap-10">
                {trustLogos.map((logo) => (
                  <span
                    key={logo}
                    className="text-sm font-semibold text-muted-foreground/40 hover:text-muted-foreground/70 transition-colors"
                  >
                    {logo}
                  </span>
                ))}
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ═══ STATS ═══ */}
      <AnimatedSection className="py-20 relative">
        <div className="container mx-auto px-4 md:px-6">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
            {stats.map((stat, i) => (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1, duration: 0.5 }}
              >
                <Card className="relative overflow-hidden group hover:border-primary/30 transition-colors">
                  <CardContent className="p-6 text-center space-y-2">
                    <stat.icon className="h-6 w-6 text-primary mx-auto mb-2 group-hover:scale-110 transition-transform" />
                    <div className="text-3xl md:text-4xl font-bold text-gradient">
                      <AnimatedCounter
                        target={stat.value}
                        suffix={stat.suffix}
                      />
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {stat.label}
                    </p>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </AnimatedSection>

      {/* ═══ SERVICES ═══ */}
      <AnimatedSection className="py-20 relative">
        <div className="container mx-auto px-4 md:px-6">
          <div className="text-center space-y-4 mb-16">
            <Badge variant="outline" className="border-primary/30 bg-primary/5">
              <Zap className="mr-2 h-3.5 w-3.5 text-primary" />
              Hizmetler
            </Badge>
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight">
              Uçtan Uca Hizmetlerimiz
            </h2>
            <p className="text-muted-foreground max-w-xl mx-auto text-lg">
              Türkiye&apos;den Amerika&apos;ya uzanan yolculuğunuzun her
              adımında yanınızdayız.
            </p>
          </div>

          <div className="grid gap-4 md:gap-6 md:grid-cols-2 lg:grid-cols-3">
            {services.map((service, i) => (
              <motion.div
                key={service.title}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.08, duration: 0.5 }}
              >
                <Card className="group h-full relative overflow-hidden border-border/50 hover:border-primary/30 transition-all duration-300 hover:shadow-lg hover:shadow-primary/5">
                  <div
                    className={`absolute inset-0 bg-gradient-to-br ${service.gradient} opacity-0 group-hover:opacity-100 transition-opacity duration-300`}
                  />
                  <CardContent className="relative p-6 space-y-4">
                    <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-primary/10 group-hover:bg-primary/20 transition-colors">
                      <service.icon className="h-6 w-6 text-primary" />
                    </div>
                    <h3 className="text-lg font-semibold">{service.title}</h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      {service.description}
                    </p>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </AnimatedSection>

      {/* ═══ PROCESS ═══ */}
      <AnimatedSection className="py-20 bg-muted/20 relative overflow-hidden">
        <div className="container mx-auto px-4 md:px-6">
          <div className="text-center space-y-4 mb-16">
            <Badge variant="outline" className="border-primary/30 bg-primary/5">
              <BarChart3 className="mr-2 h-3.5 w-3.5 text-primary" />
              Nasıl Çalışır?
            </Badge>
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight">
              5 Adımda ABD Pazarı
            </h2>
          </div>

          <div className="relative max-w-4xl mx-auto">
            {/* Connecting line */}
            <div className="hidden md:block absolute left-8 top-0 bottom-0 w-px bg-gradient-to-b from-primary/50 via-primary/20 to-transparent" />

            <div className="space-y-8">
              {processSteps.map((step, i) => (
                <motion.div
                  key={step.step}
                  initial={{ opacity: 0, x: -30 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.12, duration: 0.5 }}
                  className="flex gap-6 items-start group"
                >
                  <div className="relative shrink-0">
                    <div className="w-16 h-16 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center group-hover:bg-primary/20 group-hover:border-primary/40 transition-all duration-300">
                      <span className="text-lg font-bold text-primary">
                        {step.step}
                      </span>
                    </div>
                  </div>
                  <div className="pt-2">
                    <h3 className="text-xl font-semibold mb-1">
                      {step.title}
                    </h3>
                    <p className="text-muted-foreground">
                      {step.description}
                    </p>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </AnimatedSection>

      {/* ═══ WHY ATLAS ═══ */}
      <AnimatedSection className="py-20">
        <div className="container mx-auto px-4 md:px-6">
          <div className="grid gap-12 lg:grid-cols-2 items-center">
            <div className="space-y-8">
              <div>
                <Badge
                  variant="outline"
                  className="border-primary/30 bg-primary/5 mb-4"
                >
                  Neden Biz?
                </Badge>
                <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-4">
                  ABD Pazarında Güvenilir Ortağınız
                </h2>
                <p className="text-lg text-muted-foreground">
                  ATLAS, Türk KOBİ&apos;lerin ABD pazarına en hızlı ve güvenli
                  şekilde ulaşmaları için tasarlanmıştır.
                </p>
              </div>
              <ul className="space-y-4">
                {[
                  "Virginia merkezli fiziksel depo",
                  "LLC kurulumundan siparişe kadar tüm süreçler",
                  "Gerçek zamanlı süreç takip paneli",
                  "Amazon FBA, Shopify, Walmart desteği",
                  "Adanmış müşteri temsilcisi",
                  "Şeffaf fiyatlandırma — gizli ücret yok",
                ].map((item, i) => (
                  <motion.li
                    key={item}
                    initial={{ opacity: 0, x: -20 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: i * 0.08 }}
                    className="flex items-center gap-3 group"
                  >
                    <div className="shrink-0 w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                      <CheckCircle2 className="h-4 w-4 text-primary" />
                    </div>
                    <span className="text-sm md:text-base">{item}</span>
                  </motion.li>
                ))}
              </ul>
              <Button size="lg" className="group" asChild>
                <Link href="/contact">
                  Hemen Başla
                  <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
                </Link>
              </Button>
            </div>

            {/* Visual side */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.7 }}
              className="relative"
            >
              <div className="rounded-2xl bg-gradient-to-br from-primary/10 via-secondary/5 to-accent/10 p-8 md:p-12 border border-primary/10 relative overflow-hidden">
                <div className="absolute inset-0 noise opacity-50" />
                <div className="relative space-y-6">
                  {/* Mock dashboard preview */}
                  <div className="flex items-center gap-3 mb-8">
                    <div className="w-3 h-3 rounded-full bg-destructive/60" />
                    <div className="w-3 h-3 rounded-full bg-warning/60" />
                    <div className="w-3 h-3 rounded-full bg-success/60" />
                    <span className="text-xs text-muted-foreground ml-2">
                      atlas-platform.com/panel
                    </span>
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    {[
                      { label: "Siparişler", value: "247" },
                      { label: "Gelir", value: "$48.2K" },
                      { label: "Ürünler", value: "1,204" },
                    ].map((item) => (
                      <div
                        key={item.label}
                        className="glass rounded-xl p-3 text-center"
                      >
                        <div className="text-lg font-bold">{item.value}</div>
                        <div className="text-[10px] text-muted-foreground">
                          {item.label}
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="glass rounded-xl p-4">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-xs font-medium">
                        Sipariş Trendi
                      </span>
                      <span className="text-xs text-success">+23%</span>
                    </div>
                    <div className="flex items-end gap-1 h-16">
                      {[40, 55, 35, 65, 50, 80, 70, 90, 85, 95, 75, 100].map(
                        (h, i) => (
                          <motion.div
                            key={i}
                            initial={{ height: 0 }}
                            whileInView={{ height: `${h}%` }}
                            viewport={{ once: true }}
                            transition={{ delay: 0.5 + i * 0.05, duration: 0.4 }}
                            className="flex-1 rounded-sm bg-primary/40"
                          />
                        )
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </AnimatedSection>

      {/* ═══ TESTIMONIALS ═══ */}
      <AnimatedSection className="py-20 bg-muted/20">
        <div className="container mx-auto px-4 md:px-6">
          <div className="text-center space-y-4 mb-16">
            <Badge variant="outline" className="border-primary/30 bg-primary/5">
              <Star className="mr-2 h-3.5 w-3.5 text-primary" />
              Müşteri Yorumları
            </Badge>
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight">
              Müşterilerimiz Ne Diyor?
            </h2>
          </div>

          <div className="grid gap-6 md:grid-cols-3">
            {testimonials.map((t, i) => (
              <motion.div
                key={t.name}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1, duration: 0.5 }}
              >
                <Card className="h-full border-border/50 hover:border-primary/20 transition-colors">
                  <CardContent className="p-6 space-y-4">
                    {/* Stars */}
                    <div className="flex gap-0.5">
                      {Array.from({ length: 5 }).map((_, j) => (
                        <Star
                          key={j}
                          className="h-4 w-4 fill-primary text-primary"
                        />
                      ))}
                    </div>
                    <p className="text-sm text-muted-foreground leading-relaxed italic">
                      &ldquo;{t.text}&rdquo;
                    </p>
                    <div className="flex items-center gap-3 pt-2 border-t border-border/50">
                      <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary">
                        {t.avatar}
                      </div>
                      <div>
                        <div className="text-sm font-medium">{t.name}</div>
                        <div className="text-xs text-muted-foreground">
                          {t.role}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </AnimatedSection>

      {/* ═══ CTA ═══ */}
      <AnimatedSection className="py-24">
        <div className="container mx-auto px-4 md:px-6">
          <div className="relative rounded-3xl overflow-hidden">
            {/* Background */}
            <div className="absolute inset-0 hero-gradient" />
            <div className="absolute inset-0 noise" />

            <div className="relative z-10 text-center py-16 md:py-24 px-6 space-y-6">
              <h2 className="text-3xl md:text-5xl font-bold tracking-tight">
                ABD Pazarına Açılmaya
                <br />
                <span className="text-gradient">Hazır mısınız?</span>
              </h2>
              <p className="text-lg text-muted-foreground max-w-lg mx-auto">
                Uzman ekibimiz sizinle iletişime geçerek ihtiyaçlarınıza en
                uygun paketi belirlesin.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button
                  size="lg"
                  className="h-12 px-8 text-base shadow-lg shadow-primary/25 group"
                  asChild
                >
                  <Link href="/contact">
                    Ücretsiz Danışmanlık Al
                    <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
                  </Link>
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  className="h-12 px-8 text-base"
                  asChild
                >
                  <Link href="/pricing">Fiyatları Gör</Link>
                </Button>
              </div>
            </div>
          </div>
        </div>
      </AnimatedSection>
    </>
  );
}
