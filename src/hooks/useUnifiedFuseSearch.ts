"use client";

import { useMemo } from "react";
import {
  countGroupedResults,
  emptyGroupedSearchResults,
  queryUnifiedSearch,
  type GroupedSearchResults,
  type SearchDocument,
} from "@/lib/search";

export function useUnifiedFuseSearch(
  documents: SearchDocument[],
  query: string,
  limitPerGroup = 8
): { groups: GroupedSearchResults; total: number } {
  return useMemo(() => {
    if (!documents.length && !(query ?? "").trim()) {
      return { groups: emptyGroupedSearchResults(), total: 0 };
    }
    const groups = queryUnifiedSearch(documents, query, { limitPerGroup });
    return { groups, total: countGroupedResults(groups) };
  }, [documents, query, limitPerGroup]);
}
