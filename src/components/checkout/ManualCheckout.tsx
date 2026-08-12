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
  /** Logged-in users can finish proof upload on the portal invoice page. */
  portalInvoiceHref?: string | null;
  isGuest: boolean;
};

export function ManualCheckout({
  caseNumber,
  serviceName,
  amountSatang,
  currency,
  paymentSettings,
  portalInvoiceHref,
  isGuest,
}: ManualCheckoutProps) {
  const amountThb = amountSatang / 100;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Complete payment</h1>
        <p className="mt-2 text-gray-600 dark:text-gray-400">
          Pay for case <strong>{caseNumber}</strong> · {serviceName}
        </p>
        <p className="mt-1 text-lg font-semibold text-siam-blue">
          {formatCurrency(amountSatang, currency)}
        </p>
      </div>

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
