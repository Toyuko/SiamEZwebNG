import { prisma } from "@/lib/db";
import type { ListingEnquiry, Prisma } from "@prisma/client";

export type ListingEnquiryListingType = "vehicle" | "property";

const LISTING_TYPES = new Set<ListingEnquiryListingType>(["vehicle", "property"]);

export function parseListingEnquiryType(
  value: string
): ListingEnquiryListingType | null {
  return LISTING_TYPES.has(value as ListingEnquiryListingType)
    ? (value as ListingEnquiryListingType)
    : null;
}

/** Whether a seller (or staff) may access an enquiry for a listing they own. */
export function canSellerAccessListingEnquiry(
  listingOwnerId: string | null | undefined,
  actorUserId: string,
  actorIsStaff: boolean
): boolean {
  if (actorIsStaff) return true;
  if (!listingOwnerId) return false;
  return listingOwnerId === actorUserId;
}

export async function getListingOwnerId(
  listingType: ListingEnquiryListingType,
  listingId: string
): Promise<string | null> {
  if (listingType === "vehicle") {
    const row = await prisma.salesVehicle.findUnique({
      where: { id: listingId },
      select: { createdById: true },
    });
    return row?.createdById ?? null;
  }
  const row = await prisma.salesProperty.findUnique({
    where: { id: listingId },
    select: { createdById: true },
  });
  return row?.createdById ?? null;
}

export type ListingEnquiryCreateInput = {
  listingType: ListingEnquiryListingType;
  listingId: string;
  userId?: string | null;
  name: string;
  email: string;
  phone?: string | null;
  message: string;
};

export async function createListingEnquiry(
  data: ListingEnquiryCreateInput
): Promise<ListingEnquiry> {
  return prisma.listingEnquiry.create({
    data: {
      listingType: data.listingType,
      listingId: data.listingId,
      userId: data.userId ?? null,
      name: data.name.trim(),
      email: data.email.trim(),
      phone: data.phone?.trim() || null,
      message: data.message.trim(),
      status: "new",
    },
  });
}

export type SellerListingEnquiryRow = ListingEnquiry & {
  listingTitle: string | null;
};

async function sellerListingIds(userId: string): Promise<{
  vehicleIds: string[];
  propertyIds: string[];
}> {
  const [vehicles, properties] = await Promise.all([
    prisma.salesVehicle.findMany({
      where: { createdById: userId },
      select: { id: true },
    }),
    prisma.salesProperty.findMany({
      where: { createdById: userId },
      select: { id: true },
    }),
  ]);
  return {
    vehicleIds: vehicles.map((v) => v.id),
    propertyIds: properties.map((p) => p.id),
  };
}

export async function listMyListingEnquiries(
  sellerUserId: string
): Promise<SellerListingEnquiryRow[]> {
  const { vehicleIds, propertyIds } = await sellerListingIds(sellerUserId);
  if (vehicleIds.length === 0 && propertyIds.length === 0) {
    return [];
  }

  const or: Prisma.ListingEnquiryWhereInput[] = [];
  if (vehicleIds.length > 0) {
    or.push({ listingType: "vehicle", listingId: { in: vehicleIds } });
  }
  if (propertyIds.length > 0) {
    or.push({ listingType: "property", listingId: { in: propertyIds } });
  }

  const enquiries = await prisma.listingEnquiry.findMany({
    where: { OR: or },
    orderBy: [{ status: "asc" }, { createdAt: "desc" }],
  });

  const vehicleTitleById = new Map<string, string>();
  const propertyTitleById = new Map<string, string>();

  const vehicleIdsInEnquiries = enquiries
    .filter((e) => e.listingType === "vehicle")
    .map((e) => e.listingId);
  const propertyIdsInEnquiries = enquiries
    .filter((e) => e.listingType === "property")
    .map((e) => e.listingId);

  if (vehicleIdsInEnquiries.length > 0) {
    const rows = await prisma.salesVehicle.findMany({
      where: { id: { in: vehicleIdsInEnquiries } },
      select: { id: true, title: true },
    });
    for (const row of rows) vehicleTitleById.set(row.id, row.title);
  }
  if (propertyIdsInEnquiries.length > 0) {
    const rows = await prisma.salesProperty.findMany({
      where: { id: { in: propertyIdsInEnquiries } },
      select: { id: true, title: true },
    });
    for (const row of rows) propertyTitleById.set(row.id, row.title);
  }

  return enquiries.map((e) => ({
    ...e,
    listingTitle:
      e.listingType === "vehicle"
        ? (vehicleTitleById.get(e.listingId) ?? null)
        : (propertyTitleById.get(e.listingId) ?? null),
  }));
}

export async function countNewListingEnquiriesForSeller(
  sellerUserId: string
): Promise<number> {
  const { vehicleIds, propertyIds } = await sellerListingIds(sellerUserId);
  if (vehicleIds.length === 0 && propertyIds.length === 0) return 0;

  const or: Prisma.ListingEnquiryWhereInput[] = [];
  if (vehicleIds.length > 0) {
    or.push({ listingType: "vehicle", listingId: { in: vehicleIds }, status: "new" });
  }
  if (propertyIds.length > 0) {
    or.push({ listingType: "property", listingId: { in: propertyIds }, status: "new" });
  }

  return prisma.listingEnquiry.count({ where: { OR: or } });
}

export async function markListingEnquiryRead(
  enquiryId: string,
  actorUserId: string,
  actorIsStaff: boolean
): Promise<ListingEnquiry | null> {
  const enquiry = await prisma.listingEnquiry.findUnique({ where: { id: enquiryId } });
  if (!enquiry) return null;

  const listingType = parseListingEnquiryType(enquiry.listingType);
  if (!listingType) return null;

  const ownerId = await getListingOwnerId(listingType, enquiry.listingId);
  if (!canSellerAccessListingEnquiry(ownerId, actorUserId, actorIsStaff)) {
    return null;
  }

  if (enquiry.status === "read" || enquiry.status === "closed") {
    return enquiry;
  }

  return prisma.listingEnquiry.update({
    where: { id: enquiryId },
    data: { status: "read" },
  });
}
