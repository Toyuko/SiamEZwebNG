import { cn } from "@/lib/utils";
import { FOLLOW_UP_STATUS_LABELS } from "@/lib/driver-license-renewal/constants";
import type { DriverLicenseFollowUpStatus } from "@prisma/client";

const STATUS_STYLES: Record<DriverLicenseFollowUpStatus, string> = {
  UPCOMING: "bg-sky-100 text-sky-800 dark:bg-sky-900/30 dark:text-sky-300",
  REMINDER_DUE: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300",
  REMINDER_SENT: "bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-300",
  CONTACTED: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
  RENEWED: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300",
  CANCELLED: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300",
  NOT_INTERESTED: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300",
};

export function DriverLicenseStatusBadge({
  status,
  className,
}: {
  status: DriverLicenseFollowUpStatus;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex rounded-full px-2 py-1 text-xs font-medium",
        STATUS_STYLES[status],
        className
      )}
    >
      {FOLLOW_UP_STATUS_LABELS[status]}
    </span>
  );
}
