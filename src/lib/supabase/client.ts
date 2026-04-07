import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "@/types/database";
import { getSupabasePublicConfig } from "@/lib/supabase/config";

/**
 * Tarayıcı (Browser) Supabase İstemcisi
 * İstemci bileşenlerinde kullanılır (Client Components)
 * RLS otomatik uygulanır — anon key kullanır
 */
export function createClient() {
  const { url, publishableKey } = getSupabasePublicConfig();

  return createBrowserClient<Database>(
    url,
    publishableKey
  );
}
