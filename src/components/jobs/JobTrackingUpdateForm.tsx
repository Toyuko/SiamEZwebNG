"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import type { TrackingStatus } from "@prisma/client";
import { updateJobTrackingProgress } from "@/actions/freelancer-jobs";
import type { TrackingStep } from "@/config/job-tracking-steps";
import { Button } from "@/components/ui/button";
import { ChevronRight } from "lucide-react";

type JobTrackingUpdateFormProps = {
  jobId: string;
  steps: TrackingStep[];
  currentStatus: TrackingStatus | null;
  currentNotes?: string | null;
  disabled?: boolean;
};

/**
 * Freelancer-only progress updater — mirrors Drivers-License-System admin
 * status form pattern (select + notes + save).
 */
export function JobTrackingUpdateForm({
  jobId,
  steps,
  currentStatus,
  currentNotes,
  disabled = false,
}: JobTrackingUpdateFormProps) {
  const t = useTranslations("freelancer");
  const [pending, startTransition] = useTransition();
  const [status, setStatus] = useState<TrackingStatus>(
    currentStatus ?? steps[0]?.key ?? "DOCUMENTS_PENDING"
  );
  const [notes, setNotes] = useState(currentNotes ?? "");
  const [message, setMessage] = useState<string | null>(null);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setMessage(null);
    startTransition(async () => {
      const result = await updateJobTrackingProgress(jobId, status, notes);
      if (result && "error" in result) {
        setMessage(result.error ?? t("trackingUpdateFailed"));
        return;
      }
      setMessage(t("trackingUpdateSaved"));
    });
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-xl border border-sky-100 bg-sky-50/50 p-4 dark:border-sky-900 dark:bg-sky-950/30"
    >
      <h3 className="text-sm font-semibold text-sky-900 dark:text-sky-100">
        {t("updateProgress")}
      </h3>
      <p className="mt-1 text-xs text-slate-600 dark:text-slate-400">
        {t("updateProgressHint")}
      </p>

      <div className="mt-3 space-y-3">
        <div>
          <label
            htmlFor={`tracking-status-${jobId}`}
            className="mb-1 block text-xs font-medium text-sky-800 dark:text-sky-200"
          >
            {t("trackingStatusLabel")}
          </label>
          <select
            id={`tracking-status-${jobId}`}
            value={status}
            onChange={(e) => setStatus(e.target.value as TrackingStatus)}
            disabled={disabled || pending}
            className="w-full rounded-lg border border-sky-100 bg-white px-3 py-2 text-sm text-sky-900 outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-200 disabled:opacity-60 dark:border-sky-800 dark:bg-slate-900 dark:text-sky-100"
          >
            {steps.map((step) => (
              <option key={step.key} value={step.key}>
                {step.en} / {step.th}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label
            htmlFor={`tracking-notes-${jobId}`}
            className="mb-1 block text-xs font-medium text-sky-800 dark:text-sky-200"
          >
            {t("trackingNotesLabel")}
          </label>
          <textarea
            id={`tracking-notes-${jobId}`}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
            disabled={disabled || pending}
            placeholder={t("trackingNotesPlaceholder")}
            className="w-full resize-none rounded-lg border border-sky-100 bg-white px-3 py-2 text-sm text-sky-900 outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-200 disabled:opacity-60 dark:border-sky-800 dark:bg-slate-900 dark:text-sky-100"
          />
        </div>

        <Button
          type="submit"
          variant="primary"
          size="sm"
          disabled={disabled || pending}
          className="gap-2 bg-sky-700 hover:bg-sky-800"
        >
          <ChevronRight className="h-4 w-4" />
          {pending ? t("trackingSaving") : t("updateProgress")}
        </Button>

        {message && (
          <p
            className={[
              "text-xs",
              message === t("trackingUpdateSaved")
                ? "text-emerald-600 dark:text-emerald-400"
                : "text-amber-700 dark:text-amber-400",
            ].join(" ")}
          >
            {message}
          </p>
        )}
      </div>
    </form>
  );
}
