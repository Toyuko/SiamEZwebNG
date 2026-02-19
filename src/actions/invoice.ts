"use server";

import * as invoiceDA from "@/data-access/invoice";

export interface CreateInvoiceFromQuoteInput {
  caseId: string;
  quoteId: string;
  userId: string;
  amount: number;
  currency?: string;
  dueDate?: Date;
  lineItems?: object;
}

/**
 * Admin action: Create an invoice from an accepted quote.
 * Used for quote-based services.
 */
export async function createInvoiceFromQuote(input: CreateInvoiceFromQuoteInput) {
  try {
    const invoice = await invoiceDA.createInvoice({
      caseId: input.caseId,
      quoteId: input.quoteId,
      userId: input.userId,
      amount: input.amount,
      currency: input.currency ?? "THB",
      status: "sent",
      dueDate: input.dueDate ?? null,
      lineItems: input.lineItems ?? null,
    });
    return { success: true, invoice };
  } catch (e) {
    console.error("createInvoiceFromQuote error", e);
    return {
      success: false,
      error: e instanceof Error ? e.message : "Failed to create invoice",
    };
  }
}
