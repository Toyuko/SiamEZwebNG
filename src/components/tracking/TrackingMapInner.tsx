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
  type MapCoordinate,
  type TrackingMapHistoryPoint,
} from "@/components/tracking/tracking-map-markers";
import "leaflet/dist/leaflet.css";

export type TrackingMapRealtimeConfig = {
  channel: string;
  authEndpoint: string;
  event: string;
  pusherKey: string;
  pusherCluster: string;
};

type TrackingMapInnerProps = {
  trackingHistory: TrackingMapHistoryPoint[];
  isCurrentlyInTransit: boolean;
  realtime: TrackingMapRealtimeConfig | null;
  locale: string;
  liveLabel: string;
  inTransitLabel: string;
};

function markerHtml(kind: ReturnType<typeof markerKindForStatus>, label: string): string {
  const base =
    "flex h-9 w-9 items-center justify-center rounded-full border-2 border-white shadow-md text-sm font-bold";
  const icons: Record<typeof kind, { bg: string; symbol: string }> = {
    pickup: { bg: "bg-sky-600", symbol: "⌂" },
    dlt: { bg: "bg-amber-600", symbol: "🏛" },
    step: { bg: "bg-slate-600", symbol: "●" },
    delivery: { bg: "bg-emerald-600", symbol: "✓" },
  };
  const { bg, symbol } = icons[kind];
  return `<div class="${base} ${bg} text-white" title="${label}" aria-label="${label}">${symbol}</div>`;
}

function createStatusIcon(status: TrackingStatus, locale: string): L.DivIcon {
  const kind = markerKindForStatus(status);
  const label = markerLabelForStatus(status, locale);
  return L.divIcon({
    className: "tracking-map-marker",
    html: markerHtml(kind, label),
    iconSize: [36, 36],
    iconAnchor: [18, 18],
  });
}

const motorcycleIcon = L.divIcon({
  className: "tracking-map-motorcycle",
  html: `<div style="display:flex;height:44px;width:44px;align-items:center;justify-content:center;border-radius:9999px;border:2px solid #fff;background:#0369a1;box-shadow:0 4px 14px rgba(3,105,161,0.45);font-size:1.25rem" aria-hidden="true">🏍</div>`,
  iconSize: [44, 44],
  iconAnchor: [22, 22],
});

function FitBounds({ points }: { points: MapCoordinate[] }) {
  const map = useMap();

  useEffect(() => {
    const bounds = boundsFromCoordinates(points);
    if (bounds) {
      map.fitBounds(bounds, { padding: [48, 48], maxZoom: 15 });
    } else {
      map.setView([DEFAULT_MAP_CENTER.latitude, DEFAULT_MAP_CENTER.longitude], 12);
    }
  }, [map, points]);

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
}: {
  target: MapCoordinate;
  animate: boolean;
}) {
  const [position, setPosition] = useState<MapCoordinate>(target);
  const frameRef = useRef<number | null>(null);
  const fromRef = useRef<MapCoordinate>(target);

  useEffect(() => {
    if (!animate) {
      setPosition(target);
      fromRef.current = target;
      return;
    }

    const from = fromRef.current;
    const start = performance.now();
    const duration = 800;

    const tick = (now: number) => {
      const progress = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setPosition(interpolateCoordinate(from, target, eased));

      if (progress < 1) {
        frameRef.current = requestAnimationFrame(tick);
      } else {
        fromRef.current = target;
      }
    };

    frameRef.current = requestAnimationFrame(tick);
    return () => {
      if (frameRef.current != null) cancelAnimationFrame(frameRef.current);
    };
  }, [target.latitude, target.longitude, animate]);

  return (
    <Marker
      position={[position.latitude, position.longitude]}
      icon={motorcycleIcon}
      zIndexOffset={1000}
    />
  );
}

export function TrackingMapInner({
  trackingHistory,
  isCurrentlyInTransit,
  realtime,
  locale,
  liveLabel,
  inTransitLabel,
}: TrackingMapInnerProps) {
  const historyPoints = useMemo(
    () => historyPointsWithCoordinates(trackingHistory),
    [trackingHistory]
  );

  const routePositions = useMemo(
    () => historyPoints.map((p) => [p.latitude, p.longitude] as [number, number]),
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

  const handleLocationUpdate = useCallback(
    (payload: {
      latitude: number;
      longitude: number;
      timestamp?: string;
      jobId?: string;
    }) => {
      setAnimateLive(true);
      setLivePosition({
        latitude: payload.latitude,
        longitude: payload.longitude,
      });
    },
    []
  );

  useEffect(() => {
    if (!isCurrentlyInTransit || !realtime) return;

    const pusher = getPusherClient();
    if (!pusher) return;

    const channel = pusher.subscribe(realtime.channel);

    channel.bind(realtime.event, handleLocationUpdate);

    return () => {
      channel.unbind(realtime.event, handleLocationUpdate);
      pusher.unsubscribe(realtime.channel);
    };
  }, [handleLocationUpdate, isCurrentlyInTransit, realtime]);

  const mapCenter: [number, number] =
    historyPoints.length > 0
      ? [historyPoints[0].latitude, historyPoints[0].longitude]
      : [DEFAULT_MAP_CENTER.latitude, DEFAULT_MAP_CENTER.longitude];

  const fitPoints: MapCoordinate[] = useMemo(() => {
    const points = historyPoints.map((p) => ({
      latitude: p.latitude,
      longitude: p.longitude,
    }));
    if (livePosition) points.push(livePosition);
    return points;
  }, [historyPoints, livePosition]);

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

      {isCurrentlyInTransit && livePosition && (
        <div className="absolute right-3 top-3 z-[1000] rounded-full bg-siam-blue/90 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-white shadow">
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

        {historyPoints.map((point) => (
          <Marker
            key={point.id}
            position={[point.latitude, point.longitude]}
            icon={createStatusIcon(point.status, locale)}
          />
        ))}

        {isCurrentlyInTransit && livePosition && (
          <AnimatedMotorcycleMarker target={livePosition} animate={animateLive} />
        )}
      </MapContainer>
    </div>
  );
}
