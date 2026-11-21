import type { CaseStatus } from "@prisma/client";

export type BookingProgressStageId =
  | "booked"
  | "documents"
  | "review"
  | "appointment"
  | "completed";

export type BookingProgressStage = {
  id: BookingProgressStageId;
  /** 0 = upcoming, 1 = current, 2 = done */
  state: "done" | "current" | "upcoming";
};

const STAGE_ORDER: BookingProgressStageId[] = [
  "booked",
  "documents",
  "review",
  "appointment",
  "completed",
];

/**
 * Map case status onto a simple customer-facing progress ladder.
 * Stages after the current one stay upcoming; earlier stages are done.
 */
export function getBookingProgressStage(status: CaseStatus): BookingProgressStageId {
  switch (status) {
    case "new":
    case "confirmed":
      return "booked";
    case "pending_docs":
      return "documents";
    case "under_review":
    case "quoted":
    case "custom_quote_required":
    case "awaiting_payment":
    case "awaiting_initial_payment":
      return "review";
    case "initial_payment_paid":
    case "paid":
    case "in_progress":
    case "milestone_due":
      return "appointment";
    case "completed":
      return "completed";
    case "cancelled":
    case "refund_pending":
    case "refunded":
      return "review";
    default:
      return "booked";
  }
}

export function buildBookingProgress(status: CaseStatus): BookingProgressStage[] {
  const current = getBookingProgressStage(status);
  const currentIndex = STAGE_ORDER.indexOf(current);

  return STAGE_ORDER.map((id, index) => {
    if (status === "cancelled" || status === "refunded" || status === "refund_pending") {
      return { id, state: index === currentIndex ? "current" : index < currentIndex ? "done" : "upcoming" };
    }
    if (index < currentIndex) return { id, state: "done" };
    if (index === currentIndex) return { id, state: "current" };
    return { id, state: "upcoming" };
  });
}

export function isActiveBookingStatus(status: CaseStatus): boolean {
  return !["cancelled", "completed", "refunded"].includes(status);
}

export type BookingPrimaryAction =
  | "upload"
  | "pay"
  | "review_job"
  | "view";

export function getCasePrimaryAction(status: CaseStatus): BookingPrimaryAction {
  if (status === "pending_docs") return "upload";
  if (
    status === "quoted" ||
    status === "awaiting_payment" ||
    status === "awaiting_initial_payment" ||
    status === "milestone_due"
  ) {
    return "pay";
  }
  return "view";
}
