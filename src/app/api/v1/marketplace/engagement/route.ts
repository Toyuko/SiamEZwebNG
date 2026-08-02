import { NextRequest } from "next/server";
import {
  countBuyerHubEngagement,
  listCompareForHub,
  listRecentViewsForHub,
  listSavedListingsForHub,
} from "@/data-access/marketplace-engagement";
import { apiOk, serializeJson, withBearerUser } from "@/lib/api/v1/helpers";
import { buildUserOwner } from "@/lib/marketplace-engagement";

/** GET /api/v1/marketplace/engagement — saved / recent / compare hub. */
export async function GET(request: NextRequest) {
  return withBearerUser(request, async (userId) => {
    const owner = buildUserOwner(userId);
    const [saved, recent, compare, counts] = await Promise.all([
      listSavedListingsForHub(owner),
      listRecentViewsForHub(owner),
      listCompareForHub(owner),
      countBuyerHubEngagement(owner),
    ]);
    return apiOk(
      serializeJson({
        saved,
        recent,
        compare,
        ...counts,
      })
    );
  });
}
