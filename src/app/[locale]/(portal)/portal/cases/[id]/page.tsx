import { setRequestLocale } from "next-intl/server";
import { requireAuth } from "@/lib/auth";
import { getCaseByIdForUser } from "@/data-access/case";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { notFound } from "next/navigation";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CaseTimeline } from "@/components/portal/CaseTimeline";
import { buildCaseTimeline } from "@/lib/portal/case-timeline";
import { CASE_STATUS_BADGE_CLASS, CASE_STATUS_LABELS } from "@/lib/domain/case-status";
import { formatCurrency } from "@/lib/utils";

export default async function PortalCaseDetailPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  setRequestLocale(locale);
  const session = await requireAuth();
  const t = await getTranslations("portal");
  const tPay = await getTranslations("quotePayment");

  const caseData = await getCaseByIdForUser(id, session.user.id);
  if (!caseData) notFound();

  const statusLabel =
    CASE_STATUS_LABELS[caseData.status][locale === "th" ? "th" : "en"];

  const timeline = buildCaseTimeline({
    caseNumber: caseData.caseNumber,
    status: caseData.status,
    createdAt: caseData.createdAt,
    updatedAt: caseData.updatedAt,
    completedAt: caseData.completedAt,
    statusLabel,
    notes: caseData.caseNotes,
    documents: caseData.documents,
    invoices: caseData.invoices,
    quotes: caseData.quotes,
    labels: {
      caseOpened: t("timeline.caseOpened"),
      caseOpenedDesc: (caseNumber) => t("timeline.caseOpenedDesc", { caseNumber }),
      statusUpdate: (status) => t("timeline.statusUpdate", { status }),
      statusUpdateDesc: t("timeline.statusUpdateDesc"),
      completed: t("timeline.completed"),
      noteFromTeam: t("timeline.noteFromTeam"),
      documentAdded: (name) => t("timeline.documentAdded", { name }),
      invoiceLabel: (status, amount) => t("timeline.invoiceLabel", { status, amount }),
      quoteSent: (amount) => t("timeline.quoteSent", { amount }),
    },
  });

  const unpaidInvoices = caseData.invoices.filter((inv) =>
    ["unpaid", "pending_verification"].includes(inv.status)
  );

  return (
    <div className="max-w-5xl">
      <div className="mb-6 flex items-center gap-4">
        <Link
          href="/portal/cases"
          className="text-sm font-medium text-siam-blue hover:underline"
        >
          ← {t("myCases")}
        </Link>
      </div>

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            {caseData.caseNumber}
          </h1>
          <p className="mt-1 text-gray-600 dark:text-gray-400">{caseData.service.name}</p>
        </div>
        <span
          className={`inline-flex rounded-full px-3 py-1 text-xs font-medium ${CASE_STATUS_BADGE_CLASS[caseData.status]}`}
        >
          {statusLabel}
        </span>
      </div>

      <div className="mt-6 flex flex-wrap gap-3">
        <Button asChild variant="outline" size="sm">
          <Link href="/portal/documents">{t("documents")}</Link>
        </Button>
        <Button asChild variant="outline" size="sm">
          <Link href="/portal/invoices">{t("invoices")}</Link>
        </Button>
        {unpaidInvoices[0] && (
          <Button asChild variant="primary" size="sm">
            <Link href={`/portal/invoices/${unpaidInvoices[0].id}`}>
              {t("caseDetail.payInvoice")}
            </Link>
          </Button>
        )}
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-5">
        <div className="space-y-6 lg:col-span-2">
          <Card>
            <CardHeader>
              <h2 className="text-lg font-semibold">{t("caseDetail.details")}</h2>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-sm text-gray-500">{t("caseDetail.status")}</p>
                <p className="font-medium">{statusLabel}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">{t("caseDetail.created")}</p>
                <p>
                  {new Date(caseData.createdAt).toLocaleDateString(
                    locale === "th" ? "th-TH" : "en-GB"
                  )}
                </p>
              </div>
              {caseData.completedAt && (
                <div>
                  <p className="text-sm text-gray-500">{t("caseDetail.completed")}</p>
                  <p>
                    {new Date(caseData.completedAt).toLocaleDateString(
                      locale === "th" ? "th-TH" : "en-GB"
                    )}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {caseData.quotes[0] ? (
            <Card>
              <CardHeader>
                <h2 className="text-lg font-semibold">{tPay("title")}</h2>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div>
                    <p className="text-xs text-muted">{tPay("total")}</p>
                    <p className="font-semibold">
                      {formatCurrency(caseData.quotes[0].amount, caseData.quotes[0].currency)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted">{tPay("bookingPaid")}</p>
                    <p className="font-semibold">
                      {formatCurrency(
                        Math.max(
                          0,
                          caseData.quotes[0].amount -
                            (caseData.quotes[0].remainingBalance ?? caseData.quotes[0].amount)
                        ),
                        caseData.quotes[0].currency
                      )}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted">{tPay("remaining")}</p>
                    <p className="font-semibold">
                      {formatCurrency(
                        caseData.quotes[0].remainingBalance ??
                          Math.max(
                            0,
                            caseData.quotes[0].amount -
                              caseData.invoices
                                .filter((inv) => inv.status === "paid")
                                .reduce((sum, inv) => sum + inv.amount, 0)
                          ),
                        caseData.quotes[0].currency
                      )}
                    </p>
                  </div>
                </div>
                {unpaidInvoices[0] ? (
                  <p className="text-sm text-muted">
                    {tPay("nextPayment")}:{" "}
                    {formatCurrency(unpaidInvoices[0].amount, unpaidInvoices[0].currency)}
                  </p>
                ) : null}
                <div className="flex flex-wrap gap-2">
                  {unpaidInvoices[0] ? (
                    <Button asChild size="sm">
                      <Link href={`/portal/invoices/${unpaidInvoices[0].id}`}>
                        {tPay("payBalance")}
                      </Link>
                    </Button>
                  ) : null}
                  <Button asChild variant="outline" size="sm">
                    <Link href="/">{tPay("chatConcierge")}</Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : null}

          <Card>
            <CardHeader>
              <h2 className="text-lg font-semibold">{t("invoices")}</h2>
            </CardHeader>
            <CardContent>
              {caseData.invoices.length === 0 ? (
                <p className="text-sm text-gray-500">{t("caseDetail.noInvoices")}</p>
              ) : (
                <ul className="space-y-2">
                  {caseData.invoices.map((inv) => (
                    <li key={inv.id}>
                      <Link
                        href={`/portal/invoices/${inv.id}`}
                        className="text-sm font-medium text-siam-blue hover:underline"
                      >
                        {inv.status} – {(inv.amount / 100).toFixed(2)} {inv.currency}
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <h2 className="text-lg font-semibold">{t("documents")}</h2>
            </CardHeader>
            <CardContent>
              {caseData.documents.length === 0 ? (
                <p className="text-sm text-gray-500">{t("caseDetail.noDocuments")}</p>
              ) : (
                <ul className="space-y-2">
                  {caseData.documents.map((doc) => (
                    <li key={doc.id} className="text-sm text-gray-900 dark:text-white">
                      {doc.name}
                    </li>
                  ))}
                </ul>
              )}
              <Button asChild variant="outline" size="sm" className="mt-4">
                <Link href="/portal/documents">{t("caseDetail.viewAllDocuments")}</Link>
              </Button>
            </CardContent>
          </Card>
        </div>

        <Card className="lg:col-span-3">
          <CardContent className="p-6">
            <CaseTimeline
              title={t("timeline.title")}
              emptyLabel={t("timeline.empty")}
              items={timeline}
              locale={locale}
            />
          </CardContent>
        </Card>
      </div>

      <div className="mt-8">
        <Button asChild variant="primary">
          <Link href="/services">{t("bookNewService")}</Link>
        </Button>
      </div>
    </div>
  );
}
