"use client";

import { useCallback, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { Loader2, Paperclip, Upload, X } from "lucide-react";
import {
  TRACKING_ATTACHMENT_MAX_BYTES,
  validateTrackingAttachment,
} from "@/lib/uploads/tracking-attachment";
import { TrackingAttachmentDisplay } from "@/components/TrackingAttachmentDisplay";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { ClientTrackingHistoryEntry } from "@/components/client/ClientTrackingTimeline";

type ClientDocumentUploadProps = {
  jobId: string;
  trackingHistory: ClientTrackingHistoryEntry[];
  disabled?: boolean;
  onUploaded?: () => void;
};

export function ClientDocumentUpload({
  jobId,
  trackingHistory,
  disabled = false,
  onUploaded,
}: ClientDocumentUploadProps) {
  const t = useTranslations("clientTracking");
  const [uploading, setUploading] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [note, setNote] = useState("");
  const [dragOver, setDragOver] = useState(false);
  const [message, setMessage] = useState<{ type: "ok" | "err"; text: string } | null>(
    null
  );
  const inputRef = useRef<HTMLInputElement>(null);

  const uploadedDocuments = trackingHistory
    .filter((entry) => entry.attachmentUrl)
    .slice()
    .reverse();

  const pickFile = useCallback(
    (next: File | null) => {
      if (!next) {
        setFile(null);
        return;
      }
      const err = validateTrackingAttachment(next);
      if (err) {
        setMessage({ type: "err", text: err });
        return;
      }
      setMessage(null);
      setFile(next);
    },
    []
  );

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      const dropped = e.dataTransfer.files[0];
      if (dropped) pickFile(dropped);
    },
    [pickFile]
  );

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!file || disabled || uploading) return;

    setMessage(null);
    setUploading(true);

    try {
      const formData = new FormData();
      formData.append("file", file);
      if (note.trim()) {
        formData.append("note", note.trim());
      }

      const res = await fetch(`/api/client/jobs/${jobId}/documents`, {
        method: "POST",
        body: formData,
        credentials: "include",
      });
      const json = (await res.json()) as {
        success?: boolean;
        error?: string;
      };

      if (!res.ok || !json.success) {
        setMessage({
          type: "err",
          text: json.error ?? t("documentUploadFailed"),
        });
        return;
      }

      setFile(null);
      setNote("");
      setMessage({ type: "ok", text: t("documentUploadSuccess") });
      onUploaded?.();
    } catch {
      setMessage({ type: "err", text: t("documentUploadFailed") });
    } finally {
      setUploading(false);
    }
  }

  return (
    <section className="rounded-2xl bg-white/95 p-6 shadow-sm ring-1 ring-sky-100 dark:bg-slate-900/90 dark:ring-sky-900">
      <h2 className="text-sm font-semibold text-sky-900 dark:text-sky-100">
        {t("documentsTitle")}
      </h2>
      <p className="mt-1 text-xs text-slate-600 dark:text-slate-400">
        {t("documentsHint")}
      </p>

      <form onSubmit={handleSubmit} className="mt-4 space-y-3">
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={onDrop}
          className={cn(
            "relative flex flex-col items-center justify-center rounded-xl border-2 border-dashed px-4 py-6 text-center transition",
            dragOver
              ? "border-siam-blue bg-siam-blue/5"
              : "border-sky-200 bg-sky-50/40 dark:border-sky-800 dark:bg-sky-950/20",
            disabled && "pointer-events-none opacity-60"
          )}
        >
          <input
            ref={inputRef}
            type="file"
            accept=".jpg,.jpeg,.png,.pdf,image/jpeg,image/png,application/pdf"
            className="sr-only"
            disabled={disabled || uploading}
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
                disabled={uploading}
                className="rounded p-1 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
                aria-label={t("removeDocument")}
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <>
              <Upload className="mb-2 h-8 w-8 text-siam-blue/70" />
              <p className="text-xs text-slate-600 dark:text-slate-400">
                {t("documentDropHint")}
              </p>
              <p className="mt-1 text-[10px] text-slate-500">
                {t("documentTypes", {
                  maxMb: Math.round(TRACKING_ATTACHMENT_MAX_BYTES / 1024 / 1024),
                })}
              </p>
              <button
                type="button"
                disabled={disabled || uploading}
                onClick={() => inputRef.current?.click()}
                className="mt-3 text-xs font-medium text-siam-blue hover:underline"
              >
                {t("documentBrowse")}
              </button>
            </>
          )}
        </div>

        <div>
          <label
            htmlFor={`document-note-${jobId}`}
            className="mb-1 block text-xs font-medium text-sky-800 dark:text-sky-200"
          >
            {t("documentNoteLabel")}
          </label>
          <textarea
            id={`document-note-${jobId}`}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={2}
            disabled={disabled || uploading}
            placeholder={t("documentNotePlaceholder")}
            className="w-full resize-none rounded-lg border border-sky-100 bg-white px-3 py-2 text-sm text-sky-900 outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-200 disabled:opacity-60 dark:border-sky-800 dark:bg-slate-900 dark:text-sky-100"
          />
        </div>

        <Button
          type="submit"
          variant="primary"
          size="sm"
          disabled={disabled || uploading || !file}
          className="gap-2 bg-sky-700 hover:bg-sky-800"
        >
          {uploading && <Loader2 className="h-4 w-4 animate-spin" />}
          {uploading ? t("documentUploading") : t("documentUploadButton")}
        </Button>

        {message && (
          <p
            className={cn(
              "text-xs",
              message.type === "ok"
                ? "text-emerald-600 dark:text-emerald-400"
                : "text-amber-700 dark:text-amber-400"
            )}
          >
            {message.text}
          </p>
        )}
      </form>

      {uploadedDocuments.length > 0 && (
        <div className="mt-6 border-t border-sky-100 pt-4 dark:border-sky-900">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            {t("uploadedDocumentsTitle")}
          </h3>
          <ul className="mt-3 space-y-3">
            {uploadedDocuments.map((entry) => (
              <li
                key={entry.id}
                className="rounded-lg border border-sky-100 bg-sky-50/50 px-3 py-2 dark:border-sky-900 dark:bg-sky-950/30"
              >
                {entry.note && (
                  <p className="mb-1 text-[11px] text-sky-900 dark:text-sky-100">
                    {entry.note}
                  </p>
                )}
                {entry.attachmentUrl && (
                  <TrackingAttachmentDisplay
                    attachmentUrl={entry.attachmentUrl}
                    attachmentName={entry.attachmentName}
                    className="mt-0"
                  />
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
