import Link from "next/link";
import {
  ArrowRight,
  Boxes,
  Globe2,
  ShieldCheck,
  Sparkles,
  Workflow,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const steps = [
  {
    step: "01",
    title: "Uygunluk ve kanal kararı",
    description:
      "Mevcut satış kanallarınız, ürün tipi ve operasyon kapasiteniz analiz edilir.",
  },
  {
    step: "02",
    title: "LLC ve EIN kurgusu",
    description:
      "ABD tarafında satış yapıyı taşıyacak şirket ve vergi numarası akışı planlanır.",
  },
  {
    step: "03",
    title: "Marketplace ve D2C kurulum sırası",
    description:
      "Amazon, Walmart, Shopify veya karma yapı için doğru açılış sırası belirlenir.",
  },
  {
    step: "04",
    title: "Depo ve fulfillment entegrasyonu",
    description:
      "Virginia operasyon katmanı, inbound, stok ve sipariş karşılama akışı kurulmuş olur.",
  },
  {
    step: "05",
    title: "Doküman ve workflow görünürlüğü",
    description:
      "Müşteri ve admin tarafı süreçleri aynı panel içinde görünür hale gelir.",
  },
  {
    step: "06",
    title: "AI destekli kontrol",
    description:
      "Atlas Copilot, operasyon sinyallerini, iş listelerini ve dikkat isteyen alanları öne çıkarır.",
  },
  {
    step: "07",
    title: "Büyüme ve tekrar eden optimizasyon",
    description:
      "Kanal ekonomisi, fulfillment verimi ve reklam sinyalleri düzenli gözden geçirilir.",
  },
];

const modules = [
  {
    icon: Globe2,
    title: "Pazar girişi",
    description: "LLC, EIN, marketplace ve D2C başlangıç mimarisi.",
  },
  {
    icon: ShieldCheck,
    title: "Uyum ve operasyon",
    description: "Gümrük, doküman, süreç kontrolü ve görev akışı.",
  },
  {
    icon: Boxes,
    title: "Depo ve fulfillment",
    description: "Virginia merkezli inbound, stok ve sipariş akışları.",
  },
  {
    icon: Workflow,
    title: "Görünür kontrol",
    description: "Admin panel, müşteri paneli ve AI copilot ile tek yüzey.",
  },
];

export default function HowItWorksPage() {
  return (
    <div className="pt-24">
      <section className="relative overflow-hidden py-20">
        <div className="absolute inset-0 gradient-mesh opacity-20" />
        <div className="container relative z-10 mx-auto px-4 md:px-6">
          <div className="mx-auto max-w-3xl space-y-4 text-center">
            <Badge variant="outline" className="border-primary/30 bg-primary/5">
              <Sparkles className="mr-2 h-3.5 w-3.5 text-primary" />
              Uçtan uca operasyon akışı
            </Badge>
            <h1 className="text-4xl font-bold tracking-tight md:text-6xl">
              Atlas, ABD&apos;ye açılmayı
              <span className="text-gradient"> dağınık servislerden tek akışa</span> çevirir.
            </h1>
            <p className="text-lg leading-relaxed text-muted-foreground">
              Bu sayfa, Atlas&apos;ın pazara girişten fulfillment&apos;a kadar süreci nasıl tek operasyon
              katmanında topladığını gösterir.
            </p>
          </div>
        </div>
      </section>

      <section className="py-20">
        <div className="container mx-auto px-4 md:px-6">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {modules.map((module) => (
              <Card key={module.title} className="border-border/60 bg-card/85">
                <CardContent className="space-y-3 p-6">
                  <div className="inline-flex rounded-2xl bg-primary/10 p-3">
                    <module.icon className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-semibold">{module.title}</p>
                    <p className="mt-1 text-sm text-muted-foreground">{module.description}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <section className="border-y border-border/50 bg-muted/20 py-20">
        <div className="container mx-auto px-4 md:px-6">
          <div className="mx-auto max-w-4xl space-y-6">
            {steps.map((step) => (
              <div
                key={step.step}
                className="grid gap-4 rounded-3xl border border-border/60 bg-card/80 p-6 md:grid-cols-[100px_1fr]"
              >
                <div className="text-2xl font-bold text-primary">{step.step}</div>
                <div>
                  <p className="text-lg font-semibold">{step.title}</p>
                  <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                    {step.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-20">
        <div className="container mx-auto px-4 md:px-6">
          <Card className="border-primary/20 bg-primary/5">
            <CardHeader>
              <CardTitle className="text-2xl">Akış size uyuyor mu?</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <p className="max-w-2xl text-sm leading-relaxed text-muted-foreground">
                Eğer ürününüz için doğru başlangıç sırasını birlikte çıkarmak istiyorsanız,
                demo görüşmesi bir sonraki doğru adım olur.
              </p>
              <div className="flex flex-wrap gap-3">
                <Button asChild>
                  <Link href="/demo">
                    Demo talep et
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
                <Button variant="outline" asChild>
                  <Link href="/proof">
                    Ürün kanıtlarını gör
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>
    </div>
  );
}
