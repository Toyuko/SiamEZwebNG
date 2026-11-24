import { describe, expect, it } from "vitest";
import {
  getCanonicalHostRedirect,
  LOCAL_SITE_ORIGIN,
  PRODUCTION_SITE_ORIGIN,
  resolvePublicSiteUrl,
} from "@/config/site-url";

describe("resolvePublicSiteUrl", () => {
  it("uses NEXT_PUBLIC_SITE_URL when set", () => {
    expect(
      resolvePublicSiteUrl({
        NEXT_PUBLIC_SITE_URL: "https://siam-e-zweb-ng.vercel.app/",
      })
    ).toBe(PRODUCTION_SITE_ORIGIN);
  });

  it("uses the canonical production host on Vercel production", () => {
    expect(
      resolvePublicSiteUrl({
        VERCEL_ENV: "production",
        VERCEL_URL: "siam-e-zweb-ng.vercel.app",
      })
    ).toBe(PRODUCTION_SITE_ORIGIN);
  });

  it("uses the preview deployment URL on Vercel preview", () => {
    expect(
      resolvePublicSiteUrl({
        VERCEL_ENV: "preview",
        VERCEL_URL: "siam-e-zweb-ng-git-feat-toyukos-projects.vercel.app",
      })
    ).toBe("https://siam-e-zweb-ng-git-feat-toyukos-projects.vercel.app");
  });

  it("uses localhost in development", () => {
    expect(resolvePublicSiteUrl({ NODE_ENV: "development" })).toBe(LOCAL_SITE_ORIGIN);
  });

  it("falls back to the production origin for production Node builds", () => {
    expect(resolvePublicSiteUrl({ NODE_ENV: "production" })).toBe(PRODUCTION_SITE_ORIGIN);
  });
});

describe("getCanonicalHostRedirect", () => {
  it("redirects www to the temporary vercel.app host and preserves path + query", () => {
    expect(
      getCanonicalHostRedirect("www.siam-ez.com", "/en/services", "?utm=ads")
    ).toBe("https://siam-e-zweb-ng.vercel.app/en/services?utm=ads");
  });

  it("redirects the custom domain onto the temporary vercel.app host", () => {
    expect(
      getCanonicalHostRedirect("siam-ez.com", "/en/services/driver-license")
    ).toBe("https://siam-e-zweb-ng.vercel.app/en/services/driver-license");
  });

  it("redirects the team production alias onto the canonical vercel.app host", () => {
    expect(
      getCanonicalHostRedirect(
        "siam-e-zweb-ng-toyukos-projects.vercel.app",
        "/th/contact"
      )
    ).toBe("https://siam-e-zweb-ng.vercel.app/th/contact");
  });

  it("does not redirect preview deployments", () => {
    expect(
      getCanonicalHostRedirect(
        "siam-e-zweb-ng-git-feat-toyukos-projects.vercel.app",
        "/en"
      )
    ).toBeNull();
  });

  it("does not redirect API, webhook, or cron paths", () => {
    expect(
      getCanonicalHostRedirect("www.siam-ez.com", "/api/stripe/webhook")
    ).toBeNull();
    expect(
      getCanonicalHostRedirect(
        "siam-ez.com",
        "/api/cron/jobs/auto-approve"
      )
    ).toBeNull();
  });

  it("does not redirect the canonical production host", () => {
    expect(
      getCanonicalHostRedirect("siam-e-zweb-ng.vercel.app", "/en")
    ).toBeNull();
  });
});
