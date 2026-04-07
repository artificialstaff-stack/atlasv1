import type { SupabaseClient, User } from "@supabase/supabase-js";

import { LOCALES, type Locale } from "@/i18n";

export const LOCALE_COOKIE_NAME = "atlas_locale";

export function isLocale(value: unknown): value is Locale {
  return typeof value === "string" && LOCALES.includes(value as Locale);
}

export function parseLocale(value: unknown): Locale | null {
  return isLocale(value) ? value : null;
}

export function getUserLocale(user: Pick<User, "user_metadata"> | null | undefined): Locale | null {
  const metadata = user?.user_metadata;
  if (!metadata || typeof metadata !== "object") return null;

  return (
    parseLocale((metadata as Record<string, unknown>).atlas_locale) ??
    parseLocale((metadata as Record<string, unknown>).locale) ??
    parseLocale((metadata as Record<string, unknown>).language)
  );
}

export function getCookieLocale(rawValue: string | undefined): Locale | null {
  return parseLocale(rawValue);
}

export function persistLocaleCookie(locale: Locale) {
  if (typeof document === "undefined") return;

  document.cookie = `${LOCALE_COOKIE_NAME}=${locale};path=/;max-age=31536000;samesite=lax`;
  document.documentElement.lang = locale;
}

export async function setAuthenticatedUserLocale(
  supabase: Pick<SupabaseClient, "auth">,
  locale: Locale,
) {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return;

  await supabase.auth.updateUser({
    data: {
      ...(user.user_metadata ?? {}),
      atlas_locale: locale,
      locale,
    },
  });
}
