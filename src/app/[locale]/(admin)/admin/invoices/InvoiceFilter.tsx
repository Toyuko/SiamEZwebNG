"use client";

import { useRouter, usePathname } from "@/i18n/navigation";
import { Select } from "@/components/ui/select";

const STATUS_OPTIONS = [
  { value: "all", label: "All" },
  { value: "draft", label: "Draft" },
  { value: "unpaid", label: "Unpaid" },
  { value: "pending_verification", label: "Pending Verification" },
  { value: "paid", label: "Paid" },
  { value: "rejected", label: "Rejected" },
];

export function InvoiceFilter({ defaultValue }: { defaultValue?: string }) {
  const router = useRouter();
  const pathname = usePathname();

  return (
    <div className="flex items-center gap-2">
      <label htmlFor="invoice-status-filter" className="text-sm font-medium text-gray-700 dark:text-gray-300">
        Status:
      </label>
      <Select
        id="invoice-status-filter"
        defaultValue={defaultValue ?? "all"}
        className="w-36"
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
