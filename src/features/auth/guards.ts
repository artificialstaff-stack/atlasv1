import { createClient } from "@/lib/supabase/server";
import type { UserRole } from "@/types/enums";

/**
 * Geçerli kullanıcı bilgilerini ve rolünü çeker
 * RSC ve Server Actions'da kullanılır
 */
export async function getCurrentUser() {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) return null;

  const role = (user.app_metadata?.user_role as UserRole) ?? "customer";

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
