// =============================================================================
// ATLAS PLATFORM — Form → Process Task Template Mapping
// Form onaylandığında otomatik olarak oluşturulacak görev şablonları
// =============================================================================

import type { Locale } from "@/i18n";

import { localized as t, resolveLocalizedTaskTemplate, type LocalizedTaskTemplate } from "./localization";

export interface TaskTemplate {
  /** Görev adı */
  task_name: string;
  /** Görev kategorisi (process_tasks.task_category) */
  task_category: "legal" | "tax" | "customs" | "logistics" | "marketplace" | "other";
  /** Varsayılan sıra numarası */
  sort_order: number;
  /** Admin için not şablonu */
  notes_template: string;
}

export const TASK_TEMPLATES_RAW: Record<string, LocalizedTaskTemplate[]> = {
  "ATL-101": [
    { task_name: t("LLC Kuruluş Belgelerini Hazırla", "Prepare LLC Formation Documents"), task_category: "legal", sort_order: 1, notes_template: t("Müşteri LLC kurulumu için başvurdu. Eyalet: {data.state}", "Customer applied for LLC formation. State: {data.state}") },
    { task_name: t("Articles of Organization Dosyala", "File Articles of Organization"), task_category: "legal", sort_order: 2, notes_template: t("Eyalet sekreterliğine başvuru yapılacak", "File with the Secretary of State") },
    { task_name: t("Operating Agreement Hazırla", "Prepare Operating Agreement"), task_category: "legal", sort_order: 3, notes_template: t("LLC operating agreement taslağı hazırlanacak", "Draft the LLC operating agreement") },
  ],
  "ATL-102": [
    { task_name: t("EIN Başvurusu Yap (IRS SS-4)", "Apply for EIN (IRS SS-4)"), task_category: "tax", sort_order: 1, notes_template: t("IRS'e EIN başvurusu yapılacak", "Submit the EIN application to the IRS") },
    { task_name: t("EIN Confirmation Letter Teslim Et", "Deliver EIN Confirmation Letter"), task_category: "tax", sort_order: 2, notes_template: t("EIN numarası alındıktan sonra müşteriye iletilecek", "Send to customer after the EIN is issued") },
  ],
  "ATL-103": [
    { task_name: t("Reseller Permit Başvurusu", "Apply for Reseller Permit"), task_category: "tax", sort_order: 1, notes_template: t("Satış vergisi muafiyeti başvurusu yapılacak", "File for sales tax exemption") },
    { task_name: t("Reseller Permit Belgesi Teslim Et", "Deliver Reseller Permit"), task_category: "tax", sort_order: 2, notes_template: t("Permit belgesini müşteriye ilet", "Send the permit document to the customer") },
  ],
  "ATL-104": [
    { task_name: t("Marka Araştırması (TESS)", "Trademark Search (TESS)"), task_category: "legal", sort_order: 1, notes_template: t("USPTO TESS veritabanında marka araştırması", "Search the USPTO TESS database") },
    { task_name: t("Trademark Başvurusu (USPTO)", "Trademark Filing (USPTO)"), task_category: "legal", sort_order: 2, notes_template: t("Marka tescil başvurusu dosyalanacak", "File the trademark application") },
    { task_name: t("Trademark İzleme & Takip", "Trademark Monitoring & Tracking"), task_category: "legal", sort_order: 3, notes_template: t("Başvuru durumu takip edilecek", "Track the application status") },
  ],
  "ATL-201": [
    { task_name: t("Ürün Gönderim Hazırlığı", "Prepare Product Shipment"), task_category: "logistics", sort_order: 1, notes_template: t("Ürünler depoya alınacak ve gönderime hazırlanacak", "Products will be received at the warehouse and prepared for shipment") },
    { task_name: t("Kargo Takip Numarası Oluştur", "Generate Tracking Number"), task_category: "logistics", sort_order: 2, notes_template: t("Gönderim yapıldıktan sonra tracking no iletilecek", "Share tracking number after dispatch") },
  ],
  "ATL-202": [{ task_name: t("Stok Transfer İşlemi", "Stock Transfer"), task_category: "logistics", sort_order: 1, notes_template: t("İç depo transfer işlemi başlatılacak", "Start the internal warehouse transfer") }],
  "ATL-203": [
    { task_name: t("Özel Fulfillment Planı Oluştur", "Create Custom Fulfillment Plan"), task_category: "logistics", sort_order: 1, notes_template: t("Müşteriye özel sipariş karşılama planı hazırlanacak", "Prepare a customer-specific fulfillment plan") },
    { task_name: t("Fulfillment İşlemi Başlat", "Start Fulfillment Process"), task_category: "logistics", sort_order: 2, notes_template: t("Plan onaylandıktan sonra işlem başlatılacak", "Start once the plan is approved") },
  ],
  "ATL-301": [
    { task_name: t("Muhasebe Hizmeti Kurulumu", "Set Up Accounting Service"), task_category: "tax", sort_order: 1, notes_template: t("Müşteri defter tutma hizmeti başlatılacak", "Begin the bookkeeping service") },
    { task_name: t("İlk Ay Muhasebe Raporu", "First Month Accounting Report"), task_category: "tax", sort_order: 2, notes_template: t("İlk aylık muhasebe raporu hazırlanacak", "Prepare the first monthly accounting report") },
  ],
  "ATL-302": [
    { task_name: t("Vergi Beyannamesi Hazırlığı", "Prepare Tax Return"), task_category: "tax", sort_order: 1, notes_template: t("Yıllık vergi beyannamesi hazırlanacak", "Prepare the annual tax return") },
    { task_name: t("Beyanname Dosyalama (IRS)", "File Return (IRS)"), task_category: "tax", sort_order: 2, notes_template: t("IRS'e beyanname dosyalanacak", "File the return with the IRS") },
  ],
  "ATL-303": [{ task_name: t("Mali Danışmanlık Randevusu Planla", "Schedule Financial Advisory Call"), task_category: "tax", sort_order: 1, notes_template: t("Müşteriyle mali danışmanlık toplantısı ayarlanacak", "Schedule a financial advisory meeting with the customer") }],
  "ATL-401": [
    { task_name: t("Kampanya Stratejisi Hazırla", "Prepare Campaign Strategy"), task_category: "marketplace", sort_order: 1, notes_template: t("Pazarlama kampanyası stratejisi oluşturulacak", "Create the campaign strategy") },
    { task_name: t("Kampanyayı Başlat", "Launch the Campaign"), task_category: "marketplace", sort_order: 2, notes_template: t("Onaylanan strateji doğrultusunda kampanya başlatılacak", "Launch based on the approved strategy") },
  ],
  "ATL-402": [
    { task_name: t("SEO Analiz Raporu", "SEO Analysis Report"), task_category: "marketplace", sort_order: 1, notes_template: t("Mevcut durum SEO analizi yapılacak", "Analyze the current SEO state") },
    { task_name: t("SEO Optimizasyon Uygulaması", "Apply SEO Optimizations"), task_category: "marketplace", sort_order: 2, notes_template: t("Öneriler doğrultusunda optimizasyon yapılacak", "Implement optimizations based on recommendations") },
  ],
  "ATL-403": [
    { task_name: t("Influencer Araştırması", "Influencer Research"), task_category: "marketplace", sort_order: 1, notes_template: t("Uygun influencer'lar araştırılacak", "Research suitable influencers") },
    { task_name: t("İş Birliği Anlaşması", "Partnership Agreement"), task_category: "marketplace", sort_order: 2, notes_template: t("Seçilen influencer ile anlaşma sağlanacak", "Reach agreement with the selected influencer") },
  ],
  "ATL-501": [
    { task_name: t("Sosyal Medya Hesapları Oluştur", "Create Social Media Accounts"), task_category: "marketplace", sort_order: 1, notes_template: t("İstenen platformlarda hesaplar açılacak", "Open accounts on the requested platforms") },
    { task_name: t("Profil Optimizasyonu", "Profile Optimization"), task_category: "marketplace", sort_order: 2, notes_template: t("Hesaplar optimize edilecek (bio, görsel, vs.)", "Optimize the accounts (bio, visuals, etc.)") },
  ],
  "ATL-502": [
    { task_name: t("İçerik Takvimi Hazırla", "Prepare Content Calendar"), task_category: "marketplace", sort_order: 1, notes_template: t("Aylık içerik planı takvimi oluşturulacak", "Create the monthly content calendar") },
    { task_name: t("İçerik Üretimi Başlat", "Start Content Production"), task_category: "marketplace", sort_order: 2, notes_template: t("Onaylanan takvim doğrultusunda içerik üretimine başlanacak", "Start content production based on the approved calendar") },
  ],
  "ATL-503": [{ task_name: t("Topluluk Yönetimi Planı", "Community Management Plan"), task_category: "marketplace", sort_order: 1, notes_template: t("Community management stratejisi hazırlanacak", "Prepare the community management strategy") }],
  "ATL-601": [
    { task_name: t("Marka Briefingi Analizi", "Analyze Brand Brief"), task_category: "other", sort_order: 1, notes_template: t("Müşteri marka briefingi analiz edilecek", "Analyze the customer brand brief") },
    { task_name: t("Logo & Kimlik Tasarımı", "Logo & Identity Design"), task_category: "other", sort_order: 2, notes_template: t("Logo ve marka kimliği tasarlanacak", "Design the logo and brand identity") },
    { task_name: t("Marka Kılavuzu Teslimi", "Deliver Brand Guide"), task_category: "other", sort_order: 3, notes_template: t("Brand guidelines dokümanı hazırlanacak", "Prepare the brand guidelines document") },
  ],
  "ATL-602": [
    { task_name: t("Ambalaj Tasarım Konsepti", "Packaging Design Concept"), task_category: "other", sort_order: 1, notes_template: t("Ambalaj tasarımı konseptleri hazırlanacak", "Prepare packaging design concepts") },
    { task_name: t("Final Tasarım & Baskı Dosyası", "Final Design & Print File"), task_category: "other", sort_order: 2, notes_template: t("Onaylanan konsept baskıya hazır hale getirilecek", "Prepare the approved concept for print") },
  ],
  "ATL-603": [
    { task_name: t("Fotoğraf Çekimi Planlama", "Plan Photo Shoot"), task_category: "other", sort_order: 1, notes_template: t("Ürün fotoğraf çekimi planlanacak", "Plan the product photo shoot") },
    { task_name: t("Fotoğraf Düzenleme & Teslim", "Edit & Deliver Photos"), task_category: "other", sort_order: 2, notes_template: t("Çekilen fotoğraflar düzenlenip teslim edilecek", "Edit and deliver the photos") },
  ],
  "ATL-701": [{ task_name: t("Destek Talebi İnceleme", "Review Support Request"), task_category: "other", sort_order: 1, notes_template: t("Genel destek talebi incelenecek", "Review the general support request") }],
  "ATL-702": [{ task_name: t("Hesap Bilgisi Güncelleme", "Update Account Information"), task_category: "other", sort_order: 1, notes_template: t("Müşteri hesap bilgileri güncellenecek", "Update the customer's account information") }],
  "ATL-703": [{ task_name: t("Hizmet İptal/Dondurma İşlemi", "Cancel / Pause Service"), task_category: "other", sort_order: 1, notes_template: t("Hizmet iptali veya dondurma işlemi yapılacak", "Carry out the cancellation or pause") }],
  "ATL-704": [
    { task_name: t("Özel Hizmet Değerlendirme", "Review Custom Service"), task_category: "other", sort_order: 1, notes_template: t("Özel hizmet talebi değerlendirilecek", "Review the custom service request") },
    { task_name: t("Özel Hizmet Başlatma", "Start Custom Service"), task_category: "other", sort_order: 2, notes_template: t("Onaylanan özel hizmet başlatılacak", "Start the approved custom service") },
  ],
  "ATL-705": [{ task_name: t("İşletme Bilgileri Güncellemesini İncele", "Review Business Information Update"), task_category: "other", sort_order: 1, notes_template: t("Müşteri web sitesi, sosyal medya, Shopify ve LLC eksik bilgilerini paylaştı; kayıtlara işle.", "The customer shared missing website, social media, Shopify, and LLC details; record them.") }],
};

export function getTaskTemplates(formCode: string): TaskTemplate[];
export function getTaskTemplates(formCode: string, locale: Locale): TaskTemplate[];
export function getTaskTemplates(formCode: string, locale: Locale = "tr"): TaskTemplate[] {
  return (TASK_TEMPLATES_RAW[formCode] ?? []).map((template) => resolveLocalizedTaskTemplate(locale, template));
}
