import { setRequestLocale } from "next-intl/server";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { requireAuth } from "@/lib/auth";
import { getCasesByUserId } from "@/data-access/case";
import { getJobsByClientId } from "@/data-access/job";
import { getInvoicesByUserId } from "@/data-access/invoice";
import {
  buildCustomerNextSteps,
  filterActionRequiredSteps,
} from "@/lib/portal/next-steps";
import { isActiveBookingStatus } from "@/lib/portal/booking-progress";
import { portalHomeRedirectForRole } from "@/lib/portal/workspace-sections";
import { WelcomeSection } from "@/components/portal/WelcomeSection";
import { ActionRequiredList } from "@/components/portal/ActionRequiredList";
import {
  ActiveBookingCard,
  ActiveBookingsEmpty,
  ActiveBookingsSection,
  ActiveJobCard,
} from "@/components/portal/ActiveBookingCard";
import { PreCheckCard } from "@/components/portal/PreCheckCard";
import { PortalFooter } from "@/components/portal/PortalFooter";

const ACTIVE_JOB_STATUSES = new Set([
  "open",
  "in_progress",
  "completed_awaiting_review",
]);

function firstNameFrom(name: string | null | undefined, email: string): string {
  const raw = (name ?? "").trim();
  if (raw) return raw.split(/\s+/)[0] ?? raw;
  const local = email.split("@")[0] ?? "there";
  return local.charAt(0).toUpperCase() + local.slice(1);
}

function isDrivingLicenseRelated(serviceName: string | null | undefined, slug?: string | null) {
  const hay = `${serviceName ?? ""} ${slug ?? ""}`.toLowerCase();
  return (
    hay.includes("driving") ||
    hay.includes("driver") ||
    hay.includes("licence") ||
    hay.includes("license") ||
    hay.includes("ใบขับขี่")
  );
}

export default async function PortalDashboardPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const session = await requireAuth();

  const homeRedirect = portalHomeRedirectForRole(session.user.role);
  if (homeRedirect === "company") {
    redirect(`/${locale}/portal/company`);
  }
  if (homeRedirect === "freelancer") {
    redirect(`/${locale}/portal/freelancer`);
  }

  const t = await getTranslations("portal");

  // Lean dashboard load: bookings + invoices + jobs only (no marketplace/analytics/recs).
  const [cases, invoices, serviceJobs] = await Promise.all([
    getCasesByUserId(session.user.id),
    getInvoicesByUserId(session.user.id),
    getJobsByClientId(session.user.id),
  ]);

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
      ctaPay: t("actionRequired.ctaPay"),
      ctaUpload: t("actionRequired.ctaUpload"),
      ctaReview: t("actionRequired.ctaReview"),
      ctaBook: t("actionRequired.ctaBook"),
    },
  });

  const actionRequired = filterActionRequiredSteps(nextSteps);

  const activeCases = cases
    .filter((c) => isActiveBookingStatus(c.status))
    .sort((a, b) => {
      const aNeeds = a.status === "pending_docs" || a.status.includes("payment") ? 0 : 1;
      const bNeeds = b.status === "pending_docs" || b.status.includes("payment") ? 0 : 1;
      if (aNeeds !== bNeeds) return aNeeds - bNeeds;
      return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
    });

  const activeJobs = serviceJobs
    .filter((j) => ACTIVE_JOB_STATUSES.has(j.status))
    .sort((a, b) => {
      const aNeeds = a.status === "completed_awaiting_review" ? 0 : 1;
      const bNeeds = b.status === "completed_awaiting_review" ? 0 : 1;
      if (aNeeds !== bNeeds) return aNeeds - bNeeds;
      return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
    });

  type Highlight =
    | { kind: "case"; priority: number; at: number; case: (typeof activeCases)[number] }
    | { kind: "job"; priority: number; at: number; job: (typeof activeJobs)[number] };

  const highlights: Highlight[] = [
    ...activeCases.map((c) => ({
      kind: "case" as const,
      priority:
        c.status === "pending_docs" || c.status.includes("payment") ? 0 : 1,
      at: new Date(c.updatedAt).getTime(),
      case: c,
    })),
    ...activeJobs.map((j) => ({
      kind: "job" as const,
      priority: j.status === "completed_awaiting_review" ? 0 : 2,
      at: new Date(j.updatedAt).getTime(),
      job: j,
    })),
  ]
    .sort((a, b) => a.priority - b.priority || b.at - a.at)
    .slice(0, 2);

  const activeCount = activeCases.length + activeJobs.length;
  const showViewAllBookings = activeCount > 0;

  const hasActiveLicenseBooking =
    activeCases.some((c) =>
      isDrivingLicenseRelated(c.service?.name, c.service?.slug)
    ) ||
    activeJobs.some((j) =>
      isDrivingLicenseRelated(j.service?.name, j.service?.slug)
    );

  const jobStatusLabels: Record<string, string> = {
    open: t("jobStatus.open"),
    in_progress: t("jobStatus.inProgress"),
    completed_awaiting_review: t("jobStatus.awaitingReview"),
  };

  const firstName = firstNameFrom(session.user.name, session.user.email);

  const progressLabels = {
    booked: t("bookingProgress.booked"),
    documents: t("bookingProgress.documents"),
    review: t("bookingProgress.review"),
    appointment: t("bookingProgress.appointment"),
    completed: t("bookingProgress.completed"),
  };

  const bookingActionLabels = {
    view: t("bookingActions.view"),
    upload: t("bookingActions.upload"),
    pay: t("bookingActions.pay"),
  };

  return (
    <div className="mx-auto max-w-5xl">
      <WelcomeSection
        title={t("welcome.title", { name: firstName })}
        subtitle={t("welcome.subtitle")}
        bookLabel={t("bookNewService")}
        askLabel={t("askSiamEz")}
      />

      <ActionRequiredList
        title={t("actionRequired.title")}
        emptyTitle={t("actionRequired.emptyTitle")}
        emptyDescription={t("actionRequired.emptyDescription")}
        countLabel={(count) => t("actionRequired.count", { count })}
        steps={actionRequired}
      />

      <ActiveBookingsSection
        title={t("activeBookings.title")}
        subtitle={
          activeCount > 0
            ? t("activeBookings.subtitle", { count: activeCount })
            : undefined
        }
        viewAllLabel={t("activeBookings.viewAll")}
        showViewAll={showViewAllBookings}
      >
        {highlights.length === 0 ? (
          <ActiveBookingsEmpty
            title={t("activeBookings.emptyTitle")}
            description={t("activeBookings.emptyDescription")}
            bookLabel={t("bookNewService")}
          />
        ) : (
          <div className="grid gap-3 sm:gap-4">
            {highlights.map((item) =>
              item.kind === "case" ? (
                <ActiveBookingCard
                  key={item.case.id}
                  id={item.case.id}
                  serviceName={item.case.service?.name ?? t("serviceJobFallback")}
                  caseNumber={item.case.caseNumber}
                  status={item.case.status}
                  locale={locale}
                  progressLabels={progressLabels}
                  actionLabels={bookingActionLabels}
                />
              ) : (
                <ActiveJobCard
                  key={item.job.id}
                  id={item.job.id}
                  title={item.job.title}
                  serviceName={item.job.service?.name ?? t("serviceJobFallback")}
                  status={item.job.status}
                  statusLabel={
                    jobStatusLabels[item.job.status] ?? item.job.status
                  }
                  actionLabel={
                    item.job.status === "completed_awaiting_review"
                      ? t("bookingActions.reviewJob")
                      : t("bookingActions.view")
                  }
                />
              )
            )}
          </div>
        )}
      </ActiveBookingsSection>

      <PreCheckCard
        userId={session.user.id}
        locale={locale}
        hideWhenActiveLicenseBooking={hasActiveLicenseBooking}
        labels={{
          title: t("preCheck.title"),
          titleWithStatus: t("preCheck.titleWithStatus"),
          description: t("preCheck.description"),
          startCta: t("preCheck.startCta"),
          viewCta: t("preCheck.viewCta"),
          newCheckCta: t("preCheck.newCheckCta"),
        }}
      />

      <PortalFooter />
    </div>
  );
}
