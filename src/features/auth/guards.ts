import { createClient } from "@/lib/supabase/server";
import type { UserRole } from "@/types/enums";

/**
 * Geçerli kullanıcı bilgilerini ve rolünü çeker
 * RSC ve Server Actions'da kullanılır
 *
 * 1) user_roles tablosunu sorgular (source of truth)
 * 2) Fallback: JWT app_metadata.user_role
 */
export async function getCurrentUser() {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) return null;

  // 1) user_roles tablosu (primary)
  let role: UserRole = "customer";
  try {
    const { data } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("is_active", true)
      .maybeSingle();

    if (data?.role) {
      role = data.role as UserRole;
    }
  } catch {
    // Tablo yoksa veya hata varsa fallback
  }

  // 2) Fallback: JWT app_metadata
  if (role === "customer") {
    const metaRole = user.app_metadata?.user_role;
    if (metaRole && typeof metaRole === "string") {
      role = metaRole as UserRole;
    }
  }

  return {
    id: user.id,
    email: user.email!,
    role,
    metadata: user.app_metadata,
  };
}

/**
 * Kullanıcının admin olup olmadığını kontrol eder
 */
export async function requireAdmin() {
  const user = await getCurrentUser();
  if (!user) throw new Error("Oturum açmanız gerekiyor.");
  if (user.role !== "admin" && user.role !== "super_admin") {
    throw new Error("Bu işlem için yönetici yetkisi gerekiyor.");
  }
  return user;
}

/**
 * Kullanıcı oturumunun geçerli olduğunu doğrular
 */
export async function requireAuth() {
  const user = await getCurrentUser();
  if (!user) throw new Error("Oturum açmanız gerekiyor.");
  return user;
}

/**
 * Belirli rollere erişimi sınırlar
 */
export async function requireRole(...roles: UserRole[]) {
  const user = await getCurrentUser();
  if (!user) throw new Error("Oturum açmanız gerekiyor.");
  if (!roles.includes(user.role as UserRole)) {
    throw new Error("Bu sayfaya erişim yetkiniz yok.");
  }
  return user;
}

/**
 * Rol bazlı yetki kontrolü (boolean)
 */
export function isAdmin(role: string): boolean {
  return role === "admin" || role === "super_admin";
}

export function canViewAdmin(role: string): boolean {
  return ["admin", "super_admin", "moderator", "viewer"].includes(role);
}

export function canEdit(role: string): boolean {
  return ["admin", "super_admin"].includes(role);
}

export function canManageRoles(role: string): boolean {
  return role === "super_admin";
}
