import { ImageResponse } from "next/og";
import { type NextRequest } from "next/server";

export const runtime = "edge";

/**
 * GET /api/og — Dynamic Open Graph Image
 * Query params: title, subtitle, type
 * Example: /api/og?title=Atlas%20Platform&subtitle=B2B%20SaaS
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);

  const title = searchParams.get("title") ?? "ATLAS Platform";
  const subtitle =
    searchParams.get("subtitle") ??
    "ABD pazarına giriş için uçtan uca e-ticaret altyapısı";
  const type = searchParams.get("type") ?? "default";

  // Gradient renkleri type'a göre değişir
  const gradients: Record<string, [string, string]> = {
    default: ["#6366f1", "#8b5cf6"],
    success: ["#10b981", "#059669"],
    warning: ["#f59e0b", "#d97706"],
    product: ["#3b82f6", "#1d4ed8"],
  };

  const [color1, color2] = gradients[type] ?? gradients.default;

  return new ImageResponse(
    (
      <div
        style={{
          height: "100%",
          width: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: `linear-gradient(135deg, ${color1} 0%, ${color2} 50%, #0f172a 100%)`,
          fontFamily: "sans-serif",
        }}
      >
        {/* Logo / Brand */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            marginBottom: 40,
          }}
        >
          <div
            style={{
              width: 64,
              height: 64,
              borderRadius: 16,
              background: "white",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 32,
              fontWeight: 800,
              color: color1,
              marginRight: 16,
            }}
          >
            A
          </div>
          <span
            style={{
              fontSize: 28,
              fontWeight: 600,
              color: "rgba(255,255,255,0.9)",
              letterSpacing: 2,
            }}
          >
            ATLAS PLATFORM
          </span>
        </div>

        {/* Title */}
        <div
          style={{
            fontSize: 56,
            fontWeight: 800,
            color: "white",
            textAlign: "center",
            maxWidth: 900,
            lineHeight: 1.2,
            marginBottom: 20,
          }}
        >
          {title}
        </div>

        {/* Subtitle */}
        <div
          style={{
            fontSize: 24,
            color: "rgba(255,255,255,0.8)",
            textAlign: "center",
            maxWidth: 700,
          }}
        >
          {subtitle}
        </div>

        {/* Bottom bar */}
        <div
          style={{
            position: "absolute",
            bottom: 40,
            display: "flex",
            alignItems: "center",
            gap: 20,
            fontSize: 16,
            color: "rgba(255,255,255,0.6)",
          }}
        >
          <span>atlasplatform.co</span>
          <span>•</span>
          <span>B2B E-Commerce Infrastructure</span>
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
    }
  );
}
