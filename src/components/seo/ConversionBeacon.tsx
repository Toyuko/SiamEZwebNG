"use client";

import { useEffect, useRef } from "react";
import { trackEvent, type AnalyticsEventName, type AnalyticsEventPayload } from "@/lib/analytics";

type ConversionBeaconProps = {
  event: AnalyticsEventName;
  payload?: AnalyticsEventPayload;
};

/** Fires a conversion event once per mount (e.g. booking confirmation). */
export function ConversionBeacon({ event, payload }: ConversionBeaconProps) {
  const fired = useRef(false);

  useEffect(() => {
    if (fired.current) return;
    fired.current = true;
    trackEvent(event, payload);
    // Intentionally once per mount; payload is captured on first render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [event]);

  return null;
}
