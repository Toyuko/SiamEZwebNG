/**
 * Shared cache tags / TTLs for public marketing reads.
 * Keep TTLs short enough that admin edits feel fresh; long enough to cut Neon round-trips
 * on every soft navigation through the public layout + homepage.
 */
export const PUBLIC_CACHE_TAGS = {
  services: "public-services",
  lifeEvents: "public-life-events",
  featuredSales: "public-featured-sales",
  featuredRealEstate: "public-featured-real-estate",
  conciergeSettings: "public-concierge-settings",
} as const;

/** Default ISR-style revalidation for catalog data (seconds). */
export const PUBLIC_CATALOG_REVALIDATE_SECONDS = 60;

/** Settings / flags that change rarely. */
export const PUBLIC_SETTINGS_REVALIDATE_SECONDS = 120;
