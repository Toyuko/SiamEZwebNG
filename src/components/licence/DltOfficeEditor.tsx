"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { saveDltOfficeAction } from "@/actions/dlt-centre";
import { LICENCE_SERVICE_KINDS } from "@/lib/licence-verification/types";

type Office = {
  id: string;
  nameEn: string;
  nameTh: string;
  province: string;
  address: string;
  phone: string;
  email: string;
  supportedServiceKinds: string[];
  openingHours: string;
  bookingInstructions: string;
  specialRequirements: string;
  active: boolean;
};

export function DltOfficeEditor({ offices }: { offices: Office[] }) {
  const router = useRouter();
  const [message, setMessage] = useState<string | null>(null);

  async function save(office: Office) {
    setMessage(null);
    const result = await saveDltOfficeAction(office);
    if (!result.ok) setMessage(result.error);
    router.refresh();
  }

  return (
    <div className="space-y-4">
      {message ? <p className="rounded-xl bg-amber-50 px-3 py-2 text-sm" role="status">{message}</p> : null}
      {offices.map((office) => <OfficeForm key={office.id} office={office} onSave={save} />)}
      <OfficeForm
        office={{ id: "", nameEn: "", nameTh: "", province: "", address: "", phone: "", email: "", supportedServiceKinds: [], openingHours: "", bookingInstructions: "", specialRequirements: "", active: true }}
        onSave={save}
      />
    </div>
  );
}

function OfficeForm({ office, onSave }: { office: Office; onSave: (office: Office) => Promise<void> }) {
  const [form, setForm] = useState(office);
  function set<K extends keyof Office>(key: K, value: Office[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }
  return (
    <form className="space-y-3 rounded-2xl border bg-white p-4 dark:bg-gray-900" onSubmit={(event) => { event.preventDefault(); void onSave(form.id ? form : { ...form, id: undefined as unknown as string }); }}>
      <h2 className="font-semibold">{form.id ? form.nameEn : "New office"}</h2>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="text-sm">English name<input className="mt-1 w-full rounded-xl border px-3 py-2" value={form.nameEn} onChange={(event) => set("nameEn", event.target.value)} /></label>
        <label className="text-sm">Thai name<input className="mt-1 w-full rounded-xl border px-3 py-2" value={form.nameTh} onChange={(event) => set("nameTh", event.target.value)} /></label>
        <label className="text-sm">Province<input className="mt-1 w-full rounded-xl border px-3 py-2" value={form.province} onChange={(event) => set("province", event.target.value)} /></label>
        <label className="text-sm">Phone<input className="mt-1 w-full rounded-xl border px-3 py-2" value={form.phone} onChange={(event) => set("phone", event.target.value)} /></label>
      </div>
      <label className="block text-sm">Address<textarea className="mt-1 w-full rounded-xl border px-3 py-2" rows={2} value={form.address} onChange={(event) => set("address", event.target.value)} /></label>
      <label className="block text-sm">Opening hours<input className="mt-1 w-full rounded-xl border px-3 py-2" value={form.openingHours} onChange={(event) => set("openingHours", event.target.value)} /></label>
      <label className="block text-sm">Booking instructions<textarea className="mt-1 w-full rounded-xl border px-3 py-2" rows={2} value={form.bookingInstructions} onChange={(event) => set("bookingInstructions", event.target.value)} /></label>
      <label className="block text-sm">Special requirements<textarea className="mt-1 w-full rounded-xl border px-3 py-2" rows={2} value={form.specialRequirements} onChange={(event) => set("specialRequirements", event.target.value)} /></label>
      <fieldset>
        <legend className="text-sm font-medium">Supported licence services</legend>
        <div className="mt-2 grid gap-2 sm:grid-cols-2">
          {LICENCE_SERVICE_KINDS.map((kind) => (
            <label key={kind} className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={form.supportedServiceKinds.includes(kind)}
                onChange={(event) => {
                  const next = event.target.checked
                    ? [...form.supportedServiceKinds, kind]
                    : form.supportedServiceKinds.filter((item) => item !== kind);
                  set("supportedServiceKinds", next);
                }}
              />
              {kind}
            </label>
          ))}
        </div>
      </fieldset>
      <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.active} onChange={(event) => set("active", event.target.checked)} /> Active</label>
      <button className="rounded-lg bg-siam-blue px-3 py-2 text-sm font-semibold text-white" type="submit">Save office</button>
    </form>
  );
}
