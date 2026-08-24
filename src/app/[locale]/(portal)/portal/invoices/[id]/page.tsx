import { notFound } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { requireAuth } from "@/lib/auth";
import { getInvoiceByIdForUser } from "@/data-access/invoice";
import { InvoiceDetailClient } from "./InvoiceDetailClient";
import { formatCurrency } from "@/lib/utils";
import { invoiceAmountDueNow, invoiceHasOptionalDeposit, invoiceRemainingBalance, sumApprovedPayments } from "@/lib/payments/invoice-deposit";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { getPaymentSettings } from "@/lib/payment-settings";

export default async function PortalInvoiceDetailPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  setRequestLocale(locale);
  const session = await requireAuth();

  const [invoice, paymentSettings] = await Promise.all([
    getInvoiceByIdForUser(id, session.user.id),
    getPaymentSettings(),
  ]);
  if (!invoice) notFound();

  const reference = invoice.case.caseNumber;
  const approvedPaid = sumApprovedPayments(invoice.payments ?? []);
  const dueNow = invoiceAmountDueNow(invoice, approvedPaid);
  const remaining = invoiceRemainingBalance(invoice, approvedPaid);
  const hasDeposit = invoiceHasOptionalDeposit(invoice);
  const canPay =
    invoice.status === "unpaid" || invoice.status === "draft";
  const hasPendingPayment = invoice.payments.some((p) => p.status === "submitted");

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
        Invoice
      </h1>
      <Card>
        <CardHeader>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="font-semibold text-gray-900 dark:text-white">
                {invoice.case.service.name}
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Case {invoice.case.caseNumber}
              </p>
            </div>
            <div className="text-right">
              <p className="text-xl font-bold text-siam-blue">
                {formatCurrency(dueNow > 0 ? dueNow : invoice.amount, invoice.currency)}
              </p>
              {hasDeposit && (
                <p className="text-xs text-gray-500">
                  Due now
                  {remaining !== dueNow
                    ? ` · Total ${formatCurrency(invoice.amount, invoice.currency)} · Remaining ${formatCurrency(remaining, invoice.currency)}`
                    : ` of ${formatCurrency(invoice.amount, invoice.currency)}`}
                </p>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <InvoiceDetailClient
            invoice={invoice}
            reference={reference}
            canPay={canPay}
            hasPendingPayment={hasPendingPayment}
            userId={session.user.id}
            paymentSettings={paymentSettings}
            amountDueNow={dueNow > 0 ? dueNow : invoice.amount}
          />
        </CardContent>
      </Card>
    </div>
  );
}
