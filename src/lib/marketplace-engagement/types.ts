export type MarketplaceListingType = "vehicle" | "property";

export type EngagementOwner =
  | { kind: "user"; userId: string; ownerKey: string }
  | { kind: "anon"; anonymousSessionId: string; ownerKey: string };

export type ListingRef = {
  listingType: MarketplaceListingType;
  listingId: string;
};

export type CompareDecision =
  | { ok: true; action: "add" | "noop" }
  | { ok: false; reason: "cap" | "invalid" };
