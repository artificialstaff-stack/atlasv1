import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Kayıt Ol",
  description: "Atlas Platform hesabı oluşturun. Davet bağlantınızla kaydolun.",
};

export default function RegisterLayout({ children }: { children: React.ReactNode }) {
  return children;
}
