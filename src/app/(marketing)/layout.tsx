import { MarketingNavbar } from "@/components/layouts/marketing-navbar";
import { MarketingFooter } from "@/components/layouts/marketing-footer";

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
    <div className="flex min-h-screen flex-col">
      <MarketingNavbar />
      <main id="main-content" className="flex-1 pt-16">{children}</main>
      <MarketingFooter />
    </div>
  );
}
