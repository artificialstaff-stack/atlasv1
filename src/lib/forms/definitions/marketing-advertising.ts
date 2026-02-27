// =============================================================================
// ATLAS PLATFORM — Form Tanımları: Pazarlama & Reklam (ATL-4xx)
// =============================================================================

import type { FormDefinition } from "../types";

export const marketingAdvertisingForms: FormDefinition[] = [
  // ─── ATL-401: Pazarlama Kampanyası Talebi ───
  {
    code: "ATL-401",
    title: "Pazarlama Kampanyası Talebi",
    description: "Dijital pazarlama kampanyası planlanması ve yürütülmesi için talep formu.",
    instructions: "Pazarlama ekibimiz kampanyanızı planlayacak, bütçeyi optimize edecek ve size düzenli raporlar sunacaktır.",
    category: "marketing-advertising",
    estimatedMinutes: 12,
    version: "1.0",
    active: true,
    sections: [
      {
        title: "Kampanya Bilgileri",
        fields: [
          { name: "campaign_name", label: "Kampanya Adı", type: "text", required: true, placeholder: "Örn: Yaz Sezonu Lansmanı" },
          { name: "campaign_goal", label: "Kampanya Hedefi", type: "select", required: true, options: [{ value: "brand_awareness", label: "Marka bilinirliği" }, { value: "traffic", label: "Web sitesi trafiği" }, { value: "leads", label: "Lead (Potansiyel müşteri) toplamak" }, { value: "sales", label: "Satış artırma" }, { value: "app_install", label: "Uygulama yükleme" }, { value: "engagement", label: "Etkileşim artırma" }] },
          { name: "target_audience", label: "Hedef Kitle", type: "textarea", required: true, placeholder: "Yaş aralığı, cinsiyet, ilgi alanları, konum vb." },
          { name: "target_market", label: "Hedef Pazar", type: "multi-select", required: true, options: [{ value: "us", label: "ABD" }, { value: "canada", label: "Kanada" }, { value: "eu", label: "Avrupa" }, { value: "uk", label: "İngiltere" }, { value: "global", label: "Global" }] },
        ],
      },
      {
        title: "Bütçe & Zamanlama",
        fields: [
          { name: "monthly_budget", label: "Aylık Reklam Bütçesi ($)", type: "currency", required: true },
          { name: "campaign_duration", label: "Kampanya Süresi", type: "select", required: true, options: [{ value: "1_month", label: "1 ay" }, { value: "3_months", label: "3 ay" }, { value: "6_months", label: "6 ay" }, { value: "ongoing", label: "Süresiz (devam eden)" }] },
          { name: "start_date", label: "Başlangıç Tarihi", type: "date", required: true },
        ],
      },
      {
        title: "Kanallar & İçerik",
        fields: [
          { name: "channels", label: "Tercih Edilen Reklam Kanalları", type: "multi-select", required: true, options: [{ value: "google_ads", label: "Google Ads" }, { value: "facebook", label: "Facebook / Meta Ads" }, { value: "instagram", label: "Instagram Ads" }, { value: "tiktok", label: "TikTok Ads" }, { value: "amazon_ads", label: "Amazon PPC" }, { value: "youtube", label: "YouTube Ads" }] },
          { name: "existing_assets", label: "Mevcut yaratıcı materyaller var mı?", type: "radio", required: true, options: [{ value: "yes", label: "Evet, mevcut görseller/videolar var" }, { value: "no", label: "Hayır, sıfırdan oluşturulasın" }] },
          { name: "asset_files", label: "Mevcut Materyalleri Yükleyin", type: "file", showWhen: { field: "existing_assets", value: "yes" } },
          { name: "product_urls", label: "Hedef Ürün Linkleri", type: "textarea", placeholder: "Her satıra bir link" },
          { name: "competitor_urls", label: "Rakip Linkleri (analiz için)", type: "textarea", placeholder: "Her satıra bir link" },
          { name: "notes", label: "Ek Notlar / Özel Talepler", type: "textarea" },
        ],
      },
    ],
  },

  // ─── ATL-402: SEO Hizmeti Talebi ───
  {
    code: "ATL-402",
    title: "SEO Optimizasyonu Talebi",
    description: "Arama motoru optimizasyonu (SEO) hizmeti için talep formu.",
    category: "marketing-advertising",
    estimatedMinutes: 8,
    version: "1.0",
    active: true,
    sections: [
      {
        title: "Web Sitesi Bilgileri",
        fields: [
          { name: "website_url", label: "Web Sitesi Adresi", type: "url", required: true },
          { name: "platform", label: "E-ticaret Platformu", type: "select", required: true, options: [{ value: "shopify", label: "Shopify" }, { value: "woocommerce", label: "WooCommerce" }, { value: "amazon", label: "Amazon Listing" }, { value: "custom", label: "Özel site" }, { value: "other", label: "Diğer" }] },
          { name: "target_keywords", label: "Hedef Anahtar Kelimeler", type: "textarea", required: true, placeholder: "Sıralanmak istediğiniz anahtar kelimeler (her satıra bir tane)" },
          { name: "current_monthly_traffic", label: "Mevcut Aylık Trafik (tahmini)", type: "number" },
          { name: "competitors", label: "Rakipler", type: "textarea", placeholder: "Rakip sitelerin URL'leri" },
        ],
      },
      {
        title: "Hizmet Kapsamı",
        fields: [
          { name: "seo_services", label: "İstenen SEO Hizmetleri", type: "multi-select", required: true, options: [{ value: "on_page", label: "On-page SEO" }, { value: "off_page", label: "Off-page SEO / Link Building" }, { value: "technical", label: "Teknik SEO" }, { value: "content", label: "İçerik Stratejisi" }, { value: "local_seo", label: "Local SEO" }, { value: "amazon_seo", label: "Amazon SEO" }] },
          { name: "monthly_budget_seo", label: "Aylık SEO Bütçesi ($)", type: "currency" },
        ],
      },
    ],
  },

  // ─── ATL-403: Influencer İş Birliği Talebi ───
  {
    code: "ATL-403",
    title: "Influencer İş Birliği Talebi",
    description: "Influencer marketing kampanyası için talep formu.",
    category: "marketing-advertising",
    estimatedMinutes: 8,
    version: "1.0",
    active: true,
    sections: [
      {
        title: "Kampanya Detayları",
        fields: [
          { name: "product_name", label: "Ürün / Marka Adı", type: "text", required: true },
          { name: "product_url", label: "Ürün Linki", type: "url" },
          { name: "target_platform", label: "Hedef Platform", type: "multi-select", required: true, options: [{ value: "instagram", label: "Instagram" }, { value: "tiktok", label: "TikTok" }, { value: "youtube", label: "YouTube" }, { value: "twitter", label: "X (Twitter)" }] },
          { name: "influencer_size", label: "Influencer Büyüklüğü", type: "multi-select", options: [{ value: "nano", label: "Nano (1K-10K)" }, { value: "micro", label: "Micro (10K-100K)" }, { value: "macro", label: "Macro (100K-1M)" }, { value: "mega", label: "Mega (1M+)" }] },
          { name: "budget", label: "Bütçe ($)", type: "currency", required: true },
          { name: "content_type", label: "İçerik Türü", type: "multi-select", options: [{ value: "post", label: "Post" }, { value: "story", label: "Story" }, { value: "reel", label: "Reel / Short" }, { value: "review", label: "Ürün İncelemesi" }, { value: "unboxing", label: "Unboxing" }] },
          { name: "brief", label: "Kampanya Özeti / Brief", type: "textarea", required: true },
        ],
      },
    ],
  },
];
