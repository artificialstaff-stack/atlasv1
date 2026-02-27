// =============================================================================
// ATLAS PLATFORM — Form Tanımları: Markalama & Tasarım (ATL-6xx)
// =============================================================================

import type { FormDefinition } from "../types";

export const brandingDesignForms: FormDefinition[] = [
  // ─── ATL-601: Marka Kimliği Tasarım Talebi ───
  {
    code: "ATL-601",
    title: "Marka Kimliği Tasarım Paketi",
    description: "Logo, renk paleti, tipografi ve marka rehberi oluşturma talebi.",
    instructions: "Profesyonel tasarım ekibimiz markanız için eksiksiz bir kimlik paketi hazırlayacaktır. Süreç: brief → konsept → revize → final dosyalar.",
    category: "branding-design",
    estimatedMinutes: 15,
    version: "1.0",
    active: true,
    sections: [
      {
        title: "Marka Hakkında",
        fields: [
          { name: "brand_name", label: "Marka Adı", type: "text", required: true },
          { name: "industry", label: "Sektör", type: "text", required: true, placeholder: "Örn: Moda, Teknoloji, Sağlık" },
          { name: "target_audience", label: "Hedef Kitle", type: "textarea", required: true, placeholder: "Markanızın hedef müşteri profili" },
          { name: "brand_personality", label: "Marka Kişiliği", type: "multi-select", required: true, options: [{ value: "modern", label: "Modern" }, { value: "classic", label: "Klasik" }, { value: "minimal", label: "Minimal" }, { value: "bold", label: "Cesur / Dikkat Çekici" }, { value: "luxury", label: "Lüks / Premium" }, { value: "eco", label: "Doğal / Eko" }] },
          { name: "brand_story", label: "Marka Hikayesi", type: "textarea", placeholder: "Markanızın arkasındaki hikaye nedir?" },
        ],
      },
      {
        title: "Tasarım Tercihleri",
        fields: [
          { name: "color_preferences", label: "Renk Tercihleri", type: "textarea", placeholder: "Tercih ettiğiniz renkler veya kaçınmak istediğiniz renkler" },
          { name: "style_references", label: "Referans / İlham Linkleri", type: "textarea", placeholder: "Beğendiğiniz diğer markaların linkleri veya Pinterest board'ları" },
          { name: "reference_files", label: "Referans Dosyaları", type: "file" },
          { name: "existing_logo", label: "Mevcut Logo (varsa, güncelleme için)", type: "file" },
          {
            name: "deliverables",
            label: "İstenen Çıktılar",
            type: "multi-select",
            required: true,
            options: [
              { value: "logo_main", label: "Ana Logo" },
              { value: "logo_variations", label: "Logo Varyasyonları (dikey, yatay, ikon)" },
              { value: "color_palette", label: "Renk Paleti" },
              { value: "typography", label: "Tipografi Rehberi" },
              { value: "brand_guide", label: "Tam Marka Rehberi (Brand Guide)" },
              { value: "social_templates", label: "Sosyal Medya Şablonları" },
            ],
          },
        ],
      },
      {
        title: "Proje Bilgileri",
        fields: [
          { name: "deadline", label: "Teslim Tarihi", type: "date" },
          { name: "budget_range", label: "Bütçe Aralığı", type: "select", options: [{ value: "basic", label: "Temel ($500-$1,000)" }, { value: "standard", label: "Standart ($1,000-$3,000)" }, { value: "premium", label: "Premium ($3,000-$5,000)" }, { value: "enterprise", label: "Kurumsal ($5,000+)" }] },
          { name: "notes", label: "Ek Notlar", type: "textarea" },
        ],
      },
    ],
  },

  // ─── ATL-602: Ambalaj Tasarım Talebi ───
  {
    code: "ATL-602",
    title: "Ambalaj & Paket Tasarımı",
    description: "Ürün ambalajı, kutu ve etiket tasarımı talebi.",
    category: "branding-design",
    estimatedMinutes: 10,
    version: "1.0",
    active: true,
    sections: [
      {
        title: "Ürün Bilgileri",
        fields: [
          { name: "product_name", label: "Ürün Adı", type: "text", required: true },
          { name: "product_type", label: "Ürün Tipi", type: "text", required: true, placeholder: "Örn: Cilt bakım kremi, elektronik aksesuar" },
          { name: "product_dimensions", label: "Ürün Boyutları (cm)", type: "text", required: true, placeholder: "En x Boy x Yükseklik" },
          { name: "product_weight", label: "Ürün Ağırlığı (g)", type: "number" },
          { name: "product_photos", label: "Ürün Fotoğrafları", type: "file" },
        ],
      },
      {
        title: "Ambalaj Detayları",
        fields: [
          { name: "packaging_type", label: "Ambalaj Tipi", type: "multi-select", required: true, options: [{ value: "box", label: "Kutu" }, { value: "pouch", label: "Poşet / Pouch" }, { value: "label", label: "Ürün Etiketi" }, { value: "insert", label: "Kutu içi kart / Insert" }, { value: "sticker", label: "Sticker" }, { value: "sleeve", label: "Sleeve / Kılıf" }] },
          { name: "material_preference", label: "Malzeme Tercihi", type: "select", options: [{ value: "cardboard", label: "Karton" }, { value: "corrugated", label: "Oluklu mukavva" }, { value: "kraft", label: "Kraft" }, { value: "plastic", label: "Plastik" }, { value: "eco", label: "Eko-dostu / Geri dönüştürülebilir" }, { value: "no_pref", label: "Tercihim yok" }] },
          { name: "print_colors", label: "Baskı", type: "select", options: [{ value: "full_color", label: "Tam renkli (CMYK)" }, { value: "two_color", label: "2 renk" }, { value: "one_color", label: "Tek renk" }, { value: "no_pref", label: "Tercihim yok" }] },
          { name: "required_text", label: "Ambalaj Üzerindeki Zorunlu Metinler", type: "textarea", placeholder: "Ingredients, uyarılar, barkod bilgisi vb." },
          { name: "quantity", label: "İlk Sipariş Adedi", type: "number" },
          { name: "notes", label: "Ek Notlar", type: "textarea" },
        ],
      },
    ],
  },

  // ─── ATL-603: Ürün Fotoğrafçılığı Talebi ───
  {
    code: "ATL-603",
    title: "Ürün Fotoğrafçılığı Talebi",
    description: "E-ticaret için profesyonel ürün fotoğrafları çekimi.",
    category: "branding-design",
    estimatedMinutes: 6,
    version: "1.0",
    active: true,
    sections: [
      {
        title: "Çekim Detayları",
        fields: [
          { name: "product_count", label: "Fotoğraflanacak Ürün Sayısı", type: "number", required: true },
          { name: "photo_type", label: "Fotoğraf Tipi", type: "multi-select", required: true, options: [{ value: "white_bg", label: "Beyaz fon (Amazon standart)" }, { value: "lifestyle", label: "Lifestyle / Kullanım ortamı" }, { value: "infographic", label: "İnfografik" }, { value: "detail", label: "Detay / Yakın çekim" }, { value: "scale", label: "Ölçek görseli" }, { value: "video", label: "Ürün videosu" }] },
          { name: "platform_requirements", label: "Platform Gereksinimleri", type: "multi-select", options: [{ value: "amazon", label: "Amazon" }, { value: "shopify", label: "Shopify" }, { value: "instagram", label: "Instagram" }, { value: "tiktok", label: "TikTok" }] },
          { name: "photos_per_product", label: "Ürün Başına Fotoğraf Sayısı", type: "number", required: true, defaultValue: 7 },
          { name: "special_requirements", label: "Özel Gereksinimler", type: "textarea", placeholder: "Belirli açılar, props, model kullanımı vb." },
          { name: "products_location", label: "Ürünler Nerede?", type: "select", required: true, options: [{ value: "us_warehouse", label: "Atlas ABD deposunda" }, { value: "ship_to_studio", label: "Stüdyoya göndereceğim" }, { value: "digital_only", label: "Dijital/3D render istiyorum" }] },
        ],
      },
    ],
  },
];
