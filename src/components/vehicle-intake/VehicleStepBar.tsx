"use client";

import { cn } from "@/lib/utils";

export function VehicleStepBar({
  current,
  total,
  label,
}: {
  current: number;
  total: number;
  label: string;
}) {
  const pct = Math.round(((current + 1) / total) * 100);
  return (
    <div className="mb-6">
      <div className="mb-2 flex items-center justify-between text-sm">
        <span className="font-medium text-siam-blue">{label}</span>
        <span className="text-muted">
          {current + 1}/{total}
        </span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-gray-200 dark:bg-gray-800">
        <div
          className={cn("h-full rounded-full bg-siam-blue transition-all")}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

export function ChoiceCard({
  selected,
  title,
  description,
  onClick,
}: {
  selected: boolean;
  title: string;
  description?: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "w-full rounded-2xl border-2 p-5 text-left transition min-h-[4.5rem]",
        selected
          ? "border-siam-blue bg-siam-blue/10"
          : "border-border bg-card hover:border-siam-blue/50"
      )}
    >
      <p className="text-base font-semibold text-foreground">{title}</p>
      {description ? <p className="mt-1 text-sm text-muted">{description}</p> : null}
    </button>
  );
}
