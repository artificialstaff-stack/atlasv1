import Link from "next/link";
import { ArrowRight, ChartNoAxesColumn, CircleDollarSign } from "lucide-react";
import { LeadCaptureForm } from "@/components/marketing/lead-capture-form";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const comparisonRows = [
  {
    dimension: "Kanal yapısı",
    local: "Genellikle tek ülke, yüksek kampanya ve fiyat baskısı olan kapalı iç pazar.",
    us: "Amazon + Walmart + Shopify ile category-fit kanal karması kurulabilir.",
  },
  {
    dimension: "Komisyon söylemi",
    local: "Komisyonlar kategoriye göre değişir; ek görünürlük maliyetleri ve iç pazar rekabeti marjı daraltabilir.",
    us: "Atlas söylemi 'her zaman daha ucuz komisyon' değil, daha iyi unit economics ve kanal esnekliğidir.",
  },
  {
    dimension: "Talep erişimi",
    local: "Aynı tüketici havuzunda yoğun rekabet.",
    us: "Yeni müşteri havuzu, daha geniş sepet potansiyeli ve D2C seçeneği.",
  },
  {
    dimension: "Operasyon görünürlüğü",
    local: "Farklı araçlar ve servislerle dağınık operasyon.",
    us: "LLC, doküman, depo, fulfillment ve workflow tek akışta izlenir.",
  },
];

const cautionPoints = [
  "Atlas dışarıya blanket 'ABD'de komisyon her zaman daha düşük' mesajı vermez.",
  "Kategori bazlı fee, fulfillment ve reklam maliyetleri birlikte okunur.",
  "Shopify / D2C rotası, marketplace komisyonundan kaçınmanın stratejik yoludur.",
];

export default function ComparisonPage() {
  return (
    <div className="pt-24">
      <section className="relative overflow-hidden py-20">
        <div className="absolute inset-0 gradient-mesh opacity-25" />
        <div className="container relative z-10 mx-auto px-4 md:px-6">
          <div className="grid gap-10 lg:grid-cols-[1.1fr_0.9fr] lg:items-start">
            <div className="space-y-8">
              <div className="space-y-4">
                <Badge variant="outline" className="border-primary/30 bg-primary/5">
                  <CircleDollarSign className="mr-2 h-3.5 w-3.5 text-primary" />
                  Karlılık ve kanal ekonomisi
                </Badge>
                <h1 className="max-w-3xl text-4xl font-bold tracking-tight md:text-6xl">
                  Mesajı doğru kuralım:
                  <span className="text-gradient"> amaç yalnızca düşük komisyon değil</span>, daha iyi iş modeli.
                </h1>
                <p className="max-w-2xl text-lg leading-relaxed text-muted-foreground">
                  Atlas&apos;ın satış söylemi, Türkiye iç pazardaki sıkışıklık ile ABD tarafındaki
                  kanal esnekliğini karşılaştırır. Doğru anlatı; komisyon, fulfillment, reklam,
                  yeni talep ve operasyon görünürlüğünün birlikte okunmasıdır.
                </p>
              </div>

              <div className="grid gap-4 md:grid-cols-3">
                {cautionPoints.map((point, index) => (
                  <Card key={point} className="border-border/60 bg-card/85">
                    <CardContent className="space-y-3 p-5">
                      <div className="text-sm font-semibold text-primary">0{index + 1}</div>
                      <p className="text-sm leading-relaxed text-muted-foreground">{point}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>

              <Card className="border-border/60">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-xl">
                    <ChartNoAxesColumn className="h-5 w-5 text-primary" />
                    Türkiye iç pazar vs ABD kanal karması
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {comparisonRows.map((row) => (
                    <div
                      key={row.dimension}
                      className="grid gap-3 rounded-2xl border border-border/60 bg-muted/10 p-4 md:grid-cols-[180px_1fr_1fr]"
                    >
                      <p className="text-sm font-semibold">{row.dimension}</p>
                      <p className="text-sm text-muted-foreground">{row.local}</p>
                      <p className="text-sm text-muted-foreground">{row.us}</p>
                    </div>
                  ))}
                </CardContent>
              </Card>

              <div className="flex flex-wrap gap-3">
                <Button variant="outline" asChild>
                  <Link href="/how-it-works">
                    Süreç akışını incele
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
                <Button variant="ghost" asChild>
                  <Link href="/proof">
                    Kanıt merkezine git
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
              </div>
            </div>

            <LeadCaptureForm
              entryPoint="comparison-page"
              intent="profitability_analysis"
              title="Kategori bazlı analiz isteyin"
              description="Ekibimiz ürün kategorinize göre daha gerçekçi bir büyüme ve marj çerçevesi paylaşsın."
              submitLabel="Analiz talebini gönder"
              messagePlaceholder="Kısa not: Hangi kategoride satış yapıyorsunuz, bugün hangi pazaryerlerindesiniz ve ABD tarafında en çok hangi maliyet kalemini merak ediyorsunuz?"
            />
          </div>
        </div>
      </section>
    </div>
  );
}
