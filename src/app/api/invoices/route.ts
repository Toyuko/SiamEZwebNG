import { NextRequest, NextResponse } from "next/server";
import { createInvoice } from "@/data-access/invoice";
import { prisma } from "@/lib/db";
import { getApiUser } from "@/lib/auth/getApiUser";
import { requireApiStaff } from "@/lib/auth/requireApiStaff";
import { getUserInvoices } from "@/lib/domain/invoices";
import { ok, fail } from "@/lib/api-response";

/**
 * POST /api/invoices
 * Staff/admin only. Create an invoice for a case.
 * Body: { caseId, amount, quoteId?, currency?, dueDate?, lineItems?, userId? }
 * userId defaults to the case owner when omitted.
 */
export async function POST(request: NextRequest) {
  try {
    await requireApiStaff(request);
    const body = await request.json();
    const { caseId, amount, quoteId, currency, dueDate, lineItems, userId } = body;

    if (!caseId || amount == null) {
      return NextResponse.json(
        { error: "caseId and amount required" },
        { status: 400 }
      );
    }

    const amountNum = Number(amount);
    if (!Number.isFinite(amountNum) || amountNum < 0) {
      return NextResponse.json({ error: "Invalid amount" }, { status: 400 });
    }

    const caseRecord = await prisma.case.findUnique({
      where: { id: caseId },
      select: { id: true, userId: true },
    });
    if (!caseRecord) {
      return NextResponse.json({ error: "Case not found" }, { status: 404 });
    }

    const billingUserId =
      typeof userId === "string" && userId.trim() !== ""
        ? userId.trim()
        : caseRecord.userId;

    if (billingUserId && caseRecord.userId && billingUserId !== caseRecord.userId) {
      return NextResponse.json(
        { error: "userId does not match case owner" },
        { status: 403 }
      );
    }

    const invoice = await createInvoice({
      caseId,
      userId: billingUserId ?? null,
      amount: Math.round(amountNum),
      quoteId: quoteId ?? undefined,
      currency: currency ?? "THB",
      status: "draft",
      dueDate: dueDate ? new Date(dueDate) : undefined,
      lineItems: lineItems ?? undefined,
    });

    return NextResponse.json({ success: true, invoiceId: invoice.id });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Failed to create invoice";
    const status =
      message === "Unauthorized" ? 401 : message === "Forbidden" ? 403 : 500;
    if (status === 500) {
      console.error("POST /api/invoices error", e);
    }
    return NextResponse.json({ error: message }, { status });
  }
}

export async function GET(request: NextRequest) {
  try {
    const { userId } = await getApiUser(request);
    const invoices = await getUserInvoices(userId);
    return ok(invoices);
  } catch (e) {
    const message = e instanceof Error ? e.message : "Failed to fetch invoices";
    return fail(message, message === "Unauthorized" ? 401 : 500);
  }
}
