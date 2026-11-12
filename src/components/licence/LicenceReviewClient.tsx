"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  addLicenceNoteAction,
  approveLicenceAction,
  assignLicenceAction,
  correctLicenceExtractionAction,
  messageLicenceCustomerAction,
  overrideLicenceOutcomeAction,
  reassessLicenceRulesAction,
  rejectLicenceAction,
  requestLicenceDocsAction,
  rerunLicenceAssessmentAction,
} from "@/actions/licence-verification";
import { DOCUMENT_LABELS } from "@/lib/licence-verification/types";

type Extraction = {
  id: string;
  documentId: string;
  holderName: string | null;
  documentNumber: string | null;
  issueDate: string | null;
  expiryDate: string | null;
  categories: string[];
  notes: string;
  readable: boolean;
  corrected: boolean;
};

type ReviewModel = {
  id: string;
  referenceNumber: string;
  status: string;
  email: string;
  phone: string | null;
  serviceKind: string;
  trackPath?: string;
  applicant: Record<string, unknown> | null;
  documents: { id: string; documentType: string; originalName: string; mimeType: string; active: boolean }[];
  assessment: {
    outcome: string;
    confidence: number;
    summary: string;
    nextSteps: string;
    disclaimer: string;
    model: string | null;
    aiError: string | null;
    findings: { id: string; documentType: string | null; documentId: string | null; status: string; message: string; recommendedAction: string }[];
    extractions: Extraction[];
  } | null;
  quote: { quoteNumber: string | null; amount: number; currency: string; requiresHumanReview: boolean } | null;
  booking: { caseNumber: string } | null;
  history: { id: string; event: string; detail: string; createdAt: string; actor: string | null }[];
  notes: { id: string; body: string; createdAt: string; author: string }[];
  notifications: { id: string; channel: string; status: string; subject: string; error: string | null }[];
  approvals: { id: string; decision: string; reason: string; createdAt: string; staff: string | null }[];
  assignees: { id: string; name: string | null; email: string }[];
};

const TONE: Record<string, string> = {
  ACCEPTABLE: "bg-emerald-100 text-emerald-900",
  CLARIFICATION: "bg-amber-100 text-amber-950",
  UNSUITABLE: "bg-red-100 text-red-900",
  MISSING: "bg-red-100 text-red-900",
  MANUAL: "bg-sky-100 text-sky-950",
};

export function LicenceReviewClient({
  application,
  staff,
}: {
  application: ReviewModel;
  staff: { id: string; name: string | null; email: string }[];
}) {
  const router = useRouter();
  const [message, setMessage] = useState<string | null>(null);
  const [reason, setReason] = useState("");
  const [note, setNote] = useState("");
  const [customerMessage, setCustomerMessage] = useState("");

  async function run(action: () => Promise<{ ok: boolean; error?: string }>) {
    const result = await action();
    setMessage(result.ok ? "Saved." : result.error ?? "Could not save.");
    if (result.ok) router.refresh();
  }

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm font-semibold text-siam-blue">{application.referenceNumber}</p>
        <h1 className="text-2xl font-bold">{String(application.applicant?.fullLegalName ?? application.email)}</h1>
        <p className="text-sm text-gray-600">{application.serviceKind} · {application.status} · {application.email} {application.phone ?? ""}</p>
        {application.trackPath ? <p className="mt-1 text-xs text-gray-500">Customer link: {application.trackPath}</p> : null}
      </div>
      {message ? <p className="rounded-xl bg-amber-50 px-4 py-3 text-sm" role="status">{message}</p> : null}

      {application.assessment ? (
        <section className="rounded-2xl border bg-white p-4 dark:bg-gray-900">
          <h2 className="font-semibold">Assessment {application.assessment.outcome} · {Math.round(application.assessment.confidence * 100)}% confidence</h2>
          <p className="mt-2 text-sm">{application.assessment.summary}</p>
          <p className="mt-2 whitespace-pre-wrap text-sm text-gray-600">{application.assessment.nextSteps}</p>
          {application.assessment.aiError ? <p className="mt-2 text-sm text-amber-800">{application.assessment.aiError}</p> : null}
          <div className="mt-4 overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead><tr><th className="py-2">Document</th><th>Status</th><th>AI findings</th><th>Recommended action</th></tr></thead>
              <tbody>
                {application.assessment.findings.map((finding) => (
                  <tr key={finding.id} className="border-t align-top">
                    <td className="py-2 pr-3">{finding.documentType ? DOCUMENT_LABELS[finding.documentType] ?? finding.documentType : "Application"}</td>
                    <td className="py-2 pr-3"><span className={`rounded-full px-2 py-1 text-xs font-semibold ${TONE[finding.status] ?? TONE.MANUAL}`}>{finding.status}</span></td>
                    <td className="py-2 pr-3">{finding.message}</td>
                    <td className="py-2">{finding.recommendedAction}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-3 text-xs text-gray-500">{application.assessment.disclaimer}</p>
        </section>
      ) : null}

      <section className="grid gap-4 lg:grid-cols-2">
        {application.documents.filter((doc) => doc.active).map((doc) => {
          const extraction = application.assessment?.extractions.find((item) => item.documentId === doc.id);
          return (
            <article key={doc.id} className="rounded-2xl border bg-white p-4 dark:bg-gray-900">
              <h3 className="font-semibold">{DOCUMENT_LABELS[doc.documentType] ?? doc.documentType}</h3>
              <p className="text-xs text-gray-500">{doc.originalName}</p>
              <a className="mt-2 inline-block text-sm font-semibold text-siam-blue" href={`/api/licence-verification/documents/${doc.id}`} target="_blank" rel="noreferrer">Open original</a>
              {doc.mimeType.startsWith("image/") ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img alt="" src={`/api/licence-verification/documents/${doc.id}`} className="mt-3 max-h-64 rounded-lg border" />
              ) : null}
              {extraction ? (
                <form className="mt-3 space-y-2 text-sm" onSubmit={(event) => {
                  event.preventDefault();
                  const data = new FormData(event.currentTarget);
                  void run(() => correctLicenceExtractionAction({
                    extractionId: extraction.id,
                    holderName: String(data.get("holderName") ?? ""),
                    documentNumber: String(data.get("documentNumber") ?? ""),
                    issueDate: String(data.get("issueDate") ?? ""),
                    expiryDate: String(data.get("expiryDate") ?? ""),
                    categories: String(data.get("categories") ?? ""),
                    notes: String(data.get("notes") ?? ""),
                  }));
                }}>
                  <input className="w-full rounded border px-2 py-1" name="holderName" defaultValue={extraction.holderName ?? ""} placeholder="Name" />
                  <input className="w-full rounded border px-2 py-1" name="documentNumber" defaultValue={extraction.documentNumber ?? ""} placeholder="Number" />
                  <input className="w-full rounded border px-2 py-1" name="issueDate" defaultValue={extraction.issueDate ?? ""} placeholder="Issue YYYY-MM-DD" />
                  <input className="w-full rounded border px-2 py-1" name="expiryDate" defaultValue={extraction.expiryDate ?? ""} placeholder="Expiry YYYY-MM-DD" />
                  <input className="w-full rounded border px-2 py-1" name="categories" defaultValue={extraction.categories.join(", ")} placeholder="Categories" />
                  <textarea className="w-full rounded border px-2 py-1" name="notes" defaultValue={extraction.notes} />
                  <button className="rounded bg-gray-900 px-3 py-1 text-white" type="submit">{extraction.corrected ? "Update correction" : "Correct extraction"}</button>
                </form>
              ) : null}
            </article>
          );
        })}
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <div className="space-y-3 rounded-2xl border p-4">
          <h2 className="font-semibold">Decisions</h2>
          <textarea className="w-full rounded-lg border px-3 py-2 text-sm" rows={3} value={reason} onChange={(event) => setReason(event.target.value)} placeholder="Reason for override, rejection, or a document request" />
          <div className="flex flex-wrap gap-2">
            <button className="rounded-lg bg-emerald-700 px-3 py-2 text-sm font-semibold text-white" type="button" onClick={() => void run(() => approveLicenceAction(application.id, reason))}>Approve for quotation</button>
            <button className="rounded-lg bg-red-700 px-3 py-2 text-sm font-semibold text-white" type="button" onClick={() => void run(() => rejectLicenceAction(application.id, reason))}>Reject</button>
            <button className="rounded-lg border px-3 py-2 text-sm" type="button" onClick={() => void run(() => requestLicenceDocsAction(application.id, reason))}>Request documents</button>
            <button className="rounded-lg border px-3 py-2 text-sm" type="button" onClick={() => void run(() => overrideLicenceOutcomeAction({ applicationId: application.id, outcome: "MANUAL_REVIEW", reason }))}>Force manual review</button>
            <button className="rounded-lg border px-3 py-2 text-sm" type="button" onClick={() => void run(() => rerunLicenceAssessmentAction(application.id))}>Re-run AI</button>
            <button className="rounded-lg border px-3 py-2 text-sm" type="button" onClick={() => void run(() => reassessLicenceRulesAction(application.id))}>Recalculate rules</button>
          </div>
          <label className="block text-sm">Assign
            <select className="mt-1 w-full rounded border px-2 py-2" defaultValue={application.assignees[0]?.id ?? ""} onChange={(event) => { if (event.target.value) void run(() => assignLicenceAction(application.id, event.target.value)); }}>
              <option value="">Choose staff</option>
              {staff.map((person) => <option key={person.id} value={person.id}>{person.name || person.email}</option>)}
            </select>
          </label>
        </div>
        <div className="space-y-3 rounded-2xl border p-4">
          <h2 className="font-semibold">Notes and customer message</h2>
          <textarea className="w-full rounded-lg border px-3 py-2 text-sm" rows={3} value={note} onChange={(event) => setNote(event.target.value)} placeholder="Internal note" />
          <button className="rounded-lg border px-3 py-2 text-sm" type="button" onClick={() => void run(() => addLicenceNoteAction(application.id, note))}>Add note</button>
          <textarea className="w-full rounded-lg border px-3 py-2 text-sm" rows={3} value={customerMessage} onChange={(event) => setCustomerMessage(event.target.value)} placeholder="Message to the customer" />
          <button className="rounded-lg border px-3 py-2 text-sm" type="button" onClick={() => void run(() => messageLicenceCustomerAction(application.id, customerMessage))}>Send message</button>
          {application.quote ? <p className="text-sm">Quote {application.quote.quoteNumber}: {(application.quote.amount / 100).toLocaleString()} {application.quote.currency}{application.quote.requiresHumanReview ? " · needs price confirmation" : ""}</p> : null}
          {application.booking ? <p className="text-sm">Booking {application.booking.caseNumber}</p> : null}
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <div>
          <h2 className="font-semibold">Audit history</h2>
          <ul className="mt-2 space-y-2 text-sm">
            {application.history.map((item) => <li key={item.id} className="rounded-lg bg-gray-50 px-3 py-2 dark:bg-gray-800"><span className="font-semibold">{item.event}</span> · {item.actor ?? "System"}<div>{item.detail}</div></li>)}
          </ul>
        </div>
        <div>
          <h2 className="font-semibold">Notifications</h2>
          <ul className="mt-2 space-y-2 text-sm">
            {application.notifications.map((item) => <li key={item.id}>{item.channel} · {item.status} · {item.subject}{item.error ? ` · ${item.error}` : ""}</li>)}
          </ul>
          <h2 className="mt-4 font-semibold">Approvals</h2>
          <ul className="mt-2 space-y-2 text-sm">
            {application.approvals.map((item) => <li key={item.id}>{item.decision} by {item.staff ?? "staff"}: {item.reason}</li>)}
          </ul>
          <h2 className="mt-4 font-semibold">Internal notes</h2>
          <ul className="mt-2 space-y-2 text-sm">{application.notes.map((item) => <li key={item.id}>{item.author}: {item.body}</li>)}</ul>
        </div>
      </section>
    </div>
  );
}
