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
  LayoutDashboard,
  Lock,
} from "lucide-react";
import { motion, useInView } from "framer-motion";
import { cn } from "@/lib/utils";

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
  {
    name: "Amazon",
    svg: (
      <svg viewBox="0 0 603 182" className="h-6 w-auto fill-current">
        <path d="M374.1 142.3c-35.3 26-86.6 39.8-130.8 39.8-61.9 0-117.6-22.9-159.7-60.9-3.3-3-0.3-7.1 3.6-4.8 45.5 26.4 101.7 42.3 159.8 42.3 39.2 0 82.3-8.1 122-25 6-2.5 11 3.9 5.1 8.6z" />
        <path d="M387.4 127.1c-4.5-5.8-29.9-2.8-41.3-1.4-3.5 0.4-4-2.6-0.9-4.8 20.2-14.2 53.4-10.1 57.3-5.3 3.9 4.8-1 37.8-20 53.5-2.9 2.4-5.7 1.1-4.4-2.1 4.3-10.7 13.8-34.2 9.3-39.9z" />
        <path d="M347 23.7V7.1c0-2.5 1.9-4.2 4.2-4.2h74.1c2.4 0 4.3 1.7 4.3 4.2v14.2c0 2.4-2 5.4-5.6 10.4l-38.4 54.8c14.3-0.3 29.4 1.8 42.3 9 2.9 1.6 3.7 4 3.9 6.4v17.7c0 2.4-2.6 5.2-5.4 3.7-22.5-11.8-52.3-13.1-77.2 0.1-2.5 1.4-5.2-1.3-5.2-3.7v-16.8c0-2.7 0-7.2 2.8-11.2l44.5-63.8h-38.7c-2.4 0-4.3-1.7-4.3-4.2h-0.3z" />
        <path d="M124.7 109.4h-22.5c-2.2-0.1-3.9-1.7-4.1-3.8V7.3c0-2.3 1.9-4.1 4.3-4.1h21c2.2 0.1 3.9 1.8 4.1 3.9v13.8h0.4c5.5-13.7 15.9-20.1 29.9-20.1 14.2 0 23.1 6.4 29.5 20.1 5.5-13.7 17.9-20.1 31.4-20.1 9.5 0 19.9 3.9 26.3 12.7 7.2 9.8 5.7 24 5.7 36.5l0 55.3c0 2.3-1.9 4.1-4.3 4.1h-22.5c-2.2-0.2-4-1.9-4-4.1V53.6c0-4.9 0.4-17.2-0.6-21.7-1.7-7.6-6.8-9.8-13.4-9.8-5.5 0-11.3 3.7-13.6 9.6-2.3 5.9-2.1 15.8-2.1 21.9v51.7c0 2.3-1.9 4.1-4.3 4.1h-22.5c-2.2-0.2-4-1.9-4-4.1l-0.1-51.7c0-13 2.1-32.1-14-32.1-16.3 0-15.7 18.6-15.7 32.1v51.7c0 2.3-1.9 4.1-4.3 4.1h-0.2z" />
        <path d="M469 0.9c33.4 0 51.5 28.7 51.5 65.2 0 35.3-20 63.2-51.5 63.2-33 0-51-28.7-51-64.5 0-35.9 18.2-63.9 51-63.9zm0.2 23.6c-16.7 0-17.7 22.7-17.7 36.9 0 14.2-0.2 44.5 17.5 44.5 17.5 0 18.3-24.4 18.3-39.3 0-9.8-0.4-21.5-3.3-30.9-2.5-8.2-7.4-11.2-14.8-11.2z" />
        <path d="M558.5 109.4h-22.4c-2.2-0.2-4-1.9-4-4.1l0-98c0.3-2.1 2.1-3.7 4.3-3.7h20.9c1.9 0.1 3.5 1.5 4 3.3v15h0.4c6.3-13.8 15.1-20.3 30.5-20.3 10.2 0 20.1 3.7 26.5 13.7 5.9 9.3 5.9 24.9 5.9 36.3v54.2c-0.3 2-2.2 3.6-4.3 3.6h-22.6c-2-0.2-3.7-1.7-4-3.6V52c0-12.7 1.5-31.4-14.2-31.4-5.5 0-10.6 3.7-13.1 9.3-3.2 7.1-3.6 14.2-3.6 22.1v53.3c0 2.3-2 4.1-4.3 4.1z" />
      </svg>
    ),
  },
  {
    name: "Shopify",
    svg: (
      <svg viewBox="0 0 446 128" className="h-5 w-auto fill-current">
        <path d="M50.5 18.1c0-0.5-0.4-0.8-0.8-0.8s-6.4-0.5-6.4-0.5-4.3-4.3-4.8-4.7c-0.5-0.5-1.3-0.3-1.7-0.2l-2.3 0.7c-1.4-4-3.8-7.7-8.1-7.7h-0.4c-1.2-1.5-2.7-2.2-3.9-2.2-9.7 0-14.3 12.1-15.8 18.3l-6.8 2.1c-2.1 0.7-2.2 0.7-2.5 2.7L0 98.5l37.8 7.1L63.2 100s-0.1-0.4-0.1-0.5c0.1-81.4 0-81.1-12.6-81.4zm-9.8 3l-3.6 1.1c0-0.2 0-0.5 0-0.7 0-3.3-0.5-5.9-1.2-8 3 0.4 5 3.8 4.8 7.6zm-7.7-6.7c0.8 2 1.3 4.9 1.3 8.8 0 0.2 0 0.3 0 0.5l-7.5 2.3c1.4-5.5 4.2-8.2 6.2-11.6z" />
        <path d="M25.6 5.1c0.3 0 0.5 0 0.8 0.1-1.5 0.7-3.1 2.5-4.6 6.3-1.9 5.8-3.4 9.2-5 10.5l8.3-2.5c0.2-6.8-0.5-11.6 0.5-14.4z" />
        <path d="M37.8 105.6L63.2 100s-0.1-0.4-0.1-0.5V18.1c0-0.5-0.4-0.8-0.8-0.8 0 0-6.4-0.5-6.4-0.5l-5.3-5.2 12.6 93.9z" />
      </svg>
    ),
  },
  {
    name: "FedEx",
    svg: (
      <svg viewBox="0 0 960 274" className="h-5 w-auto">
        <path d="M368 0h181v55H423v53h113v51H423v62h126v53H368V0z" className="fill-current" />
        <path d="M195 274l87-132L195 6h75l51 81 52-81h72L360 139l87 135h-75l-55-87-55 87h-67z" className="fill-current opacity-80" />
        <path d="M0 6h240v55H56v48h136v51H56v114H0V6z" className="fill-current" />
      </svg>
    ),
  },
  {
    name: "UPS",
    svg: (
      <svg viewBox="0 0 200 200" className="h-6 w-auto fill-current">
        <path d="M100 10C50.3 10 10 50.3 10 100s40.3 90 90 90 90-40.3 90-90S149.7 10 100 10zm0 164.4c-41.1 0-74.4-33.3-74.4-74.4S58.9 25.6 100 25.6s74.4 33.3 74.4 74.4-33.3 74.4-74.4 74.4z" />
        <path d="M73 64.5v52c0 13.8 5.2 22.3 20.3 22.3 8 0 14.7-2.8 19.4-9v7.5h14.5V64.5h-15.5v44.8c-2.6 5.3-7.5 9.2-13.3 9.2-6.8 0-10-3.9-10-12.5V64.5H73z" />
      </svg>
    ),
  },
  {
    name: "DHL",
    svg: (
      <svg viewBox="0 0 200 60" className="h-5 w-auto fill-current">
        <path d="M0 40h33.5L26.2 50H0V40z" />
        <path d="M41 40h37l-7.3 10H33.7L41 40z" />
        <path d="M82.3 40H200v10H75L82.3 40z" />
        <path d="M0 20h50.2l-7.3 10H0V20z" />
        <path d="M57.7 20H95l-7.3 10H50.4L57.7 20z" />
        <path d="M99.3 20H200v10H92L99.3 20z" />
        <path d="M0 0h66.8L59.5 10H0V0z" />
        <path d="M74.3 0h37L104 10H67L74.3 0z" />
        <path d="M115.7 0H200v10h-92L115.7 0z" />
      </svg>
    ),
  },
  {
    name: "Walmart",
    svg: (
      <svg viewBox="0 0 200 60" className="h-5 w-auto fill-current">
        <path d="M100 5l8 20h-16l8-20zm0 50l-8-20h16l-8 20zm-15-25l-20-8v16l20-8zm30 0l20 8V22l-20 8z" />
        <text x="20" y="45" className="text-[14px] font-bold fill-current">WALMART</text>
      </svg>
    ),
  },
];

const trustLogoNames = trustLogos.map(l => l.name);

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
              <div className="flex flex-wrap items-center justify-center gap-8 md:gap-12">
                {trustLogos.map((logo) => (
                  <motion.div
                    key={logo.name}
                    whileHover={{ scale: 1.1 }}
                    className="text-muted-foreground/30 hover:text-muted-foreground/60 transition-colors"
                    title={logo.name}
                  >
                    {logo.svg}
                  </motion.div>
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

      {/* ═══ PLATFORM DEMO ═══ */}
      <AnimatedSection className="py-20 relative overflow-hidden">
        <div className="container mx-auto px-4 md:px-6">
          <div className="text-center space-y-4 mb-12">
            <Badge variant="outline" className="border-primary/30 bg-primary/5">
              <LayoutDashboard className="mr-2 h-3.5 w-3.5 text-primary" />
              Platform
            </Badge>
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight">
              Her Şey Tek Panelde
            </h2>
            <p className="text-muted-foreground max-w-xl mx-auto text-lg">
              Ürünlerinizi, siparişlerinizi, stok durumunuzu ve kargo takibinizi
              gerçek zamanlı olarak takip edin.
            </p>
          </div>

          {/* Mock Dashboard Preview */}
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
            className="relative mx-auto max-w-5xl"
          >
            {/* Glow backdrop */}
            <div className="absolute -inset-4 bg-gradient-to-r from-primary/20 via-primary/10 to-accent/20 rounded-3xl blur-2xl opacity-50" />

            {/* Browser Chrome */}
            <div className="relative rounded-2xl border bg-card shadow-2xl overflow-hidden">
              {/* Title bar */}
              <div className="flex items-center gap-2 px-4 py-3 border-b bg-muted/30">
                <div className="flex gap-1.5">
                  <div className="h-3 w-3 rounded-full bg-red-400/60" />
                  <div className="h-3 w-3 rounded-full bg-yellow-400/60" />
                  <div className="h-3 w-3 rounded-full bg-green-400/60" />
                </div>
                <div className="flex-1 flex justify-center">
                  <div className="flex items-center gap-2 rounded-md bg-muted/50 px-4 py-1 text-xs text-muted-foreground">
                    <Lock className="h-3 w-3" />
                    atlas-platform.com/panel/dashboard
                  </div>
                </div>
              </div>

              {/* Dashboard Content Preview */}
              <div className="flex">
                {/* Sidebar mock */}
                <div className="hidden md:flex w-52 shrink-0 flex-col gap-1 border-r bg-card/80 p-3">
                  <div className="flex items-center gap-2 px-3 py-2.5 mb-4">
                    <div className="h-6 w-6 rounded bg-primary/20" />
                    <span className="text-xs font-bold">ATLAS</span>
                  </div>
                  {["Dashboard", "Süreç Takibi", "Ürünlerim", "Siparişlerim", "Raporlar", "Belgelerim", "Ayarlar", "Destek"].map(
                    (item, i) => (
                      <div
                        key={item}
                        className={cn(
                          "flex items-center gap-2 rounded-lg px-3 py-2 text-xs",
                          i === 0
                            ? "bg-primary/10 text-primary font-medium"
                            : "text-muted-foreground"
                        )}
                      >
                        <div
                          className={cn(
                            "h-3.5 w-3.5 rounded",
                            i === 0 ? "bg-primary/30" : "bg-muted"
                          )}
                        />
                        {item}
                      </div>
                    )
                  )}
                </div>

                {/* Main content mock */}
                <div className="flex-1 p-5 space-y-4">
                  {/* Header */}
                  <div className="space-y-1">
                    <div className="h-5 w-24 rounded bg-foreground/10" />
                    <div className="h-3 w-48 rounded bg-muted" />
                  </div>

                  {/* KPI Cards */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {[
                      { label: "Süreç İlerlemesi", val: "%87", accent: true },
                      { label: "Toplam Ürün", val: "248" },
                      { label: "Aktif Sipariş", val: "34" },
                      { label: "US Stok", val: "1,240" },
                    ].map((kpi) => (
                      <div
                        key={kpi.label}
                        className={cn(
                          "rounded-lg border p-3 space-y-1",
                          kpi.accent &&
                            "col-span-2 row-span-2 md:col-span-1 md:row-span-1 bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20"
                        )}
                      >
                        <p className="text-[10px] text-muted-foreground uppercase">
                          {kpi.label}
                        </p>
                        <p
                          className={cn(
                            "text-lg font-bold",
                            kpi.accent && "text-primary"
                          )}
                        >
                          {kpi.val}
                        </p>
                      </div>
                    ))}
                  </div>

                  {/* Chart mock */}
                  <div className="grid grid-cols-3 gap-3">
                    <div className="col-span-2 rounded-lg border p-4">
                      <p className="text-xs text-muted-foreground mb-3">
                        Aylık Sipariş Trendi
                      </p>
                      <div className="flex items-end gap-1.5 h-20">
                        {[35, 50, 45, 65, 55, 80, 70, 90, 85, 95, 88, 100].map(
                          (h, i) => (
                            <motion.div
                              key={i}
                              initial={{ height: 0 }}
                              whileInView={{ height: `${h}%` }}
                              viewport={{ once: true }}
                              transition={{ delay: i * 0.05, duration: 0.4 }}
                              className="flex-1 rounded-sm bg-primary/20"
                            />
                          )
                        )}
                      </div>
                    </div>
                    <div className="rounded-lg border p-4">
                      <p className="text-xs text-muted-foreground mb-3">
                        Son Siparişler
                      </p>
                      <div className="space-y-2">
                        {["Teslim Edildi", "Kargoda", "İşleniyor", "Beklemede"].map(
                          (s) => (
                            <div
                              key={s}
                              className="flex items-center justify-between text-xs"
                            >
                              <span className="text-muted-foreground">{s}</span>
                              <div className="h-1.5 w-1.5 rounded-full bg-primary/50" />
                            </div>
                          )
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
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
