"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  MapContainer,
  Marker,
  Polyline,
  TileLayer,
  useMap,
} from "react-leaflet";
import L from "leaflet";
import type { TrackingStatus } from "@prisma/client";
import { getPusherClient } from "@/lib/pusher-client";
import {
  boundsFromCoordinates,
  DEFAULT_MAP_CENTER,
  historyPointsWithCoordinates,
  markerKindForStatus,
  markerLabelForStatus,
  parseGpsPayload,
  toLeafletPosition,
  type MapCoordinate,
  type TrackingMapHistoryPoint,
} from "@/components/tracking/tracking-map-markers";
import "leaflet/dist/leaflet.css";
import "@/components/tracking/tracking-map.css";

const BRAND_BLUE = "#2C54C6";

export type TrackingMapRealtimeConfig = {
  channel: string;
  legacyChannel?: string;
  authEndpoint: string;
  event: string;
  pusherKey: string;
  pusherCluster: string;
};

type TrackingMapInnerProps = {
  jobId: string;
  trackingHistory: TrackingMapHistoryPoint[];
  isCurrentlyInTransit: boolean;
  realtime: TrackingMapRealtimeConfig | null;
  realtimeDiagnostics?: {
    isCurrentlyInTransit: boolean;
    clientPusherConfigured: boolean;
    serverPusherConfigured: boolean;
    willSubscribe: boolean;
  };
  locale: string;
  liveLabel: string;
  inTransitLabel: string;
};

const STATUS_MARKER_COLORS: Record<
  ReturnType<typeof markerKindForStatus>,
  string
> = {
  pickup: "#0284c7",
  dlt: "#d97706",
  step: "#475569",
  delivery: "#059669",
};

function createMotorcycleIcon(): L.DivIcon {
  return L.divIcon({
    className: "siamez-motorcycle-marker",
    html: `<div class="siamez-motorcycle-marker-inner" aria-hidden="true" style="position:relative">🏍</div>`,
    iconSize: [48, 56],
    iconAnchor: [24, 52],
    popupAnchor: [0, -48],
  });
}

function createStatusIcon(status: TrackingStatus, locale: string): L.DivIcon {
  const kind = markerKindForStatus(status);
  const label = markerLabelForStatus(status, locale);
  const bg = STATUS_MARKER_COLORS[kind];
  const symbols: Record<typeof kind, string> = {
    pickup: "⌂",
    dlt: "🏛",
    step: "●",
    delivery: "✓",
  };

  return L.divIcon({
    className: "siamez-map-marker",
    html: `<div class="siamez-map-marker-inner" style="background:${bg}" title="${label}" aria-label="${label}">${symbols[kind]}</div>`,
    iconSize: [36, 36],
    iconAnchor: [18, 18],
  });
}

function FitBounds({ points }: { points: MapCoordinate[] }) {
  const map = useMap();

  useEffect(() => {
    const bounds = boundsFromCoordinates(points);
    if (bounds) {
      map.fitBounds(bounds, { padding: [48, 48], maxZoom: 15 });
    } else {
      map.setView(
        [DEFAULT_MAP_CENTER.latitude, DEFAULT_MAP_CENTER.longitude],
        12
      );
    }
  }, [map, points]);

  return null;
}

/** Pans the map when live GPS coordinates update so the vehicle stays in view. */
function MapViewController({
  center,
  zoom = 15,
}: {
  center: [number, number] | null;
  zoom?: number;
}) {
  const map = useMap();

  useEffect(() => {
    if (!center) return;
    map.setView(center, Math.max(map.getZoom(), zoom), { animate: true });
  }, [center, map, zoom]);

  return null;
}

function interpolateCoordinate(
  from: MapCoordinate,
  to: MapCoordinate,
  progress: number
): MapCoordinate {
  return {
    latitude: from.latitude + (to.latitude - from.latitude) * progress,
    longitude: from.longitude + (to.longitude - from.longitude) * progress,
  };
}

function AnimatedMotorcycleMarker({
  target,
  animate,
  icon,
}: {
  target: MapCoordinate;
  animate: boolean;
  icon: L.DivIcon;
}) {
  const leafletPosition = toLeafletPosition(target);
  const [position, setPosition] = useState<[number, number] | null>(
    leafletPosition
  );
  const frameRef = useRef<number | null>(null);
  const fromRef = useRef<MapCoordinate>(target);

  useEffect(() => {
    const next = toLeafletPosition(target);
    if (!next) {
      setPosition(null);
      return;
    }

    if (!animate) {
      setPosition(next);
      fromRef.current = target;
      return;
    }

    const from = fromRef.current;
    const fromPos = toLeafletPosition(from);
    if (!fromPos) {
      setPosition(next);
      fromRef.current = target;
      return;
    }

    const start = performance.now();
    const duration = 800;

    const tick = (now: number) => {
      const progress = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      const interpolated = interpolateCoordinate(from, target, eased);
      const framePos = toLeafletPosition(interpolated);
      if (framePos) setPosition(framePos);

      if (progress < 1) {
        frameRef.current = requestAnimationFrame(tick);
      } else {
        fromRef.current = target;
        setPosition(next);
      }
    };

    frameRef.current = requestAnimationFrame(tick);
    return () => {
      if (frameRef.current != null) cancelAnimationFrame(frameRef.current);
    };
  }, [target.latitude, target.longitude, animate, target]);

  if (position == null) return null;

  return (
    <Marker
      key={`motorcycle-${position[0]}-${position[1]}`}
      position={position}
      icon={icon}
      zIndexOffset={1000}
    />
  );
}

export function TrackingMapInner({
  jobId,
  trackingHistory,
  isCurrentlyInTransit,
  realtime,
  realtimeDiagnostics,
  locale,
  liveLabel,
  inTransitLabel,
}: TrackingMapInnerProps) {
  const motorcycleIcon = useMemo(() => createMotorcycleIcon(), []);

  const historyPoints = useMemo(
    () => historyPointsWithCoordinates(trackingHistory),
    [trackingHistory]
  );

  const routePositions = useMemo(
    () =>
      historyPoints
        .map((p) => toLeafletPosition(p))
        .filter((pos): pos is [number, number] => pos != null),
    [historyPoints]
  );

  const initialLivePosition = useMemo<MapCoordinate | null>(() => {
    if (historyPoints.length === 0) return null;
    const last = historyPoints[historyPoints.length - 1];
    return { latitude: last.latitude, longitude: last.longitude };
  }, [historyPoints]);

  const [livePosition, setLivePosition] = useState<MapCoordinate | null>(
    initialLivePosition
  );
  const [animateLive, setAnimateLive] = useState(false);

  useEffect(() => {
    setLivePosition(initialLivePosition);
  }, [initialLivePosition]);

  const handleLocationUpdate = useCallback((payload: unknown) => {
    console.log("GPS Payload Received:", payload);

    const coordinate = parseGpsPayload(payload);
    if (!coordinate) {
      console.warn(
        "[TrackingMap] Ignored GPS payload — missing or invalid latitude/longitude:",
        payload
      );
      return;
    }

    setAnimateLive(true);
    setLivePosition(coordinate);
  }, []);

  useEffect(() => {
    console.log("[TrackingMap] Live GPS setup", {
      jobId,
      isCurrentlyInTransit,
      realtime,
      realtimeDiagnostics,
    });

    if (!isCurrentlyInTransit) {
      console.info(
        "[TrackingMap] Job is not in transit — no Pusher subscription. Set isCurrentlyInTransit=true on the job to enable live GPS."
      );
      return;
    }

    if (!realtime) {
      console.warn(
        "[TrackingMap] In transit but realtime config is missing. Check NEXT_PUBLIC_PUSHER_KEY and NEXT_PUBLIC_PUSHER_CLUSTER in .env",
        realtimeDiagnostics
      );
      return;
    }

    const pusher = getPusherClient();
    if (!pusher) {
      console.warn(
        "[TrackingMap] Pusher client could not be created — live GPS disabled. Check NEXT_PUBLIC_PUSHER_KEY / NEXT_PUBLIC_PUSHER_CLUSTER."
      );
      return;
    }

    const channelsToSubscribe = [
      realtime.channel,
      ...(realtime.legacyChannel && realtime.legacyChannel !== realtime.channel
        ? [realtime.legacyChannel]
        : []),
    ];

    console.log("[TrackingMap] Subscribing to channels:", channelsToSubscribe);

    const subscribed = channelsToSubscribe.map((name) => {
      const channel = pusher.subscribe(name);

      channel.bind("pusher:subscription_succeeded", () => {
        console.log("[TrackingMap] Pusher subscription succeeded:", name);
      });

      channel.bind("pusher:subscription_error", (status: unknown) => {
        console.error("[TrackingMap] Pusher subscription failed:", name, status);
      });

      channel.bind(realtime.event, handleLocationUpdate);
      return { name, channel };
    });

    return () => {
      for (const { name, channel } of subscribed) {
        channel.unbind(realtime.event, handleLocationUpdate);
        channel.unbind("pusher:subscription_succeeded");
        channel.unbind("pusher:subscription_error");
        pusher.unsubscribe(name);
      }
    };
  }, [
    handleLocationUpdate,
    isCurrentlyInTransit,
    jobId,
    realtime,
    realtimeDiagnostics,
  ]);

  const liveLeafletPosition = useMemo(
    () => toLeafletPosition(livePosition),
    [livePosition]
  );

  const mapCenter = useMemo<[number, number]>(() => {
    if (liveLeafletPosition) return liveLeafletPosition;
    if (historyPoints.length > 0) {
      const first = historyPoints[0];
      const pos = toLeafletPosition(first);
      if (pos) return pos;
    }
    return [DEFAULT_MAP_CENTER.latitude, DEFAULT_MAP_CENTER.longitude];
  }, [liveLeafletPosition, historyPoints]);

  const fitPoints: MapCoordinate[] = useMemo(() => {
    const points = historyPoints.map((p) => ({
      latitude: p.latitude,
      longitude: p.longitude,
    }));
    if (livePosition && toLeafletPosition(livePosition)) {
      points.push(livePosition);
    }
    return points;
  }, [historyPoints, livePosition]);

  const showMotorcycleMarker =
    isCurrentlyInTransit &&
    livePosition != null &&
    liveLeafletPosition != null;

  return (
    <div className="relative overflow-hidden rounded-xl">
      {isCurrentlyInTransit && (
        <div className="absolute left-3 top-3 z-[1000] inline-flex items-center gap-2 rounded-full bg-white/95 px-3 py-1.5 text-xs font-medium text-siam-blue shadow-md ring-1 ring-sky-100 dark:bg-slate-900/95 dark:ring-slate-700">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
          </span>
          {inTransitLabel}
        </div>
      )}

      {showMotorcycleMarker && (
        <div
          className="absolute right-3 top-3 z-[1000] rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-white shadow"
          style={{ backgroundColor: BRAND_BLUE }}
        >
          {liveLabel}
        </div>
      )}

      <MapContainer
        center={mapCenter}
        zoom={12}
        scrollWheelZoom={false}
        className="h-[min(420px,55vh)] w-full z-0"
        attributionControl
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        <FitBounds points={fitPoints} />
        <MapViewController center={liveLeafletPosition} />

        {routePositions.length >= 2 && (
          <Polyline
            positions={routePositions}
            pathOptions={{
              color: "#0ea5e9",
              weight: 3,
              opacity: 0.85,
              dashArray: "8 10",
            }}
          />
        )}

        {historyPoints.map((point) => {
          const position = toLeafletPosition(point);
          if (!position) return null;

          return (
            <Marker
              key={point.id}
              position={position}
              icon={createStatusIcon(point.status, locale)}
            />
          );
        })}

        {showMotorcycleMarker && livePosition && (
          <AnimatedMotorcycleMarker
            target={livePosition}
            animate={animateLive}
            icon={motorcycleIcon}
          />
        )}
      </MapContainer>
    </div>
  );
}
