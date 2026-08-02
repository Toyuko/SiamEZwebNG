"use server";

import { getSession } from "@/lib/auth";
import { loadSearchDocuments } from "@/lib/search";
import type { SearchDocument } from "@/lib/search";

/**
 * Load the unified search index for the command palette.
 * Includes life events for all visitors; goals/bookings when signed in.
 */
export async function getUnifiedSearchIndexAction(
  locale: "en" | "th" = "en"
): Promise<SearchDocument[]> {
  const session = await getSession();
  return loadSearchDocuments({
    locale,
    includeHelp: true,
    userId: session?.user.id,
  });
}
