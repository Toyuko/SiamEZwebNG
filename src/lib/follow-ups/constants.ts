import type {
  FollowUpPriority,
  FollowUpStatus,
  FollowUpType,
} from "@prisma/client";

export const FOLLOW_UP_STATUS_LABELS: Record<FollowUpStatus, string> = {
  PENDING: "Pending",
  DUE: "Due",
  IN_PROGRESS: "In progress",
  COMPLETED: "Completed",
  CANCELLED: "Cancelled",
  SNOOZED: "Snoozed",
};

export const FOLLOW_UP_PRIORITY_LABELS: Record<FollowUpPriority, string> = {
  LOW: "Low",
  NORMAL: "Normal",
  HIGH: "High",
  URGENT: "Urgent",
};

export const FOLLOW_UP_TYPE_LABELS: Record<FollowUpType, string> = {
  CUSTOM: "Custom",
  CLIENT_CONTACT: "Client contact",
  DOCUMENT_REQUEST: "Document request",
  PAYMENT: "Payment",
  SERVICE_COMPLETION: "Service completion",
  RENEWAL: "Renewal",
  REVIEW: "Review",
  CHECK_IN: "Check-in",
  SALES: "Sales",
  QUOTE: "Quote",
  APPOINTMENT: "Appointment",
  OTHER: "Other",
};

/** Statuses that must never receive an automated/manual production reminder. */
export const REMINDER_BLOCKED_STATUSES: ReadonlySet<FollowUpStatus> = new Set([
  "COMPLETED",
  "CANCELLED",
]);

/** Open pipeline statuses that may need staff attention. */
export const OPEN_FOLLOW_UP_STATUSES: FollowUpStatus[] = [
  "PENDING",
  "DUE",
  "IN_PROGRESS",
  "SNOOZED",
];

export const SNOOZE_PRESETS = [
  { id: "tomorrow", label: "Tomorrow", days: 1 },
  { id: "3d", label: "3 days", days: 3 },
  { id: "7d", label: "7 days", days: 7 },
  { id: "30d", label: "30 days", days: 30 },
] as const;

export type SnoozePresetId = (typeof SNOOZE_PRESETS)[number]["id"] | "custom";

export const STATUS_BADGE_CLASS: Record<FollowUpStatus, string> = {
  PENDING: "bg-slate-100 text-slate-700",
  DUE: "bg-amber-100 text-amber-800",
  IN_PROGRESS: "bg-blue-100 text-blue-800",
  COMPLETED: "bg-emerald-100 text-emerald-800",
  CANCELLED: "bg-gray-100 text-gray-500",
  SNOOZED: "bg-violet-100 text-violet-800",
};

export const PRIORITY_BADGE_CLASS: Record<FollowUpPriority, string> = {
  LOW: "bg-slate-50 text-slate-500",
  NORMAL: "bg-sky-50 text-sky-700",
  HIGH: "bg-orange-100 text-orange-800",
  URGENT: "bg-red-100 text-red-800",
};
