/**
 * Unified Search (M3) — typed projection documents across divisions.
 * Additive only: never mutates listing description / public ids.
 */

export type SearchDivision = "service" | "vehicle" | "property" | "help";

export type SearchDocumentBase = {
  /** Stable document key within the index (not necessarily a DB id). */
  id: string;
  division: SearchDivision;
  title: string;
  subtitle?: string;
  keywords: string[];
  /** Concatenated blob for Fuse `searchText` key. */
  searchText: string;
  /** Locale-agnostic public path (next-intl Link / router). */
  href: string;
};

export type ServiceSearchDocument = SearchDocumentBase & {
  division: "service";
  slug: string;
};

export type VehicleSearchDocument = SearchDocumentBase & {
  division: "vehicle";
  /** SalesVehicle cuid — public URL segment. */
  listingId: string;
};

export type PropertySearchDocument = SearchDocumentBase & {
  division: "property";
  /** SalesProperty cuid — public URL segment. */
  listingId: string;
};

export type HelpSearchDocument = SearchDocumentBase & {
  division: "help";
};

export type SearchDocument =
  | ServiceSearchDocument
  | VehicleSearchDocument
  | PropertySearchDocument
  | HelpSearchDocument;

/** Grouped query result shape consumed by UI + Concierge tool. */
export type GroupedSearchResults = {
  services: ServiceSearchDocument[];
  vehicles: VehicleSearchDocument[];
  properties: PropertySearchDocument[];
  help: HelpSearchDocument[];
};

export type UnifiedSearchQueryOptions = {
  /** Max hits per division group (default 8). */
  limitPerGroup?: number;
  /** When true, empty/whitespace query returns empty groups (default). */
  emptyReturnsEmpty?: boolean;
};

/** Lean source shapes for document builders (DB or fixtures). */
export type ServiceSearchSource = {
  slug: string;
  name: string;
  shortDescription?: string | null;
  description?: string | null;
  keywords?: string[];
};

export type VehicleSearchSource = {
  id: string;
  title: string;
  make: string;
  model: string;
  year: number;
  category: string;
  priceAmount?: number;
  priceCurrency?: string;
};

export type PropertySearchSource = {
  id: string;
  title: string;
  propertyType: string;
  listingType: string;
  province: string;
  district?: string | null;
  neighborhood?: string | null;
  priceAmount?: number;
  priceCurrency?: string;
};
