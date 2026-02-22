import { notFound } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { requireAuth } from "@/lib/auth";
import { getInvoiceByIdForUser } from "@/data-access/invoice";
import { InvoiceDetailClient } from "./InvoiceDetailClient";
import { formatCurrency } from "@/lib/utils";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

export default async function PortalInvoiceDetailPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  setRequestLocale(locale);
  const session = await requireAuth();

  const invoice = await getInvoiceByIdForUser(id, session.user.id);
  if (!invoice) notFound();

  const reference = invoice.case.caseNumber;
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
            <p className="text-xl font-bold text-siam-blue">
              {formatCurrency(invoice.amount, invoice.currency)}
            </p>
          </div>
        </CardHeader>
        <CardContent>
          <InvoiceDetailClient
            invoice={invoice}
            reference={reference}
            canPay={canPay}
            hasPendingPayment={hasPendingPayment}
            userId={session.user.id}
          />
        </CardContent>
      </Card>
    </div>
  );
}
