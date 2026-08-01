"use server";

import { loadSearchDocuments } from "@/lib/search";
import type { SearchDocument } from "@/lib/search";

/**
 * Load the public unified search index for the command palette.
 * Read-only — safe for anonymous visitors.
 */
export async function getUnifiedSearchIndexAction(
  locale: "en" | "th" = "en"
): Promise<SearchDocument[]> {
  return loadSearchDocuments({ locale, includeHelp: true });
}
