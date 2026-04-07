// =============================================================================
// ATLAS PLATFORM — Form Tanımları: Genel Destek (ATL-7xx)
// =============================================================================

import { localized as t, type LocalizedFormDefinition } from "../localization";

export const generalSupportForms: LocalizedFormDefinition[] = [
  {
    code: "ATL-701",
    title: t("Genel Destek Talebi", "General Support Request"),
    description: t("Diğer kategorilere uymayan genel sorular ve talepler için.", "For general questions and requests that do not fit other categories."),
    category: "general-support",
    estimatedMinutes: 5,
    version: "1.0",
    active: true,
    sections: [
      {
        title: t("Talep Bilgileri", "Request Details"),
        fields: [
          { name: "subject", label: t("Konu Başlığı", "Subject"), type: "text", required: true },
          {
            name: "request_type",
            label: t("Talep Türü", "Request Type"),
            type: "select",
            required: true,
            options: [
              { value: "question", label: t("Soru / Bilgi Talebi", "Question / Information Request") },
              { value: "problem", label: t("Sorun / Hata Bildirimi", "Problem / Bug Report") },
              { value: "feature_request", label: t("Özellik Talebi", "Feature Request") },
              { value: "feedback", label: t("Geri Bildirim", "Feedback") },
              { value: "complaint", label: t("Şikayet", "Complaint") },
              { value: "other", label: t("Diğer", "Other") },
            ],
          },
          { name: "priority", label: t("Öncelik", "Priority"), type: "select", required: true, options: [{ value: "low", label: t("Düşük", "Low") }, { value: "medium", label: t("Orta", "Medium") }, { value: "high", label: t("Yüksek", "High") }, { value: "urgent", label: t("Acil", "Urgent") }] },
          { name: "description", label: t("Detaylı Açıklama", "Detailed Description"), type: "textarea", required: true, validation: { minLength: 20 }, placeholder: t("Talebinizi mümkün olduğunca detaylı açıklayın...", "Describe your request as clearly as possible...") },
          { name: "attachments", label: t("Ekler (ekran görüntüsü vb.)", "Attachments (screenshots, etc.)"), type: "file" },
        ],
      },
    ],
  },
  {
    code: "ATL-702",
    title: t("Hesap Bilgileri Değişikliği", "Account Information Update"),
    description: t("Şirket adı, e-posta, telefon veya diğer hesap bilgilerinin güncellenmesi.", "Update company name, email, phone, or other account information."),
    category: "general-support",
    estimatedMinutes: 5,
    version: "1.0",
    active: true,
    sections: [
      {
        title: t("Değişiklik Detayları", "Change Details"),
        fields: [
          {
            name: "change_type",
            label: t("Değiştirilecek Bilgi", "Information to Update"),
            type: "multi-select",
            required: true,
            options: [
              { value: "company_name", label: t("Şirket adı", "Company name") },
              { value: "email", label: t("E-posta adresi", "Email address") },
              { value: "phone", label: t("Telefon numarası", "Phone number") },
              { value: "address", label: t("Adres bilgileri", "Address details") },
              { value: "plan", label: t("Plan yükseltme / düşürme", "Upgrade / downgrade plan") },
              { value: "other", label: t("Diğer", "Other") },
            ],
          },
          { name: "current_value", label: t("Mevcut Bilgi", "Current Value"), type: "textarea", required: true },
          { name: "new_value", label: t("Yeni Bilgi", "New Value"), type: "textarea", required: true },
          { name: "reason", label: t("Değişiklik Nedeni", "Reason for Change"), type: "textarea" },
        ],
      },
    ],
  },
  {
    code: "ATL-703",
    title: t("Hizmet İptali / Dondurma Talebi", "Service Cancellation / Pause Request"),
    description: t("Aktif bir hizmetinizi iptal etme veya geçici olarak dondurma talebi.", "Request to cancel or temporarily pause an active service."),
    category: "general-support",
    estimatedMinutes: 5,
    version: "1.0",
    active: true,
    sections: [
      {
        title: t("İptal / Dondurma Detayları", "Cancellation / Pause Details"),
        fields: [
          { name: "action_type", label: t("Talep Türü", "Request Type"), type: "radio", required: true, options: [{ value: "cancel", label: t("Kalıcı iptal", "Permanent cancellation") }, { value: "pause", label: t("Geçici dondurma", "Temporary pause") }] },
          { name: "service_name", label: t("Hizmet Adı", "Service Name"), type: "text", required: true, placeholder: t("Hangi hizmeti iptal/dondurmak istiyorsunuz?", "Which service would you like to cancel/pause?") },
          { name: "pause_duration", label: t("Dondurma Süresi", "Pause Duration"), type: "select", showWhen: { field: "action_type", value: "pause" }, options: [{ value: "1_month", label: t("1 ay", "1 month") }, { value: "3_months", label: t("3 ay", "3 months") }, { value: "6_months", label: t("6 ay", "6 months") }] },
          { name: "reason", label: t("Neden?", "Why?"), type: "textarea", required: true },
          { name: "feedback", label: t("Bizi daha iyi yapmak için önerileriniz", "Suggestions to help us improve"), type: "textarea" },
        ],
      },
    ],
  },
  {
    code: "ATL-704",
    title: t("Özel Hizmet Talebi", "Custom Service Request"),
    description: t("Standart hizmetlerimiz dışında özel bir talep veya proje için.", "For a custom request or project outside our standard services."),
    category: "general-support",
    estimatedMinutes: 8,
    version: "1.0",
    active: true,
    sections: [
      {
        title: t("Proje Detayları", "Project Details"),
        fields: [
          { name: "project_title", label: t("Proje / Talep Başlığı", "Project / Request Title"), type: "text", required: true },
          { name: "category_hint", label: t("En Yakın Kategori", "Closest Category"), type: "select", options: [{ value: "legal", label: t("Hukuki", "Legal") }, { value: "logistics", label: t("Lojistik", "Logistics") }, { value: "finance", label: t("Finans", "Finance") }, { value: "marketing", label: t("Pazarlama", "Marketing") }, { value: "tech", label: t("Teknik / Yazılım", "Technical / Software") }, { value: "other", label: t("Hiçbiri", "None") }] },
          { name: "description", label: t("Detaylı Açıklama", "Detailed Description"), type: "textarea", required: true, validation: { minLength: 50 }, placeholder: t("Ne yapmak istediğinizi mümkün olduğunca detaylı anlayın", "Describe what you want to do as clearly as possible") },
          { name: "expected_outcome", label: t("Beklenen Sonuç", "Expected Outcome"), type: "textarea", required: true },
          { name: "deadline", label: t("İstenen Teslim Tarihi", "Desired Due Date"), type: "date" },
          { name: "budget_range", label: t("Tahmini Bütçe ($)", "Estimated Budget ($)"), type: "currency" },
          { name: "attachments", label: t("Ek Dosyalar", "Attachments"), type: "file" },
        ],
      },
    ],
  },
  {
    code: "ATL-705",
    title: t("İşletme Bilgileri Tamamlama", "Business Information Completion"),
    description: t("Web sitesi, Instagram, Shopify ve eksik LLC profil bilgilerini Atlas'a iletmek için.", "Share missing website, Instagram, Shopify, and LLC profile details with Atlas."),
    category: "general-support",
    estimatedMinutes: 6,
    version: "1.0",
    active: true,
    sections: [
      {
        title: t("Dijital Varlıklar", "Digital Assets"),
        description: t("Atlas'ın kurulum ve kanal yönetimini tamamlaması için aktif bağlantıları paylaşın.", "Share active links so Atlas can complete setup and channel management."),
        fields: [
          {
            name: "website_url",
            label: t("Web sitesi URL", "Website URL"),
            type: "url",
            placeholder: "https://ornek.com",
            helpText: t("Aktif web sitenizi veya landing page adresinizi paylaşın.", "Share your active website or landing page."),
          },
          {
            name: "instagram_profile",
            label: t("Instagram profil linki veya kullanıcı adı", "Instagram profile link or username"),
            type: "text",
            placeholder: "@markaadi veya https://instagram.com/markaadi",
          },
          {
            name: "shopify_store_url",
            label: t("Shopify mağaza linki / store domain", "Shopify store link / store domain"),
            type: "url",
            placeholder: "https://magaza.myshopify.com",
            helpText: t("Shopify admin adresi değil, mağaza domainini paylaşın.", "Share the store domain, not the Shopify admin URL."),
          },
        ],
      },
      {
        title: t("LLC ve İletişim Bilgileri", "LLC & Contact Details"),
        description: t("Sistemde eksik görünen şirket alanlarını tamamlayın.", "Complete the company fields that appear missing in the system."),
        fields: [
          { name: "registered_agent_name", label: t("Registered agent adı", "Registered agent name"), type: "text", placeholder: "Örn. Northwest Registered Agent" },
          { name: "registered_agent_address", label: t("Registered agent adresi", "Registered agent address"), type: "textarea", placeholder: t("Registered agent adresini tam olarak yazın", "Enter the full registered agent address") },
          { name: "formation_date_confirmed", label: t("Resmi LLC kuruluş tarihi", "Official LLC formation date"), type: "date" },
          { name: "company_email", label: t("Şirket e-postası", "Company email"), type: "email", placeholder: "info@sirketiniz.com" },
          { name: "company_phone", label: t("Şirket telefonu", "Company phone"), type: "phone", placeholder: "+1 ..." },
          {
            name: "bank_account_status",
            label: t("ABD banka hesabı durumu", "US bank account status"),
            type: "radio",
            required: true,
            options: [
              { value: "not_opened", label: t("Henüz açılmadı", "Not opened yet") },
              { value: "in_progress", label: t("Açılış sürecinde", "In progress") },
              { value: "opened", label: t("Açıldı", "Opened") },
            ],
          },
          { name: "bank_name", label: t("Banka adı", "Bank name"), type: "text", placeholder: t("Mercury, Relay, Wise vb.", "Mercury, Relay, Wise, etc."), showWhen: { field: "bank_account_status", value: ["in_progress", "opened"] } },
          { name: "notes", label: t("Ek notlar", "Additional notes"), type: "textarea", placeholder: t("Varsa ek açıklama veya paylaşmak istediğiniz notlar", "Any extra context or notes to share") },
        ],
      },
    ],
  },
];
