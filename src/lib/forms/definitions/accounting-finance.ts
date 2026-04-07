// =============================================================================
// ATLAS PLATFORM — Form Tanımları: Muhasebe & Finans (ATL-3xx)
// =============================================================================

import { localized as t, type LocalizedFormDefinition } from "../localization";

export const accountingFinanceForms: LocalizedFormDefinition[] = [
  {
    code: "ATL-301",
    title: t("Muhasebe & Defter Tutma Hizmeti Başvurusu", "Bookkeeping & Accounting Service Application"),
    description: t("ABD LLC'niz için aylık defter tutma ve muhasebe hizmeti talebi.", "Request monthly bookkeeping and accounting services for your US LLC."),
    instructions: t("Muhasebe hizmetimizle gelir-gider takibi, banka mutabakası, mali tablo hazırlığı ve vergi dönemine hazırlık yapıyoruz.", "Our accounting service covers income/expense tracking, bank reconciliation, financial statements, and tax-season preparation."),
    category: "accounting-finance",
    estimatedMinutes: 10,
    version: "1.0",
    active: true,
    sections: [
      {
        title: t("Şirket Bilgileri", "Company Information"),
        fields: [
          { name: "llc_name", label: "LLC Adı", type: "text", required: true },
          { name: "ein_number", label: "EIN Numarası", type: "text", required: true },
          { name: "formation_date", label: t("Kuruluş Tarihi", "Formation Date"), type: "date", required: true },
          { name: "state", label: t("Kuruluş Eyaleti", "Formation State"), type: "text", required: true },
        ],
      },
      {
        title: t("Mali Durum", "Financial Snapshot"),
        fields: [
          { name: "monthly_revenue_range", label: t("Aylık Tahmini Gelir", "Estimated Monthly Revenue"), type: "select", required: true, options: [{ value: "0_1000", label: "$0 - $1,000" }, { value: "1000_5000", label: "$1,000 - $5,000" }, { value: "5000_25000", label: "$5,000 - $25,000" }, { value: "25000_100000", label: "$25,000 - $100,000" }, { value: "100000_plus", label: "$100,000+" }] },
          { name: "transaction_count", label: t("Aylık Ortalama İşlem Sayısı", "Average Monthly Transaction Count"), type: "number", required: true },
          { name: "bank_accounts", label: t("Banka Hesap Sayısı", "Number of Bank Accounts"), type: "number", required: true, defaultValue: 1 },
          { name: "payment_processors", label: t("Ödeme Altyapıları", "Payment Processors"), type: "multi-select", options: [{ value: "stripe", label: "Stripe" }, { value: "paypal", label: "PayPal" }, { value: "amazon_pay", label: "Amazon Pay" }, { value: "square", label: "Square" }, { value: "other", label: t("Diğer", "Other") }] },
          { name: "current_software", label: t("Kullandığınız Muhasebe Yazılımı", "Accounting Software You Use"), type: "select", options: [{ value: "none", label: t("Yok", "None") }, { value: "quickbooks", label: "QuickBooks" }, { value: "xero", label: "Xero" }, { value: "wave", label: "Wave" }, { value: "freshbooks", label: "FreshBooks" }, { value: "other", label: t("Diğer", "Other") }] },
        ],
      },
      {
        title: t("İstenen Hizmetler", "Requested Services"),
        fields: [
          {
            name: "services_needed",
            label: t("Hangi hizmetleri istiyorsunuz?", "Which services do you need?"),
            type: "multi-select",
            required: true,
            options: [
              { value: "bookkeeping", label: t("Aylık defter tutma", "Monthly bookkeeping") },
              { value: "bank_reconciliation", label: t("Banka mutabakası", "Bank reconciliation") },
              { value: "financial_statements", label: t("Mali tablo hazırlığı", "Financial statement preparation") },
              { value: "sales_tax", label: "Sales tax reporting" },
              { value: "payroll", label: "Payroll" },
              { value: "tax_filing", label: t("Yıllık vergi beyannamesi", "Annual tax return") },
            ],
          },
          { name: "notes", label: t("Ek Bilgiler", "Additional Information"), type: "textarea" },
        ],
      },
    ],
  },
  {
    code: "ATL-302",
    title: t("Yıllık Vergi Beyannamesi Talebi", "Annual Tax Return Request"),
    description: t("ABD vergi beyannamesi (Tax Return) hazırlatma talebi.", "Request to prepare a US tax return."),
    category: "accounting-finance",
    estimatedMinutes: 12,
    version: "1.0",
    active: true,
    sections: [
      {
        title: t("Vergi Yılı Bilgileri", "Tax Year Information"),
        fields: [
          { name: "tax_year", label: t("Vergi Yılı", "Tax Year"), type: "select", required: true, options: [{ value: "2024", label: "2024" }, { value: "2025", label: "2025" }, { value: "2026", label: "2026" }] },
          { name: "llc_name", label: "LLC Adı", type: "text", required: true },
          { name: "ein_number", label: "EIN Numarası", type: "text", required: true },
          { name: "llc_type", label: t("LLC Vergi Sınıflandırması", "LLC Tax Classification"), type: "select", required: true, options: [{ value: "disregarded", label: t("Single-member (Disregarded Entity)", "Single-member (Disregarded Entity)") }, { value: "partnership", label: "Partnership" }, { value: "s_corp", label: "S-Corporation" }, { value: "c_corp", label: "C-Corporation" }, { value: "not_sure", label: t("Emin değilim", "Not sure") }] },
        ],
      },
      {
        title: t("Gelir & Gider Özeti", "Revenue & Expense Summary"),
        fields: [
          { name: "gross_revenue", label: t("Brüt Gelir ($)", "Gross Revenue ($)"), type: "currency", required: true },
          { name: "total_expenses", label: t("Toplam Giderler ($)", "Total Expenses ($)"), type: "currency", required: true },
          { name: "cogs", label: t("Satılan Malların Maliyeti / COGS ($)", "Cost of Goods Sold / COGS ($)"), type: "currency" },
          { name: "has_foreign_accounts", label: t("Yabancı banka hesabınız var mı? (FBAR)", "Do you have foreign bank accounts? (FBAR)"), type: "radio", required: true, options: [{ value: "yes", label: t("Evet", "Yes") }, { value: "no", label: t("Hayır", "No") }] },
          { name: "foreign_account_total", label: t("Yabancı hesaplardaki toplam bakiye ($)", "Total balance in foreign accounts ($)"), type: "currency", showWhen: { field: "has_foreign_accounts", value: "yes" } },
        ],
      },
      {
        title: t("Belgeler", "Documents"),
        fields: [
          { name: "profit_loss", label: t("Kar-Zarar Tablosu (P&L)", "Profit & Loss Statement (P&L)"), type: "file" },
          { name: "bank_statements", label: t("Banka Ekstresi", "Bank Statements"), type: "file" },
          { name: "previous_return", label: t("Önceki Yıl Beyannamesi", "Prior Year Return"), type: "file" },
          { name: "additional_notes", label: t("Ek Bilgiler", "Additional Notes"), type: "textarea" },
        ],
      },
    ],
  },
  {
    code: "ATL-303",
    title: t("Mali Danışmanlık Randevusu", "Financial Advisory Appointment"),
    description: t("Vergi planlaması, mali strateji veya genel mali danışmanlık talebi.", "Request for tax planning, financial strategy, or general finance advisory."),
    category: "accounting-finance",
    estimatedMinutes: 5,
    version: "1.0",
    active: true,
    sections: [
      {
        title: t("Danışmanlık Detayları", "Advisory Details"),
        fields: [
          { name: "topic", label: t("Danışmanlık Konusu", "Advisory Topic"), type: "select", required: true, options: [{ value: "tax_planning", label: t("Vergi planlaması", "Tax planning") }, { value: "entity_structure", label: t("Şirket yapısı değişikliği", "Entity structure change") }, { value: "international", label: t("Uluslararası vergilendirme", "International taxation") }, { value: "investment", label: t("Yatırım stratejisi", "Investment strategy") }, { value: "other", label: t("Diğer", "Other") }] },
          { name: "description", label: t("Konuyu kısaca açıklayın", "Briefly describe the topic"), type: "textarea", required: true },
          { name: "preferred_date", label: t("Tercih Edilen Tarih", "Preferred Date"), type: "date" },
          { name: "preferred_time", label: t("Tercih Edilen Saat (EST)", "Preferred Time (EST)"), type: "select", options: [{ value: "9am", label: "09:00" }, { value: "10am", label: "10:00" }, { value: "11am", label: "11:00" }, { value: "1pm", label: "13:00" }, { value: "2pm", label: "14:00" }, { value: "3pm", label: "15:00" }] },
          { name: "urgency", label: t("Aciliyet", "Urgency"), type: "radio", options: [{ value: "normal", label: t("Normal", "Normal") }, { value: "urgent", label: t("Acil (24 saat içinde)", "Urgent (within 24 hours)") }] },
        ],
      },
    ],
  },
];
