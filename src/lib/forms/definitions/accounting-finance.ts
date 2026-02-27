// =============================================================================
// ATLAS PLATFORM — Form Tanımları: Muhasebe & Finans (ATL-3xx)
// =============================================================================

import type { FormDefinition } from "../types";

export const accountingFinanceForms: FormDefinition[] = [
  // ─── ATL-301: Muhasebe Hizmeti Başvurusu ───
  {
    code: "ATL-301",
    title: "Muhasebe & Defter Tutma Hizmeti Başvurusu",
    description: "ABD LLC'niz için aylık defter tutma ve muhasebe hizmeti talebi.",
    instructions: "Muhasebe hizmetimizle gelir-gider takibi, banka mutabakası, mali tablo hazırlığı ve vergi dönemine hazırlık yapıyoruz.",
    category: "accounting-finance",
    estimatedMinutes: 10,
    version: "1.0",
    active: true,
    sections: [
      {
        title: "Şirket Bilgileri",
        fields: [
          { name: "llc_name", label: "LLC Adı", type: "text", required: true },
          { name: "ein_number", label: "EIN Numarası", type: "text", required: true },
          { name: "formation_date", label: "Kuruluş Tarihi", type: "date", required: true },
          { name: "state", label: "Kuruluş Eyaleti", type: "text", required: true },
        ],
      },
      {
        title: "Mali Durum",
        fields: [
          { name: "monthly_revenue_range", label: "Aylık Tahmini Gelir", type: "select", required: true, options: [{ value: "0_1000", label: "$0 - $1,000" }, { value: "1000_5000", label: "$1,000 - $5,000" }, { value: "5000_25000", label: "$5,000 - $25,000" }, { value: "25000_100000", label: "$25,000 - $100,000" }, { value: "100000_plus", label: "$100,000+" }] },
          { name: "transaction_count", label: "Aylık Ortalama İşlem Sayısı", type: "number", required: true },
          { name: "bank_accounts", label: "Banka Hesap Sayısı", type: "number", required: true, defaultValue: 1 },
          { name: "payment_processors", label: "Ödeme Altyapıları", type: "multi-select", options: [{ value: "stripe", label: "Stripe" }, { value: "paypal", label: "PayPal" }, { value: "amazon_pay", label: "Amazon Pay" }, { value: "square", label: "Square" }, { value: "other", label: "Diğer" }] },
          { name: "current_software", label: "Kullandığınız Muhasebe Yazılımı", type: "select", options: [{ value: "none", label: "Yok" }, { value: "quickbooks", label: "QuickBooks" }, { value: "xero", label: "Xero" }, { value: "wave", label: "Wave" }, { value: "freshbooks", label: "FreshBooks" }, { value: "other", label: "Diğer" }] },
        ],
      },
      {
        title: "İstenen Hizmetler",
        fields: [
          {
            name: "services_needed",
            label: "Hangi hizmetleri istiyorsunuz?",
            type: "multi-select",
            required: true,
            options: [
              { value: "bookkeeping", label: "Aylık defter tutma" },
              { value: "bank_reconciliation", label: "Banka mutabakası" },
              { value: "financial_statements", label: "Mali tablo hazırlığı" },
              { value: "sales_tax", label: "Sales tax raporlama" },
              { value: "payroll", label: "Bordro (Payroll)" },
              { value: "tax_filing", label: "Yıllık vergi beyannamesi" },
            ],
          },
          { name: "notes", label: "Ek Bilgiler", type: "textarea" },
        ],
      },
    ],
  },

  // ─── ATL-302: Vergi Beyannamesi Talebi ───
  {
    code: "ATL-302",
    title: "Yıllık Vergi Beyannamesi Talebi",
    description: "ABD vergi beyannamesi (Tax Return) hazırlatma talebi.",
    category: "accounting-finance",
    estimatedMinutes: 12,
    version: "1.0",
    active: true,
    sections: [
      {
        title: "Vergi Yılı Bilgileri",
        fields: [
          { name: "tax_year", label: "Vergi Yılı", type: "select", required: true, options: [{ value: "2024", label: "2024" }, { value: "2025", label: "2025" }, { value: "2026", label: "2026" }] },
          { name: "llc_name", label: "LLC Adı", type: "text", required: true },
          { name: "ein_number", label: "EIN Numarası", type: "text", required: true },
          { name: "llc_type", label: "LLC Vergi Sınıflandırması", type: "select", required: true, options: [{ value: "disregarded", label: "Single-member (Disregarded Entity)" }, { value: "partnership", label: "Partnership" }, { value: "s_corp", label: "S-Corporation" }, { value: "c_corp", label: "C-Corporation" }, { value: "not_sure", label: "Emin değilim" }] },
        ],
      },
      {
        title: "Gelir & Gider Özeti",
        fields: [
          { name: "gross_revenue", label: "Brüt Gelir ($)", type: "currency", required: true },
          { name: "total_expenses", label: "Toplam Giderler ($)", type: "currency", required: true },
          { name: "cogs", label: "Satılan Malların Maliyeti / COGS ($)", type: "currency" },
          { name: "has_foreign_accounts", label: "Yabancı banka hesabınız var mı? (FBAR)", type: "radio", required: true, options: [{ value: "yes", label: "Evet" }, { value: "no", label: "Hayır" }] },
          { name: "foreign_account_total", label: "Yabancı hesaplardaki toplam bakiye ($)", type: "currency", showWhen: { field: "has_foreign_accounts", value: "yes" } },
        ],
      },
      {
        title: "Belgeler",
        fields: [
          { name: "profit_loss", label: "Kar-Zarar Tablosu (P&L)", type: "file" },
          { name: "bank_statements", label: "Banka Ekstresi", type: "file" },
          { name: "previous_return", label: "Önceki Yıl Beyannamesi", type: "file" },
          { name: "additional_notes", label: "Ek Bilgiler", type: "textarea" },
        ],
      },
    ],
  },

  // ─── ATL-303: Mali Danışmanlık Talebi ───
  {
    code: "ATL-303",
    title: "Mali Danışmanlık Randevusu",
    description: "Vergi planlaması, mali strateji veya genel mali danışmanlık talebi.",
    category: "accounting-finance",
    estimatedMinutes: 5,
    version: "1.0",
    active: true,
    sections: [
      {
        title: "Danışmanlık Detayları",
        fields: [
          { name: "topic", label: "Danışmanlık Konusu", type: "select", required: true, options: [{ value: "tax_planning", label: "Vergi planlaması" }, { value: "entity_structure", label: "Şirket yapısı değişikliği" }, { value: "international", label: "Uluslararası vergilendirme" }, { value: "investment", label: "Yatırım stratejisi" }, { value: "other", label: "Diğer" }] },
          { name: "description", label: "Konuyu kısaca açıklayın", type: "textarea", required: true },
          { name: "preferred_date", label: "Tercih Edilen Tarih", type: "date" },
          { name: "preferred_time", label: "Tercih Edilen Saat (EST)", type: "select", options: [{ value: "9am", label: "09:00" }, { value: "10am", label: "10:00" }, { value: "11am", label: "11:00" }, { value: "1pm", label: "13:00" }, { value: "2pm", label: "14:00" }, { value: "3pm", label: "15:00" }] },
          { name: "urgency", label: "Aciliyet", type: "radio", options: [{ value: "normal", label: "Normal" }, { value: "urgent", label: "Acil (24 saat içinde)" }] },
        ],
      },
    ],
  },
];
