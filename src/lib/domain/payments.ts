import { prisma } from "@/lib/db";
import * as paymentDA from "@/data-access/payment";
import * as invoiceDA from "@/data-access/invoice";
import type { PaymentMethod } from "@prisma/client";

export interface SubmitPaymentInput {
  userId: string;
  invoiceId: string;
  method: PaymentMethod;
  proofDocumentId?: string;
  stripePaymentIntentId?: string;
  stripeChargeId?: string;
}

export async function submitUserPayment(input: SubmitPaymentInput) {
  const invoice = await invoiceDA.getInvoiceByIdForUser(input.invoiceId, input.userId);
  if (!invoice) {
    throw new Error("Invoice not found");
  }
  if (invoice.status === "paid") {
    throw new Error("Invoice already paid");
  }
  if (invoice.status === "rejected") {
    throw new Error("Invoice was rejected");
  }

  if (input.proofDocumentId) {
    const doc = await prisma.document.findFirst({
      where: {
        id: input.proofDocumentId,
        caseId: invoice.caseId,
      },
    });
    if (!doc) {
      throw new Error("Payment proof document not found");
    }
  }

  const payment = await paymentDA.createPayment({
    invoiceId: input.invoiceId,
    caseId: invoice.caseId,
    amount: invoice.amount,
    currency: invoice.currency,
    method: input.method,
    proofDocumentId: input.proofDocumentId,
    stripePaymentIntentId: input.stripePaymentIntentId,
    stripeChargeId: input.stripeChargeId,
    metadata: { source: "mobile_api" },
  });

  await invoiceDA.updateInvoiceStatus(input.invoiceId, "pending_verification");
  await invoiceDA.updateInvoicePaymentMethod(input.invoiceId, input.method);

  return payment;
}
