"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import {
  CHATWOOT_CLOUD_BASE_URL,
  isChatwootRouteEnabled,
  type ChatwootPublicConfig,
} from "@/lib/chatwoot";

const SCRIPT_ID = "siamez-chatwoot-sdk";

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

function loadChatwootSdk(config: ChatwootPublicConfig) {
  if (typeof window === "undefined") return;
  if (document.getElementById(SCRIPT_ID) || window.$chatwoot) return;

  window.chatwootSettings = {
    hideMessageBubble: false,
    position: "right",
    locale: "en",
    type: "standard",
    darkMode: "auto",
  };

  const script = document.createElement("script");
  script.id = SCRIPT_ID;
  script.src = `${config.baseUrl}/packs/js/sdk.js`;
  script.defer = true;
  script.async = true;
  script.onload = () => {
    window.chatwootSDK?.run({
      websiteToken: config.websiteToken,
      baseUrl: config.baseUrl,
    });
  };
  document.body.appendChild(script);
}

/**
 * Official Chatwoot website widget — loads once per session on customer-facing routes.
 */
export function ChatwootWidget() {
  const pathname = usePathname() ?? "";
  const websiteToken = process.env.NEXT_PUBLIC_CHATWOOT_WEBSITE_TOKEN?.trim() ?? "";
  const baseUrl =
    process.env.NEXT_PUBLIC_CHATWOOT_BASE_URL?.trim().replace(/\/$/, "") ||
    CHATWOOT_CLOUD_BASE_URL;

  useEffect(() => {
    if (!websiteToken) return;

    if (!isChatwootRouteEnabled(pathname)) {
      window.$chatwoot?.toggleBubbleVisibility?.("hide");
      return;
    }

    loadChatwootSdk({ websiteToken, baseUrl });
    window.$chatwoot?.toggleBubbleVisibility?.("show");
  }, [pathname, websiteToken, baseUrl]);

  return null;
}
