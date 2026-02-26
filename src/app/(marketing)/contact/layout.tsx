import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "İletişim",
  description:
    "Atlas Platform ile iletişime geçin. ABD pazarına açılma süreciniz hakkında bilgi alın. 24 saat içinde dönüş garantisi.",
};

export default function ContactLayout({ children }: { children: React.ReactNode }) {
  return children;
}
