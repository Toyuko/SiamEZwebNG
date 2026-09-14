"use client";

import { money } from "./FinanceUi";

/** Simple CSS bar chart for monthly revenue / expenses / profit. */
export function RevenueExpenseChart({
  series,
}: {
  series: { month: string; revenue: number; expenses: number; profit: number }[];
}) {
  const max = Math.max(
    1,
    ...series.flatMap((s) => [s.revenue, s.expenses, Math.abs(s.profit)])
  );

  if (series.length === 0) {
    return <p className="text-sm text-gray-500">No data for this period.</p>;
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-4 text-xs text-gray-500">
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-sm bg-teal-500" /> Revenue
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-sm bg-amber-500" /> Expenses
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-sm bg-emerald-500" /> Profit
        </span>
      </div>
      <div className="flex items-end gap-3 overflow-x-auto pb-2" style={{ minHeight: 180 }}>
        {series.map((s) => (
          <div key={s.month} className="flex min-w-[72px] flex-1 flex-col items-center gap-1">
            <div className="flex h-40 w-full items-end justify-center gap-1">
              <div
                className="w-3 rounded-t bg-teal-500"
                style={{ height: `${Math.max(2, (s.revenue / max) * 100)}%` }}
                title={`Revenue ${money(s.revenue)}`}
              />
              <div
                className="w-3 rounded-t bg-amber-500"
                style={{ height: `${Math.max(2, (s.expenses / max) * 100)}%` }}
                title={`Expenses ${money(s.expenses)}`}
              />
              <div
                className={`w-3 rounded-t ${s.profit >= 0 ? "bg-emerald-500" : "bg-red-500"}`}
                style={{ height: `${Math.max(2, (Math.abs(s.profit) / max) * 100)}%` }}
                title={`Profit ${money(s.profit)}`}
              />
            </div>
            <span className="text-[10px] text-gray-500">{s.month.slice(5)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
