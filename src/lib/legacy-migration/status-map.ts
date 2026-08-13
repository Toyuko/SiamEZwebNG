import type { LegacyJob, LegacyOrder } from "./types";

const JOB_STATUS_TO_CASE: Record<string, string> = {
  pending: "new",
  confirmed: "paid",
  in_progress: "in_progress",
  completed: "completed",
  cancelled: "cancelled",
};

export function mapJobStatusToCaseStatus(
  jobStatus: string | null | undefined,
  paymentStatus?: string | null
): string {
  const status = (jobStatus ?? "").trim().toLowerCase();
  const payment = (paymentStatus ?? "").trim().toLowerCase();
  if (status === "cancelled") return "cancelled";
  if (status === "confirmed" && payment && payment !== "paid") return "awaiting_payment";
  return JOB_STATUS_TO_CASE[status] ?? "new";
}

export function mapPaymentMethod(
  method: string | null | undefined
): "bank" | "qr" | "wise" | "stripe" {
  const m = (method ?? "").trim().toLowerCase();
  if (m === "qr" || m === "promptpay") return "qr";
  if (m === "wise") return "wise";
  if (m === "stripe" || m === "card") return "stripe";
  return "bank";
}

export function isPaidOrder(order: Pick<LegacyOrder, "payment_status">): boolean {
  return (order.payment_status ?? "").trim().toLowerCase() === "paid";
}

export function isCancelledJob(job: Pick<LegacyJob, "status">): boolean {
  return (job.status ?? "").trim().toLowerCase() === "cancelled";
}

export function stableCaseNumber(legacyJobId: number, orderNumber?: string | null): string {
  if (orderNumber && orderNumber.trim()) {
    return `LEGACY-${orderNumber.trim().toUpperCase()}`;
  }
  return `LEGACY-JOB-${legacyJobId}`;
}
