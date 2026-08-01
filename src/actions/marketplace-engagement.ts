"use server";

import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import {
  buildAnonOwner,
  buildUserOwner,
  mergeAnonymousEngagementToUser,
  type MarketplaceListingType,
} from "@/lib/marketplace-engagement";
import {
  ensureAnonymousSessionId,
  readAnonymousSessionId,
} from "@/lib/marketplace-engagement/cookie";
import {
  addToCompare,
  getListingEngagementState,
  listCompareForHub,
  listRecentViewsForHub,
  listSavedListingsForHub,
  recordListingView,
  removeFromCompare,
  toggleSaveListing,
  type CompareMutationResult,
} from "@/data-access/marketplace-engagement";

const LISTING_TYPES = new Set<MarketplaceListingType>(["vehicle", "property"]);

function parseListingType(value: string): MarketplaceListingType | null {
  return LISTING_TYPES.has(value as MarketplaceListingType)
    ? (value as MarketplaceListingType)
    : null;
}

/**
 * Resolve engagement owner: prefer Auth.js user; else anonymous cookie.
 * Best-effort merges anon → user when both are present.
 */
export async function resolveEngagementOwner() {
  const session = await getSession();
  const anonId = await ensureAnonymousSessionId();

  if (session?.user?.id) {
    try {
      await mergeAnonymousEngagementToUser(prisma, {
        userId: session.user.id,
        anonymousSessionId: anonId,
      });
    } catch {
      // best-effort — never block UX
    }
    return buildUserOwner(session.user.id);
  }

  return buildAnonOwner(anonId);
}

/** Merge path for Auth.js signIn event (cookie may already exist). */
export async function mergeMarketplaceEngagementOnLogin(userId: string) {
  const anonId = await readAnonymousSessionId();
  if (!anonId) return;
  try {
    await mergeAnonymousEngagementToUser(prisma, {
      userId,
      anonymousSessionId: anonId,
    });
  } catch {
    // best-effort
  }
}

export async function toggleSaveListingAction(input: {
  listingType: string;
  listingId: string;
}): Promise<{ ok: true; saved: boolean } | { ok: false; error: string }> {
  const listingType = parseListingType(input.listingType);
  const listingId = input.listingId?.trim();
  if (!listingType || !listingId) {
    return { ok: false, error: "invalid" };
  }
  const owner = await resolveEngagementOwner();
  const result = await toggleSaveListing(owner, listingType, listingId);
  return { ok: true, saved: result.saved };
}

export async function addToCompareAction(input: {
  listingType: string;
  listingId: string;
}): Promise<CompareMutationResult | { ok: false; reason: "invalid"; count: number; inCompare: boolean }> {
  const listingType = parseListingType(input.listingType);
  const listingId = input.listingId?.trim();
  if (!listingType || !listingId) {
    return { ok: false, reason: "invalid", count: 0, inCompare: false };
  }
  const owner = await resolveEngagementOwner();
  return addToCompare(owner, listingType, listingId);
}

export async function removeFromCompareAction(input: {
  listingType: string;
  listingId: string;
}): Promise<CompareMutationResult> {
  const listingType = parseListingType(input.listingType);
  const listingId = input.listingId?.trim();
  if (!listingType || !listingId) {
    return { ok: false, reason: "invalid", count: 0, inCompare: false };
  }
  const owner = await resolveEngagementOwner();
  return removeFromCompare(owner, listingType, listingId);
}

export async function recordListingViewAction(input: {
  listingType: string;
  listingId: string;
}): Promise<{
  ok: boolean;
  saved?: boolean;
  inCompare?: boolean;
  compareCount?: number;
}> {
  const listingType = parseListingType(input.listingType);
  const listingId = input.listingId?.trim();
  if (!listingType || !listingId) {
    return { ok: false };
  }
  const owner = await resolveEngagementOwner();
  await recordListingView(owner, listingType, listingId);
  const state = await getListingEngagementState(owner, listingType, listingId);
  return {
    ok: true,
    saved: state.saved,
    inCompare: state.inCompare,
    compareCount: state.compareCount,
  };
}

export async function getListingEngagementStateAction(input: {
  listingType: string;
  listingId: string;
}) {
  const listingType = parseListingType(input.listingType);
  const listingId = input.listingId?.trim();
  if (!listingType || !listingId) {
    return { saved: false, inCompare: false, compareCount: 0 };
  }
  const owner = await resolveEngagementOwner();
  return getListingEngagementState(owner, listingType, listingId);
}

export async function loadMarketplaceHubAction() {
  const owner = await resolveEngagementOwner();
  const [saved, recent, compare] = await Promise.all([
    listSavedListingsForHub(owner),
    listRecentViewsForHub(owner),
    listCompareForHub(owner),
  ]);
  return { saved, recent, compare };
}
