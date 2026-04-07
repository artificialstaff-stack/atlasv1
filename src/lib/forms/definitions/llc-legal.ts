// =============================================================================
// ATLAS PLATFORM — Form Tanımları: Şirket & Hukuk (ATL-1xx)
// =============================================================================

import { localized as t, type LocalizedFormDefinition } from "../localization";

export const llcLegalForms: LocalizedFormDefinition[] = [
  {
    code: "ATL-101",
    title: t("LLC Kurulumu Başvurusu", "LLC Formation Application"),
    description: t("Amerika'da Limited Liability Company (LLC) kurmak için gerekli bilgilerin toplanması.", "Collect the information required to form a Limited Liability Company (LLC) in the United States."),
    instructions: t(
      "Bu formu doldurarak ABD'de LLC kurulumu sürecinizi başlatabilirsiniz. Tüm alanları doğru ve eksiksiz doldurunuz. Bilgileriniz onaylandıktan sonra süreç başlatılacaktır.",
      "Fill out this form to start your LLC formation process in the United States. Complete all fields accurately. The process begins once your information is reviewed and approved."
    ),
    category: "llc-legal",
    estimatedMinutes: 15,
    version: "1.0",
    active: true,
    sections: [
      {
        title: t("Kişisel Bilgiler", "Personal Information"),
        description: t("LLC sahibi olacak kişinin bilgileri", "Information about the person who will own the LLC"),
        fields: [
          { name: "owner_full_name", label: t("Ad Soyad", "Full Name"), type: "text", required: true, placeholder: t("Örn: Ahmet Yılmaz", "e.g. John Smith") },
          { name: "owner_email", label: t("E-posta", "Email"), type: "email", required: true },
          { name: "owner_phone", label: t("Telefon", "Phone"), type: "phone", required: true, placeholder: "+90 5xx xxx xxxx" },
          { name: "owner_address_tr", label: t("Türkiye Adresi", "Turkey Address"), type: "textarea", required: true, placeholder: t("Tam adres", "Full address") },
          { name: "passport_number", label: t("Pasaport Numarası", "Passport Number"), type: "text", required: true },
          { name: "tc_kimlik", label: t("T.C. Kimlik Numarası", "Turkish ID Number"), type: "text", required: true, validation: { pattern: "^[0-9]{11}$", patternMessage: t("11 haneli TC kimlik numarası giriniz", "Enter an 11-digit Turkish ID number") } },
        ],
      },
      {
        title: t("Şirket Bilgileri", "Company Information"),
        description: t("Kurulacak LLC'nin detayları", "Details of the LLC to be formed"),
        fields: [
          { name: "company_name_1", label: t("Tercih Edilen Şirket Adı (1. seçenek)", "Preferred Company Name (Option 1)"), type: "text", required: true, placeholder: t("Örn: Atlas Commerce LLC", "e.g. Atlas Commerce LLC") },
          { name: "company_name_2", label: t("Alternatif Şirket Adı (2. seçenek)", "Alternative Company Name (Option 2)"), type: "text", required: false },
          { name: "company_name_3", label: t("Alternatif Şirket Adı (3. seçenek)", "Alternative Company Name (Option 3)"), type: "text", required: false },
          {
            name: "state",
            label: t("Kuruluş Eyaleti", "Formation State"),
            type: "select",
            required: true,
            options: [
              { value: "wyoming", label: "Wyoming" },
              { value: "delaware", label: "Delaware" },
              { value: "florida", label: "Florida" },
              { value: "new_mexico", label: "New Mexico" },
              { value: "texas", label: "Texas" },
              { value: "other", label: t("Diğer", "Other") },
            ],
          },
          { name: "state_other", label: t("Diğer Eyalet", "Other State"), type: "text", showWhen: { field: "state", value: "other" } },
          {
            name: "business_type",
            label: t("İş Alanı", "Business Type"),
            type: "select",
            required: true,
            options: [
              { value: "ecommerce", label: t("E-ticaret", "E-commerce") },
              { value: "saas", label: "SaaS / Software" },
              { value: "consulting", label: t("Danışmanlık", "Consulting") },
              { value: "import_export", label: t("İthalat / İhracat", "Import / Export") },
              { value: "dropshipping", label: "Dropshipping" },
              { value: "other", label: t("Diğer", "Other") },
            ],
          },
          { name: "business_description", label: t("İş Tanımı", "Business Description"), type: "textarea", required: true, placeholder: t("Ne tür ürünler/hizmetler sunacaksınız?", "What products/services will you offer?") },
          {
            name: "member_count",
            label: t("Üye Sayısı", "Member Count"),
            type: "radio",
            required: true,
            options: [
              { value: "single", label: t("Tek üye (Single-member LLC)", "Single member (Single-member LLC)") },
              { value: "multi", label: t("Çok üyeli (Multi-member LLC)", "Multiple members (Multi-member LLC)") },
            ],
          },
          { name: "additional_members", label: t("Ek Üye Bilgileri", "Additional Member Information"), type: "textarea", placeholder: t("Diğer üyelerin ad-soyad ve hisse oranları", "Other members' names and ownership percentages"), showWhen: { field: "member_count", value: "multi" } },
        ],
      },
      {
        title: t("Ek Hizmetler", "Additional Services"),
        fields: [
          { name: "need_ein", label: t("EIN (Vergi Numarası) başvurusu da yapılsın mı?", "Should we also apply for an EIN (tax ID)?"), type: "radio", options: [{ value: "yes", label: t("Evet", "Yes") }, { value: "no", label: t("Hayır", "No") }], required: true },
          { name: "need_bank", label: t("ABD banka hesabı açılışında destek ister misiniz?", "Would you like help opening a US bank account?"), type: "radio", options: [{ value: "yes", label: t("Evet", "Yes") }, { value: "no", label: t("Hayır", "No") }], required: true },
          { name: "need_reseller", label: t("Reseller Permit gerekli mi?", "Is a Reseller Permit needed?"), type: "radio", options: [{ value: "yes", label: t("Evet", "Yes") }, { value: "no", label: t("Bilmiyorum", "I'm not sure") }] },
          { name: "notes", label: t("Ek Notlar", "Additional Notes"), type: "textarea", placeholder: t("Eklemek istediğiniz bilgiler...", "Any additional details you'd like to add...") },
        ],
      },
    ],
  },
  {
    code: "ATL-102",
    title: t("EIN (Vergi Numarası) Başvurusu", "EIN (Tax ID) Application"),
    description: t("IRS'den Employer Identification Number almak için bilgi formu.", "Information form to obtain an Employer Identification Number from the IRS."),
    instructions: t("LLC kurulumunuz tamamlandıysa veya mevcut bir LLC'niz varsa bu formu doldurun.", "Use this form if your LLC is already formed or you have an existing LLC."),
    category: "llc-legal",
    estimatedMinutes: 10,
    version: "1.0",
    active: true,
    sections: [
      {
        title: t("LLC Bilgileri", "LLC Information"),
        fields: [
          { name: "llc_name", label: t("LLC Tam Adı", "Full LLC Name"), type: "text", required: true, placeholder: t("Örn: Atlas Commerce LLC", "e.g. Atlas Commerce LLC") },
          { name: "formation_state", label: t("Kuruluş Eyaleti", "Formation State"), type: "text", required: true },
          { name: "formation_date", label: t("Kuruluş Tarihi", "Formation Date"), type: "date", required: true },
          { name: "responsible_party", label: t("Sorumlu Kişi (Responsible Party)", "Responsible Party"), type: "text", required: true, helpText: t("IRS nezdinde sorumlu olan kişi", "The person responsible in the eyes of the IRS") },
          { name: "ssn_or_itin", label: t("SSN veya ITIN (varsa)", "SSN or ITIN (if any)"), type: "text", required: false, helpText: t("Yoksa boş bırakabilirsiniz", "Leave blank if none") },
        ],
      },
      {
        title: t("İş Detayları", "Business Details"),
        fields: [
          { name: "business_activity", label: t("Ana İş Faailiyeti", "Primary Business Activity"), type: "text", required: true, placeholder: t("Örn: Online retail sales", "e.g. Online retail sales") },
          { name: "expected_employees", label: t("Beklenen Çalışan Sayısı", "Expected Employee Count"), type: "number", required: true, defaultValue: 0 },
          { name: "fiscal_year_end", label: t("Mali Yıl Sonu", "Fiscal Year End"), type: "select", required: true, options: [{ value: "december", label: t("Aralık (Standart)", "December (Standard)") }, { value: "other", label: t("Diğer", "Other") }] },
          { name: "mailing_address_us", label: t("ABD Posta Adresi", "US Mailing Address"), type: "textarea", required: true, helpText: t("EIN mektubunun gönderileceği adres", "The address where the EIN letter will be sent") },
        ],
      },
    ],
  },
  {
    code: "ATL-103",
    title: t("Reseller Permit (Satış Vergisi Muafiyeti)", "Reseller Permit (Sales Tax Exemption)"),
    description: t("Toptan alımlarda satış vergisi muafiyeti için başvuru.", "Application for sales tax exemption on wholesale purchases."),
    category: "llc-legal",
    estimatedMinutes: 8,
    version: "1.0",
    active: true,
    sections: [
      {
        title: t("Şirket Bilgileri", "Company Information"),
        fields: [
          { name: "llc_name", label: t("LLC Adı", "LLC Name"), type: "text", required: true },
          { name: "ein_number", label: t("EIN Numarası", "EIN Number"), type: "text", required: true, placeholder: "XX-XXXXXXX" },
          { name: "state", label: t("Başvuru Eyaleti", "Filing State"), type: "text", required: true },
          { name: "business_address", label: t("İş Adresi (ABD)", "Business Address (US)"), type: "textarea", required: true },
          { name: "product_types", label: t("Satılacak Ürün Kategorileri", "Product Categories to Sell"), type: "textarea", required: true, placeholder: t("Elektronik, giyim, kozmetik vb.", "Electronics, clothing, cosmetics, etc.") },
          { name: "estimated_annual_sales", label: t("Tahmini Yıllık Satış ($)", "Estimated Annual Sales ($)"), type: "currency", required: true },
        ],
      },
    ],
  },
  {
    code: "ATL-104",
    title: t("ABD Marka Tescili (Trademark) Başvurusu", "US Trademark Application"),
    description: t("USPTO'ya marka tescili başvurusu için bilgi formu.", "Information form for filing a trademark application with the USPTO."),
    category: "llc-legal",
    estimatedMinutes: 12,
    version: "1.0",
    active: true,
    sections: [
      {
        title: t("Marka Bilgileri", "Brand Information"),
        fields: [
          { name: "brand_name", label: t("Tescil Edilecek Marka Adı", "Brand Name to Register"), type: "text", required: true },
          {
            name: "mark_type",
            label: t("Marka Tipi", "Mark Type"),
            type: "radio",
            required: true,
            options: [
              { value: "word", label: t("Kelime Markası (Standard Character)", "Word mark (Standard Character)") },
              { value: "design", label: t("Logo/Tasarım Markası", "Logo / Design mark") },
              { value: "both", label: t("Hem kelime hem tasarım", "Both word and design") },
            ],
          },
          { name: "logo_file", label: t("Logo Dosyası (varsa)", "Logo File (if any)"), type: "file", showWhen: { field: "mark_type", value: ["design", "both"] } },
          { name: "goods_services", label: t("Ürün/Hizmet Açıklaması", "Goods / Services Description"), type: "textarea", required: true, helpText: t("Markanın hangi ürün/hizmetlerde kullanılacağını açıklayın", "Explain which products/services the mark will be used for") },
          {
            name: "use_status",
            label: t("Kullanım Durumu", "Use Status"),
            type: "radio",
            required: true,
            options: [
              { value: "in_use", label: t("Markayı zaten kullanıyorum", "I am already using the mark") },
              { value: "intent_to_use", label: t("Kullanmayı planlıyorum", "I intend to use it") },
            ],
          },
          { name: "first_use_date", label: t("İlk Kullanım Tarihi", "First Use Date"), type: "date", showWhen: { field: "use_status", value: "in_use" } },
        ],
      },
      {
        title: t("Sahiplik Bilgileri", "Ownership Information"),
        fields: [
          { name: "owner_name", label: t("Marka Sahibi (Kişi veya LLC)", "Trademark Owner (Individual or LLC)"), type: "text", required: true },
          { name: "owner_type", label: t("Sahip Tipi", "Owner Type"), type: "radio", required: true, options: [{ value: "individual", label: t("Gerçek Kişi", "Individual") }, { value: "llc", label: t("LLC / Şirket", "LLC / Company") }] },
          { name: "owner_country", label: t("Sahip Ülkesi", "Owner Country"), type: "text", required: true, defaultValue: "Türkiye" },
        ],
      },
    ],
  },
];
