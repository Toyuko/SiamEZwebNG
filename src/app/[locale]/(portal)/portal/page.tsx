import { setRequestLocale } from "next-intl/server";
import { redirect } from "next/navigation";
import { SummaryCard } from "@/components/portal/SummaryCard";
import { ActivityFeed } from "@/components/portal/ActivityFeed";
import { NextSteps } from "@/components/portal/NextSteps";
import { QuickLinks } from "@/components/portal/QuickLinks";
import { AiRecommendations } from "@/components/portal/AiRecommendations";
import { PortalFooter } from "@/components/portal/PortalFooter";
import { getTranslations } from "next-intl/server";
import { requireAuth } from "@/lib/auth";
import { getCasesByUserId } from "@/data-access/case";
import { getJobsByClientId } from "@/data-access/job";
import { getInvoicesByUserId } from "@/data-access/invoice";
import { getDocumentsByUserId } from "@/data-access/document";
import { getRecentActivityForUser } from "@/data-access/activity";
import { buildCustomerNextSteps } from "@/lib/portal/next-steps";
import { getPopularRecommendations } from "@/lib/ai/recommend";
import type { ConciergeLocale } from "@/lib/ai/types";

export default async function PortalDashboardPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const session = await requireAuth();

  if (session.user.role === "company") {
    redirect(`/${locale}/portal/company`);
  }
  if (session.user.role === "freelancer") {
    redirect(`/${locale}/portal/freelancer`);
  }

  const t = await getTranslations("portal");
  const conciergeLocale: ConciergeLocale = locale === "th" ? "th" : "en";

  const [cases, invoices, documents, serviceJobs, activities] = await Promise.all([
    getCasesByUserId(session.user.id),
    getInvoicesByUserId(session.user.id),
    getDocumentsByUserId(session.user.id),
    getJobsByClientId(session.user.id),
    getRecentActivityForUser(session.user.id, 8),
  ]);

  const activeCasesCount =
    cases.filter((c) => !["cancelled", "completed"].includes(c.status)).length +
    serviceJobs.filter((j) => !["completed", "approved"].includes(j.status)).length;
  const pendingInvoicesCount = invoices.filter((i) =>
    ["unpaid", "pending_verification", "draft"].includes(i.status)
  ).length;
  const documentsCount = documents.length;
  const attentionCount = activities.filter(
    (a) => a.status === "required" || a.status === "pending"
  ).length;

  const nextSteps = buildCustomerNextSteps({
    cases,
    invoices,
    jobs: serviceJobs,
    labels: {
      payInvoice: (serviceName) => t("nextSteps.payInvoice", { service: serviceName }),
      payInvoiceDesc: (caseNumber) => t("nextSteps.payInvoiceDesc", { caseNumber }),
      uploadDocs: (serviceName) => t("nextSteps.uploadDocs", { service: serviceName }),
      uploadDocsDesc: (caseNumber) => t("nextSteps.uploadDocsDesc", { caseNumber }),
      reviewJob: (title) => t("nextSteps.reviewJob", { title }),
      reviewJobDesc: t("nextSteps.reviewJobDesc"),
      awaitingQuote: (serviceName) => t("nextSteps.awaitingQuote", { service: serviceName }),
      awaitingQuoteDesc: (caseNumber) =>
        t("nextSteps.awaitingQuoteDesc", { caseNumber }),
      bookFirst: t("nextSteps.bookFirst"),
      bookFirstDesc: t("nextSteps.bookFirstDesc"),
    },
  });

  const recommendations = getPopularRecommendations(conciergeLocale, 4);

  return (
    <div className="max-w-7xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
          {t("dashboard")}
        </h1>
        <p className="mt-2 text-gray-600 dark:text-gray-400">{t("dashboardSubtitle")}</p>
      </div>

      <QuickLinks
        title={t("quickLinksTitle")}
        links={[
          {
            href: "/portal/cases",
            label: t("myCases"),
            hint: t("quickLinks.casesHint", { count: activeCasesCount }),
            icon: "cases",
            badge: activeCasesCount,
          },
          {
            href: "/portal/invoices",
            label: t("invoices"),
            hint: t("quickLinks.invoicesHint", { count: pendingInvoicesCount }),
            icon: "invoices",
            badge: pendingInvoicesCount,
          },
          {
            href: "/portal/documents",
            label: t("documents"),
            hint: t("quickLinks.documentsHint", { count: documentsCount }),
            icon: "documents",
            badge: documentsCount,
          },
          {
            href: "/portal/notifications",
            label: t("notifications"),
            hint: t("quickLinks.notificationsHint", { count: attentionCount }),
            icon: "notifications",
            badge: attentionCount,
          },
        ]}
      />

      <NextSteps
        title={t("nextSteps.title")}
        emptyLabel={t("nextSteps.empty")}
        steps={nextSteps}
      />

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

      <ActivityFeed items={activities} viewAllHref="/portal/notifications" />

      <AiRecommendations
        title={t("aiRecommendations.title")}
        subtitle={t("aiRecommendations.subtitle")}
        askConciergeLabel={t("aiRecommendations.askConcierge")}
        bookLabel={t("aiRecommendations.book")}
        recommendations={recommendations}
      />

      <PortalFooter />
    </div>
  );
}
