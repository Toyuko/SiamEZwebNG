"use client";

import { useActionState } from "react";
import { saveOffice } from "@/actions/directory";
import type { DirectoryCopy } from "@/lib/directory/copy";
import { VERIFICATION_STATUSES } from "@/lib/directory/constants";
import { WEEKDAYS, type HoursJson } from "@/lib/directory/hours";
import { THAI_PROVINCES } from "@/lib/directory/provinces";

const fieldClass =
  "mt-1 w-full rounded-lg border border-border bg-white px-3 py-2 text-sm dark:bg-slate-950";

export type OfficeFormOffice = {
  id: string;
  slug: string;
  nameEn: string | null;
  nameTh: string | null;
  category: { slug: string };
  parentOrganizationEn: string | null;
  parentOrganizationTh: string | null;
  branchNameEn: string | null;
  branchNameTh: string | null;
  keywords: string[];
  provinceCode: string;
  district: string | null;
  subdistrict: string | null;
  addressEn: string | null;
  addressTh: string | null;
  postalCode: string | null;
  latitude: number | null;
  longitude: number | null;
  googleMapsUrl: string | null;
  extraMapUrls: string[];
  phonePrimary: string | null;
  phones: string[];
  email: string | null;
  website: string | null;
  facebookUrl: string | null;
  contactNotes: string | null;
  openingHoursText: string | null;
  hoursJson: unknown;
  operatingDays: string | null;
  lunchBreak: string | null;
  holidayNotes: string | null;
  appointmentRequired: boolean | null;
  walkInsAccepted: boolean | null;
  appointmentNotes: string | null;
  serviceNotes: string | null;
  documentsRequired: string | null;
  bookingInfo: string | null;
  governmentLinks: string | null;
  internalNotes: string | null;
  proceduralNotes: string | null;
  staffTips: string | null;
  parkingNotes: string | null;
  counterNotes: string | null;
  verificationStatus: string;
  sourceUrl: string | null;
  sourceNotes: string | null;
  lastVerifiedAt: Date | null;
  lastVerificationMethod: string | null;
  reliabilityNotes: string | null;
  services: Array<{ service: { slug: string } }>;
};

function Field({
  label,
  name,
  defaultValue,
  as = "input",
}: {
  label: string;
  name: string;
  defaultValue?: string | null;
  as?: "input" | "textarea";
}) {
  return (
    <label className="block text-sm">
      {label}
      {as === "textarea" ? (
        <textarea name={name} defaultValue={defaultValue ?? ""} rows={3} className={fieldClass} />
      ) : (
        <input name={name} defaultValue={defaultValue ?? ""} className={fieldClass} />
      )}
    </label>
  );
}

function tri(value: boolean | null | undefined): string {
  if (value === true) return "yes";
  if (value === false) return "no";
  return "";
}

export function OfficeForm({
  copy,
  office,
  categories,
  services,
}: {
  copy: DirectoryCopy;
  office?: OfficeFormOffice | null;
  categories: Array<{ slug: string; nameEn: string; nameTh: string }>;
  services: Array<{ slug: string; nameEn: string; nameTh: string }>;
}) {
  const [state, action, pending] = useActionState(saveOffice, null);
  const selected = new Set(office?.services.map((link) => link.service.slug) ?? []);
  const hours = (office?.hoursJson ?? null) as HoursJson | null;

  return (
    <form action={action} className="space-y-8">
      {office ? <input type="hidden" name="id" value={office.id} /> : null}
      <p className="text-sm text-muted-foreground">{copy.requiredHint}</p>
      {state?.ok ? <p className="text-sm text-emerald-700">{copy.saved}</p> : null}
      {state && !state.ok ? (
        <div className="rounded-xl bg-rose-50 p-3 text-sm text-rose-800">
          {state.message}
          <ul>
            {Object.entries(state.fieldErrors ?? {}).map(([key, message]) => (
              <li key={key}>
                {key}: {message}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <section className="grid gap-4 md:grid-cols-2">
        <Field label={copy.nameEn} name="nameEn" defaultValue={office?.nameEn} />
        <Field label={copy.nameTh} name="nameTh" defaultValue={office?.nameTh} />
        <label className="block text-sm">
          {copy.category}
          <select name="categorySlug" className={fieldClass} defaultValue={office?.category.slug ?? categories[0]?.slug}>
            {categories.map((category) => (
              <option key={category.slug} value={category.slug}>
                {category.nameEn}
              </option>
            ))}
          </select>
        </label>
        <label className="block text-sm">
          {copy.province}
          <select name="provinceCode" className={fieldClass} defaultValue={office?.provinceCode ?? "10"}>
            {THAI_PROVINCES.map((province) => (
              <option key={province.code} value={province.code}>
                {province.nameEn} — {province.nameTh}
              </option>
            ))}
          </select>
        </label>
        <Field label={`${copy.parent} EN`} name="parentOrganizationEn" defaultValue={office?.parentOrganizationEn} />
        <Field label={`${copy.parent} TH`} name="parentOrganizationTh" defaultValue={office?.parentOrganizationTh} />
        <Field label={`${copy.branch} EN`} name="branchNameEn" defaultValue={office?.branchNameEn} />
        <Field label={`${copy.branch} TH`} name="branchNameTh" defaultValue={office?.branchNameTh} />
        <Field label={copy.slug} name="slug" defaultValue={office?.slug} />
        <Field label={copy.keywords} name="keywords" defaultValue={office?.keywords.join(", ")} />
      </section>

      <section className="grid gap-4 md:grid-cols-2">
        <Field label={copy.district} name="district" defaultValue={office?.district} />
        <Field label="Subdistrict" name="subdistrict" defaultValue={office?.subdistrict} />
        <Field label={`${copy.address} EN`} name="addressEn" defaultValue={office?.addressEn} as="textarea" />
        <Field label={`${copy.address} TH`} name="addressTh" defaultValue={office?.addressTh} as="textarea" />
        <Field label={copy.postal} name="postalCode" defaultValue={office?.postalCode} />
        <Field label={copy.latitude} name="latitude" defaultValue={office?.latitude?.toString()} />
        <Field label={copy.longitude} name="longitude" defaultValue={office?.longitude?.toString()} />
        <Field label={copy.mapsUrl} name="googleMapsUrl" defaultValue={office?.googleMapsUrl} />
        <Field label={copy.extraMaps} name="extraMapUrls" defaultValue={office?.extraMapUrls.join("\n")} as="textarea" />
      </section>

      <section className="grid gap-4 md:grid-cols-2">
        <Field label={copy.call} name="phonePrimary" defaultValue={office?.phonePrimary} />
        <Field label={copy.phones} name="phones" defaultValue={office?.phones.join(", ")} />
        <Field label={copy.email} name="email" defaultValue={office?.email} />
        <Field label={copy.website} name="website" defaultValue={office?.website} />
        <Field label={copy.facebook} name="facebookUrl" defaultValue={office?.facebookUrl} />
        <Field label={copy.contactNotes} name="contactNotes" defaultValue={office?.contactNotes} as="textarea" />
      </section>

      <section className="space-y-3">
        <h2 className="font-semibold">{copy.hours}</h2>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead>
              <tr className="text-muted-foreground">
                <th className="py-1 pr-2">{copy.operatingDays}</th>
                <th>{copy.closedDays}</th>
                <th>{copy.from}</th>
                <th>{copy.to}</th>
                <th>{copy.breakStart}</th>
                <th>{copy.breakEnd}</th>
              </tr>
            </thead>
            <tbody>
              {WEEKDAYS.map((day) => {
                const row = hours?.days?.[day];
                return (
                  <tr key={day}>
                    <td className="py-1 pr-2">{copy.days[day]}</td>
                    <td>
                      <input type="checkbox" name={`hours_${day}_closed`} defaultChecked={row?.closed} />
                    </td>
                    <td>
                      <input name={`hours_${day}_open`} defaultValue={row?.open ?? ""} className="w-24 rounded border px-2 py-1" />
                    </td>
                    <td>
                      <input name={`hours_${day}_close`} defaultValue={row?.close ?? ""} className="w-24 rounded border px-2 py-1" />
                    </td>
                    <td>
                      <input name={`hours_${day}_break_start`} defaultValue={row?.breakStart ?? ""} className="w-24 rounded border px-2 py-1" />
                    </td>
                    <td>
                      <input name={`hours_${day}_break_end`} defaultValue={row?.breakEnd ?? ""} className="w-24 rounded border px-2 py-1" />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <Field label={copy.hours} name="openingHoursText" defaultValue={office?.openingHoursText} as="textarea" />
        <Field label={copy.operatingDays} name="operatingDays" defaultValue={office?.operatingDays} />
        <Field label={copy.lunch} name="lunchBreak" defaultValue={office?.lunchBreak} />
        <Field label={copy.holidays} name="holidayNotes" defaultValue={office?.holidayNotes} as="textarea" />
        <div className="grid gap-4 md:grid-cols-2">
          <label className="block text-sm">
            {copy.appointmentRequired}
            <select name="appointmentRequired" className={fieldClass} defaultValue={tri(office?.appointmentRequired)}>
              <option value="">{copy.unknown}</option>
              <option value="yes">{copy.yes}</option>
              <option value="no">{copy.no}</option>
            </select>
          </label>
          <label className="block text-sm">
            {copy.walkIns}
            <select name="walkInsAccepted" className={fieldClass} defaultValue={tri(office?.walkInsAccepted)}>
              <option value="">{copy.unknown}</option>
              <option value="yes">{copy.yes}</option>
              <option value="no">{copy.no}</option>
            </select>
          </label>
        </div>
        <Field label={copy.appointment} name="appointmentNotes" defaultValue={office?.appointmentNotes} as="textarea" />
      </section>

      <section className="space-y-3">
        <h2 className="font-semibold">{copy.services}</h2>
        <div className="grid max-h-64 gap-2 overflow-auto rounded-xl border border-border p-3 md:grid-cols-2">
          {services.map((service) => (
            <label key={service.slug} className="flex items-start gap-2 text-sm">
              <input type="checkbox" name="serviceSlugs" value={service.slug} defaultChecked={selected.has(service.slug)} />
              <span>
                {service.nameEn}
                <span className="block text-muted-foreground">{service.nameTh}</span>
              </span>
            </label>
          ))}
        </div>
        <Field label={copy.serviceNotes} name="serviceNotes" defaultValue={office?.serviceNotes} as="textarea" />
        <Field label={copy.documents} name="documentsRequired" defaultValue={office?.documentsRequired} as="textarea" />
        <Field label={copy.booking} name="bookingInfo" defaultValue={office?.bookingInfo} as="textarea" />
        <Field label={copy.links} name="governmentLinks" defaultValue={office?.governmentLinks} as="textarea" />
      </section>

      <section className="grid gap-4 md:grid-cols-2">
        <Field label={copy.internal} name="internalNotes" defaultValue={office?.internalNotes} as="textarea" />
        <Field label={copy.procedure} name="proceduralNotes" defaultValue={office?.proceduralNotes} as="textarea" />
        <Field label={copy.tips} name="staffTips" defaultValue={office?.staffTips} as="textarea" />
        <Field label={copy.parking} name="parkingNotes" defaultValue={office?.parkingNotes} as="textarea" />
        <Field label={copy.counter} name="counterNotes" defaultValue={office?.counterNotes} as="textarea" />
      </section>

      <section className="grid gap-4 md:grid-cols-2">
        <label className="block text-sm">
          {copy.status}
          <select name="verificationStatus" className={fieldClass} defaultValue={office?.verificationStatus ?? "unverified"}>
            {VERIFICATION_STATUSES.map((status) => (
              <option key={status} value={status}>
                {copy.statuses[status]}
              </option>
            ))}
          </select>
        </label>
        <Field label={copy.verifiedOn} name="lastVerifiedAt" defaultValue={office?.lastVerifiedAt?.toISOString().slice(0, 10)} />
        <Field label={copy.method} name="lastVerificationMethod" defaultValue={office?.lastVerificationMethod} />
        <Field label={copy.sourceUrl} name="sourceUrl" defaultValue={office?.sourceUrl} />
        <Field label={copy.sourceNotes} name="sourceNotes" defaultValue={office?.sourceNotes} as="textarea" />
        <Field label={copy.reliability} name="reliabilityNotes" defaultValue={office?.reliabilityNotes} as="textarea" />
      </section>

      <button disabled={pending} className="min-h-12 rounded-xl bg-siam-blue px-6 text-sm font-semibold text-white">
        {copy.save}
      </button>
    </form>
  );
}
