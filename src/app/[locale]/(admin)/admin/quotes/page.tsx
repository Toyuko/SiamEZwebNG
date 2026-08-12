import { adminListQuotes } from "@/actions/quote";
import { prisma } from "@/lib/db";
import { QuotesPageClient } from "./QuotesPageClient";
import type { QuoteStatus } from "@prisma/client";

const STATUSES: QuoteStatus[] = [
  "draft",
  "generated",
  "sent",
  "viewed",
  "accepted",
  "expired",
  "cancelled",
  "rejected",
  "custom_quote_required",
  "converted_to_booking",
];

export default async function AdminQuotesPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; serviceId?: string; q?: string }>;
}) {
  const params = await searchParams;
  const status =
    params.status && STATUSES.includes(params.status as QuoteStatus)
      ? (params.status as QuoteStatus)
      : undefined;

  const [result, services] = await Promise.all([
    adminListQuotes({
      status,
      serviceId: params.serviceId || undefined,
      search: params.q || undefined,
    }),
    prisma.service.findMany({
      where: { active: true },
      select: { id: true, name: true, slug: true },
      orderBy: { sortOrder: "asc" },
    }),
  ]);

  return (
    <QuotesPageClient
      quotes={result.items.map((q) => ({
        id: q.id,
        quoteNumber: q.quoteNumber,
        status: q.status,
        quoteType: q.quoteType,
        amount: q.amount,
        currency: q.currency,
        rangeMin: q.rangeMin,
        rangeMax: q.rangeMax,
        validUntil: q.validUntil?.toISOString() ?? null,
        createdAt: q.createdAt.toISOString(),
        serviceName: q.service.name,
        serviceSlug: q.service.slug,
        customerName: q.user?.name ?? q.case?.caseNumber ?? null,
        customerEmail: q.user?.email ?? null,
        caseId: q.case?.id ?? null,
        caseNumber: q.case?.caseNumber ?? null,
        paymentStatus: q.invoices[0]?.status ?? null,
        paymentModel: q.paymentModel,
        initialPercentage: q.initialPercentage,
        initialPaymentTotal: q.initialPaymentTotal,
        remainingBalance: q.remainingBalance,
        aiConfidence: q.aiConfidence,
        requiresHumanReview: q.requiresHumanReview,
      }))}
      total={result.total}
      services={services}
      filters={{
        status: params.status ?? "",
        serviceId: params.serviceId ?? "",
        q: params.q ?? "",
      }}
    />
  );
}
