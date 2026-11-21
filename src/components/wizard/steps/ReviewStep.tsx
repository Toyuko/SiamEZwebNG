"use client";

import type { Service } from "@prisma/client";
import type { WizardConfig } from "@/config/wizards/types";
import { formatCurrency } from "@/lib/utils";
import type { WizardDocumentMeta } from "./DocumentsStep";
import type { GenerateQuoteResult } from "@/actions/quote";

type QuoteSuccess = Extract<GenerateQuoteResult, { success: true }>;

interface ReviewStepProps {
  service: Service;
  config: WizardConfig;
  values: Record<string, unknown>;
  documents: WizardDocumentMeta[];
  quote?: QuoteSuccess | null;
  quoteAccepted?: boolean;
  paymentChoice?: "initial" | "full";
  onEditStep?: (stepId: string) => void;
}

function optionLabel(
  config: WizardConfig,
  fieldName: string,
  value: string
): string {
  for (const step of config.steps) {
    const field = step.fields?.find((f) => f.name === fieldName);
    if (!field?.options) continue;
    const opt = field.options.find((o) => o.value === value);
    if (opt) return opt.label;
  }
  return value;
}

export function ReviewStep({
  service,
  config,
  values,
  documents,
  quote,
  quoteAccepted,
  paymentChoice = "initial",
  onEditStep,
}: ReviewStepProps) {
  const isFixed = service.type === "fixed";
  const priceAmount = service.priceAmount;
  const priceCurrency = service.priceCurrency ?? "THB";

  const serviceAnswers: Array<{ label: string; value: string }> = [];
  const detailAnswers: Array<{ label: string; value: string }> = [];

  for (const step of config.steps) {
    if (step.type !== "fields") continue;
    const bucket =
      step.stage === "details" || step.id === "details" || step.id === "appointment"
        ? detailAnswers
        : serviceAnswers;
    for (const field of step.fields ?? []) {
      const raw = values[field.name];
      if (raw === undefined || raw === null || raw === "") continue;
      if (Array.isArray(raw) && raw.length === 0) continue;
      if (field.type === "checkbox") {
        if (!raw) continue;
        bucket.push({ label: field.label, value: "Yes" });
        continue;
      }
      if (field.type === "multiselect" && Array.isArray(raw)) {
        const labels = (raw as string[]).map((v) => optionLabel(config, field.name, v));
        bucket.push({ label: field.label, value: labels.join(", ") });
        continue;
      }
      const str = String(raw);
      bucket.push({
        label: field.label,
        value: field.type === "select" ? optionLabel(config, field.name, str) : str,
      });
    }
  }

  const plan = quote?.paymentPlan;
  const dueNow =
    quote && quoteAccepted && plan
      ? paymentChoice === "full"
        ? quote.total
        : plan.initial_payment_total
      : null;
  const remaining =
    quote && quoteAccepted && plan && paymentChoice !== "full"
      ? plan.remaining_balance
      : null;

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-bold tracking-tight text-siam-ink sm:text-2xl">
          Review your booking
        </h2>
        <p className="mt-1.5 text-sm text-[#64748B]">
          Check your details before submitting.
        </p>
      </div>

      <section className="rounded-2xl border border-[#DCE6F5] bg-white p-4 sm:p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wide text-[#64748B]">
              Service
            </h3>
            <p className="mt-1 font-semibold text-siam-ink">{service.name}</p>
          </div>
          {onEditStep ? (
            <button
              type="button"
              onClick={() => onEditStep("service")}
              className="text-xs font-semibold text-siam-blue hover:underline"
            >
              Edit
            </button>
          ) : null}
        </div>
        {serviceAnswers.length > 0 ? (
          <dl className="mt-3 space-y-2 text-sm">
            {serviceAnswers.map((entry) => (
              <div key={entry.label} className="flex justify-between gap-4">
                <dt className="text-[#64748B]">{entry.label}</dt>
                <dd className="text-right font-medium text-siam-ink">{entry.value}</dd>
              </div>
            ))}
          </dl>
        ) : null}
      </section>

      {quote ? (
        <section className="rounded-2xl border border-[#DCE6F5] bg-siam-surface/50 p-4 sm:p-5">
          <div className="flex items-start justify-between gap-3">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-[#64748B]">
              Pricing
            </h3>
            {onEditStep ? (
              <button
                type="button"
                onClick={() => onEditStep("quote")}
                className="text-xs font-semibold text-siam-blue hover:underline"
              >
                Edit
              </button>
            ) : null}
          </div>
          <div className="mt-3 flex items-baseline justify-between gap-2">
            <span className="text-sm text-[#64748B]">Total service fee</span>
            <span className="text-lg font-bold text-siam-ink">
              {formatCurrency(quote.total, quote.currency)}
            </span>
          </div>
          {dueNow != null ? (
            <div className="mt-3 flex items-baseline justify-between gap-2 rounded-xl bg-siam-yellow/25 px-3 py-2.5">
              <span className="text-sm font-semibold text-siam-ink">Amount due now</span>
              <span className="text-base font-bold text-siam-ink">
                {formatCurrency(dueNow, quote.currency)}
              </span>
            </div>
          ) : null}
          {remaining != null && remaining > 0 ? (
            <div className="mt-2 flex items-baseline justify-between gap-2 text-sm">
              <span className="text-[#64748B]">Remaining after license</span>
              <span className="font-medium text-siam-ink">
                {formatCurrency(remaining, quote.currency)}
              </span>
            </div>
          ) : null}
          {!quoteAccepted ? (
            <p className="mt-2 text-xs text-[#64748B]">Quote pending acceptance</p>
          ) : null}
        </section>
      ) : isFixed && priceAmount != null ? (
        <section className="rounded-2xl border border-[#DCE6F5] bg-white p-4">
          <p className="text-lg font-bold text-siam-blue">
            {formatCurrency(priceAmount, priceCurrency)}
          </p>
        </section>
      ) : (
        <p className="rounded-2xl bg-siam-blue/5 px-4 py-3 text-sm text-siam-ink">
          Quote-based — we&apos;ll confirm the final price after review.
        </p>
      )}

      {detailAnswers.length > 0 ? (
        <section className="rounded-2xl border border-[#DCE6F5] bg-white p-4 sm:p-5">
          <div className="flex items-start justify-between gap-3">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-[#64748B]">
              Booking details
            </h3>
            {onEditStep ? (
              <button
                type="button"
                onClick={() => onEditStep("details")}
                className="text-xs font-semibold text-siam-blue hover:underline"
              >
                Edit
              </button>
            ) : null}
          </div>
          <dl className="mt-3 space-y-2 text-sm">
            {detailAnswers.map((entry) => (
              <div key={entry.label} className="flex justify-between gap-4">
                <dt className="text-[#64748B]">{entry.label}</dt>
                <dd className="max-w-[60%] whitespace-pre-wrap text-right font-medium text-siam-ink">
                  {entry.value}
                </dd>
              </div>
            ))}
          </dl>
        </section>
      ) : null}

      {documents.length > 0 ? (
        <section className="rounded-2xl border border-[#DCE6F5] bg-white p-4 sm:p-5">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-[#64748B]">
            Documents ({documents.length})
          </h3>
          <ul className="mt-2 space-y-1 text-sm text-siam-ink">
            {documents.map((d, i) => (
              <li key={`${d.name}-${i}`}>{d.name}</li>
            ))}
          </ul>
        </section>
      ) : null}

      {!isFixed && !quoteAccepted ? (
        <p className="rounded-2xl bg-siam-blue/10 px-4 py-3 text-sm text-siam-ink">
          We will review your request and follow up at{" "}
          <strong>{String(values.email ?? "")}</strong>.
        </p>
      ) : null}
    </div>
  );
}
