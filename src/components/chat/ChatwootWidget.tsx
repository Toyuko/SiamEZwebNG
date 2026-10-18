"use client";

import { useEffect } from "react";
import Script from "next/script";
import { usePathname } from "next/navigation";
import {
  CHATWOOT_CLOUD_BASE_URL,
  isChatwootRouteEnabled,
} from "@/lib/chatwoot";

declare global {
  interface Window {
    chatwootSettings?: Record<string, unknown>;
    chatwootSDK?: {
      run: (config: { websiteToken: string; baseUrl: string }) => void;
    };
    $chatwoot?: {
      toggleBubbleVisibility?: (state: "show" | "hide") => void;
    };
  }
}

const HIDE_STYLE_ID = "siamez-chatwoot-hide-style";
let sdkStarted = false;

function ensureHideStyle() {
  if (typeof document === "undefined") return;
  if (document.getElementById(HIDE_STYLE_ID)) return;
  const style = document.createElement("style");
  style.id = HIDE_STYLE_ID;
  style.textContent = `
    body[data-chatwoot-hide="1"] .woot-widget-bubble,
    body[data-chatwoot-hide="1"] .woot--bubble-holder,
    body[data-chatwoot-hide="1"] .woot-widget-holder {
      display: none !important;
    }
  `;
  document.head.appendChild(style);
}

function setChatwootRouteVisibility(pathname: string) {
  ensureHideStyle();
  const enabled = isChatwootRouteEnabled(pathname);
  document.body.dataset.chatwootHide = enabled ? "0" : "1";
  // Prefer CSS hide during App Router transitions — calling Chatwoot APIs
  // mid-navigation has crashed client-side routing in production.
}

/**
 * Official Chatwoot website widget (next/script + lazyOnload).
 * Must not re-inject the SDK on App Router navigations — that takes down
 * client-side routing with a blank "Application error" page.
 */
export function ChatwootWidget() {
  const pathname = usePathname() ?? "";
  const websiteToken = process.env.NEXT_PUBLIC_CHATWOOT_WEBSITE_TOKEN?.trim() ?? "";
  const baseUrl =
    process.env.NEXT_PUBLIC_CHATWOOT_BASE_URL?.trim().replace(/\/$/, "") ||
    CHATWOOT_CLOUD_BASE_URL;

  useEffect(() => {
    if (!websiteToken || typeof window === "undefined") return;
    try {
      setChatwootRouteVisibility(pathname);
    } catch {
      // Third-party widget must never break navigation.
    }
  }, [pathname, websiteToken]);

  if (!websiteToken) return null;

  return (
    <Script
      id="siamez-chatwoot-sdk"
      src={`${baseUrl}/packs/js/sdk.js`}
      strategy="lazyOnload"
      onLoad={() => {
        try {
          if (sdkStarted) {
            setChatwootRouteVisibility(window.location.pathname || "");
            return;
          }
          window.chatwootSettings = {
            hideMessageBubble: false,
            position: "right",
            locale: "en",
            type: "standard",
            darkMode: "auto",
          };
          window.chatwootSDK?.run({
            websiteToken,
            baseUrl,
          });
          sdkStarted = true;
          setChatwootRouteVisibility(window.location.pathname || "");
        } catch {
          // Ignore SDK init failures — site navigation must keep working.
        }
      }}
    />
  );
}
