/**
 * ─── Atlas Platform — Middleware ───
 * Locale detection, security headers, CSP.
 * Cookie-based locale preference: `atlas_locale`.
 */

import { NextResponse, type NextRequest } from "next/server";
import { detectLocale, LOCALES, type Locale } from "@/i18n";

export function middleware(request: NextRequest) {
  const response = NextResponse.next();

  // ─── Locale Detection (cookie > Accept-Language > default) ───
  const cookieLocale = request.cookies.get("atlas_locale")?.value as
    | Locale
    | undefined;
  const locale =
    cookieLocale && LOCALES.includes(cookieLocale)
      ? cookieLocale
      : detectLocale(request.headers.get("accept-language"));

  // Set locale in response headers (available server-side via headers())
  response.headers.set("x-atlas-locale", locale);

  // If no cookie set yet, set default
  if (!cookieLocale) {
    response.cookies.set("atlas_locale", locale, {
      path: "/",
      maxAge: 60 * 60 * 24 * 365, // 1 year
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
