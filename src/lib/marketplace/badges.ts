export type ListingBadge = "new" | "featured" | "reduced" | "verified";

export function computeListingBadges(input: {
  createdAt: Date;
  isBoosted: boolean;
  boostExpiresAt?: Date | null;
  previousPriceAmount?: number | null;
  priceAmount: number;
  isVerified?: boolean;
  now?: Date;
  newWithinDays?: number;
}): ListingBadge[] {
  const now = input.now ?? new Date();
  const newWithinDays = input.newWithinDays ?? 14;
  const newestAllowed = now.getTime() - newWithinDays * 24 * 60 * 60 * 1000;
  const badges: ListingBadge[] = [];

  if (input.createdAt.getTime() >= newestAllowed) badges.push("new");
  if (input.isBoosted && (!input.boostExpiresAt || input.boostExpiresAt > now)) {
    badges.push("featured");
  }
  if (
    input.previousPriceAmount != null &&
    input.previousPriceAmount > input.priceAmount &&
    input.priceAmount > 0
  ) {
    badges.push("reduced");
  }
  if (input.isVerified) badges.push("verified");
  return badges;
}
