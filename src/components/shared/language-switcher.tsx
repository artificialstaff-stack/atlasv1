/**
 * ─── Atlas Platform — Language Switcher ───
 * Dropdown ile dil değiştirme bileşeni.
 * Cookie'ye yazar, sayfayı yeniden yükler (SSR locale sync).
 */
"use client";

import { useI18n } from "@/i18n/provider";
import { LOCALES, type Locale } from "@/i18n";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Globe } from "lucide-react";
import { useRouter } from "next/navigation";

const LOCALE_LABELS: Record<Locale, { label: string; flag: string }> = {
  tr: { label: "Türkçe", flag: "🇹🇷" },
  en: { label: "English", flag: "🇺🇸" },
};

export function LanguageSwitcher() {
  const { locale, setLocale } = useI18n();
  const router = useRouter();

  const handleChange = (newLocale: Locale) => {
    if (newLocale === locale) return;
    setLocale(newLocale);
    // Refresh to pick up SSR-level locale changes
    router.refresh();
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="h-9 w-9" aria-label="Change language">
          <Globe className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {LOCALES.map((loc) => (
          <DropdownMenuItem
            key={loc}
            onClick={() => handleChange(loc)}
            className={loc === locale ? "bg-accent" : ""}
          >
            <span className="mr-2">{LOCALE_LABELS[loc].flag}</span>
            {LOCALE_LABELS[loc].label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
