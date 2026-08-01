/**
 * Anonymous → authenticated merge path (Wave M2).
 *
 * Flow:
 * 1. Anonymous visitors get httpOnly cookie `siamez_mp_sid`.
 * 2. Saves / views / compare rows are keyed by ownerKey `anon:<sid>`.
 * 3. On login (Auth.js `signIn` event, best-effort) OR the next engagement
 *    Server Action after login, rows are copied onto `user:<userId>`:
 *    - SavedListing / CompareItem: skip duplicates (unique on owner+type+id)
 *    - ListingView: upsert with newest viewedAt
 *    - Compare tray for the user is capped at MAX_COMPARE_ITEMS (keep earliest)
 * 4. Anon rows are deleted after a successful merge attempt.
 *
 * Failures are swallowed at the call site so login never breaks.
 */

import type { MarketplaceListingType, PrismaClient } from "@prisma/client";
import { MAX_COMPARE_ITEMS } from "./constants";
import { anonOwnerKey, userOwnerKey } from "./owner";

export type MergePrisma = Pick<
  PrismaClient,
  "savedListing" | "listingView" | "compareItem"
>;

export type MergeResult = {
  savedMoved: number;
  viewsMoved: number;
  compareMoved: number;
};

export async function mergeAnonymousEngagementToUser(
  db: MergePrisma,
  opts: { userId: string; anonymousSessionId: string }
): Promise<MergeResult> {
  const anonKey = anonOwnerKey(opts.anonymousSessionId);
  const userKey = userOwnerKey(opts.userId);
  if (anonKey === userKey) {
    return { savedMoved: 0, viewsMoved: 0, compareMoved: 0 };
  }

  const [anonSaved, anonViews, anonCompare] = await Promise.all([
    db.savedListing.findMany({ where: { ownerKey: anonKey } }),
    db.listingView.findMany({ where: { ownerKey: anonKey } }),
    db.compareItem.findMany({
      where: { ownerKey: anonKey },
      orderBy: { createdAt: "asc" },
    }),
  ]);

  let savedMoved = 0;
  for (const row of anonSaved) {
    try {
      await db.savedListing.create({
        data: {
          ownerKey: userKey,
          userId: opts.userId,
          anonymousSessionId: null,
          listingType: row.listingType,
          listingId: row.listingId,
          createdAt: row.createdAt,
        },
      });
      savedMoved += 1;
    } catch {
      // unique conflict — already saved under user
    }
  }

  let viewsMoved = 0;
  for (const row of anonViews) {
    await db.listingView.upsert({
      where: {
        ownerKey_listingType_listingId: {
          ownerKey: userKey,
          listingType: row.listingType,
          listingId: row.listingId,
        },
      },
      create: {
        ownerKey: userKey,
        userId: opts.userId,
        anonymousSessionId: null,
        listingType: row.listingType,
        listingId: row.listingId,
        viewedAt: row.viewedAt,
      },
      update: {
        viewedAt: row.viewedAt,
        userId: opts.userId,
        anonymousSessionId: null,
      },
    });
    viewsMoved += 1;
  }

  const existingCompare = await db.compareItem.findMany({
    where: { ownerKey: userKey },
    orderBy: { createdAt: "asc" },
  });
  const existingKeys = new Set(
    existingCompare.map((c) => `${c.listingType}:${c.listingId}`)
  );
  let slots = Math.max(0, MAX_COMPARE_ITEMS - existingCompare.length);
  let compareMoved = 0;

  for (const row of anonCompare) {
    const key = `${row.listingType}:${row.listingId}`;
    if (existingKeys.has(key)) continue;
    if (slots <= 0) break;
    try {
      await db.compareItem.create({
        data: {
          ownerKey: userKey,
          userId: opts.userId,
          anonymousSessionId: null,
          listingType: row.listingType as MarketplaceListingType,
          listingId: row.listingId,
          createdAt: row.createdAt,
        },
      });
      existingKeys.add(key);
      slots -= 1;
      compareMoved += 1;
    } catch {
      // ignore unique races
    }
  }

  await Promise.all([
    db.savedListing.deleteMany({ where: { ownerKey: anonKey } }),
    db.listingView.deleteMany({ where: { ownerKey: anonKey } }),
    db.compareItem.deleteMany({ where: { ownerKey: anonKey } }),
  ]);

  return { savedMoved, viewsMoved, compareMoved };
}
