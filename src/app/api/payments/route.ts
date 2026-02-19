import { NextRequest, NextResponse } from "next/server";
import { createPayment } from "@/data-access/payment";
import { prisma } from "@/lib/db";

/**
 * POST /api/payments
 * Record a payment for a case.
 * Body: { caseId, amount, type?, status?, currency?, stripePaymentIntentId?, stripeChargeId?, invoiceId? }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      caseId,
      amount,
      type = "full",
      status = "pending",
      currency = "THB",
      stripePaymentIntentId,
      stripeChargeId,
      invoiceId,
    } = body;

    if (!caseId || amount == null) {
      return NextResponse.json(
        { error: "caseId and amount required" },
        { status: 400 }
      );
    }

    const caseRecord = await prisma.case.findUnique({
      where: { id: caseId },
      select: { id: true },
    });
    if (!caseRecord) {
      return NextResponse.json({ error: "Case not found" }, { status: 404 });
    }

    const metadata = invoiceId != null ? { invoiceId } : undefined;

    const payment = await createPayment({
      caseId,
      amount: Number(amount),
      type,
      status,
      currency,
      stripePaymentIntentId: stripePaymentIntentId ?? undefined,
      stripeChargeId: stripeChargeId ?? undefined,
      metadata,
    });

    return NextResponse.json({ success: true, paymentId: payment.id });
  } catch (e) {
    console.error("POST /api/payments error", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed to record payment" },
      { status: 500 }
    );
  }
}
