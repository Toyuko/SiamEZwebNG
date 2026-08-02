import { NextRequest } from "next/server";
import {
  isListingSaved,
  saveListing,
  unsaveListing,
} from "@/data-access/marketplace-engagement";
import {
  apiBadRequest,
  apiOk,
  parseListingType,
  withBearerUser,
} from "@/lib/api/v1/helpers";
import { buildUserOwner } from "@/lib/marketplace-engagement";

type Params = {
  params: Promise<{ listingType: string; listingId: string }>;
};

/** PUT /api/v1/marketplace/saved/:listingType/:listingId */
export async function PUT(request: NextRequest, { params }: Params) {
  return withBearerUser(request, async (userId) => {
    const { listingType: rawType, listingId } = await params;
    const listingType = parseListingType(rawType);
    if (!listingType || !listingId?.trim()) {
      return apiBadRequest("listingType must be vehicle|property");
    }
    const owner = buildUserOwner(userId);
    await saveListing(owner, listingType, listingId.trim());
    return apiOk({ saved: true, listingType, listingId: listingId.trim() });
  });
}

/** DELETE /api/v1/marketplace/saved/:listingType/:listingId */
export async function DELETE(request: NextRequest, { params }: Params) {
  return withBearerUser(request, async (userId) => {
    const { listingType: rawType, listingId } = await params;
    const listingType = parseListingType(rawType);
    if (!listingType || !listingId?.trim()) {
      return apiBadRequest("listingType must be vehicle|property");
    }
    const owner = buildUserOwner(userId);
    await unsaveListing(owner, listingType, listingId.trim());
    return apiOk({ saved: false, listingType, listingId: listingId.trim() });
  });
}

/** GET /api/v1/marketplace/saved/:listingType/:listingId */
export async function GET(request: NextRequest, { params }: Params) {
  return withBearerUser(request, async (userId) => {
    const { listingType: rawType, listingId } = await params;
    const listingType = parseListingType(rawType);
    if (!listingType || !listingId?.trim()) {
      return apiBadRequest("listingType must be vehicle|property");
    }
    const owner = buildUserOwner(userId);
    const saved = await isListingSaved(owner, listingType, listingId.trim());
    return apiOk({ saved, listingType, listingId: listingId.trim() });
  });
}
