import { describe, expect, it } from "vitest";
import {
  isRecentCustomer,
  needsFirstRunProfile,
  withWelcomeQuery,
} from "@/lib/auth-first-run";

describe("needsFirstRunProfile", () => {
  it("requires phone for customers only", () => {
    expect(
      needsFirstRunProfile({ role: "customer", phone: null, name: "Ada" })
    ).toBe(true);
    expect(
      needsFirstRunProfile({ role: "customer", phone: "  ", name: "Ada" })
    ).toBe(true);
    expect(
      needsFirstRunProfile({ role: "customer", phone: "+66123", name: "Ada" })
    ).toBe(false);
    expect(
      needsFirstRunProfile({ role: "freelancer", phone: null, name: "Sam" })
    ).toBe(false);
    expect(
      needsFirstRunProfile({ role: "company", phone: null, name: "Acme" })
    ).toBe(false);
  });
});

describe("isRecentCustomer", () => {
  it("is true within 48 hours for customers", () => {
    const now = Date.parse("2026-08-01T12:00:00.000Z");
    expect(
      isRecentCustomer(
        {
          role: "customer",
          createdAt: "2026-08-01T10:00:00.000Z",
        },
        now
      )
    ).toBe(true);
    expect(
      isRecentCustomer(
        {
          role: "customer",
          createdAt: "2026-07-20T10:00:00.000Z",
        },
        now
      )
    ).toBe(false);
    expect(
      isRecentCustomer(
        {
          role: "freelancer",
          createdAt: "2026-08-01T10:00:00.000Z",
        },
        now
      )
    ).toBe(false);
  });
});

describe("withWelcomeQuery", () => {
  it("appends welcome=1 safely", () => {
    expect(withWelcomeQuery("/en/portal")).toBe("/en/portal?welcome=1");
    expect(withWelcomeQuery("/en/portal?x=1")).toBe("/en/portal?x=1&welcome=1");
    expect(withWelcomeQuery("/en/portal#top")).toBe("/en/portal?welcome=1#top");
    expect(withWelcomeQuery("//evil.example")).toBe("//evil.example");
  });
});
