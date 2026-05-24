"use client";

import { Check } from "lucide-react";
import type { TrackingStatus } from "@prisma/client";
import type { TrackingStep } from "@/config/job-tracking-steps";
import { getTrackingStepIndex } from "@/config/job-tracking-steps";
import { cn } from "@/lib/utils";

export type ClientTrackingHistoryEntry = {
  id: string;
  status: TrackingStatus;
  note: string | null;
  createdAt: string;
};

type ClientTrackingTimelineProps = {
  steps: TrackingStep[];
  currentStatus: TrackingStatus | null;
  trackingHistory: ClientTrackingHistoryEntry[];
  locale?: string;
  emptyMessage: string;
};

function formatTimestamp(iso: string, locale: string): string {
  const date = new Date(iso);
  return date.toLocaleString(locale === "th" ? "th-TH" : "en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function historyByStatus(
  history: ClientTrackingHistoryEntry[]
): Map<TrackingStatus, ClientTrackingHistoryEntry> {
  const map = new Map<TrackingStatus, ClientTrackingHistoryEntry>();
  for (const entry of history) {
    map.set(entry.status, entry);
  }
  return map;
}

export function ClientTrackingTimeline({
  steps,
  currentStatus,
  trackingHistory,
  locale = "en",
  emptyMessage,
}: ClientTrackingTimelineProps) {
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

  const historyMap = historyByStatus(trackingHistory);
  const currentIndex = getTrackingStepIndex(steps, currentStatus);
  const resolvedIndex = currentIndex < 0 ? 0 : currentIndex;

  function stepState(index: number, stepKey: TrackingStatus): "completed" | "active" | "pending" {
    if (stepKey === currentStatus) return "active";
    if (index < resolvedIndex) return "completed";
    if (historyMap.has(stepKey) && stepKey !== currentStatus) return "completed";
    return "pending";
  }

  return (
    <>
      <div className="hidden gap-3 md:flex">
        {steps.map((step, index) => {
          const state = stepState(index, step.key);
          const entry = historyMap.get(step.key);
          const isCompleted = state === "completed";
          const isActive = state === "active";

          return (
            <div key={step.key} className="flex flex-1 flex-col items-center">
              <div className="flex w-full items-center gap-2">
                <div
                  className={cn(
                    "relative flex h-9 w-9 shrink-0 items-center justify-center rounded-full border text-xs font-semibold transition-colors",
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
                      "h-0.5 flex-1 rounded-full",
                      index < resolvedIndex ? "bg-emerald-500" : "bg-slate-200 dark:bg-slate-700",
                      isActive && index === resolvedIndex && "bg-siam-blue/60"
                    )}
                  />
                )}
              </div>
              <div className="mt-2 w-full text-center">
                <div
                  className={cn(
                    "text-xs font-medium",
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

          return (
            <div key={step.key} className="flex items-start gap-3">
              <div className="flex flex-col items-center">
                <div
                  className={cn(
                    "relative flex h-8 w-8 shrink-0 items-center justify-center rounded-full border text-[11px] font-semibold",
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
                      "mt-1 min-h-[2rem] w-px flex-1",
                      index < resolvedIndex ? "bg-emerald-400" : "bg-slate-200 dark:bg-slate-700"
                    )}
                  />
                )}
              </div>
              <div className="min-w-0 flex-1 pt-0.5">
                <div
                  className={cn(
                    "text-xs font-medium",
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
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}
