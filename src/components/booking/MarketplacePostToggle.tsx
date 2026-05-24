"use client";

import { cn } from "@/lib/utils";

interface MarketplacePostToggleProps {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  disabled?: boolean;
  className?: string;
}

export function MarketplacePostToggle({
  checked,
  onCheckedChange,
  disabled = false,
  className,
}: MarketplacePostToggleProps) {
  return (
    <div
      className={cn(
        "flex items-start gap-4 rounded-lg border border-gray-200 bg-gray-50/80 p-4 dark:border-gray-700 dark:bg-gray-800/40",
        className,
      )}
    >
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => onCheckedChange(!checked)}
        className={cn(
          "relative mt-0.5 inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-siam-blue focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
          checked ? "bg-siam-blue" : "bg-gray-300 dark:bg-gray-600",
        )}
      >
        <span
          aria-hidden="true"
          className={cn(
            "pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition-transform",
            checked ? "translate-x-5" : "translate-x-0",
          )}
        />
      </button>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-gray-900 dark:text-white">
          Post this task to the Freelancer Marketplace
        </p>
        <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
          Allow our network of verified freelancers to assist with this service.
        </p>
      </div>
    </div>
  );
}
