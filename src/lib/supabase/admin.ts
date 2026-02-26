import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

/**
 * Admin (Service Role) Supabase İstemcisi
 * RLS'yi tamamen bypass eder — SADECE sunucu tarafında kullanılır!
 * Kullanım alanları: Kullanıcı oluşturma, toplu veri işlemleri, webhook handler'lar
 * 
 * ⚠️  ASLA istemciye göndermeyin — SUPABASE_SERVICE_ROLE_KEY gizli kalmalıdır
 */
export function createAdminClient() {
  return createSupabaseClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  );
}
