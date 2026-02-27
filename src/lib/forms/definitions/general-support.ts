// =============================================================================
// ATLAS PLATFORM — Form Tanımları: Genel Destek (ATL-7xx)
// =============================================================================

import type { FormDefinition } from "../types";

export const generalSupportForms: FormDefinition[] = [
  // ─── ATL-701: Genel Destek Talebi ───
  {
    code: "ATL-701",
    title: "Genel Destek Talebi",
    description: "Diğer kategorilere uymayan genel sorular ve talepler için.",
    category: "general-support",
    estimatedMinutes: 5,
    version: "1.0",
    active: true,
    sections: [
      {
        title: "Talep Bilgileri",
        fields: [
          { name: "subject", label: "Konu Başlığı", type: "text", required: true },
          {
            name: "request_type",
            label: "Talep Türü",
            type: "select",
            required: true,
            options: [
              { value: "question", label: "Soru / Bilgi Talebi" },
              { value: "problem", label: "Sorun / Hata Bildirimi" },
              { value: "feature_request", label: "Özellik Talebi" },
              { value: "feedback", label: "Geri Bildirim" },
              { value: "complaint", label: "Şikayet" },
              { value: "other", label: "Diğer" },
            ],
          },
          { name: "priority", label: "Öncelik", type: "select", required: true, options: [{ value: "low", label: "Düşük" }, { value: "medium", label: "Orta" }, { value: "high", label: "Yüksek" }, { value: "urgent", label: "Acil" }] },
          { name: "description", label: "Detaylı Açıklama", type: "textarea", required: true, validation: { minLength: 20 }, placeholder: "Talebinizi mümkün olduğunca detaylı açıklayın..." },
          { name: "attachments", label: "Ekler (ekran görüntüsü vb.)", type: "file" },
        ],
      },
    ],
  },

  // ─── ATL-702: Hesap Değişikliği Talebi ───
  {
    code: "ATL-702",
    title: "Hesap Bilgileri Değişikliği",
    description: "Şirket adı, e-posta, telefon veya diğer hesap bilgilerinin güncellenmesi.",
    category: "general-support",
    estimatedMinutes: 5,
    version: "1.0",
    active: true,
    sections: [
      {
        title: "Değişiklik Detayları",
        fields: [
          {
            name: "change_type",
            label: "Değiştirilecek Bilgi",
            type: "multi-select",
            required: true,
            options: [
              { value: "company_name", label: "Şirket adı" },
              { value: "email", label: "E-posta adresi" },
              { value: "phone", label: "Telefon numarası" },
              { value: "address", label: "Adres bilgileri" },
              { value: "plan", label: "Plan yükseltme / düşürme" },
              { value: "other", label: "Diğer" },
            ],
          },
          { name: "current_value", label: "Mevcut Bilgi", type: "textarea", required: true },
          { name: "new_value", label: "Yeni Bilgi", type: "textarea", required: true },
          { name: "reason", label: "Değişiklik Nedeni", type: "textarea" },
        ],
      },
    ],
  },

  // ─── ATL-703: Hizmet İptali / Dondurma ───
  {
    code: "ATL-703",
    title: "Hizmet İptali / Dondurma Talebi",
    description: "Aktif bir hizmetinizi iptal etme veya geçici olarak dondurma talebi.",
    category: "general-support",
    estimatedMinutes: 5,
    version: "1.0",
    active: true,
    sections: [
      {
        title: "İptal / Dondurma Detayları",
        fields: [
          { name: "action_type", label: "Talep Türü", type: "radio", required: true, options: [{ value: "cancel", label: "Kalıcı iptal" }, { value: "pause", label: "Geçici dondurma" }] },
          { name: "service_name", label: "Hizmet Adı", type: "text", required: true, placeholder: "Hangi hizmeti iptal/dondurmak istiyorsunuz?" },
          { name: "pause_duration", label: "Dondurma Süresi", type: "select", showWhen: { field: "action_type", value: "pause" }, options: [{ value: "1_month", label: "1 ay" }, { value: "3_months", label: "3 ay" }, { value: "6_months", label: "6 ay" }] },
          { name: "reason", label: "Neden?", type: "textarea", required: true },
          { name: "feedback", label: "Bizi daha iyi yapmak için önerileriniz", type: "textarea" },
        ],
      },
    ],
  },

  // ─── ATL-704: Özel Hizmet Talebi ───
  {
    code: "ATL-704",
    title: "Özel Hizmet Talebi",
    description: "Standart hizmetlerimiz dışında özel bir talep veya proje için.",
    category: "general-support",
    estimatedMinutes: 8,
    version: "1.0",
    active: true,
    sections: [
      {
        title: "Proje Detayları",
        fields: [
          { name: "project_title", label: "Proje / Talep Başlığı", type: "text", required: true },
          { name: "category_hint", label: "En Yakın Kategori", type: "select", options: [{ value: "legal", label: "Hukuki" }, { value: "logistics", label: "Lojistik" }, { value: "finance", label: "Finans" }, { value: "marketing", label: "Pazarlama" }, { value: "tech", label: "Teknik / Yazılım" }, { value: "other", label: "Hiçbiri" }] },
          { name: "description", label: "Detaylı Açıklama", type: "textarea", required: true, validation: { minLength: 50 }, placeholder: "Ne yapmak istediğinizi mümkün olduğunca detaylı anlayın" },
          { name: "expected_outcome", label: "Beklenen Sonuç", type: "textarea", required: true },
          { name: "deadline", label: "İstenen Teslim Tarihi", type: "date" },
          { name: "budget_range", label: "Tahmini Bütçe ($)", type: "currency" },
          { name: "attachments", label: "Ek Dosyalar", type: "file" },
        ],
      },
    ],
  },
];
