"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { JOB_AUTO_APPROVE_MS } from "@/lib/jobs/constants";
import { getAutoApprovalRemainingMs } from "@/lib/jobs/auto-approve";
import { Clock } from "lucide-react";

function formatRemaining(ms: number): string {
  const totalSeconds = Math.ceil(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

export function AutoApprovalCountdown({
  completionSubmittedAt,
}: {
  completionSubmittedAt: string;
}) {
  const t = useTranslations("freelancer");
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

  if (remainingMs <= 0) {
    return (
      <div className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-200">
        <Clock className="h-4 w-4" />
        {t("autoApprovalImminent")}
      </div>
    );
  }

  const progress = Math.min(
    100,
    Math.round(((JOB_AUTO_APPROVE_MS - remainingMs) / JOB_AUTO_APPROVE_MS) * 100)
  );

  return (
    <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-4 dark:border-amber-800 dark:bg-amber-950/30">
      <div className="flex items-center justify-between gap-2">
        <span className="flex items-center gap-2 text-sm font-medium text-amber-900 dark:text-amber-100">
          <Clock className="h-4 w-4" />
          {t("autoApprovalCountdown")}
        </span>
        <span className="font-mono text-lg font-bold text-siam-blue tabular-nums">
          {formatRemaining(remainingMs)}
        </span>
      </div>
      <p className="mt-2 text-xs text-amber-800/80 dark:text-amber-200/80">
        {t("autoApprovalHint")}
      </p>
      <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-amber-200 dark:bg-amber-900">
        <div
          className="h-full rounded-full bg-siam-blue transition-all duration-1000"
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  );
}
