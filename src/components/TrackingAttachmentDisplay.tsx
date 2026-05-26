"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { FileText, Paperclip, X } from "lucide-react";
import { isTrackingAttachmentImage } from "@/lib/uploads/tracking-attachment";
import { cn } from "@/lib/utils";

type TrackingAttachmentDisplayProps = {
  attachmentUrl: string;
  attachmentName?: string | null;
  className?: string;
};

function ViewFileLink({
  attachmentUrl,
  className,
}: {
  attachmentUrl: string;
  className?: string;
}) {
  return (
    <a
      href={attachmentUrl}
      target="_blank"
      rel="noopener noreferrer"
      className={cn(
        "mt-2 inline-flex items-center gap-1 text-[11px] font-medium text-siam-blue hover:underline",
        className
      )}
    >
      <Paperclip className="h-3 w-3" />
      View File
    </a>
  );
}

export function TrackingAttachmentDisplay({
  attachmentUrl,
  attachmentName,
  className,
}: TrackingAttachmentDisplayProps) {
  const t = useTranslations("clientTracking");
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [imageError, setImageError] = useState(false);
  const isImage = isTrackingAttachmentImage(attachmentUrl, attachmentName);
  const label = attachmentName ?? t("viewAttachment");

  if (isImage && !imageError) {
    return (
      <>
        <button
          type="button"
          onClick={() => setLightboxOpen(true)}
          className={cn(
            "group mt-2 inline-flex flex-col items-start gap-2 text-left",
            className
          )}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={attachmentUrl}
            alt={label}
            className="h-16 w-16 rounded-lg border border-sky-200 object-cover shadow-sm transition group-hover:ring-2 group-hover:ring-siam-blue/40 dark:border-sky-800"
            onError={() => setImageError(true)}
          />
          <span className="inline-flex items-center gap-1 text-[11px] font-medium text-siam-blue hover:underline">
            <Paperclip className="h-3 w-3" />
            {t("viewAttachment")}
          </span>
        </button>

        {lightboxOpen && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
            role="dialog"
            aria-modal="true"
            aria-label={label}
            onClick={() => setLightboxOpen(false)}
          >
            <button
              type="button"
              className="absolute right-4 top-4 rounded-full bg-white/10 p-2 text-white hover:bg-white/20"
              onClick={() => setLightboxOpen(false)}
              aria-label={t("closeLightbox")}
            >
              <X className="h-5 w-5" />
            </button>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={attachmentUrl}
              alt={label}
              className="max-h-[90vh] max-w-full rounded-lg object-contain shadow-2xl"
              onClick={(e) => e.stopPropagation()}
              onError={() => setImageError(true)}
            />
          </div>
        )}
      </>
    );
  }

  if (isImage && imageError) {
    return (
      <ViewFileLink attachmentUrl={attachmentUrl} className={className} />
    );
  }

  return (
    <a
      href={attachmentUrl}
      target="_blank"
      rel="noopener noreferrer"
      className={cn(
        "mt-2 inline-flex items-center gap-2 rounded-lg border border-sky-200 bg-white px-3 py-2 text-[11px] font-medium text-siam-blue shadow-sm transition hover:bg-sky-50 dark:border-sky-800 dark:bg-slate-900 dark:hover:bg-sky-950/40",
        className
      )}
    >
      <FileText className="h-4 w-4 shrink-0" />
      <span className="truncate max-w-[200px]">{label}</span>
      <Paperclip className="h-3 w-3 opacity-60" />
    </a>
  );
}
