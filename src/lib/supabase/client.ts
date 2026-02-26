import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "@/types/database";

/**
 * Tarayıcı (Browser) Supabase İstemcisi
 * İstemci bileşenlerinde kullanılır (Client Components)
 * RLS otomatik uygulanır — anon key kullanır
 */
export function createClient() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
