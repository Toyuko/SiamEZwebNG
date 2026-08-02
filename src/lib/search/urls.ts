/**
 * Public deep-link builders for unified search hits.
 * Listing URLs reuse Migration Engine cuid contracts — never slug.
 */

import {
  buildRealEstateListingPath,
  buildSalesListingPath,
} from "@/lib/migration/urls";

/** Service directory detail: `/services/{slug}`. */
export function buildServiceSearchPath(slug: string): string {
  const trimmed = slug?.trim();
  if (!trimmed) {
    throw new Error("Service search URL requires a non-empty slug");
  }
  return `/services/${trimmed}`;
}

/** Booking wizard handoff: `/book/{slug}`. */
export function buildServiceBookPath(slug: string): string {
  const trimmed = slug?.trim();
  if (!trimmed) {
    throw new Error("Service book URL requires a non-empty slug");
  }
  return `/book/${trimmed}`;
}

/** Vehicle listing: `/sales/{cuid}`. */
export function buildVehicleSearchPath(listingId: string): string {
  return buildSalesListingPath(listingId);
}

/** Property listing: `/real-estate/{cuid}`. */
export function buildPropertySearchPath(listingId: string): string {
  return buildRealEstateListingPath(listingId);
}

export function buildLocalizedServiceSearchPath(locale: string, slug: string): string {
  const localeSeg = locale.trim() || "en";
  return `/${localeSeg}${buildServiceSearchPath(slug)}`;
}

export function buildLocalizedVehicleSearchPath(locale: string, listingId: string): string {
  const localeSeg = locale.trim() || "en";
  return `/${localeSeg}${buildVehicleSearchPath(listingId)}`;
}

export function buildLocalizedPropertySearchPath(locale: string, listingId: string): string {
  const localeSeg = locale.trim() || "en";
  return `/${localeSeg}${buildPropertySearchPath(listingId)}`;
}

/** Life event journey anchor on goals hub: `/portal/goals#life-event-{key}`. */
export function buildLifeEventSearchPath(key: string): string {
  const trimmed = key?.trim();
  if (!trimmed) {
    throw new Error("Life event search URL requires a non-empty key");
  }
  return `/portal/goals#life-event-${trimmed}`;
}

/** Customer goals hub. */
export function buildGoalSearchPath(): string {
  return "/portal/goals";
}

/** Single booking/case detail. */
export function buildBookingSearchPath(caseId: string): string {
  const trimmed = caseId?.trim();
  if (!trimmed) {
    throw new Error("Booking search URL requires a non-empty case id");
  }
  return `/portal/cases/${trimmed}`;
}

/** Bookings hub fallback. */
export function buildBookingsHubPath(): string {
  return "/portal/cases";
}
