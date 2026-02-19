"use client";

import { Link } from "@/i18n/navigation";
import { MoreVertical } from "lucide-react";
import { cn } from "@/lib/utils";
import { useTranslations } from "next-intl";

export interface ActivityItem {
  id: string;
  type: "case" | "invoice" | "document" | "system";
  title: string;
  timestamp: string;
  action?: string;
  status?: "required" | "pending" | "completed" | "info";
}

interface ActivityFeedProps {
  items: ActivityItem[];
  maxItems?: number;
}

const statusColors = {
  required: "bg-blue-500",
  pending: "bg-yellow-500",
  completed: "bg-gray-400",
  info: "bg-gray-400",
};

export function ActivityFeed({ items, maxItems = 10 }: ActivityFeedProps) {
  const t = useTranslations("portal");
  const displayItems = items.slice(0, maxItems);

  const formatTimestamp = (timestamp: string) => {
    // Simple relative time formatting
    return timestamp;
  };

  return (
    <div className="mt-8">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white">{t("recentUpdates")}</h2>
        <Link
          href="/portal"
          className="text-sm font-medium text-siam-blue hover:underline dark:text-siam-blue-light"
        >
          {t("viewAllActivity")}
        </Link>
      </div>

      <div className="divide-y divide-gray-200 rounded-lg border border-gray-200 bg-white dark:divide-gray-700 dark:border-gray-700 dark:bg-gray-800">
        {displayItems.map((item, index) => (
          <div
            key={item.id}
            className="flex items-start gap-4 p-4 transition-colors hover:bg-gray-50 dark:hover:bg-gray-700/50"
          >
            {/* Status dot */}
            <div
              className={cn(
                "mt-1 h-2 w-2 shrink-0 rounded-full",
                item.status ? statusColors[item.status] : statusColors.info
              )}
            />

            {/* Content */}
            <div className="flex-1">
              <p className="font-semibold text-gray-900 dark:text-white">{item.title}</p>
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                {formatTimestamp(item.timestamp)}
                {item.action && ` • ${t("action")}: ${item.action}`}
              </p>
            </div>

            {/* Menu button */}
            <button
              type="button"
              className="rounded-lg p-1 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-700 dark:hover:text-gray-300"
            >
              <MoreVertical className="h-4 w-4" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
