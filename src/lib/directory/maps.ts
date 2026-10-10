const THAILAND_LAT = { min: 5.5, max: 20.6 };
const THAILAND_LNG = { min: 97.2, max: 105.8 };

export function isHttpUrl(value: string | null | undefined): boolean {
  if (!value) return false;
  try {
    const url = new URL(value.trim());
    return url.protocol === "https:" || url.protocol === "http:";
  } catch {
    return false;
  }
}

export function isThailandCoordinate(
  latitude: number | null | undefined,
  longitude: number | null | undefined
): boolean {
  if (latitude == null || longitude == null) return false;
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return false;
  return (
    latitude >= THAILAND_LAT.min &&
    latitude <= THAILAND_LAT.max &&
    longitude >= THAILAND_LNG.min &&
    longitude <= THAILAND_LNG.max
  );
}

export type MapTargetInput = {
  googleMapsUrl?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  addressEn?: string | null;
  addressTh?: string | null;
  nameEn?: string | null;
  nameTh?: string | null;
  provinceName?: string | null;
};

/**
 * Prefer a stored Google Maps URL, then verified coordinates, then a search
 * for the stored address. Never invents coordinates.
 */
export function officeMapsHref(input: MapTargetInput): string | null {
  const stored = input.googleMapsUrl?.trim();
  if (stored && isHttpUrl(stored)) return stored;

  if (isThailandCoordinate(input.latitude, input.longitude)) {
    return `https://www.google.com/maps/search/?api=1&query=${input.latitude},${input.longitude}`;
  }

  const address = [input.addressEn, input.addressTh].map((part) => part?.trim()).filter(Boolean);
  const named = [input.nameEn, input.nameTh, input.provinceName].map((part) => part?.trim()).filter(Boolean);
  const query = address.length ? address : named;
  if (query.length === 0) return null;
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent([...query, "Thailand"].join(", "))}`;
}

export function hasMapCoordinates(input: {
  latitude?: number | null;
  longitude?: number | null;
}): boolean {
  return isThailandCoordinate(input.latitude, input.longitude);
}
