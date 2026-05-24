"use client";

import { useCallback, useEffect, useState } from "react";
import { useTranslations, useLocale } from "next-intl";
import { Link } from "@/i18n/navigation";
import { ArrowLeft, Loader2, MapPin, User } from "lucide-react";
import {
  ClientTrackingTimeline,
  type ClientTrackingHistoryEntry,
} from "@/components/client/ClientTrackingTimeline";
import { ClientTrackingApprovalBanner } from "@/components/client/ClientTrackingApprovalBanner";
import { ClientDocumentUpload } from "@/components/client/ClientDocumentUpload";
import { ChatBox } from "@/components/jobs/ChatBox";
import { TrackingMap } from "@/components/tracking/TrackingMap";
import type { TrackingStep } from "@/config/job-tracking-steps";
import type { JobStatus, TrackingStatus } from "@prisma/client";
import { isAwaitingReviewStatus } from "@/lib/jobs/auto-approve";
import { canClientShowDocumentUpload } from "@/lib/jobs/client-document-upload";

type TrackingPayload = {
  job: {
    id: string;
    title: string;
    status: JobStatus;
    trackingStatus: TrackingStatus | null;
    completionSubmittedAt: string | null;
    enableAutoApproval: boolean;
    updatedAt: string;
    service: { id: string; slug: string; name: string } | null;
    freelancer: { displayName: string } | null;
  };
  trackingHistory: ClientTrackingHistoryEntry[];
  steps: TrackingStep[] | null;
  isTrackable: boolean;
};

type LoadState = "loading" | "error" | "ready" | "forbidden";

export function ClientJobTrackingView({
  jobId,
  currentUserId,
}: {
  jobId: string;
  currentUserId: string;
}) {
  const t = useTranslations("clientTracking");
  const locale = useLocale();
  const [state, setState] = useState<LoadState>("loading");
  const [data, setData] = useState<TrackingPayload | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const loadTracking = useCallback(async (options?: { silent?: boolean }) => {
    if (!options?.silent) {
      setState("loading");
    }
    setErrorMessage(null);
    try {
      const res = await fetch(`/api/client/jobs/${jobId}/tracking`, {
        credentials: "include",
        cache: "no-store",
      });
      const json = (await res.json()) as {
        success?: boolean;
        data?: TrackingPayload;
        error?: string;
      };

      if (res.status === 403) {
        setState("forbidden");
        return;
      }
      if (!res.ok || !json.success || !json.data) {
        setState("error");
        setErrorMessage(json.error ?? t("loadError"));
        return;
      }

      setData(json.data);
      setState("ready");
    } catch {
      setState("error");
      setErrorMessage(t("loadError"));
    }
  }, [jobId, t]);

  useEffect(() => {
    void loadTracking();
  }, [loadTracking]);

  const showApprovalBanner =
    data != null &&
    isAwaitingReviewStatus(data.job.status) &&
    data.job.trackingStatus === "DELIVERED" &&
    data.job.completionSubmittedAt != null;

  const currentStepLabel =
    data?.steps && data.job.trackingStatus
      ? data.steps.find((s) => s.key === data.job.trackingStatus)
      : null;

  const showDocumentUpload =
    data != null &&
    canClientShowDocumentUpload(
      data.isTrackable,
      data.job.status,
      data.job.trackingStatus
    );

  return (
    <div className="mx-auto max-w-5xl px-1 pb-10">
      <Link
        href="/portal"
        className="mb-6 inline-flex items-center gap-2 text-sm text-siam-blue hover:underline"
      >
        <ArrowLeft className="h-4 w-4" />
        {t("backToPortal")}
      </Link>

      {state === "loading" && (
        <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-sky-100 bg-white py-16 shadow-sm dark:border-slate-700 dark:bg-slate-900">
          <Loader2 className="h-8 w-8 animate-spin text-siam-blue" />
          <p className="text-sm text-slate-600 dark:text-slate-400">{t("loading")}</p>
        </div>
      )}

      {state === "forbidden" && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-6 text-sm text-amber-900 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-100">
          {t("forbidden")}
        </div>
      )}

      {state === "error" && (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-6 text-sm text-red-900 dark:border-red-900 dark:bg-red-950/40">
          <p>{errorMessage}</p>
          <button
            type="button"
            onClick={() => void loadTracking()}
            className="mt-3 text-sm font-medium text-siam-blue underline"
          >
            {t("retry")}
          </button>
        </div>
      )}

      {state === "ready" && data && (
        <div className="space-y-6">
          {showApprovalBanner && (
            <ClientTrackingApprovalBanner
              jobId={data.job.id}
              completionSubmittedAt={data.job.completionSubmittedAt!}
              onApproved={() => void loadTracking()}
            />
          )}

          <header className="rounded-2xl bg-white/95 p-6 shadow-sm ring-1 ring-sky-100 dark:bg-slate-900/90 dark:ring-sky-900">
            <div className="flex items-start gap-2 text-siam-blue">
              <MapPin className="mt-0.5 h-5 w-5 shrink-0" />
              <h1 className="text-xl font-semibold">{t("pageTitle")}</h1>
            </div>

            <dl className="mt-5 grid gap-4 sm:grid-cols-2">
              <div>
                <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">
                  {t("serviceName")}
                </dt>
                <dd className="mt-1 text-sm font-semibold text-sky-900 dark:text-sky-100">
                  {data.job.service?.name ?? data.job.title}
                </dd>
              </div>
              <div>
                <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">
                  {t("assignedFreelancer")}
                </dt>
                <dd className="mt-1 flex items-center gap-1.5 text-sm font-medium text-gray-800 dark:text-gray-200">
                  <User className="h-4 w-4 text-slate-400" />
                  {data.job.freelancer?.displayName ?? t("freelancerPending")}
                </dd>
              </div>
              <div className="sm:col-span-2">
                <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">
                  {t("currentStatus")}
                </dt>
                <dd className="mt-1">
                  <span className="inline-flex rounded-full bg-siam-blue/10 px-3 py-1 text-sm font-medium text-siam-blue">
                    {currentStepLabel
                      ? locale === "th"
                        ? currentStepLabel.th
                        : currentStepLabel.en
                      : t(`jobStatus.${data.job.status}`)}
                  </span>
                </dd>
              </div>
            </dl>

            {showDocumentUpload && (
              <ClientDocumentUpload
                jobId={data.job.id}
                trackingHistory={data.trackingHistory}
                embedded
                highlight={data.job.trackingStatus === "DOCUMENTS_PENDING"}
                onUploaded={() => void loadTracking({ silent: true })}
              />
            )}
          </header>

          <div className="flex flex-col gap-6 lg:grid lg:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)] lg:items-start">
            {data.isTrackable && (
              <TrackingMap jobId={data.job.id} locale={locale} />
            )}

            <section className="rounded-2xl bg-white/95 p-6 shadow-sm ring-1 ring-sky-100 dark:bg-slate-900/90 dark:ring-sky-900 lg:min-h-[min(420px,55vh)]">
              <h2 className="mb-4 text-sm font-semibold text-sky-900 dark:text-sky-100">
                {t("timelineTitle")}
              </h2>

              {data.isTrackable && data.steps ? (
                <ClientTrackingTimeline
                  steps={data.steps}
                  currentStatus={data.job.trackingStatus}
                  trackingHistory={data.trackingHistory}
                  locale={locale}
                  emptyMessage={t("noHistoryYet")}
                />
              ) : (
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  {t("notTrackable")}
                </p>
              )}
            </section>
          </div>

          <ChatBox
            jobId={data.job.id}
            currentUserId={currentUserId}
            otherPartyName={data.job.freelancer?.displayName ?? t("freelancerPending")}
            disabled={!data.job.freelancer}
          />

          {data.job.status === "approved" && (
            <p className="rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-200">
              {t("jobApproved")}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
