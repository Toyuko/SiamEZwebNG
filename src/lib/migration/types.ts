/**
 * Platform 2.0 Migration Engine types (Wave M0).
 * Snapshots are read-only inventories — never mutate listing source fields.
 */

export type ListingDivision = "sales" | "real-estate";

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
