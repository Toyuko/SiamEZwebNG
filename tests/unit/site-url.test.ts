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
      resolvePublicSiteUrl({ NEXT_PUBLIC_SITE_URL: "https://siam-ez.com/" })
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
  const attached = { VERCEL_PROJECT_PRODUCTION_URL: "siam-ez.com" };
  const aliasesLive = { ...attached, CANONICAL_ALIAS_REDIRECT: "true" };

  it("redirects www to the apex host and preserves path + query", () => {
    expect(
      getCanonicalHostRedirect("www.siam-ez.com", "/en/services", "?utm=ads")
    ).toBe("https://siam-ez.com/en/services?utm=ads");
  });

  it("redirects the retired Vercel production alias after DNS cutover is opted in", () => {
    expect(
      getCanonicalHostRedirect(
        "siam-e-zweb-ng.vercel.app",
        "/en/services/driver-license",
        "",
        aliasesLive
      )
    ).toBe("https://siam-ez.com/en/services/driver-license");
  });

  it("redirects the team production alias after DNS cutover is opted in", () => {
    expect(
      getCanonicalHostRedirect(
        "siam-e-zweb-ng-toyukos-projects.vercel.app",
        "/th/contact",
        "",
        aliasesLive
      )
    ).toBe("https://siam-ez.com/th/contact");
  });

  it("does not redirect the Vercel alias when the custom domain is only attached in Vercel", () => {
    expect(
      getCanonicalHostRedirect("siam-e-zweb-ng.vercel.app", "/en/vehicle/sell", "?source=line", attached)
    ).toBeNull();
  });

  it("does not redirect the Vercel alias before siam-ez.com is the production domain", () => {
    expect(
      getCanonicalHostRedirect(
        "siam-e-zweb-ng.vercel.app",
        "/en",
        "",
        { VERCEL_PROJECT_PRODUCTION_URL: "siam-e-zweb-ng.vercel.app", CANONICAL_ALIAS_REDIRECT: "true" }
      )
    ).toBeNull();
  });

  it("does not redirect preview deployments", () => {
    expect(
      getCanonicalHostRedirect(
        "siam-e-zweb-ng-git-feat-toyukos-projects.vercel.app",
        "/en",
        "",
        aliasesLive
      )
    ).toBeNull();
  });

  it("does not redirect API, webhook, or cron paths", () => {
    expect(
      getCanonicalHostRedirect("www.siam-ez.com", "/api/stripe/webhook", "", aliasesLive)
    ).toBeNull();
    expect(
      getCanonicalHostRedirect(
        "siam-e-zweb-ng.vercel.app",
        "/api/cron/jobs/auto-approve",
        "",
        aliasesLive
      )
    ).toBeNull();
  });

  it("does not redirect the canonical apex host", () => {
    expect(getCanonicalHostRedirect("siam-ez.com", "/en", "", attached)).toBeNull();
  });
});
