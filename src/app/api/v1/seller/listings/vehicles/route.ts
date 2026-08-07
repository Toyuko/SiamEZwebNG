import { NextRequest } from "next/server";
import { ZodError } from "zod";
import {
  createSalesVehicleListing,
  getSalesVehiclesByOwner,
} from "@/data-access/sales";
import {
  apiBadRequest,
  apiOk,
  serializeJson,
  withBearerUser,
} from "@/lib/api/v1/helpers";
import { vehicleListingSchema } from "@/lib/marketplace/listing-schemas";

/** GET /api/v1/seller/listings/vehicles */
export async function GET(request: NextRequest) {
  return withBearerUser(request, async (userId) => {
    const items = await getSalesVehiclesByOwner(userId);
    return apiOk(serializeJson(items));
  });
}

/** POST /api/v1/seller/listings/vehicles */
export async function POST(request: NextRequest) {
  return withBearerUser(request, async (userId) => {
    const body = await request.json().catch(() => null);
    try {
      const parsed = vehicleListingSchema.parse(body);
      const row = await createSalesVehicleListing(userId, parsed);
      return apiOk(serializeJson(row), 201);
    } catch (error) {
      if (error instanceof ZodError) {
        return apiBadRequest(error.issues[0]?.message ?? "Invalid listing");
      }
      throw error;
    }
  });
}
