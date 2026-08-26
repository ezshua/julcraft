import type { MetadataRoute } from "next";
import { siteUrl } from "@/lib/site-url";

// /admin, /api, /order-success — закрыты от индексации
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/admin", "/api", "/order-success"],
    },
    sitemap: `${siteUrl()}/sitemap.xml`,
  };
}
