"use client";

import { useTranslations } from "next-intl";
import { Check } from "lucide-react";
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
        <h2 className="text-xl font-bold tracking-tight text-siam-ink sm:text-2xl">
          Your service
        </h2>
        <p className="text-sm text-[#64748B]">{t("missingQuote")}</p>
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
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-bold tracking-tight text-siam-ink sm:text-2xl">
          Your service
        </h2>
        <p className="mt-1.5 text-sm text-[#64748B]">
          Here&apos;s what we recommend based on your answers.
        </p>
        <p className="mt-1 text-sm font-medium text-siam-ink">{serviceName}</p>
        {quote.quoteNumber ? (
          <p className="mt-0.5 text-xs text-[#64748B]">
            {t("quoteNumber", { number: quote.quoteNumber })}
          </p>
        ) : null}
      </div>

      {isRange && quote.rangeMin != null && quote.rangeMax != null ? (
        <div className="rounded-2xl border border-[#DCE6F5] bg-siam-surface/60 p-5">
          <p className="text-sm font-semibold text-siam-ink">Personalized quotation</p>
          <p className="mt-2 text-2xl font-bold text-siam-blue">
            {formatCurrency(quote.rangeMin, quote.currency)} –{" "}
            {formatCurrency(quote.rangeMax, quote.currency)}
          </p>
          <p className="mt-2 text-sm text-[#64748B]">
            We&apos;ll review your details and confirm the final price.
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-[#DCE6F5] bg-white">
          <ul className="divide-y divide-[#DCE6F5]">
            {quote.lineItems.map((item) => (
              <li
                key={item.id}
                className="flex items-start justify-between gap-4 px-4 py-3 text-sm"
              >
                <div>
                  <p className="font-medium text-siam-ink">{item.label}</p>
                  <p className="text-xs text-[#64748B]">
                    {categoryLabel(item.category, t)}
                    {item.feeGuarantee === "estimated" ? ` · ${t("estimated")}` : ` · ${t("exact")}`}
                  </p>
                </div>
                <p className="shrink-0 font-semibold text-siam-ink">
                  {formatCurrency(item.amount, quote.currency)}
                </p>
              </li>
            ))}
          </ul>
          <div className="flex items-center justify-between border-t border-[#DCE6F5] bg-siam-surface/80 px-4 py-4">
            <p className="font-semibold text-siam-ink">
              {hasEstimated ? t("estimatedTotal") : t("total")}
            </p>
            <p className="text-2xl font-bold text-siam-blue">
              {formatCurrency(quote.total, quote.currency)}
            </p>
          </div>
        </div>
      )}

      {!customRequired && plan ? (
        <>
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-2xl border border-[#DCE6F5] bg-white p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-[#64748B]">
                Total
              </p>
              <p className="mt-1 text-lg font-bold text-siam-ink">
                {formatCurrency(plan.total_estimate, quote.currency)}
              </p>
            </div>
            <div className="rounded-2xl border border-siam-yellow/50 bg-siam-yellow/15 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-siam-ink">
                Due now
              </p>
              <p className="mt-1 text-lg font-bold text-siam-ink">
                {formatCurrency(payToday, quote.currency)}
              </p>
              {plan.required_upfront_costs > 0 ? (
                <p className="mt-1 text-xs text-[#64748B]">
                  {t("includesUpfront", {
                    amount: formatCurrency(plan.required_upfront_costs, quote.currency),
                  })}
                </p>
              ) : null}
            </div>
            <div className="rounded-2xl border border-[#DCE6F5] bg-white p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-[#64748B]">
                Remaining
              </p>
              <p className="mt-1 text-lg font-bold text-siam-ink">
                {formatCurrency(remaining, quote.currency)}
              </p>
              <p className="mt-1 text-xs text-[#64748B]">After you get your license</p>
            </div>
          </div>

          {plan.milestones.length > 0 ? (
            <div className="rounded-2xl border border-[#DCE6F5] p-4">
              <h3 className="text-sm font-semibold text-siam-ink">{t("paymentPlanTitle")}</h3>
              <ol className="mt-3 space-y-2">
                {plan.milestones.map((m, i) => (
                  <li key={`${m.name}-${i}`} className="flex items-start justify-between gap-3 text-sm">
                    <div>
                      <p className="font-medium text-siam-ink">{m.name}</p>
                      {m.description ? (
                        <p className="text-xs text-[#64748B]">{m.description}</p>
                      ) : null}
                    </div>
                    <p className="shrink-0 font-semibold">
                      {formatCurrency(m.amount, quote.currency)}
                    </p>
                  </li>
                ))}
              </ol>
            </div>
          ) : null}

          <div className="rounded-2xl border border-siam-blue/15 bg-siam-blue/5 px-4 py-3">
            <p className="text-sm font-semibold text-siam-ink">{t("whyTitle")}</p>
            <p className="mt-1 text-sm text-[#64748B]">{plan.reason || t(copy.whyLow)}</p>
            {plan.customer_message ? (
              <p className="mt-2 text-xs text-[#64748B]">{plan.customer_message}</p>
            ) : null}
          </div>
        </>
      ) : null}

      <p className="text-xs text-[#64748B]">
        {t("validUntil", {
          date: validUntil.toLocaleDateString(undefined, {
            year: "numeric",
            month: "long",
            day: "numeric",
          }),
        })}
      </p>

      {accepted ? (
        <p className="flex items-center gap-2 rounded-2xl border border-[#16A34A]/30 bg-[#16A34A]/10 px-4 py-3 text-sm font-medium text-siam-ink">
          <Check className="h-4 w-4 text-[#16A34A]" aria-hidden />
          {t("accepted")}
        </p>
      ) : customRequired ? (
        <div className="flex flex-col gap-3 sm:flex-row">
          <Button type="button" variant="outline" onClick={onEdit} disabled={loading}>
            {t("editDetails")}
          </Button>
          <Button
            type="button"
            variant="primary"
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
            variant="primary"
            size="lg"
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
