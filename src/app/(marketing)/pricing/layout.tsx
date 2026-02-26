import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Fiyatlandırma",
  description:
    "Atlas Platform fiyat planları — Starter, Growth, Enterprise ve Custom. İşletmenize en uygun ABD pazarı giriş paketini seçin.",
};

export default function PricingLayout({ children }: { children: React.ReactNode }) {
  return children;
}
