import { setRequestLocale } from "next-intl/server";
import { requireAuth } from "@/lib/auth";
import { getInvoicesByUserId } from "@/data-access/invoice";
import { getTranslations } from "next-intl/server";
import { Card, CardContent } from "@/components/ui/card";
import { Link } from "@/i18n/navigation";
import type { InvoiceStatus } from "@prisma/client";

const statusLabels: Record<InvoiceStatus, string> = {
  draft: "Draft",
  unpaid: "Unpaid",
  pending_verification: "Pending Verification",
  paid: "Paid",
  rejected: "Rejected",
};

const statusBadgeClass: Record<InvoiceStatus, string> = {
  draft: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300",
  unpaid: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300",
  pending_verification: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
  paid: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
  rejected: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300",
};

export default async function PortalInvoicesPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const session = await requireAuth();
  const t = await getTranslations("portal");

  const invoices = await getInvoicesByUserId(session.user.id);

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t("invoices")}</h1>
      <p className="mt-1 text-gray-600 dark:text-gray-400">
        View and pay your invoices.
      </p>
      {invoices.length === 0 ? (
        <Card className="mt-8">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <p className="text-gray-500">No invoices yet.</p>
            <Link
              href="/services"
              className="mt-4 text-sm font-medium text-siam-blue hover:underline"
            >
              Book a service
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="mt-8 space-y-4">
          {invoices.map((inv) => (
            <Card key={inv.id} className="transition-shadow hover:shadow-md">
              <Link href={`/portal/invoices/${inv.id}`} className="block">
              <CardContent className="flex flex-col gap-2 p-6 sm:flex-row sm:items-center sm:justify-between transition-colors hover:bg-gray-50 dark:hover:bg-gray-800/50">
                <div>
                  <p className="font-semibold text-gray-900 dark:text-white">
                    {inv.case.service.name}
                  </p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {inv.case.caseNumber}
                  </p>
                  <p className="mt-1 text-xs text-gray-500">
                    Due:{" "}
                    {inv.dueDate
                      ? new Date(inv.dueDate).toLocaleDateString()
                      : "—"}
                  </p>
                </div>
                <div className="flex items-center gap-4">
                  <span className="font-semibold">
                    {(inv.amount / 100).toFixed(2)} {inv.currency}
                  </span>
                  <span
                    className={`inline-flex rounded-full px-3 py-1 text-xs font-medium ${statusBadgeClass[inv.status]}`}
                  >
                    {statusLabels[inv.status]}
                  </span>
                </div>
              </CardContent>
              </Link>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
