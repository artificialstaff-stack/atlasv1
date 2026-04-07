// =============================================================================
// ATLAS PLATFORM — Form Tanımları: Pazarlama & Reklam (ATL-4xx)
// =============================================================================

import { localized as t, type LocalizedFormDefinition } from "../localization";

export const marketingAdvertisingForms: LocalizedFormDefinition[] = [
  {
    code: "ATL-401",
    title: t("Pazarlama Kampanyası Talebi", "Marketing Campaign Request"),
    description: t("Dijital pazarlama kampanyası planlanması ve yürütülmesi için talep formu.", "Request form for planning and running a digital marketing campaign."),
    instructions: t("Pazarlama ekibimiz kampanyanızı planlayacak, bütçeyi optimize edecek ve size düzenli raporlar sunacaktır.", "Our marketing team will plan your campaign, optimize the budget, and provide regular reports."),
    category: "marketing-advertising",
    estimatedMinutes: 12,
    version: "1.0",
    active: true,
    sections: [
      {
        title: t("Kampanya Bilgileri", "Campaign Information"),
        fields: [
          { name: "campaign_name", label: t("Kampanya Adı", "Campaign Name"), type: "text", required: true, placeholder: t("Örn: Yaz Sezonu Lansmanı", "e.g. Summer Launch") },
          { name: "campaign_goal", label: t("Kampanya Hedefi", "Campaign Goal"), type: "select", required: true, options: [{ value: "brand_awareness", label: t("Marka bilinirliği", "Brand awareness") }, { value: "traffic", label: t("Web sitesi trafiği", "Website traffic") }, { value: "leads", label: t("Lead (Potansiyel müşteri) toplamak", "Generate leads") }, { value: "sales", label: t("Satış artırma", "Increase sales") }, { value: "app_install", label: t("Uygulama yükleme", "App installs") }, { value: "engagement", label: t("Etkileşim artırma", "Increase engagement") }] },
          { name: "target_audience", label: t("Hedef Kitle", "Target Audience"), type: "textarea", required: true, placeholder: t("Yaş aralığı, cinsiyet, ilgi alanları, konum vb.", "Age range, gender, interests, location, etc.") },
          { name: "target_market", label: t("Hedef Pazar", "Target Market"), type: "multi-select", required: true, options: [{ value: "us", label: "ABD" }, { value: "canada", label: "Canada" }, { value: "eu", label: "Europe" }, { value: "uk", label: "UK" }, { value: "global", label: "Global" }] },
        ],
      },
      {
        title: t("Bütçe & Zamanlama", "Budget & Timing"),
        fields: [
          { name: "monthly_budget", label: t("Aylık Reklam Bütçesi ($)", "Monthly Ad Budget ($)"), type: "currency", required: true },
          { name: "campaign_duration", label: t("Kampanya Süresi", "Campaign Duration"), type: "select", required: true, options: [{ value: "1_month", label: t("1 ay", "1 month") }, { value: "3_months", label: t("3 ay", "3 months") }, { value: "6_months", label: t("6 ay", "6 months") }, { value: "ongoing", label: t("Süresiz (devam eden)", "Ongoing") }] },
          { name: "start_date", label: t("Başlangıç Tarihi", "Start Date"), type: "date", required: true },
        ],
      },
      {
        title: t("Kanallar & İçerik", "Channels & Creative"),
        fields: [
          { name: "channels", label: t("Tercih Edilen Reklam Kanalları", "Preferred Ad Channels"), type: "multi-select", required: true, options: [{ value: "google_ads", label: "Google Ads" }, { value: "facebook", label: "Facebook / Meta Ads" }, { value: "instagram", label: "Instagram Ads" }, { value: "tiktok", label: "TikTok Ads" }, { value: "amazon_ads", label: "Amazon PPC" }, { value: "youtube", label: "YouTube Ads" }] },
          { name: "existing_assets", label: t("Mevcut yaratıcı materyaller var mı?", "Do you already have creative assets?"), type: "radio", required: true, options: [{ value: "yes", label: t("Evet, mevcut görseller/videolar var", "Yes, existing images/videos are available") }, { value: "no", label: t("Hayır, sıfırdan oluşturulasın", "No, create from scratch") }] },
          { name: "asset_files", label: t("Mevcut Materyalleri Yükleyin", "Upload Existing Assets"), type: "file", showWhen: { field: "existing_assets", value: "yes" } },
          { name: "product_urls", label: t("Hedef Ürün Linkleri", "Target Product Links"), type: "textarea", placeholder: t("Her satıra bir link", "One link per line") },
          { name: "competitor_urls", label: t("Rakip Linkleri (analiz için)", "Competitor Links (for analysis)"), type: "textarea", placeholder: t("Her satıra bir link", "One link per line") },
          { name: "notes", label: t("Ek Notlar / Özel Talepler", "Additional Notes / Special Requests"), type: "textarea" },
        ],
      },
    ],
  },
  {
    code: "ATL-402",
    title: t("SEO Optimizasyonu Talebi", "SEO Optimization Request"),
    description: t("Arama motoru optimizasyonu (SEO) hizmeti için talep formu.", "Request form for search engine optimization (SEO) services."),
    category: "marketing-advertising",
    estimatedMinutes: 8,
    version: "1.0",
    active: true,
    sections: [
      {
        title: t("Web Sitesi Bilgileri", "Website Information"),
        fields: [
          { name: "website_url", label: t("Web Sitesi Adresi", "Website URL"), type: "url", required: true },
          { name: "platform", label: t("E-ticaret Platformu", "E-commerce Platform"), type: "select", required: true, options: [{ value: "shopify", label: "Shopify" }, { value: "woocommerce", label: "WooCommerce" }, { value: "amazon", label: "Amazon Listing" }, { value: "custom", label: t("Özel site", "Custom site") }, { value: "other", label: t("Diğer", "Other") }] },
          { name: "target_keywords", label: t("Hedef Anahtar Kelimeler", "Target Keywords"), type: "textarea", required: true, placeholder: t("Sıralanmak istediğiniz anahtar kelimeler (her satıra bir tane)", "Keywords you want to rank for (one per line)") },
          { name: "current_monthly_traffic", label: t("Mevcut Aylık Trafik (tahmini)", "Current Monthly Traffic (estimate)"), type: "number" },
          { name: "competitors", label: t("Rakipler", "Competitors"), type: "textarea", placeholder: t("Rakip sitelerin URL'leri", "Competitor website URLs") },
        ],
      },
      {
        title: t("Hizmet Kapsamı", "Service Scope"),
        fields: [
          { name: "seo_services", label: t("İstenen SEO Hizmetleri", "Requested SEO Services"), type: "multi-select", required: true, options: [{ value: "on_page", label: t("On-page SEO", "On-page SEO") }, { value: "off_page", label: t("Off-page SEO / Link Building", "Off-page SEO / Link Building") }, { value: "technical", label: t("Teknik SEO", "Technical SEO") }, { value: "content", label: t("İçerik Stratejisi", "Content Strategy") }, { value: "local_seo", label: t("Local SEO", "Local SEO") }, { value: "amazon_seo", label: t("Amazon SEO", "Amazon SEO") }] },
          { name: "monthly_budget_seo", label: t("Aylık SEO Bütçesi ($)", "Monthly SEO Budget ($)"), type: "currency" },
        ],
      },
    ],
  },
  {
    code: "ATL-403",
    title: t("Influencer İş Birliği Talebi", "Influencer Partnership Request"),
    description: t("Influencer marketing kampanyası için talep formu.", "Request form for an influencer marketing campaign."),
    category: "marketing-advertising",
    estimatedMinutes: 8,
    version: "1.0",
    active: true,
    sections: [
      {
        title: t("Kampanya Detayları", "Campaign Details"),
        fields: [
          { name: "product_name", label: t("Ürün / Marka Adı", "Product / Brand Name"), type: "text", required: true },
          { name: "product_url", label: t("Ürün Linki", "Product Link"), type: "url" },
          { name: "target_platform", label: t("Hedef Platform", "Target Platform"), type: "multi-select", required: true, options: [{ value: "instagram", label: "Instagram" }, { value: "tiktok", label: "TikTok" }, { value: "youtube", label: "YouTube" }, { value: "twitter", label: "X (Twitter)" }] },
          { name: "influencer_size", label: t("Influencer Büyüklüğü", "Influencer Size"), type: "multi-select", options: [{ value: "nano", label: "Nano (1K-10K)" }, { value: "micro", label: "Micro (10K-100K)" }, { value: "macro", label: "Macro (100K-1M)" }, { value: "mega", label: "Mega (1M+)" }] },
          { name: "budget", label: t("Bütçe ($)", "Budget ($)"), type: "currency", required: true },
          { name: "content_type", label: t("İçerik Türü", "Content Type"), type: "multi-select", options: [{ value: "post", label: "Post" }, { value: "story", label: "Story" }, { value: "reel", label: "Reel / Short" }, { value: "review", label: t("Ürün İncelemesi", "Product Review") }, { value: "unboxing", label: "Unboxing" }] },
          { name: "brief", label: t("Kampanya Özeti / Brief", "Campaign Summary / Brief"), type: "textarea", required: true },
        ],
      },
    ],
  },
];
