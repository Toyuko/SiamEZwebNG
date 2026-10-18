import { describe, expect, it } from "vitest";
import {
  CHATWOOT_CLOUD_BASE_URL,
  getChatwootPublicConfig,
  isChatwootRouteEnabled,
} from "@/lib/chatwoot";

describe("getChatwootPublicConfig", () => {
  it("returns null when website token is missing", () => {
    expect(getChatwootPublicConfig({})).toBeNull();
    expect(getChatwootPublicConfig({ NEXT_PUBLIC_CHATWOOT_WEBSITE_TOKEN: "  " })).toBeNull();
  });

  it("defaults to Chatwoot Cloud base URL", () => {
    expect(
      getChatwootPublicConfig({
        NEXT_PUBLIC_CHATWOOT_WEBSITE_TOKEN: "abc123",
      })
    ).toEqual({
      websiteToken: "abc123",
      baseUrl: CHATWOOT_CLOUD_BASE_URL,
    });
  });

  it("uses custom base URL without trailing slash", () => {
    expect(
      getChatwootPublicConfig({
        NEXT_PUBLIC_CHATWOOT_WEBSITE_TOKEN: "abc123",
        NEXT_PUBLIC_CHATWOOT_BASE_URL: "https://chat.example.com/",
      })
    ).toEqual({
      websiteToken: "abc123",
      baseUrl: "https://chat.example.com",
    });
  });
});

describe("isChatwootRouteEnabled", () => {
  it("enables public, booking, portal, and auth routes", () => {
    expect(isChatwootRouteEnabled("/en")).toBe(true);
    expect(isChatwootRouteEnabled("/en/services")).toBe(true);
    expect(isChatwootRouteEnabled("/en/booking/marriage-registration")).toBe(true);
    expect(isChatwootRouteEnabled("/en/checkout")).toBe(true);
    expect(isChatwootRouteEnabled("/en/portal")).toBe(true);
    expect(isChatwootRouteEnabled("/en/login")).toBe(true);
  });

  it("disables admin and staff tools", () => {
    expect(isChatwootRouteEnabled("/en/admin")).toBe(false);
    expect(isChatwootRouteEnabled("/en/admin/cases")).toBe(false);
    expect(isChatwootRouteEnabled("/th/staff-calendar")).toBe(false);
  });
});
