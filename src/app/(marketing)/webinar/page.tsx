import { CalendarDays, PlayCircle, Sparkles, Users2 } from "lucide-react";
import { LeadCaptureForm } from "@/components/marketing/lead-capture-form";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const sessions = [
  {
    title: "Amazon mu Shopify mı Walmart mı?",
    description:
      "Ürüne göre kanal seçimi, yanlış platforma erken girmemenin etkisi ve başlangıç sırası.",
  },
  {
    title: "Marjı eriten gizli kalemler",
    description:
      "Komisyon, fulfillment, depo, reklam ve operasyon yükünü birlikte okumak için çerçeve.",
  },
  {
    title: "LLC, EIN, depo ve workflow",
    description:
      "ABD operasyonuna geçerken hangi adım ne zaman devreye alınmalı sorusunun net akışı.",
  },
];

export default function WebinarPage() {
  return (
    <div className="pt-24">
      <section className="relative overflow-hidden py-20">
        <div className="absolute inset-0 gradient-mesh opacity-20" />
        <div className="container relative z-10 mx-auto px-4 md:px-6">
          <div className="grid gap-10 lg:grid-cols-[1.05fr_0.95fr] lg:items-start">
            <div className="space-y-8">
              <div className="space-y-4">
                <Badge variant="outline" className="border-primary/30 bg-primary/5">
                  <Sparkles className="mr-2 h-3.5 w-3.5 text-primary" />
                  Atlas webinar serisi
                </Badge>
                <h1 className="max-w-3xl text-4xl font-bold tracking-tight md:text-6xl">
                  Satış ekibini değil,
                  <span className="text-gradient"> pazara giriş mantığını</span> önce anlatalım.
                </h1>
                <p className="max-w-2xl text-lg leading-relaxed text-muted-foreground">
                  Webinar sayfası; sosyal medyadan gelen ilgiyi daha uzun formatlı eğitime,
                  oradan da demo ve satış sürecine taşıyan orta katmandır.
                </p>
              </div>

              <div className="grid gap-4 md:grid-cols-3">
                <Card className="border-border/60 bg-card/85">
                  <CardContent className="space-y-2 p-5">
                    <CalendarDays className="h-5 w-5 text-primary" />
                    <p className="font-semibold">Ayda 2 canlı oturum</p>
                    <p className="text-sm text-muted-foreground">
                      Sosyal içerikte en çok yankı alan konu başlıklarıyla ilerler.
                    </p>
                  </CardContent>
                </Card>
                <Card className="border-border/60 bg-card/85">
                  <CardContent className="space-y-2 p-5">
                    <PlayCircle className="h-5 w-5 text-primary" />
                    <p className="font-semibold">Faceless format</p>
                    <p className="text-sm text-muted-foreground">
                      Sunum + ekran paylaşımı + altyazı ile yürüyen profesyonel kurgu.
                    </p>
                  </CardContent>
                </Card>
                <Card className="border-border/60 bg-card/85">
                  <CardContent className="space-y-2 p-5">
                    <Users2 className="h-5 w-5 text-primary" />
                    <p className="font-semibold">Demo öncesi ısıtma</p>
                    <p className="text-sm text-muted-foreground">
                      Kararsız lead&apos;i bilgilenmiş ve daha nitelikli demoya taşır.
                    </p>
                  </CardContent>
                </Card>
              </div>

              <Card className="border-border/60 bg-card/85">
                <CardHeader>
                  <CardTitle>İlk webinar serisi</CardTitle>
                </CardHeader>
                <CardContent className="grid gap-4">
                  {sessions.map((session) => (
                    <div
                      key={session.title}
                      className="rounded-2xl border border-border/60 bg-muted/10 p-4"
                    >
                      <p className="font-semibold">{session.title}</p>
                      <p className="mt-1 text-sm text-muted-foreground">{session.description}</p>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>

            <LeadCaptureForm
              entryPoint="webinar-page"
              intent="webinar_registration"
              variant="webinar"
              title="Webinar listesine katılın"
              description="Yeni oturum duyuruları ve kayıt linkleri size e-posta ile ulaşsın."
              submitLabel="Webinar kaydı oluştur"
              messagePlaceholder="Kısa not: Özellikle hangi başlıkla ilgili canlı oturum görmek istersiniz?"
            />
          </div>
        </div>
      </section>
    </div>
  );
}
