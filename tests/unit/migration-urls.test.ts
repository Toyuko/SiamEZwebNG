import { describe, expect, it } from "vitest";
import {
  buildLocalizedRealEstateListingPath,
  buildLocalizedSalesListingPath,
  buildRealEstateListingPath,
  buildSalesListingPath,
} from "@/lib/migration/urls";

describe("migration URL contract helpers", () => {
  const vehicle = {
    id: "clxyz0123456789abcdefgh",
    slug: "honda-wave-2020-bargain",
  };
  const property = {
    id: "clprop9876543210zyxwvuts",
    slug: "bangkok-condo-sukhumvit",
  };

  it("buildSalesListingPath uses cuid id, never slug", () => {
    expect(buildSalesListingPath(vehicle)).toBe(`/sales/${vehicle.id}`);
    expect(buildSalesListingPath(vehicle)).not.toContain(vehicle.slug);
    expect(buildSalesListingPath(vehicle.id)).toBe(`/sales/${vehicle.id}`);
  });

  it("buildRealEstateListingPath uses cuid id, never slug", () => {
    expect(buildRealEstateListingPath(property)).toBe(`/real-estate/${property.id}`);
    expect(buildRealEstateListingPath(property)).not.toContain(property.slug);
    expect(buildRealEstateListingPath(property.id)).toBe(`/real-estate/${property.id}`);
  });

  it("localized helpers still use id segments", () => {
    expect(buildLocalizedSalesListingPath("en", vehicle)).toBe(`/en/sales/${vehicle.id}`);
    expect(buildLocalizedSalesListingPath("th", vehicle)).toBe(`/th/sales/${vehicle.id}`);
    expect(buildLocalizedRealEstateListingPath("en", property)).toBe(
      `/en/real-estate/${property.id}`
    );
    expect(buildLocalizedRealEstateListingPath("en", property)).not.toContain(property.slug);
  });

  it("rejects empty id", () => {
    expect(() => buildSalesListingPath({ id: "", slug: "x" })).toThrow(/cuid id/i);
    expect(() => buildRealEstateListingPath("   ")).toThrow(/cuid id/i);
  });
});
