"use client";

import { createContext, useContext, useState, useCallback, type ReactNode } from "react";
import { getDictionary, t as translate, DEFAULT_LOCALE, type Locale, type Dictionary } from "@/i18n";

interface I18nContextType {
  locale: Locale;
  dict: Dictionary;
  t: (key: string) => string;
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
    // Persist preference
    if (typeof document !== "undefined") {
      document.cookie = `atlas_locale=${newLocale};path=/;max-age=31536000`;
      document.documentElement.lang = newLocale;
    }
  }, []);

  const t = useCallback(
    (key: string) => translate(dict, key),
    [dict]
  );

  return (
    <I18nContext.Provider value={{ locale, dict, t, setLocale }}>
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
