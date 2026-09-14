import { cn, formatCurrency } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import { Link } from "@/i18n/navigation";
import type { ReactNode } from "react";

export function FinanceKpiCard({
  label,
  value,
  hint,
  href,
  tone = "default",
}: {
  label: string;
  value: string;
  hint?: string;
  href?: string;
  tone?: "default" | "positive" | "negative" | "warn";
}) {
  const toneClass =
    tone === "positive"
      ? "text-emerald-600 dark:text-emerald-400"
      : tone === "negative"
        ? "text-red-600 dark:text-red-400"
        : tone === "warn"
          ? "text-amber-600 dark:text-amber-400"
          : "text-gray-900 dark:text-white";

  const inner = (
    <Card className={cn(href && "transition hover:border-teal-500/50")}>
      <CardContent className="p-5">
        <p className="text-sm text-gray-500 dark:text-gray-400">{label}</p>
        <p className={cn("mt-1 text-2xl font-bold tabular-nums", toneClass)}>{value}</p>
        {hint ? <p className="mt-1 text-xs text-gray-400">{hint}</p> : null}
      </CardContent>
    </Card>
  );

  if (href) {
    return (
      <Link href={href} className="block">
        {inner}
      </Link>
    );
  }
  return inner;
}

export function money(satang: number, currency = "THB"): string {
  return formatCurrency(satang, currency);
}

export function FinanceSection({
  title,
  children,
  actions,
}: {
  title: string;
  children: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <section className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">{title}</h2>
        {actions}
      </div>
      {children}
    </section>
  );
}

export function FinanceTable({
  headers,
  children,
}: {
  headers: string[];
  children: ReactNode;
}) {
  return (
    <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-800">
      <table className="w-full min-w-[640px] text-left text-sm">
        <thead className="bg-gray-50 text-gray-500 dark:bg-gray-900/50 dark:text-gray-400">
          <tr>
            {headers.map((h) => (
              <th key={h} className="px-3 py-2 font-medium">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100 dark:divide-gray-800">{children}</tbody>
      </table>
    </div>
  );
}

export function StatusPill({ status }: { status: string }) {
  const s = status.toUpperCase();
  const cls =
    s === "PAID" || s === "APPROVED" || s === "CURRENT"
      ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300"
      : s === "UNPAID" || s === "OVERDUE"
        ? "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300"
        : s === "DUE_SOON" || s === "CANCELLED"
          ? "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300"
          : "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300";
  return (
    <span className={cn("inline-flex rounded-full px-2 py-0.5 text-xs font-medium", cls)}>
      {status.replace(/_/g, " ")}
    </span>
  );
}

export const DATE_PRESET_OPTIONS: { value: string; label: string }[] = [
  { value: "today", label: "Today" },
  { value: "this_week", label: "This week" },
  { value: "this_month", label: "This month" },
  { value: "last_month", label: "Last month" },
  { value: "this_quarter", label: "This quarter" },
  { value: "this_year", label: "This year" },
  { value: "last_year", label: "Last year" },
  { value: "last_7_days", label: "7 days" },
  { value: "last_30_days", label: "30 days" },
  { value: "last_90_days", label: "3 months" },
  { value: "last_180_days", label: "6 months" },
  { value: "last_365_days", label: "12 months" },
];
