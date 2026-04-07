import Link from "next/link";
import {
  ArrowRight,
  Bot,
  Boxes,
  ChartColumn,
  CheckCircle2,
  FileCheck2,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { LeadCaptureForm } from "@/components/marketing/lead-capture-form";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const outcomes = [
  {
    icon: ChartColumn,
    title: "Kanal ekonomisi netleşsin",
    description:
      "Amazon, Walmart ve Shopify arasında ürününüze en uygun rota net bir iş planına dönüşsün.",
  },
  {
    icon: FileCheck2,
    title: "LLC, EIN ve operasyon sıraya binsin",
    description:
      "Kurulum, gümrük, depo ve fulfillment adımları tek bir yol haritası içinde planlansın.",
  },
  {
    icon: Bot,
    title: "Panel ve AI akışı canlı görülsün",
    description:
      "Atlas içindeki workflow, doküman ve operasyon görünürlüğü gerçek ekranlarla gösterilsin.",
  },
];

const fitSignals = [
  "Halihazırda Trendyol, Hepsiburada veya başka bir kanalda satış yapıyorsanız",
  "Türkiye iç pazarındaki marj baskısını azaltmak istiyorsanız",
  "ABD pazarına girerken operasyonu ve görünürlüğü kaybetmek istemiyorsanız",
  "Tek bir servis değil, uçtan uca operasyon katmanı arıyorsanız",
];

export default function DemoPage() {
  return (
    <div className="pt-24">
      <section className="relative overflow-hidden py-20">
        <div className="absolute inset-0 gradient-mesh opacity-25" />
        <div className="orb orb-blue -left-24 top-8 h-[360px] w-[360px] opacity-20" />
        <div className="orb orb-purple -right-20 bottom-0 h-[320px] w-[320px] opacity-20" />

        <div className="container relative z-10 mx-auto px-4 md:px-6">
          <div className="grid gap-10 lg:grid-cols-[1.1fr_0.9fr] lg:items-start">
            <div className="space-y-8">
              <div className="space-y-4">
                <Badge variant="outline" className="border-primary/30 bg-primary/5">
                  <Sparkles className="mr-2 h-3.5 w-3.5 text-primary" />
                  Demo ve uygunluk görüşmesi
                </Badge>
                <h1 className="max-w-3xl text-4xl font-bold tracking-tight md:text-6xl">
                  Türkiye&apos;de satış yapan markanız için
                  <span className="text-gradient"> ABD büyüme kurgusunu</span> birlikte çıkaralım.
                </h1>
                <p className="max-w-2xl text-lg leading-relaxed text-muted-foreground">
                  Bu görüşme, yalnızca bir tanıtım çağrısı değildir. Ürününüzün
                  kanal ekonomisini, operasyon yükünü ve hangi Atlas akışıyla
                  daha hızlı ilerleyeceğini netleştiren çalışma oturumudur.
                </p>
              </div>

              <div className="grid gap-4 md:grid-cols-3">
                {outcomes.map((item) => (
                  <Card key={item.title} className="border-border/60 bg-card/80">
                    <CardContent className="space-y-3 p-5">
                      <div className="inline-flex rounded-2xl bg-primary/10 p-3">
                        <item.icon className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <p className="font-semibold">{item.title}</p>
                        <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                          {item.description}
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              <Card className="border-primary/20 bg-primary/5">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <ShieldCheck className="h-5 w-5 text-primary" />
                    Bu görüşme kimler için en doğru başlangıç?
                  </CardTitle>
                </CardHeader>
                <CardContent className="grid gap-3 md:grid-cols-2">
                  {fitSignals.map((signal) => (
                    <div key={signal} className="flex items-start gap-3">
                      <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                      <p className="text-sm text-muted-foreground">{signal}</p>
                    </div>
                  ))}
                </CardContent>
              </Card>

              <div className="flex flex-wrap gap-3">
                <Button variant="outline" asChild>
                  <Link href="/comparison">
                    Karlılık karşılaştırmasını gör
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
                <Button variant="ghost" asChild>
                  <Link href="/proof">
                    Gerçek ürün kanıtlarını incele
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
              </div>
            </div>

            <LeadCaptureForm
              entryPoint="demo-page"
              intent="demo_request"
              title="Demo talebinizi oluşturun"
              description="Ekibimiz uygunluk görüşmesi için 24 saat içinde sizinle iletişime geçsin."
              submitLabel="Demo talebini gönder"
              messagePlaceholder="Kısa not: Ne satıyorsunuz, bugün hangi kanallardasınız ve ABD tarafında en çok hangi konuda yardıma ihtiyacınız var?"
            />
          </div>
        </div>
      </section>

      <section className="border-t border-border/50 bg-muted/20 py-20">
        <div className="container mx-auto px-4 md:px-6">
          <div className="mb-10 max-w-2xl space-y-3">
            <Badge variant="outline" className="border-primary/30 bg-primary/5">
              Demo sonunda ne çıkacak?
            </Badge>
            <h2 className="text-3xl font-bold tracking-tight">
              Çıkışta belirsizlik değil, net bir aksiyon listesi kalmalı.
            </h2>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            <Card className="border-border/60">
              <CardContent className="space-y-3 p-6">
                <Boxes className="h-5 w-5 text-primary" />
                <p className="font-semibold">Doğru kanal kararı</p>
                <p className="text-sm text-muted-foreground">
                  Amazon, Walmart, Shopify veya karma yapının ilk önerisi.
                </p>
              </CardContent>
            </Card>
            <Card className="border-border/60">
              <CardContent className="space-y-3 p-6">
                <FileCheck2 className="h-5 w-5 text-primary" />
                <p className="font-semibold">Kurulum sırası</p>
                <p className="text-sm text-muted-foreground">
                  LLC, EIN, depo, doküman ve marketplace adımlarının öncelik sırası.
                </p>
              </CardContent>
            </Card>
            <Card className="border-border/60">
              <CardContent className="space-y-3 p-6">
                <ChartColumn className="h-5 w-5 text-primary" />
                <p className="font-semibold">Maliyet ve görünürlük çerçevesi</p>
                <p className="text-sm text-muted-foreground">
                  Hangi masrafların değişken, hangilerinin sabit olduğuna dair net resim.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>
    </div>
  );
}
