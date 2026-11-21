"use client";

import { formatCurrency } from "@/lib/utils";
import type { GenerateQuoteResult } from "@/actions/quote";

type QuoteSuccess = Extract<GenerateQuoteResult, { success: true }>;

interface BookingSideSummaryProps {
  serviceName: string;
  values: Record<string, unknown>;
  quote: QuoteSuccess | null;
  quoteAccepted: boolean;
  paymentChoice: "initial" | "full";
}

function labelFor(value: unknown, map: Record<string, string>): string | null {
  if (typeof value !== "string" || !value) return null;
  return map[value] ?? value;
}

const CATEGORY_LABELS: Record<string, string> = {
  apply_new: "New Thai license",
  conversion: "Foreign license conversion",
  renewal: "Renewal",
  idp: "International Driving Permit",
};

const VEHICLE_LABELS: Record<string, string> = {
  car: "Car",
  bike: "Motorcycle",
  both: "Car & motorcycle",
};

export function BookingSideSummary({
  serviceName,
  values,
  quote,
  quoteAccepted,
  paymentChoice,
}: BookingSideSummaryProps) {
  const category = labelFor(values.category, CATEGORY_LABELS);
  const vehicle = labelFor(values.vehicleType, VEHICLE_LABELS);
  const appointment =
    typeof values.appointmentDate === "string" && values.appointmentDate
      ? values.appointmentDate
      : null;

  const plan = quote?.paymentPlan;
  const dueNow =
    quoteAccepted && plan
      ? paymentChoice === "full"
        ? quote.total
        : plan.initial_payment_total
      : null;

  return (
    <aside className="hidden lg:block">
      <div className="sticky top-24 rounded-2xl border border-[#DCE6F5] bg-white p-5 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-wide text-siam-blue">
          Booking summary
        </p>
        <h3 className="mt-1 text-base font-bold text-siam-ink">{serviceName}</h3>

        <dl className="mt-4 space-y-3 text-sm">
          {category ? (
            <div>
              <dt className="text-[#64748B]">Service</dt>
              <dd className="font-medium text-siam-ink">{category}</dd>
            </div>
          ) : null}
          {vehicle ? (
            <div>
              <dt className="text-[#64748B]">Vehicle</dt>
              <dd className="font-medium text-siam-ink">{vehicle}</dd>
            </div>
          ) : null}
          {appointment ? (
            <div>
              <dt className="text-[#64748B]">Preferred date</dt>
              <dd className="font-medium text-siam-ink">{appointment}</dd>
            </div>
          ) : null}
        </dl>

        {quote ? (
          <div className="mt-5 border-t border-[#DCE6F5] pt-4">
            <div className="flex items-baseline justify-between gap-2">
              <span className="text-sm text-[#64748B]">Total</span>
              <span className="text-lg font-bold text-siam-ink">
                {formatCurrency(quote.total, quote.currency)}
              </span>
            </div>
            {dueNow != null ? (
              <div className="mt-2 flex items-baseline justify-between gap-2 rounded-xl bg-siam-yellow/20 px-3 py-2">
                <span className="text-xs font-semibold text-siam-ink">Due now</span>
                <span className="text-sm font-bold text-siam-ink">
                  {formatCurrency(dueNow, quote.currency)}
                </span>
              </div>
            ) : (
              <p className="mt-2 text-xs text-[#64748B]">
                Accept the quote to lock deposit and remaining balance.
              </p>
            )}
          </div>
        ) : (
          <p className="mt-5 border-t border-[#DCE6F5] pt-4 text-xs text-[#64748B]">
            Your quote appears here after the service questions.
          </p>
        )}

        <p className="mt-4 text-[11px] leading-relaxed text-[#64748B]">
          Deposit is typically 25% now. Remaining balance is due after you get your license.
        </p>
      </div>
    </aside>
  );
}
