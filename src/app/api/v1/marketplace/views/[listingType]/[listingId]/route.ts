import { NextRequest } from "next/server";
import {
  getListingEngagementState,
  recordListingView,
} from "@/data-access/marketplace-engagement";
import {
  apiBadRequest,
  apiOk,
  parseListingType,
  serializeJson,
  withBearerUser,
} from "@/lib/api/v1/helpers";
import { buildUserOwner } from "@/lib/marketplace-engagement";

type Params = {
  params: Promise<{ listingType: string; listingId: string }>;
};

/** POST /api/v1/marketplace/views/:listingType/:listingId */
export async function POST(request: NextRequest, { params }: Params) {
  return withBearerUser(request, async (userId) => {
    const { listingType: rawType, listingId } = await params;
    const listingType = parseListingType(rawType);
    if (!listingType || !listingId?.trim()) {
      return apiBadRequest("listingType must be vehicle|property");
    }
    const owner = buildUserOwner(userId);
    const id = listingId.trim();
    await recordListingView(owner, listingType, id);
    const state = await getListingEngagementState(owner, listingType, id);
    return apiOk(serializeJson({ ok: true, ...state }));
  });
}
