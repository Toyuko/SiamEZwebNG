import type { MetadataRoute } from "next";
import { site } from "@/config/site";

const PRIVATE_PATHS = [
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
  "/booking/",
  "/en/booking/",
  "/th/booking/",
  "/checkout/",
  "/en/checkout/",
  "/th/checkout/",
  "/login",
  "/en/login",
  "/th/login",
  "/register",
  "/en/register",
  "/th/register",
  "/forgot-password",
  "/en/forgot-password",
  "/th/forgot-password",
  "/reset-password",
  "/en/reset-password",
  "/th/reset-password",
] as const;

export default function robots(): MetadataRoute.Robots {
  const baseUrl = site.url.replace(/\/$/, "");
  const noindexAll = process.env.NEXT_PUBLIC_NOINDEX === "true";

  if (noindexAll) {
    return {
      rules: [{ userAgent: "*", disallow: "/" }],
      sitemap: `${baseUrl}/sitemap.xml`,
      host: baseUrl,
    };
  }

  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [...PRIVATE_PATHS],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
    host: baseUrl,
  };
}
