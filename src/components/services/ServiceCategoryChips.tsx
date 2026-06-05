"use client";

import { cn } from "@/lib/utils";
import { trackEvent } from "@/lib/analytics";

interface ServiceCategoryChipsProps {
  categories: { key: string; label: string }[];
  activeCategory: string;
  onCategoryChange: (key: string) => void;
  allLabel: string;
}

export function ServiceCategoryChips({
  categories,
  activeCategory,
  onCategoryChange,
  allLabel,
}: ServiceCategoryChipsProps) {
  const chips = [{ key: "all", label: allLabel }, ...categories];

  return (
    <div
      className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 scrollbar-none sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0"
      role="tablist"
      aria-label="Service categories"
    >
      {chips.map((chip) => {
        const isActive = activeCategory === chip.key;
        return (
          <button
            key={chip.key}
            type="button"
            role="tab"
            aria-selected={isActive}
            onClick={() => {
              onCategoryChange(chip.key);
              if (chip.key !== "all") {
                trackEvent("service_filter_click", { category: chip.key });
              }
            }}
            className={cn(
              "shrink-0 rounded-full px-4 py-2.5 text-sm font-medium transition-colors min-h-[44px]",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-siam-blue focus-visible:ring-offset-2",
              isActive
                ? "bg-siam-blue text-white shadow-sm"
                : "bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700"
            )}
          >
            {chip.label}
          </button>
        );
      })}
    </div>
  );
}
