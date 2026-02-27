import type { Metadata } from "next";
import { cookies } from "next/headers";
import { Geist, Geist_Mono } from "next/font/google";
import { ThemeProvider } from "next-themes";
import { QueryProvider } from "@/lib/query/provider";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/sonner";
import { CopilotProvider } from "@/components/ai/copilot-provider";
import { SkipToContent } from "@/components/shared/skip-to-content";
import { ParticleBackground } from "@/components/shared/particle-background";
import { I18nProvider } from "@/i18n/provider";
import { LOCALES, DEFAULT_LOCALE, type Locale } from "@/i18n";
import "@copilotkit/react-ui/styles.css";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "ATLAS Platform",
    template: "%s | ATLAS",
  },
  description:
    "ABD pazarına giriş için uçtan uca e-ticaret altyapısı ve sipariş karşılama hizmetleri",
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_APP_URL ?? "https://atlasplatform.co"
  ),
  openGraph: {
    title: "ATLAS Platform",
    description:
      "ABD pazarına giriş için uçtan uca e-ticaret altyapısı ve sipariş karşılama hizmetleri",
    url: "/",
    siteName: "ATLAS Platform",
    locale: "tr_TR",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "ATLAS Platform",
    description:
      "ABD pazarına giriş için uçtan uca e-ticaret altyapısı ve sipariş karşılama hizmetleri",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, "max-image-preview": "large" },
  },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Detect locale from cookie (set by middleware)
  const cookieStore = await cookies();
  const cookieLocale = cookieStore.get("atlas_locale")?.value as Locale | undefined;
  const locale: Locale =
    cookieLocale && LOCALES.includes(cookieLocale) ? cookieLocale : DEFAULT_LOCALE;

  return (
    <html lang={locale} suppressHydrationWarning>
      <head>
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#6366f1" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="ATLAS" />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <SkipToContent />
        <ParticleBackground />
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          enableSystem
          disableTransitionOnChange
        >
          <QueryProvider>
            <CopilotProvider>
              <I18nProvider initialLocale={locale}>
                <TooltipProvider>
                  {children}
                  <Toaster richColors position="top-right" />
                </TooltipProvider>
              </I18nProvider>
            </CopilotProvider>
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
