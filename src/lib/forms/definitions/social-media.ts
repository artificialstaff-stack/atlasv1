// =============================================================================
// ATLAS PLATFORM — Form Tanımları: Sosyal Medya (ATL-5xx)
// =============================================================================

import { localized as t, type LocalizedFormDefinition } from "../localization";

export const socialMediaForms: LocalizedFormDefinition[] = [
  {
    code: "ATL-501",
    title: t("Sosyal Medya Hesap Kurulumu", "Social Media Account Setup"),
    description: t("Markanız için sosyal medya hesaplarının açılması ve optimize edilmesi.", "Open and optimize social media accounts for your brand."),
    instructions: t("Markanız adına profesyonel sosyal medya profilleri oluşturacağız. Tüm platformlarda tutarlı bir marka kimliği kurulacaktır.", "We will create professional social profiles on your behalf. A consistent brand identity will be established across all platforms."),
    category: "social-media",
    estimatedMinutes: 10,
    version: "1.0",
    active: true,
    sections: [
      {
        title: t("Marka Bilgileri", "Brand Information"),
        fields: [
          { name: "brand_name", label: t("Marka Adı", "Brand Name"), type: "text", required: true },
          { name: "brand_slogan", label: t("Slogan / Tagline", "Slogan / Tagline"), type: "text", placeholder: t("Markanızın kısa sloganı", "Your brand's short slogan") },
          { name: "brand_description", label: t("Marka Açıklaması", "Brand Description"), type: "textarea", required: true, placeholder: t("Markanız ne yapıyor? Hedef kitleniz kim?", "What does your brand do? Who is your target audience?") },
          { name: "website_url", label: t("Web Sitesi", "Website"), type: "url" },
          { name: "brand_logo", label: t("Marka Logosu", "Brand Logo"), type: "file" },
          { name: "brand_colors", label: t("Marka Renkleri (HEX kodları)", "Brand Colors (HEX codes)"), type: "text", placeholder: t("Örn: #FF5733, #2C3E50", "e.g. #FF5733, #2C3E50") },
        ],
      },
      {
        title: t("Platform Tercihleri", "Platform Preferences"),
        fields: [
          { name: "platforms", label: t("Açılacak Platformlar", "Platforms to Open"), type: "multi-select", required: true, options: [{ value: "instagram", label: "Instagram" }, { value: "tiktok", label: "TikTok" }, { value: "facebook_page", label: t("Facebook Sayfası", "Facebook Page") }, { value: "twitter", label: "X (Twitter)" }, { value: "youtube", label: "YouTube" }, { value: "pinterest", label: "Pinterest" }] },
          { name: "preferred_username", label: t("Tercih Edilen Kullanıcı Adı", "Preferred Username"), type: "text", required: true, placeholder: "@markaadi" },
          { name: "alt_usernames", label: t("Alternatif Kullanıcı Adları", "Alternative Usernames"), type: "text", placeholder: t("1. ve 2. alternatif", "1st and 2nd alternatives") },
          { name: "content_language", label: t("İçerik Dili", "Content Language"), type: "select", required: true, options: [{ value: "en", label: t("İngilizce", "English") }, { value: "tr", label: t("Türkçe", "Turkish") }, { value: "both", label: t("İkisi de", "Both") }] },
        ],
      },
      {
        title: t("İçerik Tercihleri", "Content Preferences"),
        fields: [
          { name: "tone_of_voice", label: t("İletişim Tonu", "Tone of Voice"), type: "select", required: true, options: [{ value: "professional", label: t("Profesyonel", "Professional") }, { value: "casual", label: t("Samimi / Günlük", "Casual / Everyday") }, { value: "fun", label: t("Eğlenceli", "Fun") }, { value: "luxury", label: t("Premium / Lüks", "Premium / Luxury") }, { value: "educational", label: t("Eğitici / Bilgilendirici", "Educational / Informative") }] },
          { name: "content_themes", label: t("İçerik Temaları", "Content Themes"), type: "textarea", required: true, placeholder: t("Ürün tanıtımları, müşteri yorumları, eğitim içerikleri, sahne arkası vb.", "Product launches, customer reviews, educational content, behind the scenes, etc.") },
          { name: "reference_accounts", label: t("Beğendiğiniz Referans Hesaplar", "Reference Accounts You Like"), type: "textarea", placeholder: t("Benchmarking için beğendiğiniz hesapların linkleri", "Links to accounts you like for benchmarking") },
        ],
      },
    ],
  },
  {
    code: "ATL-502",
    title: t("Aylık İçerik Planı Talebi", "Monthly Content Plan Request"),
    description: t("Sosyal medya için aylık içerik takvimi ve plan oluşturma talebi.", "Request to create a monthly content calendar and plan for social media."),
    category: "social-media",
    estimatedMinutes: 8,
    version: "1.0",
    active: true,
    sections: [
      {
        title: t("Plan Detayları", "Plan Details"),
        fields: [
          { name: "month", label: t("Plan Ayı", "Plan Month"), type: "select", required: true, options: [{ value: "01", label: t("Ocak", "January") }, { value: "02", label: t("Şubat", "February") }, { value: "03", label: t("Mart", "March") }, { value: "04", label: t("Nisan", "April") }, { value: "05", label: t("Mayıs", "May") }, { value: "06", label: t("Haziran", "June") }] },
          { name: "platforms", label: t("Platformlar", "Platforms"), type: "multi-select", required: true, options: [{ value: "instagram", label: "Instagram" }, { value: "tiktok", label: "TikTok" }, { value: "facebook", label: "Facebook" }, { value: "twitter", label: "X (Twitter)" }, { value: "youtube", label: "YouTube" }, { value: "pinterest", label: "Pinterest" }] },
          { name: "posts_per_week", label: t("Haftalık Post Sayısı", "Posts per Week"), type: "number", required: true, defaultValue: 3 },
          { name: "stories_per_week", label: t("Haftalık Story Sayısı", "Stories per Week"), type: "number", defaultValue: 5 },
          { name: "reels_per_week", label: t("Haftalık Reel/Short Sayısı", "Reels / Shorts per Week"), type: "number", defaultValue: 2 },
        ],
      },
      {
        title: t("Özel Talepler", "Special Requests"),
        fields: [
          { name: "upcoming_launches", label: t("Yaklaşan Ürün/Kampanya Lansmanları", "Upcoming Product / Campaign Launches"), type: "textarea", placeholder: t("Ay içinde planlanan özel etkinlikler veya lansmanlar", "Special events or launches planned for the month") },
          { name: "seasonal_events", label: t("Mevsimsel Etkinlikler", "Seasonal Events"), type: "textarea", placeholder: "Valentine's Day, Black Friday, etc." },
          { name: "hashtag_strategy", label: t("Hashtag Stratejisi Notu", "Hashtag Strategy Note"), type: "textarea" },
          { name: "notes", label: t("Ek Notlar", "Additional Notes"), type: "textarea" },
        ],
      },
    ],
  },
  {
    code: "ATL-503",
    title: t("Topluluk Yönetimi (Community Management) Talebi", "Community Management Request"),
    description: t("Sosyal medya hesaplarınızın günlük yönetimi ve etkileşim takibi.", "Daily management and engagement monitoring for your social media accounts."),
    category: "social-media",
    estimatedMinutes: 6,
    version: "1.0",
    active: true,
    sections: [
      {
        title: t("Hizmet Kapsamı", "Service Scope"),
        fields: [
          { name: "platforms", label: t("Yönetilecek Platformlar", "Platforms to Manage"), type: "multi-select", required: true, options: [{ value: "instagram", label: "Instagram" }, { value: "tiktok", label: "TikTok" }, { value: "facebook", label: "Facebook" }, { value: "twitter", label: "X (Twitter)" }] },
          { name: "services", label: t("İstenen Hizmetler", "Requested Services"), type: "multi-select", required: true, options: [{ value: "comment_management", label: t("Yorum yanıtlama", "Comment management") }, { value: "dm_management", label: t("DM yanıtlama", "DM responses") }, { value: "crisis_management", label: t("Kriz yönetimi", "Crisis management") }, { value: "review_response", label: t("Değerlendirme yanıtlama", "Review responses") }, { value: "engagement", label: t("Proaktif etkileşim", "Proactive engagement") }] },
          { name: "response_hours", label: t("Yanıt Saatleri (EST)", "Response Hours (EST)"), type: "text", required: true, placeholder: t("Örn: 09:00-18:00 EST", "e.g. 09:00-18:00 EST") },
          { name: "brand_guidelines", label: t("Yanıt Kuralları / Marka Rehberi", "Response Rules / Brand Guide"), type: "textarea", helpText: t("Müşterilere nasıl yanıt verilmeli? Hangi cümleler kullanılmalı/kullanılmamalı?", "How should we reply to customers? Which phrases should or shouldn't be used?") },
          { name: "escalation_contact", label: t("Eskalasyon İçin İletişim", "Escalation Contact"), type: "text", required: true, helpText: t("Kritik durumda sizinle nasıl iletişime geçelim?", "How should we contact you in urgent situations?") },
        ],
      },
    ],
  },
];
