import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { rateLimit, RATE_LIMITS } from "@/lib/rate-limit";

/**
 * ATLAS Middleware — Edge kontrol noktası
 *
 * 1. Rate limiting (API rotaları)
 * 2. Statik varlık bypass
 * 3. Auth rota redirect
 * 4. Admin RBAC
 * 5. Client oturum kontrolü
 */
export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // ─── RATE LIMITING (API rotaları) ───
  if (pathname.startsWith("/api/")) {
    const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
      ?? request.headers.get("x-real-ip")
      ?? "anonymous";

    const limiterKey = `${ip}:${pathname}`;
    const config = pathname.startsWith("/api/mcp")
      ? RATE_LIMITS.mcp
      : pathname.startsWith("/api/webhooks")
        ? RATE_LIMITS.webhook
        : RATE_LIMITS.api;

    const { success, remaining, resetAt } = rateLimit(limiterKey, config);

    if (!success) {
      return NextResponse.json(
        { error: "Too Many Requests", retryAfter: Math.ceil((resetAt - Date.now()) / 1000) },
        {
          status: 429,
          headers: {
            "Retry-After": String(Math.ceil((resetAt - Date.now()) / 1000)),
            "X-RateLimit-Limit": String(config.limit),
            "X-RateLimit-Remaining": "0",
          },
        }
      );
    }

    // Attach rate limit headers to response later
    const response = NextResponse.next({ request });
    response.headers.set("X-RateLimit-Limit", String(config.limit));
    response.headers.set("X-RateLimit-Remaining", String(remaining));

    // API health endpoint — no auth needed
    if (pathname === "/api/health") return response;
  }

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

  // pathname already extracted above (rate-limiting block)

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
