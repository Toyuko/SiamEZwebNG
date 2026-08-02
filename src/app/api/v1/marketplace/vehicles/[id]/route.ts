import { NextRequest } from "next/server";
import { getPublicSalesVehicleById } from "@/data-access/sales";
import {
  apiNotFound,
  apiOk,
  serializeJson,
  withOptionalBearerUser,
} from "@/lib/api/v1/helpers";

type Params = { params: Promise<{ id: string }> };

/** GET /api/v1/marketplace/vehicles/:id */
export async function GET(request: NextRequest, { params }: Params) {
  return withOptionalBearerUser(request, async () => {
    const { id } = await params;
    const listing = await getPublicSalesVehicleById(id);
    if (!listing) return apiNotFound("Vehicle listing not found");
    return apiOk(serializeJson(listing));
  });
}
