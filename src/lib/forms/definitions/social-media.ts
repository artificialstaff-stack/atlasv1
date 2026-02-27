// =============================================================================
// ATLAS PLATFORM — Form Tanımları: Sosyal Medya (ATL-5xx)
// =============================================================================

import type { FormDefinition } from "../types";

export const socialMediaForms: FormDefinition[] = [
  // ─── ATL-501: Sosyal Medya Hesap Kurulumu ───
  {
    code: "ATL-501",
    title: "Sosyal Medya Hesap Kurulumu",
    description: "Markanız için sosyal medya hesaplarının açılması ve optimize edilmesi.",
    instructions: "Markanız adına profesyonel sosyal medya profilleri oluşturacağız. Tüm platformlarda tutarlı bir marka kimliği kurulacaktır.",
    category: "social-media",
    estimatedMinutes: 10,
    version: "1.0",
    active: true,
    sections: [
      {
        title: "Marka Bilgileri",
        fields: [
          { name: "brand_name", label: "Marka Adı", type: "text", required: true },
          { name: "brand_slogan", label: "Slogan / Tagline", type: "text", placeholder: "Markanızın kısa sloganı" },
          { name: "brand_description", label: "Marka Açıklaması", type: "textarea", required: true, placeholder: "Markanız ne yapıyor? Hedef kitleniz kim?" },
          { name: "website_url", label: "Web Sitesi", type: "url" },
          { name: "brand_logo", label: "Marka Logosu", type: "file" },
          { name: "brand_colors", label: "Marka Renkleri (HEX kodları)", type: "text", placeholder: "Örn: #FF5733, #2C3E50" },
        ],
      },
      {
        title: "Platform Tercihleri",
        fields: [
          { name: "platforms", label: "Açılacak Platformlar", type: "multi-select", required: true, options: [{ value: "instagram", label: "Instagram" }, { value: "tiktok", label: "TikTok" }, { value: "facebook_page", label: "Facebook Sayfası" }, { value: "twitter", label: "X (Twitter)" }, { value: "youtube", label: "YouTube" }, { value: "pinterest", label: "Pinterest" }] },
          { name: "preferred_username", label: "Tercih Edilen Kullanıcı Adı", type: "text", required: true, placeholder: "@markaadi" },
          { name: "alt_usernames", label: "Alternatif Kullanıcı Adları", type: "text", placeholder: "1. ve 2. alternatif" },
          { name: "content_language", label: "İçerik Dili", type: "select", required: true, options: [{ value: "en", label: "İngilizce" }, { value: "tr", label: "Türkçe" }, { value: "both", label: "İkisi de" }] },
        ],
      },
      {
        title: "İçerik Tercihleri",
        fields: [
          { name: "tone_of_voice", label: "İletişim Tonu", type: "select", required: true, options: [{ value: "professional", label: "Profesyonel" }, { value: "casual", label: "Samimi / Günlük" }, { value: "fun", label: "Eğlenceli" }, { value: "luxury", label: "Premium / Lüks" }, { value: "educational", label: "Eğitici / Bilgilendirici" }] },
          { name: "content_themes", label: "İçerik Temaları", type: "textarea", required: true, placeholder: "Ürün tanıtımları, müşteri yorumları, eğitim içerikleri, sahne arkası vb." },
          { name: "reference_accounts", label: "Beğendiğiniz Referans Hesaplar", type: "textarea", placeholder: "Benchmarking için beğendiğiniz hesapların linkleri" },
        ],
      },
    ],
  },

  // ─── ATL-502: İçerik Planı Talebi ───
  {
    code: "ATL-502",
    title: "Aylık İçerik Planı Talebi",
    description: "Sosyal medya için aylık içerik takvimi ve plan oluşturma talebi.",
    category: "social-media",
    estimatedMinutes: 8,
    version: "1.0",
    active: true,
    sections: [
      {
        title: "Plan Detayları",
        fields: [
          { name: "month", label: "Plan Ayı", type: "select", required: true, options: [{ value: "01", label: "Ocak" }, { value: "02", label: "Şubat" }, { value: "03", label: "Mart" }, { value: "04", label: "Nisan" }, { value: "05", label: "Mayıs" }, { value: "06", label: "Haziran" }] },
          { name: "platforms", label: "Platformlar", type: "multi-select", required: true, options: [{ value: "instagram", label: "Instagram" }, { value: "tiktok", label: "TikTok" }, { value: "facebook", label: "Facebook" }, { value: "twitter", label: "X (Twitter)" }, { value: "youtube", label: "YouTube" }, { value: "pinterest", label: "Pinterest" }] },
          { name: "posts_per_week", label: "Haftalık Post Sayısı", type: "number", required: true, defaultValue: 3 },
          { name: "stories_per_week", label: "Haftalık Story Sayısı", type: "number", defaultValue: 5 },
          { name: "reels_per_week", label: "Haftalık Reel/Short Sayısı", type: "number", defaultValue: 2 },
        ],
      },
      {
        title: "Özel Talepler",
        fields: [
          { name: "upcoming_launches", label: "Yaklaşan Ürün/Kampanya Lansmanları", type: "textarea", placeholder: "Ay içinde planlanan özel etkinlikler veya lansmanlar" },
          { name: "seasonal_events", label: "Mevsimsel Etkinlikler", type: "textarea", placeholder: "Valentine's Day, Black Friday, vb." },
          { name: "hashtag_strategy", label: "Hashtag Stratejisi Notu", type: "textarea" },
          { name: "notes", label: "Ek Notlar", type: "textarea" },
        ],
      },
    ],
  },

  // ─── ATL-503: Topluluk Yönetimi Talebi ───
  {
    code: "ATL-503",
    title: "Topluluk Yönetimi (Community Management) Talebi",
    description: "Sosyal medya hesaplarınızın günlük yönetimi ve etkileşim takibi.",
    category: "social-media",
    estimatedMinutes: 6,
    version: "1.0",
    active: true,
    sections: [
      {
        title: "Hizmet Kapsamı",
        fields: [
          { name: "platforms", label: "Yönetilecek Platformlar", type: "multi-select", required: true, options: [{ value: "instagram", label: "Instagram" }, { value: "tiktok", label: "TikTok" }, { value: "facebook", label: "Facebook" }, { value: "twitter", label: "X (Twitter)" }] },
          { name: "services", label: "İstenen Hizmetler", type: "multi-select", required: true, options: [{ value: "comment_management", label: "Yorum yanıtlama" }, { value: "dm_management", label: "DM yanıtlama" }, { value: "crisis_management", label: "Kriz yönetimi" }, { value: "review_response", label: "Değerlendirme yanıtlama" }, { value: "engagement", label: "Proaktif etkileşim" }] },
          { name: "response_hours", label: "Yanıt Saatleri (EST)", type: "text", required: true, placeholder: "Örn: 09:00-18:00 EST" },
          { name: "brand_guidelines", label: "Yanıt Kuralları / Marka Rehberi", type: "textarea", helpText: "Müşterilere nasıl yanıt verilmeli? Hangi cümleler kullanılmalı/kullanılmamalı?" },
          { name: "escalation_contact", label: "Eskalasyon İçin İletişim", type: "text", required: true, helpText: "Kritik durumda sizinle nasıl iletişime geçelim?" },
        ],
      },
    ],
  },
];
