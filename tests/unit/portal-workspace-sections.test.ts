import { describe, expect, it } from "vitest";
import {
  portalHomeRedirectForRole,
  resolveCustomerWorkspaceSections,
  shouldShowSellerAnalytics,
} from "@/lib/portal/workspace-sections";

describe("portalHomeRedirectForRole", () => {
  it("preserves company and freelancer redirects", () => {
    expect(portalHomeRedirectForRole("company")).toBe("company");
    expect(portalHomeRedirectForRole("freelancer")).toBe("freelancer");
  });

  it("does not redirect customers (or other non-hub roles)", () => {
    expect(portalHomeRedirectForRole("customer")).toBeNull();
    expect(portalHomeRedirectForRole("admin")).toBeNull();
  });
});

describe("resolveCustomerWorkspaceSections", () => {
  it("includes goals, bookings, saved, docs, invoices, and recommendations", () => {
    expect(resolveCustomerWorkspaceSections({ listingCount: 0 })).toEqual([
      "goals",
      "bookings",
      "saved",
      "documents",
      "invoices",
      "recommendations",
    ]);
  });

  it("adds seller analytics only when the user owns listings", () => {
    expect(resolveCustomerWorkspaceSections({ listingCount: 2 })).toEqual([
      "goals",
      "bookings",
      "saved",
      "documents",
      "invoices",
      "recommendations",
      "seller",
    ]);
    expect(shouldShowSellerAnalytics(0)).toBe(false);
    expect(shouldShowSellerAnalytics(1)).toBe(true);
  });
});
