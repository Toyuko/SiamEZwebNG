"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { reassignDocument } from "@/actions/admin";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";

export function AttachUnassignedDocument({
  caseId,
  unassigned,
}: {
  caseId: string;
  unassigned: { id: string; name: string; createdAt: Date }[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const handleAttach = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    const form = e.currentTarget;
    const documentId = (form.elements.namedItem("documentId") as HTMLSelectElement)?.value?.trim();
    if (!documentId) return;
    startTransition(async () => {
      try {
        await reassignDocument(documentId, caseId);
        form.reset();
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to attach document");
      }
    });
  };

  if (unassigned.length === 0) return null;

  return (
    <form onSubmit={handleAttach} className="mt-4 flex flex-col gap-3 border-t border-gray-200 pt-4 dark:border-gray-800 sm:flex-row sm:flex-wrap sm:items-end">
      <div className="min-w-[12rem] flex-1 space-y-2">
        <Label htmlFor="attach-doc">Attach unassigned document</Label>
        <Select id="attach-doc" name="documentId" required defaultValue="">
          <option value="" disabled>
            Select a document…
          </option>
          {unassigned.map((d) => (
            <option key={d.id} value={d.id}>
              {d.name}
            </option>
          ))}
        </Select>
      </div>
      <Button type="submit" variant="outline" disabled={pending}>
        {pending ? "Attaching…" : "Attach to this case"}
      </Button>
      {error ? (
        <p className="w-full text-sm text-red-600 dark:text-red-400" role="alert">
          {error}
        </p>
      ) : null}
    </form>
  );
}
