/**
 * Public listing URL contract helpers.
 *
 * Canonical paths use the listing cuid `id`, never `slug`:
 *   /sales/[id]
 *   /real-estate/[id]
 *
 * Locale prefixes are handled by next-intl routing; these helpers return
 * locale-agnostic public path segments matching SalesListingCard /
 * RealEstateListingCard link targets.
 */

export type ListingUrlInput = {
  id: string;
  /** Intentionally unused for public paths — accepted only so callers cannot accidentally pass slug as id. */
  slug?: string;
};

function assertListingId(id: string): string {
  const trimmed = id?.trim();
  if (!trimmed) {
    throw new Error("Listing public URL requires a non-empty cuid id");
  }
  return trimmed;
}

/** Public vehicle detail path: `/sales/${id}` (cuid, never slug). */
export function buildSalesListingPath(listing: ListingUrlInput | string): string {
  const id = assertListingId(typeof listing === "string" ? listing : listing.id);
  return `/sales/${id}`;
}

/** Public property detail path: `/real-estate/${id}` (cuid, never slug). */
export function buildRealEstateListingPath(listing: ListingUrlInput | string): string {
  const id = assertListingId(typeof listing === "string" ? listing : listing.id);
  return `/real-estate/${id}`;
}

/** Locale-prefixed variant when an explicit locale segment is needed outside next-intl Link. */
export function buildLocalizedSalesListingPath(
  locale: string,
  listing: ListingUrlInput | string
): string {
  const localeSeg = locale.trim() || "en";
  return `/${localeSeg}${buildSalesListingPath(listing)}`;
}

export function buildLocalizedRealEstateListingPath(
  locale: string,
  listing: ListingUrlInput | string
): string {
  const localeSeg = locale.trim() || "en";
  return `/${localeSeg}${buildRealEstateListingPath(listing)}`;
}
