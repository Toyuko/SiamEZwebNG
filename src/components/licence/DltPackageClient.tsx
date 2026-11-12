"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { acknowledgeFindingAction, generateDltPackageAction, overrideDltPackageAction } from "@/actions/dlt-centre";
import { OFFICIAL_DLT_BOOKING_URL } from "@/lib/dlt-package/appointments";

type Issue = { code: string; message: string };
type Finding = { key: string; status: string; message: string; acknowledged: boolean };
type DocumentRow = { id: string; label: string; fileName: string; duplicate: boolean };

export function DltPackageClient(props: {
  applicationId: string;
  approved: boolean;
  packageId: string | null;
  version: number | null;
  status: string | null;
  issues: Issue[];
  findings: Finding[];
  documents: DocumentRow[];
  prints: Array<{ kind: string; createdAt: string }>;
}) {
  const router = useRouter();
  const [message, setMessage] = useState<string | null>(null);
  const [reason, setReason] = useState("");
  const [pending, setPending] = useState(false);

  async function run(action: () => Promise<{ ok: boolean; error?: string }>) {
    setPending(true);
    setMessage(null);
    const result = await action();
    setPending(false);
    if (!result.ok) setMessage(result.error ?? "That could not be saved.");
    router.refresh();
  }

  return (
    <div className="space-y-4">
      <section className="rounded-2xl border bg-white p-4 dark:bg-gray-900">
        <h2 className="font-semibold">Print-ready package</h2>
        <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">
          Original uploads stay unchanged. The PDF only rotates a photo when the file itself contains an orientation flag.
          DLT Smart Queue has no booking API. Book at the official site, then record the confirmation on the appointment tab.
        </p>
        <a className="mt-2 inline-block text-sm font-semibold text-siam-blue" href={OFFICIAL_DLT_BOOKING_URL} target="_blank" rel="noreferrer">
          Open DLT Smart Queue
        </a>
        <p className="mt-3 text-sm">Status: {props.status ?? "Not generated"} {props.version ? `· version ${props.version}` : ""}</p>
        {props.issues.length > 0 ? (
          <ul className="mt-3 space-y-2">
            {props.issues.map((issue) => (
              <li key={`${issue.code}-${issue.message}`} className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-900">{issue.message}</li>
            ))}
          </ul>
        ) : null}
        {message ? <p className="mt-3 rounded-xl bg-amber-50 px-3 py-2 text-sm" role="status">{message}</p> : null}
        <div className="mt-4 flex flex-wrap gap-2">
          <button type="button" disabled={pending || !props.approved} className="rounded-lg bg-siam-blue px-3 py-2 text-sm font-semibold text-white disabled:opacity-60" onClick={() => void run(() => generateDltPackageAction(props.applicationId))}>
            {props.packageId ? "Regenerate package" : "Generate package"}
          </button>
          {props.packageId ? (
            <>
              <a className="rounded-lg border px-3 py-2 text-sm font-semibold" href={`/api/dlt-package/${props.packageId}?kind=complete`}>Complete DLT package</a>
              <a className="rounded-lg border px-3 py-2 text-sm font-semibold" href={`/api/dlt-package/${props.packageId}?kind=cover`}>Cover sheet</a>
            </>
          ) : null}
        </div>
        {props.packageId && props.status === "BLOCKED" ? (
          <form className="mt-4 space-y-2" onSubmit={(event) => { event.preventDefault(); void run(() => overrideDltPackageAction(props.packageId!, reason)); }}>
            <textarea className="w-full rounded-xl border px-3 py-2 text-sm" rows={3} value={reason} onChange={(event) => setReason(event.target.value)} placeholder="Override reason, at least 8 characters" />
            <button className="rounded-lg border border-amber-700 px-3 py-2 text-sm font-semibold text-amber-800" type="submit">Override and mark ready to print</button>
          </form>
        ) : null}
      </section>
      <section className="rounded-2xl border bg-white p-4 dark:bg-gray-900">
        <h2 className="font-semibold">Individual documents</h2>
        <ul className="mt-3 space-y-2">
          {props.documents.map((document) => (
            <li key={document.id} className="flex flex-wrap items-center justify-between gap-2 text-sm">
              <span>{document.duplicate ? "Duplicate" : "Included"} · {document.label} · {document.fileName}</span>
              {props.packageId ? <a className="font-semibold text-siam-blue" href={`/api/dlt-package/${props.packageId}?kind=individual&documentId=${document.id}`}>Download</a> : null}
            </li>
          ))}
        </ul>
      </section>
      <section className="rounded-2xl border bg-white p-4 dark:bg-gray-900">
        <h2 className="font-semibold">Open AI warnings</h2>
        <ul className="mt-3 space-y-3">
          {props.findings.filter((finding) => finding.status !== "ACCEPTABLE").map((finding) => (
            <li key={finding.key} className="text-sm">
              <p>{finding.message}</p>
              {finding.acknowledged ? <p className="text-emerald-700">Acknowledged</p> : (
                <button type="button" className="mt-1 font-semibold text-siam-blue" onClick={() => void run(() => acknowledgeFindingAction(props.applicationId, finding.key, "Staff reviewed this warning."))}>
                  Acknowledge
                </button>
              )}
            </li>
          ))}
        </ul>
      </section>
      <section className="rounded-2xl border bg-white p-4 text-sm dark:bg-gray-900">
        <h2 className="font-semibold">Print record</h2>
        <ul className="mt-2 space-y-1">
          {props.prints.map((print, index) => <li key={`${print.createdAt}-${index}`}>{print.createdAt} · {print.kind}</li>)}
          {props.prints.length === 0 ? <li>No downloads recorded.</li> : null}
        </ul>
      </section>
    </div>
  );
}
