import type { NextConfig } from "next";

// ─── Atlas 2026 — Production-grade Security Headers ───
const securityHeaders = [
  { key: "X-DNS-Prefetch-Control", value: "on" },
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-XSS-Protection", value: "1; mode=block" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(self), interest-cohort=()",
  },
  {
    key: "Content-Security-Policy",
    value: [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: blob: https:",
      "font-src 'self' data:",
      `connect-src 'self' ${process.env.NEXT_PUBLIC_SUPABASE_URL ?? "https://*.supabase.co"} https://*.supabase.co wss://*.supabase.co https://api.openai.com`,
      "frame-ancestors 'none'",
      "base-uri 'self'",
      "form-action 'self'",
    ].join("; "),
  },
];

const nextConfig: NextConfig = {
  // ─── Atlas 2026 Mimari Konfigürasyonu ───
  reactStrictMode: true,

  // React Compiler (Next.js 16 — top-level)
  reactCompiler: true,

  // Deneysel özellikler
  experimental: {
    // Server Actions boyut limiti (büyük mekansal veri yükleri için)
    serverActions: {
      bodySizeLimit: "10mb",
    },
    // Tree-shake barrel imports
    optimizePackageImports: [
      "lucide-react",
      "date-fns",
      "framer-motion",
      "@tanstack/react-query",
      "recharts",
    ],
  },

  // Görüntü optimizasyonu
  images: {
    formats: ["image/avif", "image/webp"],
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**.supabase.co",
      },
    ],
  },

  // Production Security Headers (HSTS, CSP, X-Frame, Permissions-Policy)
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: securityHeaders,
      },
    ];
  },
};

export default nextConfig;
