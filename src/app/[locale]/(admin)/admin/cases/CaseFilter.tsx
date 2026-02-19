"use client";

import { useRouter, usePathname } from "@/i18n/navigation";
import { Select } from "@/components/ui/select";
const STATUS_OPTIONS: { value: string; label: string }[] = [
  { value: "all", label: "All active" },
  { value: "new", label: "New" },
  { value: "under_review", label: "Under review" },
  { value: "quoted", label: "Quoted" },
  { value: "awaiting_payment", label: "Awaiting payment" },
  { value: "paid", label: "Paid" },
  { value: "in_progress", label: "In progress" },
  { value: "pending_docs", label: "Pending docs" },
  { value: "completed", label: "Completed" },
  { value: "cancelled", label: "Cancelled" },
];

export function CaseFilter({ defaultValue }: { defaultValue?: string }) {
  const router = useRouter();
  const pathname = usePathname();

  return (
    <div className="flex items-center gap-2">
      <label htmlFor="status-filter" className="text-sm font-medium text-gray-700 dark:text-gray-300">
        Status:
      </label>
      <Select
        id="status-filter"
        defaultValue={defaultValue ?? "all"}
        className="w-44"
        onChange={(e) => {
          const v = e.target.value;
          router.push(`${pathname}${v === "all" ? "" : `?status=${v}`}`);
        }}
      >
        {STATUS_OPTIONS.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </Select>
    </div>
  );
}
