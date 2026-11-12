"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { recordDltVisitAction, uploadVisitDocumentAction } from "@/actions/dlt-centre";

const OUTCOMES = [
  ["SUCCESSFULLY_COMPLETED", "Successfully completed"],
  ["LICENCE_ISSUED", "Licence issued"],
  ["ADDITIONAL_DOCUMENTS", "Additional documents requested"],
  ["ANOTHER_APPOINTMENT", "Customer needs another appointment"],
  ["FAILED_EXAMINATION", "Customer failed the examination"],
  ["REJECTED", "Application rejected"],
  ["POSTPONED", "Application postponed"],
] as const;

export function DltVisitClient(props: {
  applicationId: string;
  visits: Array<{ id: string; outcome: string; feedback: string; additionalRequirements: string; nextAppointmentDate: string | null; notes: string; createdAt: string }>;
}) {
  const router = useRouter();
  const [outcome, setOutcome] = useState<string>(OUTCOMES[0][0]);
  const [feedback, setFeedback] = useState("");
  const [additionalRequirements, setAdditional] = useState("");
  const [nextAppointmentDate, setNext] = useState("");
  const [notes, setNotes] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setPending(true);
    setMessage(null);
    const result = await recordDltVisitAction({
      applicationId: props.applicationId,
      outcome,
      feedback,
      additionalRequirements,
      nextAppointmentDate,
      notes,
    });
    setPending(false);
    if (!result.ok) setMessage(result.error);
    else {
      setFeedback("");
      setAdditional("");
      setNotes("");
    }
    router.refresh();
  }

  return (
    <div className="space-y-4">
      <form className="space-y-3 rounded-2xl border bg-white p-4 dark:bg-gray-900" onSubmit={(event) => void submit(event)}>
        <h2 className="font-semibold">After the DLT visit</h2>
        <label className="block text-sm">Result
          <select className="mt-1 w-full rounded-xl border px-3 py-3" value={outcome} onChange={(event) => setOutcome(event.target.value)}>
            {OUTCOMES.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select>
        </label>
        <label className="block text-sm">DLT feedback<textarea className="mt-1 w-full rounded-xl border px-3 py-3" rows={3} value={feedback} onChange={(event) => setFeedback(event.target.value)} /></label>
        <label className="block text-sm">Additional requirements<textarea className="mt-1 w-full rounded-xl border px-3 py-3" rows={3} value={additionalRequirements} onChange={(event) => setAdditional(event.target.value)} /></label>
        <label className="block text-sm">Next appointment date<input className="mt-1 w-full rounded-xl border px-3 py-3" type="date" value={nextAppointmentDate} onChange={(event) => setNext(event.target.value)} /></label>
        <label className="block text-sm">Internal notes<textarea className="mt-1 w-full rounded-xl border px-3 py-3" rows={3} value={notes} onChange={(event) => setNotes(event.target.value)} /></label>
        {message ? <p className="rounded-xl bg-amber-50 px-3 py-2 text-sm" role="status">{message}</p> : null}
        <button className="w-full rounded-xl bg-siam-blue px-4 py-3 font-semibold text-white disabled:opacity-60" disabled={pending} type="submit">Save visit result</button>
      </form>
      <form
        className="space-y-3 rounded-2xl border bg-white p-4 dark:bg-gray-900"
        action={async (formData) => {
          setMessage(null);
          const result = await uploadVisitDocumentAction(formData);
          setMessage(result.ok ? "Supporting document saved on this application." : result.error);
          router.refresh();
        }}
      >
        <h2 className="font-semibold">Supporting document from the visit</h2>
        <p className="text-sm text-gray-600">PDF, JPG, or PNG. The original file is stored with the application and included the next time the package is generated.</p>
        <input type="hidden" name="applicationId" value={props.applicationId} />
        <input className="block w-full text-sm" name="file" type="file" accept="application/pdf,image/jpeg,image/png" required />
        <button className="w-full rounded-xl border border-siam-blue px-4 py-3 font-semibold text-siam-blue" type="submit">Attach document</button>
      </form>
      <ul className="space-y-3">
        {props.visits.map((visit) => (
          <li key={visit.id} className="rounded-2xl border bg-white p-4 text-sm dark:bg-gray-900">
            <p className="font-semibold">{visit.outcome.replaceAll("_", " ")}</p>
            <p className="mt-1">{visit.createdAt}</p>
            {visit.feedback ? <p className="mt-2">{visit.feedback}</p> : null}
            {visit.additionalRequirements ? <p className="mt-2">{visit.additionalRequirements}</p> : null}
            {visit.notes ? <p className="mt-2">{visit.notes}</p> : null}
          </li>
        ))}
      </ul>
    </div>
  );
}
