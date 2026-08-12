import { prisma } from "@/lib/db";
import type { MarketplaceListingType } from "@/lib/marketplace-engagement";
import {
  buildRealEstateListingPath,
  buildSalesListingPath,
} from "@/lib/migration/urls";

export type SellerListingViewRow = {
  listingType: MarketplaceListingType;
  listingId: string;
  title: string;
  href: string;
  viewCount: number;
  enquiryCount: number;
};

export type SellerListingViewStats = {
  listingCount: number;
  vehicleCount: number;
  propertyCount: number;
  totalViews: number;
  totalEnquiries: number;
  rows: SellerListingViewRow[];
};

/**
 * Lightweight seller stub: unique viewer rows from ListingView for owned listings.
 * Does not invent complex analytics — views OK when data exists.
 */
export async function getSellerListingViewStats(
  userId: string,
  limit = 8
): Promise<SellerListingViewStats> {
  const [vehicles, properties] = await Promise.all([
    prisma.salesVehicle.findMany({
      where: { createdById: userId },
      select: { id: true, title: true },
      orderBy: { updatedAt: "desc" },
    }),
    prisma.salesProperty.findMany({
      where: { createdById: userId },
      select: { id: true, title: true },
      orderBy: { updatedAt: "desc" },
    }),
  ]);

  const vehicleCount = vehicles.length;
  const propertyCount = properties.length;
  const listingCount = vehicleCount + propertyCount;
  if (listingCount === 0) {
    return {
      listingCount: 0,
      vehicleCount: 0,
      propertyCount: 0,
      totalViews: 0,
      totalEnquiries: 0,
      rows: [],
    };
  }

  const vehicleIds = vehicles.map((v) => v.id);
  const propertyIds = properties.map((p) => p.id);

  const [groups, enquiryGroups] = await Promise.all([prisma.listingView.groupBy({
    by: ["listingType", "listingId"],
    where: {
      OR: [
        ...(vehicleIds.length
          ? [{ listingType: "vehicle" as const, listingId: { in: vehicleIds } }]
          : []),
        ...(propertyIds.length
          ? [
              {
                listingType: "property" as const,
                listingId: { in: propertyIds },
              },
            ]
          : []),
      ],
    },
    _count: { _all: true },
  }), prisma.listingEnquiry.groupBy({
    by: ["listingType", "listingId"],
    where: {
      OR: [
        ...(vehicleIds.length ? [{ listingType: "vehicle", listingId: { in: vehicleIds } }] : []),
        ...(propertyIds.length ? [{ listingType: "property", listingId: { in: propertyIds } }] : []),
      ],
    },
    _count: { _all: true },
  })]);

  const countByKey = new Map<string, number>();
  let totalViews = 0;
  for (const g of groups) {
    const key = `${g.listingType}:${g.listingId}`;
    const n = g._count._all;
    countByKey.set(key, n);
    totalViews += n;
  }
  const enquiriesByKey = new Map<string, number>();
  let totalEnquiries = 0;
  for (const group of enquiryGroups) {
    const n = group._count._all;
    enquiriesByKey.set(`${group.listingType}:${group.listingId}`, n);
    totalEnquiries += n;
  }

  const meta = new Map<
    string,
    { title: string; href: string; listingType: MarketplaceListingType }
  >();
  for (const v of vehicles) {
    meta.set(`vehicle:${v.id}`, {
      title: v.title,
      href: buildSalesListingPath(v.id),
      listingType: "vehicle",
    });
  }
  for (const p of properties) {
    meta.set(`property:${p.id}`, {
      title: p.title,
      href: buildRealEstateListingPath(p.id),
      listingType: "property",
    });
  }

  const rows: SellerListingViewRow[] = [...meta.entries()]
    .map(([key, m]) => {
      const listingId = key.split(":")[1]!;
      return {
        listingType: m.listingType,
        listingId,
        title: m.title,
        href: m.href,
        viewCount: countByKey.get(key) ?? 0,
        enquiryCount: enquiriesByKey.get(key) ?? 0,
      };
    })
    .sort((a, b) => b.viewCount - a.viewCount || a.title.localeCompare(b.title))
    .slice(0, limit);

  return { listingCount, vehicleCount, propertyCount, totalViews, totalEnquiries, rows };
}
