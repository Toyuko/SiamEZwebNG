import { notFound, redirect } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { getTranslations } from "next-intl/server";
import { getLocale } from "next-intl/server";
import { requireAuth } from "@/lib/auth";
import { getJobById, formatJobAmount } from "@/data-access/job";
import { AutoApprovalCountdown } from "@/components/freelancer/AutoApprovalCountdown";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { jobProgressPercent } from "@/lib/jobs/auto-approve";
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

  if (!isClient && !isFreelancer && !isStaff) {
    const currentLocale = await getLocale();
    redirect(`/${currentLocale}/portal`);
  }

  const progress = jobProgressPercent(job.status);
  const showCountdown =
    isClient &&
    (job.status === "completed_awaiting_review" || job.status === "completed") &&
    job.completionSubmittedAt != null;

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
        </CardContent>
      </Card>
    </div>
  );
}
