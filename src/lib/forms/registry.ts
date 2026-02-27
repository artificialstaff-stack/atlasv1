// =============================================================================
// ATLAS PLATFORM — Form Registry (Merkezi Form Kataloğu)
// Tüm form tanımlarını tek yerden sunar
// =============================================================================

import type { FormDefinition, FormCategory } from "./types";
import { llcLegalForms } from "./definitions/llc-legal";
import { shippingFulfillmentForms } from "./definitions/shipping-fulfillment";
import { accountingFinanceForms } from "./definitions/accounting-finance";
import { marketingAdvertisingForms } from "./definitions/marketing-advertising";
import { socialMediaForms } from "./definitions/social-media";
import { brandingDesignForms } from "./definitions/branding-design";
import { generalSupportForms } from "./definitions/general-support";

/** Tüm form tanımları — tekil dizi */
export const ALL_FORMS: FormDefinition[] = [
  ...llcLegalForms,
  ...shippingFulfillmentForms,
  ...accountingFinanceForms,
  ...marketingAdvertisingForms,
  ...socialMediaForms,
  ...brandingDesignForms,
  ...generalSupportForms,
];

/** Form koduna göre hızlı erişim haritası */
export const FORM_MAP = new Map<string, FormDefinition>(
  ALL_FORMS.map((f) => [f.code, f])
);

/** Kategoriye göre formları getir */
export function getFormsByCategory(category: FormCategory): FormDefinition[] {
  return ALL_FORMS.filter((f) => f.category === category && f.active);
}

/** Form koduna göre form getir */
export function getFormByCode(code: string): FormDefinition | undefined {
  return FORM_MAP.get(code);
}

/** Tüm aktif formları getir */
export function getActiveForms(): FormDefinition[] {
  return ALL_FORMS.filter((f) => f.active);
}

/** Arama (kod, başlık, açıklama içinde) */
export function searchForms(query: string): FormDefinition[] {
  const q = query.toLowerCase();
  return ALL_FORMS.filter(
    (f) =>
      f.active &&
      (f.code.toLowerCase().includes(q) ||
        f.title.toLowerCase().includes(q) ||
        f.description.toLowerCase().includes(q))
  );
}
