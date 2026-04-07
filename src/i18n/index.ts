import { tr, type Dictionary } from "./dictionaries/tr";
import { en } from "./dictionaries/en";

export type Locale = "tr" | "en";
export type TranslationValue = string | number | null | undefined;
export type TranslationParams = Record<string, TranslationValue>;

export const LOCALES: Locale[] = ["tr", "en"];
export const DEFAULT_LOCALE: Locale = "tr";

const dictionaries: Record<Locale, Dictionary> = { tr, en };
const LOCALE_FORMATS: Record<Locale, string> = {
  tr: "tr-TR",
  en: "en-US",
};

/**
 * Sözlüğü yükle
 */
export function getDictionary(locale: Locale): Dictionary {
  return dictionaries[locale] ?? dictionaries[DEFAULT_LOCALE];
}

export function getLocaleFormat(locale: Locale): string {
  return LOCALE_FORMATS[locale] ?? LOCALE_FORMATS[DEFAULT_LOCALE];
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
function interpolate(template: string, params?: TranslationParams): string {
  if (!params) return template;

  return template.replace(/\{\{(.*?)\}\}/g, (_, rawKey: string) => {
    const key = rawKey.trim();
    const value = params[key];
    return value === null || value === undefined ? "" : String(value);
  });
}

function resolveValue(dict: Dictionary, key: string): unknown {
  const keys = key.split(".");
  let current: unknown = dict;

  for (const k of keys) {
    if (current && typeof current === "object" && k in current) {
      current = (current as Record<string, unknown>)[k];
    } else {
      return key;
    }
  }

  return current;
}

/**
 * Nested key resolver: t("orders.statuses.pending") → "Bekliyor"
 */
export function t(dict: Dictionary, key: string, params?: TranslationParams): string {
  const value = resolveValue(dict, key);
  return typeof value === "string" ? interpolate(value, params) : key;
}

export function translate(locale: Locale, key: string, params?: TranslationParams): string {
  return t(getDictionary(locale), key, params);
}

export function createTranslator(locale: Locale) {
  const dict = getDictionary(locale);
  return (key: string, params?: TranslationParams) => t(dict, key, params);
}

export function formatDateByLocale(
  locale: Locale,
  value: Date | string | number,
  options?: Intl.DateTimeFormatOptions,
): string {
  const date = value instanceof Date ? value : new Date(value);
  return new Intl.DateTimeFormat(getLocaleFormat(locale), options).format(date);
}

export function formatNumberByLocale(
  locale: Locale,
  value: number,
  options?: Intl.NumberFormatOptions,
): string {
  return new Intl.NumberFormat(getLocaleFormat(locale), options).format(value);
}

export function formatCurrencyByLocale(
  locale: Locale,
  value: number,
  currency = "USD",
  options?: Intl.NumberFormatOptions,
): string {
  return new Intl.NumberFormat(getLocaleFormat(locale), {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
    ...options,
  }).format(value);
}

export type { Dictionary };
export { tr, en };
