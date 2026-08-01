"use client";

import { Link } from "@/i18n/navigation";
import { Bell, CreditCard, FileText, FolderOpen, Briefcase } from "lucide-react";
import { cn } from "@/lib/utils";
import { useTranslations } from "next-intl";
import type { ActivityItem } from "./ActivityFeed";

const typeIcon = {
  case: FolderOpen,
  invoice: CreditCard,
  document: FileText,
  job: Briefcase,
  system: Bell,
} as const;

const statusColors = {
  required: "bg-blue-500",
  pending: "bg-yellow-500",
  completed: "bg-gray-400",
  info: "bg-gray-400",
};

export function NotificationsList({
  items,
  emptyLabel,
  managePrefsLabel,
}: {
  items: ActivityItem[];
  emptyLabel: string;
  managePrefsLabel: string;
}) {
  const t = useTranslations("portal");

  if (items.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-gray-300 bg-white px-6 py-12 text-center dark:border-gray-700 dark:bg-gray-800">
        <Bell className="mx-auto h-10 w-10 text-gray-400" aria-hidden />
        <p className="mt-4 text-gray-600 dark:text-gray-400">{emptyLabel}</p>
        <Link
          href="/portal/profile"
          className="mt-4 inline-block text-sm font-medium text-siam-blue hover:underline"
        >
          {managePrefsLabel}
        </Link>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800">
      <ul className="divide-y divide-gray-200 dark:divide-gray-700">
        {items.map((item) => {
          const Icon = typeIcon[item.type] ?? Bell;
          const content = (
            <>
              <span
                className={cn(
                  "mt-1.5 h-2 w-2 shrink-0 rounded-full",
                  item.status ? statusColors[item.status] : statusColors.info
                )}
                aria-hidden
              />
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-siam-blue/10">
                <Icon className="h-4 w-4 text-siam-blue" aria-hidden />
              </span>
              <div className="min-w-0 flex-1">
                <p className="font-medium text-gray-900 dark:text-white">{item.title}</p>
                <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
                  {item.timestamp}
                  {item.action ? ` · ${t("action")}: ${item.action}` : null}
                </p>
              </div>
            </>
          );

          return (
            <li key={item.id}>
              {item.href ? (
                <Link
                  href={item.href}
                  className="flex items-start gap-3 px-4 py-4 transition-colors hover:bg-gray-50 dark:hover:bg-gray-700/40"
                >
                  {content}
                </Link>
              ) : (
                <div className="flex items-start gap-3 px-4 py-4">{content}</div>
              )}
            </li>
          );
        })}
      </ul>
      <div className="border-t border-gray-200 px-4 py-3 dark:border-gray-700">
        <Link
          href="/portal/profile"
          className="text-sm font-medium text-siam-blue hover:underline"
        >
          {managePrefsLabel}
        </Link>
      </div>
    </div>
  );
}
