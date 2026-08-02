import { NextRequest } from "next/server";
import { getSellerListingViewStats } from "@/data-access/seller-analytics";
import {
  apiOk,
  parsePositiveInt,
  serializeJson,
  withBearerUser,
} from "@/lib/api/v1/helpers";

/** GET /api/v1/seller/analytics */
export async function GET(request: NextRequest) {
  return withBearerUser(request, async (userId) => {
    const limit = parsePositiveInt(
      request.nextUrl.searchParams.get("limit"),
      8
    );
    const stats = await getSellerListingViewStats(userId, limit);
    return apiOk(serializeJson(stats));
  });
}
