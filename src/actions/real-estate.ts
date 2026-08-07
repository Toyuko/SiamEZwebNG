"use server";

import {
  createSalesPropertyListing as createSalesPropertyListingEngine,
  deleteSalesPropertyListing as deleteSalesPropertyListingEngine,
  updateSalesPropertyListing as updateSalesPropertyListingEngine,
} from "@/data-access/real-estate";
import { getSession } from "@/lib/auth";
import {
  propertyListingSchema,
  type PropertyListingInput,
} from "@/lib/marketplace/listing-schemas";

async function requireSessionUser() {
  const session = await getSession();
  if (!session) {
    throw new Error("Unauthorized");
  }
  return session;
}

export async function createSalesPropertyListing(input: PropertyListingInput) {
  const session = await requireSessionUser();
  const parsed = propertyListingSchema.parse(input);
  return createSalesPropertyListingEngine(session.user.id, parsed);
}

export async function updateSalesPropertyListing(
  id: string,
  input: PropertyListingInput
) {
  const session = await requireSessionUser();
  const parsed = propertyListingSchema.parse(input);
  return updateSalesPropertyListingEngine(
    session.user.id,
    session.user.role,
    id,
    parsed
  );
}

export async function deleteSalesPropertyListing(id: string) {
  const session = await requireSessionUser();
  return deleteSalesPropertyListingEngine(
    session.user.id,
    session.user.role,
    id
  );
}
