export { analyzePublishedListings, type AnalyzePublishedListingsOptions, type MigrationPrismaClient } from "@/lib/migration/analyze";
export {
  buildMigrationReport,
  formatMigrationReportMarkdown,
  writeInventoryReportDryRun,
  DEFAULT_MIGRATIONS_DIR,
  type WriteInventoryReportOptions,
} from "@/lib/migration/report";
export {
  buildSalesListingPath,
  buildRealEstateListingPath,
  buildLocalizedSalesListingPath,
  buildLocalizedRealEstateListingPath,
  type ListingUrlInput,
} from "@/lib/migration/urls";
export {
  enhanceListingDryRun,
  applyEnhancements,
  buildDeterministicVehicleEnhancement,
  buildDeterministicPropertyEnhancement,
  getListingEnhancement,
  type EnhanceListingsOptions,
  type EnhancePrismaClient,
} from "@/lib/migration/enhance";
export {
  resolveListingMetadata,
  sliceDescriptionForMeta,
  type ListingMetadataSource,
  type ListingEnhancementMeta,
  type ResolvedListingMetadata,
} from "@/lib/migration/metadata";
export {
  buildVehicleJsonLd,
  buildPropertyJsonLd,
  coerceStoredSchemaJsonLd,
} from "@/lib/migration/jsonld";
export type {
  AnalyzePublishedListingsResult,
  ApplyEnhancementsResult,
  EnhanceListingsCounts,
  EnhanceListingsDryRunResult,
  EnhancementPayload,
  ListingDivision,
  ListingEnhancementType,
  ListingSnapshot,
  MigrationReport,
  MigrationReportCounts,
  MigrationReportMode,
} from "@/lib/migration/types";
