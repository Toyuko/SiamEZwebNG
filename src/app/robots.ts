import type { MetadataRoute } from "next";
import { site } from "@/config/site";

export default function robots(): MetadataRoute.Robots {
  const baseUrl = site.url.replace(/\/$/, "");

  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          "/admin",
          "/admin/",
          "/en/admin",
          "/en/admin/",
          "/th/admin",
          "/th/admin/",
          "/portal",
          "/portal/",
          "/en/portal",
          "/en/portal/",
          "/th/portal",
          "/th/portal/",
          "/api/",
          "/book/",
          "/en/book/",
          "/th/book/",
          "/checkout/",
          "/en/checkout/",
          "/th/checkout/",
        ],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
    host: baseUrl,
  };
}
