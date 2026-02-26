import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const baseUrl =
    process.env.NEXT_PUBLIC_APP_URL ?? "https://atlasplatform.co";

  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/admin/", "/panel/", "/api/", "/login", "/register"],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
