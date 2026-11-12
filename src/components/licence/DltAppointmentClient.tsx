"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { saveDltAppointmentAction } from "@/actions/dlt-centre";
import { BOOKING_METHODS, DLT_APPOINTMENT_STATUSES, OFFICIAL_DLT_BOOKING_URL } from "@/lib/dlt-package/appointments";

type Office = { id: string; nameEn: string; province: string; active: boolean; supportedServiceKinds: string[] };
type Staff = { id: string; name: string | null; email: string };

export function DltAppointmentClient(props: {
  applicationId: string;
  serviceKind: string;
  approved: boolean;
  offices: Office[];
  staff: Staff[];
  current: {
    officeId: string;
    appointmentDate: string;
    appointmentTime: string;
    confirmationNumber: string;
    bookingMethod: string;
    status: string;
    specialInstructions: string;
    assignedStaffId: string;
  };
}) {
  const router = useRouter();
  const [form, setForm] = useState(props.current);
  const [message, setMessage] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const suitable = props.offices.filter((office) => office.active && office.supportedServiceKinds.includes(props.serviceKind));

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setPending(true);
    setMessage(null);
    const result = await saveDltAppointmentAction({ applicationId: props.applicationId, ...form });
    setPending(false);
    if (!result.ok) setMessage(result.error);
    router.refresh();
  }

  function set<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  return (
    <form className="space-y-4 rounded-2xl border bg-white p-4 dark:bg-gray-900" onSubmit={(event) => void submit(event)}>
      <h2 className="font-semibold">DLT appointment</h2>
      <p className="text-sm text-gray-600 dark:text-gray-300">
        This screen does not book the appointment. Staff book it in DLT Smart Queue, then enter the confirmation number here.
        An appointment stays unconfirmed until that number is saved.
      </p>
      <a className="inline-block text-sm font-semibold text-siam-blue" href={OFFICIAL_DLT_BOOKING_URL} target="_blank" rel="noreferrer">Open DLT Smart Queue</a>
      <label className="block text-sm">Office
        <select className="mt-1 w-full rounded-xl border px-3 py-3" value={form.officeId} onChange={(event) => set("officeId", event.target.value)}>
          <option value="">Select an office</option>
          {suitable.map((office) => <option key={office.id} value={office.id}>{office.nameEn} · {office.province}</option>)}
        </select>
      </label>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="text-sm">Date<input className="mt-1 w-full rounded-xl border px-3 py-3" type="date" value={form.appointmentDate} onChange={(event) => set("appointmentDate", event.target.value)} /></label>
        <label className="text-sm">Time<input className="mt-1 w-full rounded-xl border px-3 py-3" type="time" value={form.appointmentTime} onChange={(event) => set("appointmentTime", event.target.value)} /></label>
      </div>
      <label className="block text-sm">Confirmation number
        <input className="mt-1 w-full rounded-xl border px-3 py-3" value={form.confirmationNumber} onChange={(event) => set("confirmationNumber", event.target.value)} />
      </label>
      <label className="block text-sm">Booking method
        <select className="mt-1 w-full rounded-xl border px-3 py-3" value={form.bookingMethod} onChange={(event) => set("bookingMethod", event.target.value)}>
          {BOOKING_METHODS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
        </select>
      </label>
      <label className="block text-sm">Status
        <select className="mt-1 w-full rounded-xl border px-3 py-3" value={form.status} onChange={(event) => set("status", event.target.value)}>
          {DLT_APPOINTMENT_STATUSES.map((status) => <option key={status} value={status}>{status.replaceAll("_", " ")}</option>)}
        </select>
      </label>
      <label className="block text-sm">Assigned staff
        <select className="mt-1 w-full rounded-xl border px-3 py-3" value={form.assignedStaffId} onChange={(event) => set("assignedStaffId", event.target.value)}>
          <option value="">Unassigned</option>
          {props.staff.map((person) => <option key={person.id} value={person.id}>{person.name || person.email}</option>)}
        </select>
      </label>
      <label className="block text-sm">Special instructions
        <textarea className="mt-1 w-full rounded-xl border px-3 py-3" rows={3} value={form.specialInstructions} onChange={(event) => set("specialInstructions", event.target.value)} />
      </label>
      {message ? <p className="rounded-xl bg-amber-50 px-3 py-2 text-sm" role="status">{message}</p> : null}
      <button className="w-full rounded-xl bg-siam-blue px-4 py-3 font-semibold text-white disabled:opacity-60" disabled={pending || !props.approved} type="submit">
        {pending ? "…" : "Save appointment"}
      </button>
    </form>
  );
}
