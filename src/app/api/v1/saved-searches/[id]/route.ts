import { NextRequest } from "next/server";
import { deleteSavedSearch } from "@/data-access/saved-searches";
import { apiBadRequest, apiOk, withBearerUser } from "@/lib/api/v1/helpers";
import { buildUserOwner } from "@/lib/marketplace-engagement";

type Params = { params: Promise<{ id: string }> };

/** DELETE /api/v1/saved-searches/:id */
export async function DELETE(request: NextRequest, { params }: Params) {
  return withBearerUser(request, async (userId) => {
    const { id } = await params;
    if (!id?.trim()) return apiBadRequest("id is required");
    await deleteSavedSearch(buildUserOwner(userId), id.trim());
    return apiOk({ deleted: true, id: id.trim() });
  });
}
