"use client";

import { useRouter, usePathname } from "@/i18n/navigation";
import { useSearchParams } from "next/navigation";
import { DATE_PRESET_OPTIONS } from "./FinanceUi";

export function FinanceDateFilter({
  defaultPreset = "this_month",
}: {
  defaultPreset?: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const preset = searchParams.get("preset") ?? defaultPreset;

  function update(next: string) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("preset", next);
    params.delete("start");
    params.delete("end");
    router.push(`${pathname}?${params.toString()}`);
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <label className="text-sm text-gray-500" htmlFor="finance-preset">
        Period
      </label>
      <select
        id="finance-preset"
        className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm dark:border-gray-700 dark:bg-gray-900"
        value={preset}
        onChange={(e) => update(e.target.value)}
      >
        {DATE_PRESET_OPTIONS.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  );
}
