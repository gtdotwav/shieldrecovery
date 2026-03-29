import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://pagrecovery.com";

  return {
    rules: [
      { userAgent: "*", allow: "/", disallow: ["/api/", "/admin", "/dashboard", "/leads", "/inbox", "/ai", "/connect", "/onboarding", "/calling", "/calendar", "/test", "/invite/"] },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
