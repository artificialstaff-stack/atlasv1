/**
 * ─── Atlas Platform — Knowledge Base / FAQ System ───
 * Static FAQ data + search. Extendable to Supabase storage.
 */

export interface FAQItem {
  id: string;
  category: string;
  question_tr: string;
  answer_tr: string;
  question_en: string;
  answer_en: string;
  order: number;
}

export const FAQ_CATEGORIES = [
  { id: "general", label_tr: "Genel", label_en: "General" },
  { id: "orders", label_tr: "Siparişler", label_en: "Orders" },
  { id: "shipping", label_tr: "Kargo & Lojistik", label_en: "Shipping & Logistics" },
  { id: "billing", label_tr: "Faturalar & Ödeme", label_en: "Billing & Payment" },
  { id: "account", label_tr: "Hesap", label_en: "Account" },
  { id: "customs", label_tr: "Gümrük", label_en: "Customs" },
] as const;

export const FAQ_DATA: FAQItem[] = [
  {
    id: "faq-1",
    category: "general",
    question_tr: "Atlas Platform nedir?",
    answer_tr:
      "Atlas Platform, Türkiye'den ABD'ye B2B ihracat süreçlerini yöneten kapsamlı bir SaaS platformudur. Sipariş takibi, lojistik, gümrük ve fatura yönetimi tek bir yerden yapılabilir.",
    question_en: "What is Atlas Platform?",
    answer_en:
      "Atlas Platform is a comprehensive SaaS platform managing B2B export processes from Turkey to USA. It provides order tracking, logistics, customs, and invoice management in one place.",
    order: 1,
  },
  {
    id: "faq-2",
    category: "general",
    question_tr: "Platforma nasıl kayıt olabilirim?",
    answer_tr:
      "Atlas Platform birebir satış modeliyle çalışır. İletişim formunu doldurarak veya doğrudan bizimle iletişime geçerek hesap oluşturabilirsiniz.",
    question_en: "How can I register for the platform?",
    answer_en:
      "Atlas Platform works with a direct sales model. You can create an account by filling out the contact form or reaching out to us directly.",
    order: 2,
  },
  {
    id: "faq-3",
    category: "orders",
    question_tr: "Sipariş durumumu nasıl takip edebilirim?",
    answer_tr:
      'Panel > Siparişler bölümünden tüm siparişlerinizi görebilirsiniz. Her siparişin detay sayfasında durum geçmişi, kargo takip numarası ve gümrük bilgileri yer alır.',
    question_en: "How can I track my order status?",
    answer_en:
      "You can view all your orders from Panel > Orders. Each order detail page shows status history, tracking number, and customs information.",
    order: 1,
  },
  {
    id: "faq-4",
    category: "orders",
    question_tr: "Sipariş iptal edebilir miyim?",
    answer_tr:
      "Sipariş durumu 'hazırlanıyor' aşamasındaysa iptal talebi oluşturabilirsiniz. Sevk edilmiş siparişler için destek ekibiyle iletişime geçin.",
    question_en: "Can I cancel an order?",
    answer_en:
      "You can request cancellation if the order is in 'preparing' stage. For shipped orders, please contact the support team.",
    order: 2,
  },
  {
    id: "faq-5",
    category: "shipping",
    question_tr: "Kargo süresi ne kadar?",
    answer_tr:
      "Türkiye'den ABD'ye standart kargo süresi 7-14 iş günüdür. Ekspres kargo ile 3-5 iş güne düşürülebilir.",
    question_en: "What is the shipping duration?",
    answer_en:
      "Standard shipping from Turkey to USA takes 7-14 business days. Express shipping can reduce this to 3-5 business days.",
    order: 1,
  },
  {
    id: "faq-6",
    category: "shipping",
    question_tr: "Gümrük işlemleri nasıl yapılıyor?",
    answer_tr:
      "Atlas Platform gümrük süreçlerini otomatik yönetir. HS kodları, menşe belgeleri ve gümrük beyannameleri sistem tarafından hazırlanır.",
    question_en: "How are customs processes handled?",
    answer_en:
      "Atlas Platform manages customs processes automatically. HS codes, origin certificates, and customs declarations are prepared by the system.",
    order: 2,
  },
  {
    id: "faq-7",
    category: "billing",
    question_tr: "Ödeme koşulları nelerdir?",
    answer_tr:
      "Ödeme koşulları müşteri bazında belirlenir. Genellikle fatura tarihinden itibaren 30 gün vade uygulanır. Detaylar için hesap yöneticinizle görüşün.",
    question_en: "What are the payment terms?",
    answer_en:
      "Payment terms are set per customer basis. Typically, 30 days from invoice date. Consult your account manager for details.",
    order: 1,
  },
  {
    id: "faq-8",
    category: "billing",
    question_tr: "Faturalarımı nereden görebilirim?",
    answer_tr:
      "Panel > Faturalar bölümünden tüm faturalarınızı görüntüleyebilir ve PDF olarak indirebilirsiniz.",
    question_en: "Where can I view my invoices?",
    answer_en:
      "You can view and download all your invoices as PDF from Panel > Invoices section.",
    order: 2,
  },
  {
    id: "faq-9",
    category: "account",
    question_tr: "Şifremi nasıl değiştiririm?",
    answer_tr:
      "Panel > Ayarlar bölümünden şifrenizi değiştirebilirsiniz. Güvenlik için güçlü bir şifre kullanmanızı öneriyoruz.",
    question_en: "How can I change my password?",
    answer_en:
      "You can change your password from Panel > Settings. We recommend using a strong password for security.",
    order: 1,
  },
  {
    id: "faq-10",
    category: "customs",
    question_tr: "HS kodu nedir?",
    answer_tr:
      "HS (Harmonized System) kodu, uluslararası ticarette ürünleri sınıflandırmak için kullanılan 6-10 haneli bir numaradır. Atlas Platform ürünleriniz için otomatik HS kodu önerir.",
    question_en: "What is an HS code?",
    answer_en:
      "HS (Harmonized System) code is a 6-10 digit number used to classify products in international trade. Atlas Platform automatically suggests HS codes for your products.",
    order: 1,
  },
];

/** Search FAQ by keyword */
export function searchFAQ(query: string, locale: "tr" | "en" = "tr"): FAQItem[] {
  const q = query.toLowerCase().trim();
  if (!q) return FAQ_DATA;

  return FAQ_DATA.filter((item) => {
    const questionField = locale === "tr" ? item.question_tr : item.question_en;
    const answerField = locale === "tr" ? item.answer_tr : item.answer_en;
    return (
      questionField.toLowerCase().includes(q) || answerField.toLowerCase().includes(q)
    );
  });
}

/** Get FAQ by category */
export function getFAQByCategory(category: string): FAQItem[] {
  return FAQ_DATA.filter((item) => item.category === category).sort(
    (a, b) => a.order - b.order
  );
}
