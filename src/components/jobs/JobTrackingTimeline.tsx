"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { TrackingStatus } from "@prisma/client";
import type { TrackingStep } from "@/config/job-tracking-steps";
import { getTrackingStepIndex } from "@/config/job-tracking-steps";
import { useJobChannel } from "@/hooks/use-job-channel";
import type { TrackingUpdatedPayload } from "@/lib/jobs/tracking-realtime";
import { cn } from "@/lib/utils";

type JobTrackingTimelineProps = {
  jobId: string;
  steps: TrackingStep[];
  currentStatus: TrackingStatus | null;
  notes?: string | null;
  lastUpdated?: Date | null;
  locale?: string;
};

/**
 * Read-only step timeline with realtime updates — layout mirrors
 * Drivers-License-System track page styling.
 */
export function JobTrackingTimeline({
  jobId,
  steps,
  currentStatus: initialStatus,
  notes: initialNotes,
  lastUpdated,
  locale = "en",
}: JobTrackingTimelineProps) {
  const [currentStatus, setCurrentStatus] = useState(initialStatus);
  const [notes, setNotes] = useState(initialNotes);
  const [animatedStatus, setAnimatedStatus] = useState<TrackingStatus | null>(null);

  useEffect(() => {
    setCurrentStatus(initialStatus);
    setNotes(initialNotes);
  }, [initialNotes, initialStatus]);

  const handleTrackingUpdated = useCallback((raw: unknown) => {
    const payload = raw as TrackingUpdatedPayload;
    if (!payload?.trackingHistory) return;
    setCurrentStatus(payload.trackingStatus);
    if (payload.trackingHistory.note) {
      setNotes(payload.trackingHistory.note);
    }
    if (payload.trackingStatus) {
      setAnimatedStatus(payload.trackingStatus);
    }
  }, []);

  useJobChannel(jobId, Boolean(jobId), {
    onTrackingUpdated: handleTrackingUpdated,
  });

  const currentIndex = getTrackingStepIndex(steps, currentStatus);
  const resolvedIndex = currentIndex < 0 ? 0 : currentIndex;
  const dateLocale = locale === "th" ? "th-TH" : "en-US";

  const lastUpdatedLabel = useMemo(() => {
    if (!lastUpdated) return null;
    return lastUpdated.toLocaleDateString(dateLocale);
  }, [dateLocale, lastUpdated]);

  return (
    <div className="flex flex-col gap-4">
      {lastUpdatedLabel && (
        <div className="rounded-full bg-sky-50 px-3 py-1 text-xs text-sky-700 dark:bg-sky-950/40 dark:text-sky-300">
          {locale === "th" ? "อัปเดตล่าสุด" : "Last updated"}: {lastUpdatedLabel}
        </div>
      )}

      <div className="hidden gap-3 md:flex">
        {steps.map((step, index) => {
          const isCompleted = index <= resolvedIndex;
          const isActive = index === resolvedIndex;
          const animate = animatedStatus === step.key;

          return (
            <div
              key={step.key}
              className={cn(
                "flex flex-1 flex-col items-center transition-opacity duration-300",
                animate && "tracking-step-enter"
              )}
            >
              <div className="flex w-full items-center gap-2">
                <div
                  className={cn(
                    "flex h-8 w-8 shrink-0 items-center justify-center rounded-full border text-xs font-semibold transition-colors duration-500",
                    isCompleted
                      ? "border-sky-600 bg-sky-600 text-white"
                      : "border-slate-200 bg-slate-50 text-slate-400 dark:border-slate-600 dark:bg-slate-800",
                    isActive && isCompleted && "ring-2 ring-sky-200 ring-offset-1"
                  )}
                >
                  {index + 1}
                </div>
                {index < steps.length - 1 && (
                  <div
                    className={cn(
                      "h-0.5 flex-1 rounded-full transition-colors duration-500",
                      index < resolvedIndex ? "bg-sky-500" : "bg-slate-200 dark:bg-slate-700"
                    )}
                  />
                )}
              </div>
              <div className="mt-2 text-center">
                <div
                  className={cn(
                    "text-xs font-medium transition-colors duration-300",
                    isActive ? "text-sky-800 dark:text-sky-200" : "text-sky-900 dark:text-sky-100"
                  )}
                >
                  {step.th}
                </div>
                <div className="text-[11px] text-slate-500">{step.en}</div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="flex flex-col gap-3 md:hidden">
        {steps.map((step, index) => {
          const isCompleted = index <= resolvedIndex;
          const isActive = index === resolvedIndex;
          const animate = animatedStatus === step.key;

          return (
            <div
              key={step.key}
              className={cn("flex items-start gap-3", animate && "tracking-step-enter")}
            >
              <div className="flex flex-col items-center">
                <div
                  className={cn(
                    "flex h-7 w-7 items-center justify-center rounded-full border text-[11px] font-semibold transition-colors duration-500",
                    isCompleted
                      ? "border-sky-600 bg-sky-600 text-white"
                      : "border-slate-200 bg-slate-50 text-slate-400 dark:border-slate-600 dark:bg-slate-800",
                    isActive && isCompleted && "ring-2 ring-sky-200"
                  )}
                >
                  {index + 1}
                </div>
                {index < steps.length - 1 && (
                  <div
                    className={cn(
                      "mt-1 min-h-[1.5rem] w-px flex-1 transition-colors duration-500",
                      index < resolvedIndex ? "bg-sky-400" : "bg-slate-200 dark:bg-slate-700"
                    )}
                  />
                )}
              </div>
              <div className="mt-0.5 flex-1">
                <div
                  className={cn(
                    "text-xs font-medium transition-colors duration-300",
                    isActive ? "text-sky-800 dark:text-sky-200" : "text-sky-900 dark:text-sky-100"
                  )}
                >
                  {step.th}
                </div>
                <div className="text-[11px] text-slate-500">{step.en}</div>
              </div>
            </div>
          );
        })}
      </div>

      {notes && (
        <div className="rounded-xl bg-sky-50 px-3 py-2 text-xs text-sky-900 transition-opacity duration-300 dark:bg-sky-950/40 dark:text-sky-100">
          <div className="font-semibold">
            {locale === "th" ? "หมายเหตุ / Remark" : "Remark / หมายเหตุ"}:
          </div>
          <div className="mt-1">{notes}</div>
        </div>
      )}
    </div>
  );
}
