import { describe, expect, it } from "vitest";
import { site } from "@/config/site";
import {
  getGoogleMapsApiKey,
  officeGoogleMapsEmbedUrl,
  officeGoogleMapsUrl,
  officeLocatorConfiguration,
} from "@/lib/maps";

describe("office maps helpers", () => {
  it("builds a Google Maps place URL with the office Place ID", () => {
    const url = officeGoogleMapsUrl();
    expect(url).toContain("query_place_id=ChIJoQi-v8JJA68RqRtvTftrbw8");
    expect(url).toContain(encodeURIComponent("66 Tower"));
  });

  it("builds a locale-aware embed URL at the office coordinates", () => {
    const en = officeGoogleMapsEmbedUrl("en");
    const th = officeGoogleMapsEmbedUrl("th");
    expect(en).toContain(`q=${site.address.coords.lat},${site.address.coords.lng}`);
    expect(en).toContain("hl=en");
    expect(th).toContain("hl=th");
    expect(en).toContain("output=embed");
  });

  it("reads the public Maps API key when set", () => {
    expect(getGoogleMapsApiKey({})).toBeNull();
    expect(getGoogleMapsApiKey({ NEXT_PUBLIC_GOOGLE_MAPS_API_KEY: "  " })).toBeNull();
    expect(getGoogleMapsApiKey({ NEXT_PUBLIC_GOOGLE_MAPS_API_KEY: " AIzaTest " })).toBe(
      "AIzaTest"
    );
  });

  it("configures Locator Plus for the Bangkok office only", () => {
    const config = officeLocatorConfiguration("AIzaTest");
    expect(config.mapsApiKey).toBe("AIzaTest");
    expect(config.locations).toHaveLength(1);
    expect(config.locations[0]).toMatchObject({
      title: "SiamEZ",
      placeId: site.address.placeId,
      coords: site.address.coords,
    });
    expect(config.mapOptions.center).toEqual(site.address.coords);
    expect(config.capabilities).toEqual({
      input: false,
      autocomplete: false,
      directions: false,
      distanceMatrix: false,
      details: false,
      actions: false,
    });
  });
});
