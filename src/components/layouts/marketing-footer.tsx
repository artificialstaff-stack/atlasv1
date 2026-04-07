import Link from "next/link";
import { Globe, ArrowUpRight, Mail, MapPin, Phone } from "lucide-react";

const footerLinks = {
  hizmetler: [
    { label: "Demo Talebi", href: "/demo" },
    { label: "Karlılık Karşılaştırması", href: "/comparison" },
    { label: "Nasıl Çalışır", href: "/how-it-works" },
    { label: "Kanıt Merkezi", href: "/proof" },
    { label: "Webinar Kaydı", href: "/webinar" },
    { label: "İletişim", href: "/contact" },
  ],
  platform: [
    { label: "Demo", href: "/demo" },
    { label: "Nasıl Çalışır", href: "/how-it-works" },
    { label: "Kanıt Merkezi", href: "/proof" },
    { label: "Fiyatlandırma", href: "/pricing" },
    { label: "Hakkımızda", href: "/about" },
    { label: "Webinar", href: "/webinar" },
    { label: "Giriş Yap", href: "/login" },
  ],
  yasal: [
    { label: "Gizlilik Politikası", href: "#" },
    { label: "Kullanım Koşulları", href: "#" },
    { label: "KVKK Aydınlatma", href: "#" },
  ],
};

export function MarketingFooter() {
  return (
    <footer className="relative border-t border-border/50 bg-muted/30">
      {/* Gradient line at top */}
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary/30 to-transparent" />

      <div className="container mx-auto px-4 md:px-6">
        {/* Main footer */}
        <div className="grid gap-10 py-16 md:grid-cols-2 lg:grid-cols-5">
          {/* Brand Column */}
          <div className="lg:col-span-2 space-y-4">
            <Link href="/" className="flex items-center gap-2.5 group">
              <div className="relative">
                <div className="absolute inset-0 rounded-lg bg-primary/20 blur-md" />
                <Globe className="relative h-7 w-7 text-primary" />
              </div>
              <span className="text-xl font-bold tracking-tight">ATLAS</span>
            </Link>
            <p className="text-sm text-muted-foreground leading-relaxed max-w-sm">
              Türk markaları için ABD pazarına açılmayı uçtan uca yöneten
              operasyon katmanı. LLC, marketplace, depo, fulfillment ve görünür kontrol tek yerde.
            </p>
            <div className="space-y-2.5 pt-2">
              <div className="flex items-center gap-2.5 text-sm text-muted-foreground">
                <MapPin className="h-4 w-4 text-primary/60" />
                <span>Virginia, ABD</span>
              </div>
              <div className="flex items-center gap-2.5 text-sm text-muted-foreground">
                <Mail className="h-4 w-4 text-primary/60" />
                <span>info@atlas-platform.com</span>
              </div>
              <div className="flex items-center gap-2.5 text-sm text-muted-foreground">
                <Phone className="h-4 w-4 text-primary/60" />
                <span>+1 (703) 555-0100</span>
              </div>
            </div>
          </div>

          {/* Links */}
          <div className="space-y-4">
            <h4 className="text-sm font-semibold">Hizmetler</h4>
            <ul className="space-y-2.5">
              {footerLinks.hizmetler.map((link) => (
                <li key={link.label}>
                  <Link
                    href={link.href}
                    className="text-sm text-muted-foreground hover:text-foreground transition-colors inline-flex items-center gap-1 group"
                  >
                    {link.label}
                    <ArrowUpRight className="h-3 w-3 opacity-0 -translate-y-0.5 group-hover:opacity-100 group-hover:translate-y-0 transition-all" />
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div className="space-y-4">
            <h4 className="text-sm font-semibold">Platform</h4>
            <ul className="space-y-2.5">
              {footerLinks.platform.map((link) => (
                <li key={link.label}>
                  <Link
                    href={link.href}
                    className="text-sm text-muted-foreground hover:text-foreground transition-colors inline-flex items-center gap-1 group"
                  >
                    {link.label}
                    <ArrowUpRight className="h-3 w-3 opacity-0 -translate-y-0.5 group-hover:opacity-100 group-hover:translate-y-0 transition-all" />
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div className="space-y-4">
            <h4 className="text-sm font-semibold">Yasal</h4>
            <ul className="space-y-2.5">
              {footerLinks.yasal.map((link) => (
                <li key={link.label}>
                  <Link
                    href={link.href}
                    className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-4 border-t border-border/50 py-6">
          <p className="text-xs text-muted-foreground/60">
            © {new Date().getFullYear()} ATLAS Platform. Tüm hakları saklıdır.
          </p>
          <div className="flex items-center gap-1 text-xs text-muted-foreground/40">
            <span>Virginia, USA&apos;da</span>
            <span className="text-destructive">♥</span>
            <span>ile yapıldı</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
