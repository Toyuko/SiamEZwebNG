/**
 * Manual (offline) payment settlement shared by Finance "Add Payment"
 * and Service Jobs "Mark as paid".
 *
 * When an invoice has optional depositAmount, "mark paid" / add payment settles
 * the amount due now (deposit first, then remaining balance). The invoice stays
 * open until approved payments cover the full total.
 */

import { prisma } from "@/lib/db";
import { confirmVerifiedPayment } from "@/lib/payments/confirm";
import type { InvoiceKind, PaymentMethod, Prisma } from "@prisma/client";
import { trackPlatformEvent } from "@/lib/analytics/track";
import {
  invoiceAmountDueNow,
  isInvoiceFullyPaid,
  sumApprovedPayments,
} from "@/lib/payments/invoice-deposit";

const OPEN_INVOICE_STATUSES = new Set(["draft", "unpaid", "pending_verification"]);

export function caseStatusAfterInvoiceKind(kind: InvoiceKind): "paid" | "in_progress" {
  return kind === "full" ? "paid" : "in_progress";
}

export function pickOpenInvoiceForManualPayment<
  T extends { id: string; status: string; createdAt: Date },
>(invoices: T[]): T | null {
  const open = invoices.filter((inv) => OPEN_INVOICE_STATUSES.has(inv.status));
  if (open.length === 0) return null;
  return open.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())[0] ?? null;
}

export async function settleManualInvoicePayment(input: {
  invoiceId: string;
  method?: PaymentMethod;
}): Promise<{
  success: boolean;
  error?: string;
  paymentId?: string;
  alreadySettled?: boolean;
}> {
  const method = input.method ?? "bank";

  const invoice = await prisma.invoice.findUnique({
    where: { id: input.invoiceId },
    include: {
      quote: true,
      milestone: true,
      case: { select: { id: true, status: true } },
      payments: {
        where: { status: { in: ["approved", "submitted"] } },
        orderBy: { createdAt: "desc" },
      },
    },
  });

  if (!invoice) return { success: false, error: "Invoice not found" };
  if (invoice.status === "rejected") {
    return { success: false, error: "Invoice was rejected" };
  }

  const approvedPaid = sumApprovedPayments(invoice.payments);
  if (invoice.status === "paid" || isInvoiceFullyPaid(invoice, approvedPaid)) {
    const nextStatus = caseStatusAfterInvoiceKind(invoice.kind);
    if (
      invoice.case.status !== "completed" &&
      invoice.case.status !== "cancelled" &&
      invoice.case.status !== "refunded" &&
      invoice.case.status !== nextStatus
    ) {
      await prisma.case.update({
        where: { id: invoice.caseId },
        data: { status: nextStatus },
      });
    }
    const approved = invoice.payments.find((p) => p.status === "approved");
    return {
      success: true,
      alreadySettled: true,
      paymentId: approved?.id,
    };
  }

  const submitted = invoice.payments.find((p) => p.status === "submitted");
  if (submitted) {
    const result = await confirmVerifiedPayment({
      invoiceId: invoice.id,
      caseId: invoice.caseId,
      paymentId: submitted.id,
    });
    if (!result.applied && result.reason !== "already_approved") {
      return { success: false, error: `Failed to settle payment (${result.reason})` };
    }
    await prisma.invoice.update({
      where: { id: invoice.id },
      data: { paymentMethod: method },
    });
    return { success: true, paymentId: submitted.id };
  }

  if (!OPEN_INVOICE_STATUSES.has(invoice.status)) {
    return { success: false, error: `Invoice cannot be marked paid (status: ${invoice.status})` };
  }

  const dueNow = invoiceAmountDueNow(invoice, approvedPaid);
  if (dueNow <= 0) {
    return { success: false, error: "Nothing due on this invoice" };
  }

  const payment = await prisma.payment.create({
    data: {
      invoiceId: invoice.id,
      caseId: invoice.caseId,
      amount: dueNow,
      currency: invoice.currency,
      method,
      status: "submitted",
      kind: invoice.kind,
      metadata: { manualEntry: true } as Prisma.InputJsonValue,
    },
  });

  const result = await confirmVerifiedPayment({
    invoiceId: invoice.id,
    caseId: invoice.caseId,
    paymentId: payment.id,
  });
  if (!result.applied && result.reason !== "already_approved") {
    return { success: false, error: `Failed to settle payment (${result.reason})` };
  }

  await prisma.invoice.update({
    where: { id: invoice.id },
    data: { paymentMethod: method },
  });

  void trackPlatformEvent(
    result.fullyPaid
      ? invoice.kind === "milestone"
        ? "milestone_payment_completed"
        : invoice.kind === "initial"
          ? "initial_payment_completed"
          : "booking_confirmed"
      : "initial_payment_completed",
    {
      caseId: invoice.caseId,
      invoiceId: invoice.id,
      kind: invoice.kind,
      amount: dueNow,
      manualEntry: true,
      fullyPaid: result.fullyPaid ?? false,
    }
  );

  return { success: true, paymentId: payment.id };
}

/**
 * Mark a service job (Case) as paid and sync Invoice + Payment rows.
 * With deposit invoices, settles the amount due now (may leave a balance).
 */
export async function markCasePaidManually(
  caseId: string,
  options?: { amountSatang?: number }
): Promise<{
  success: boolean;
  error?: string;
  paymentId?: string;
  alreadySettled?: boolean;
}> {
  const caseRow = await prisma.case.findUnique({
    where: { id: caseId },
    include: {
      invoices: { orderBy: { createdAt: "desc" } },
      service: { select: { priceAmount: true } },
    },
  });

  if (!caseRow) return { success: false, error: "Job not found" };
  if (caseRow.status === "cancelled" || caseRow.status === "refunded") {
    return { success: false, error: "Cannot mark a cancelled or refunded job as paid" };
  }

  const openInvoice = pickOpenInvoiceForManualPayment(caseRow.invoices);
  if (openInvoice) {
    if (options?.amountSatang !== undefined && options.amountSatang > 0) {
      await prisma.invoice.update({
        where: { id: openInvoice.id },
        data: { amount: options.amountSatang },
      });
    }
    return settleManualInvoicePayment({ invoiceId: openInvoice.id });
  }

  const paidInvoice = caseRow.invoices.find((inv) => inv.status === "paid");
  if (paidInvoice) {
    const nextStatus = caseStatusAfterInvoiceKind(paidInvoice.kind);
    if (caseRow.status !== "completed" && caseRow.status !== nextStatus) {
      await prisma.case.update({
        where: { id: caseId },
        data: { status: nextStatus },
      });
    }
    return { success: true, alreadySettled: true };
  }

  const amount =
    options?.amountSatang && options.amountSatang > 0
      ? options.amountSatang
      : caseRow.service.priceAmount && caseRow.service.priceAmount > 0
        ? caseRow.service.priceAmount
        : null;

  if (!amount) {
    return {
      success: false,
      error: "Set an amount on the job before marking it paid",
    };
  }

  const invoice = await prisma.invoice.create({
    data: {
      caseId,
      userId: caseRow.userId,
      amount,
      currency: "THB",
      status: "unpaid",
      kind: "full",
    },
  });

  return settleManualInvoicePayment({ invoiceId: invoice.id });
}
