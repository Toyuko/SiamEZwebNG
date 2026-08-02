import { describe, expect, it } from "vitest";
import {
  canSellerAccessListingEnquiry,
  parseListingEnquiryType,
} from "@/data-access/listing-enquiries";

describe("listing enquiry ownership", () => {
  const sellerId = "seller-user-001";
  const otherSellerId = "seller-user-002";
  const staffActor = "staff-user-001";

  it("allows listing owner to access their enquiry", () => {
    expect(canSellerAccessListingEnquiry(sellerId, sellerId, false)).toBe(true);
  });

  it("denies access when actor is not the listing owner", () => {
    expect(canSellerAccessListingEnquiry(sellerId, otherSellerId, false)).toBe(false);
  });

  it("denies access when listing has no owner", () => {
    expect(canSellerAccessListingEnquiry(null, sellerId, false)).toBe(false);
    expect(canSellerAccessListingEnquiry(undefined, sellerId, false)).toBe(false);
  });

  it("allows staff to access any enquiry", () => {
    expect(canSellerAccessListingEnquiry(sellerId, staffActor, true)).toBe(true);
    expect(canSellerAccessListingEnquiry(null, staffActor, true)).toBe(true);
  });

  it("parses supported listing types only", () => {
    expect(parseListingEnquiryType("vehicle")).toBe("vehicle");
    expect(parseListingEnquiryType("property")).toBe("property");
    expect(parseListingEnquiryType("service")).toBeNull();
    expect(parseListingEnquiryType("")).toBeNull();
  });
});

describe("seller inbox scope (contract)", () => {
  it("filters enquiries to listings owned by the seller", () => {
    const sellerVehicleIds = new Set(["veh-a", "veh-b"]);
    const sellerPropertyIds = new Set(["prop-x"]);

    const enquiries = [
      { listingType: "vehicle", listingId: "veh-a" },
      { listingType: "vehicle", listingId: "veh-other" },
      { listingType: "property", listingId: "prop-x" },
      { listingType: "property", listingId: "prop-y" },
    ];

    const visible = enquiries.filter((e) => {
      if (e.listingType === "vehicle") return sellerVehicleIds.has(e.listingId);
      if (e.listingType === "property") return sellerPropertyIds.has(e.listingId);
      return false;
    });

    expect(visible).toHaveLength(2);
    expect(visible.map((e) => e.listingId)).toEqual(["veh-a", "prop-x"]);
  });
});
