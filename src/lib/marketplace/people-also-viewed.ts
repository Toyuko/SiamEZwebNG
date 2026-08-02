import { prisma } from "@/lib/db";
import type { MarketplaceListingType } from "@/lib/marketplace-engagement";
import {
  buildRealEstateListingPath,
  buildSalesListingPath,
} from "@/lib/migration/urls";
import type { RelatedListing } from "./related-listings";

/** Co-view recommendations using only the bounded ListingView history. */
export async function getPeopleAlsoViewed(
  listingType: MarketplaceListingType,
  listingId: string,
  limit = 6
): Promise<RelatedListing[]> {
  const viewers = await prisma.listingView.findMany({
    where: { listingType, listingId },
    select: { ownerKey: true },
    take: 100,
  });
  const ownerKeys = [...new Set(viewers.map((view) => view.ownerKey))];
  if (!ownerKeys.length) return [];

  const views = await prisma.listingView.findMany({
    where: {
      ownerKey: { in: ownerKeys },
      NOT: { listingType, listingId },
    },
    select: { listingType: true, listingId: true },
    take: 500,
  });
  const score = new Map<string, { listingType: MarketplaceListingType; listingId: string; count: number }>();
  for (const view of views) {
    const type = view.listingType as MarketplaceListingType;
    const key = `${type}:${view.listingId}`;
    const current = score.get(key);
    score.set(key, current ? { ...current, count: current.count + 1 } : {
      listingType: type, listingId: view.listingId, count: 1,
    });
  }
  const candidates = [...score.values()]
    .sort((a, b) => b.count - a.count)
    .slice(0, Math.min(Math.max(limit, 1), 6));
  const vehicleIds = candidates.filter((c) => c.listingType === "vehicle").map((c) => c.listingId);
  const propertyIds = candidates.filter((c) => c.listingType === "property").map((c) => c.listingId);
  const [vehicles, properties] = await Promise.all([
    prisma.salesVehicle.findMany({ where: { id: { in: vehicleIds }, published: true, status: "available" }, select: { id: true, title: true, year: true, make: true, model: true } }),
    prisma.salesProperty.findMany({ where: { id: { in: propertyIds }, published: true, status: "available" }, select: { id: true, title: true } }),
  ]);
  const hydrated = new Map<string, RelatedListing>();
  for (const row of vehicles) hydrated.set(`vehicle:${row.id}`, { id: row.id, title: row.title || `${row.year} ${row.make} ${row.model}`, href: buildSalesListingPath(row.id), listingType: "vehicle" });
  for (const row of properties) hydrated.set(`property:${row.id}`, { id: row.id, title: row.title, href: buildRealEstateListingPath(row.id), listingType: "property" });
  return candidates.flatMap((candidate) => {
    const item = hydrated.get(`${candidate.listingType}:${candidate.listingId}`);
    return item ? [item] : [];
  });
}
