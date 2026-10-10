"use client";

import { useEffect, useRef } from "react";
import type { Map as LeafletMap } from "leaflet";

export type MapPoint = {
  id: string;
  href: string;
  label: string;
  latitude: number;
  longitude: number;
};

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export default function OfficeMapCanvas({
  points,
  height = 320,
}: {
  points: MapPoint[];
  height?: number;
}) {
  const node = useRef<HTMLDivElement>(null);
  const mapRef = useRef<LeafletMap | null>(null);

  useEffect(() => {
    let cancelled = false;
    const element = node.current;
    if (!element) return;

    void (async () => {
      const leaflet = await import("leaflet");
      await import("leaflet/dist/leaflet.css");
      if (cancelled || !node.current) return;
      const L = leaflet.default ?? leaflet;
      const map = L.map(node.current, { scrollWheelZoom: false });
      mapRef.current = map;
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
        maxZoom: 18,
      }).addTo(map);

      const grouped = new Map<string, MapPoint[]>();
      const shouldCluster = points.length > 40;
      for (const point of points) {
        const key = shouldCluster
          ? `${point.latitude.toFixed(1)},${point.longitude.toFixed(1)}`
          : point.id;
        grouped.set(key, [...(grouped.get(key) ?? []), point]);
      }

      const layer = L.featureGroup();
      for (const members of grouped.values()) {
        const first = members[0];
        if (!first) continue;
        const marker = L.circleMarker([first.latitude, first.longitude], {
          radius: members.length > 1 ? 14 : 8,
          color: "#21438f",
          weight: 2,
          fillColor: "#f5c518",
          fillOpacity: 0.95,
        });
        const label =
          members.length > 1
            ? `<strong>${members.length}</strong><br/>${members
                .slice(0, 8)
                .map((item) => `<a href="${escapeHtml(item.href)}">${escapeHtml(item.label)}</a>`)
                .join("<br/>")}`
            : `<a href="${escapeHtml(first.href)}">${escapeHtml(first.label)}</a>`;
        marker.bindPopup(label);
        marker.addTo(layer);
      }
      layer.addTo(map);
      if (points.length === 1 && points[0]) {
        map.setView([points[0].latitude, points[0].longitude], 15);
      } else if (points.length > 1) {
        map.fitBounds(layer.getBounds().pad(0.2));
      } else {
        map.setView([13.4, 101.0], 5);
      }
      window.setTimeout(() => map.invalidateSize(), 0);
    })();

    return () => {
      cancelled = true;
      mapRef.current?.remove();
      mapRef.current = null;
    };
  }, [points]);

  return <div ref={node} style={{ height }} className="z-0 w-full overflow-hidden rounded-xl border border-border" />;
}
