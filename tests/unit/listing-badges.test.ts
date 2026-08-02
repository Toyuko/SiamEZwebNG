import { describe, expect, it } from "vitest";
import { computeListingBadges } from "@/lib/marketplace/badges";

describe("computeListingBadges", () => {
  it("returns each applicable badge in a stable order", () => {
    expect(computeListingBadges({
      createdAt: new Date("2026-08-01"),
      isBoosted: true,
      boostExpiresAt: new Date("2026-08-10"),
      previousPriceAmount: 120,
      priceAmount: 100,
      isVerified: true,
      now: new Date("2026-08-02"),
    })).toEqual(["new", "featured", "reduced", "verified"]);
  });

  it("does not mark inactive or invalid price changes", () => {
    expect(computeListingBadges({
      createdAt: new Date("2026-01-01"),
      isBoosted: true,
      boostExpiresAt: new Date("2026-08-01"),
      previousPriceAmount: 100,
      priceAmount: 0,
      now: new Date("2026-08-02"),
    })).toEqual([]);
  });
});
