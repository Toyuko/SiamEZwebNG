import type { ReactNode } from "react";
import { FileText, ExternalLink } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export type CaseDocumentRow = {
  id: string;
  name: string;
  documentType: string | null;
  mimeType?: string | null;
  size?: number | null;
  storageKey?: string;
  createdAt: Date | string;
};

function formatBytes(n?: number | null): string {
  if (n == null || n <= 0) return "—";
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

export function CaseDocumentsPanel({
  documents,
  labels,
  footer,
}: {
  documents: CaseDocumentRow[];
  labels: {
    title: string;
    empty: string;
    type: string;
    size: string;
    uploaded: string;
    open: string;
    reviewHint: string;
  };
  footer?: ReactNode;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{labels.title}</CardTitle>
        <p className="text-xs text-gray-500">{labels.reviewHint}</p>
      </CardHeader>
      <CardContent>
        {documents.length === 0 ? (
          <p className="text-sm text-gray-500">{labels.empty}</p>
        ) : (
          <ul className="divide-y divide-gray-100 dark:divide-gray-800">
            {documents.map((d) => {
              const href =
                d.storageKey &&
                (d.storageKey.startsWith("http://") || d.storageKey.startsWith("https://"))
                  ? d.storageKey
                  : null;
              return (
                <li key={d.id} className="flex items-start gap-3 py-3 first:pt-0 last:pb-0">
                  <FileText className="mt-0.5 h-4 w-4 shrink-0 text-siam-blue" aria-hidden />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-gray-900 dark:text-white">
                      {d.name}
                    </p>
                    <p className="mt-0.5 text-xs text-gray-500">
                      {labels.type}: {d.documentType ?? "—"} · {labels.size}: {formatBytes(d.size)} ·{" "}
                      {labels.uploaded}: {new Date(d.createdAt).toLocaleDateString()}
                      {d.mimeType ? ` · ${d.mimeType}` : ""}
                    </p>
                  </div>
                  {href ? (
                    <a
                      href={href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-xs font-medium text-siam-blue hover:underline"
                    >
                      {labels.open}
                      <ExternalLink className="h-3 w-3" aria-hidden />
                    </a>
                  ) : null}
                </li>
              );
            })}
          </ul>
        )}
        {footer}
      </CardContent>
    </Card>
  );
}
