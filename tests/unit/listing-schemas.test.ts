import { describe, expect, it } from "vitest";
import {
  canManageOwnedListing,
  vehicleListingSchema,
} from "@/lib/marketplace/listing-schemas";

describe("canManageOwnedListing", () => {
  it("allows admin and staff", () => {
    expect(canManageOwnedListing("admin", "u1", "other")).toBe(true);
    expect(canManageOwnedListing("staff", "u1", "other")).toBe(true);
  });

  it("allows owner only for customers", () => {
    expect(canManageOwnedListing("customer", "u1", "u1")).toBe(true);
    expect(canManageOwnedListing("customer", "u1", "other")).toBe(false);
  });
});

describe("vehicleListingSchema", () => {
  it("requires media", () => {
    const result = vehicleListingSchema.safeParse({
      title: "Nice car listing",
      make: "Toyota",
      model: "Camry",
      year: 2020,
      mileageKm: 10000,
      priceAmount: 500000,
      category: "car",
      status: "available",
      heroImageUrl: "https://example.com/car.jpg",
      imageUrls: [],
      videoUrls: [],
      description: "A well maintained vehicle ready for a new owner.",
    });
    expect(result.success).toBe(false);
  });

  it("accepts a valid listing", () => {
    const result = vehicleListingSchema.safeParse({
      title: "Nice car listing",
      make: "Toyota",
      model: "Camry",
      year: 2020,
      mileageKm: 10000,
      priceAmount: 500000,
      category: "car",
      status: "available",
      heroImageUrl: "https://example.com/car.jpg",
      imageUrls: ["https://example.com/car.jpg"],
      description: "A well maintained vehicle ready for a new owner.",
    });
    expect(result.success).toBe(true);
  });
});
