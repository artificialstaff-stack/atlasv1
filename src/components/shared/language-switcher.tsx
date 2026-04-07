/**
 * ─── Atlas Platform — Language Switcher ───
 * Dropdown ile dil değiştirme bileşeni.
 * Cookie'ye yazar, sayfayı yeniden yükler (SSR locale sync).
 */
"use client";

import { useTransition } from "react";
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
import { createClient } from "@/lib/supabase/client";
import { setAuthenticatedUserLocale } from "@/lib/locale";

export function LanguageSwitcher() {
  const { locale, setLocale, t } = useI18n();
  const router = useRouter();
  const supabase = createClient();
  const [isPending, startTransition] = useTransition();

  const localeLabels: Record<Locale, { label: string; flag: string }> = {
    tr: { label: t("languageSwitcher.turkish"), flag: "🇹🇷" },
    en: { label: t("languageSwitcher.english"), flag: "🇺🇸" },
  };

  const handleChange = async (newLocale: Locale) => {
    if (newLocale === locale) return;

    setLocale(newLocale);

    try {
      await setAuthenticatedUserLocale(supabase, newLocale);
    } catch {
      // Cookie persistence is the fallback source for unauthenticated or failed updates.
    }

    startTransition(() => {
      router.refresh();
    });
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="h-9 w-9"
          aria-label={t("languageSwitcher.changeLanguage")}
          disabled={isPending}
        >
          <Globe className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {LOCALES.map((loc) => (
          <DropdownMenuItem
            key={loc}
            onClick={() => {
              void handleChange(loc);
            }}
            className={loc === locale ? "bg-accent" : ""}
          >
            <span className="mr-2">{localeLabels[loc].flag}</span>
            {localeLabels[loc].label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
