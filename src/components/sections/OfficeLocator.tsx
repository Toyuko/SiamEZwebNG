"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import {
  GOOGLE_MAPS_DEMO_MAP_ID,
  GOOGLE_MAPS_EXTENDED_LIBRARY_SRC,
  officeGoogleMapsEmbedUrl,
  officeLocatorConfiguration,
} from "@/lib/maps";
import "./office-locator.css";

const LIBRARY_SCRIPT_ID = "gmpx-extended-component-library";

type StoreLocatorElement = HTMLElement & {
  configureFromQuickBuilder: (config: ReturnType<typeof officeLocatorConfiguration>) => void;
};

function loadLocatorLibrary(): Promise<void> {
  if (typeof customElements !== "undefined" && customElements.get("gmpx-store-locator")) {
    return Promise.resolve();
  }

  const existing = document.getElementById(LIBRARY_SCRIPT_ID);
  if (existing) {
    return customElements.whenDefined("gmpx-store-locator").then(() => undefined);
  }

  return new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.id = LIBRARY_SCRIPT_ID;
    script.type = "module";
    script.src = GOOGLE_MAPS_EXTENDED_LIBRARY_SRC;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Failed to load Google Maps locator"));
    document.head.appendChild(script);
  });
}

function OfficeMapEmbed({ locale, title }: { locale: string; title: string }) {
  return (
    <iframe
      title={title}
      src={officeGoogleMapsEmbedUrl(locale)}
      className="h-full w-full border-0"
      loading="lazy"
      referrerPolicy="no-referrer-when-downgrade"
      allowFullScreen
    />
  );
}

export function OfficeLocator({ apiKey, locale }: { apiKey: string; locale: string }) {
  const t = useTranslations("contact");
  const locatorRef = useRef<StoreLocatorElement | null>(null);
  const [useEmbed, setUseEmbed] = useState(!apiKey);

  const setLoaderRef = useCallback(
    (element: HTMLElement | null) => {
      if (element && apiKey) {
        element.setAttribute("key", apiKey);
      }
    },
    [apiKey]
  );

  useEffect(() => {
    if (!apiKey) return;

    let cancelled = false;

    async function configure() {
      try {
        await loadLocatorLibrary();
        if (cancelled) return;
        await customElements.whenDefined("gmpx-store-locator");
        if (cancelled) return;

        const locator = locatorRef.current;
        if (!locator) {
          setUseEmbed(true);
          return;
        }
        locator.configureFromQuickBuilder(officeLocatorConfiguration(apiKey));
      } catch {
        if (!cancelled) setUseEmbed(true);
      }
    }

    void configure();
    return () => {
      cancelled = true;
    };
  }, [apiKey]);

  const title = t("mapTitle");

  return (
    <div className="office-locator-wrap overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
      {useEmbed ? (
        <OfficeMapEmbed locale={locale} title={title} />
      ) : (
        <>
          <gmpx-api-loader
            ref={setLoaderRef}
            solution-channel="GMP_QB_locatorplus_v11_c"
          />
          <gmpx-store-locator
            ref={locatorRef}
            map-id={GOOGLE_MAPS_DEMO_MAP_ID}
            aria-label={title}
          />
        </>
      )}
    </div>
  );
}
