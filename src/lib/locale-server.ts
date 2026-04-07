import { cookies } from "next/headers";

import { DEFAULT_LOCALE, type Locale } from "@/i18n";
import { createClient as createServerSupabaseClient } from "@/lib/supabase/server";
import { getCookieLocale, getUserLocale, LOCALE_COOKIE_NAME } from "@/lib/locale";

export async function resolveServerLocale(): Promise<Locale> {
  const cookieStore = await cookies();
  const cookieLocale = getCookieLocale(cookieStore.get(LOCALE_COOKIE_NAME)?.value);

  try {
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    return getUserLocale(user) ?? cookieLocale ?? DEFAULT_LOCALE;
  } catch {
    return cookieLocale ?? DEFAULT_LOCALE;
  }
}
