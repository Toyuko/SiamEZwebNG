import type {
  DriverLicenseFollowUpStatus,
  DriverLicenseRenewalType,
} from "@prisma/client";

export const DRIVER_LICENSE_SERVICE_SLUG = "driver-license";

export const RENEWAL_TYPE_LABELS: Record<DriverLicenseRenewalType, string> = {
  DRIVER_LICENSE_2_TO_5: "2 Year → 5 Year",
  DRIVER_LICENSE_5_TO_5: "5 Year → 5 Year",
};

export const FOLLOW_UP_STATUS_LABELS: Record<DriverLicenseFollowUpStatus, string> = {
  UPCOMING: "Upcoming",
  REMINDER_DUE: "Reminder due",
  REMINDER_SENT: "Reminder sent",
  CONTACTED: "Contacted",
  RENEWED: "Renewed",
  CANCELLED: "Cancelled",
  NOT_INTERESTED: "Not interested",
};

/** Statuses that must never receive an automated/manual production reminder. */
export const REMINDER_BLOCKED_STATUSES: ReadonlySet<DriverLicenseFollowUpStatus> = new Set([
  "RENEWED",
  "CANCELLED",
  "NOT_INTERESTED",
]);

/** Active pipeline statuses that may still need staff attention. */
export const ACTIVE_FOLLOW_UP_STATUSES: DriverLicenseFollowUpStatus[] = [
  "UPCOMING",
  "REMINDER_DUE",
  "REMINDER_SENT",
  "CONTACTED",
];

export type DateRangePreset = "7d" | "30d" | "90d" | "6m" | "custom";

export function isDriverLicenseServiceSlug(slug: string | null | undefined): boolean {
  return slug === DRIVER_LICENSE_SERVICE_SLUG;
}
