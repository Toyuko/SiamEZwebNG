"use server";

import {
  createSalesVehicleListing,
  deleteSalesVehicleListing,
  updateSalesVehicleListing,
} from "@/data-access/sales";
import { getSession } from "@/lib/auth";
import {
  vehicleListingSchema,
  type VehicleListingInput,
} from "@/lib/marketplace/listing-schemas";

async function requireSessionUser() {
  const session = await getSession();
  if (!session) {
    throw new Error("Unauthorized");
  }
  return session;
}

export async function createSalesListing(input: VehicleListingInput) {
  const session = await requireSessionUser();
  const parsed = vehicleListingSchema.parse(input);
  return createSalesVehicleListing(session.user.id, parsed);
}

export async function updateSalesListing(id: string, input: VehicleListingInput) {
  const session = await requireSessionUser();
  const parsed = vehicleListingSchema.parse(input);
  return updateSalesVehicleListing(session.user.id, session.user.role, id, parsed);
}

export async function deleteSalesListing(id: string) {
  const session = await requireSessionUser();
  return deleteSalesVehicleListing(session.user.id, session.user.role, id);
}
