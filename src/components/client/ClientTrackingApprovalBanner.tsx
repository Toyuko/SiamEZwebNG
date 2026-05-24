"use client";

import { useEffect, useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { Clock, ShieldCheck } from "lucide-react";
import { confirmJobAndReleaseFunds } from "@/actions/client-jobs";
import { JOB_AUTO_APPROVE_MS } from "@/lib/jobs/constants";
import { getAutoApprovalRemainingMs } from "@/lib/jobs/auto-approve";
import { Button } from "@/components/ui/button";

type ClientTrackingApprovalBannerProps = {
  jobId: string;
  completionSubmittedAt: string;
  onApproved?: () => void;
};

export function ClientTrackingApprovalBanner({
  jobId,
  completionSubmittedAt,
  onApproved,
}: ClientTrackingApprovalBannerProps) {
  const t = useTranslations("clientTracking");
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const submitted = new Date(completionSubmittedAt);
  const [remainingMs, setRemainingMs] = useState(() =>
    getAutoApprovalRemainingMs(submitted)
  );

  useEffect(() => {
    const tick = () => setRemainingMs(getAutoApprovalRemainingMs(submitted));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [submitted]);

  const remainingMinutes = Math.max(1, Math.ceil(remainingMs / 60_000));

  function handleConfirm() {
    setError(null);
    startTransition(async () => {
      const result = await confirmJobAndReleaseFunds(jobId);
      if (result && "error" in result) {
        setError(result.error ?? t("approveFailed"));
        return;
      }
      onApproved?.();
    });
  }

  return (
    <section className="rounded-2xl border-2 border-siam-blue/30 bg-gradient-to-br from-siam-blue/10 via-white to-siam-blue/5 p-5 shadow-sm dark:from-siam-blue/20 dark:via-slate-900 dark:to-slate-900">
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-siam-blue text-white">
          <ShieldCheck className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <h2 className="text-base font-semibold text-siam-blue sm:text-lg">
            {t("approvalBannerTitle")}
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-gray-700 dark:text-gray-300">
            {remainingMs > 0
              ? t("approvalBannerBody", { minutes: remainingMinutes })
              : t("approvalBannerImminent")}
          </p>
          {remainingMs > 0 && (
            <p className="mt-2 flex items-center gap-1.5 text-xs text-gray-500">
              <Clock className="h-3.5 w-3.5" />
              {t("autoApprovalCountdown", { minutes: remainingMinutes })}
            </p>
          )}
          <Button
            type="button"
            variant="primary"
            size="lg"
            className="mt-4 w-full gap-2 sm:w-auto"
            disabled={pending}
            onClick={handleConfirm}
          >
            <ShieldCheck className="h-5 w-5" />
            {pending ? t("confirming") : t("confirmReleaseFunds")}
          </Button>
          {error && (
            <p className="mt-2 text-sm text-amber-700 dark:text-amber-400">{error}</p>
          )}
        </div>
      </div>
      <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-siam-blue/15">
        <div
          className="h-full rounded-full bg-siam-blue transition-all duration-1000"
          style={{
            width: `${Math.min(100, Math.round(((JOB_AUTO_APPROVE_MS - remainingMs) / JOB_AUTO_APPROVE_MS) * 100))}%`,
          }}
        />
      </div>
    </section>
  );
}
