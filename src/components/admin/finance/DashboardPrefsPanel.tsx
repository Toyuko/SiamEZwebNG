"use client";

import { useState, useTransition } from "react";
import { useRouter } from "@/i18n/navigation";
import {
  getFinancialDashboardPrefsAction,
  saveFinancialDashboardPrefsAction,
} from "@/actions/finance-analytics";
import type { DatePreset } from "@/lib/finance/dates";
import { DATE_PRESET_LABELS } from "@/lib/finance/dates";
import { Button } from "@/components/ui/button";

const KPI_OPTIONS = [
  "netRevenue",
  "grossProfit",
  "netProfit",
  "staffCosts",
  "operatingExpenses",
  "jobs",
  "avgJobValue",
  "accountsReceivable",
];

export function DashboardPrefsPanel({
  initial,
}: {
  initial: Awaited<ReturnType<typeof getFinancialDashboardPrefsAction>>;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [hiddenKpis, setHiddenKpis] = useState<string[]>(initial.hiddenKpis ?? []);
  const [defaultPreset, setDefaultPreset] = useState<DatePreset>(
    initial.defaultPreset ?? "this_month"
  );
  const [pending, start] = useTransition();

  if (!open) {
    return (
      <Button type="button" variant="outline" size="sm" onClick={() => setOpen(true)}>
        Customize dashboard
      </Button>
    );
  }

  return (
    <div className="rounded-lg border border-gray-200 p-4 dark:border-gray-800">
      <div className="mb-3 flex items-center justify-between">
        <p className="text-sm font-medium">Dashboard preferences</p>
        <Button type="button" variant="ghost" size="sm" onClick={() => setOpen(false)}>
          Close
        </Button>
      </div>
      <label className="mb-3 block text-sm">
        <span className="text-gray-500">Default period</span>
        <select
          className="mt-1 w-full rounded-md border border-gray-300 px-3 py-1.5 dark:border-gray-700 dark:bg-gray-900"
          value={defaultPreset}
          onChange={(e) => setDefaultPreset(e.target.value as DatePreset)}
        >
          {DATE_PRESET_LABELS.filter((p) => p.value !== "custom").map((p) => (
            <option key={p.value} value={p.value}>
              {p.label}
            </option>
          ))}
        </select>
      </label>
      <p className="mb-2 text-sm text-gray-500">Hide KPI cards</p>
      <div className="mb-3 flex flex-wrap gap-2">
        {KPI_OPTIONS.map((k) => (
          <label key={k} className="inline-flex items-center gap-1 text-xs">
            <input
              type="checkbox"
              checked={hiddenKpis.includes(k)}
              onChange={() =>
                setHiddenKpis((prev) =>
                  prev.includes(k) ? prev.filter((x) => x !== k) : [...prev, k]
                )
              }
            />
            {k}
          </label>
        ))}
      </div>
      <Button
        type="button"
        size="sm"
        disabled={pending}
        onClick={() => {
          start(async () => {
            await saveFinancialDashboardPrefsAction({
              ...initial,
              hiddenKpis,
              defaultPreset,
            });
            setOpen(false);
            router.refresh();
          });
        }}
      >
        {pending ? "Saving…" : "Save preferences"}
      </Button>
    </div>
  );
}
