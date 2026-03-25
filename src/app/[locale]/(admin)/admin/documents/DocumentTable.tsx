"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { Link } from "@/i18n/navigation";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { deleteDocument } from "@/actions/admin";

type DocWithCase = {
  id: string;
  name: string;
  documentType: string | null;
  mimeType: string | null;
  size: number | null;
  createdAt: Date;
  case: { id: string; caseNumber: string; user?: { name: string | null } } | null;
};

export function DocumentTable({
  documents,
  total,
  page,
  totalPages,
}: {
  documents: DocWithCase[];
  total: number;
  page: number;
  totalPages: number;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const handleDelete = (id: string, name: string) => {
    if (!confirm(`Delete document "${name}"?`)) return;
    startTransition(async () => {
      await deleteDocument(id);
      router.refresh();
    });
  };

  if (documents.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <p className="text-gray-500">No documents found.</p>
      </div>
    );
  }

  return (
    <div>
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-gray-200 bg-gray-50 dark:border-gray-800 dark:bg-gray-900/50">
              <th className="px-4 py-3 font-medium">Name</th>
              <th className="px-4 py-3 font-medium">Type</th>
              <th className="px-4 py-3 font-medium">Case</th>
              <th className="px-4 py-3 font-medium">Uploaded</th>
              <th className="px-4 py-3 font-medium w-20">Actions</th>
            </tr>
          </thead>
          <tbody>
            {documents.map((d) => (
              <tr
                key={d.id}
                className="border-b border-gray-100 transition-colors hover:bg-gray-50 dark:border-gray-800 dark:hover:bg-gray-900/50"
              >
                <td className="px-4 py-3 font-medium">{d.name}</td>
                <td className="px-4 py-3 text-gray-500">{d.documentType ?? "—"}</td>
                <td className="px-4 py-3">
                  {d.case ? (
                    <Link href={`/admin/cases/${d.case.id}`} className="text-siam-blue hover:underline">
                      {d.case.caseNumber}
                    </Link>
                  ) : (
                    <span className="text-gray-500">—</span>
                  )}
                </td>
                <td className="px-4 py-3 text-gray-500">
                  {new Date(d.createdAt).toLocaleDateString()}
                </td>
                <td className="px-4 py-3">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleDelete(d.id, d.name)}
                    disabled={pending}
                  >
                    <Trash2 className="h-4 w-4 text-red-600" />
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {totalPages > 1 && (
        <div className="flex items-center justify-between border-t px-4 py-3">
          <p className="text-sm text-gray-500">
            Showing {(page - 1) * 20 + 1}–{Math.min(page * 20, total)} of {total}
          </p>
        </div>
      )}
    </div>
  );
}
