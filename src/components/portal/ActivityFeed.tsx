"use client";

import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";
import { useTranslations } from "next-intl";

export interface ActivityItem {
  id: string;
  type: "case" | "invoice" | "document" | "job" | "system";
  title: string;
  timestamp: string;
  action?: string;
  status?: "required" | "pending" | "completed" | "info";
  href?: string;
}

interface ActivityFeedProps {
  items: ActivityItem[];
  maxItems?: number;
  viewAllHref?: string;
}

const statusColors = {
  required: "bg-blue-500",
  pending: "bg-yellow-500",
  completed: "bg-gray-400",
  info: "bg-gray-400",
};

export function ActivityFeed({
  items,
  maxItems = 10,
  viewAllHref = "/portal/notifications",
}: ActivityFeedProps) {
  const t = useTranslations("portal");
  const displayItems = items.slice(0, maxItems);

  return (
    <div className="mt-8">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
          {t("recentUpdates")}
        </h2>
        <Link
          href={viewAllHref}
          className="text-sm font-medium text-siam-blue hover:underline dark:text-siam-blue-light"
        >
          {t("viewAllActivity")}
        </Link>
      </div>

      {displayItems.length === 0 ? (
        <p className="rounded-lg border border-dashed border-gray-300 bg-white px-4 py-8 text-center text-sm text-gray-500 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400">
          {t("noRecentUpdates")}
        </p>
      ) : (
        <div className="divide-y divide-gray-200 rounded-lg border border-gray-200 bg-white dark:divide-gray-700 dark:border-gray-700 dark:bg-gray-800">
          {displayItems.map((item) => {
            const row = (
              <>
                <div
                  className={cn(
                    "mt-1 h-2 w-2 shrink-0 rounded-full",
                    item.status ? statusColors[item.status] : statusColors.info
                  )}
                />
                <div className="flex-1">
                  <p className="font-semibold text-gray-900 dark:text-white">{item.title}</p>
                  <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                    {item.timestamp}
                    {item.action && ` • ${t("action")}: ${item.action}`}
                  </p>
                </div>
              </>
            );

            return item.href ? (
              <Link
                key={item.id}
                href={item.href}
                className="flex items-start gap-4 p-4 transition-colors hover:bg-gray-50 dark:hover:bg-gray-700/50"
              >
                {row}
              </Link>
            ) : (
              <div
                key={item.id}
                className="flex items-start gap-4 p-4 transition-colors hover:bg-gray-50 dark:hover:bg-gray-700/50"
              >
                {row}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
