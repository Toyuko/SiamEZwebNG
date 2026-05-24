import type { TrackingStatus } from "@prisma/client";
import type { TrackingStep } from "@/config/job-tracking-steps";
import { getTrackingStepIndex } from "@/config/job-tracking-steps";

type JobTrackingTimelineProps = {
  steps: TrackingStep[];
  currentStatus: TrackingStatus | null;
  notes?: string | null;
  lastUpdated?: Date | null;
  locale?: string;
};

/**
 * Read-only step timeline — layout and sky/slate styling mirror
 * Drivers-License-System `web/app/track/page.tsx`.
 */
export function JobTrackingTimeline({
  steps,
  currentStatus,
  notes,
  lastUpdated,
  locale = "en",
}: JobTrackingTimelineProps) {
  const currentIndex = getTrackingStepIndex(steps, currentStatus);
  const resolvedIndex = currentIndex < 0 ? 0 : currentIndex;
  const dateLocale = locale === "th" ? "th-TH" : "en-US";

  return (
    <div className="flex flex-col gap-4">
      {lastUpdated && (
        <div className="rounded-full bg-sky-50 px-3 py-1 text-xs text-sky-700 dark:bg-sky-950/40 dark:text-sky-300">
          {locale === "th" ? "อัปเดตล่าสุด" : "Last updated"}:{" "}
          {lastUpdated.toLocaleDateString(dateLocale)}
        </div>
      )}

      <div className="hidden gap-3 md:flex">
        {steps.map((step, index) => {
          const isCompleted = index <= resolvedIndex;
          const isActive = index === resolvedIndex;

          return (
            <div key={step.key} className="flex flex-1 flex-col items-center">
              <div className="flex w-full items-center gap-2">
                <div
                  className={[
                    "flex h-8 w-8 shrink-0 items-center justify-center rounded-full border text-xs font-semibold transition-colors",
                    isCompleted
                      ? "border-sky-600 bg-sky-600 text-white"
                      : "border-slate-200 bg-slate-50 text-slate-400 dark:border-slate-600 dark:bg-slate-800",
                    isActive && isCompleted ? "ring-2 ring-sky-200 ring-offset-1" : "",
                  ].join(" ")}
                >
                  {index + 1}
                </div>
                {index < steps.length - 1 && (
                  <div
                    className={[
                      "h-0.5 flex-1 rounded-full",
                      index < resolvedIndex ? "bg-sky-500" : "bg-slate-200 dark:bg-slate-700",
                    ].join(" ")}
                  />
                )}
              </div>
              <div className="mt-2 text-center">
                <div
                  className={[
                    "text-xs font-medium",
                    isActive ? "text-sky-800 dark:text-sky-200" : "text-sky-900 dark:text-sky-100",
                  ].join(" ")}
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

          return (
            <div key={step.key} className="flex items-start gap-3">
              <div className="flex flex-col items-center">
                <div
                  className={[
                    "flex h-7 w-7 items-center justify-center rounded-full border text-[11px] font-semibold transition-colors",
                    isCompleted
                      ? "border-sky-600 bg-sky-600 text-white"
                      : "border-slate-200 bg-slate-50 text-slate-400 dark:border-slate-600 dark:bg-slate-800",
                    isActive && isCompleted ? "ring-2 ring-sky-200" : "",
                  ].join(" ")}
                >
                  {index + 1}
                </div>
                {index < steps.length - 1 && (
                  <div
                    className={[
                      "mt-1 min-h-[1.5rem] w-px flex-1",
                      index < resolvedIndex ? "bg-sky-400" : "bg-slate-200 dark:bg-slate-700",
                    ].join(" ")}
                  />
                )}
              </div>
              <div className="mt-0.5 flex-1">
                <div
                  className={[
                    "text-xs font-medium",
                    isActive ? "text-sky-800 dark:text-sky-200" : "text-sky-900 dark:text-sky-100",
                  ].join(" ")}
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
        <div className="rounded-xl bg-sky-50 px-3 py-2 text-xs text-sky-900 dark:bg-sky-950/40 dark:text-sky-100">
          <div className="font-semibold">
            {locale === "th" ? "หมายเหตุ / Remark" : "Remark / หมายเหตุ"}:
          </div>
          <div className="mt-1">{notes}</div>
        </div>
      )}
    </div>
  );
}
