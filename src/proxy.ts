/**
 * ─── Atlas Platform — Proxy ───
 * Supabase auth session refresh, route protection,
 * locale detection, security headers.
 */

import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { detectLocale, LOCALES, type Locale } from "@/i18n";
import { resolveSurfaceRedirect } from "@/lib/app-surface";
import { getSupabasePublicConfig } from "@/lib/supabase/config";

export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });
  const { url, publishableKey } = getSupabasePublicConfig();
  const surfaceRedirect = resolveSurfaceRedirect({
    url: request.nextUrl,
    hostHeader: request.headers.get("host"),
  });

  if (surfaceRedirect) {
    return NextResponse.redirect(surfaceRedirect);
  }

  // ─── Supabase Auth Session Refresh ───
  const supabase = createServerClient(
    url,
    publishableKey,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // ÖNEMLİ: getUser() session cookie'sini yeniler
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const pathname = request.nextUrl.pathname;

  // ─── Rol belirleme yardımcı fonksiyonu ───
  async function getUserRole(userId: string): Promise<string | null> {
    try {
      const { data: roles, error } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", userId)
        .eq("is_active", true)
        .limit(1)
        .maybeSingle();

      if (!error && roles?.role) {
        return roles.role;
      }
    } catch {
      // user_roles sorgusu başarısız — fallback kullan
    }

    // Fallback: JWT app_metadata'dan oku
    const metaRole = user?.app_metadata?.user_role;
    if (metaRole && typeof metaRole === "string") {
      return metaRole;
    }

    return null;
  }

  // ─── Admin Login — giriş yapmışsa ve admin ise dashboard'a yönlendir ───
  if (pathname === "/admin/login") {
    if (user) {
      const userRole = await getUserRole(user.id);
      if (userRole && ["admin", "super_admin"].includes(userRole)) {
        const url = request.nextUrl.clone();
        url.pathname = "/admin/dashboard";
        url.search = "";
        return NextResponse.redirect(url);
      }
    }
    // Admin login sayfasını göster (giriş yapmamış veya admin değil)
    return response;
  }

  // ─── Admin Rotaları Koruması ───
  if (pathname.startsWith("/admin")) {
    if (!user) {
      const url = request.nextUrl.clone();
      url.pathname = "/admin/login";
      return NextResponse.redirect(url);
    }

    const userRole = await getUserRole(user.id);
    if (!userRole || !["admin", "super_admin"].includes(userRole)) {
      const url = request.nextUrl.clone();
      url.pathname = "/panel/dashboard";
      return NextResponse.redirect(url);
    }
  }

  // ─── Panel (Müşteri) Rotaları Koruması ───
  if (pathname.startsWith("/panel")) {
    if (!user) {
      const url = request.nextUrl.clone();
      url.pathname = "/login";
      url.searchParams.set("redirect", pathname);
      return NextResponse.redirect(url);
    }
  }

  // ─── Login/Register — zaten giriş yapmışsa yönlendir ───
  if (pathname === "/login" || pathname === "/register") {
    if (user) {
      const userRole = await getUserRole(user.id);
      const url = request.nextUrl.clone();

      if (userRole && ["admin", "super_admin"].includes(userRole)) {
        url.pathname = "/admin/dashboard";
      } else {
        url.pathname = "/panel/dashboard";
      }
      url.search = "";
      return NextResponse.redirect(url);
    }
  }

  // ─── Locale Detection (cookie > Accept-Language > default) ───
  const cookieLocale = request.cookies.get("atlas_locale")?.value as
    | Locale
    | undefined;
  const locale =
    cookieLocale && LOCALES.includes(cookieLocale)
      ? cookieLocale
      : detectLocale(request.headers.get("accept-language"));

  response.headers.set("x-atlas-locale", locale);

  if (!cookieLocale) {
    response.cookies.set("atlas_locale", locale, {
      path: "/",
      maxAge: 60 * 60 * 24 * 365,
      sameSite: "lax",
    });
  }

  // Security headers are set in next.config.ts — no duplication needed here

  return response;
}

export const config = {
  matcher: [
    /*
     * Match all paths except:
     * - _next/static (static files)
     * - _next/image (image optimization)
     * - favicon.ico, manifest.json, sw.js, icons
     * - api routes (each route handles its own auth)
     */
    "/((?!_next/static|_next/image|_next/webpack-hmr|favicon\\.ico|manifest\\.json|sw\\.js|icons/|api/).*)",
  ],
};
