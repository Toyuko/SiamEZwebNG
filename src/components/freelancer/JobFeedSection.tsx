"use client";

import { useTransition } from "react";
import { useTranslations } from "next-intl";
import { acceptJob } from "@/actions/freelancer-jobs";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatJobAmount } from "@/data-access/job";
import { Briefcase, Building2 } from "lucide-react";

export type JobFeedItem = {
  id: string;
  title: string;
  description: string;
  amount: number;
  currency: string;
  postedBy: { name: string | null; email: string };
};

export function JobFeedSection({ jobs }: { jobs: JobFeedItem[] }) {
  const t = useTranslations("freelancer");
  const [pending, startTransition] = useTransition();

  function handleAccept(jobId: string) {
    startTransition(async () => {
      await acceptJob(jobId);
    });
  }

  return (
    <Card className="h-full">
      <CardHeader className="border-b border-border pb-4">
        <CardTitle className="flex items-center gap-2 text-siam-blue">
          <Briefcase className="h-5 w-5" />
          {t("jobFeed")}
        </CardTitle>
        <p className="text-sm text-muted">{t("jobFeedSubtitle")}</p>
      </CardHeader>
      <CardContent className="space-y-4 pt-4">
        {jobs.length === 0 ? (
          <p className="text-sm text-gray-500 dark:text-gray-400">{t("noOpenJobs")}</p>
        ) : (
          jobs.map((job) => (
            <article
              key={job.id}
              className="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800"
            >
              <h4 className="font-semibold text-gray-900 dark:text-white">{job.title}</h4>
              <p className="mt-1 line-clamp-2 text-sm text-gray-600 dark:text-gray-400">
                {job.description}
              </p>
              <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                <span className="flex items-center gap-1 text-xs text-gray-500">
                  <Building2 className="h-3.5 w-3.5" />
                  {job.postedBy.name ?? job.postedBy.email}
                </span>
                <span className="text-sm font-semibold text-siam-blue">
                  {formatJobAmount(job.amount, job.currency)}
                </span>
              </div>
              <Button
                type="button"
                variant="primary"
                size="sm"
                className="mt-3 w-full sm:w-auto"
                disabled={pending}
                onClick={() => handleAccept(job.id)}
              >
                {t("acceptJob")}
              </Button>
            </article>
          ))
        )}
      </CardContent>
    </Card>
  );
}
