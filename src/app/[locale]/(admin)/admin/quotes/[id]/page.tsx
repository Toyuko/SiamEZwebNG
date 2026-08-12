import { notFound } from "next/navigation";
import { adminGetQuote } from "@/actions/quote";
import { QuoteDetailClient } from "./QuoteDetailClient";

export default async function AdminQuoteDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const quote = await adminGetQuote(id);
  if (!quote) notFound();

  return (
    <QuoteDetailClient
      quote={{
        id: quote.id,
        quoteNumber: quote.quoteNumber,
        status: quote.status,
        quoteType: quote.quoteType,
        amount: quote.amount,
        currency: quote.currency,
        subtotal: quote.subtotal,
        governmentFees: quote.governmentFees,
        addOnsTotal: quote.addOnsTotal,
        discount: quote.discount,
        rangeMin: quote.rangeMin,
        rangeMax: quote.rangeMax,
        originalAmount: quote.originalAmount,
        adjustmentAmount: quote.adjustmentAmount,
        adjustmentReason: quote.adjustmentReason,
        adminNotes: quote.adminNotes,
        notes: quote.notes,
        validUntil: quote.validUntil?.toISOString() ?? null,
        acceptedAt: quote.acceptedAt?.toISOString() ?? null,
        createdAt: quote.createdAt.toISOString(),
        requirements: quote.requirements,
        pricingBreakdown: quote.pricingBreakdown,
        service: {
          id: quote.service.id,
          name: quote.service.name,
          slug: quote.service.slug,
        },
        customer: quote.user
          ? { id: quote.user.id, name: quote.user.name, email: quote.user.email }
          : null,
        case: quote.case
          ? { id: quote.case.id, caseNumber: quote.case.caseNumber, status: quote.case.status }
          : null,
        adjustedBy: quote.adjustedBy
          ? {
              id: quote.adjustedBy.id,
              name: quote.adjustedBy.name,
              email: quote.adjustedBy.email,
            }
          : null,
        invoices: quote.invoices.map((inv) => ({
          id: inv.id,
          status: inv.status,
          amount: inv.amount,
        })),
      }}
    />
  );
}
