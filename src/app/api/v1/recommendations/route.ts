import { NextRequest } from "next/server";
import { apiOk, serializeJson, withBearerUser } from "@/lib/api/v1/helpers";
import { buildUserOwner } from "@/lib/marketplace-engagement";
import { loadRecommendationContext, recommend } from "@/lib/recommendations";

/** GET /api/v1/recommendations?locale=en|th&limit=6 */
export async function GET(request: NextRequest) {
  return withBearerUser(request, async (userId) => {
    const sp = request.nextUrl.searchParams;
    const locale = sp.get("locale") === "th" ? "th" : "en";
    const limitRaw = Number.parseInt(sp.get("limit") ?? "6", 10);
    const limit = Number.isFinite(limitRaw)
      ? Math.min(Math.max(limitRaw, 1), 12)
      : 6;

    const context = await loadRecommendationContext({
      locale,
      owner: buildUserOwner(userId),
      userId,
      limit,
    });
    const result = await recommend(context);
    return apiOk(serializeJson(result));
  });
}
