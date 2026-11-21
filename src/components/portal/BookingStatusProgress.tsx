import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import type { BookingProgressStage } from "@/lib/portal/booking-progress";

export function BookingStatusProgress({
  stages,
  labels,
}: {
  stages: BookingProgressStage[];
  labels: Record<BookingProgressStage["id"], string>;
}) {
  return (
    <ol className="mt-4 flex w-full items-start">
      {stages.map((stage, index) => {
        const isLast = index === stages.length - 1;
        const prevDone = index > 0 && stages[index - 1]?.state === "done";
        return (
          <li key={stage.id} className="relative flex flex-1 flex-col items-center">
            {!isLast ? (
              <span
                className={cn(
                  "absolute left-[calc(50%+12px)] right-[calc(-50%+12px)] top-3 h-0.5",
                  stage.state === "done" || (stage.state === "current" && prevDone)
                    ? "bg-emerald-400"
                    : stage.state === "current"
                      ? "bg-siam-blue/30"
                      : "bg-[#DCE6F5] dark:bg-gray-700"
                )}
                aria-hidden
              />
            ) : null}
            <div
              className={cn(
                "relative z-[1] flex h-6 w-6 items-center justify-center rounded-full border-2",
                stage.state === "done" && "border-emerald-500 bg-emerald-500 text-white",
                stage.state === "current" &&
                  "border-siam-blue bg-siam-blue text-white shadow-[0_0_0_3px_rgba(7,84,232,0.18)]",
                stage.state === "upcoming" &&
                  "border-[#DCE6F5] bg-white dark:border-gray-600 dark:bg-gray-800"
              )}
              aria-current={stage.state === "current" ? "step" : undefined}
            >
              {stage.state === "done" ? <Check className="h-3.5 w-3.5" aria-hidden /> : null}
              {stage.state === "current" ? (
                <span className="h-2 w-2 rounded-full bg-white" aria-hidden />
              ) : null}
            </div>
            <span
              className={cn(
                "mt-2 max-w-[4.75rem] text-center text-[10px] font-medium leading-tight sm:text-[11px]",
                stage.state === "current" && "text-siam-blue",
                stage.state === "done" && "text-emerald-700 dark:text-emerald-400",
                stage.state === "upcoming" && "text-siam-ink-muted dark:text-gray-500"
              )}
            >
              {labels[stage.id]}
            </span>
          </li>
        );
      })}
    </ol>
  );
}
