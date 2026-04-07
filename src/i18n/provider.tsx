"use client";

import { createContext, useContext, useState, useCallback, type ReactNode } from "react";
import {
  getDictionary,
  t as translate,
  DEFAULT_LOCALE,
  type Locale,
  type Dictionary,
  type TranslationParams,
  formatCurrencyByLocale,
  formatDateByLocale,
  formatNumberByLocale,
} from "@/i18n";
import { persistLocaleCookie } from "@/lib/locale";

interface I18nContextType {
  locale: Locale;
  dict: Dictionary;
  t: (key: string, params?: TranslationParams) => string;
  formatDate: (value: Date | string | number, options?: Intl.DateTimeFormatOptions) => string;
  formatNumber: (value: number, options?: Intl.NumberFormatOptions) => string;
  formatCurrency: (value: number, currency?: string, options?: Intl.NumberFormatOptions) => string;
  setLocale: (locale: Locale) => void;
}

const I18nContext = createContext<I18nContextType | null>(null);

export function I18nProvider({
  children,
  initialLocale = DEFAULT_LOCALE,
}: {
  children: ReactNode;
  initialLocale?: Locale;
}) {
  const [locale, setLocaleState] = useState<Locale>(initialLocale);
  const [dict, setDict] = useState<Dictionary>(getDictionary(initialLocale));

  const setLocale = useCallback((newLocale: Locale) => {
    setLocaleState(newLocale);
    setDict(getDictionary(newLocale));
    persistLocaleCookie(newLocale);
  }, []);

  const t = useCallback((key: string, params?: TranslationParams) => translate(dict, key, params), [dict]);
  const formatDate = useCallback(
    (value: Date | string | number, options?: Intl.DateTimeFormatOptions) =>
      formatDateByLocale(locale, value, options),
    [locale],
  );
  const formatNumber = useCallback(
    (value: number, options?: Intl.NumberFormatOptions) => formatNumberByLocale(locale, value, options),
    [locale],
  );
  const formatCurrency = useCallback(
    (value: number, currency?: string, options?: Intl.NumberFormatOptions) =>
      formatCurrencyByLocale(locale, value, currency, options),
    [locale],
  );

  return (
    <I18nContext.Provider value={{ locale, dict, t, formatDate, formatNumber, formatCurrency, setLocale }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useI18n() {
  const context = useContext(I18nContext);
  if (!context) {
    throw new Error("useI18n must be used within <I18nProvider>");
  }
  return context;
}

export function useTranslation() {
  return useI18n();
}
