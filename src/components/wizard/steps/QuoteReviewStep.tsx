"use client";

import { useTranslations } from "next-intl";
import { formatCurrency } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import type { GenerateQuoteResult } from "@/actions/quote";
import type { PaymentChoice } from "@/lib/payments/quote-plan";
import { getPaymentExperimentConfig, paymentCopyKeys } from "@/lib/payments/copy";

type QuoteSuccess = Extract<GenerateQuoteResult, { success: true }>;

function categoryLabel(category: string, t: (key: string) => string): string {
  switch (category) {
    case "service":
      return t("categoryService");
    case "addon":
      return t("categoryAddon");
    case "government":
      return t("categoryGovernment");
    case "third_party":
      return t("categoryThirdParty");
    case "discount":
      return t("categoryDiscount");
    case "tax":
      return t("categoryTax");
    default:
      return category;
  }
}

export interface QuoteReviewStepProps {
  quote: QuoteSuccess | null;
  serviceName: string;
  accepted: boolean;
  loading?: boolean;
  onAccept: (choice: PaymentChoice) => void;
  onRequestCustomQuote?: () => void;
  onEdit: () => void;
  onRecalculate?: () => void;
}

export function QuoteReviewStep({
  quote,
  serviceName,
  accepted,
  loading,
  onAccept,
  onRequestCustomQuote,
  onEdit,
  onRecalculate,
}: QuoteReviewStepProps) {
  const t = useTranslations("quotePayment");
  const copy = paymentCopyKeys(getPaymentExperimentConfig());

  if (!quote) {
    return (
      <div className="space-y-4">
        <h2 className="text-xl font-semibold text-foreground">{t("title")}</h2>
        <p className="text-sm text-muted">{t("missingQuote")}</p>
        {onRecalculate ? (
          <Button type="button" variant="outline" onClick={onRecalculate} disabled={loading}>
            {t("recalculate")}
          </Button>
        ) : null}
      </div>
    );
  }

  const plan = quote.paymentPlan;
  const isRange = quote.quoteType === "range";
  const hasEstimated = quote.lineItems.some((l) => l.feeGuarantee === "estimated");
  const validUntil = new Date(quote.validUntil);
  const payToday = plan?.initial_payment_total ?? quote.total;
  const remaining = plan?.remaining_balance ?? 0;
  const customRequired = plan?.requires_human_review || isRange;

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs font-medium uppercase tracking-wide text-siam-gold">
          {t("eyebrow")}
        </p>
        <h2 className="mt-1 text-xl font-semibold text-foreground">{t("title")}</h2>
        <p className="mt-1 text-sm text-muted">{serviceName}</p>
        {quote.quoteNumber ? (
          <p className="mt-1 text-xs text-muted">
            {t("quoteNumber", { number: quote.quoteNumber })}
          </p>
        ) : null}
      </div>

      {isRange && quote.rangeMin != null && quote.rangeMax != null ? (
        <div className="rounded-lg border border-border bg-muted/20 p-4">
          <p className="text-sm font-medium text-foreground">{t("estimatedRange")}</p>
          <p className="mt-2 text-2xl font-semibold text-siam-blue">
            {formatCurrency(quote.rangeMin, quote.currency)} –{" "}
            {formatCurrency(quote.rangeMax, quote.currency)}
          </p>
          <p className="mt-2 text-sm text-muted">{t("customQuoteBody")}</p>
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
                    {categoryLabel(item.category, t)}
                    {item.feeGuarantee === "estimated" ? ` · ${t("estimated")}` : ` · ${t("exact")}`}
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
              {hasEstimated ? t("estimatedTotal") : t("total")}
            </p>
            <p className="text-lg font-semibold text-siam-blue">
              {formatCurrency(quote.total, quote.currency)}
            </p>
          </div>
        </div>
      )}

      {!customRequired && plan ? (
        <>
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-lg border border-border bg-background p-4">
              <p className="text-xs font-medium uppercase tracking-wide text-muted">{t("total")}</p>
              <p className="mt-1 text-lg font-semibold text-foreground">
                {formatCurrency(plan.total_estimate, quote.currency)}
              </p>
            </div>
            <div className="rounded-lg border border-siam-gold/40 bg-siam-gold/10 p-4">
              <p className="text-xs font-medium uppercase tracking-wide text-siam-gold">
                {t("payToday")}
              </p>
              <p className="mt-1 text-lg font-semibold text-foreground">
                {formatCurrency(payToday, quote.currency)}
              </p>
              {plan.required_upfront_costs > 0 ? (
                <p className="mt-1 text-xs text-muted">
                  {t("includesUpfront", {
                    amount: formatCurrency(plan.required_upfront_costs, quote.currency),
                  })}
                </p>
              ) : null}
            </div>
            <div className="rounded-lg border border-border bg-background p-4">
              <p className="text-xs font-medium uppercase tracking-wide text-muted">
                {t("remaining")}
              </p>
              <p className="mt-1 text-lg font-semibold text-foreground">
                {formatCurrency(remaining, quote.currency)}
              </p>
            </div>
          </div>

          {plan.milestones.length > 0 ? (
            <div className="rounded-lg border border-border p-4">
              <h3 className="text-sm font-semibold text-foreground">{t("paymentPlanTitle")}</h3>
              <ol className="mt-3 space-y-2">
                {plan.milestones.map((m, i) => (
                  <li key={`${m.name}-${i}`} className="flex items-start justify-between gap-3 text-sm">
                    <div>
                      <p className="font-medium text-foreground">
                        {i === 0 ? "✓ " : "○ "}
                        {m.name}
                      </p>
                      {m.description ? (
                        <p className="text-xs text-muted">{m.description}</p>
                      ) : null}
                    </div>
                    <p className="shrink-0 font-medium">
                      {formatCurrency(m.amount, quote.currency)}
                    </p>
                  </li>
                ))}
              </ol>
            </div>
          ) : null}

          <div className="rounded-lg border border-siam-blue/20 bg-siam-blue/5 px-4 py-3">
            <p className="text-sm font-medium text-foreground">{t("whyTitle")}</p>
            <p className="mt-1 text-sm text-muted">{plan.reason || t(copy.whyLow)}</p>
            <p className="mt-2 text-xs text-muted">{plan.customer_message}</p>
          </div>
        </>
      ) : null}

      <p className="text-xs text-muted">
        {t("validUntil", {
          date: validUntil.toLocaleDateString(undefined, {
            year: "numeric",
            month: "long",
            day: "numeric",
          }),
        })}
      </p>

      {accepted ? (
        <p className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-foreground">
          {t("accepted")}
        </p>
      ) : customRequired ? (
        <div className="flex flex-col gap-3 sm:flex-row">
          <Button type="button" variant="outline" onClick={onEdit} disabled={loading}>
            {t("editDetails")}
          </Button>
          <Button
            type="button"
            onClick={onRequestCustomQuote}
            disabled={loading || !onRequestCustomQuote}
            className="sm:ml-auto"
          >
            {loading ? t("working") : t("requestCustomQuote")}
          </Button>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          <Button
            type="button"
            onClick={() => onAccept("initial")}
            disabled={loading}
            className="w-full"
          >
            {loading
              ? t("working")
              : t("ctaSecureBooking", { amount: formatCurrency(payToday, quote.currency) })}
          </Button>
          {plan?.allow_full_payment ? (
            <Button
              type="button"
              variant="outline"
              onClick={() => onAccept("full")}
              disabled={loading}
              className="w-full"
            >
              {t("ctaPayFull", { amount: formatCurrency(quote.total, quote.currency) })}
            </Button>
          ) : null}
          <Button type="button" variant="ghost" onClick={onEdit} disabled={loading}>
            {t("editDetails")}
          </Button>
        </div>
      )}
    </div>
  );
}
