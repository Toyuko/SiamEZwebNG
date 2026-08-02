/**
 * URL contracts for recommendation deep links.
 * Listings → cuid paths via Migration Engine helpers. Services → slug paths.
 */

import {
  buildRealEstateListingPath,
  buildSalesListingPath,
} from "@/lib/migration/urls";
import { buildServiceBookPath, buildServiceSearchPath } from "@/lib/search/urls";
import type { RecommendationListingType } from "./types";

/** Vehicle `/sales/{cuid}` or property `/real-estate/{cuid}`. */
export function buildListingRecommendationPath(
  listingType: RecommendationListingType,
  listingId: string
): string {
  if (listingType === "vehicle") {
    return buildSalesListingPath(listingId);
  }
  return buildRealEstateListingPath(listingId);
}

export function buildServiceRecommendationPath(
  slug: string,
  options?: { preferBook?: boolean }
): string {
  return options?.preferBook
    ? buildServiceBookPath(slug)
    : buildServiceSearchPath(slug);
}

/** Customer life-event / goals hub (M4). */
export function buildLifeEventRecommendationPath(lifeEventKey?: string): string {
  if (lifeEventKey?.trim()) {
    return `/portal/goals?event=${encodeURIComponent(lifeEventKey.trim())}`;
  }
  return "/portal/goals";
}

/** Assert listing href uses cuid segment, never a human slug shape alone. */
export function isCuidListingHref(href: string): boolean {
  const path = href.split("?")[0] ?? "";
  const match = path.match(/^\/(sales|real-estate)\/([^/]+)$/);
  if (!match) return false;
  const id = match[2] ?? "";
  // cuid-ish: starts with 'c', alphanumeric, length ≥ 20 (Prisma default cuid)
  return /^c[a-z0-9]{20,}$/i.test(id);
}
