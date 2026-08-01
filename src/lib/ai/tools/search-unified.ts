/**
 * Concierge tool hook — unified search across services ∪ vehicles ∪ properties.
 * Works without OpenAI: pure Fuse over the local search index.
 */

import {
  countGroupedResults,
  emptyGroupedSearchResults,
  loadSearchDocuments,
  queryUnifiedSearch,
  type GroupedSearchResults,
  type SearchDocument,
} from "@/lib/search";
import type { ConciergeLocale } from "@/lib/ai/types";

export type SearchUnifiedToolInput = {
  query?: string;
  locale: ConciergeLocale;
  limitPerGroup?: number;
  /** Inject a prebuilt index (unit tests / offline). */
  documents?: SearchDocument[];
};

export type SearchUnifiedToolResult = {
  groups: GroupedSearchResults;
  total: number;
  pathTemplates: {
    service: "/services/[slug]";
    book: "/book/[slug]";
    vehicle: "/sales/[id]";
    property: "/real-estate/[id]";
  };
};

const PATH_TEMPLATES = {
  service: "/services/[slug]",
  book: "/book/[slug]",
  vehicle: "/sales/[id]",
  property: "/real-estate/[id]",
} as const;

/**
 * Synchronous unified search when an index is already available.
 * Safe for empty / missing query — never throws.
 */
export function searchUnifiedSync(
  documents: SearchDocument[],
  input: Omit<SearchUnifiedToolInput, "documents" | "locale"> & {
    locale?: ConciergeLocale;
  }
): SearchUnifiedToolResult {
  try {
    const groups = queryUnifiedSearch(documents, input.query ?? "", {
      limitPerGroup: input.limitPerGroup ?? 5,
    });
    return {
      groups,
      total: countGroupedResults(groups),
      pathTemplates: PATH_TEMPLATES,
    };
  } catch {
    return {
      groups: emptyGroupedSearchResults(),
      total: 0,
      pathTemplates: PATH_TEMPLATES,
    };
  }
}

/**
 * Concierge-callable unified search. Loads published index when documents
 * are not injected. Degrades gracefully if the DB is unavailable.
 */
export async function searchUnifiedTool(
  input: SearchUnifiedToolInput
): Promise<SearchUnifiedToolResult> {
  try {
    const documents =
      input.documents ??
      (await loadSearchDocuments({
        locale: input.locale,
        includeHelp: true,
      }));
    return searchUnifiedSync(documents, input);
  } catch {
    return {
      groups: emptyGroupedSearchResults(),
      total: 0,
      pathTemplates: PATH_TEMPLATES,
    };
  }
}
