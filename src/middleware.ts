import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

/**
 * ATLAS Middleware — Tüm gelen istekleri filtreleyen Edge kontrol noktası
 *
 * Algoritma:
 * 1. Statik varlık? → Şartsız izin
 * 2. Marketing rota? → Şartsız izin
 * 3. Auth rota? → Giriş yapmışsa redirect
 * 4. Admin rota? → JWT + role kontrolü
 * 5. Client rota? → Oturum kontrolü
 */
export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // Oturumu yenile (CSRF koruması + token refresh)
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;

  // ─── AUTH ROTALARI (/login, /register) ───
  // Giriş yapmış kullanıcıları yönlendir
  if (pathname.startsWith("/login") || pathname.startsWith("/register")) {
    if (user) {
      // Role göre yönlendir
      const userRole =
        (user.app_metadata?.user_role as string) ?? "customer";
      const redirectUrl =
        userRole === "admin" || userRole === "super_admin"
          ? "/admin/dashboard"
          : "/panel/dashboard";
      return NextResponse.redirect(new URL(redirectUrl, request.url));
    }
    return supabaseResponse;
  }

  // ─── ADMIN ROTALARI (/admin/*) ───
  if (pathname.startsWith("/admin")) {
    if (!user) {
      return NextResponse.redirect(new URL("/login", request.url));
    }

    const userRole = (user.app_metadata?.user_role as string) ?? "customer";
    if (
      userRole !== "admin" &&
      userRole !== "super_admin" &&
      userRole !== "moderator" &&
      userRole !== "viewer"
    ) {
      // 403 — Yetkisiz (müşteri admin'e giremez)
      return NextResponse.redirect(new URL("/panel/dashboard", request.url));
    }

    return supabaseResponse;
  }

  // ─── CLIENT ROTALARI (/panel/*) ───
  if (pathname.startsWith("/panel")) {
    if (!user) {
      return NextResponse.redirect(new URL("/login", request.url));
    }
    return supabaseResponse;
  }

  // Diğer tüm rotalar (marketing, API, vb.) → şartsız izin
  return supabaseResponse;
}

export const config = {
  matcher: [
    /*
     * Tüm istekleri eşle:
     * - _next/static (statik dosyalar) HARİÇ
     * - _next/image (görsel optimizasyonu) HARİÇ
     * - favicon.ico HARİÇ
     * - Statik dosyalar (.svg, .png, .jpg, .ico, .webp) HARİÇ
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
