"use client";

import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { Check } from "lucide-react";
import type { TrackingStatus } from "@prisma/client";
import type { TrackingStep } from "@/config/job-tracking-steps";
import { getTrackingStepIndex } from "@/config/job-tracking-steps";
import { TrackingAttachmentDisplay } from "@/components/TrackingAttachmentDisplay";
import { useJobChannel } from "@/hooks/use-job-channel";
import type { TrackingUpdatedPayload } from "@/lib/jobs/tracking-realtime";
import { cn } from "@/lib/utils";

export type ClientTrackingHistoryEntry = {
  id: string;
  status: TrackingStatus;
  note: string | null;
  attachmentUrl?: string | null;
  attachmentName?: string | null;
  createdAt: string;
};

type ClientTrackingTimelineProps = {
  jobId: string;
  steps: TrackingStep[];
  currentStatus: TrackingStatus | null;
  trackingHistory: ClientTrackingHistoryEntry[];
  locale?: string;
  emptyMessage: string;
  trackingApiPath: string;
  onTrackingUpdated?: (payload: TrackingUpdatedPayload) => void;
  timelineFooter?: ReactNode;
};

function formatTimestamp(iso: string, locale: string): string {
  const date = new Date(iso);
  return date.toLocaleString(locale === "th" ? "th-TH" : "en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function toIsoString(value: unknown): string {
  if (typeof value === "string") return value;
  if (value instanceof Date) return value.toISOString();
  if (typeof value === "number") return new Date(value).toISOString();
  return new Date().toISOString();
}

function normalizeHistoryEntry(
  raw: Partial<ClientTrackingHistoryEntry> & Record<string, unknown>
): ClientTrackingHistoryEntry {
  const attachmentUrl =
    (raw.attachmentUrl as string | null | undefined) ??
    (raw.attachment_url as string | null | undefined) ??
    null;
  const attachmentName =
    (raw.attachmentName as string | null | undefined) ??
    (raw.attachment_name as string | null | undefined) ??
    null;

  return {
    id: String(raw.id),
    status: raw.status as TrackingStatus,
    note: (raw.note as string | null | undefined) ?? null,
    attachmentUrl,
    attachmentName,
    createdAt: toIsoString(raw.createdAt ?? raw.created_at),
  };
}

/** Merge all history rows for a status — latest note/time, keep any attachment on that step. */
function getHistoryEntryForStatus(
  history: ClientTrackingHistoryEntry[],
  status: TrackingStatus
): ClientTrackingHistoryEntry | undefined {
  const forStatus = history.filter((e) => e.status === status);
  if (forStatus.length === 0) return undefined;

  const latest = forStatus.reduce((a, b) =>
    new Date(a.createdAt) >= new Date(b.createdAt) ? a : b
  );
  const withAttachment = forStatus
    .filter((e) => e.attachmentUrl)
    .reduce<ClientTrackingHistoryEntry | undefined>((best, e) => {
      if (!best) return e;
      return new Date(e.createdAt) >= new Date(best.createdAt) ? e : best;
    }, undefined);

  return {
    ...latest,
    attachmentUrl: withAttachment?.attachmentUrl ?? latest.attachmentUrl ?? null,
    attachmentName:
      withAttachment?.attachmentName ?? latest.attachmentName ?? null,
  };
}

function historyByStatus(
  history: ClientTrackingHistoryEntry[]
): Map<TrackingStatus, ClientTrackingHistoryEntry> {
  const map = new Map<TrackingStatus, ClientTrackingHistoryEntry>();
  for (const status of new Set(history.map((e) => e.status))) {
    const merged = getHistoryEntryForStatus(history, status);
    if (merged) {
      map.set(status, merged);
    }
  }
  return map;
}

function mergeTrackingHistory(
  prev: ClientTrackingHistoryEntry[],
  entry: ClientTrackingHistoryEntry
): ClientTrackingHistoryEntry[] {
  const existing =
    prev.find((e) => e.id === entry.id) ??
    prev.find((e) => e.status === entry.status && e.id.startsWith("legacy"));

  const merged: ClientTrackingHistoryEntry = {
    ...entry,
    attachmentUrl: entry.attachmentUrl ?? existing?.attachmentUrl ?? null,
    attachmentName:
      entry.attachmentName ?? existing?.attachmentName ?? null,
  };

  if (existing) {
    return prev.map((e) => (e.id === existing.id ? merged : e));
  }
  return [...prev, merged];
}

export function ClientTrackingTimeline({
  jobId,
  steps,
  currentStatus: initialCurrentStatus,
  trackingHistory: initialHistory,
  locale = "en",
  emptyMessage,
  trackingApiPath,
  onTrackingUpdated,
  timelineFooter,
}: ClientTrackingTimelineProps) {
  const [trackingHistory, setTrackingHistory] =
    useState<ClientTrackingHistoryEntry[]>(initialHistory);
  const [currentStatus, setCurrentStatus] = useState<TrackingStatus | null>(
    initialCurrentStatus
  );
  const [animatedEntryIds, setAnimatedEntryIds] = useState<Set<string>>(
    () => new Set()
  );

  const loadTracking = useCallback(async () => {
    try {
      const res = await fetch(trackingApiPath, {
        credentials: "include",
        cache: "no-store",
      });
      const json = (await res.json()) as {
        success?: boolean;
        data?: {
          trackingHistory: ClientTrackingHistoryEntry[];
          job: { trackingStatus: TrackingStatus | null };
        };
      };
      if (!res.ok || !json.success || !json.data) return;
      setTrackingHistory(
        json.data.trackingHistory.map((row) =>
          normalizeHistoryEntry(
            row as Partial<ClientTrackingHistoryEntry> & Record<string, unknown>
          )
        )
      );
      setCurrentStatus(json.data.job.trackingStatus);
    } catch {
      /* keep SSR / parent seed data */
    }
  }, [trackingApiPath]);

  useEffect(() => {
    void loadTracking();
  }, [loadTracking]);

  useEffect(() => {
    setTrackingHistory(initialHistory);
    setCurrentStatus(initialCurrentStatus);
  }, [initialCurrentStatus, initialHistory]);

  const handleTrackingUpdated = useCallback(
    (raw: unknown) => {
      const payload = raw as TrackingUpdatedPayload;
      if (!payload?.trackingHistory) return;

      const entry = normalizeHistoryEntry(
        payload.trackingHistory as Partial<ClientTrackingHistoryEntry> &
          Record<string, unknown>
      );

      setTrackingHistory((prev) => mergeTrackingHistory(prev, entry));
      setCurrentStatus(payload.trackingStatus);
      setAnimatedEntryIds((prev) => new Set(prev).add(entry.id));
      onTrackingUpdated?.(payload);
    },
    [onTrackingUpdated]
  );

  useJobChannel(jobId, Boolean(jobId), {
    onTrackingUpdated: handleTrackingUpdated,
  });

  const historyMap = useMemo(
    () => historyByStatus(trackingHistory),
    [trackingHistory]
  );
  const currentIndex = getTrackingStepIndex(steps, currentStatus);
  const resolvedIndex = currentIndex < 0 ? 0 : currentIndex;

  function stepState(index: number, stepKey: TrackingStatus): "completed" | "active" | "pending" {
    if (stepKey === currentStatus) return "active";
    if (index < resolvedIndex) return "completed";
    if (historyMap.has(stepKey) && stepKey !== currentStatus) return "completed";
    return "pending";
  }

  if (steps.length === 0) {
    return (
      <p className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-6 text-center text-sm text-slate-600 dark:border-slate-700 dark:bg-slate-800/50 dark:text-slate-400">
        {emptyMessage}
      </p>
    );
  }

  if (trackingHistory.length === 0 && !currentStatus) {
    return (
      <p className="rounded-xl border border-dashed border-sky-200 bg-sky-50/60 px-4 py-8 text-center text-sm text-sky-900 dark:border-sky-800 dark:bg-sky-950/30 dark:text-sky-100">
        {emptyMessage}
      </p>
    );
  }

  return (
    <>
      <div className="hidden gap-3 md:flex">
        {steps.map((step, index) => {
          const state = stepState(index, step.key);
          const entry = historyMap.get(step.key);
          const isCompleted = state === "completed";
          const isActive = state === "active";
          const animate = entry != null && animatedEntryIds.has(entry.id);

          return (
            <div
              key={step.key}
              className={cn("flex flex-1 flex-col items-center", animate && "tracking-step-enter")}
            >
              <div className="flex w-full items-center gap-2">
                <div
                  className={cn(
                    "relative flex h-9 w-9 shrink-0 items-center justify-center rounded-full border text-xs font-semibold transition-colors duration-300",
                    isCompleted &&
                      "border-emerald-600 bg-emerald-600 text-white",
                    isActive &&
                      "border-siam-blue bg-siam-blue text-white shadow-md ring-4 ring-siam-blue/25 animate-pulse",
                    state === "pending" &&
                      "border-slate-200 bg-slate-50 text-slate-400 dark:border-slate-600 dark:bg-slate-800"
                  )}
                >
                  {isCompleted ? (
                    <Check className="h-4 w-4" aria-hidden />
                  ) : (
                    <span>{index + 1}</span>
                  )}
                </div>
                {index < steps.length - 1 && (
                  <div
                    className={cn(
                      "h-0.5 flex-1 rounded-full transition-colors duration-500",
                      index < resolvedIndex ? "bg-emerald-500" : "bg-slate-200 dark:bg-slate-700",
                      isActive && index === resolvedIndex && "bg-siam-blue/60"
                    )}
                  />
                )}
              </div>
              <div className="mt-2 w-full text-center">
                <div
                  className={cn(
                    "text-xs font-medium transition-colors duration-300",
                    isActive && "text-siam-blue",
                    isCompleted && "text-emerald-800 dark:text-emerald-300",
                    state === "pending" && "text-slate-500"
                  )}
                >
                  {locale === "th" ? step.th : step.en}
                </div>
                {locale === "th" && (
                  <div className="text-[11px] text-slate-500">{step.en}</div>
                )}
                {entry && (
                  <time
                    dateTime={entry.createdAt}
                    className="mt-1 block text-[10px] text-slate-500"
                  >
                    {formatTimestamp(entry.createdAt, locale)}
                  </time>
                )}
                {entry?.note && (
                  <p className="mt-1.5 rounded-lg bg-sky-50 px-2 py-1.5 text-[11px] leading-snug text-sky-900 dark:bg-sky-950/40 dark:text-sky-100">
                    {entry.note}
                  </p>
                )}
                {entry?.attachmentUrl ? (
                  <div className="mt-1 flex justify-center">
                    <TrackingAttachmentDisplay
                      attachmentUrl={entry.attachmentUrl}
                      attachmentName={entry.attachmentName}
                    />
                  </div>
                ) : null}
              </div>
            </div>
          );
        })}
      </div>

      <div className="flex flex-col gap-4 md:hidden">
        {steps.map((step, index) => {
          const state = stepState(index, step.key);
          const entry = historyMap.get(step.key);
          const isCompleted = state === "completed";
          const isActive = state === "active";
          const animate = entry != null && animatedEntryIds.has(entry.id);

          return (
            <div
              key={step.key}
              className={cn("flex items-start gap-3", animate && "tracking-step-enter")}
            >
              <div className="flex flex-col items-center">
                <div
                  className={cn(
                    "relative flex h-8 w-8 shrink-0 items-center justify-center rounded-full border text-[11px] font-semibold transition-colors duration-300",
                    isCompleted &&
                      "border-emerald-600 bg-emerald-600 text-white",
                    isActive &&
                      "border-siam-blue bg-siam-blue text-white ring-4 ring-siam-blue/25 animate-pulse",
                    state === "pending" &&
                      "border-slate-200 bg-slate-50 text-slate-400 dark:border-slate-600 dark:bg-slate-800"
                  )}
                >
                  {isCompleted ? (
                    <Check className="h-3.5 w-3.5" aria-hidden />
                  ) : (
                    <span>{index + 1}</span>
                  )}
                </div>
                {index < steps.length - 1 && (
                  <div
                    className={cn(
                      "mt-1 min-h-[2rem] w-px flex-1 transition-colors duration-500",
                      index < resolvedIndex ? "bg-emerald-400" : "bg-slate-200 dark:bg-slate-700"
                    )}
                  />
                )}
              </div>
              <div className="min-w-0 flex-1 pt-0.5">
                <div
                  className={cn(
                    "text-xs font-medium transition-colors duration-300",
                    isActive && "text-siam-blue",
                    isCompleted && "text-emerald-800 dark:text-emerald-300",
                    state === "pending" && "text-slate-600 dark:text-slate-400"
                  )}
                >
                  {locale === "th" ? step.th : step.en}
                </div>
                {locale === "th" && (
                  <div className="text-[11px] text-slate-500">{step.en}</div>
                )}
                {entry && (
                  <time
                    dateTime={entry.createdAt}
                    className="mt-0.5 block text-[10px] text-slate-500"
                  >
                    {formatTimestamp(entry.createdAt, locale)}
                  </time>
                )}
                {entry?.note && (
                  <p className="mt-2 rounded-lg bg-sky-50 px-2.5 py-2 text-[11px] leading-snug text-sky-900 dark:bg-sky-950/40 dark:text-sky-100">
                    {entry.note}
                  </p>
                )}
                {entry?.attachmentUrl ? (
                  <TrackingAttachmentDisplay
                    attachmentUrl={entry.attachmentUrl}
                    attachmentName={entry.attachmentName}
                  />
                ) : null}
              </div>
            </div>
          );
        })}
      </div>

      {timelineFooter}
    </>
  );
}
