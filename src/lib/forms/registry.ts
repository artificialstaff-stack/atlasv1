// =============================================================================
// ATLAS PLATFORM — Form Registry (Merkezi Form Kataloğu)
// Tüm form tanımlarını tek yerden sunar
// =============================================================================

import type { Locale } from "@/i18n";

import type { FormDefinition, FormCategory } from "./types";
import { resolveLocalizedForm, resolveLocalizedSearchBlob, type LocalizedFormDefinition } from "./localization";
import { llcLegalForms } from "./definitions/llc-legal";
import { shippingFulfillmentForms } from "./definitions/shipping-fulfillment";
import { accountingFinanceForms } from "./definitions/accounting-finance";
import { marketingAdvertisingForms } from "./definitions/marketing-advertising";
import { socialMediaForms } from "./definitions/social-media";
import { brandingDesignForms } from "./definitions/branding-design";
import { generalSupportForms } from "./definitions/general-support";

/** Tüm form tanımları — ham, locale-aware kaynaklar */
export const ALL_FORMS_RAW: LocalizedFormDefinition[] = [
  ...llcLegalForms,
  ...shippingFulfillmentForms,
  ...accountingFinanceForms,
  ...marketingAdvertisingForms,
  ...socialMediaForms,
  ...brandingDesignForms,
  ...generalSupportForms,
];

export function localizeForms(locale: Locale, forms: LocalizedFormDefinition[] = ALL_FORMS_RAW): FormDefinition[] {
  return forms.map((form) => resolveLocalizedForm(locale, form));
}

/** Varsayılan Türkçe görünüm için korunan katalog */
export const ALL_FORMS: FormDefinition[] = localizeForms("tr");

/** Form koduna göre hızlı erişim haritası */
export const FORM_MAP = new Map<string, FormDefinition>(ALL_FORMS.map((f) => [f.code, f]));

const FORM_MAP_RAW = new Map<string, LocalizedFormDefinition>(ALL_FORMS_RAW.map((f) => [f.code, f]));

/** Kategoriye göre formları getir */
export function getFormsByCategory(category: FormCategory): FormDefinition[];
export function getFormsByCategory(category: FormCategory, locale: Locale): FormDefinition[];
export function getFormsByCategory(category: FormCategory, locale: Locale = "tr"): FormDefinition[] {
  return localizeForms(locale).filter((f) => f.category === category && f.active);
}

/** Form koduna göre form getir */
export function getFormByCode(code: string): FormDefinition | undefined;
export function getFormByCode(code: string, locale: Locale): FormDefinition | undefined;
export function getFormByCode(code: string, locale: Locale = "tr"): FormDefinition | undefined {
  const form = FORM_MAP_RAW.get(code);
  return form ? resolveLocalizedForm(locale, form) : undefined;
}

/** Locale-aware eşdeğer */
export function getLocalizedFormByCode(code: string, locale: Locale): FormDefinition | undefined {
  return getFormByCode(code, locale);
}

/** Tüm aktif formları getir */
export function getActiveForms(): FormDefinition[];
export function getActiveForms(locale: Locale): FormDefinition[];
export function getActiveForms(locale: Locale = "tr"): FormDefinition[] {
  return localizeForms(locale).filter((f) => f.active);
}

/** Kategoriye göre locale-aware form getir */
export function getLocalizedFormsByCategory(category: FormCategory, locale: Locale): FormDefinition[] {
  return getFormsByCategory(category, locale);
}

/** Tüm formlarda arama (kod, başlık, açıklama, alanlar) */
export function searchForms(query: string): FormDefinition[];
export function searchForms(query: string, locale: Locale): FormDefinition[];
export function searchForms(query: string, locale: Locale = "tr"): FormDefinition[] {
  const q = query.trim().toLowerCase();
  if (!q) return getActiveForms(locale);

  return ALL_FORMS_RAW.filter((form) => {
    if (!form.active) return false;
    const blob = resolveLocalizedSearchBlob(locale, form);
    return blob.includes(q);
  }).map((form) => resolveLocalizedForm(locale, form));
}
