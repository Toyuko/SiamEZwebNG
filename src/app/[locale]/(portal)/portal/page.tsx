import { setRequestLocale } from "next-intl/server";
import { SummaryCard } from "@/components/portal/SummaryCard";
import { ActivityFeed } from "@/components/portal/ActivityFeed";
import { PortalFooter } from "@/components/portal/PortalFooter";
import { getTranslations } from "next-intl/server";
import { requireAuth } from "@/lib/auth";
import { getCasesByUserId } from "@/data-access/case";
import { getInvoicesByUserId } from "@/data-access/invoice";
import { getDocumentsByUserId } from "@/data-access/document";
import { getRecentActivityForUser } from "@/data-access/activity";

export default async function PortalDashboardPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const session = await requireAuth();
  const t = await getTranslations("portal");

  const [cases, invoices, documents] = await Promise.all([
    getCasesByUserId(session.user.id),
    getInvoicesByUserId(session.user.id),
    getDocumentsByUserId(session.user.id),
  ]);

  const activeCasesCount = cases.filter(
    (c) =>
      !["cancelled", "completed"].includes(c.status)
  ).length;
  const pendingInvoicesCount = invoices.filter((i) =>
    ["unpaid", "pending_verification", "draft"].includes(i.status)
  ).length;
  const documentsCount = documents.length;

  const activities = await getRecentActivityForUser(session.user.id);

  return (
    <div className="max-w-7xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">{t("dashboard")}</h1>
        <p className="mt-2 text-gray-600 dark:text-gray-400">{t("dashboardSubtitle")}</p>
      </div>

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        <SummaryCard
          iconName="FolderOpen"
          title={t("myCases")}
          description={t("casesDescription", { count: activeCasesCount })}
          count={activeCasesCount}
          href="/portal/cases"
          buttonLabel={t("viewCases")}
          buttonVariant="default"
        />
        <SummaryCard
          iconName="CreditCard"
          title={t("invoices")}
          description={t("invoicesDescription", { count: pendingInvoicesCount })}
          count={pendingInvoicesCount}
          href="/portal/invoices"
          buttonLabel={t("viewInvoices")}
          buttonVariant="outline"
        />
        <SummaryCard
          iconName="FileText"
          title={t("documents")}
          description={t("documentsDescription", { count: documentsCount })}
          count={documentsCount}
          href="/portal/documents"
          buttonLabel={t("viewDocuments")}
          buttonVariant="outline"
        />
      </div>

      <ActivityFeed items={activities} />

      <PortalFooter />
    </div>
  );
}
