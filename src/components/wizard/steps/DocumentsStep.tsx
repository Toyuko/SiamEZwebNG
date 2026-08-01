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
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-foreground">Document upload</h2>
        <p className="mt-1 text-sm text-muted">
          {description ??
            "Upload required documents. Signed-in users store files for the booking; guests can continue with metadata."}
        </p>
      </div>

      {checklist.length > 0 ? (
        <div className="rounded-lg border border-border bg-muted/20 p-4">
          <h3 className="text-sm font-medium text-foreground">Document checklist</h3>
          <ul className="mt-3 space-y-2">
            {checklist.map((req) => {
              const status = checklistStatus(req, documents);
              const selected = selectedRequiredId === req.id;
              return (
                <li key={req.id}>
                  <button
                    type="button"
                    onClick={() =>
                      onSelectRequiredId?.(selected ? null : req.id)
                    }
                    className={`flex w-full items-start gap-3 rounded-md px-2 py-2 text-left text-sm transition-colors ${
                      selected
                        ? "bg-siam-blue/10 ring-1 ring-siam-blue/40"
                        : "hover:bg-muted/60"
                    }`}
                  >
                    {status === "done" ? (
                      <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                    ) : (
                      <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
                    )}
                    <span className="min-w-0 flex-1">
                      <span className="font-medium text-foreground">
                        {req.label}
                        {req.required === false ? (
                          <span className="ml-1 font-normal text-muted">(optional)</span>
                        ) : null}
                      </span>
                      {req.description ? (
                        <span className="mt-0.5 block text-xs text-muted">
                          {req.description}
                        </span>
                      ) : null}
                      {selected ? (
                        <span className="mt-0.5 block text-xs text-siam-blue">
                          Next upload will be tagged as this document
                        </span>
                      ) : null}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      ) : null}

      {!canUpload ? (
        <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-100">
          You are booking as a guest. File names are saved with your request; sign in
          to upload and attach files to the case automatically.
        </p>
      ) : null}

      <label
        className={`flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-border bg-muted/30 px-6 py-10 transition-colors hover:border-siam-blue hover:bg-siam-blue/5 ${
          uploading ? "pointer-events-none opacity-60" : ""
        }`}
      >
        {uploading ? (
          <Loader2 className="h-10 w-10 animate-spin text-muted" />
        ) : (
          <Upload className="h-10 w-10 text-muted" />
        )}
        <span className="text-sm font-medium text-muted">
          {uploading ? "Uploading…" : "Click to upload or drag and drop"}
        </span>
        <span className="text-xs text-muted">PDF, JPG, PNG up to 10MB</span>
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
        <p className="text-sm text-amber-700 dark:text-amber-400" role="status">
          {warning}
        </p>
      ) : null}

      {documents.length > 0 ? (
        <ul className="space-y-2">
          {documents.map((doc, idx) => (
            <li
              key={`${doc.documentId ?? doc.name}-${idx}`}
              className="flex items-center justify-between rounded-lg border border-border bg-card px-4 py-3"
            >
              <div className="flex items-center gap-3">
                <FileText className="h-5 w-5 text-muted" />
                <div>
                  <p className="text-sm font-medium text-foreground">{doc.name}</p>
                  <p className="text-xs text-muted">
                    {doc.size != null ? `${(doc.size / 1024).toFixed(1)} KB` : null}
                    {doc.documentType ? ` · ${doc.documentType}` : null}
                    {doc.uploadStatus === "uploaded" && doc.documentId
                      ? " · uploaded"
                      : null}
                    {doc.uploadStatus === "metadata" ? " · metadata only" : null}
                    {doc.uploadStatus === "pending" ? " · uploading…" : null}
                    {doc.uploadStatus === "error" && doc.error
                      ? ` · ${doc.error}`
                      : null}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => onRemove(idx)}
                disabled={uploading}
                className="rounded p-1 text-muted hover:bg-muted hover:text-destructive"
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
