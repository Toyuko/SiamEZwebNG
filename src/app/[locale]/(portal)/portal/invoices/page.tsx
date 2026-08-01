import { setRequestLocale } from "next-intl/server";
import { requireAuth } from "@/lib/auth";
import { getInvoicesByUserId } from "@/data-access/invoice";
import { getTranslations } from "next-intl/server";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";
import { FileText, FolderOpen } from "lucide-react";
import type { InvoiceStatus } from "@prisma/client";

const statusLabels: Record<InvoiceStatus, { en: string; th: string }> = {
  draft: { en: "Draft", th: "ฉบับร่าง" },
  unpaid: { en: "Unpaid", th: "ยังไม่ชำระ" },
  pending_verification: { en: "Pending Verification", th: "รอตรวจสอบ" },
  paid: { en: "Paid", th: "ชำระแล้ว" },
  rejected: { en: "Rejected", th: "ถูกปฏิเสธ" },
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
  const lang = locale === "th" ? "th" : "en";

  const invoices = await getInvoicesByUserId(session.user.id);
  const pendingCount = invoices.filter((i) =>
    ["unpaid", "pending_verification"].includes(i.status)
  ).length;

  return (
    <div className="max-w-4xl">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            {t("invoices")}
          </h1>
          <p className="mt-1 text-gray-600 dark:text-gray-400">
            {t("invoicesPageSubtitle")}
          </p>
          {pendingCount > 0 && (
            <p className="mt-2 text-sm font-medium text-amber-700 dark:text-amber-300">
              {t("invoicesPendingBanner", { count: pendingCount })}
            </p>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          <Button asChild variant="outline" size="sm">
            <Link href="/portal/cases">
              <FolderOpen className="h-4 w-4" />
              {t("myCases")}
            </Link>
          </Button>
          <Button asChild variant="outline" size="sm">
            <Link href="/portal/documents">
              <FileText className="h-4 w-4" />
              {t("documents")}
            </Link>
          </Button>
        </div>
      </div>

      {invoices.length === 0 ? (
        <Card className="mt-8">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <p className="text-gray-500">{t("noInvoicesYet")}</p>
            <p className="mt-1 max-w-sm text-center text-sm text-gray-500">
              {t("invoicesEmptyHint")}
            </p>
            <Button asChild className="mt-4">
              <Link href="/services">{t("bookAService")}</Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="mt-8 space-y-3">
          {invoices.map((inv) => (
            <Card key={inv.id} className="transition-shadow hover:shadow-md">
              <Link href={`/portal/invoices/${inv.id}`} className="block">
                <CardContent className="flex flex-col gap-2 p-5 transition-colors hover:bg-gray-50 sm:flex-row sm:items-center sm:justify-between dark:hover:bg-gray-800/50">
                  <div>
                    <p className="font-semibold text-gray-900 dark:text-white">
                      {inv.case.service.name}
                    </p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {inv.case.caseNumber}
                    </p>
                    <p className="mt-1 text-xs text-gray-500">
                      {t("invoiceDue")}:{" "}
                      {inv.dueDate
                        ? new Date(inv.dueDate).toLocaleDateString(
                            locale === "th" ? "th-TH" : "en-GB"
                          )
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
                      {statusLabels[inv.status][lang]}
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
