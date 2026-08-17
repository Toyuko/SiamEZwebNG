import type { CaseStatus } from "@prisma/client";

/**
 * Allowed staff-driven case status transitions.
 * Payment systems (Stripe webhook, manual Mark as paid, Finance Add Payment)
 * may set paid / initial_payment_paid directly (bypasses this graph).
 */
export const CASE_STATUS_TRANSITIONS: Record<CaseStatus, readonly CaseStatus[]> = {
  new: ["under_review", "quoted", "awaiting_payment", "awaiting_initial_payment", "custom_quote_required", "cancelled"],
  under_review: ["quoted", "awaiting_payment", "awaiting_initial_payment", "custom_quote_required", "cancelled", "pending_docs"],
  quoted: ["awaiting_payment", "awaiting_initial_payment", "under_review", "custom_quote_required", "cancelled"],
  custom_quote_required: ["quoted", "under_review", "awaiting_payment", "awaiting_initial_payment", "cancelled"],
  awaiting_payment: ["paid", "initial_payment_paid", "cancelled", "under_review", "refund_pending"],
  awaiting_initial_payment: ["initial_payment_paid", "paid", "cancelled", "under_review", "refund_pending"],
  initial_payment_paid: ["in_progress", "paid", "milestone_due", "pending_docs", "cancelled", "refund_pending"],
  paid: ["in_progress", "pending_docs", "cancelled", "refund_pending"],
  in_progress: ["pending_docs", "milestone_due", "completed", "cancelled", "refund_pending"],
  milestone_due: ["in_progress", "paid", "completed", "cancelled", "refund_pending"],
  pending_docs: ["in_progress", "completed", "cancelled"],
  completed: ["refund_pending"],
  cancelled: ["refund_pending", "refunded"],
  refund_pending: ["refunded", "cancelled", "in_progress"],
  refunded: [],
};

export function canTransitionCaseStatus(from: CaseStatus, to: CaseStatus): boolean {
  if (from === to) return true;
  return CASE_STATUS_TRANSITIONS[from]?.includes(to) ?? false;
}

export function assertCaseStatusTransition(from: CaseStatus, to: CaseStatus): void {
  if (!canTransitionCaseStatus(from, to)) {
    throw new Error(`Invalid status transition: ${from} → ${to}`);
  }
}

export const CASE_STATUS_LABELS: Record<CaseStatus, { en: string; th: string }> = {
  new: { en: "New", th: "ใหม่" },
  under_review: { en: "Under Review", th: "กำลังตรวจสอบ" },
  quoted: { en: "Quoted", th: "มีใบเสนอราคา" },
  custom_quote_required: { en: "Custom Quote Required", th: "รอใบเสนอราคาเฉพาะ" },
  awaiting_payment: { en: "Awaiting Payment", th: "รอชำระเงิน" },
  awaiting_initial_payment: { en: "Awaiting Initial Payment", th: "รอชำระเงินเริ่มต้น" },
  initial_payment_paid: { en: "Initial Payment Received", th: "ได้รับเงินเริ่มต้นแล้ว" },
  paid: { en: "Paid", th: "ชำระแล้ว" },
  in_progress: { en: "In Progress", th: "กำลังดำเนินการ" },
  milestone_due: { en: "Milestone Due", th: "ถึงกำหนดชำระงวด" },
  pending_docs: { en: "Pending Documents", th: "รอเอกสาร" },
  completed: { en: "Completed", th: "เสร็จสิ้น" },
  cancelled: { en: "Cancelled", th: "ยกเลิก" },
  refund_pending: { en: "Refund Pending", th: "รอคืนเงิน" },
  refunded: { en: "Refunded", th: "คืนเงินแล้ว" },
};

export const CASE_STATUS_BADGE_CLASS: Record<CaseStatus, string> = {
  new: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
  under_review: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300",
  quoted: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300",
  custom_quote_required: "bg-violet-100 text-violet-800 dark:bg-violet-900/30 dark:text-violet-300",
  awaiting_payment: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300",
  awaiting_initial_payment: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300",
  initial_payment_paid: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300",
  paid: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
  in_progress: "bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-300",
  milestone_due: "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300",
  pending_docs: "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300",
  completed: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300",
  cancelled: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300",
  refund_pending: "bg-rose-100 text-rose-800 dark:bg-rose-900/30 dark:text-rose-300",
  refunded: "bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300",
};
