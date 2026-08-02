import { NextRequest } from "next/server";
import { getPublicSalesPropertyById } from "@/data-access/real-estate";
import {
  apiNotFound,
  apiOk,
  serializeJson,
  withOptionalBearerUser,
} from "@/lib/api/v1/helpers";

type Params = { params: Promise<{ id: string }> };

/** GET /api/v1/marketplace/properties/:id */
export async function GET(request: NextRequest, { params }: Params) {
  return withOptionalBearerUser(request, async () => {
    const { id } = await params;
    const listing = await getPublicSalesPropertyById(id);
    if (!listing) return apiNotFound("Property listing not found");
    return apiOk(serializeJson(listing));
  });
}
