import { MAX_COMPARE_ITEMS } from "./constants";
import type { CompareDecision, ListingRef } from "./types";

function sameListing(a: ListingRef, b: ListingRef): boolean {
  return a.listingType === b.listingType && a.listingId === b.listingId;
}

/**
 * Pure compare-cap decision. Vehicle + property mix is allowed.
 * Returns "noop" when the listing is already in the set.
 */
export function decideCompareAdd(
  current: ListingRef[],
  candidate: ListingRef
): CompareDecision {
  if (!candidate.listingId?.trim()) {
    return { ok: false, reason: "invalid" };
  }
  if (current.some((item) => sameListing(item, candidate))) {
    return { ok: true, action: "noop" };
  }
  if (current.length >= MAX_COMPARE_ITEMS) {
    return { ok: false, reason: "cap" };
  }
  return { ok: true, action: "add" };
}

export function canAddToCompare(currentCount: number, alreadyInSet: boolean): boolean {
  if (alreadyInSet) return true;
  return currentCount < MAX_COMPARE_ITEMS;
}
