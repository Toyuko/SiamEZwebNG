"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { AlertTriangle, Loader2, MapPin } from "lucide-react";
import type { TrackingMapHistoryPoint } from "@/components/tracking/tracking-map-markers";
import type { TrackingMapRealtimeConfig } from "@/components/tracking/TrackingMapInner";

const TrackingMapInner = dynamic(
  () =>
    import("@/components/tracking/TrackingMapInner").then((m) => m.TrackingMapInner),
  {
    ssr: false,
    loading: () => <TrackingMapSkeleton />,
  }
);

type LocationPayload = {
  jobId: string;
  trackingStatus: string | null;
  isCurrentlyInTransit: boolean;
  trackingHistory: TrackingMapHistoryPoint[];
  realtime: TrackingMapRealtimeConfig | null;
};

type MapLoadState = "loading" | "error" | "forbidden" | "ready" | "unavailable";

export function TrackingMapSkeleton() {
  return (
    <div
      className="flex h-[min(420px,55vh)] w-full flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-sky-200 bg-sky-50/50 dark:border-slate-700 dark:bg-slate-800/40"
      aria-busy="true"
      aria-label="Loading map"
    >
      <Loader2 className="h-7 w-7 animate-spin text-siam-blue" />
      <div className="h-3 w-40 animate-pulse rounded-full bg-sky-200 dark:bg-slate-600" />
      <div className="h-3 w-28 animate-pulse rounded-full bg-sky-100 dark:bg-slate-700" />
    </div>
  );
}

export function TrackingMap({ jobId, locale }: { jobId: string; locale: string }) {
  const t = useTranslations("clientTracking.map");
  const [state, setState] = useState<MapLoadState>("loading");
  const [data, setData] = useState<LocationPayload | null>(null);
  const [mapScriptError, setMapScriptError] = useState(false);

  const loadLocation = useCallback(async () => {
    setState("loading");
    setMapScriptError(false);
    try {
      const res = await fetch(`/api/client/jobs/${jobId}/location`, {
        credentials: "include",
        cache: "no-store",
      });
      const json = (await res.json()) as {
        success?: boolean;
        data?: LocationPayload;
        error?: string;
      };

      if (res.status === 403) {
        setState("forbidden");
        return;
      }
      if (!res.ok || !json.success || !json.data) {
        setState("error");
        return;
      }

      setData(json.data);
      setState("ready");
    } catch {
      setState("error");
    }
  }, [jobId]);

  useEffect(() => {
    void loadLocation();
  }, [loadLocation]);

  const hasCoordinates = (data?.trackingHistory ?? []).some(
    (entry) => entry.latitude != null && entry.longitude != null
  );

  const showMap =
    state === "ready" &&
    data &&
    (hasCoordinates || data.isCurrentlyInTransit) &&
    !mapScriptError;

  if (state === "loading") {
    return (
      <section className="rounded-2xl bg-white/95 p-4 shadow-sm ring-1 ring-sky-100 dark:bg-slate-900/90 dark:ring-sky-900 sm:p-5">
        <MapSectionHeader title={t("title")} subtitle={t("loading")} />
        <TrackingMapSkeleton />
      </section>
    );
  }

  if (state === "forbidden") {
    return null;
  }

  if (state === "error") {
    return (
      <section className="rounded-2xl border border-red-200 bg-red-50 px-4 py-5 text-sm text-red-900 dark:border-red-900 dark:bg-red-950/40 dark:text-red-100">
        <div className="flex items-start gap-2">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <div>
            <p>{t("loadError")}</p>
            <button
              type="button"
              onClick={() => void loadLocation()}
              className="mt-2 font-medium text-siam-blue underline"
            >
              {t("retry")}
            </button>
          </div>
        </div>
      </section>
    );
  }

  if (!showMap) {
    if (!hasCoordinates && !data?.isCurrentlyInTransit) {
      return (
        <section className="rounded-2xl bg-white/95 p-4 shadow-sm ring-1 ring-sky-100 dark:bg-slate-900/90 dark:ring-sky-900 sm:p-5">
          <MapSectionHeader title={t("title")} subtitle={t("noLocationsYet")} />
          <p className="rounded-xl border border-dashed border-sky-200 bg-sky-50/60 px-4 py-8 text-center text-sm text-sky-900 dark:border-sky-800 dark:bg-sky-950/30 dark:text-sky-100">
            {t("noLocationsYet")}
          </p>
        </section>
      );
    }

    return (
      <section className="rounded-2xl bg-white/95 p-4 shadow-sm ring-1 ring-sky-100 dark:bg-slate-900/90 dark:ring-sky-900 sm:p-5">
        <MapSectionHeader title={t("title")} subtitle={t("unavailable")} />
        <p className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-6 text-sm text-amber-900 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-100">
          {t("scriptError")}
        </p>
      </section>
    );
  }

  return (
    <section className="rounded-2xl bg-white/95 p-4 shadow-sm ring-1 ring-sky-100 dark:bg-slate-900/90 dark:ring-sky-900 sm:p-5">
      <MapSectionHeader
        title={t("title")}
        subtitle={data.isCurrentlyInTransit ? t("liveSubtitle") : t("routeSubtitle")}
      />
      <div
        onError={() => setMapScriptError(true)}
        className="[&_.leaflet-container]:rounded-xl [&_.leaflet-container]:z-0"
      >
        <TrackingMapInner
          trackingHistory={data.trackingHistory}
          isCurrentlyInTransit={data.isCurrentlyInTransit}
          realtime={data.realtime}
          locale={locale}
          liveLabel={t("liveBadge")}
          inTransitLabel={t("inTransit")}
        />
      </div>
    </section>
  );
}

function MapSectionHeader({
  title,
  subtitle,
}: {
  title: string;
  subtitle: string;
}) {
  return (
    <div className="mb-4 flex items-start gap-2">
      <MapPin className="mt-0.5 h-5 w-5 shrink-0 text-siam-blue" />
      <div>
        <h2 className="text-sm font-semibold text-sky-900 dark:text-sky-100">{title}</h2>
        <p className="text-xs text-slate-500 dark:text-slate-400">{subtitle}</p>
      </div>
    </div>
  );
}
