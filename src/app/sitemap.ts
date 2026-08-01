import type { MetadataRoute } from "next";
import { site } from "@/config/site";
import { serviceSlugs } from "@/config/services";
import { routing } from "@/i18n/routing";

const STATIC_PATHS = [
  "",
  "/services",
  "/about",
  "/contact",
  "/gallery",
  "/testimonials",
  "/freelancers",
  "/sales",
  "/real-estate",
  "/partner",
  "/terms",
  "/privacy",
  "/refund",
] as const;

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = site.url.replace(/\/$/, "");
  const lastModified = new Date();
  const entries: MetadataRoute.Sitemap = [];

  for (const locale of routing.locales) {
    for (const path of STATIC_PATHS) {
      entries.push({
        url: `${baseUrl}/${locale}${path}`,
        lastModified,
        changeFrequency: path === "" || path === "/services" ? "weekly" : "monthly",
        priority: path === "" ? 1 : path === "/services" ? 0.9 : 0.6,
      });
    }

    for (const slug of serviceSlugs) {
      entries.push({
        url: `${baseUrl}/${locale}/services/${slug}`,
        lastModified,
        changeFrequency: "monthly",
        priority: 0.7,
      });
    }
  }

  return entries;
}
