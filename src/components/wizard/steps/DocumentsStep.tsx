"use client";

import { AlertCircle, CheckCircle2, FileText, Loader2, Upload, X } from "lucide-react";
import type { WizardRequiredDocument } from "@/config/wizards/types";

export interface WizardDocumentMeta {
  name: string;
  size?: number;
  mimeType?: string;
  documentType?: string;
  /** Persisted Document.id when upload succeeded. */
  documentId?: string;
  /** Checklist item id from wizard requiredDocuments. */
  requiredId?: string;
  uploadStatus?: "pending" | "uploaded" | "metadata" | "error";
  error?: string;
}

interface DocumentsStepProps {
  documents: WizardDocumentMeta[];
  description?: string;
  title?: string;
  requiredDocuments?: WizardRequiredDocument[];
  /** Authenticated users get real Blob/mock storage uploads. */
  canUpload?: boolean;
  uploading?: boolean;
  warning?: string | null;
  selectedRequiredId?: string | null;
  onSelectRequiredId?: (id: string | null) => void;
  onFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onRemove: (idx: number) => void;
}

function checklistStatus(
  req: WizardRequiredDocument,
  documents: WizardDocumentMeta[]
): "done" | "missing" {
  const target = (req.documentType ?? req.id).toLowerCase();
  const found = documents.some((d) => {
    const type = (d.documentType ?? "").toLowerCase();
    const reqId = (d.requiredId ?? "").toLowerCase();
    return type === target || reqId === req.id.toLowerCase() || type === req.id.toLowerCase();
  });
  return found ? "done" : "missing";
}

export function DocumentsStep({
  documents,
  description,
  title = "Payment receipt",
  requiredDocuments,
  canUpload = false,
  uploading = false,
  warning = null,
  selectedRequiredId = null,
  onSelectRequiredId,
  onFileChange,
  onRemove,
}: DocumentsStepProps) {
  const checklist = requiredDocuments ?? [];

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-bold tracking-tight text-siam-ink sm:text-2xl">{title}</h2>
        <p className="mt-1.5 text-sm leading-relaxed text-[#64748B]">
          {description ??
            "Upload required documents. Signed-in users store files for the booking; guests can continue with metadata."}
        </p>
      </div>

      {checklist.length > 0 ? (
        <ul className="space-y-2">
          {checklist.map((req) => {
            const status = checklistStatus(req, documents);
            const selected = selectedRequiredId === req.id;
            return (
              <li key={req.id}>
                <button
                  type="button"
                  onClick={() => onSelectRequiredId?.(selected ? null : req.id)}
                  className={`flex w-full items-start gap-3 rounded-2xl border px-4 py-3.5 text-left text-sm transition-colors ${
                    selected
                      ? "border-siam-blue bg-siam-blue/5 ring-1 ring-siam-blue/30"
                      : "border-[#DCE6F5] bg-white hover:border-siam-blue/40"
                  }`}
                >
                  {status === "done" ? (
                    <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-[#16A34A]" />
                  ) : (
                    <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-amber-500" />
                  )}
                  <span className="min-w-0 flex-1">
                    <span className="font-semibold text-siam-ink">
                      {req.label}
                      {req.required === false ? (
                        <span className="ml-1 font-normal text-[#64748B]">(optional)</span>
                      ) : null}
                    </span>
                    {req.description ? (
                      <span className="mt-0.5 block text-xs text-[#64748B]">
                        {req.description}
                      </span>
                    ) : null}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      ) : null}

      {!canUpload ? (
        <p className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2.5 text-xs text-amber-900">
          Booking as a guest — file names are saved with your request. Sign in to attach files to
          your case automatically.
        </p>
      ) : null}

      <label
        className={`flex cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-[#DCE6F5] bg-siam-surface/40 px-6 py-10 transition-colors hover:border-siam-blue hover:bg-siam-blue/5 ${
          uploading ? "pointer-events-none opacity-60" : ""
        }`}
      >
        {uploading ? (
          <Loader2 className="h-9 w-9 animate-spin text-[#64748B]" />
        ) : (
          <Upload className="h-9 w-9 text-siam-blue" />
        )}
        <span className="text-sm font-semibold text-siam-ink">
          {uploading ? "Uploading…" : "Tap to upload receipt"}
        </span>
        <span className="text-xs text-[#64748B]">PDF, JPG, PNG · up to 10MB</span>
        <input
          type="file"
          multiple
          accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png"
          onChange={onFileChange}
          disabled={uploading}
          className="hidden"
        />
      </label>

      {warning ? (
        <p className="text-sm text-amber-700" role="status">
          {warning}
        </p>
      ) : null}

      {documents.length > 0 ? (
        <ul className="space-y-2">
          {documents.map((doc, idx) => (
            <li
              key={`${doc.documentId ?? doc.name}-${idx}`}
              className="flex items-center justify-between rounded-2xl border border-[#DCE6F5] bg-white px-4 py-3"
            >
              <div className="flex min-w-0 items-center gap-3">
                <FileText className="h-5 w-5 shrink-0 text-siam-blue" />
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-siam-ink">{doc.name}</p>
                  <p className="text-xs text-[#64748B]">
                    {doc.size != null ? `${(doc.size / 1024).toFixed(1)} KB` : null}
                    {doc.uploadStatus === "uploaded" && doc.documentId ? " · uploaded" : null}
                    {doc.uploadStatus === "metadata" ? " · metadata only" : null}
                    {doc.uploadStatus === "pending" ? " · uploading…" : null}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => onRemove(idx)}
                disabled={uploading}
                className="rounded-lg p-2 text-[#64748B] hover:bg-siam-surface hover:text-destructive"
                aria-label="Remove file"
              >
                <X className="h-4 w-4" />
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
