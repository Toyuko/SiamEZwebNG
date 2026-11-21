"use client";

import { Check } from "lucide-react";
import type { WizardStepConfig } from "@/config/wizards/types";
import {
  currentStageIndex,
  resolveProgressStages,
} from "@/components/wizard/lib/resolve-stages";
import { cn } from "@/lib/utils";

interface WizardProgressProps {
  steps: WizardStepConfig[];
  currentIndex: number;
}

export function WizardProgress({ steps, currentIndex }: WizardProgressProps) {
  const stages = resolveProgressStages(steps);
  const stageIndex = currentStageIndex(steps, currentIndex);
  const current = stages[stageIndex];
  const progressPct =
    stages.length <= 1 ? 100 : Math.round((stageIndex / (stages.length - 1)) * 100);

  return (
    <nav aria-label="Booking progress" className="w-full">
      {/* Mobile: compact bar + step label */}
      <div className="sm:hidden">
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm font-semibold text-siam-ink">
            {current?.label ?? "Booking"}
          </p>
          <p className="text-xs font-medium text-[#64748B]">
            Step {stageIndex + 1} of {stages.length}
          </p>
        </div>
        <div
          className="mt-2 h-1.5 overflow-hidden rounded-full bg-[#DCE6F5]"
          role="progressbar"
          aria-valuenow={stageIndex + 1}
          aria-valuemin={1}
          aria-valuemax={stages.length}
          aria-label={`Step ${stageIndex + 1} of ${stages.length}`}
        >
          <div
            className="h-full rounded-full bg-siam-blue transition-[width] duration-200 ease-out"
            style={{ width: `${Math.max(progressPct, stages.length ? 100 / stages.length : 0)}%` }}
          />
        </div>
      </div>

      {/* Desktop / tablet: horizontal stage stepper */}
      <ol className="hidden sm:flex sm:items-center sm:gap-1">
        {stages.map((stage, index) => {
          const isCompleted = index < stageIndex;
          const isCurrent = index === stageIndex;
          return (
            <li key={stage.id} className="flex min-w-0 flex-1 items-center gap-1">
              <div className="flex min-w-0 items-center gap-2">
                <span
                  className={cn(
                    "flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold transition-colors",
                    isCompleted && "bg-siam-blue text-white",
                    isCurrent && "bg-siam-blue text-white ring-4 ring-siam-blue/15",
                    !isCompleted && !isCurrent && "bg-[#DCE6F5] text-[#64748B]"
                  )}
                  aria-current={isCurrent ? "step" : undefined}
                >
                  {isCompleted ? <Check className="h-3.5 w-3.5" aria-hidden /> : index + 1}
                </span>
                <span
                  className={cn(
                    "truncate text-xs font-semibold md:text-sm",
                    isCurrent || isCompleted ? "text-siam-ink" : "text-[#64748B]"
                  )}
                >
                  {stage.label}
                </span>
              </div>
              {index < stages.length - 1 ? (
                <div
                  className={cn(
                    "mx-1 h-0.5 min-w-[0.75rem] flex-1 rounded-full",
                    index < stageIndex ? "bg-siam-blue" : "bg-[#DCE6F5]"
                  )}
                  aria-hidden
                />
              ) : null}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
