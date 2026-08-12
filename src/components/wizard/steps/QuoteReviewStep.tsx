"use client";

import { formatCurrency } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import type { GenerateQuoteResult } from "@/actions/quote";

type QuoteSuccess = Extract<GenerateQuoteResult, { success: true }>;

function categoryLabel(category: string): string {
  switch (category) {
    case "service":
      return "SiamEZ service fee";
    case "addon":
      return "Optional add-on";
    case "government":
      return "Government fee";
    case "third_party":
      return "Third-party fee";
    case "discount":
      return "Discount";
    case "tax":
      return "Tax";
    case "deposit":
      return "Deposit";
    default:
      return category;
  }
}

export interface QuoteReviewStepProps {
  quote: QuoteSuccess | null;
  serviceName: string;
  accepted: boolean;
  loading?: boolean;
  onAccept: () => void;
  onEdit: () => void;
  onRecalculate?: () => void;
}

export function QuoteReviewStep({
  quote,
  serviceName,
  accepted,
  loading,
  onAccept,
  onEdit,
  onRecalculate,
}: QuoteReviewStepProps) {
  if (!quote) {
    return (
      <div className="space-y-4">
        <h2 className="text-xl font-semibold text-foreground">Your SiamEZ Quote</h2>
        <p className="text-sm text-muted">
          We couldn&apos;t load a quote yet. Go back and complete the questions, or continue
          with the standard booking form.
        </p>
        {onRecalculate ? (
          <Button type="button" variant="outline" onClick={onRecalculate} disabled={loading}>
            Recalculate quote
          </Button>
        ) : null}
      </div>
    );
  }

  const isRange = quote.quoteType === "range";
  const hasEstimated = quote.lineItems.some((l) => l.feeGuarantee === "estimated");
  const validUntil = new Date(quote.validUntil);

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs font-medium uppercase tracking-wide text-siam-gold">
          SiamEZ AI Concierge
        </p>
        <h2 className="mt-1 text-xl font-semibold text-foreground">Your SiamEZ Quote</h2>
        <p className="mt-1 text-sm text-muted">{serviceName}</p>
        {quote.quoteNumber ? (
          <p className="mt-1 text-xs text-muted">Quote {quote.quoteNumber}</p>
        ) : null}
      </div>

      {isRange && quote.rangeMin != null && quote.rangeMax != null ? (
        <div className="rounded-lg border border-border bg-muted/20 p-4">
          <p className="text-sm font-medium text-foreground">Estimated project range</p>
          <p className="mt-2 text-2xl font-semibold text-siam-blue">
            {formatCurrency(quote.rangeMin, quote.currency)} –{" "}
            {formatCurrency(quote.rangeMax, quote.currency)}
          </p>
          <p className="mt-2 text-sm text-muted">
            A SiamEZ representative will review your requirements before providing the final
            quotation. You can still submit your booking request.
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-lg border border-border">
          <ul className="divide-y divide-border">
            {quote.lineItems.map((item) => (
              <li
                key={item.id}
                className="flex items-start justify-between gap-4 px-4 py-3 text-sm"
              >
                <div>
                  <p className="font-medium text-foreground">{item.label}</p>
                  <p className="text-xs text-muted">
                    {categoryLabel(item.category)}
                    {item.feeGuarantee === "estimated" ? " · Estimated" : " · Exact"}
                  </p>
                </div>
                <p className="shrink-0 font-medium text-foreground">
                  {formatCurrency(item.amount, quote.currency)}
                </p>
              </li>
            ))}
          </ul>
          <div className="flex items-center justify-between border-t border-border bg-siam-blue/5 px-4 py-3">
            <p className="font-semibold text-foreground">
              {hasEstimated ? "Estimated total" : "Total"}
            </p>
            <p className="text-lg font-semibold text-siam-blue">
              {formatCurrency(quote.total, quote.currency)}
            </p>
          </div>
        </div>
      )}

      <p className="text-xs text-muted">
        Quote valid until{" "}
        {validUntil.toLocaleDateString("en-US", {
          year: "numeric",
          month: "long",
          day: "numeric",
        })}
        . Amounts come from the SiamEZ pricing engine — not invented by AI.
      </p>

      {accepted ? (
        <p className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-foreground">
          Quote accepted. Continue to complete your booking details.
        </p>
      ) : (
        <div className="flex flex-col gap-3 sm:flex-row">
          <Button type="button" variant="outline" onClick={onEdit} disabled={loading}>
            Edit details
          </Button>
          <Button type="button" onClick={onAccept} disabled={loading} className="sm:ml-auto">
            {loading ? "Accepting…" : "Accept quote & continue"}
          </Button>
        </div>
      )}
    </div>
  );
}
