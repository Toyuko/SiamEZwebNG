"use client";

import { FileText, Upload, X } from "lucide-react";

export interface WizardDocumentMeta {
  name: string;
  size?: number;
  mimeType?: string;
  documentType?: string;
}

interface DocumentsStepProps {
  documents: WizardDocumentMeta[];
  description?: string;
  onFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onRemove: (idx: number) => void;
}

export function DocumentsStep({
  documents,
  description,
  onFileChange,
  onRemove,
}: DocumentsStepProps) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-foreground">Document upload</h2>
        <p className="mt-1 text-sm text-muted">
          {description ??
            "Upload required documents. Metadata is saved now; file storage will be added later."}
        </p>
      </div>

      <label className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-border bg-muted/30 px-6 py-10 transition-colors hover:border-siam-blue hover:bg-siam-blue/5">
        <Upload className="h-10 w-10 text-muted" />
        <span className="text-sm font-medium text-muted">
          Click to upload or drag and drop
        </span>
        <span className="text-xs text-muted">PDF, JPG, PNG up to 10MB</span>
        <input
          type="file"
          multiple
          accept=".pdf,.jpg,.jpeg,.png"
          onChange={onFileChange}
          className="hidden"
        />
      </label>

      {documents.length > 0 ? (
        <ul className="space-y-2">
          {documents.map((doc, idx) => (
            <li
              key={`${doc.name}-${idx}`}
              className="flex items-center justify-between rounded-lg border border-border bg-card px-4 py-3"
            >
              <div className="flex items-center gap-3">
                <FileText className="h-5 w-5 text-muted" />
                <div>
                  <p className="text-sm font-medium text-foreground">{doc.name}</p>
                  {doc.size != null ? (
                    <p className="text-xs text-muted">{(doc.size / 1024).toFixed(1)} KB</p>
                  ) : null}
                </div>
              </div>
              <button
                type="button"
                onClick={() => onRemove(idx)}
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
