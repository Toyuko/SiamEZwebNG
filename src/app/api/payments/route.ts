import { NextRequest } from "next/server";
import { getApiUser } from "@/lib/auth/getApiUser";
import { submitUserPayment } from "@/lib/domain/payments";
import { ok, fail } from "@/lib/api-response";
import type { PaymentMethod } from "@prisma/client";

/**
 * POST /api/payments
 * Record a payment for a case.
 * Body: { caseId, invoiceId, amount, currency?, stripePaymentIntentId?, stripeChargeId? }
 */
export async function POST(request: NextRequest) {
  try {
    const { userId } = await getApiUser(request);
    const body = await request.json();
    const {
      method = "stripe",
      stripePaymentIntentId,
      stripeChargeId,
      invoiceId,
      proofDocumentId,
    } = body;

    if (!invoiceId) {
      return fail("invoiceId is required", 400);
    }
    const validMethods: PaymentMethod[] = ["qr", "bank", "wise", "stripe"];
    if (!validMethods.includes(method)) {
      return fail("Invalid payment method", 400);
    }

    const payment = await submitUserPayment({
      userId,
      invoiceId,
      method: method as PaymentMethod,
      proofDocumentId: proofDocumentId ?? undefined,
      stripePaymentIntentId: stripePaymentIntentId ?? undefined,
      stripeChargeId: stripeChargeId ?? undefined,
    });

    return ok(payment, 201);
  } catch (e) {
    const message = e instanceof Error ? e.message : "Failed to record payment";
    return fail(message, message === "Unauthorized" ? 401 : 500);
  }
}
