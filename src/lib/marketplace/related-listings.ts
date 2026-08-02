import { prisma } from "@/lib/db";
import type { MarketplaceListingType } from "@/lib/marketplace-engagement";
import {
  buildRealEstateListingPath,
  buildSalesListingPath,
} from "@/lib/migration/urls";

export type RelatedListing = {
  id: string;
  title: string;
  href: string;
  listingType: MarketplaceListingType;
};

export async function getRelatedListings(
  listingType: MarketplaceListingType,
  listingId: string,
  limit = 4
): Promise<RelatedListing[]> {
  const take = Math.min(Math.max(limit, 1), 12);
  if (listingType === "vehicle") {
    const current = await prisma.salesVehicle.findUnique({
      where: { id: listingId },
      select: { category: true },
    });
    if (!current) return [];
    const rows = await prisma.salesVehicle.findMany({
      where: {
        id: { not: listingId },
        published: true,
        status: "available",
        category: current.category,
      },
      orderBy: [{ isBoosted: "desc" }, { createdAt: "desc" }],
      take,
      select: { id: true, title: true, year: true, make: true, model: true },
    });
    return rows.map((row) => ({
      id: row.id,
      title: row.title || `${row.year} ${row.make} ${row.model}`,
      href: buildSalesListingPath(row.id),
      listingType,
    }));
  }

  const current = await prisma.salesProperty.findUnique({
    where: { id: listingId },
    select: { propertyType: true, listingType: true },
  });
  if (!current) return [];
  const rows = await prisma.salesProperty.findMany({
    where: {
      id: { not: listingId },
      published: true,
      status: "available",
      propertyType: current.propertyType,
      listingType: current.listingType,
    },
    orderBy: [{ isBoosted: "desc" }, { createdAt: "desc" }],
    take,
    select: { id: true, title: true },
  });
  return rows.map((row) => ({
    id: row.id,
    title: row.title,
    href: buildRealEstateListingPath(row.id),
    listingType,
  }));
}
