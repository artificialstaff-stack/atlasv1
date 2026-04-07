// =============================================================================
// ATLAS PLATFORM — Form Kategori Tanımları
// =============================================================================

import { localized, resolveLocalizedCategory, type LocalizedFormCategoryMeta } from "./localization";
import type { FormCategoryMeta, FormLocale } from "./types";

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

export const FORM_CATEGORIES_I18N: LocalizedFormCategoryMeta[] = [
  {
    id: "llc-legal",
    label: localized("Şirket & Hukuk", "Company & Legal"),
    description: localized(
      "LLC kurulumu, EIN başvurusu, reseller permit, marka tescili ve yasal süreçler",
      "LLC formation, EIN filing, reseller permits, trademark registration, and legal operations"
    ),
    icon: "Building2",
    color: "text-blue-500",
  },
  {
    id: "shipping-fulfillment",
    label: localized("Gönderim & Lojistik", "Shipping & Fulfillment"),
    description: localized(
      "Ürün gönderimi, depo operasyonları, gümrük işlemleri ve kargo takibi",
      "Product shipping, warehouse operations, customs processing, and shipment tracking"
    ),
    icon: "Truck",
    color: "text-emerald-500",
  },
  {
    id: "accounting-finance",
    label: localized("Muhasebe & Finans", "Accounting & Finance"),
    description: localized(
      "Defter tutma, vergi beyannamesi, mali raporlama ve finansal danışmanlık",
      "Bookkeeping, tax returns, financial reporting, and finance advisory"
    ),
    icon: "Calculator",
    color: "text-amber-500",
  },
  {
    id: "marketing-advertising",
    label: localized("Pazarlama & Reklam", "Marketing & Advertising"),
    description: localized(
      "Dijital pazarlama kampanyaları, reklam bütçesi, SEO, PPC ve influencer iş birlikleri",
      "Digital marketing campaigns, ad budgets, SEO, PPC, and influencer partnerships"
    ),
    icon: "Megaphone",
    color: "text-purple-500",
  },
  {
    id: "social-media",
    label: localized("Sosyal Medya", "Social Media"),
    description: localized(
      "Hesap kurulumu, içerik planlaması, topluluk yönetimi ve analitik raporlama",
      "Account setup, content planning, community management, and analytics reporting"
    ),
    icon: "Share2",
    color: "text-pink-500",
  },
  {
    id: "branding-design",
    label: localized("Markalama & Tasarım", "Branding & Design"),
    description: localized(
      "Logo tasarımı, marka kimliği, ambalaj tasarımı ve ürün fotoğrafçılığı",
      "Logo design, brand identity, packaging design, and product photography"
    ),
    icon: "Palette",
    color: "text-orange-500",
  },
  {
    id: "general-support",
    label: localized("Genel Destek", "General Support"),
    description: localized(
      "Teknik destek, hesap sorunları, genel sorular ve özel talepler",
      "Technical support, account issues, general questions, and custom requests"
    ),
    icon: "LifeBuoy",
    color: "text-cyan-500",
  },
];

export function getLocalizedFormCategories(locale: FormLocale): FormCategoryMeta[] {
  return FORM_CATEGORIES_I18N.map((category) => resolveLocalizedCategory(locale, category));
}

export function getLocalizedFormCategoryById(id: FormCategoryMeta["id"], locale: FormLocale): FormCategoryMeta | undefined {
  const category = FORM_CATEGORIES_I18N.find((item) => item.id === id);
  return category ? resolveLocalizedCategory(locale, category) : undefined;
}
