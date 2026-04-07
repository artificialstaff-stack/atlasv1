import type { Locale } from "@/i18n";
import { formatCurrencyByLocale, formatDateByLocale, formatNumberByLocale } from "@/i18n";

export type EmailLocale = Locale;
export type LocalizedEmailText = string | { tr: string; en: string };

export function localizedEmailText(tr: string, en: string): LocalizedEmailText {
  return { tr, en };
}

export function resolveEmailText(locale: EmailLocale, value?: LocalizedEmailText): string | undefined {
  if (value == null) return undefined;
  if (typeof value === "string") return value;
  return value[locale] ?? value.tr ?? value.en;
}

export function emailLang(locale: EmailLocale): "tr" | "en" {
  return locale === "en" ? "en" : "tr";
}

export function escapeHtml(input: string): string {
  return input
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function formatEmailCurrency(locale: EmailLocale, amount: number, currency: string): string {
  return formatCurrencyByLocale(locale, amount, currency);
}

export function formatEmailDate(locale: EmailLocale, value: string | Date): string {
  return formatDateByLocale(locale, value, {
    dateStyle: "medium",
  });
}

export function formatEmailNumber(locale: EmailLocale, value: number): string {
  return formatNumberByLocale(locale, value);
}
