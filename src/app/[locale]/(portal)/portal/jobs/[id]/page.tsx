import { notFound, redirect } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { getTranslations } from "next-intl/server";
import { getLocale } from "next-intl/server";
import { requireAuth } from "@/lib/auth";
import { getJobById, formatJobAmount } from "@/data-access/job";
import { AutoApprovalCountdown } from "@/components/freelancer/AutoApprovalCountdown";
import { JobTrackingTimeline } from "@/components/jobs/JobTrackingTimeline";
import { JobTrackingUpdateForm } from "@/components/jobs/JobTrackingUpdateForm";
import { ChatBox } from "@/components/jobs/ChatBox";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  getTrackingStepsForServiceSlug,
  isTrackableServiceSlug,
  trackingProgressPercent,
} from "@/config/job-tracking-steps";
import { jobProgressPercent, isAwaitingReviewStatus } from "@/lib/jobs/auto-approve";
import { Link } from "@/i18n/navigation";
import { ArrowLeft, User } from "lucide-react";
import { cn } from "@/lib/utils";

export default async function JobTrackingPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  setRequestLocale(locale);
  const session = await requireAuth();
  const t = await getTranslations("freelancer");

  const job = await getJobById(id);
  if (!job) notFound();

  const isClient = job.postedById === session.user.id;
  const isFreelancer = job.freelancerId === session.user.id;
  const isStaff = session.user.role === "admin" || session.user.role === "staff";
  const serviceSlug = job.service?.slug ?? null;

  if (!isClient && !isFreelancer && !isStaff) {
    const currentLocale = await getLocale();
    redirect(`/${currentLocale}/portal`);
  }

  if (isClient && isTrackableServiceSlug(serviceSlug)) {
    const currentLocale = await getLocale();
    redirect(`/${currentLocale}/portal/client/jobs/${id}`);
  }

  const isTrackable = isTrackableServiceSlug(serviceSlug);
  // Clients on trackable services use the dedicated client tracking page (redirect above).
  const trackingSteps = getTrackingStepsForServiceSlug(serviceSlug);

  const progress =
    isTrackable && trackingSteps && job.trackingStatus
      ? trackingProgressPercent(trackingSteps, job.trackingStatus)
      : jobProgressPercent(job.status);

  const showCountdown =
    isClient &&
    isAwaitingReviewStatus(job.status) &&
    job.completionSubmittedAt != null;

  const canUpdateTracking =
    isFreelancer && job.status === "in_progress" && isTrackable && trackingSteps;

  return (
    <div className="mx-auto max-w-2xl">
      <Link
        href={session.user.role === "freelancer" ? "/portal/freelancer" : "/portal"}
        className="mb-6 inline-flex items-center gap-2 text-sm text-siam-blue hover:underline"
      >
        <ArrowLeft className="h-4 w-4" />
        {t("backToPortal")}
      </Link>

      <Card>
        <CardHeader>
          <CardTitle className="text-siam-blue">{job.title}</CardTitle>
          <p className="text-sm text-muted">{t(`status.${job.status}`)}</p>
          {job.service && (
            <p className="text-xs text-slate-500">{job.service.name}</p>
          )}
        </CardHeader>
        <CardContent className="space-y-6">
          <p className="text-gray-700 dark:text-gray-300">{job.description}</p>

          <div className="flex flex-wrap gap-4 text-sm">
            <span className="font-semibold text-siam-blue">
              {formatJobAmount(job.amount, job.currency)}
            </span>
            {job.freelancer && (
              <span className="flex items-center gap-1 text-gray-600 dark:text-gray-400">
                <User className="h-4 w-4" />
                {job.freelancer.name ?? job.freelancer.email}
              </span>
            )}
          </div>

          {isTrackable && trackingSteps ? (
            <section className="rounded-2xl bg-white/95 p-4 shadow-sm ring-1 ring-sky-100 dark:bg-slate-900/80 dark:ring-sky-900">
              <h3 className="mb-4 text-sm font-semibold text-sky-900 dark:text-sky-100">
                {t("trackTraceTitle")}
              </h3>
              <JobTrackingTimeline
                steps={trackingSteps}
                currentStatus={job.trackingStatus}
                notes={job.trackingNotes}
                lastUpdated={job.updatedAt}
                locale={locale}
              />
            </section>
          ) : null}

          {canUpdateTracking && (
            <JobTrackingUpdateForm
              jobId={job.id}
              steps={trackingSteps}
              currentStatus={job.trackingStatus}
              currentNotes={job.trackingNotes}
            />
          )}

          <div>
            <div className="mb-1 flex justify-between text-xs text-gray-500">
              <span>{t("progress")}</span>
              <span>{progress}%</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700">
              <div
                className={cn(
                  "h-full rounded-full transition-all",
                  job.status === "approved" ? "bg-emerald-500" : "bg-siam-blue"
                )}
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>

          {showCountdown && (
            <AutoApprovalCountdown
              completionSubmittedAt={job.completionSubmittedAt!.toISOString()}
            />
          )}

          {job.status === "approved" && (
            <p className="rounded-lg bg-emerald-50 px-4 py-3 text-sm text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-200">
              {t("jobApproved")}
            </p>
          )}

          {(isClient || isFreelancer) && (
            <ChatBox
              jobId={job.id}
              currentUserId={session.user.id}
              otherPartyName={
                isFreelancer
                  ? (job.postedBy.name ?? job.postedBy.email)
                  : (job.freelancer?.name ?? job.freelancer?.email ?? t("freelancerPending"))
              }
              disabled={!job.freelancerId}
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
