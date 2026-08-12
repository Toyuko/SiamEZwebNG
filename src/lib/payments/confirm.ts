/**
 * Shared payment confirmation: invoice paid, quote remaining updated,
 * milestones marked, case status advanced. Idempotent.
 */

import { prisma } from "@/lib/db";
import type { InvoiceKind } from "@prisma/client";
import { trackPlatformEvent } from "@/lib/analytics/track";
import { shouldProcessWebhookEvent } from "@/lib/payments/checkout-guard";

export async function confirmVerifiedPayment(input: {
  invoiceId: string;
  caseId: string;
  paymentId?: string;
  webhookEventId?: string;
  stripeChargeId?: string | null;
}): Promise<{ applied: boolean; reason: string }> {
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
    include: { quote: true, milestone: true },
  });
  if (!invoice) return { applied: false, reason: "invoice_missing" };
  if (invoice.status === "paid") {
    return { applied: false, reason: "already_approved" };
  }

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

    if (invoice.quoteId) {
      const quote = await tx.quote.findUnique({ where: { id: invoice.quoteId } });
      if (quote) {
        const remaining = Math.max(0, (quote.remainingBalance ?? quote.amount) - invoice.amount);
        await tx.quote.update({
          where: { id: quote.id },
          data: { remainingBalance: remaining },
        });
      }
    }

    const kind: InvoiceKind = invoice.kind;
    const nextStatus =
      kind === "full"
        ? "paid"
        : kind === "initial"
          ? "in_progress"
          : kind === "milestone"
            ? "in_progress"
            : "in_progress";

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
        data: {
          status:
            kind === "initial"
              ? "in_progress"
              : kind === "full"
                ? "paid"
                : nextStatus,
        },
      });
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

  void trackPlatformEvent(
    invoice.kind === "milestone"
      ? "milestone_payment_completed"
      : invoice.kind === "initial"
        ? "initial_payment_completed"
        : "booking_confirmed",
    {
      caseId: input.caseId,
      invoiceId: input.invoiceId,
      kind: invoice.kind,
      amount: invoice.amount,
    }
  );
  if (invoice.kind === "initial" || invoice.kind === "full") {
    void trackPlatformEvent("booking_confirmed", {
      caseId: input.caseId,
      invoiceId: input.invoiceId,
    });
  }

  return { applied: true, reason: "new" };
}
