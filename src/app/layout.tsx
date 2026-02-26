import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { ThemeProvider } from "next-themes";
import { QueryProvider } from "@/lib/query/provider";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/sonner";
import { CopilotProvider } from "@/components/ai/copilot-provider";
import { SkipToContent } from "@/components/shared/skip-to-content";
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

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="tr" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <SkipToContent />
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          enableSystem
          disableTransitionOnChange
        >
          <QueryProvider>
            <CopilotProvider>
              <TooltipProvider>
                {children}
                <Toaster richColors position="top-right" />
              </TooltipProvider>
            </CopilotProvider>
          </QueryProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
