import Link from "next/link";
import { Globe } from "lucide-react";

/**
 * Marketing Footer — Halka açık sayfalarda gösterilir
 */
export function MarketingFooter() {
  return (
    <footer className="border-t bg-muted/50">
      <div className="container mx-auto px-4 py-12">
        <div className="grid gap-8 md:grid-cols-4">
          {/* Marka */}
          <div className="space-y-3">
            <Link href="/" className="flex items-center gap-2">
              <Globe className="h-5 w-5 text-primary" />
              <span className="text-lg font-bold">ATLAS</span>
            </Link>
            <p className="text-sm text-muted-foreground">
              Türk KOBİ&apos;lerin ABD pazarına açılımını kolaylaştıran uçtan
              uca e-ticaret altyapısı.
            </p>
          </div>

          {/* Hizmetler */}
          <div className="space-y-3">
            <h4 className="text-sm font-semibold">Hizmetler</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>LLC Kurulumu</li>
              <li>EIN Kaydı</li>
              <li>Gümrük İşlemleri</li>
              <li>Depo & Lojistik</li>
              <li>Pazar Yeri Entegrasyonu</li>
            </ul>
          </div>

          {/* Sayfalar */}
          <div className="space-y-3">
            <h4 className="text-sm font-semibold">Sayfalar</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>
                <Link href="/pricing" className="hover:text-primary transition-colors">
                  Fiyatlandırma
                </Link>
              </li>
              <li>
                <Link href="/about" className="hover:text-primary transition-colors">
                  Hakkımızda
                </Link>
              </li>
              <li>
                <Link href="/contact" className="hover:text-primary transition-colors">
                  İletişim
                </Link>
              </li>
            </ul>
          </div>

          {/* İletişim */}
          <div className="space-y-3">
            <h4 className="text-sm font-semibold">İletişim</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>Virginia, ABD</li>
              <li>info@atlas-platform.com</li>
            </ul>
          </div>
        </div>

        <div className="mt-8 border-t pt-6 text-center text-sm text-muted-foreground">
          © {new Date().getFullYear()} ATLAS Platform. Tüm hakları saklıdır.
        </div>
      </div>
    </footer>
  );
}
