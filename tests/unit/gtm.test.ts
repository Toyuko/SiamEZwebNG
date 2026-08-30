import { describe, expect, it } from "vitest";
import { DEFAULT_GTM_ID, getGtmId } from "@/lib/gtm";

describe("gtm config", () => {
  it("uses the SiamEZ container by default", () => {
    expect(getGtmId({})).toBe(DEFAULT_GTM_ID);
    expect(DEFAULT_GTM_ID).toBe("GTM-T6C7CWGM");
  });

  it("can be disabled", () => {
    expect(getGtmId({ NEXT_PUBLIC_GTM_DISABLED: "true" })).toBeNull();
    expect(getGtmId({ NEXT_PUBLIC_GTM_DISABLED: "1" })).toBeNull();
  });

  it("allows env overrides", () => {
    expect(getGtmId({ NEXT_PUBLIC_GTM_ID: "GTM-ABCDEF12" })).toBe("GTM-ABCDEF12");
  });

  it("rejects invalid ids", () => {
    expect(getGtmId({ NEXT_PUBLIC_GTM_ID: "not-a-gtm-id" })).toBeNull();
    expect(getGtmId({ NEXT_PUBLIC_GTM_ID: "GTM-ABC/123" })).toBeNull();
  });
});
