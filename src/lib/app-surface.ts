export type AppSurface = "admin" | "portal" | "public";

const ADMIN_LOCAL_HOST = "admin.atlas.localhost";
const PORTAL_LOCAL_HOST = "portal.atlas.localhost";
const DEFAULT_LOCAL_PORT = "3000";

function normalizeHostname(host: string | null | undefined) {
  return (host ?? "")
    .trim()
    .toLowerCase()
    .replace(/:\d+$/, "");
}

function isLocalHostname(hostname: string) {
  return hostname === "localhost"
    || hostname === "127.0.0.1"
    || hostname.endsWith(".localhost");
}

function getRuntimeLocalPort() {
  const candidate = process.env.PORT?.trim() || process.env.APP_PORT?.trim();
  return candidate && /^\d+$/.test(candidate) ? candidate : DEFAULT_LOCAL_PORT;
}

function coerceOrigin(value: string | null | undefined) {
  const trimmed = value?.trim();
  if (!trimmed) return null;

  try {
    return new URL(trimmed).origin;
  } catch {
    return null;
  }
}

export function detectSurfaceFromHost(host: string | null | undefined): AppSurface {
  const hostname = normalizeHostname(host);

  if (hostname.startsWith("admin.")) {
    return "admin";
  }

  if (hostname.startsWith("portal.")) {
    return "portal";
  }

  return "public";
}

export function detectSurfaceFromPath(pathname: string): AppSurface {
  if (pathname === "/admin" || pathname.startsWith("/admin/")) {
    return "admin";
  }

  if (
    pathname === "/panel"
    || pathname.startsWith("/panel/")
    || pathname === "/login"
    || pathname === "/register"
    || pathname === "/forgot-password"
  ) {
    return "portal";
  }

  return "public";
}

export function getSurfaceHomePath(surface: Exclude<AppSurface, "public">) {
  return surface === "admin" ? "/admin/dashboard" : "/panel/dashboard";
}

export function getSurfaceHostname(currentHost: string | null | undefined, targetSurface: Exclude<AppSurface, "public">) {
  const hostname = normalizeHostname(currentHost);

  if (!hostname || isLocalHostname(hostname)) {
    return targetSurface === "admin" ? ADMIN_LOCAL_HOST : PORTAL_LOCAL_HOST;
  }

  const parts = hostname.split(".");
  if (parts[0] === "admin" || parts[0] === "portal") {
    parts[0] = targetSurface;
    return parts.join(".");
  }

  return `${targetSurface}.${hostname}`;
}

export function getAppBaseUrl() {
  return (
    coerceOrigin(process.env.ATLAS_BASE_URL)
    ?? coerceOrigin(process.env.NEXT_PUBLIC_APP_URL)
    ?? `http://localhost:${getRuntimeLocalPort()}`
  );
}

export function getSurfaceBaseUrl(surface: AppSurface) {
  const explicitBase =
    surface === "admin"
      ? coerceOrigin(process.env.ATLAS_ADMIN_BASE_URL)
      : surface === "portal"
        ? coerceOrigin(process.env.ATLAS_PORTAL_BASE_URL)
        : coerceOrigin(process.env.ATLAS_BASE_URL);

  if (explicitBase) {
    return explicitBase;
  }

  if (surface === "public") {
    return getAppBaseUrl();
  }

  const baseUrl = new URL(getAppBaseUrl());
  baseUrl.hostname = getSurfaceHostname(baseUrl.host, surface);
  return baseUrl.origin;
}

export function buildSurfaceUrl(surface: AppSurface, pathname: string) {
  const base = `${getSurfaceBaseUrl(surface).replace(/\/$/, "")}/`;
  return new URL(pathname, base).toString();
}

export function resolveSurfaceRedirect(input: {
  url: URL;
  hostHeader?: string | null;
}) {
  const requestUrl = new URL(input.url.toString());
  const hostHeader = input.hostHeader ?? requestUrl.host;
  const normalizedHost = normalizeHostname(hostHeader);
  const hostSurface = detectSurfaceFromHost(hostHeader);
  const pathSurface = detectSurfaceFromPath(requestUrl.pathname);

  if (hostSurface === "public") {
    if (isLocalHostname(normalizedHost)) {
      return null;
    }

    if (pathSurface === "admin" || pathSurface === "portal") {
      requestUrl.hostname = getSurfaceHostname(hostHeader, pathSurface);
      return requestUrl;
    }

    return null;
  }

  if (hostSurface === "admin") {
    if (pathSurface === "portal") {
      requestUrl.hostname = getSurfaceHostname(hostHeader, "portal");
      return requestUrl;
    }

    if (pathSurface === "public") {
      requestUrl.hostname = getSurfaceHostname(hostHeader, "admin");
      requestUrl.pathname = getSurfaceHomePath("admin");
      requestUrl.search = "";
      return requestUrl;
    }
  }

  if (hostSurface === "portal") {
    if (pathSurface === "admin") {
      requestUrl.hostname = getSurfaceHostname(hostHeader, "admin");
      return requestUrl;
    }

    if (pathSurface === "public") {
      requestUrl.hostname = getSurfaceHostname(hostHeader, "portal");
      requestUrl.pathname = getSurfaceHomePath("portal");
      requestUrl.search = "";
      return requestUrl;
    }
  }

  return null;
}
