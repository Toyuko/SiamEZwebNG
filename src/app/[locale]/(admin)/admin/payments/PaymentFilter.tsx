"use client";

import { useRouter, usePathname } from "@/i18n/navigation";
import { Select } from "@/components/ui/select";

const STATUS_OPTIONS = [
  { value: "all", label: "All" },
  { value: "submitted", label: "Pending review" },
  { value: "approved", label: "Approved" },
  { value: "rejected", label: "Rejected" },
];

export function PaymentFilter({ defaultValue }: { defaultValue?: string }) {
  const router = useRouter();
  const pathname = usePathname();

  return (
    <div className="flex items-center gap-2">
      <label htmlFor="payment-status-filter" className="text-sm font-medium text-gray-700 dark:text-gray-300">
        Status:
      </label>
      <Select
        id="payment-status-filter"
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
