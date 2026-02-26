import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Hakkımızda",
  description:
    "Atlas Platform — Türk işletmelerinin ABD pazarına güvenle girmesini sağlayan uçtan uca çözüm platformu. Virginia merkezli ekibimizle yanınızdayız.",
};

export default function AboutLayout({ children }: { children: React.ReactNode }) {
  return children;
}
