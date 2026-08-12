import { NextRequest } from "next/server";
import { getApiUser } from "@/lib/auth/getApiUser";
import { submitUserPayment } from "@/lib/domain/payments";
import { ok, fail } from "@/lib/api-response";
import type { PaymentMethod } from "@prisma/client";

/**
 * POST /api/payments
 * Record a payment for a case (manual methods only until Stripe ships).
 * Body: { invoiceId, method?: "qr"|"bank"|"wise", proofDocumentId? }
 */
export async function POST(request: NextRequest) {
  try {
    const { userId } = await getApiUser(request);
    const body = await request.json();
    const {
      method = "bank",
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
    if (method === "stripe" || stripePaymentIntentId || stripeChargeId) {
      return fail("Card payments are not available yet. Use qr, bank, or wise.", 400);
    }

    const payment = await submitUserPayment({
      userId,
      invoiceId,
      method: method as PaymentMethod,
      proofDocumentId: proofDocumentId ?? undefined,
    });

    return ok(payment, 201);
  } catch (e) {
    const message = e instanceof Error ? e.message : "Failed to record payment";
    return fail(message, message === "Unauthorized" ? 401 : 500);
  }
}
