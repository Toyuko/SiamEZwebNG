/**
 * Load published services + marketplace listings into a search index.
 * Read-only data-access — never mutates listing rows.
 */

import { getServiceSearchMeta } from "@/config/service-search";
import { getPublicServicesList } from "@/data-access/service";
import {
  PUBLIC_REAL_ESTATE_INVENTORY_STATUSES,
} from "@/data-access/real-estate";
import { PUBLIC_SALES_INVENTORY_STATUSES } from "@/data-access/sales";
import { prisma } from "@/lib/db";
import { buildSearchDocuments } from "@/lib/search/documents";
import type { SearchDocument } from "@/lib/search/types";

export type LoadSearchDocumentsOptions = {
  locale?: "en" | "th";
  includeHelp?: boolean;
  /** Cap marketplace rows pulled into the index (default 200 each). */
  listingLimit?: number;
};

/**
 * Build the unified search document index from live published data.
 * Failures degrade to services (+ help) only — never throw to callers.
 */
export async function loadSearchDocuments(
  options: LoadSearchDocumentsOptions = {}
): Promise<SearchDocument[]> {
  const locale = options.locale ?? "en";
  const includeHelp = options.includeHelp !== false;
  const listingLimit = options.listingLimit ?? 200;

  const [services, vehicles, properties] = await Promise.all([
    getPublicServicesList(true).catch(() => []),
    prisma.salesVehicle
      .findMany({
        where: {
          published: true,
          status: { in: PUBLIC_SALES_INVENTORY_STATUSES },
        },
        select: {
          id: true,
          title: true,
          make: true,
          model: true,
          year: true,
          category: true,
          priceAmount: true,
          priceCurrency: true,
        },
        orderBy: [{ isBoosted: "desc" }, { createdAt: "desc" }],
        take: listingLimit,
      })
      .catch((error) => {
        console.warn("unified search: vehicles unavailable:", error);
        return [];
      }),
    prisma.salesProperty
      .findMany({
        where: {
          published: true,
          status: { in: PUBLIC_REAL_ESTATE_INVENTORY_STATUSES },
        },
        select: {
          id: true,
          title: true,
          propertyType: true,
          listingType: true,
          province: true,
          district: true,
          neighborhood: true,
          priceAmount: true,
          priceCurrency: true,
        },
        orderBy: [{ isBoosted: "desc" }, { createdAt: "desc" }],
        take: listingLimit,
      })
      .catch((error) => {
        console.warn("unified search: properties unavailable:", error);
        return [];
      }),
  ]);

  const serviceSources = services.map((s) => ({
    slug: s.slug,
    name: s.name,
    shortDescription: s.shortDescription,
    description: s.description,
    keywords: getServiceSearchMeta(s.slug).keywords,
  }));

  return buildSearchDocuments({
    services: serviceSources,
    vehicles,
    properties,
    includeHelp,
    locale,
  });
}
