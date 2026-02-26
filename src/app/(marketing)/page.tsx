import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Globe,
  Package,
  FileText,
  ShoppingCart,
  Truck,
  Shield,
  ArrowRight,
  CheckCircle2,
} from "lucide-react";

const services = [
  {
    icon: FileText,
    title: "LLC Kurulumu",
    description: "ABD'de şirket kurulumu ve EIN kaydı işlemlerini sizin adınıza yönetiyoruz.",
  },
  {
    icon: Shield,
    title: "Gümrük İşlemleri",
    description: "Ürünlerinizin ABD'ye sorunsuz girişi için tüm gümrük prosedürlerini yürütüyoruz.",
  },
  {
    icon: Package,
    title: "Depo & Stok Yönetimi",
    description: "Virginia'daki depomuzda ürünlerinizi güvenle depoluyoruz.",
  },
  {
    icon: ShoppingCart,
    title: "Pazar Yeri Entegrasyonu",
    description: "Amazon, Shopify, Walmart gibi platformlara mağaza kurulum desteği.",
  },
  {
    icon: Truck,
    title: "Sipariş Karşılama",
    description: "Gelen siparişleri paketleyip müşterilerinize hızla ulaştırıyoruz.",
  },
  {
    icon: Globe,
    title: "Uçtan Uca Destek",
    description: "Tüm sürecinizi şeffaf biçimde yönetim panelinizden izleyebilirsiniz.",
  },
];

const advantages = [
  "Virginia merkezli fiziksel depo",
  "LLC kurulumundan siparişe kadar tüm süreçler",
  "Gerçek zamanlı süreç takip paneli",
  "Amazon FBA, Shopify, Walmart desteği",
  "Adanmış müşteri temsilcisi",
  "Şeffaf fiyatlandırma — gizli ücret yok",
];

/**
 * Ana Sayfa — Marketing Landing Page
 * SSG olarak oluşturulur (statik)
 */
export default function HomePage() {
  return (
    <>
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-b from-primary/5 via-background to-background">
        <div className="container mx-auto px-4 py-24 md:py-32">
          <div className="mx-auto max-w-3xl text-center space-y-6">
            <div className="inline-flex items-center rounded-full border px-4 py-1.5 text-sm">
              <span className="text-muted-foreground">
                🇹🇷 Türk KOBİ&apos;ler için 🇺🇸 ABD pazarı kapısı
              </span>
            </div>
            <h1 className="text-4xl font-bold tracking-tight sm:text-5xl md:text-6xl">
              ABD Pazarına Giriş Artık{" "}
              <span className="text-primary">Çok Kolay</span>
            </h1>
            <p className="text-lg text-muted-foreground md:text-xl">
              LLC kurulumundan sipariş karşılamaya kadar tüm süreçleri tek
              platform üzerinden yönetin. Virginia merkezli depomuzla
              ürünleriniz Amerika&apos;ya ulaşsın.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Button size="lg" asChild>
                <Link href="/contact">
                  Ücretsiz Başvuru Yap
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
              <Button size="lg" variant="outline" asChild>
                <Link href="/pricing">Paketleri İncele</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Hizmetler */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <div className="text-center space-y-3 mb-12">
            <h2 className="text-3xl font-bold tracking-tight">
              Uçtan Uca Hizmetlerimiz
            </h2>
            <p className="text-muted-foreground max-w-xl mx-auto">
              Türkiye&apos;den Amerika&apos;ya uzanan yolculuğunuzun her
              adımında yanınızdayız.
            </p>
          </div>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {services.map((service) => (
              <Card key={service.title} className="hover:shadow-md transition-shadow">
                <CardHeader>
                  <service.icon className="h-10 w-10 text-primary mb-2" />
                  <CardTitle className="text-lg">{service.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription className="text-sm">
                    {service.description}
                  </CardDescription>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Neden ATLAS */}
      <section className="py-20 bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="grid gap-12 md:grid-cols-2 items-center">
            <div className="space-y-6">
              <h2 className="text-3xl font-bold tracking-tight">
                Neden ATLAS?
              </h2>
              <p className="text-muted-foreground">
                ATLAS, Türk KOBİ&apos;lerin ABD pazarına en hızlı ve güvenli
                şekilde ulaşmaları için tasarlanan tek çatı altında hizmet veren
                bir platformdur.
              </p>
              <ul className="space-y-3">
                {advantages.map((item) => (
                  <li key={item} className="flex items-center gap-3">
                    <CheckCircle2 className="h-5 w-5 text-primary shrink-0" />
                    <span className="text-sm">{item}</span>
                  </li>
                ))}
              </ul>
              <Button asChild>
                <Link href="/contact">
                  Hemen Başla
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </div>
            <div className="rounded-xl bg-gradient-to-br from-primary/10 to-primary/5 p-8 md:p-12 text-center">
              <div className="text-6xl font-bold text-primary mb-4">100+</div>
              <p className="text-muted-foreground">
                KOBİ&apos;nin ABD pazarına başarılı girişi
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20">
        <div className="container mx-auto px-4 text-center space-y-6">
          <h2 className="text-3xl font-bold tracking-tight">
            ABD Pazarına Açılmaya Hazır mısınız?
          </h2>
          <p className="text-muted-foreground max-w-lg mx-auto">
            Uzman ekibimiz sizinle iletişime geçerek ihtiyaçlarınıza en uygun
            paketi belirlesin.
          </p>
          <Button size="lg" asChild>
            <Link href="/contact">
              Ücretsiz Danışmanlık Al
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </div>
      </section>
    </>
  );
}
