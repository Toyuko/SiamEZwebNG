import { NextRequest } from "next/server";
import {
  apiOk,
  serializeJson,
  withOptionalBearerUser,
} from "@/lib/api/v1/helpers";
import {
  loadSearchDocuments,
  queryUnifiedSearch,
} from "@/lib/search";
import { trackPlatformEvent } from "@/lib/analytics/track";

/** GET /api/v1/search?q=&locale=en|th */
export async function GET(request: NextRequest) {
  return withOptionalBearerUser(request, async (userId) => {
    const sp = request.nextUrl.searchParams;
    const q = (sp.get("q") ?? sp.get("query") ?? "").trim();
    const locale = sp.get("locale") === "th" ? "th" : "en";

    const documents = await loadSearchDocuments({
      locale,
      includeHelp: true,
      userId: userId ?? undefined,
    });

    if (!q) {
      return apiOk(serializeJson({ query: q, groups: {}, documents: [] }));
    }

    void trackPlatformEvent("search_query", { queryLength: q.length }, userId ?? undefined, locale);
    const groups = queryUnifiedSearch(documents, q, { limitPerGroup: 8 });
    return apiOk(serializeJson({ query: q, groups }));
  });
}
