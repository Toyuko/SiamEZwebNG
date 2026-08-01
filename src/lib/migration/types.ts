/**
 * Platform 2.0 Migration Engine types (Wave M0–M1).
 * Snapshots are read-only inventories — never mutate listing source fields.
 * Enhancements write only to ListingEnhancement side rows.
 */

export type ListingDivision = "sales" | "real-estate";

/** Matches Prisma `ListingEnhancementType`. */
export type ListingEnhancementType = "vehicle" | "property";

export type EnhancementPayload = {
  listingType: ListingEnhancementType;
  listingId: string;
  aiSummary: string;
  seoTitle: string;
  seoDescription: string;
  keywords: string[];
  schemaJsonLd: Record<string, unknown>;
  enhancedAt: Date;
};

export type EnhanceListingsCounts = {
  vehicles: number;
  properties: number;
  total: number;
};

export type EnhanceListingsDryRunResult = {
  mode: "dry-run";
  payloads: EnhancementPayload[];
  counts: EnhanceListingsCounts;
  usedOpenAI: boolean;
  notes: string[];
};

export type ApplyEnhancementsResult = {
  mode: "apply";
  payloads: EnhancementPayload[];
  counts: EnhanceListingsCounts;
  upserted: number;
  usedOpenAI: boolean;
  notes: string[];
};

/** Point-in-time inventory row for a published (or analyzed) listing. */
export type ListingSnapshot = {
  id: string;
  /** Present for reference only — public URLs must use `id`, never slug. */
  slug: string;
  division: ListingDivision;
  title: string;
  status: string;
  published: boolean;
  priceAmount: number;
  priceCurrency: string;
  heroImageUrl: string;
  imageCount: number;
  videoCount: number;
  sellerKind: string;
  isBoosted: boolean;
  createdAt: Date;
  updatedAt: Date;
  /** Division-specific labels for the inventory report (make/model, property type, etc.). */
  summary: string;
};

export type MigrationReportMode = "dry-run";

export type MigrationReportCounts = {
  vehicles: number;
  properties: number;
  total: number;
  withMedia: number;
  boosted: number;
};

export type MigrationReport = {
  generatedAt: Date;
  mode: MigrationReportMode;
  /** Absolute or repo-relative path when the report was written to disk. */
  outputPath: string | null;
  counts: MigrationReportCounts;
  listings: ListingSnapshot[];
  notes: string[];
};

export type AnalyzePublishedListingsResult = {
  vehicles: ListingSnapshot[];
  properties: ListingSnapshot[];
  all: ListingSnapshot[];
};
