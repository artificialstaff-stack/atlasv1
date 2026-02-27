/**
 * ─── Atlas i18n System ───
 * Locale detection, dictionary loading, translation hooks.
 */

import { tr, type Dictionary } from "./dictionaries/tr";
import { en } from "./dictionaries/en";

export type Locale = "tr" | "en";

export const LOCALES: Locale[] = ["tr", "en"];
export const DEFAULT_LOCALE: Locale = "tr";

const dictionaries: Record<Locale, Dictionary> = { tr, en };

/**
 * Sözlüğü yükle
 */
export function getDictionary(locale: Locale): Dictionary {
  return dictionaries[locale] ?? dictionaries[DEFAULT_LOCALE];
}

/**
 * Accept-Language header'ından locale belirle
 */
export function detectLocale(acceptLanguage?: string | null): Locale {
  if (!acceptLanguage) return DEFAULT_LOCALE;

  const preferred = acceptLanguage
    .split(",")
    .map((l) => l.split(";")[0].trim().toLowerCase().slice(0, 2));

  for (const lang of preferred) {
    if (LOCALES.includes(lang as Locale)) return lang as Locale;
  }

  return DEFAULT_LOCALE;
}

/**
 * Nested key resolver: t("orders.statuses.pending") → "Bekliyor"
 */
export function t(dict: Dictionary, key: string): string {
  const keys = key.split(".");
  let current: unknown = dict;

  for (const k of keys) {
    if (current && typeof current === "object" && k in current) {
      current = (current as Record<string, unknown>)[k];
    } else {
      return key; // Bulunamazsa key'i döndür
    }
  }

  return typeof current === "string" ? current : key;
}

export type { Dictionary };
export { tr, en };
