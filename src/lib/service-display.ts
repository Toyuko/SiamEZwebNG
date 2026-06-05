import type { ServiceCatalogEntry } from "@/config/service-catalog";
import { getServiceCatalogEntry } from "@/config/service-catalog";
import type { PublicServiceListItem } from "@/data-access/service";
import { serviceThumbnailObjectPosition, type ServiceSlug } from "@/config/services";

export type EnrichedService = PublicServiceListItem & {
  thumbnailImage: string | null;
  category: string;
  categoryKey: string;
  keywords: string[];
  badges: string[];
  processingTime: string;
  requirementsSummary: string;
  processingTimeDays: number | null;
  featured: boolean;
  popular: boolean;
  isNew: boolean;
  /** Lucide icon name (serializable for server → client props). */
  iconName: string;
  iconBg: string;
  iconText: string;
  iconShape: "circle" | "square";
  sortOrder: number;
};

export type ServiceSortKey = "popular" | "fastest" | "priceLowToHigh" | "newServices";

export function resolveLocalizedText(
  text: { en: string; th: string } | undefined,
  locale: string,
  fallback = ""
): string {
  if (!text) return fallback;
  return locale === "th" ? text.th : text.en;
}

/** Merge DB/config list row with catalog metadata for directory display. */
export function enrichServiceForDisplay(
  service: PublicServiceListItem,
  locale: string
): EnrichedService {
  const catalog = getServiceCatalogEntry(service.slug);
  const catalogName = resolveLocalizedText(catalog?.name, locale);
  const catalogDesc = resolveLocalizedText(catalog?.shortDescription, locale);
  const name =
    locale === "th"
      ? catalogName || service.name || service.slug
      : service.name || catalogName || service.slug;
  const shortDescription =
    locale === "th"
      ? catalogDesc || service.shortDescription
      : service.shortDescription ?? catalogDesc ?? null;

  const thumbnailImage =
    catalog?.thumbnailImage ?? null;

  return {
    ...service,
    name,
    shortDescription,
    thumbnailImage,
    category: catalog?.category ?? "businessServices",
    categoryKey: catalog?.category ?? "businessServices",
    keywords: catalog?.keywords ?? [],
    badges: catalog?.badges ?? [],
    processingTime: resolveLocalizedText(catalog?.processingTime, locale, ""),
    requirementsSummary: resolveLocalizedText(catalog?.requirementsSummary, locale, ""),
    processingTimeDays: catalog?.processingTimeDays ?? null,
    featured: catalog?.featured ?? false,
    popular: catalog?.popular ?? false,
    isNew: catalog?.isNew ?? false,
    iconName: catalog?.icon ?? "FileText",
    iconBg: catalog?.iconStyle.bg ?? "bg-amber-100 dark:bg-amber-900/30",
    iconText: catalog?.iconStyle.text ?? "text-amber-600 dark:text-amber-400",
    iconShape: catalog?.iconStyle.shape ?? "square",
    sortOrder: catalog?.sortOrder ?? 999,
  };
}

export function enrichServicesList(
  services: PublicServiceListItem[],
  locale: string
): EnrichedService[] {
  return services.map((s) => enrichServiceForDisplay(s, locale));
}

export function sortServices(
  services: EnrichedService[],
  sortKey: ServiceSortKey
): EnrichedService[] {
  const list = [...services];
  switch (sortKey) {
    case "popular":
      return list.sort((a, b) => {
        if (a.popular !== b.popular) return a.popular ? -1 : 1;
        return a.sortOrder - b.sortOrder;
      });
    case "fastest":
      return list.sort((a, b) => {
        const ad = a.processingTimeDays ?? 999;
        const bd = b.processingTimeDays ?? 999;
        if (ad !== bd) return ad - bd;
        return a.sortOrder - b.sortOrder;
      });
    case "priceLowToHigh":
      return list.sort((a, b) => {
        const ap = a.priceAmount ?? Number.MAX_SAFE_INTEGER;
        const bp = b.priceAmount ?? Number.MAX_SAFE_INTEGER;
        if (ap !== bp) return ap - bp;
        return a.sortOrder - b.sortOrder;
      });
    case "newServices":
      return list.sort((a, b) => {
        if (a.isNew !== b.isNew) return a.isNew ? -1 : 1;
        return b.sortOrder - a.sortOrder;
      });
    default:
      return list;
  }
}

export function filterByCategory(
  services: EnrichedService[],
  categoryKey: string | null
): EnrichedService[] {
  if (!categoryKey || categoryKey === "all") return services;
  return services.filter((s) => s.categoryKey === categoryKey);
}

export function serviceCardThumbnailObjectPosition(slug: string): string | undefined {
  return serviceThumbnailObjectPosition[slug as ServiceSlug];
}

export type { ServiceCatalogEntry };
