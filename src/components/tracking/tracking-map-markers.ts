import type { TrackingStatus } from "@prisma/client";

export type MapCoordinate = {
  latitude: number;
  longitude: number;
};

export type TrackingMapHistoryPoint = {
  id: string;
  status: TrackingStatus;
  latitude: number | null;
  longitude: number | null;
  createdAt: string;
};

/** True when both values are finite numbers within valid WGS84 ranges. */
export function isValidCoordinatePair(
  latitude: unknown,
  longitude: unknown
): boolean {
  const lat = typeof latitude === "string" ? Number(latitude) : latitude;
  const lng = typeof longitude === "string" ? Number(longitude) : longitude;

  return (
    typeof lat === "number" &&
    typeof lng === "number" &&
    Number.isFinite(lat) &&
    Number.isFinite(lng) &&
    lat >= -90 &&
    lat <= 90 &&
    lng >= -180 &&
    lng <= 180
  );
}

/** Leaflet expects `[lat, lng]` — returns null if invalid. */
export function toLeafletPosition(
  coordinate: MapCoordinate | null | undefined
): [number, number] | null {
  if (!coordinate) return null;
  if (!isValidCoordinatePair(coordinate.latitude, coordinate.longitude)) {
    return null;
  }
  return [coordinate.latitude, coordinate.longitude];
}

/**
 * Normalizes GPS payloads from Pusher / mobile apps.
 * Supports `{ latitude, longitude }`, `{ lat, lng }`, and nested `location` / `coords`.
 */
export function parseGpsPayload(payload: unknown): MapCoordinate | null {
  if (payload == null || typeof payload !== "object") return null;

  const root = payload as Record<string, unknown>;

  if (isValidCoordinatePair(root.latitude, root.longitude)) {
    return {
      latitude: Number(root.latitude),
      longitude: Number(root.longitude),
    };
  }

  if (isValidCoordinatePair(root.lat, root.lng)) {
    return {
      latitude: Number(root.lat),
      longitude: Number(root.lng),
    };
  }

  const nested = root.location ?? root.coords ?? root.coordinate;
  if (nested != null && typeof nested === "object") {
    const inner = nested as Record<string, unknown>;
    if (isValidCoordinatePair(inner.latitude, inner.longitude)) {
      return {
        latitude: Number(inner.latitude),
        longitude: Number(inner.longitude),
      };
    }
    if (isValidCoordinatePair(inner.lat, inner.lng)) {
      return {
        latitude: Number(inner.lat),
        longitude: Number(inner.lng),
      };
    }
  }

  return null;
}

export function historyPointsWithCoordinates(
  history: TrackingMapHistoryPoint[]
): Array<TrackingMapHistoryPoint & MapCoordinate> {
  return history.flatMap((entry) => {
    if (!isValidCoordinatePair(entry.latitude, entry.longitude)) {
      return [];
    }
    return [
      {
        ...entry,
        latitude: Number(entry.latitude),
        longitude: Number(entry.longitude),
      },
    ];
  });
}

export type MarkerKind = "pickup" | "dlt" | "step" | "delivery";

export function markerKindForStatus(status: TrackingStatus): MarkerKind {
  switch (status) {
    case "DOCUMENTS_PENDING":
      return "pickup";
    case "DLT_EXAM_PREP":
    case "DLT_INSPECTION":
      return "dlt";
    case "DELIVERED":
      return "delivery";
    default:
      return "step";
  }
}

export function markerLabelForStatus(status: TrackingStatus, locale: string): string {
  const labels: Record<TrackingStatus, { en: string; th: string }> = {
    DOCUMENTS_PENDING: { en: "Pickup", th: "รับเอกสาร" },
    APPOINTMENT_SET: { en: "Appointment", th: "นัดหมาย" },
    DLT_EXAM_PREP: { en: "DLT Office", th: "กรมขนส่ง" },
    LICENSE_ISSUED: { en: "License issued", th: "ออกใบขับขี่" },
    POR_ROR_BOR_PAID: { en: "Tax paid", th: "ชำระ ป.ร./ร./บ." },
    DLT_INSPECTION: { en: "DLT inspection", th: "ตรวจสภาพ" },
    PLATES_ISSUED: { en: "Plates issued", th: "ออกป้าย" },
    DELIVERED: { en: "Delivered", th: "จัดส่งแล้ว" },
  };
  return locale === "th" ? labels[status].th : labels[status].en;
}

/** Default map center (Bangkok) when no coordinates exist yet. */
export const DEFAULT_MAP_CENTER: MapCoordinate = {
  latitude: 13.7563,
  longitude: 100.5018,
};

export function boundsFromCoordinates(
  points: MapCoordinate[]
): [[number, number], [number, number]] | null {
  if (points.length === 0) return null;
  let minLat = points[0].latitude;
  let maxLat = points[0].latitude;
  let minLng = points[0].longitude;
  let maxLng = points[0].longitude;

  for (const point of points.slice(1)) {
    minLat = Math.min(minLat, point.latitude);
    maxLat = Math.max(maxLat, point.latitude);
    minLng = Math.min(minLng, point.longitude);
    maxLng = Math.max(maxLng, point.longitude);
  }

  const latPad = Math.max((maxLat - minLat) * 0.15, 0.01);
  const lngPad = Math.max((maxLng - minLng) * 0.15, 0.01);

  return [
    [minLat - latPad, minLng - lngPad],
    [maxLat + latPad, maxLng + lngPad],
  ];
}
