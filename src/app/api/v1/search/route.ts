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

    const groups = queryUnifiedSearch(documents, q, { limitPerGroup: 8 });
    return apiOk(serializeJson({ query: q, groups }));
  });
}
