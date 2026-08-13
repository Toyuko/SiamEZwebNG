"use client";

import { useEffect } from "react";
import { trackEvent } from "@/lib/analytics";
import {
  dispatchTawkMaximized,
  getTawkConfig,
  TAWK_OPEN_EVENT,
  tawkEmbedSrc,
  type TawkOpenDetail,
} from "@/lib/tawk";

const SCRIPT_ID = "tawk-embed-script";

function applyHandoff(detail?: TawkOpenDetail) {
  const api = window.Tawk_API;
  if (!api) return;
  api.showWidget?.();
  api.maximize?.();
  const summary = detail?.summary?.trim();
  if (summary) {
    api.addEvent?.("Concierge handoff", { summary }, () => {});
    api.addTags?.(["ask-siamez"], () => {});
  }
}

/**
 * Loads the tawk.to embed on public pages and opens it when Concierge
 * dispatches a staff-handoff event. Hidden on unmount so portal/admin
 * layouts are not covered by a leftover bubble.
 */
export function TawkWidget() {
  const config = getTawkConfig();
  const propertyId = config?.propertyId;
  const widgetId = config?.widgetId;

  useEffect(() => {
    if (!propertyId || !widgetId) return;
    const embed = { propertyId, widgetId };

    const api = (window.Tawk_API ??= {});
    window.Tawk_LoadStart = window.Tawk_LoadStart ?? new Date();

    let loaded = typeof api.maximize === "function";
    let pending: TawkOpenDetail | null = null;

    const previousOnLoad = api.onLoad;
    const previousOnMaximized = api.onChatMaximized;

    api.onLoad = () => {
      previousOnLoad?.();
      loaded = true;
      api.showWidget?.();
      if (pending) {
        applyHandoff(pending);
        pending = null;
      }
    };

    api.onChatMaximized = () => {
      previousOnMaximized?.();
      dispatchTawkMaximized();
    };

    const onOpen = (event: Event) => {
      const detail = (event as CustomEvent<TawkOpenDetail>).detail;
      trackEvent("ai_concierge_tawk_handoff");
      if (!loaded) {
        pending = detail ?? {};
        return;
      }
      applyHandoff(detail);
    };

    window.addEventListener(TAWK_OPEN_EVENT, onOpen);

    if (!document.getElementById(SCRIPT_ID)) {
      const script = document.createElement("script");
      script.id = SCRIPT_ID;
      script.async = true;
      script.src = tawkEmbedSrc(embed);
      script.charset = "UTF-8";
      script.setAttribute("crossorigin", "*");
      document.body.appendChild(script);
    } else if (loaded) {
      api.showWidget?.();
    }

    return () => {
      window.removeEventListener(TAWK_OPEN_EVENT, onOpen);
      window.Tawk_API?.hideWidget?.();
    };
  }, [propertyId, widgetId]);

  return null;
}
