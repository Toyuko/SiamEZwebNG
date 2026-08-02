import { prisma } from "@/lib/db";
import type { MarketplaceListingType as PrismaListingType } from "@prisma/client";
import {
  MAX_COMPARE_ITEMS,
  MAX_RECENT_VIEWS,
  decideCompareAdd,
  type EngagementOwner,
  type ListingRef,
  type MarketplaceListingType,
} from "@/lib/marketplace-engagement";
import {
  buildRealEstateListingPath,
  buildSalesListingPath,
} from "@/lib/migration/urls";

function toPrismaType(t: MarketplaceListingType): PrismaListingType {
  return t;
}

function ownerWriteFields(owner: EngagementOwner) {
  if (owner.kind === "user") {
    return {
      ownerKey: owner.ownerKey,
      userId: owner.userId,
      anonymousSessionId: null as string | null,
    };
  }
  return {
    ownerKey: owner.ownerKey,
    userId: null as string | null,
    anonymousSessionId: owner.anonymousSessionId,
  };
}

export async function isListingSaved(
  owner: EngagementOwner,
  listingType: MarketplaceListingType,
  listingId: string
): Promise<boolean> {
  const row = await prisma.savedListing.findUnique({
    where: {
      ownerKey_listingType_listingId: {
        ownerKey: owner.ownerKey,
        listingType: toPrismaType(listingType),
        listingId,
      },
    },
    select: { id: true },
  });
  return Boolean(row);
}

export async function saveListing(
  owner: EngagementOwner,
  listingType: MarketplaceListingType,
  listingId: string
) {
  const fields = ownerWriteFields(owner);
  return prisma.savedListing.upsert({
    where: {
      ownerKey_listingType_listingId: {
        ownerKey: owner.ownerKey,
        listingType: toPrismaType(listingType),
        listingId,
      },
    },
    create: {
      ...fields,
      listingType: toPrismaType(listingType),
      listingId,
    },
    update: {},
  });
}

export async function unsaveListing(
  owner: EngagementOwner,
  listingType: MarketplaceListingType,
  listingId: string
) {
  await prisma.savedListing.deleteMany({
    where: {
      ownerKey: owner.ownerKey,
      listingType: toPrismaType(listingType),
      listingId,
    },
  });
}

export async function toggleSaveListing(
  owner: EngagementOwner,
  listingType: MarketplaceListingType,
  listingId: string
): Promise<{ saved: boolean }> {
  const existing = await isListingSaved(owner, listingType, listingId);
  if (existing) {
    await unsaveListing(owner, listingType, listingId);
    return { saved: false };
  }
  await saveListing(owner, listingType, listingId);
  return { saved: true };
}

export async function recordListingView(
  owner: EngagementOwner,
  listingType: MarketplaceListingType,
  listingId: string
) {
  const fields = ownerWriteFields(owner);
  const now = new Date();
  await prisma.listingView.upsert({
    where: {
      ownerKey_listingType_listingId: {
        ownerKey: owner.ownerKey,
        listingType: toPrismaType(listingType),
        listingId,
      },
    },
    create: {
      ...fields,
      listingType: toPrismaType(listingType),
      listingId,
      viewedAt: now,
    },
    update: {
      viewedAt: now,
      userId: fields.userId,
      anonymousSessionId: fields.anonymousSessionId,
    },
  });

  // Prune oldest beyond cap
  const overflow = await prisma.listingView.findMany({
    where: { ownerKey: owner.ownerKey },
    orderBy: { viewedAt: "desc" },
    skip: MAX_RECENT_VIEWS,
    select: { id: true },
  });
  if (overflow.length > 0) {
    await prisma.listingView.deleteMany({
      where: { id: { in: overflow.map((r) => r.id) } },
    });
  }
}

export async function listCompareItems(owner: EngagementOwner): Promise<ListingRef[]> {
  const rows = await prisma.compareItem.findMany({
    where: { ownerKey: owner.ownerKey },
    orderBy: { createdAt: "asc" },
    take: MAX_COMPARE_ITEMS,
  });
  return rows.map((r) => ({
    listingType: r.listingType as MarketplaceListingType,
    listingId: r.listingId,
  }));
}

export async function isInCompare(
  owner: EngagementOwner,
  listingType: MarketplaceListingType,
  listingId: string
): Promise<boolean> {
  const row = await prisma.compareItem.findUnique({
    where: {
      ownerKey_listingType_listingId: {
        ownerKey: owner.ownerKey,
        listingType: toPrismaType(listingType),
        listingId,
      },
    },
    select: { id: true },
  });
  return Boolean(row);
}

export type CompareMutationResult =
  | { ok: true; inCompare: boolean; count: number }
  | { ok: false; reason: "cap" | "invalid"; count: number; inCompare: boolean };

export async function addToCompare(
  owner: EngagementOwner,
  listingType: MarketplaceListingType,
  listingId: string
): Promise<CompareMutationResult> {
  const current = await listCompareItems(owner);
  const decision = decideCompareAdd(current, { listingType, listingId });
  if (!decision.ok) {
    return {
      ok: false,
      reason: decision.reason,
      count: current.length,
      inCompare: current.some(
        (c) => c.listingType === listingType && c.listingId === listingId
      ),
    };
  }
  if (decision.action === "add") {
    const fields = ownerWriteFields(owner);
    await prisma.compareItem.create({
      data: {
        ...fields,
        listingType: toPrismaType(listingType),
        listingId,
      },
    });
  }
  const next = await listCompareItems(owner);
  return {
    ok: true,
    inCompare: true,
    count: next.length,
  };
}

export async function removeFromCompare(
  owner: EngagementOwner,
  listingType: MarketplaceListingType,
  listingId: string
): Promise<CompareMutationResult> {
  await prisma.compareItem.deleteMany({
    where: {
      ownerKey: owner.ownerKey,
      listingType: toPrismaType(listingType),
      listingId,
    },
  });
  const next = await listCompareItems(owner);
  return { ok: true, inCompare: false, count: next.length };
}

export async function getListingEngagementState(
  owner: EngagementOwner,
  listingType: MarketplaceListingType,
  listingId: string
) {
  const [saved, compareItems] = await Promise.all([
    isListingSaved(owner, listingType, listingId),
    listCompareItems(owner),
  ]);
  const inCompare = compareItems.some(
    (c) => c.listingType === listingType && c.listingId === listingId
  );
  return {
    saved,
    inCompare,
    compareCount: compareItems.length,
    compareItems,
  };
}

export type HubListingCard = {
  listingType: MarketplaceListingType;
  listingId: string;
  title: string;
  priceAmount: number;
  priceCurrency: string;
  heroImageUrl: string;
  href: string;
  subtitle?: string;
  savedAt?: Date;
  viewedAt?: Date;
};

async function hydrateListings(
  refs: Array<{
    listingType: MarketplaceListingType;
    listingId: string;
    savedAt?: Date;
    viewedAt?: Date;
  }>
): Promise<HubListingCard[]> {
  const vehicleIds = refs.filter((r) => r.listingType === "vehicle").map((r) => r.listingId);
  const propertyIds = refs.filter((r) => r.listingType === "property").map((r) => r.listingId);

  const [vehicles, properties] = await Promise.all([
    vehicleIds.length
      ? prisma.salesVehicle.findMany({
          where: { id: { in: vehicleIds }, published: true },
          select: {
            id: true,
            title: true,
            year: true,
            make: true,
            model: true,
            priceAmount: true,
            priceCurrency: true,
            heroImageUrl: true,
          },
        })
      : Promise.resolve([]),
    propertyIds.length
      ? prisma.salesProperty.findMany({
          where: { id: { in: propertyIds }, published: true },
          select: {
            id: true,
            title: true,
            province: true,
            priceAmount: true,
            priceCurrency: true,
            heroImageUrl: true,
          },
        })
      : Promise.resolve([]),
  ]);

  const vehicleMap = new Map(vehicles.map((v) => [v.id, v]));
  const propertyMap = new Map(properties.map((p) => [p.id, p]));
  const cards: HubListingCard[] = [];

  for (const ref of refs) {
    if (ref.listingType === "vehicle") {
      const v = vehicleMap.get(ref.listingId);
      if (!v) continue;
      cards.push({
        listingType: "vehicle",
        listingId: v.id,
        title: v.title || `${v.year} ${v.make} ${v.model}`,
        subtitle: `${v.year} · ${v.make} ${v.model}`,
        priceAmount: v.priceAmount,
        priceCurrency: v.priceCurrency,
        heroImageUrl: v.heroImageUrl,
        href: buildSalesListingPath(v.id),
        savedAt: ref.savedAt,
        viewedAt: ref.viewedAt,
      });
    } else {
      const p = propertyMap.get(ref.listingId);
      if (!p) continue;
      cards.push({
        listingType: "property",
        listingId: p.id,
        title: p.title,
        subtitle: p.province,
        priceAmount: p.priceAmount,
        priceCurrency: p.priceCurrency,
        heroImageUrl: p.heroImageUrl,
        href: buildRealEstateListingPath(p.id),
        savedAt: ref.savedAt,
        viewedAt: ref.viewedAt,
      });
    }
  }

  return cards;
}

/** Lightweight buyer-hub counts for portal home badges. */
export async function countBuyerHubEngagement(owner: EngagementOwner): Promise<{
  savedCount: number;
  compareCount: number;
}> {
  const [savedCount, compareCount] = await Promise.all([
    prisma.savedListing.count({ where: { ownerKey: owner.ownerKey } }),
    prisma.compareItem.count({ where: { ownerKey: owner.ownerKey } }),
  ]);
  return { savedCount, compareCount };
}

export async function listSavedListingsForHub(
  owner: EngagementOwner,
  limit = 50
): Promise<HubListingCard[]> {
  const rows = await prisma.savedListing.findMany({
    where: { ownerKey: owner.ownerKey },
    orderBy: { createdAt: "desc" },
    take: limit,
  });
  return hydrateListings(
    rows.map((r) => ({
      listingType: r.listingType as MarketplaceListingType,
      listingId: r.listingId,
      savedAt: r.createdAt,
    }))
  );
}

export async function listRecentViewsForHub(
  owner: EngagementOwner,
  limit = 24
): Promise<HubListingCard[]> {
  const rows = await prisma.listingView.findMany({
    where: { ownerKey: owner.ownerKey },
    orderBy: { viewedAt: "desc" },
    take: Math.min(limit, MAX_RECENT_VIEWS),
  });
  return hydrateListings(
    rows.map((r) => ({
      listingType: r.listingType as MarketplaceListingType,
      listingId: r.listingId,
      viewedAt: r.viewedAt,
    }))
  );
}

export async function listCompareForHub(owner: EngagementOwner): Promise<HubListingCard[]> {
  const rows = await prisma.compareItem.findMany({
    where: { ownerKey: owner.ownerKey },
    orderBy: { createdAt: "asc" },
    take: MAX_COMPARE_ITEMS,
  });
  return hydrateListings(
    rows.map((r) => ({
      listingType: r.listingType as MarketplaceListingType,
      listingId: r.listingId,
    }))
  );
}
