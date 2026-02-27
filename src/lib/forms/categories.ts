// =============================================================================
// ATLAS PLATFORM — Form Kategori Tanımları
// =============================================================================

import type { FormCategoryMeta } from "./types";

export const FORM_CATEGORIES: FormCategoryMeta[] = [
  {
    id: "llc-legal",
    label: "Şirket & Hukuk",
    description: "LLC kurulumu, EIN başvurusu, reseller permit, marka tescili ve yasal süreçler",
    icon: "Building2",
    color: "text-blue-500",
  },
  {
    id: "shipping-fulfillment",
    label: "Gönderim & Lojistik",
    description: "Ürün gönderimi, depo operasyonları, gümrük işlemleri ve kargo takibi",
    icon: "Truck",
    color: "text-emerald-500",
  },
  {
    id: "accounting-finance",
    label: "Muhasebe & Finans",
    description: "Defter tutma, vergi beyannamesi, mali raporlama ve finansal danışmanlık",
    icon: "Calculator",
    color: "text-amber-500",
  },
  {
    id: "marketing-advertising",
    label: "Pazarlama & Reklam",
    description: "Dijital pazarlama kampanyaları, reklam bütçesi, SEO, PPC ve influencer iş birlikleri",
    icon: "Megaphone",
    color: "text-purple-500",
  },
  {
    id: "social-media",
    label: "Sosyal Medya",
    description: "Hesap kurulumu, içerik planlaması, topluluk yönetimi ve analitik raporlama",
    icon: "Share2",
    color: "text-pink-500",
  },
  {
    id: "branding-design",
    label: "Markalama & Tasarım",
    description: "Logo tasarımı, marka kimliği, ambalaj tasarımı ve ürün fotoğrafçılığı",
    icon: "Palette",
    color: "text-orange-500",
  },
  {
    id: "general-support",
    label: "Genel Destek",
    description: "Teknik destek, hesap sorunları, genel sorular ve özel talepler",
    icon: "LifeBuoy",
    color: "text-cyan-500",
  },
];
