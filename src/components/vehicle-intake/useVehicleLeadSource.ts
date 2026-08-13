"use client";

import { useSearchParams } from "next/navigation";
import { useMemo } from "react";

export function useVehicleLeadSource() {
  const params = useSearchParams();
  return useMemo(
    () => ({
      source: params.get("source") ?? undefined,
      utmSource: params.get("utm_source") ?? undefined,
      utmMedium: params.get("utm_medium") ?? undefined,
      utmCampaign: params.get("utm_campaign") ?? undefined,
      ref: params.get("ref") ?? undefined,
    }),
    [params]
  );
}

export function trackVehicleEvent(kind: string, meta?: Record<string, unknown>, locale?: string) {
  void fetch("/api/vehicle-leads/events", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ kind, meta, locale }),
  }).catch(() => undefined);
}
