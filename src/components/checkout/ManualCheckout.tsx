"use client";

import { PaymentInformation } from "@/components/payment/PaymentInformation";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/utils";
import type { PaymentSettings } from "@/lib/payment-settings";

type ManualCheckoutProps = {
  caseNumber: string;
  serviceName: string;
  amountSatang: number;
  currency: string;
  paymentSettings: PaymentSettings;
  portalInvoiceHref?: string | null;
  isGuest: boolean;
  totalSatang?: number | null;
  remainingSatang?: number | null;
  reason?: string | null;
};

export function ManualCheckout({
  caseNumber,
  serviceName,
  amountSatang,
  currency,
  paymentSettings,
  portalInvoiceHref,
  isGuest,
  totalSatang,
  remainingSatang,
  reason,
}: ManualCheckoutProps) {
  const amountThb = amountSatang / 100;
  const total = totalSatang ?? amountSatang;
  const remaining = remainingSatang ?? Math.max(0, total - amountSatang);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Secure your booking</h1>
        <p className="mt-2 text-gray-600 dark:text-gray-400">
          Case <strong>{caseNumber}</strong> · {serviceName}
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-lg border border-border p-4">
          <p className="text-xs uppercase tracking-wide text-muted">Total</p>
          <p className="mt-1 text-lg font-semibold">{formatCurrency(total, currency)}</p>
        </div>
        <div className="rounded-lg border border-siam-gold/40 bg-siam-gold/10 p-4">
          <p className="text-xs uppercase tracking-wide text-siam-gold">Pay today</p>
          <p className="mt-1 text-lg font-semibold">{formatCurrency(amountSatang, currency)}</p>
        </div>
        <div className="rounded-lg border border-border p-4">
          <p className="text-xs uppercase tracking-wide text-muted">Remaining</p>
          <p className="mt-1 text-lg font-semibold">{formatCurrency(remaining, currency)}</p>
        </div>
      </div>

      {reason ? (
        <p className="text-sm text-muted">{reason}</p>
      ) : (
        <p className="text-sm text-muted">
          This payment is applied toward your service fee. You are not being asked for the full amount up front.
        </p>
      )}

      <PaymentInformation
        totalAmountThb={amountThb}
        reference={caseNumber}
        promptPayId={paymentSettings.promptPayId || undefined}
        bankDetails={{
          bankName: paymentSettings.bankName || undefined,
          accountName: paymentSettings.bankAccountName || undefined,
          accountNumber: paymentSettings.bankAccountNumber || undefined,
        }}
      />

      {portalInvoiceHref ? (
        <div className="rounded-lg border border-border bg-gray-50 p-4 text-sm dark:bg-gray-900/40">
          <p className="text-gray-700 dark:text-gray-300">
            After you transfer, upload your payment slip from your invoice page so we can verify it.
          </p>
          <Button asChild className="mt-3">
            <Link href={portalInvoiceHref}>Upload payment proof</Link>
          </Button>
        </div>
      ) : isGuest ? (
        <p className="text-sm text-gray-600 dark:text-gray-400">
          After you transfer, reply to your booking confirmation email with the payment slip (or create an
          account and upload it from your portal invoice). Include case number <strong>{caseNumber}</strong>.
        </p>
      ) : null}
    </div>
  );
}
