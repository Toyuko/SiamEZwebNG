"use client";

import { useCallback, useRef, useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import type { TrackingStatus } from "@prisma/client";
import { updateJobTrackingProgress } from "@/actions/freelancer-jobs";
import type { TrackingStep } from "@/config/job-tracking-steps";
import {
  TRACKING_ATTACHMENT_MAX_BYTES,
  validateTrackingAttachment,
} from "@/lib/uploads/tracking-attachment";
import { Button } from "@/components/ui/button";
import { ChevronRight, Loader2, Paperclip, Upload, X } from "lucide-react";
import { cn } from "@/lib/utils";

type TrackingUpdaterProps = {
  jobId: string;
  steps: TrackingStep[];
  currentStatus: TrackingStatus | null;
  currentNotes?: string | null;
  disabled?: boolean;
};

export function TrackingUpdater({
  jobId,
  steps,
  currentStatus,
  currentNotes,
  disabled = false,
}: TrackingUpdaterProps) {
  const t = useTranslations("freelancer");
  const [pending, startTransition] = useTransition();
  const [uploading, setUploading] = useState(false);
  const [status, setStatus] = useState<TrackingStatus>(
    currentStatus ?? steps[0]?.key ?? "DOCUMENTS_PENDING"
  );
  const [notes, setNotes] = useState(currentNotes ?? "");
  const [file, setFile] = useState<File | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const busy = pending || uploading;

  const pickFile = useCallback((next: File | null) => {
    if (!next) {
      setFile(null);
      return;
    }
    const err = validateTrackingAttachment(next);
    if (err) {
      setMessage(err);
      return;
    }
    setMessage(null);
    setFile(next);
  }, []);

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      const dropped = e.dataTransfer.files[0];
      if (dropped) pickFile(dropped);
    },
    [pickFile]
  );

  async function uploadAttachment(selected: File): Promise<{ url: string; name: string }> {
    const formData = new FormData();
    formData.append("file", selected);
    formData.append("jobId", jobId);
    formData.append("purpose", "tracking");

    const res = await fetch("/api/upload", {
      method: "POST",
      body: formData,
      credentials: "include",
    });
    const json = (await res.json()) as {
      url?: string;
      name?: string;
      key?: string;
      error?: string;
    };
    if (!res.ok || !json.url) {
      throw new Error(json.error ?? t("attachmentUploadFailed"));
    }
    return { url: json.url, name: json.name ?? selected.name };
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setMessage(null);
    startTransition(async () => {
      try {
        let attachment: { url: string; name: string } | null = null;
        if (file) {
          setUploading(true);
          attachment = await uploadAttachment(file);
          setUploading(false);
        }

        const result = await updateJobTrackingProgress(
          jobId,
          status,
          notes,
          attachment
        );
        if (result && "error" in result) {
          setMessage(result.error ?? t("trackingUpdateFailed"));
          return;
        }
        setFile(null);
        setMessage(t("trackingUpdateSaved"));
      } catch (err) {
        setUploading(false);
        setMessage(err instanceof Error ? err.message : t("attachmentUploadFailed"));
      }
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
            disabled={disabled || busy}
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
            disabled={disabled || busy}
            placeholder={t("trackingNotesPlaceholder")}
            className="w-full resize-none rounded-lg border border-sky-100 bg-white px-3 py-2 text-sm text-sky-900 outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-200 disabled:opacity-60 dark:border-sky-800 dark:bg-slate-900 dark:text-sky-100"
          />
        </div>

        <div>
          <span className="mb-1 block text-xs font-medium text-sky-800 dark:text-sky-200">
            {t("trackingAttachmentLabel")}
          </span>
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setDragOver(true);
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={onDrop}
            className={cn(
              "relative flex flex-col items-center justify-center rounded-lg border-2 border-dashed px-4 py-6 text-center transition",
              dragOver
                ? "border-siam-blue bg-siam-blue/5"
                : "border-sky-200 bg-white dark:border-sky-800 dark:bg-slate-900",
              disabled && "pointer-events-none opacity-60"
            )}
          >
            <input
              ref={inputRef}
              type="file"
              accept=".jpg,.jpeg,.png,.pdf,image/jpeg,image/png,application/pdf"
              className="sr-only"
              disabled={disabled || busy}
              onChange={(e) => pickFile(e.target.files?.[0] ?? null)}
            />
            {file ? (
              <div className="flex w-full items-center justify-between gap-2">
                <div className="flex min-w-0 items-center gap-2 text-sm text-sky-900 dark:text-sky-100">
                  <Paperclip className="h-4 w-4 shrink-0 text-siam-blue" />
                  <span className="truncate">{file.name}</span>
                  <span className="shrink-0 text-xs text-slate-500">
                    ({(file.size / 1024).toFixed(0)} KB)
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => pickFile(null)}
                  disabled={busy}
                  className="rounded p-1 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
                  aria-label={t("removeAttachment")}
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <>
                <Upload className="mb-2 h-8 w-8 text-siam-blue/70" />
                <p className="text-xs text-slate-600 dark:text-slate-400">
                  {t("trackingAttachmentDropHint")}
                </p>
                <p className="mt-1 text-[10px] text-slate-500">
                  {t("trackingAttachmentTypes", {
                    maxMb: Math.round(TRACKING_ATTACHMENT_MAX_BYTES / 1024 / 1024),
                  })}
                </p>
                <button
                  type="button"
                  disabled={disabled || busy}
                  onClick={() => inputRef.current?.click()}
                  className="mt-3 text-xs font-medium text-siam-blue hover:underline"
                >
                  {t("trackingAttachmentBrowse")}
                </button>
              </>
            )}
          </div>
        </div>

        <Button
          type="submit"
          variant="primary"
          size="sm"
          disabled={disabled || busy}
          className="gap-2 bg-sky-700 hover:bg-sky-800"
        >
          {busy ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <ChevronRight className="h-4 w-4" />
          )}
          {uploading
            ? t("trackingUploading")
            : pending
              ? t("trackingSaving")
              : t("updateProgress")}
        </Button>

        {message && (
          <p
            className={cn(
              "text-xs",
              message === t("trackingUpdateSaved")
                ? "text-emerald-600 dark:text-emerald-400"
                : "text-amber-700 dark:text-amber-400"
            )}
          >
            {message}
          </p>
        )}
      </div>
    </form>
  );
}
