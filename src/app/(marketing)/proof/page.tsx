import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  Bot,
  ChartColumnBig,
  Layers3,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { LeadCaptureForm } from "@/components/marketing/lead-capture-form";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const proofCards = [
  {
    icon: Bot,
    title: "AI Copilot arayüzü",
    description:
      "Komut, kapsam, approval ve operasyon zincirini tek panelde gösteren yönetsel yüzey.",
  },
  {
    icon: Layers3,
    title: "Admin operasyon görünürlüğü",
    description:
      "Görev kuyruğu, lead inbox, kritik sinyaller ve iş yükünü aynı dashboard üzerinde toplar.",
  },
  {
    icon: ShieldCheck,
    title: "Doküman ve süreç kontrolü",
    description:
      "LLC, EIN, dokümanlar ve operasyon görevleri workflow olarak izlenebilir.",
  },
  {
    icon: ChartColumnBig,
    title: "Marketplace + growth kurgusu",
    description:
      "Marketplace, advertising ve social media modülleri aynı sistem içinde düşünülür.",
  },
];

export default function ProofPage() {
  return (
    <div className="pt-24">
      <section className="relative overflow-hidden py-20">
        <div className="absolute inset-0 gradient-mesh opacity-20" />
        <div className="container relative z-10 mx-auto px-4 md:px-6">
          <div className="grid gap-10 lg:grid-cols-[1.1fr_0.9fr] lg:items-start">
            <div className="space-y-8">
              <div className="space-y-4">
                <Badge variant="outline" className="border-primary/30 bg-primary/5">
                  <Sparkles className="mr-2 h-3.5 w-3.5 text-primary" />
                  Kanıt merkezi
                </Badge>
                <h1 className="max-w-3xl text-4xl font-bold tracking-tight md:text-6xl">
                  Söz değil,
                  <span className="text-gradient"> görünür ürün ve operasyon kanıtı</span>.
                </h1>
                <p className="max-w-2xl text-lg leading-relaxed text-muted-foreground">
                  Atlas sosyal içerikleri boş vaat yerine gerçek ekranlar, gerçek süreç yüzeyleri
                  ve doğrulanabilir operasyon mantığı üzerinden ilerlemelidir. Bu sayfa o yaklaşımın temelini kurar.
                </p>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                {proofCards.map((card) => (
                  <Card key={card.title} className="border-border/60 bg-card/85">
                    <CardContent className="space-y-3 p-5">
                      <div className="inline-flex rounded-2xl bg-primary/10 p-3">
                        <card.icon className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <p className="font-semibold">{card.title}</p>
                        <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                          {card.description}
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>

            <LeadCaptureForm
              entryPoint="proof-page"
              intent="proof_walkthrough"
              title="Kanıt odaklı walkthrough isteyin"
              description="Ekibimiz Atlas panelini ve operasyon akışını ürününüze göre gösterecek bir demo hazırlasın."
              submitLabel="Walkthrough talep et"
              messagePlaceholder="Kısa not: Özellikle hangi panel veya süreç akışını görmek istiyorsunuz? (LLC/EIN, workflow, fulfillment, marketplace, AI copilot...)"
            />
          </div>
        </div>
      </section>

      <section className="border-y border-border/50 bg-muted/20 py-20">
        <div className="container mx-auto px-4 md:px-6">
          <div className="grid gap-6 lg:grid-cols-2">
            <Card className="overflow-hidden border-border/60">
              <div className="border-b border-border/50 px-6 py-4">
                <p className="text-sm font-semibold">Admin operasyon dashboard</p>
                <p className="text-sm text-muted-foreground">
                  Lead, intake, kritik sinyal ve iş yükü görünürlüğü
                </p>
              </div>
              <div className="relative aspect-[16/10] bg-black">
                <Image
                  src="/screenshots/atlas-admin-dashboard.png"
                  alt="Atlas admin dashboard screenshot"
                  fill
                  className="object-cover object-top"
                />
              </div>
            </Card>

            <Card className="overflow-hidden border-border/60">
              <div className="border-b border-border/50 px-6 py-4">
                <p className="text-sm font-semibold">Atlas Admin Copilot</p>
                <p className="text-sm text-muted-foreground">
                  Komut merkezi, approval mantığı ve görev zinciri yüzeyi
                </p>
              </div>
              <div className="relative aspect-[16/10] bg-black">
                <Image
                  src="/screenshots/atlas-admin-copilot.png"
                  alt="Atlas admin copilot screenshot"
                  fill
                  className="object-cover object-top"
                />
              </div>
            </Card>
          </div>
        </div>
      </section>

      <section className="py-20">
        <div className="container mx-auto px-4 md:px-6">
          <Card className="border-primary/20 bg-primary/5">
            <CardHeader>
              <CardTitle className="text-2xl">Bu kanıtları sosyal medyada nasıl kullanacağız?</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-3">
              <div className="rounded-2xl border border-border/60 bg-background/70 p-5">
                <p className="font-semibold">Reel / Shorts</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  UI walkthrough + altyazı + problem-çözüm hook formatı.
                </p>
              </div>
              <div className="rounded-2xl border border-border/60 bg-background/70 p-5">
                <p className="font-semibold">Carousel</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  “Bir satıcının ilk 30 günü” ve “hangi modül neyi çözüyor?” anlatısı.
                </p>
              </div>
              <div className="rounded-2xl border border-border/60 bg-background/70 p-5">
                <p className="font-semibold">Sales demo</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Sosyal içerikte dikkat çeken modül, satış görüşmesinde derinleştirilir.
                </p>
              </div>
            </CardContent>
          </Card>

          <div className="mt-8 flex flex-wrap gap-3">
            <Button asChild>
              <Link href="/demo">
                Demo talep et
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
            <Button variant="outline" asChild>
              <Link href="/comparison">
                Karlılık anlatısını incele
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
}
