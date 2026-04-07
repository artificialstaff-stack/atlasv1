// =============================================================================
// ATLAS PLATFORM — Form Tanımları: Markalama & Tasarım (ATL-6xx)
// =============================================================================

import { localized as t, type LocalizedFormDefinition } from "../localization";

export const brandingDesignForms: LocalizedFormDefinition[] = [
  {
    code: "ATL-601",
    title: t("Marka Kimliği Tasarım Paketi", "Brand Identity Design Package"),
    description: t("Logo, renk paleti, tipografi ve marka rehberi oluşturma talebi.", "Request to create a logo, color palette, typography, and brand guide."),
    instructions: t("Profesyonel tasarım ekibimiz markanız için eksiksiz bir kimlik paketi hazırlayacaktır. Süreç: brief → konsept → revize → final dosyalar.", "Our design team will prepare a complete identity package for your brand. Process: brief → concept → revisions → final files."),
    category: "branding-design",
    estimatedMinutes: 15,
    version: "1.0",
    active: true,
    sections: [
      {
        title: t("Marka Hakkında", "About the Brand"),
        fields: [
          { name: "brand_name", label: t("Marka Adı", "Brand Name"), type: "text", required: true },
          { name: "industry", label: t("Sektör", "Industry"), type: "text", required: true, placeholder: t("Örn: Moda, Teknoloji, Sağlık", "e.g. Fashion, Technology, Healthcare") },
          { name: "target_audience", label: t("Hedef Kitle", "Target Audience"), type: "textarea", required: true, placeholder: t("Markanızın hedef müşteri profili", "Your brand's target customer profile") },
          { name: "brand_personality", label: t("Marka Kişiliği", "Brand Personality"), type: "multi-select", required: true, options: [{ value: "modern", label: t("Modern", "Modern") }, { value: "classic", label: t("Klasik", "Classic") }, { value: "minimal", label: t("Minimal", "Minimal") }, { value: "bold", label: t("Cesur / Dikkat Çekici", "Bold / Eye-catching") }, { value: "luxury", label: t("Lüks / Premium", "Luxury / Premium") }, { value: "eco", label: t("Doğal / Eko", "Natural / Eco") }] },
          { name: "brand_story", label: t("Marka Hikayesi", "Brand Story"), type: "textarea", placeholder: t("Markanızın arkasındaki hikaye nedir?", "What is the story behind your brand?") },
        ],
      },
      {
        title: t("Tasarım Tercihleri", "Design Preferences"),
        fields: [
          { name: "color_preferences", label: t("Renk Tercihleri", "Color Preferences"), type: "textarea", placeholder: t("Tercih ettiğiniz renkler veya kaçınmak istediğiniz renkler", "Colors you prefer or want to avoid") },
          { name: "style_references", label: t("Referans / İlham Linkleri", "Reference / Inspiration Links"), type: "textarea", placeholder: t("Beğendiğiniz diğer markaların linkleri veya Pinterest board'ları", "Links to brands you like or Pinterest boards") },
          { name: "reference_files", label: t("Referans Dosyaları", "Reference Files"), type: "file" },
          { name: "existing_logo", label: t("Mevcut Logo (varsa, güncelleme için)", "Existing Logo (if any, for refresh)"), type: "file" },
          {
            name: "deliverables",
            label: t("İstenen Çıktılar", "Requested Deliverables"),
            type: "multi-select",
            required: true,
            options: [
              { value: "logo_main", label: t("Ana Logo", "Primary Logo") },
              { value: "logo_variations", label: t("Logo Varyasyonları (dikey, yatay, ikon)", "Logo Variations (vertical, horizontal, icon)") },
              { value: "color_palette", label: t("Renk Paleti", "Color Palette") },
              { value: "typography", label: t("Tipografi Rehberi", "Typography Guide") },
              { value: "brand_guide", label: t("Tam Marka Rehberi (Brand Guide)", "Full Brand Guide") },
              { value: "social_templates", label: t("Sosyal Medya Şablonları", "Social Media Templates") },
            ],
          },
        ],
      },
      {
        title: t("Proje Bilgileri", "Project Information"),
        fields: [
          { name: "deadline", label: t("Teslim Tarihi", "Deadline"), type: "date" },
          { name: "budget_range", label: t("Bütçe Aralığı", "Budget Range"), type: "select", options: [{ value: "basic", label: t("Temel ($500-$1,000)", "Basic ($500-$1,000)") }, { value: "standard", label: t("Standart ($1,000-$3,000)", "Standard ($1,000-$3,000)") }, { value: "premium", label: t("Premium ($3,000-$5,000)", "Premium ($3,000-$5,000)") }, { value: "enterprise", label: t("Kurumsal ($5,000+)", "Enterprise ($5,000+)") }] },
          { name: "notes", label: t("Ek Notlar", "Additional Notes"), type: "textarea" },
        ],
      },
    ],
  },
  {
    code: "ATL-602",
    title: t("Ambalaj & Paket Tasarımı", "Packaging & Box Design"),
    description: t("Ürün ambalajı, kutu ve etiket tasarımı talebi.", "Request for product packaging, box, and label design."),
    category: "branding-design",
    estimatedMinutes: 10,
    version: "1.0",
    active: true,
    sections: [
      {
        title: t("Ürün Bilgileri", "Product Information"),
        fields: [
          { name: "product_name", label: t("Ürün Adı", "Product Name"), type: "text", required: true },
          { name: "product_type", label: t("Ürün Tipi", "Product Type"), type: "text", required: true, placeholder: t("Örn: Cilt bakım kremi, elektronik aksesuar", "e.g. Skincare cream, electronic accessory") },
          { name: "product_dimensions", label: t("Ürün Boyutları (cm)", "Product Dimensions (cm)"), type: "text", required: true, placeholder: "En x Boy x Yükseklik" },
          { name: "product_weight", label: t("Ürün Ağırlığı (g)", "Product Weight (g)"), type: "number" },
          { name: "product_photos", label: t("Ürün Fotoğrafları", "Product Photos"), type: "file" },
        ],
      },
      {
        title: t("Ambalaj Detayları", "Packaging Details"),
        fields: [
          { name: "packaging_type", label: t("Ambalaj Tipi", "Packaging Type"), type: "multi-select", required: true, options: [{ value: "box", label: t("Kutu", "Box") }, { value: "pouch", label: t("Poşet / Pouch", "Pouch / Bag") }, { value: "label", label: t("Ürün Etiketi", "Product Label") }, { value: "insert", label: t("Kutu içi kart / Insert", "Insert card") }, { value: "sticker", label: "Sticker" }, { value: "sleeve", label: t("Sleeve / Kılıf", "Sleeve / Cover") }] },
          { name: "material_preference", label: t("Malzeme Tercihi", "Material Preference"), type: "select", options: [{ value: "cardboard", label: t("Karton", "Cardboard") }, { value: "corrugated", label: t("Oluklu mukavva", "Corrugated cardboard") }, { value: "kraft", label: "Kraft" }, { value: "plastic", label: t("Plastik", "Plastic") }, { value: "eco", label: t("Eko-dostu / Geri dönüştürülebilir", "Eco-friendly / Recyclable") }, { value: "no_pref", label: t("Tercihim yok", "No preference") }] },
          { name: "print_colors", label: t("Baskı", "Print"), type: "select", options: [{ value: "full_color", label: t("Tam renkli (CMYK)", "Full color (CMYK)") }, { value: "two_color", label: t("2 renk", "2 colors") }, { value: "one_color", label: t("Tek renk", "Single color") }, { value: "no_pref", label: t("Tercihim yok", "No preference") }] },
          { name: "required_text", label: t("Ambalaj Üzerindeki Zorunlu Metinler", "Required Copy on Packaging"), type: "textarea", placeholder: t("Ingredients, uyarılar, barkod bilgisi vb.", "Ingredients, warnings, barcode info, etc.") },
          { name: "quantity", label: t("İlk Sipariş Adedi", "Initial Order Quantity"), type: "number" },
          { name: "notes", label: t("Ek Notlar", "Additional Notes"), type: "textarea" },
        ],
      },
    ],
  },
  {
    code: "ATL-603",
    title: t("Ürün Fotoğrafçılığı Talebi", "Product Photography Request"),
    description: t("E-ticaret için profesyonel ürün fotoğrafları çekimi.", "Professional product photography for e-commerce."),
    category: "branding-design",
    estimatedMinutes: 6,
    version: "1.0",
    active: true,
    sections: [
      {
        title: t("Çekim Detayları", "Shoot Details"),
        fields: [
          { name: "product_count", label: t("Fotoğraflanacak Ürün Sayısı", "Number of Products to Photograph"), type: "number", required: true },
          { name: "photo_type", label: t("Fotoğraf Tipi", "Photo Type"), type: "multi-select", required: true, options: [{ value: "white_bg", label: t("Beyaz fon (Amazon standart)", "White background (Amazon standard)") }, { value: "lifestyle", label: t("Lifestyle / Kullanım ortamı", "Lifestyle / in-use") }, { value: "infographic", label: t("İnfografik", "Infographic") }, { value: "detail", label: t("Detay / Yakın çekim", "Detail / Close-up") }, { value: "scale", label: t("Ölçek görseli", "Scale shot") }, { value: "video", label: t("Ürün videosu", "Product video") }] },
          { name: "platform_requirements", label: t("Platform Gereksinimleri", "Platform Requirements"), type: "multi-select", options: [{ value: "amazon", label: "Amazon" }, { value: "shopify", label: "Shopify" }, { value: "instagram", label: "Instagram" }, { value: "tiktok", label: "TikTok" }] },
          { name: "photos_per_product", label: t("Ürün Başına Fotoğraf Sayısı", "Photos per Product"), type: "number", required: true, defaultValue: 7 },
          { name: "special_requirements", label: t("Özel Gereksinimler", "Special Requirements"), type: "textarea", placeholder: t("Belirli açılar, props, model kullanımı vb.", "Specific angles, props, model usage, etc.") },
          { name: "products_location", label: t("Ürünler Nerede?", "Where are the products?"), type: "select", required: true, options: [{ value: "us_warehouse", label: t("Atlas ABD deposunda", "At Atlas US warehouse") }, { value: "ship_to_studio", label: t("Stüdyoya göndereceğim", "I will ship them to the studio") }, { value: "digital_only", label: t("Dijital/3D render istiyorum", "I need a digital / 3D render") }] },
        ],
      },
    ],
  },
];
