import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/types/database";

const ADMIN_ROLES = new Set(["admin", "super_admin"]);
const DISALLOWED_REDIRECTS = new Set([
  "/login",
  "/admin/login",
  "/register",
  "/forgot-password",
  "/auth/callback",
]);

export const DEFAULT_CUSTOMER_REDIRECT = "/panel/dashboard";
export const DEFAULT_ADMIN_REDIRECT = "/admin/dashboard";

export function normalizeRedirectTarget(value: string | null | undefined): string | null {
  if (!value || !value.startsWith("/") || value.startsWith("//")) {
    return null;
  }

  try {
    const url = new URL(value, "https://atlas.local");
    if (DISALLOWED_REDIRECTS.has(url.pathname)) {
      return null;
    }

    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return null;
  }
}

export function readHashAuthTokens(hash: string) {
  const params = new URLSearchParams(hash.startsWith("#") ? hash.slice(1) : hash);
  const accessToken = params.get("access_token");
  const refreshToken = params.get("refresh_token");

  if (!accessToken || !refreshToken) {
    return null;
  }

  return {
    accessToken,
    refreshToken,
    type: params.get("type"),
  };
}

export function isRecoveryFlow(input: {
  next?: string | null;
  redirect?: string | null;
  type?: string | null;
}) {
  return input.next === "/reset-password"
    || input.redirect === "/reset-password"
    || input.type === "recovery";
}

export async function resolvePostAuthDestination(
  supabase: SupabaseClient<Database>,
  preferredTarget?: string | null,
) {
  const normalizedTarget = normalizeRedirectTarget(preferredTarget);
  if (normalizedTarget) {
    return normalizedTarget;
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();
  const metadataRole = typeof user?.app_metadata?.user_role === "string"
    ? user.app_metadata.user_role.toLowerCase()
    : null;

  if (metadataRole && ADMIN_ROLES.has(metadataRole)) {
    return DEFAULT_ADMIN_REDIRECT;
  }

  if (user) {
    try {
      const { data } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .eq("is_active", true)
        .limit(1)
        .maybeSingle();

      const rowRole = typeof data?.role === "string" ? data.role.toLowerCase() : null;
      if (rowRole && ADMIN_ROLES.has(rowRole)) {
        return DEFAULT_ADMIN_REDIRECT;
      }
    } catch {
      // Fall back to the customer surface when role lookup is unavailable.
    }
  }

  return DEFAULT_CUSTOMER_REDIRECT;
}
