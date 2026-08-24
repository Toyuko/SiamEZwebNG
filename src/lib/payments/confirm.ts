/**
 * Shared payment confirmation: approve payment, update quote remaining,
 * advance case status. Marks invoice paid only when fully covered (supports
 * optional depositAmount on full-total invoices). Idempotent.
 */

import { prisma } from "@/lib/db";
import type { InvoiceKind } from "@prisma/client";
import { trackPlatformEvent } from "@/lib/analytics/track";
import { shouldProcessWebhookEvent } from "@/lib/payments/checkout-guard";
import {
  invoiceHasOptionalDeposit,
  isDepositSatisfied,
  isInvoiceFullyPaid,
  sumApprovedPayments,
} from "@/lib/payments/invoice-deposit";

export async function confirmVerifiedPayment(input: {
  invoiceId: string;
  caseId: string;
  paymentId?: string;
  webhookEventId?: string;
  stripeChargeId?: string | null;
}): Promise<{ applied: boolean; reason: string; fullyPaid?: boolean }> {
  if (input.webhookEventId) {
    const existing = await prisma.processedWebhookEvent.findUnique({
      where: { id: input.webhookEventId },
    });
    const payment = input.paymentId
      ? await prisma.payment.findUnique({ where: { id: input.paymentId } })
      : null;
    const gate = shouldProcessWebhookEvent({
      eventId: input.webhookEventId,
      alreadyProcessed: Boolean(existing),
      paymentAlreadyApproved: payment?.status === "approved",
    });
    if (!gate.process) {
      return { applied: false, reason: gate.reason };
    }
  }

  const invoice = await prisma.invoice.findUnique({
    where: { id: input.invoiceId },
    include: {
      quote: true,
      milestone: true,
      payments: { select: { id: true, amount: true, status: true } },
    },
  });
  if (!invoice) return { applied: false, reason: "invoice_missing" };
  if (invoice.status === "paid") {
    return { applied: false, reason: "already_approved", fullyPaid: true };
  }

  let paymentRow = input.paymentId
    ? invoice.payments.find((p) => p.id === input.paymentId) ?? null
    : null;
  if (input.paymentId && !paymentRow) {
    paymentRow = await prisma.payment.findUnique({
      where: { id: input.paymentId },
      select: { id: true, amount: true, status: true },
    });
  }

  const creditedNow =
    paymentRow && paymentRow.status !== "approved" ? paymentRow.amount : 0;
  const alreadyApproved = sumApprovedPayments(
    invoice.payments.filter((p) => p.id !== paymentRow?.id)
  );
  // Include this payment once approved in the running total.
  const approvedTotal =
    alreadyApproved +
    (paymentRow?.status === "approved" ? paymentRow.amount : creditedNow);

  const fullyPaid = isInvoiceFullyPaid(invoice, approvedTotal);
  const hasDeposit = invoiceHasOptionalDeposit(invoice);
  const depositDone = isDepositSatisfied(invoice, approvedTotal);

  await prisma.$transaction(async (tx) => {
    if (input.paymentId) {
      await tx.payment.update({
        where: { id: input.paymentId },
        data: {
          status: "approved",
          approvedAt: new Date(),
          ...(input.stripeChargeId ? { stripeChargeId: input.stripeChargeId } : {}),
          ...(input.webhookEventId ? { webhookEventId: input.webhookEventId } : {}),
        },
      });
    }

    if (fullyPaid) {
      await tx.invoice.update({
        where: { id: invoice.id },
        data: { status: "paid", paidAt: new Date() },
      });

      if (invoice.milestoneId) {
        await tx.paymentMilestone.update({
          where: { id: invoice.milestoneId },
          data: { status: "paid", paidAt: new Date() },
        });
      }
    } else {
      // Deposit / partial paid — keep invoice open for the remaining balance.
      await tx.invoice.update({
        where: { id: invoice.id },
        data: { status: "unpaid", paidAt: null },
      });
    }

    if (invoice.quoteId && creditedNow > 0) {
      const quote = await tx.quote.findUnique({ where: { id: invoice.quoteId } });
      if (quote) {
        const remaining = Math.max(
          0,
          (quote.remainingBalance ?? quote.amount) - creditedNow
        );
        await tx.quote.update({
          where: { id: quote.id },
          data: { remainingBalance: remaining },
        });
      }
    }

    const kind: InvoiceKind = invoice.kind;
    let nextCaseStatus: "paid" | "in_progress" | null = null;
    if (fullyPaid) {
      nextCaseStatus = kind === "full" ? "paid" : "in_progress";
    } else if (hasDeposit && depositDone) {
      nextCaseStatus = "in_progress";
    } else if (kind === "initial" || kind === "milestone" || kind === "balance") {
      // Legacy partial invoice kinds still move the case forward when this invoice is paid
      // (handled above when fullyPaid). While open, leave case status unchanged.
      nextCaseStatus = null;
    }

    if (nextCaseStatus) {
      const caseRecord = await tx.case.findUnique({
        where: { id: input.caseId },
        select: { status: true },
      });
      if (
        caseRecord &&
        caseRecord.status !== "completed" &&
        caseRecord.status !== "cancelled" &&
        caseRecord.status !== "refunded"
      ) {
        await tx.case.update({
          where: { id: input.caseId },
          data: { status: nextCaseStatus },
        });
      }
    }

    if (input.webhookEventId) {
      await tx.processedWebhookEvent.upsert({
        where: { id: input.webhookEventId },
        create: {
          id: input.webhookEventId,
          provider: "stripe",
          type: "payment_intent.succeeded",
        },
        update: {},
      });
    }
  });

  const eventAmount = paymentRow?.amount ?? invoice.amount;
  void trackPlatformEvent(
    !fullyPaid && hasDeposit
      ? "initial_payment_completed"
      : invoice.kind === "milestone"
        ? "milestone_payment_completed"
        : invoice.kind === "initial"
          ? "initial_payment_completed"
          : "booking_confirmed",
    {
      caseId: input.caseId,
      invoiceId: input.invoiceId,
      kind: invoice.kind,
      amount: eventAmount,
      fullyPaid,
      deposit: hasDeposit,
    }
  );
  if (fullyPaid && (invoice.kind === "initial" || invoice.kind === "full")) {
    void trackPlatformEvent("booking_confirmed", {
      caseId: input.caseId,
      invoiceId: input.invoiceId,
    });
  }

  return { applied: true, reason: "new", fullyPaid };
}
