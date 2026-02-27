// =============================================================================
// ATLAS PLATFORM — Form Tanımları: Şirket & Hukuk (ATL-1xx)
// =============================================================================

import type { FormDefinition } from "../types";

export const llcLegalForms: FormDefinition[] = [
  // ─── ATL-101: LLC Kurulumu Başvurusu ───
  {
    code: "ATL-101",
    title: "LLC Kurulumu Başvurusu",
    description: "Amerika'da Limited Liability Company (LLC) kurmak için gerekli bilgilerin toplanması.",
    instructions:
      "Bu formu doldurarak ABD'de LLC kurulumu sürecinizi başlatabilirsiniz. Tüm alanları doğru ve eksiksiz doldurunuz. Bilgileriniz onaylandıktan sonra süreç başlatılacaktır.",
    category: "llc-legal",
    estimatedMinutes: 15,
    version: "1.0",
    active: true,
    sections: [
      {
        title: "Kişisel Bilgiler",
        description: "LLC sahibi olacak kişinin bilgileri",
        fields: [
          { name: "owner_full_name", label: "Ad Soyad", type: "text", required: true, placeholder: "Örn: Ahmet Yılmaz" },
          { name: "owner_email", label: "E-posta", type: "email", required: true },
          { name: "owner_phone", label: "Telefon", type: "phone", required: true, placeholder: "+90 5xx xxx xxxx" },
          { name: "owner_address_tr", label: "Türkiye Adresi", type: "textarea", required: true, placeholder: "Tam adres" },
          { name: "passport_number", label: "Pasaport Numarası", type: "text", required: true },
          { name: "tc_kimlik", label: "T.C. Kimlik Numarası", type: "text", required: true, validation: { pattern: "^[0-9]{11}$", patternMessage: "11 haneli TC kimlik numarası giriniz" } },
        ],
      },
      {
        title: "Şirket Bilgileri",
        description: "Kurulacak LLC'nin detayları",
        fields: [
          { name: "company_name_1", label: "Tercih Edilen Şirket Adı (1. seçenek)", type: "text", required: true, placeholder: "Örn: Atlas Commerce LLC" },
          { name: "company_name_2", label: "Alternatif Şirket Adı (2. seçenek)", type: "text", required: false },
          { name: "company_name_3", label: "Alternatif Şirket Adı (3. seçenek)", type: "text", required: false },
          {
            name: "state",
            label: "Kuruluş Eyaleti",
            type: "select",
            required: true,
            options: [
              { value: "wyoming", label: "Wyoming" },
              { value: "delaware", label: "Delaware" },
              { value: "florida", label: "Florida" },
              { value: "new_mexico", label: "New Mexico" },
              { value: "texas", label: "Texas" },
              { value: "other", label: "Diğer" },
            ],
          },
          { name: "state_other", label: "Diğer Eyalet", type: "text", showWhen: { field: "state", value: "other" } },
          {
            name: "business_type",
            label: "İş Alanı",
            type: "select",
            required: true,
            options: [
              { value: "ecommerce", label: "E-ticaret" },
              { value: "saas", label: "SaaS / Yazılım" },
              { value: "consulting", label: "Danışmanlık" },
              { value: "import_export", label: "İthalat / İhracat" },
              { value: "dropshipping", label: "Dropshipping" },
              { value: "other", label: "Diğer" },
            ],
          },
          { name: "business_description", label: "İş Tanımı", type: "textarea", required: true, placeholder: "Ne tür ürünler/hizmetler sunacaksınız?" },
          {
            name: "member_count",
            label: "Üye Sayısı",
            type: "radio",
            required: true,
            options: [
              { value: "single", label: "Tek üye (Single-member LLC)" },
              { value: "multi", label: "Çok üyeli (Multi-member LLC)" },
            ],
          },
          { name: "additional_members", label: "Ek Üye Bilgileri", type: "textarea", placeholder: "Diğer üyelerin ad-soyad ve hisse oranları", showWhen: { field: "member_count", value: "multi" } },
        ],
      },
      {
        title: "Ek Hizmetler",
        fields: [
          { name: "need_ein", label: "EIN (Vergi Numarası) başvurusu da yapılsın mı?", type: "radio", options: [{ value: "yes", label: "Evet" }, { value: "no", label: "Hayır" }], required: true },
          { name: "need_bank", label: "ABD banka hesabı açılışında destek ister misiniz?", type: "radio", options: [{ value: "yes", label: "Evet" }, { value: "no", label: "Hayır" }], required: true },
          { name: "need_reseller", label: "Reseller Permit gerekli mi?", type: "radio", options: [{ value: "yes", label: "Evet" }, { value: "no", label: "Bilmiyorum" }] },
          { name: "notes", label: "Ek Notlar", type: "textarea", placeholder: "Eklemek istediğiniz bilgiler..." },
        ],
      },
    ],
  },

  // ─── ATL-102: EIN Başvurusu ───
  {
    code: "ATL-102",
    title: "EIN (Vergi Numarası) Başvurusu",
    description: "IRS'den Employer Identification Number almak için bilgi formu.",
    instructions: "LLC kurulumunuz tamamlandıysa veya mevcut bir LLC'niz varsa bu formu doldurun.",
    category: "llc-legal",
    estimatedMinutes: 10,
    version: "1.0",
    active: true,
    sections: [
      {
        title: "LLC Bilgileri",
        fields: [
          { name: "llc_name", label: "LLC Tam Adı", type: "text", required: true, placeholder: "Örn: Atlas Commerce LLC" },
          { name: "formation_state", label: "Kuruluş Eyaleti", type: "text", required: true },
          { name: "formation_date", label: "Kuruluş Tarihi", type: "date", required: true },
          { name: "responsible_party", label: "Sorumlu Kişi (Responsible Party)", type: "text", required: true, helpText: "IRS nezdinde sorumlu olan kişi" },
          { name: "ssn_or_itin", label: "SSN veya ITIN (varsa)", type: "text", required: false, helpText: "Yoksa boş bırakabilirsiniz" },
        ],
      },
      {
        title: "İş Detayları",
        fields: [
          { name: "business_activity", label: "Ana İş Faailiyeti", type: "text", required: true, placeholder: "Örn: Online retail sales" },
          { name: "expected_employees", label: "Beklenen Çalışan Sayısı", type: "number", required: true, defaultValue: 0 },
          { name: "fiscal_year_end", label: "Mali Yıl Sonu", type: "select", required: true, options: [{ value: "december", label: "Aralık (Standart)" }, { value: "other", label: "Diğer" }] },
          { name: "mailing_address_us", label: "ABD Posta Adresi", type: "textarea", required: true, helpText: "EIN mektubunun gönderileceği adres" },
        ],
      },
    ],
  },

  // ─── ATL-103: Reseller Permit Başvurusu ───
  {
    code: "ATL-103",
    title: "Reseller Permit (Satış Vergisi Muafiyeti)",
    description: "Toptan alımlarda satış vergisi muafiyeti için başvuru.",
    category: "llc-legal",
    estimatedMinutes: 8,
    version: "1.0",
    active: true,
    sections: [
      {
        title: "Şirket Bilgileri",
        fields: [
          { name: "llc_name", label: "LLC Adı", type: "text", required: true },
          { name: "ein_number", label: "EIN Numarası", type: "text", required: true, placeholder: "XX-XXXXXXX" },
          { name: "state", label: "Başvuru Eyaleti", type: "text", required: true },
          { name: "business_address", label: "İş Adresi (ABD)", type: "textarea", required: true },
          { name: "product_types", label: "Satılacak Ürün Kategorileri", type: "textarea", required: true, placeholder: "Elektronik, giyim, kozmetik vb." },
          { name: "estimated_annual_sales", label: "Tahmini Yıllık Satış ($)", type: "currency", required: true },
        ],
      },
    ],
  },

  // ─── ATL-104: Marka Tescili ───
  {
    code: "ATL-104",
    title: "ABD Marka Tescili (Trademark) Başvurusu",
    description: "USPTO'ya marka tescili başvurusu için bilgi formu.",
    category: "llc-legal",
    estimatedMinutes: 12,
    version: "1.0",
    active: true,
    sections: [
      {
        title: "Marka Bilgileri",
        fields: [
          { name: "brand_name", label: "Tescil Edilecek Marka Adı", type: "text", required: true },
          {
            name: "mark_type",
            label: "Marka Tipi",
            type: "radio",
            required: true,
            options: [
              { value: "word", label: "Kelime Markası (Standard Character)" },
              { value: "design", label: "Logo/Tasarım Markası" },
              { value: "both", label: "Hem kelime hem tasarım" },
            ],
          },
          { name: "logo_file", label: "Logo Dosyası (varsa)", type: "file", showWhen: { field: "mark_type", value: ["design", "both"] } },
          { name: "goods_services", label: "Ürün/Hizmet Açıklaması", type: "textarea", required: true, helpText: "Markanın hangi ürün/hizmetlerde kullanılacağını açıklayın" },
          {
            name: "use_status",
            label: "Kullanım Durumu",
            type: "radio",
            required: true,
            options: [
              { value: "in_use", label: "Markayı zaten kullanıyorum" },
              { value: "intent_to_use", label: "Kullanmayı planlıyorum" },
            ],
          },
          { name: "first_use_date", label: "İlk Kullanım Tarihi", type: "date", showWhen: { field: "use_status", value: "in_use" } },
        ],
      },
      {
        title: "Sahiplik Bilgileri",
        fields: [
          { name: "owner_name", label: "Marka Sahibi (Kişi veya LLC)", type: "text", required: true },
          { name: "owner_type", label: "Sahip Tipi", type: "radio", required: true, options: [{ value: "individual", label: "Gerçek Kişi" }, { value: "llc", label: "LLC / Şirket" }] },
          { name: "owner_country", label: "Sahip Ülkesi", type: "text", required: true, defaultValue: "Türkiye" },
        ],
      },
    ],
  },
];
