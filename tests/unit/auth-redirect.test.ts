import { describe, expect, it } from "vitest";
import {
  resolvePostAuthRedirect,
  safeRedirectQueryParam,
} from "@/lib/auth-redirect";

describe("resolvePostAuthRedirect", () => {
  it("uses role-based portal fallbacks", () => {
    expect(resolvePostAuthRedirect("en", null, "customer")).toBe("/en/portal");
    expect(resolvePostAuthRedirect("th", undefined, "freelancer")).toBe(
      "/th/portal/freelancer"
    );
    expect(resolvePostAuthRedirect("en", "", "company")).toBe("/en/portal/company");
  });

  it("allows same-origin relative redirects", () => {
    expect(resolvePostAuthRedirect("en", "/en/portal/cases", "customer")).toBe(
      "/en/portal/cases"
    );
  });

  it("blocks open redirects", () => {
    expect(resolvePostAuthRedirect("en", "https://evil.example", "customer")).toBe(
      "/en/portal"
    );
    expect(resolvePostAuthRedirect("en", "//evil.example", "customer")).toBe(
      "/en/portal"
    );
    expect(resolvePostAuthRedirect("en", "javascript:alert(1)", "customer")).toBe(
      "/en/portal"
    );
  });
});

describe("safeRedirectQueryParam", () => {
  it("returns only safe relative paths", () => {
    expect(safeRedirectQueryParam("/en/book/marriage-registration")).toBe(
      "/en/book/marriage-registration"
    );
    expect(safeRedirectQueryParam("//evil.example")).toBeUndefined();
    expect(safeRedirectQueryParam("https://evil.example")).toBeUndefined();
    expect(safeRedirectQueryParam(null)).toBeUndefined();
  });
});
