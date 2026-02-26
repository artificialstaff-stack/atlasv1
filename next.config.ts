import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // ─── Atlas 2026 Mimari Konfigürasyonu ───

  // Deneysel özellikler
  experimental: {
    // Server Actions boyut limiti (büyük mekansal veri yükleri için)
    serverActions: {
      bodySizeLimit: "10mb",
    },
    // Optimistic rendering
    optimizePackageImports: [
      "lucide-react",
      "date-fns",
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

  // Edge Computing & Header güvenliği
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          {
            key: "X-DNS-Prefetch-Control",
            value: "on",
          },
          {
            key: "X-Content-Type-Options",
            value: "nosniff",
          },
          {
            key: "Referrer-Policy",
            value: "origin-when-cross-origin",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
