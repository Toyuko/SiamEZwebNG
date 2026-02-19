"use client";

import { cn } from "@/lib/utils";
import { Check } from "lucide-react";

export interface Step {
  id: string;
  label: string;
  description?: string;
}

interface StepperProps {
  steps: Step[];
  currentIndex: number;
  completedSteps?: number[];
  className?: string;
}

export function Stepper({ steps, currentIndex, completedSteps = [], className }: StepperProps) {
  return (
    <nav aria-label="Booking progress" className={cn("w-full", className)}>
      <div className="flex items-start">
        {steps.map((step, index) => {
          const isCompleted = index < currentIndex || completedSteps.includes(index);
          const isCurrent = index === currentIndex;
          const isPast = index < currentIndex;

          return (
            <div key={step.id} className="flex flex-1 items-start">
              {/* Connector line before (except first) */}
              {index > 0 && (
                <div
                  className={cn(
                    "mt-5 h-0.5 flex-1",
                    isPast ? "bg-siam-blue" : "bg-gray-200 dark:bg-gray-700"
                  )}
                  aria-hidden
                />
              )}
              <div className="flex flex-col items-center px-1 sm:px-2">
                <div
                  className={cn(
                    "flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-2 text-sm font-semibold transition-colors",
                    isCompleted && "border-siam-blue bg-siam-blue text-white",
                    isCurrent &&
                      !isCompleted &&
                      "border-siam-blue bg-siam-blue/10 text-siam-blue dark:bg-siam-blue/20",
                    !isCurrent &&
                      !isCompleted &&
                      "border-gray-300 bg-white text-gray-500 dark:border-gray-600 dark:bg-gray-800"
                  )}
                  aria-current={isCurrent ? "step" : undefined}
                >
                  {isCompleted ? (
                    <Check className="h-5 w-5" aria-hidden />
                  ) : (
                    <span>{index + 1}</span>
                  )}
                </div>
                <span
                  className={cn(
                    "mt-1.5 whitespace-nowrap text-center text-xs font-medium sm:text-sm",
                    isCurrent
                      ? "text-siam-blue"
                      : isCompleted
                        ? "text-gray-700 dark:text-gray-300"
                        : "text-gray-500 dark:text-gray-400"
                  )}
                >
                  {step.label}
                </span>
              </div>
              {/* Connector line after (except last) */}
              {index < steps.length - 1 && (
                <div
                  className={cn(
                    "mt-5 h-0.5 flex-1",
                    isPast ? "bg-siam-blue" : "bg-gray-200 dark:bg-gray-700"
                  )}
                  aria-hidden
                />
              )}
            </div>
          );
        })}
      </div>
    </nav>
  );
}
