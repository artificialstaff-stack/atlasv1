/**
 * ─── Atlas Platform — Middleware ───
 * Supabase auth session refresh, route protection,
 * locale detection, security headers.
 */

import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { detectLocale, LOCALES, type Locale } from "@/i18n";

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request });

  // ─── Supabase Auth Session Refresh ───
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
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

  // ─── Admin Rotaları Koruması ───
  if (pathname.startsWith("/admin")) {
    if (!user) {
      const url = request.nextUrl.clone();
      url.pathname = "/login";
      url.searchParams.set("redirect", pathname);
      return NextResponse.redirect(url);
    }

    // Rol kontrolü
    const { data: roles } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("is_active", true)
      .limit(1)
      .maybeSingle();

    const userRole = roles?.role;
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
      const { data: roles } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .eq("is_active", true)
        .limit(1)
        .maybeSingle();

      const url = request.nextUrl.clone();
      url.pathname =
        roles?.role && ["admin", "super_admin"].includes(roles.role)
          ? "/admin/dashboard"
          : "/panel/dashboard";
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

  // ─── Security Headers ───
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  response.headers.set(
    "Permissions-Policy",
    "camera=(), microphone=(), geolocation=()"
  );

  return response;
}

export const config = {
  matcher: [
    /*
     * Match all paths except:
     * - _next/static (static files)
     * - _next/image (image optimization)
     * - favicon.ico, manifest.json, sw.js, icons
     * - api routes (handled separately)
     */
    "/((?!_next/static|_next/image|favicon\\.ico|manifest\\.json|sw\\.js|icons/).*)",
  ],
};
