import type { MetadataRoute } from "next";
import { site } from "@/config/site";
import { serviceSlugs } from "@/config/services";
import { routing } from "@/i18n/routing";
import { analyzePublishedListings } from "@/lib/migration/analyze";
import {
  buildLocalizedRealEstateListingPath,
  buildLocalizedSalesListingPath,
  buildRealEstateListingPath,
  buildSalesListingPath,
} from "@/lib/migration/urls";
import { languageAlternates, localizedPath } from "@/lib/seo/urls";

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

function sitemapEntry(
  locale: string,
  path: string,
  options: Pick<MetadataRoute.Sitemap[number], "changeFrequency" | "priority" | "lastModified">
): MetadataRoute.Sitemap[number] {
  const origin = site.url.replace(/\/$/, "");
  return {
    url: `${origin}${localizedPath(locale, path)}`,
    alternates: { languages: languageAlternates(path) },
    ...options,
  };
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const lastModified = new Date();
  const entries: MetadataRoute.Sitemap = [];

  for (const locale of routing.locales) {
    for (const path of STATIC_PATHS) {
      entries.push(
        sitemapEntry(locale, path, {
          lastModified,
          changeFrequency: path === "" || path === "/services" ? "weekly" : "monthly",
          priority: path === "" ? 1 : path === "/services" ? 0.9 : 0.6,
        })
      );
    }

    for (const slug of serviceSlugs) {
      entries.push(
        sitemapEntry(locale, `/services/${slug}`, {
          lastModified,
          changeFrequency: "monthly",
          priority: 0.8,
        })
      );
    }
  }

  try {
    const { vehicles, properties } = await analyzePublishedListings();

    for (const locale of routing.locales) {
      for (const vehicle of vehicles) {
        entries.push({
          url: `${site.url.replace(/\/$/, "")}${buildLocalizedSalesListingPath(locale, vehicle)}`,
          lastModified: vehicle.updatedAt ?? lastModified,
          changeFrequency: "weekly",
          priority: 0.65,
          alternates: { languages: languageAlternates(buildSalesListingPath(vehicle)) },
        });
      }

      for (const property of properties) {
        entries.push({
          url: `${site.url.replace(/\/$/, "")}${buildLocalizedRealEstateListingPath(locale, property)}`,
          lastModified: property.updatedAt ?? lastModified,
          changeFrequency: "weekly",
          priority: 0.65,
          alternates: { languages: languageAlternates(buildRealEstateListingPath(property)) },
        });
      }
    }
  } catch (error) {
    console.warn("sitemap: published listing URLs skipped:", error);
  }

  return entries;
}
