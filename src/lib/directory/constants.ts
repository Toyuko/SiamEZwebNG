export const DIRECTORY_PAGE_SIZE = 20;
export const DIRECTORY_MAP_LIMIT = 300;
export const DIRECTORY_REMINDER_DAYS_DEFAULT = 90;
export const DIRECTORY_REMINDER_SETTING_KEY = "directory.verificationReminderDays";
export const DIRECTORY_CSV_MAX_ROWS = 5000;
export const DIRECTORY_CSV_MAX_CHARS = 2_000_000;
export const EXAMPLE_CSV_SLUG = "EXAMPLE-DELETE-THIS-ROW";

export const VERIFICATION_STATUSES = [
  "verified",
  "needs_verification",
  "unverified",
  "temporarily_closed",
  "permanently_closed",
] as const;

export type VerificationStatus = (typeof VERIFICATION_STATUSES)[number];

export const REPORT_FIELDS = ["phone", "address", "hours", "services", "closed", "other"] as const;
export type ReportField = (typeof REPORT_FIELDS)[number];

export const REVIEW_STATUSES = ["open", "in_review", "resolved", "dismissed"] as const;
export type ReviewStatus = (typeof REVIEW_STATUSES)[number];

export const CORRECTION_FIELDS = [
  "phonePrimary",
  "phones",
  "addressEn",
  "addressTh",
  "openingHoursText",
  "operatingDays",
  "lunchBreak",
  "holidayNotes",
  "documentsRequired",
  "serviceNotes",
  "appointmentNotes",
  "website",
  "email",
  "facebookUrl",
  "district",
  "subdistrict",
  "other",
] as const;

export type CorrectionField = (typeof CORRECTION_FIELDS)[number];

export function isVerificationStatus(value: string): value is VerificationStatus {
  return (VERIFICATION_STATUSES as readonly string[]).includes(value);
}

export function clampReminderDays(value: number): number {
  if (!Number.isFinite(value)) return DIRECTORY_REMINDER_DAYS_DEFAULT;
  return Math.min(3650, Math.max(7, Math.round(value)));
}

export function verificationCutoff(reminderDays: number, now = new Date()): Date {
  const days = clampReminderDays(reminderDays);
  return new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
}

export function isVerificationStale(input: {
  verificationStatus: string;
  lastVerifiedAt: Date | null;
  archivedAt?: Date | null;
  reminderDays: number;
  now?: Date;
}): boolean {
  if (input.archivedAt) return false;
  if (input.verificationStatus === "permanently_closed") return false;
  if (
    input.verificationStatus === "unverified" ||
    input.verificationStatus === "needs_verification"
  ) {
    return true;
  }
  if (!input.lastVerifiedAt) return true;
  return input.lastVerifiedAt < verificationCutoff(input.reminderDays, input.now ?? new Date());
}
