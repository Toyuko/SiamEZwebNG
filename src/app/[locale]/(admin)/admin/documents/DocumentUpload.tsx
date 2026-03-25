"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Upload } from "lucide-react";
import { adminUploadDocumentAction } from "@/actions/document";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";

export function DocumentUpload({
  cases,
  defaultCaseId,
}: {
  cases: { id: string; caseNumber: string }[];
  defaultCaseId?: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    const form = e.currentTarget;
    const fd = new FormData(form);
    startTransition(async () => {
      const result = await adminUploadDocumentAction(fd);
      if (!result.success) {
        setError(result.error ?? "Upload failed");
        return;
      }
      form.reset();
      const select = form.elements.namedItem("caseId") as HTMLSelectElement | null;
      if (select) {
        if (defaultCaseId && cases.some((c) => c.id === defaultCaseId)) {
          select.value = defaultCaseId;
        } else {
          select.value = "";
        }
      }
      router.refresh();
    });
  };

  const defaultSelectValue =
    defaultCaseId && cases.some((c) => c.id === defaultCaseId) ? defaultCaseId : "";

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-end">
      <div className="w-full min-w-[12rem] flex-1 space-y-2">
        <Label htmlFor="doc-case">Case (optional)</Label>
        <Select id="doc-case" name="caseId" defaultValue={defaultSelectValue}>
          <option value="">No case (unassigned)</option>
          {cases.map((c) => (
            <option key={c.id} value={c.id}>
              {c.caseNumber}
            </option>
          ))}
        </Select>
      </div>
      <div className="w-full min-w-[10rem] flex-1 space-y-2">
        <Label htmlFor="doc-type">Document type (optional)</Label>
        <Input
          id="doc-type"
          name="documentType"
          placeholder="e.g. contract, passport"
          autoComplete="off"
        />
      </div>
      <div className="w-full min-w-[12rem] flex-1 space-y-2">
        <Label htmlFor="doc-file">File</Label>
        <Input id="doc-file" name="file" type="file" required className="cursor-pointer" />
      </div>
      <Button type="submit" disabled={pending} className="w-full sm:w-auto">
        <Upload className="mr-2 h-4 w-4" />
        {pending ? "Uploading…" : "Upload"}
      </Button>
      {error ? (
        <p className="w-full text-sm text-red-600 dark:text-red-400" role="alert">
          {error}
        </p>
      ) : null}
    </form>
  );
}
