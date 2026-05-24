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

export function historyPointsWithCoordinates(
  history: TrackingMapHistoryPoint[]
): Array<TrackingMapHistoryPoint & MapCoordinate> {
  return history.filter(
    (entry): entry is TrackingMapHistoryPoint & MapCoordinate =>
      entry.latitude != null && entry.longitude != null
  );
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
