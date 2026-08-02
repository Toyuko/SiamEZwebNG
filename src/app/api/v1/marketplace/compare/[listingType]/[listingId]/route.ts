import { NextRequest } from "next/server";
import {
  addToCompare,
  removeFromCompare,
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

/** PUT /api/v1/marketplace/compare/:listingType/:listingId */
export async function PUT(request: NextRequest, { params }: Params) {
  return withBearerUser(request, async (userId) => {
    const { listingType: rawType, listingId } = await params;
    const listingType = parseListingType(rawType);
    if (!listingType || !listingId?.trim()) {
      return apiBadRequest("listingType must be vehicle|property");
    }
    const owner = buildUserOwner(userId);
    const result = await addToCompare(owner, listingType, listingId.trim());
    return apiOk(serializeJson(result));
  });
}

/** DELETE /api/v1/marketplace/compare/:listingType/:listingId */
export async function DELETE(request: NextRequest, { params }: Params) {
  return withBearerUser(request, async (userId) => {
    const { listingType: rawType, listingId } = await params;
    const listingType = parseListingType(rawType);
    if (!listingType || !listingId?.trim()) {
      return apiBadRequest("listingType must be vehicle|property");
    }
    const owner = buildUserOwner(userId);
    const result = await removeFromCompare(
      owner,
      listingType,
      listingId.trim()
    );
    return apiOk(serializeJson(result));
  });
}
