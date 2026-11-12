"use client";

import { useState } from "react";
import { useRouter } from "@/i18n/navigation";
import { startLicenceApplicationAction } from "@/actions/licence-verification";
import { priceGuideLabel } from "@/lib/licence-verification/catalog";
import { licenceCopy, serviceTitle, type LicenceLocale } from "@/lib/licence-verification/copy";
import { LICENCE_SERVICE_KINDS, type LicenceServiceKind } from "@/lib/licence-verification/types";

const IMMIGRATION = [
  ["tourist", "Tourist visa", "วีซ่าท่องเที่ยว"],
  ["non_immigrant", "Non-immigrant visa", "วีซ่า non-immigrant"],
  ["visa_exemption", "Visa exemption or stamp", "ยกเว้นวีซ่าหรือตราประทับ"],
  ["permanent_resident", "Permanent resident", "ผู้มีถิ่นที่อยู่ถาวร"],
  ["thai_citizen", "Thai citizen", "คนไทย"],
  ["other", "Other / not sure", "อื่นๆ / ไม่แน่ใจ"],
] as const;

export function LicenceApplyForm({ locale }: { locale: string }) {
  const lang: LicenceLocale = locale === "th" ? "th" : "en";
  const copy = licenceCopy(lang);
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [kind, setKind] = useState<LicenceServiceKind>("CONVERSION_CAR");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [form, setForm] = useState({
    fullLegalName: "",
    nationality: "",
    dateOfBirth: "",
    passportNumber: "",
    countryOfResidence: "",
    immigrationStatus: "tourist",
    visaExpiryDate: "",
    thaiAddress: "",
    email: "",
    phone: "",
    hasResidenceCertificate: false,
    hasWorkPermit: false,
    hasForeignLicence: true,
    foreignLicenceCountry: "",
    foreignLicenceCategories: "",
    foreignLicenceIssueDate: "",
    foreignLicenceExpiryDate: "",
    foreignLicenceFormat: "physical" as "physical" | "digital",
    foreignLicenceLanguage: "english" as "english" | "other",
    previouslyHeldThaiLicence: false,
    failedOrAttemptedBefore: false,
    attemptNotes: "",
    renewalVehicle: "car" as "car" | "bike" | "both",
  });

  const conversion = kind.startsWith("CONVERSION_");
  const needsVehicle = kind === "RENEWAL" || kind === "LOST_REPLACEMENT";
  const thai = form.immigrationStatus === "thai_citizen" || form.nationality.trim().toLowerCase() === "thai";

  function set<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function submit() {
    setError(null);
    setPending(true);
    const result = await startLicenceApplicationAction({
      ...form,
      serviceKind: kind,
      hasForeignLicence: conversion || form.hasForeignLicence,
      locale: lang,
      visaExpiryDate: thai ? "" : form.visaExpiryDate,
    });
    setPending(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    router.push(`/driving-licence/track/${result.token}`);
  }

  return (
    <div className="mx-auto max-w-xl px-4 py-8">
      <p className="text-sm font-semibold uppercase tracking-wide text-siam-blue">{copy.fee}</p>
      <h1 className="mt-2 text-3xl font-bold text-gray-900 dark:text-white">{copy.title}</h1>
      <p className="mt-3 text-base leading-relaxed text-gray-600 dark:text-gray-300">{copy.lead}</p>
      <ol className="mt-6 grid grid-cols-2 gap-2 text-sm">
        {[lang === "th" ? "บริการและข้อมูล" : "Service and details", lang === "th" ? "ข้อมูลของคุณ" : "Your details"].map((label, index) => (
          <li key={label} className={`rounded-full px-3 py-2 text-center ${step === index ? "bg-siam-blue text-white" : "bg-gray-100 text-gray-600 dark:bg-gray-800"}`}>
            {index + 1}. {label}
          </li>
        ))}
      </ol>

      {error ? <p className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800" role="alert">{error}</p> : null}

      {step === 0 ? (
        <fieldset className="mt-6 space-y-3">
          <legend className="sr-only">{copy.title}</legend>
          {LICENCE_SERVICE_KINDS.map((item) => (
            <label key={item} className={`block cursor-pointer rounded-2xl border p-4 ${kind === item ? "border-siam-blue bg-siam-blue/5" : "border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-900"}`}>
              <input className="sr-only" type="radio" name="service" checked={kind === item} onChange={() => setKind(item)} />
              <span className="block font-semibold text-gray-900 dark:text-white">{serviceTitle(item, lang)}</span>
              <span className="mt-1 block text-sm text-gray-600 dark:text-gray-300">{priceGuideLabel(item, lang)}</span>
            </label>
          ))}
          <button type="button" className="mt-2 w-full rounded-xl bg-siam-blue px-4 py-3 font-semibold text-white" onClick={() => setStep(1)}>
            {copy.continue}
          </button>
        </fieldset>
      ) : (
        <form className="mt-6 space-y-4" onSubmit={(event) => { event.preventDefault(); void submit(); }}>
          <Field label={copy.name} value={form.fullLegalName} onChange={(value) => set("fullLegalName", value)} />
          <Field label={copy.nationality} value={form.nationality} onChange={(value) => set("nationality", value)} />
          <Field label={copy.dob} type="date" value={form.dateOfBirth} onChange={(value) => set("dateOfBirth", value)} />
          <Field label={copy.passport} value={form.passportNumber} onChange={(value) => set("passportNumber", value)} />
          <Field label={copy.residenceCountry} value={form.countryOfResidence} onChange={(value) => set("countryOfResidence", value)} />
          <label className="block text-sm font-medium text-gray-800 dark:text-gray-100">
            {copy.immigration}
            <select className="mt-1 w-full rounded-xl border border-gray-300 bg-white px-3 py-3 dark:border-gray-700 dark:bg-gray-900" value={form.immigrationStatus} onChange={(event) => set("immigrationStatus", event.target.value)}>
              {IMMIGRATION.map(([value, en, th]) => <option key={value} value={value}>{lang === "th" ? th : en}</option>)}
            </select>
          </label>
          {thai ? null : <Field label={copy.visaExpiry} type="date" value={form.visaExpiryDate} onChange={(value) => set("visaExpiryDate", value)} />}
          <label className="block text-sm font-medium text-gray-800 dark:text-gray-100">
            {copy.address}
            <textarea className="mt-1 w-full rounded-xl border border-gray-300 px-3 py-3 dark:border-gray-700 dark:bg-gray-900" rows={3} value={form.thaiAddress} onChange={(event) => set("thaiAddress", event.target.value)} />
          </label>
          <Field label={copy.email} type="email" value={form.email} onChange={(value) => set("email", value)} />
          <Field label={copy.phone} type="tel" value={form.phone} onChange={(value) => set("phone", value)} />
          <YesNo label={copy.residenceCert} value={form.hasResidenceCertificate} onChange={(value) => set("hasResidenceCertificate", value)} copy={copy} />
          <YesNo label={copy.workPermit} value={form.hasWorkPermit} onChange={(value) => set("hasWorkPermit", value)} copy={copy} />
          {conversion ? null : <YesNo label={copy.foreignLicence} value={form.hasForeignLicence} onChange={(value) => set("hasForeignLicence", value)} copy={copy} />}
          {conversion || form.hasForeignLicence ? (
            <div className="space-y-4 rounded-2xl border border-siam-yellow/60 bg-amber-50/60 p-4 dark:bg-gray-900">
              <Field label={copy.country} value={form.foreignLicenceCountry} onChange={(value) => set("foreignLicenceCountry", value)} />
              <Field label={copy.categories} value={form.foreignLicenceCategories} onChange={(value) => set("foreignLicenceCategories", value)} />
              <Field label={copy.issued} type="date" value={form.foreignLicenceIssueDate} onChange={(value) => set("foreignLicenceIssueDate", value)} />
              <Field label={copy.expires} type="date" value={form.foreignLicenceExpiryDate} onChange={(value) => set("foreignLicenceExpiryDate", value)} />
              <label className="block text-sm font-medium">{copy.format}
                <select className="mt-1 w-full rounded-xl border px-3 py-3" value={form.foreignLicenceFormat} onChange={(event) => set("foreignLicenceFormat", event.target.value as "physical" | "digital")}>
                  <option value="physical">{copy.physical}</option>
                  <option value="digital">{copy.digital}</option>
                </select>
              </label>
              <label className="block text-sm font-medium">{copy.language}
                <select className="mt-1 w-full rounded-xl border px-3 py-3" value={form.foreignLicenceLanguage} onChange={(event) => set("foreignLicenceLanguage", event.target.value as "english" | "other")}>
                  <option value="english">{copy.english}</option>
                  <option value="other">{copy.otherLanguage}</option>
                </select>
              </label>
            </div>
          ) : null}
          {needsVehicle ? (
            <label className="block text-sm font-medium">{copy.vehicle}
              <select className="mt-1 w-full rounded-xl border px-3 py-3" value={form.renewalVehicle} onChange={(event) => set("renewalVehicle", event.target.value as "car" | "bike" | "both")}>
                <option value="car">{copy.car}</option>
                <option value="bike">{copy.motorcycle}</option>
                <option value="both">{copy.both}</option>
              </select>
            </label>
          ) : null}
          <YesNo label={copy.heldThai} value={form.previouslyHeldThaiLicence} onChange={(value) => set("previouslyHeldThaiLicence", value)} copy={copy} />
          <YesNo label={copy.attempted} value={form.failedOrAttemptedBefore} onChange={(value) => set("failedOrAttemptedBefore", value)} copy={copy} />
          {form.failedOrAttemptedBefore ? (
            <label className="block text-sm font-medium">{copy.notes}
              <textarea className="mt-1 w-full rounded-xl border px-3 py-3" rows={3} value={form.attemptNotes} onChange={(event) => set("attemptNotes", event.target.value)} />
            </label>
          ) : null}
          <p className="text-xs leading-relaxed text-gray-500">{copy.disclaimer}</p>
          <div className="grid grid-cols-2 gap-3">
            <button type="button" className="rounded-xl border border-gray-300 px-4 py-3 font-semibold" onClick={() => setStep(0)}>{copy.back}</button>
            <button type="submit" disabled={pending} className="rounded-xl bg-siam-blue px-4 py-3 font-semibold text-white disabled:opacity-60">{pending ? "…" : copy.submit}</button>
          </div>
        </form>
      )}
    </div>
  );
}

function Field({ label, value, onChange, type = "text" }: { label: string; value: string; onChange: (value: string) => void; type?: string }) {
  return (
    <label className="block text-sm font-medium text-gray-800 dark:text-gray-100">
      {label}
      <input className="mt-1 w-full rounded-xl border border-gray-300 bg-white px-3 py-3 text-base dark:border-gray-700 dark:bg-gray-900" type={type} value={value} onChange={(event) => onChange(event.target.value)} required />
    </label>
  );
}

function YesNo({ label, value, onChange, copy }: { label: string; value: boolean; onChange: (value: boolean) => void; copy: { yes: string; no: string } }) {
  return (
    <fieldset>
      <legend className="text-sm font-medium text-gray-800 dark:text-gray-100">{label}</legend>
      <div className="mt-2 grid grid-cols-2 gap-2">
        {[true, false].map((option) => (
          <label key={String(option)} className={`rounded-xl border px-3 py-3 text-center ${value === option ? "border-siam-blue bg-siam-blue text-white" : "border-gray-300"}`}>
            <input className="sr-only" type="radio" checked={value === option} onChange={() => onChange(option)} />
            {option ? copy.yes : copy.no}
          </label>
        ))}
      </div>
    </fieldset>
  );
}
