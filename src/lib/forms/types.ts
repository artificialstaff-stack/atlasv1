// =============================================================================
// ATLAS PLATFORM — Form System Types
// ABD form sistemi gibi (I-765, W-9 vb.) numaralı & kategorize edilmiş formlar
// =============================================================================

/** Form alanı tipleri */
export type FormFieldType =
  | "text"
  | "textarea"
  | "email"
  | "phone"
  | "url"
  | "number"
  | "currency"
  | "date"
  | "select"
  | "multi-select"
  | "radio"
  | "checkbox"
  | "file"
  | "heading"       // sadece başlık — veri tutmaz
  | "separator";    // sadece çizgi — veri tutmaz

/** Tek bir form alanının tanımı */
export interface FormFieldDefinition {
  /** Benzersiz alan adı (snake_case) */
  name: string;
  /** Görüntülenen etiket */
  label: string;
  /** Kısa açıklama / placeholder */
  placeholder?: string;
  /** Uzun yardım metni */
  helpText?: string;
  /** Alan tipi */
  type: FormFieldType;
  /** Zorunlu alan mı? */
  required?: boolean;
  /** Varsayılan değer */
  defaultValue?: string | number | boolean | string[];
  /** select / radio / multi-select için seçenekler */
  options?: { value: string; label: string }[];
  /** Validasyon kuralları */
  validation?: {
    minLength?: number;
    maxLength?: number;
    min?: number;
    max?: number;
    pattern?: string;
    patternMessage?: string;
  };
  /** Koşullu görünürlük: sadece belirli alan değerine bağlı göster */
  showWhen?: {
    field: string;
    value: string | string[];
  };
  /** Grid genişliği: 1 = full, 2 = yarım */
  colSpan?: 1 | 2;
}

/** Form bölümü — mantıksal gruplama */
export interface FormSection {
  /** Bölüm başlığı */
  title: string;
  /** Açıklama */
  description?: string;
  /** Bu bölümdeki alanlar */
  fields: FormFieldDefinition[];
}

/** Form kategorisi */
export type FormCategory =
  | "llc-legal"
  | "shipping-fulfillment"
  | "accounting-finance"
  | "marketing-advertising"
  | "social-media"
  | "branding-design"
  | "general-support";

/** Form kategori meta bilgisi */
export interface FormCategoryMeta {
  id: FormCategory;
  label: string;
  description: string;
  icon: string; // lucide icon adı
  color: string; // tailwind color token
}

/** Tek bir form tanımı */
export interface FormDefinition {
  /** Form kodu — benzersiz (ATL-101, ATL-201, vb.) */
  code: string;
  /** Form başlığı */
  title: string;
  /** Kısa açıklama */
  description: string;
  /** Uzun açıklama / talimatlar */
  instructions?: string;
  /** Kategori */
  category: FormCategory;
  /** Tahmini tamamlama süresi (dakika) */
  estimatedMinutes?: number;
  /** Form bölümleri */
  sections: FormSection[];
  /** Form etkin mi? */
  active: boolean;
  /** Versiyon */
  version: string;
}

/** Gönderilmiş form verisi */
export interface FormSubmission {
  id: string;
  form_code: string;
  user_id: string;
  /** Form alanlarının cevapları: { alan_adı: değer } */
  data: Record<string, unknown>;
  /** Gönderim durumu */
  status: FormSubmissionStatus;
  /** Admin notları */
  admin_notes?: string | null;
  /** Atanan admin */
  assigned_to?: string | null;
  /** Dosya ekleri (storage path'leri) */
  attachments?: string[];
  created_at: string;
  updated_at: string;
}

export type FormSubmissionStatus =
  | "draft"
  | "submitted"
  | "under_review"
  | "needs_correction"
  | "approved"
  | "rejected"
  | "completed";

export type FormLocale = "tr" | "en";

export const FORM_SUBMISSION_STATUS_LABELS: Record<FormSubmissionStatus, string> = {
  draft: "Taslak",
  submitted: "Gönderildi",
  under_review: "İnceleniyor",
  needs_correction: "Düzeltme Gerekli",
  approved: "Onaylandı",
  rejected: "Reddedildi",
  completed: "Tamamlandı",
};

export const FORM_SUBMISSION_STATUS_LABELS_EN: Record<FormSubmissionStatus, string> = {
  draft: "Draft",
  submitted: "Submitted",
  under_review: "Under review",
  needs_correction: "Needs correction",
  approved: "Approved",
  rejected: "Rejected",
  completed: "Completed",
};

export const FORM_SUBMISSION_STATUS_LABELS_BY_LOCALE: Record<FormLocale, Record<FormSubmissionStatus, string>> = {
  tr: FORM_SUBMISSION_STATUS_LABELS,
  en: FORM_SUBMISSION_STATUS_LABELS_EN,
};

export function getFormSubmissionStatusLabel(status: FormSubmissionStatus, locale: FormLocale = "tr"): string {
  return FORM_SUBMISSION_STATUS_LABELS_BY_LOCALE[locale][status];
}

export const FORM_SUBMISSION_STATUS_COLORS: Record<FormSubmissionStatus, string> = {
  draft: "text-muted-foreground bg-muted",
  submitted: "text-blue-500 bg-blue-500/10",
  under_review: "text-amber-500 bg-amber-500/10",
  needs_correction: "text-orange-500 bg-orange-500/10",
  approved: "text-emerald-500 bg-emerald-500/10",
  rejected: "text-red-500 bg-red-500/10",
  completed: "text-primary bg-primary/10",
};
