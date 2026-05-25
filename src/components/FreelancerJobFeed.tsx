"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { acceptJob } from "@/actions/freelancer-jobs";
import { formatJobAmount } from "@/data-access/job";
import type { JobBoardFeedItem } from "@/lib/jobs/job-board-payload";
import {
  getPusherClient,
  privateSpecialJobsChannel,
  publicJobBoardChannel,
} from "@/lib/pusher-client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { Briefcase, Building2, Sparkles, X } from "lucide-react";

type FreelancerJobFeedProps = {
  initialJobs?: JobBoardFeedItem[];
  isSpecialMember?: boolean;
};

type JobToast = {
  id: string;
  message: string;
};

function feedPayout(job: JobBoardFeedItem): number {
  return job.payoutAmount ?? job.amount;
}

export function FreelancerJobFeed({
  initialJobs = [],
  isSpecialMember = false,
}: FreelancerJobFeedProps) {
  const t = useTranslations("freelancer");
  const [jobs, setJobs] = useState<JobBoardFeedItem[]>(initialJobs);
  const [highlightedIds, setHighlightedIds] = useState<Set<string>>(new Set());
  const [toasts, setToasts] = useState<JobToast[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const highlightTimers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  const markHighlighted = useCallback((jobId: string) => {
    setHighlightedIds((prev) => new Set(prev).add(jobId));

    const existing = highlightTimers.current.get(jobId);
    if (existing) clearTimeout(existing);

    const timer = setTimeout(() => {
      setHighlightedIds((prev) => {
        const next = new Set(prev);
        next.delete(jobId);
        return next;
      });
      highlightTimers.current.delete(jobId);
    }, 3000);

    highlightTimers.current.set(jobId, timer);
  }, []);

  const pushToast = useCallback((message: string) => {
    const id = crypto.randomUUID();
    setToasts((prev) => [...prev, { id, message }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((toast) => toast.id !== id));
    }, 4500);
  }, []);

  const handleNewJob = useCallback(
    (job: JobBoardFeedItem) => {
      setJobs((prev) => {
        if (prev.some((item) => item.id === job.id)) return prev;
        return [job, ...prev];
      });
      markHighlighted(job.id);
      const category = job.category ?? job.title;
      pushToast(t("newJobToast", { category }));
    },
    [markHighlighted, pushToast, t]
  );

  useEffect(() => {
    let cancelled = false;

    async function loadJobs() {
      setLoadError(null);
      try {
        const res = await fetch("/api/freelancer/jobs", { credentials: "include" });
        const json = (await res.json()) as {
          success?: boolean;
          data?: { jobs: JobBoardFeedItem[] };
          error?: string;
        };

        if (cancelled) return;

        if (!res.ok || !json.success || !json.data) {
          setLoadError(json.error ?? t("jobFeedLoadError"));
          return;
        }

        const fetched = json.data.jobs;
        setJobs((prev) => {
          const byId = new Map<string, JobBoardFeedItem>();
          for (const job of [...fetched, ...prev]) {
            byId.set(job.id, job);
          }
          return [...byId.values()].sort(
            (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
          );
        });
      } catch {
        if (!cancelled) {
          setLoadError(t("jobFeedLoadError"));
        }
      }
    }

    void loadJobs();
    return () => {
      cancelled = true;
    };
  }, [t]);

  useEffect(() => {
    const pusher = getPusherClient();
    if (!pusher) return;

    const publicChannel = pusher.subscribe(publicJobBoardChannel());
    const onNewJob = (job: JobBoardFeedItem) => handleNewJob(job);
    publicChannel.bind("new-job-posted", onNewJob);

    let specialChannel: ReturnType<typeof pusher.subscribe> | null = null;
    if (isSpecialMember) {
      specialChannel = pusher.subscribe(privateSpecialJobsChannel());
      specialChannel.bind("new-job-posted", onNewJob);
    }

    return () => {
      publicChannel.unbind("new-job-posted", onNewJob);
      pusher.unsubscribe(publicJobBoardChannel());

      if (specialChannel) {
        specialChannel.unbind("new-job-posted", onNewJob);
        pusher.unsubscribe(privateSpecialJobsChannel());
      }
    };
  }, [handleNewJob, isSpecialMember]);

  useEffect(() => {
    return () => {
      highlightTimers.current.forEach((timer) => clearTimeout(timer));
      highlightTimers.current.clear();
    };
  }, []);

  function handleAccept(jobId: string) {
    startTransition(async () => {
      await acceptJob(jobId);
      setJobs((prev) => prev.filter((job) => job.id !== jobId));
    });
  }

  return (
    <>
      <div
        aria-live="polite"
        className="pointer-events-none fixed right-4 top-4 z-50 flex w-full max-w-sm flex-col gap-2"
      >
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className="pointer-events-auto flex items-start gap-2 rounded-lg border border-siam-blue/30 bg-white px-4 py-3 text-sm font-medium text-gray-900 shadow-lg dark:border-siam-blue/40 dark:bg-gray-900 dark:text-white"
          >
            <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-siam-blue" />
            <span className="flex-1">{toast.message}</span>
            <button
              type="button"
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
              onClick={() => setToasts((prev) => prev.filter((item) => item.id !== toast.id))}
              aria-label={t("dismissNotification")}
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        ))}
      </div>

      <Card className="h-full">
        <CardHeader className="border-b border-border pb-4">
          <CardTitle className="flex items-center gap-2 text-siam-blue">
            <Briefcase className="h-5 w-5" />
            {t("jobFeed")}
          </CardTitle>
          <p className="text-sm text-muted">{t("jobFeedSubtitle")}</p>
        </CardHeader>
        <CardContent className="space-y-4 pt-4">
          {loadError && (
            <p className="text-sm text-amber-600 dark:text-amber-400">{loadError}</p>
          )}
          {jobs.length === 0 ? (
            <p className="text-sm text-gray-500 dark:text-gray-400">{t("noOpenJobs")}</p>
          ) : (
            jobs.map((job) => {
              const isHighlighted = highlightedIds.has(job.id);
              return (
                <article
                  key={job.id}
                  className={cn(
                    "job-feed-enter rounded-lg border border-gray-200 bg-white p-4 transition-colors duration-[3000ms] ease-out dark:border-gray-700 dark:bg-gray-800",
                    isHighlighted && "bg-siam-blue/15 dark:bg-siam-blue/20"
                  )}
                >
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <h4 className="font-semibold text-gray-900 dark:text-white">{job.title}</h4>
                    {job.isSpecialMemberOnly && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800 dark:bg-amber-900/40 dark:text-amber-200">
                        <Sparkles className="h-3 w-3" />
                        {t("specialMemberOnly")}
                      </span>
                    )}
                  </div>
                  {job.category && (
                    <p className="mt-1 text-xs font-medium uppercase tracking-wide text-siam-blue">
                      {job.category}
                    </p>
                  )}
                  <p className="mt-1 line-clamp-2 text-sm text-gray-600 dark:text-gray-400">
                    {job.description}
                  </p>
                  <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                    {job.service && (
                      <span className="flex items-center gap-1 text-xs text-gray-500">
                        <Building2 className="h-3.5 w-3.5" />
                        {job.service.name}
                      </span>
                    )}
                    <span className="text-sm font-semibold text-siam-blue">
                      {formatJobAmount(feedPayout(job), job.currency)}
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
              );
            })
          )}
        </CardContent>
      </Card>
    </>
  );
}
