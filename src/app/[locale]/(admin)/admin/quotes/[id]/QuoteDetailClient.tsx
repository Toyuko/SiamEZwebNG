"use client";

import { useState, useTransition } from "react";
import { useRouter } from "@/i18n/navigation";
import { Link } from "@/i18n/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select } from "@/components/ui/select";
import { formatCurrency } from "@/lib/utils";
import {
  adminAdjustQuote,
  adminConvertQuoteToBooking,
  adminUpdateQuote,
} from "@/actions/quote";

type QuoteDetail = {
  id: string;
  quoteNumber: string | null;
  status: string;
  quoteType: string;
  amount: number;
  currency: string;
  subtotal: number | null;
  governmentFees: number | null;
  addOnsTotal: number | null;
  discount: number | null;
  rangeMin: number | null;
  rangeMax: number | null;
  originalAmount: number | null;
  adjustmentAmount: number | null;
  adjustmentReason: string | null;
  adminNotes: string | null;
  notes: string | null;
  validUntil: string | null;
  acceptedAt: string | null;
  createdAt: string;
  requirements: unknown;
  pricingBreakdown: unknown;
  service: { id: string; name: string; slug: string };
  customer: { id: string; name: string | null; email: string } | null;
  case: { id: string; caseNumber: string; status: string } | null;
  adjustedBy: { id: string; name: string | null; email: string } | null;
  invoices: { id: string; status: string; amount: number }[];
  paymentModel: string | null;
  initialPercentage: number | null;
  initialPaymentTotal: number | null;
  remainingBalance: number | null;
  requiredUpfrontCosts: number | null;
  aiConfidence: number | null;
  requiresHumanReview: boolean;
  paymentReason: string | null;
  pricingVersion: string | null;
};

export function QuoteDetailClient({ quote }: { quote: QuoteDetail }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState(quote.status);
  const [adminNotes, setAdminNotes] = useState(quote.adminNotes ?? "");
  const [adjustmentThb, setAdjustmentThb] = useState("0");
  const [adjustmentReason, setAdjustmentReason] = useState("");

  const lineItems =
    quote.pricingBreakdown &&
    typeof quote.pricingBreakdown === "object" &&
    Array.isArray((quote.pricingBreakdown as { lineItems?: unknown }).lineItems)
      ? (
          quote.pricingBreakdown as {
            lineItems: {
              id: string;
              label: string;
              category: string;
              amount: number;
              feeGuarantee?: string;
            }[];
          }
        ).lineItems
      : [];

  const saveMeta = () => {
    setError(null);
    startTransition(async () => {
      try {
        await adminUpdateQuote({
          quoteId: quote.id,
          status: status as never,
          adminNotes,
        });
        router.refresh();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Update failed");
      }
    });
  };

  const applyAdjustment = () => {
    setError(null);
    if (!adjustmentReason.trim()) {
      setError("Adjustment reason is required");
      return;
    }
    startTransition(async () => {
      try {
        await adminAdjustQuote({
          quoteId: quote.id,
          adjustmentAmountThb: Number(adjustmentThb),
          reason: adjustmentReason.trim(),
          adminNotes,
        });
        router.refresh();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Adjustment failed");
      }
    });
  };

  const convert = () => {
    setError(null);
    startTransition(async () => {
      try {
        const result = await adminConvertQuoteToBooking(quote.id);
        if (result.caseId) {
          router.push(`/admin/cases/${result.caseId}`);
        } else {
          router.refresh();
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : "Conversion failed");
      }
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm text-muted">
            <Link href="/admin/quotes" className="text-siam-blue hover:underline">
              ← AI Quotes
            </Link>
          </p>
          <h1 className="mt-1 text-2xl font-bold text-foreground">
            {quote.quoteNumber ?? quote.id}
          </h1>
          <p className="text-sm text-muted">
            {quote.service.name} · {quote.quoteType}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {!quote.case ? (
            <Button type="button" onClick={convert} disabled={pending}>
              Convert to booking
            </Button>
          ) : (
            <Link href={`/admin/cases/${quote.case.id}`}>
              <Button type="button" variant="outline">
                Open case {quote.case.caseNumber}
              </Button>
            </Link>
          )}
        </div>
      </div>

      {error ? (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Pricing breakdown</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            {quote.quoteType === "range" && quote.rangeMin != null && quote.rangeMax != null ? (
              <p className="text-lg font-semibold text-siam-blue">
                {formatCurrency(quote.rangeMin, quote.currency)} –{" "}
                {formatCurrency(quote.rangeMax, quote.currency)}
              </p>
            ) : (
              <ul className="divide-y divide-border rounded-lg border border-border">
                {lineItems.map((item) => (
                  <li key={item.id} className="flex justify-between gap-3 px-3 py-2">
                    <span>
                      {item.label}
                      {item.feeGuarantee === "estimated" ? " (est.)" : ""}
                    </span>
                    <span>{formatCurrency(item.amount, quote.currency)}</span>
                  </li>
                ))}
                <li className="flex justify-between gap-3 bg-muted/30 px-3 py-2 font-semibold">
                  <span>Total</span>
                  <span>{formatCurrency(quote.amount, quote.currency)}</span>
                </li>
              </ul>
            )}
            {quote.validUntil ? (
              <p className="text-xs text-muted">
                Valid until {new Date(quote.validUntil).toLocaleString()}
              </p>
            ) : null}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Customer & requirements</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div>
              <p className="font-medium">{quote.customer?.name ?? "Guest / unknown"}</p>
              <p className="text-muted">{quote.customer?.email}</p>
            </div>
            <pre className="max-h-64 overflow-auto rounded-lg bg-muted/40 p-3 text-xs">
              {JSON.stringify(quote.requirements ?? {}, null, 2)}
            </pre>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Admin controls</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="mb-1 block text-xs font-medium text-muted">Status</label>
              <Select value={status} onChange={(e) => setStatus(e.target.value)}>
                <option value="generated">Generated</option>
                <option value="sent">Sent</option>
                <option value="viewed">Viewed</option>
                <option value="accepted">Accepted</option>
                <option value="rejected">Rejected</option>
                <option value="cancelled">Cancelled</option>
                <option value="expired">Expired</option>
                <option value="custom_quote_required">Custom quote required</option>
              <option value="converted_to_booking">Converted</option>
              </Select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-muted">Admin notes</label>
              <Textarea
                rows={3}
                value={adminNotes}
                onChange={(e) => setAdminNotes(e.target.value)}
              />
            </div>
            <Button type="button" onClick={saveMeta} disabled={pending}>
              Save
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Manual price override</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted">
              Original:{" "}
              {formatCurrency(quote.originalAmount ?? quote.amount, quote.currency)}
              {quote.adjustmentAmount != null ? (
                <>
                  {" "}
                  · Adjustment: {formatCurrency(quote.adjustmentAmount, quote.currency)}
                </>
              ) : null}
            </p>
            {quote.adjustedBy ? (
              <p className="text-xs text-muted">
                Last adjusted by {quote.adjustedBy.name ?? quote.adjustedBy.email}
                {quote.adjustmentReason ? ` — ${quote.adjustmentReason}` : ""}
              </p>
            ) : null}
            <div>
              <label className="mb-1 block text-xs font-medium text-muted">
                Adjustment (THB, use negative to discount)
              </label>
              <Input
                type="number"
                value={adjustmentThb}
                onChange={(e) => setAdjustmentThb(e.target.value)}
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-muted">Reason</label>
              <Input
                value={adjustmentReason}
                onChange={(e) => setAdjustmentReason(e.target.value)}
                placeholder="e.g. Loyalty discount"
              />
            </div>
            <Button type="button" variant="outline" onClick={applyAdjustment} disabled={pending}>
              Apply adjustment
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Payment plan</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {quote.requiresHumanReview ? (
              <p className="rounded-md bg-amber-50 px-3 py-2 text-amber-800 dark:bg-amber-900/30 dark:text-amber-200">
                Admin review required — do not charge the customer yet.
              </p>
            ) : null}
            <p>Model: {quote.paymentModel ?? "—"}</p>
            <p>Initial %: {quote.initialPercentage ?? "—"}</p>
            <p>
              Pay today:{" "}
              {quote.initialPaymentTotal != null
                ? formatCurrency(quote.initialPaymentTotal, quote.currency)
                : "—"}
            </p>
            <p>
              Upfront costs:{" "}
              {quote.requiredUpfrontCosts != null
                ? formatCurrency(quote.requiredUpfrontCosts, quote.currency)
                : "—"}
            </p>
            <p>
              Remaining:{" "}
              {quote.remainingBalance != null
                ? formatCurrency(quote.remainingBalance, quote.currency)
                : "—"}
            </p>
            <p>AI confidence: {quote.aiConfidence != null ? quote.aiConfidence.toFixed(2) : "—"}</p>
            <p>Pricing version: {quote.pricingVersion ?? "—"}</p>
            {quote.paymentReason ? (
              <p className="text-muted">{quote.paymentReason}</p>
            ) : null}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
