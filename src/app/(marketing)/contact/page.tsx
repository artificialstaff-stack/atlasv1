import Link from "next/link";
import {
  ArrowRight,
  Clock3,
  Globe2,
  Mail,
  MapPin,
  MessageSquare,
  Phone,
  Sparkles,
} from "lucide-react";
import { LeadCaptureForm } from "@/components/marketing/lead-capture-form";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

const contactInfo = [
  {
    icon: Mail,
    title: "E-posta",
    value: "info@atlas-platform.com",
    description: "Başvurular ve iş geliştirme talepleri",
  },
  {
    icon: Phone,
    title: "Telefon",
    value: "+1 (703) 555-0123",
    description: "Hafta içi 09:00 - 18:00 EST",
  },
  {
    icon: MapPin,
    title: "Operasyon",
    value: "Virginia, ABD",
    description: "Depo ve operasyon katmanı",
  },
  {
    icon: Clock3,
    title: "Yanıt Süresi",
    value: "24 saat içinde",
    description: "Ortalama ilk geri dönüş hedefi",
  },
];

export default function ContactPage() {
  return (
    <div className="relative overflow-hidden pt-24">
      <div className="absolute inset-0 gradient-mesh opacity-30" />
      <div className="orb orb-blue -right-32 top-10 h-[420px] w-[420px] opacity-15" />
      <div className="orb orb-purple -left-28 bottom-0 h-[320px] w-[320px] opacity-15" />

      <section className="relative py-20">
        <div className="container mx-auto px-4 md:px-6">
          <div className="mx-auto mb-16 max-w-3xl space-y-4 text-center">
            <Badge variant="outline" className="border-primary/30 bg-primary/5">
              <Sparkles className="mr-2 h-3.5 w-3.5 text-primary" />
              Atlas ile iletişime geçin
            </Badge>
            <h1 className="text-4xl font-bold tracking-tight md:text-6xl">
              Demo, iş geliştirme veya
              <span className="text-gradient"> doğrudan operasyon sorunuz</span> için bize yazın.
            </h1>
            <p className="text-lg leading-relaxed text-muted-foreground">
              Genel iletişim formu; demo, partnership ve operasyon sorularını aynı lead
              engine içinde toplar. UTM ve giriş noktası bilgisi korunur.
            </p>
          </div>

          <div className="mx-auto mb-12 grid max-w-5xl gap-4 md:grid-cols-4">
            {contactInfo.map((item) => (
              <Card key={item.title} className="border-border/60 bg-card/80">
                <CardContent className="space-y-3 p-5 text-center">
                  <div className="mx-auto inline-flex rounded-2xl bg-primary/10 p-3">
                    <item.icon className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-semibold">{item.title}</p>
                    <p className="mt-1 text-sm text-foreground/90">{item.value}</p>
                    <p className="mt-1 text-xs text-muted-foreground">{item.description}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="grid gap-10 lg:grid-cols-[0.95fr_1.05fr]">
            <div className="space-y-6">
              <Card className="border-border/60 bg-card/85">
                <CardContent className="space-y-4 p-6">
                  <div className="inline-flex rounded-2xl bg-primary/10 p-3">
                    <Globe2 className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-semibold">Atlas ile ne konuşabilirsiniz?</h2>
                    <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                      ABD pazarına giriş, marketplace seçimi, operasyon kurgusu, depo akışı,
                      panel walkthrough veya doğrudan iş birliği.
                    </p>
                  </div>
                  <div className="grid gap-3">
                    {[
                      "Markanız için Amazon / Walmart / Shopify rotası",
                      "LLC, EIN, gümrük ve süreç sıralaması",
                      "Fulfillment, inbound ve Virginia depo akışı",
                      "Atlas paneli ve AI copilot gösterimi",
                    ].map((item) => (
                      <div key={item} className="flex items-start gap-3">
                        <MessageSquare className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                        <p className="text-sm text-muted-foreground">{item}</p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <div className="flex flex-wrap gap-3">
                <Button variant="outline" asChild>
                  <Link href="/demo">
                    Demo sayfasına git
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
                <Button variant="ghost" asChild>
                  <Link href="/webinar">
                    Webinar listesine katıl
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
              </div>
            </div>

            <LeadCaptureForm
              entryPoint="contact-page"
              intent="general_inquiry"
              variant="contact"
              title="Mesaj bırakın"
              description="Talebinizi doğru ekibe yönlendirelim ve sizi en uygun akışa alalım."
              submitLabel="Mesajı gönder"
              messagePlaceholder="Kısa not: Ne satıyorsunuz, Atlas'tan hangi konuda destek bekliyorsunuz ve en çok hangi başlıkta konuşmak istersiniz?"
            />
          </div>
        </div>
      </section>
    </div>
  );
}
