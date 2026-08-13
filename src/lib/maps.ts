import { site } from "@/config/site";

export const GOOGLE_MAPS_EXTENDED_LIBRARY_SRC =
  "https://ajax.googleapis.com/ajax/libs/@googlemaps/extended-component-library/0.6.15/index.min.js";

export const GOOGLE_MAPS_DEMO_MAP_ID = "DEMO_MAP_ID";

export type MapsEnv = Record<string, string | undefined>;

export type OfficeLocatorConfiguration = {
  locations: Array<{
    title: string;
    address1: string;
    address2: string;
    coords: { lat: number; lng: number };
    placeId: string;
  }>;
  mapOptions: {
    center: { lat: number; lng: number };
    fullscreenControl: boolean;
    mapTypeControl: boolean;
    streetViewControl: boolean;
    zoom: number;
    zoomControl: boolean;
    maxZoom: number;
    mapId: string;
  };
  mapsApiKey: string;
  capabilities: {
    input: boolean;
    autocomplete: boolean;
    directions: boolean;
    distanceMatrix: boolean;
    details: boolean;
    actions: boolean;
  };
};

export function getGoogleMapsApiKey(env: MapsEnv = process.env): string | null {
  const key = env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY?.trim();
  return key ? key : null;
}

/** Google Maps place URL for the Bangkok office (opens in Maps). */
export function officeGoogleMapsUrl(): string {
  const query = encodeURIComponent(`${site.address.line1}, ${site.address.line2}`);
  return `https://www.google.com/maps/search/?api=1&query=${query}&query_place_id=${site.address.placeId}`;
}

/** Keyless embed URL used when the Maps JavaScript API key is not set. */
export function officeGoogleMapsEmbedUrl(locale: string): string {
  const { lat, lng } = site.address.coords;
  const hl = locale === "th" ? "th" : "en";
  return `https://maps.google.com/maps?q=${lat},${lng}&z=16&hl=${hl}&output=embed`;
}

/**
 * Locator Plus Quick Builder config for the SiamEZ office.
 * Extra store-locator capabilities stay off — this is a single office pin.
 */
export function officeLocatorConfiguration(apiKey: string): OfficeLocatorConfiguration {
  return {
    locations: [
      {
        title: site.name,
        address1: site.address.line1,
        address2: site.address.line2,
        coords: site.address.coords,
        placeId: site.address.placeId,
      },
    ],
    mapOptions: {
      center: site.address.coords,
      fullscreenControl: true,
      mapTypeControl: false,
      streetViewControl: false,
      zoom: 16,
      zoomControl: true,
      maxZoom: 17,
      mapId: "",
    },
    mapsApiKey: apiKey,
    capabilities: {
      input: false,
      autocomplete: false,
      directions: false,
      distanceMatrix: false,
      details: false,
      actions: false,
    },
  };
}
