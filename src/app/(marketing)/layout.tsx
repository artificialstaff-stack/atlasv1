import { MarketingNavbar } from "@/components/layouts/marketing-navbar";
import { MarketingFooter } from "@/components/layouts/marketing-footer";
import { MarketingAttributionTracker } from "@/components/marketing/attribution-tracker";

/**
 * Marketing Layout — Halka açık sayfalar
 * Navbar + Footer + içerik
 */
export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="relative z-10 flex min-h-screen flex-col">
      <MarketingAttributionTracker />
      <MarketingNavbar />
      <main id="main-content" className="flex-1 pt-16">{children}</main>
      <MarketingFooter />
    </div>
  );
}
