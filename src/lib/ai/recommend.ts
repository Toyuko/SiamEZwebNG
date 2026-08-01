import Fuse from "fuse.js";
import {
  getActiveCatalogEntries,
  popularServiceSlugs,
  type ServiceCatalogEntry,
} from "@/config/service-catalog";
import type {
  ConciergeLocale,
  ConciergeServiceRecommendation,
} from "@/lib/ai/types";

export type SearchableCatalogService = {
  slug: string;
  name: string;
  shortDescription: string;
  keywords: string[];
  searchText: string;
  popular: boolean;
  featured: boolean;
};

export function catalogEntryToSearchable(
  entry: ServiceCatalogEntry,
  locale: ConciergeLocale
): SearchableCatalogService {
  const name = entry.name[locale] || entry.name.en;
  const shortDescription = entry.shortDescription[locale] || entry.shortDescription.en;
  return {
    slug: entry.slug,
    name,
    shortDescription,
    keywords: entry.keywords,
    searchText: [name, entry.slug, shortDescription, ...entry.keywords].join(" "),
    popular: entry.popular,
    featured: entry.featured,
  };
}

export function getSearchableCatalog(locale: ConciergeLocale): SearchableCatalogService[] {
  return getActiveCatalogEntries().map((e) => catalogEntryToSearchable(e, locale));
}

const FUSE_OPTIONS = {
  keys: [
    { name: "name", weight: 0.4 },
    { name: "shortDescription", weight: 0.25 },
    { name: "keywords", weight: 0.3 },
    { name: "searchText", weight: 0.1 },
  ],
  threshold: 0.4,
  ignoreLocation: true,
  minMatchCharLength: 2,
  includeScore: true,
};

export function searchCatalogServices(
  query: string,
  locale: ConciergeLocale,
  limit = 5
): ConciergeServiceRecommendation[] {
  const catalog = getSearchableCatalog(locale);
  const trimmed = query.trim();
  if (!trimmed) {
    return getPopularRecommendations(locale, limit);
  }

  const fuse = new Fuse(catalog, FUSE_OPTIONS);
  return fuse
    .search(trimmed)
    .slice(0, limit)
    .map((r) => ({
      slug: r.item.slug,
      name: r.item.name,
      shortDescription: r.item.shortDescription,
      score: r.score,
    }));
}

export function getPopularRecommendations(
  locale: ConciergeLocale,
  limit = 4
): ConciergeServiceRecommendation[] {
  const catalog = getSearchableCatalog(locale);
  const bySlug = new Map(catalog.map((s) => [s.slug, s]));
  const featured = popularServiceSlugs
    .map((slug) => bySlug.get(slug))
    .filter((s): s is SearchableCatalogService => Boolean(s));

  const fallback = catalog.filter((s) => s.popular || s.featured);
  const ordered = featured.length > 0 ? featured : fallback;

  return ordered.slice(0, limit).map((s) => ({
    slug: s.slug,
    name: s.name,
    shortDescription: s.shortDescription,
  }));
}

export function getServiceBySlug(
  slug: string,
  locale: ConciergeLocale
): ConciergeServiceRecommendation | null {
  const entry = getActiveCatalogEntries().find((e) => e.slug === slug);
  if (!entry) return null;
  const s = catalogEntryToSearchable(entry, locale);
  return {
    slug: s.slug,
    name: s.name,
    shortDescription: s.shortDescription,
  };
}
