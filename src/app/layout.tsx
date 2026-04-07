import type { Metadata } from "next";
import { ThemeProvider } from "next-themes";
import { QueryProvider } from "@/lib/query/provider";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/sonner";
import { SkipToContent } from "@/components/shared/skip-to-content";
import { ParticleBackground } from "@/components/shared/particle-background";
import { I18nProvider } from "@/i18n/provider";
import { type Locale } from "@/i18n";
import { resolveServerLocale } from "@/lib/locale-server";
import "./globals.css";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await resolveServerLocale();
  const isEnglish = locale === "en";
  const description = isEnglish
    ? "End-to-end ecommerce infrastructure and fulfillment services for entering the US market"
    : "ABD pazarına giriş için uçtan uca e-ticaret altyapısı ve sipariş karşılama hizmetleri";

  return {
    title: {
      default: "ATLAS Platform",
      template: "%s | ATLAS",
    },
    description,
    metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL ?? "https://atlasplatform.co"),
    openGraph: {
      title: "ATLAS Platform",
      description,
      url: "/",
      siteName: "ATLAS Platform",
      locale: isEnglish ? "en_US" : "tr_TR",
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title: "ATLAS Platform",
      description,
    },
    robots: {
      index: true,
      follow: true,
      googleBot: { index: true, follow: true, "max-image-preview": "large" },
    },
  };
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const locale: Locale = await resolveServerLocale();

  return (
    <html lang={locale} suppressHydrationWarning>
      <head>
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#6366f1" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="ATLAS" />
      </head>
      <body className="antialiased">
        <SkipToContent />
        <ParticleBackground />
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          enableSystem
          disableTransitionOnChange
        >
          <QueryProvider>
            <I18nProvider initialLocale={locale}>
              <TooltipProvider>
                {children}
                <Toaster richColors position="top-right" />
              </TooltipProvider>
            </I18nProvider>
          </QueryProvider>
        </ThemeProvider>
        {/* PWA Service Worker Registration */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              if ('serviceWorker' in navigator) {
                window.addEventListener('load', () => {
                  navigator.serviceWorker.register('/sw.js').catch(() => {});
                });
              }
            `,
          }}
        />
      </body>
    </html>
  );
}
