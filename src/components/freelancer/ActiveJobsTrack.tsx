"use client";

import { useTransition } from "react";
import { useTranslations } from "next-intl";
import { markJobComplete } from "@/actions/freelancer-jobs";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatJobAmount } from "@/data-access/job";
import { isAwaitingReviewStatus, jobProgressPercent } from "@/lib/jobs/auto-approve";
import type { JobStatus } from "@prisma/client";
import { MapPin, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";

export type ActiveJobItem = {
  id: string;
  title: string;
  status: JobStatus;
  amount: number;
  currency: string;
  postedBy: { name: string | null };
};

export function ActiveJobsTrack({ jobs }: { jobs: ActiveJobItem[] }) {
  const t = useTranslations("freelancer");
  const [pending, startTransition] = useTransition();

  function handleMarkDone(jobId: string) {
    startTransition(async () => {
      await markJobComplete(jobId);
    });
  }

  return (
    <Card className="h-full">
      <CardHeader className="border-b border-border pb-4">
        <CardTitle className="flex items-center gap-2 text-siam-blue">
          <MapPin className="h-5 w-5" />
          {t("activeTrackTrace")}
        </CardTitle>
        <p className="text-sm text-muted">{t("activeTrackTraceSubtitle")}</p>
      </CardHeader>
      <CardContent className="space-y-4 pt-4">
        {jobs.length === 0 ? (
          <p className="text-sm text-gray-500 dark:text-gray-400">{t("noActiveJobs")}</p>
        ) : (
          jobs.map((job) => {
            const progress = jobProgressPercent(job.status);
            const canMarkDone = job.status === "in_progress";

            return (
              <article
                key={job.id}
                className="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h4 className="font-semibold text-gray-900 dark:text-white">{job.title}</h4>
                    <p className="text-xs text-gray-500">{job.postedBy.name ?? "—"}</p>
                  </div>
                  <span className="text-sm font-medium text-siam-blue">
                    {formatJobAmount(job.amount, job.currency)}
                  </span>
                </div>
                <div className="mt-3">
                  <div className="mb-1 flex justify-between text-xs text-gray-500">
                    <span>{t(`status.${job.status}`)}</span>
                    <span>{progress}%</span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700">
                    <div
                      className={cn(
                        "h-full rounded-full transition-all duration-500",
                        isAwaitingReviewStatus(job.status)
                          ? "bg-siam-yellow"
                          : "bg-siam-blue"
                      )}
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                </div>
                {canMarkDone && (
                  <Button
                    type="button"
                    variant="primary"
                    size="sm"
                    className="mt-3 w-full gap-2 sm:w-auto"
                    disabled={pending}
                    onClick={() => handleMarkDone(job.id)}
                  >
                    <CheckCircle2 className="h-4 w-4" />
                    {t("markAsDone")}
                  </Button>
                )}
                {isAwaitingReviewStatus(job.status) && (
                  <p className="mt-2 text-xs text-amber-600 dark:text-amber-400">
                    {t("awaitingClientApproval")}
                  </p>
                )}
              </article>
            );
          })
        )}
      </CardContent>
    </Card>
  );
}
