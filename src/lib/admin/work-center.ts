import type { CaseStatus } from "@prisma/client";
import type { Prisma } from "@prisma/client";
import { CASE_STATUS_LABELS } from "@/lib/domain/case-status";

/** High-level Work Center tabs — views over the same Case dataset. */
export type WorkCenterTab =
  | "all"
  | "needs_action"
  | "in_progress"
  | "awaiting_customer"
  | "awaiting_payment"
  | "completed"
  | "cancelled";

export const WORK_CENTER_TABS: { id: WorkCenterTab; label: string }[] = [
  { id: "all", label: "All Work" },
  { id: "needs_action", label: "Needs Action" },
  { id: "in_progress", label: "In Progress" },
  { id: "awaiting_customer", label: "Awaiting Customer" },
  { id: "awaiting_payment", label: "Awaiting Payment" },
  { id: "completed", label: "Completed" },
  { id: "cancelled", label: "Cancelled" },
];

const CLOSED: CaseStatus[] = ["completed", "cancelled", "refunded"];

const AWAITING_PAYMENT: CaseStatus[] = [
  "awaiting_payment",
  "awaiting_initial_payment",
  "milestone_due",
];

const AWAITING_CUSTOMER: CaseStatus[] = [
  "pending_docs",
  "quoted",
  "custom_quote_required",
  "under_review",
];

const IN_PROGRESS: CaseStatus[] = [
  "in_progress",
  "confirmed",
  "paid",
  "initial_payment_paid",
];

const NEEDS_ACTION_STATUSES: CaseStatus[] = [
  "new",
  "under_review",
  "pending_docs",
  "awaiting_payment",
  "awaiting_initial_payment",
  "milestone_due",
  "custom_quote_required",
  "quoted",
  "refund_pending",
];

export function isWorkCenterTab(value: string | undefined): value is WorkCenterTab {
  return WORK_CENTER_TABS.some((tab) => tab.id === value);
}

/** Map a Work Center tab to a Prisma Case where clause (plus optional needs-action ORs). */
export function workCenterTabWhere(
  tab: WorkCenterTab,
  now = new Date()
): Prisma.CaseWhereInput {
  switch (tab) {
    case "all":
      return {};
    case "in_progress":
      return { status: { in: IN_PROGRESS } };
    case "awaiting_customer":
      return { status: { in: AWAITING_CUSTOMER } };
    case "awaiting_payment":
      return { status: { in: AWAITING_PAYMENT } };
    case "completed":
      return { status: "completed" };
    case "cancelled":
      return { status: { in: ["cancelled", "refunded"] } };
    case "needs_action":
      return {
        OR: [
          { status: { in: NEEDS_ACTION_STATUSES } },
          {
            AND: [
              { status: { notIn: CLOSED } },
              { staffAssignments: { none: {} } },
            ],
          },
          {
            AND: [
              { status: { in: ["paid", "confirmed", "in_progress", "initial_payment_paid"] } },
              { scheduledAt: null },
            ],
          },
          {
            AND: [
              { status: { notIn: CLOSED } },
              { scheduledAt: { lt: now } },
            ],
          },
        ],
      };
    default:
      return {};
  }
}

export type WorkActionHint = {
  code: string;
  label: string;
  tone: "danger" | "warning" | "info";
};

type ActionInput = {
  status: CaseStatus;
  assignedStaffId: string | null;
  scheduledAt: Date | string | null;
  outstandingSatang: number;
  paymentStatus: string;
  documentsRequired: string[];
  now?: Date;
};

/** Plain-language reasons a work item needs attention. */
export function deriveWorkActions(input: ActionInput): WorkActionHint[] {
  const now = input.now ?? new Date();
  const actions: WorkActionHint[] = [];
  const scheduled =
    input.scheduledAt == null
      ? null
      : typeof input.scheduledAt === "string"
        ? new Date(input.scheduledAt)
        : input.scheduledAt;

  if (!input.assignedStaffId && !CLOSED.includes(input.status)) {
    actions.push({ code: "unassigned", label: "Assign staff", tone: "warning" });
  }

  if (input.status === "pending_docs") {
    actions.push({ code: "docs", label: "Waiting for documents", tone: "warning" });
  } else if (input.documentsRequired.length > 0 && input.status === "new") {
    actions.push({ code: "docs_checklist", label: "Documents checklist pending", tone: "info" });
  }

  if (AWAITING_PAYMENT.includes(input.status) || input.outstandingSatang > 0) {
    if (input.paymentStatus !== "paid" && !CLOSED.includes(input.status)) {
      const baht = Math.round(input.outstandingSatang / 100).toLocaleString("en-US");
      actions.push({
        code: "payment",
        label:
          input.outstandingSatang > 0
            ? `Payment outstanding ฿${baht}`
            : "Awaiting payment",
        tone: "danger",
      });
    }
  }

  if (
    ["paid", "confirmed", "in_progress", "initial_payment_paid"].includes(input.status) &&
    !scheduled
  ) {
    actions.push({
      code: "schedule",
      label: "Appointment not scheduled",
      tone: "warning",
    });
  }

  if (scheduled && scheduled.getTime() < now.getTime() && !CLOSED.includes(input.status)) {
    actions.push({ code: "overdue", label: "Appointment overdue", tone: "danger" });
  }

  if (input.status === "new" || input.status === "under_review") {
    actions.push({ code: "review", label: "Needs review", tone: "info" });
  }

  if (input.status === "refund_pending") {
    actions.push({ code: "refund", label: "Refund pending", tone: "danger" });
  }

  if (input.status === "quoted" || input.status === "custom_quote_required") {
    actions.push({
      code: "quote",
      label:
        input.status === "custom_quote_required"
          ? "Custom quote required"
          : "Waiting on customer quote response",
      tone: "warning",
    });
  }

  // De-dupe by code while preserving order
  const seen = new Set<string>();
  return actions.filter((a) => {
    if (seen.has(a.code)) return false;
    seen.add(a.code);
    return true;
  });
}

export function workStatusLabel(status: CaseStatus, locale: "en" | "th" = "en"): string {
  return CASE_STATUS_LABELS[status]?.[locale] ?? status;
}

/** Accessible badge tone for Work Center status chips. */
export function workStatusTone(
  status: CaseStatus
): "green" | "yellow" | "blue" | "red" | "grey" {
  if (status === "completed" || status === "paid" || status === "initial_payment_paid") {
    return "green";
  }
  if (
    status === "awaiting_payment" ||
    status === "awaiting_initial_payment" ||
    status === "pending_docs" ||
    status === "quoted" ||
    status === "custom_quote_required" ||
    status === "under_review" ||
    status === "new" ||
    status === "milestone_due"
  ) {
    return "yellow";
  }
  if (status === "in_progress" || status === "confirmed") {
    return "blue";
  }
  if (status === "cancelled" || status === "refunded" || status === "refund_pending") {
    return status === "refund_pending" ? "red" : "grey";
  }
  return "blue";
}

export const WORK_STATUS_TONE_CLASS: Record<
  ReturnType<typeof workStatusTone>,
  string
> = {
  green: "bg-emerald-100 text-emerald-900 dark:bg-emerald-900/40 dark:text-emerald-200",
  yellow: "bg-amber-100 text-amber-900 dark:bg-amber-900/40 dark:text-amber-200",
  blue: "bg-sky-100 text-sky-900 dark:bg-sky-900/40 dark:text-sky-200",
  red: "bg-red-100 text-red-900 dark:bg-red-900/40 dark:text-red-200",
  grey: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
};

export const PAYMENT_TONE_CLASS: Record<string, string> = {
  paid: "bg-emerald-100 text-emerald-900 dark:bg-emerald-900/40 dark:text-emerald-200",
  partial: "bg-amber-100 text-amber-900 dark:bg-amber-900/40 dark:text-amber-200",
  unpaid: "bg-yellow-100 text-yellow-900 dark:bg-yellow-900/40 dark:text-yellow-200",
};
