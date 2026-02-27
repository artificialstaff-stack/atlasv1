import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { rateLimit, RATE_LIMITS } from "@/lib/rate-limit";
import { getRequestId, REQUEST_ID_HEADER } from "@/lib/correlation";

/**
 * ATLAS Proxy — Edge kontrol noktası (Next.js 16 proxy convention)
 *
 * middleware.ts → proxy.ts migration.
 * 1. Request correlation ID
 * 2. Rate limiting (API rotaları)
 * 3. Statik varlık bypass
 * 4. Auth rota redirect
 * 5. Admin RBAC
 * 6. Client oturum kontrolü
 * 7. i18n locale detection (TR/EN)
 */
export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // ─── CORRELATION ID ───
  const requestId = getRequestId(request);

  // ─── RATE LIMITING (API rotaları) ───
  if (pathname.startsWith("/api/")) {
    const ip =
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
      request.headers.get("x-real-ip") ??
      "anonymous";

    const limiterKey = `${ip}:${pathname}`;
    const config = pathname.startsWith("/api/mcp")
      ? RATE_LIMITS.mcp
      : pathname.startsWith("/api/webhooks")
        ? RATE_LIMITS.webhook
        : RATE_LIMITS.api;

    const { success, remaining, resetAt } = rateLimit(limiterKey, config);

    if (!success) {
      return NextResponse.json(
        {
          error: "Too Many Requests",
          retryAfter: Math.ceil((resetAt - Date.now()) / 1000),
        },
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
    response.headers.set(REQUEST_ID_HEADER, requestId);

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
          cookiesToSet.forEach(({ name, value }) =>
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

  // ─── AUTH ROTALARI (/login, /register) ───
  if (pathname.startsWith("/login") || pathname.startsWith("/register")) {
    if (user) {
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
      return NextResponse.redirect(new URL("/panel/dashboard", request.url));
    }

    return supabaseResponse;
  }

  // ─── CLIENT ROTALARI (/panel/*) ───
  if (pathname.startsWith("/panel")) {
    if (!user) {
      return NextResponse.redirect(new URL("/login", request.url));
    }
  }

  // ─── Attach correlation ID to all responses ───
  supabaseResponse.headers.set(REQUEST_ID_HEADER, requestId);

  return supabaseResponse;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
