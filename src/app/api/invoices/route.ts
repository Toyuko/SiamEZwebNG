import { NextRequest, NextResponse } from "next/server";
import { createInvoice } from "@/data-access/invoice";
import { prisma } from "@/lib/db";

/**
 * POST /api/invoices
 * Create an invoice for a case.
 * Body: { caseId, userId, amount, quoteId?, currency?, dueDate?, lineItems? }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { caseId, userId, amount, quoteId, currency, dueDate, lineItems } = body;

    if (!caseId || !userId || amount == null) {
      return NextResponse.json(
        { error: "caseId, userId, and amount required" },
        { status: 400 }
      );
    }

    const caseRecord = await prisma.case.findUnique({
      where: { id: caseId },
      select: { id: true, userId: true },
    });
    if (!caseRecord) {
      return NextResponse.json({ error: "Case not found" }, { status: 404 });
    }
    if (caseRecord.userId !== userId) {
      return NextResponse.json({ error: "User does not own this case" }, { status: 403 });
    }

    const invoice = await createInvoice({
      caseId,
      userId,
      amount: Number(amount),
      quoteId: quoteId ?? undefined,
      currency: currency ?? "THB",
      status: "draft",
      dueDate: dueDate ? new Date(dueDate) : undefined,
      lineItems: lineItems ?? undefined,
    });

    return NextResponse.json({ success: true, invoiceId: invoice.id });
  } catch (e) {
    console.error("POST /api/invoices error", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed to create invoice" },
      { status: 500 }
    );
  }
}
