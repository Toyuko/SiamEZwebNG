"use client";

import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";

const TABS = [
  { key: "pending", label: "Pending" },
  { key: "paid", label: "Paid" },
  { key: "failed", label: "Failed" },
  { key: "all", label: "All" },
] as const;

function buildQuery(base: {
  tab: string;
  q?: string;
  method?: string;
  page?: string;
}) {
  const p = new URLSearchParams();
  if (base.tab && base.tab !== "all") p.set("tab", base.tab);
  if (base.q?.trim()) p.set("q", base.q.trim());
  if (base.method && base.method !== "all") p.set("method", base.method);
  if (base.page && base.page !== "1") p.set("page", base.page);
  const s = p.toString();
  return s ? `?${s}` : "";
}

export function PaymentStatusTabs({
  currentTab,
  q,
  method,
}: {
  currentTab: string;
  q?: string;
  method?: string;
}) {
  const tab = currentTab || "all";

  return (
    <div className="flex flex-wrap gap-2">
      {TABS.map(({ key, label }) => {
        const active = (key === "all" && (tab === "all" || !tab)) || key === tab;
        return (
          <Link
            key={key}
            href={`/admin/payments${buildQuery({ tab: key, q, method })}`}
            className={cn(
              "rounded-lg px-4 py-2 text-sm font-medium transition-colors",
              active
                ? "bg-gradient-to-r from-siam-blue to-blue-600 text-white shadow-sm"
                : "border border-gray-200 bg-white text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200 dark:hover:bg-gray-800"
            )}
          >
            {label}
          </Link>
        );
      })}
    </div>
  );
}
