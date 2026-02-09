import { setRequestLocale } from "next-intl/server";
import { SummaryCard } from "@/components/portal/SummaryCard";
import { ActivityFeed, type ActivityItem } from "@/components/portal/ActivityFeed";
import { PortalFooter } from "@/components/portal/PortalFooter";
import { getTranslations } from "next-intl/server";

// Mock data - replace with real data fetching later
const mockStats = {
  activeCasesCount: 4,
  pendingInvoicesCount: 2,
  documentsCount: 12,
};

const mockActivities: ActivityItem[] = [
  {
    id: "1",
    type: "case",
    title: "Case #SZ-1029: Visa Extension Approved",
    timestamp: "2 hours ago",
    action: "Required Signature",
    status: "required",
  },
  {
    id: "2",
    type: "invoice",
    title: "New Invoice Generated: Legal Consultancy (May)",
    timestamp: "Yesterday",
    action: "Pending Payment",
    status: "pending",
  },
  {
    id: "3",
    type: "document",
    title: "Document Uploaded: Passport Scan Copy",
    timestamp: "3 days ago",
    action: "System Update",
    status: "info",
  },
];

export default async function PortalDashboardPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("portal");

  return (
    <div className="max-w-7xl">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">{t("dashboard")}</h1>
        <p className="mt-2 text-gray-600 dark:text-gray-400">{t("dashboardSubtitle")}</p>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        <SummaryCard
          iconName="FolderOpen"
          title={t("myCases")}
          description={t("casesDescription", { count: mockStats.activeCasesCount })}
          count={mockStats.activeCasesCount}
          href="/portal/cases"
          buttonLabel={t("viewCases")}
          buttonVariant="default"
        />
        <SummaryCard
          iconName="CreditCard"
          title={t("invoices")}
          description={t("invoicesDescription", { count: mockStats.pendingInvoicesCount })}
          count={mockStats.pendingInvoicesCount}
          href="/portal/invoices"
          buttonLabel={t("viewInvoices")}
          buttonVariant="outline"
        />
        <SummaryCard
          iconName="FileText"
          title={t("documents")}
          description={t("documentsDescription", { count: mockStats.documentsCount })}
          count={mockStats.documentsCount}
          href="/portal/documents"
          buttonLabel={t("viewDocuments")}
          buttonVariant="outline"
        />
      </div>

      {/* Recent Updates */}
      <ActivityFeed items={mockActivities} />

      {/* Footer */}
      <PortalFooter />
    </div>
  );
}
