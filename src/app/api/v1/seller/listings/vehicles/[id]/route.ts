import { NextRequest } from "next/server";
import { ZodError } from "zod";
import {
  deleteSalesVehicleListing,
  updateSalesVehicleListing,
} from "@/data-access/sales";
import {
  apiBadRequest,
  apiOk,
  serializeJson,
  withBearerUser,
} from "@/lib/api/v1/helpers";
import { vehicleListingSchema } from "@/lib/marketplace/listing-schemas";

type Params = { params: Promise<{ id: string }> };

/** PATCH /api/v1/seller/listings/vehicles/:id */
export async function PATCH(request: NextRequest, { params }: Params) {
  return withBearerUser(request, async (userId, role) => {
    const { id } = await params;
    const body = await request.json().catch(() => null);
    try {
      const parsed = vehicleListingSchema.parse(body);
      const row = await updateSalesVehicleListing(userId, role, id, parsed);
      return apiOk(serializeJson(row));
    } catch (error) {
      if (error instanceof ZodError) {
        return apiBadRequest(error.issues[0]?.message ?? "Invalid listing");
      }
      throw error;
    }
  });
}

/** DELETE /api/v1/seller/listings/vehicles/:id */
export async function DELETE(request: NextRequest, { params }: Params) {
  return withBearerUser(request, async (userId, role) => {
    const { id } = await params;
    const result = await deleteSalesVehicleListing(userId, role, id);
    return apiOk(result);
  });
}
