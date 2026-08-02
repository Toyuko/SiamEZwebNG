import { prisma } from "@/lib/db";
import type { EngagementOwner, MarketplaceListingType } from "@/lib/marketplace-engagement";

export const MAX_SAVED_SEARCHES = 20;

function ownerFields(owner: EngagementOwner) {
  return owner.kind === "user"
    ? { ownerKey: owner.ownerKey, userId: owner.userId, anonymousSessionId: null }
    : { ownerKey: owner.ownerKey, userId: null, anonymousSessionId: owner.anonymousSessionId };
}

export async function listSavedSearches(owner: EngagementOwner) {
  return prisma.savedSearch.findMany({
    where: { ownerKey: owner.ownerKey },
    orderBy: { updatedAt: "desc" },
    take: MAX_SAVED_SEARCHES,
  });
}

export async function createSavedSearch(
  owner: EngagementOwner,
  input: { name: string; listingType: MarketplaceListingType; query: Record<string, string> }
) {
  const count = await prisma.savedSearch.count({ where: { ownerKey: owner.ownerKey } });
  if (count >= MAX_SAVED_SEARCHES) throw new Error("Saved search limit reached");
  return prisma.savedSearch.create({
    data: { ...ownerFields(owner), ...input },
  });
}

export async function deleteSavedSearch(owner: EngagementOwner, id: string) {
  await prisma.savedSearch.deleteMany({ where: { id, ownerKey: owner.ownerKey } });
}
