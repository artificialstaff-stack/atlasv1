import { createClient } from "@/lib/supabase/server";

export type AuthenticatedUser = {
  id: string;
  email: string;
  role: string;
};

/**
 * API Route'larında admin yetkisi kontrolü.
 * 1) user_roles tablosunu sorgular (source of truth)
 * 2) Fallback: JWT app_metadata.user_role
 *
 * @returns AuthenticatedUser veya null (yetkisiz)
 */
export async function requireAdmin(): Promise<AuthenticatedUser | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  // 1) user_roles tablosu (primary source)
  let role: string | null = null;
  try {
    const { data } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("is_active", true)
      .maybeSingle();

    if (data?.role) {
      role = data.role;
    }
  } catch {
    // Tablo yoksa veya hata varsa fallback kullan
  }

  // 2) Fallback: JWT app_metadata
  if (!role) {
    const metaRole = user.app_metadata?.user_role;
    if (typeof metaRole === "string") {
      role = metaRole;
    }
  }

  if (!role || !["admin", "super_admin"].includes(role)) {
    return null;
  }

  return { id: user.id, email: user.email!, role };
}

/**
 * Herhangi bir oturum açmış kullanıcı kontrolü.
 */
export async function requireAuth(): Promise<AuthenticatedUser | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const role =
    (user.app_metadata?.user_role as string) ?? "customer";

  return { id: user.id, email: user.email!, role };
}
