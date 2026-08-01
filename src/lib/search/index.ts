export type {
  GroupedSearchResults,
  HelpSearchDocument,
  PropertySearchDocument,
  PropertySearchSource,
  SearchDivision,
  SearchDocument,
  SearchDocumentBase,
  ServiceSearchDocument,
  ServiceSearchSource,
  UnifiedSearchQueryOptions,
  VehicleSearchDocument,
  VehicleSearchSource,
} from "@/lib/search/types";

export {
  buildPropertySearchDocument,
  buildSearchDocuments,
  buildServiceSearchDocument,
  buildVehicleSearchDocument,
  type BuildSearchIndexInput,
} from "@/lib/search/documents";

export { getHelpSearchStubs } from "@/lib/search/help-stubs";

export {
  countGroupedResults,
  emptyGroupedSearchResults,
  groupSearchDocuments,
  queryUnifiedSearch,
} from "@/lib/search/query";

export { loadSearchDocuments, type LoadSearchDocumentsOptions } from "@/lib/search/load";

export {
  buildLocalizedPropertySearchPath,
  buildLocalizedServiceSearchPath,
  buildLocalizedVehicleSearchPath,
  buildPropertySearchPath,
  buildServiceBookPath,
  buildServiceSearchPath,
  buildVehicleSearchPath,
} from "@/lib/search/urls";
