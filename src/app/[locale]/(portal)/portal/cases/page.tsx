import { setRequestLocale } from "next-intl/server";
import { requireAuth } from "@/lib/auth";
import { getCasesByUserId } from "@/data-access/case";
import { getJobsByClientId } from "@/data-access/job";
import type { JobStatus } from "@prisma/client";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import type { CaseStatus } from "@prisma/client";

const statusLabels: Record<CaseStatus, string> = {
  new: "New",
  under_review: "Under Review",
  quoted: "Quoted",
  awaiting_payment: "Awaiting Payment",
  paid: "Paid",
  in_progress: "In Progress",
  pending_docs: "Pending Documents",
  completed: "Completed",
  cancelled: "Cancelled",
};

const jobStatusLabels: Record<JobStatus, string> = {
  open: "Awaiting freelancer",
  in_progress: "In progress",
  completed_awaiting_review: "Awaiting your review",
  approved: "Approved",
  completed: "Completed",
};

const jobStatusBadgeClass: Record<JobStatus, string> = {
  open: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300",
  in_progress: "bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-300",
  completed_awaiting_review:
    "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300",
  approved: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
  completed: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300",
};

const statusBadgeClass: Record<CaseStatus, string> = {
  new: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
  under_review: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300",
  quoted: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300",
  awaiting_payment: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300",
  paid: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
  in_progress: "bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-300",
  pending_docs: "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300",
  completed: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300",
  cancelled: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300",
};

export default async function PortalCasesPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const session = await requireAuth();
  const t = await getTranslations("portal");

  const [cases, serviceJobs] = await Promise.all([
    getCasesByUserId(session.user.id),
    getJobsByClientId(session.user.id),
  ]);

  const hasNothing = cases.length === 0 && serviceJobs.length === 0;

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t("myCases")}</h1>
      <p className="mt-1 text-gray-600 dark:text-gray-400">{t("casesPageSubtitle")}</p>
      <div className="mt-8 space-y-10">
        {hasNothing ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <p className="text-gray-500">{t("noCasesYet")}</p>
              <Button asChild className="mt-4">
                <Link href="/services">{t("bookAService")}</Link>
              </Button>
            </CardContent>
          </Card>
        ) : (
          <>
            {serviceJobs.length > 0 && (
              <section>
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                  {t("serviceJobsSection")}
                </h2>
                <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                  {t("serviceJobsSectionHint")}
                </p>
                <div className="mt-4 space-y-4">
                  {serviceJobs.map((job) => (
                    <Link key={job.id} href={`/portal/client/jobs/${job.id}`}>
                      <Card className="transition-shadow hover:shadow-md">
                        <CardContent className="flex flex-col gap-2 p-6 sm:flex-row sm:items-center sm:justify-between">
                          <div>
                            <p className="font-semibold text-gray-900 dark:text-white">
                              {job.title}
                            </p>
                            <p className="text-sm text-gray-600 dark:text-gray-400">
                              {job.service?.name ?? t("serviceJobFallback")}
                            </p>
                            <p className="mt-1 text-xs text-gray-500">
                              {new Date(job.createdAt).toLocaleDateString()}
                            </p>
                          </div>
                          <span
                            className={`inline-flex w-fit rounded-full px-3 py-1 text-xs font-medium ${jobStatusBadgeClass[job.status]}`}
                          >
                            {jobStatusLabels[job.status]}
                          </span>
                        </CardContent>
                      </Card>
                    </Link>
                  ))}
                </div>
              </section>
            )}

            {cases.length > 0 && (
              <section>
                {serviceJobs.length > 0 && (
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                    {t("bookingsSection")}
                  </h2>
                )}
                <div className={serviceJobs.length > 0 ? "mt-4 space-y-4" : "space-y-4"}>
                  {cases.map((c) => (
                    <Link key={c.id} href={`/portal/cases/${c.id}`}>
                      <Card className="transition-shadow hover:shadow-md">
                        <CardContent className="flex flex-col gap-2 p-6 sm:flex-row sm:items-center sm:justify-between">
                          <div>
                            <p className="font-semibold text-gray-900 dark:text-white">
                              {c.caseNumber}
                            </p>
                            <p className="text-sm text-gray-600 dark:text-gray-400">
                              {c.service.name}
                            </p>
                            <p className="mt-1 text-xs text-gray-500">
                              {new Date(c.createdAt).toLocaleDateString()}
                            </p>
                          </div>
                          <span
                            className={`inline-flex w-fit rounded-full px-3 py-1 text-xs font-medium ${statusBadgeClass[c.status]}`}
                          >
                            {statusLabels[c.status]}
                          </span>
                        </CardContent>
                      </Card>
                    </Link>
                  ))}
                </div>
              </section>
            )}
          </>
        )}
      </div>
    </div>
  );
}
