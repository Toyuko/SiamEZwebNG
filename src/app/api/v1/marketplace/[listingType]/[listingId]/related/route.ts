import { NextRequest } from "next/server";
import { getPeopleAlsoViewed } from "@/lib/marketplace/people-also-viewed";
import { getRelatedListings } from "@/lib/marketplace/related-listings";
import {
  apiBadRequest,
  apiOk,
  parseListingType,
  parsePositiveInt,
  serializeJson,
  withOptionalBearerUser,
} from "@/lib/api/v1/helpers";

type Params = {
  params: Promise<{ listingType: string; listingId: string }>;
};

/** GET /api/v1/marketplace/:listingType/:listingId/related */
export async function GET(request: NextRequest, { params }: Params) {
  return withOptionalBearerUser(request, async () => {
    const { listingType: rawType, listingId } = await params;
    const listingType = parseListingType(rawType);
    if (!listingType || !listingId?.trim()) {
      return apiBadRequest("listingType must be vehicle|property");
    }
    const limit = parsePositiveInt(request.nextUrl.searchParams.get("limit"), 6);
    const id = listingId.trim();
    const [related, alsoViewed] = await Promise.all([
      getRelatedListings(listingType, id, limit),
      getPeopleAlsoViewed(listingType, id, limit),
    ]);
    return apiOk(serializeJson({ related, alsoViewed }));
  });
}
