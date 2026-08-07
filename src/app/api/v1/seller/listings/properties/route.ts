import { NextRequest } from "next/server";
import { ZodError } from "zod";
import {
  createSalesPropertyListing,
  getSalesPropertiesByOwner,
} from "@/data-access/real-estate";
import {
  apiBadRequest,
  apiOk,
  serializeJson,
  withBearerUser,
} from "@/lib/api/v1/helpers";
import { propertyListingSchema } from "@/lib/marketplace/listing-schemas";

/** GET /api/v1/seller/listings/properties */
export async function GET(request: NextRequest) {
  return withBearerUser(request, async (userId) => {
    const items = await getSalesPropertiesByOwner(userId);
    return apiOk(serializeJson(items));
  });
}

/** POST /api/v1/seller/listings/properties */
export async function POST(request: NextRequest) {
  return withBearerUser(request, async (userId) => {
    const body = await request.json().catch(() => null);
    try {
      const parsed = propertyListingSchema.parse(body);
      const row = await createSalesPropertyListing(userId, parsed);
      return apiOk(serializeJson(row), 201);
    } catch (error) {
      if (error instanceof ZodError) {
        return apiBadRequest(error.issues[0]?.message ?? "Invalid listing");
      }
      throw error;
    }
  });
}
