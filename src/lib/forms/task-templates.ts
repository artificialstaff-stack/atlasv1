// =============================================================================
// ATLAS PLATFORM — Form → Process Task Template Mapping
// Form onaylandığında otomatik olarak oluşturulacak görev şablonları
// =============================================================================

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

/**
 * Her form_code için, form onaylandığında (status → approved)
 * otomatik olarak oluşturulacak process_tasks şablonları.
 *
 * Birden fazla görev oluşturulabilir (adım adım süreç).
 */
export const TASK_TEMPLATES: Record<string, TaskTemplate[]> = {
  // ─── LLC & Legal ───
  "ATL-101": [
    { task_name: "LLC Kuruluş Belgelerini Hazırla", task_category: "legal", sort_order: 1, notes_template: "Müşteri LLC kurulumu için başvurdu. Eyalet: {data.state}" },
    { task_name: "Articles of Organization Dosyala", task_category: "legal", sort_order: 2, notes_template: "Eyalet sekreterliğine başvuru yapılacak" },
    { task_name: "Operating Agreement Hazırla", task_category: "legal", sort_order: 3, notes_template: "LLC operating agreement taslağı hazırlanacak" },
  ],
  "ATL-102": [
    { task_name: "EIN Başvurusu Yap (IRS SS-4)", task_category: "tax", sort_order: 1, notes_template: "IRS'e EIN başvurusu yapılacak" },
    { task_name: "EIN Confirmation Letter Teslim Et", task_category: "tax", sort_order: 2, notes_template: "EIN numarası alındıktan sonra müşteriye iletilecek" },
  ],
  "ATL-103": [
    { task_name: "Reseller Permit Başvurusu", task_category: "tax", sort_order: 1, notes_template: "Satış vergisi muafiyeti başvurusu yapılacak" },
    { task_name: "Reseller Permit Belgesi Teslim Et", task_category: "tax", sort_order: 2, notes_template: "Permit belgesini müşteriye ilet" },
  ],
  "ATL-104": [
    { task_name: "Marka Araştırması (TESS)", task_category: "legal", sort_order: 1, notes_template: "USPTO TESS veritabanında marka araştırması" },
    { task_name: "Trademark Başvurusu (USPTO)", task_category: "legal", sort_order: 2, notes_template: "Marka tescil başvurusu dosyalanacak" },
    { task_name: "Trademark İzleme & Takip", task_category: "legal", sort_order: 3, notes_template: "Başvuru durumu takip edilecek" },
  ],

  // ─── Shipping & Fulfillment ───
  "ATL-201": [
    { task_name: "Ürün Gönderim Hazırlığı", task_category: "logistics", sort_order: 1, notes_template: "Ürünler depoya alınacak ve gönderime hazırlanacak" },
    { task_name: "Kargo Takip Numarası Oluştur", task_category: "logistics", sort_order: 2, notes_template: "Gönderim yapıldıktan sonra tracking no iletilecek" },
  ],
  "ATL-202": [
    { task_name: "Stok Transfer İşlemi", task_category: "logistics", sort_order: 1, notes_template: "İç depo transfer işlemi başlatılacak" },
  ],
  "ATL-203": [
    { task_name: "Özel Fulfillment Planı Oluştur", task_category: "logistics", sort_order: 1, notes_template: "Müşteriye özel sipariş karşılama planı hazırlanacak" },
    { task_name: "Fulfillment İşlemi Başlat", task_category: "logistics", sort_order: 2, notes_template: "Plan onaylandıktan sonra işlem başlatılacak" },
  ],

  // ─── Accounting & Finance ───
  "ATL-301": [
    { task_name: "Muhasebe Hizmeti Kurulumu", task_category: "tax", sort_order: 1, notes_template: "Müşteri defter tutma hizmeti başlatılacak" },
    { task_name: "İlk Ay Muhasebe Raporu", task_category: "tax", sort_order: 2, notes_template: "İlk aylık muhasebe raporu hazırlanacak" },
  ],
  "ATL-302": [
    { task_name: "Vergi Beyannamesi Hazırlığı", task_category: "tax", sort_order: 1, notes_template: "Yıllık vergi beyannamesi hazırlanacak" },
    { task_name: "Beyanname Dosyalama (IRS)", task_category: "tax", sort_order: 2, notes_template: "IRS'e beyanname dosyalanacak" },
  ],
  "ATL-303": [
    { task_name: "Mali Danışmanlık Randevusu Planla", task_category: "tax", sort_order: 1, notes_template: "Müşteriyle mali danışmanlık toplantısı ayarlanacak" },
  ],

  // ─── Marketing & Advertising ───
  "ATL-401": [
    { task_name: "Kampanya Stratejisi Hazırla", task_category: "marketplace", sort_order: 1, notes_template: "Pazarlama kampanyası stratejisi oluşturulacak" },
    { task_name: "Kampanyayı Başlat", task_category: "marketplace", sort_order: 2, notes_template: "Onaylanan strateji doğrultusunda kampanya başlatılacak" },
  ],
  "ATL-402": [
    { task_name: "SEO Analiz Raporu", task_category: "marketplace", sort_order: 1, notes_template: "Mevcut durum SEO analizi yapılacak" },
    { task_name: "SEO Optimizasyon Uygulaması", task_category: "marketplace", sort_order: 2, notes_template: "Öneriler doğrultusunda optimizasyon yapılacak" },
  ],
  "ATL-403": [
    { task_name: "Influencer Araştırması", task_category: "marketplace", sort_order: 1, notes_template: "Uygun influencer'lar araştırılacak" },
    { task_name: "İş Birliği Anlaşması", task_category: "marketplace", sort_order: 2, notes_template: "Seçilen influencer ile anlaşma sağlanacak" },
  ],

  // ─── Social Media ───
  "ATL-501": [
    { task_name: "Sosyal Medya Hesapları Oluştur", task_category: "marketplace", sort_order: 1, notes_template: "İstenen platformlarda hesaplar açılacak" },
    { task_name: "Profil Optimizasyonu", task_category: "marketplace", sort_order: 2, notes_template: "Hesaplar optimize edilecek (bio, görsel, vs.)" },
  ],
  "ATL-502": [
    { task_name: "İçerik Takvimi Hazırla", task_category: "marketplace", sort_order: 1, notes_template: "Aylık içerik planı takvimi oluşturulacak" },
    { task_name: "İçerik Üretimi Başlat", task_category: "marketplace", sort_order: 2, notes_template: "Onaylanan takvim doğrultusunda içerik üretimine başlanacak" },
  ],
  "ATL-503": [
    { task_name: "Topluluk Yönetimi Planı", task_category: "marketplace", sort_order: 1, notes_template: "Community management stratejisi hazırlanacak" },
  ],

  // ─── Branding & Design ───
  "ATL-601": [
    { task_name: "Marka Briefingi Analizi", task_category: "other", sort_order: 1, notes_template: "Müşteri marka briefingi analiz edilecek" },
    { task_name: "Logo & Kimlik Tasarımı", task_category: "other", sort_order: 2, notes_template: "Logo ve marka kimliği tasarlanacak" },
    { task_name: "Marka Kılavuzu Teslimi", task_category: "other", sort_order: 3, notes_template: "Brand guidelines dokümanı hazırlanacak" },
  ],
  "ATL-602": [
    { task_name: "Ambalaj Tasarım Konsepti", task_category: "other", sort_order: 1, notes_template: "Ambalaj tasarımı konseptleri hazırlanacak" },
    { task_name: "Final Tasarım & Baskı Dosyası", task_category: "other", sort_order: 2, notes_template: "Onaylanan konsept baskıya hazır hale getirilecek" },
  ],
  "ATL-603": [
    { task_name: "Fotoğraf Çekimi Planlama", task_category: "other", sort_order: 1, notes_template: "Ürün fotoğraf çekimi planlanacak" },
    { task_name: "Fotoğraf Düzenleme & Teslim", task_category: "other", sort_order: 2, notes_template: "Çekilen fotoğraflar düzenlenip teslim edilecek" },
  ],

  // ─── General Support ───
  "ATL-701": [
    { task_name: "Destek Talebi İnceleme", task_category: "other", sort_order: 1, notes_template: "Genel destek talebi incelenecek" },
  ],
  "ATL-702": [
    { task_name: "Hesap Bilgisi Güncelleme", task_category: "other", sort_order: 1, notes_template: "Müşteri hesap bilgileri güncellenecek" },
  ],
  "ATL-703": [
    { task_name: "Hizmet İptal/Dondurma İşlemi", task_category: "other", sort_order: 1, notes_template: "Hizmet iptali veya dondurma işlemi yapılacak" },
  ],
  "ATL-704": [
    { task_name: "Özel Hizmet Değerlendirme", task_category: "other", sort_order: 1, notes_template: "Özel hizmet talebi değerlendirilecek" },
    { task_name: "Özel Hizmet Başlatma", task_category: "other", sort_order: 2, notes_template: "Onaylanan özel hizmet başlatılacak" },
  ],
};

/**
 * Verilen form kodu için görev şablonlarını döndürür.
 * Eşleşme yoksa boş dizi döner.
 */
export function getTaskTemplates(formCode: string): TaskTemplate[] {
  return TASK_TEMPLATES[formCode] ?? [];
}
