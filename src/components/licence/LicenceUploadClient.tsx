"use client";

import { useEffect, useState, type ReactNode } from "react";
import {
  rememberUploadLinkAction,
  saveLicenceUploadDetailsAction,
  submitLicenceUploadAction,
} from "@/actions/licence-upload-request";
import { documentLabel, licenceCopy, uploadLinkCopy, type LicenceLocale } from "@/lib/licence-verification/copy";
import { LICENCE_DOCUMENT_TYPES } from "@/lib/licence-verification/types";
import type { PublicApplicantDraft, PublicUploadView } from "@/lib/licence-verification/upload-link";

const IMMIGRATION = [
  ["tourist", "Tourist visa", "วีซ่าท่องเที่ยว"],
  ["non_immigrant", "Non-immigrant visa", "วีซ่า non-immigrant"],
  ["visa_exemption", "Visa exemption or stamp", "ยกเว้นวีซ่าหรือตราประทับ"],
  ["permanent_resident", "Permanent resident", "ผู้มีถิ่นที่อยู่ถาวร"],
  ["thai_citizen", "Thai citizen", "คนไทย"],
  ["other", "Other / not sure", "อื่นๆ / ไม่แน่ใจ"],
] as const;

type DocumentRow = { id: string; documentType: string; originalName: string; active: boolean };

function emptyDraft(prefill: { fullLegalName: string; email: string; phone: string }): PublicApplicantDraft {
  return {
    fullLegalName: prefill.fullLegalName,
    nationality: "",
    dateOfBirth: "",
    passportNumber: "",
    countryOfResidence: "",
    immigrationStatus: "tourist",
    visaExpiryDate: "",
    thaiAddress: "",
    email: prefill.email,
    phone: prefill.phone,
    hasResidenceCertificate: false,
    hasWorkPermit: false,
    hasForeignLicence: true,
    foreignLicenceCountry: "",
    foreignLicenceCategories: "",
    foreignLicenceIssueDate: "",
    foreignLicenceExpiryDate: "",
    foreignLicenceFormat: "physical",
    foreignLicenceLanguage: "english",
    previouslyHeldThaiLicence: false,
    failedOrAttemptedBefore: false,
    attemptNotes: "",
    renewalVehicle: "car",
  };
}

async function shrinkImage(file: File): Promise<File> {
  if (!file.type.startsWith("image/") || typeof createImageBitmap !== "function") return file;
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, 1800 / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(bitmap.width * scale));
  canvas.height = Math.max(1, Math.round(bitmap.height * scale));
  const context = canvas.getContext("2d");
  if (!context) return file;
  context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.85));
  if (!blob) return file;
  return new File([blob], file.name.replace(/\.\w+$/, ".jpg"), { type: "image/jpeg" });
}

function uploadFile(input: {
  token: string;
  file: File;
  documentType: string;
  replacesDocumentId?: string;
  onProgress: (value: number) => void;
}): Promise<DocumentRow> {
  return new Promise((resolve, reject) => {
    const body = new FormData();
    body.set("token", input.token);
    body.set("documentType", input.documentType);
    body.set("file", input.file);
    if (input.replacesDocumentId) body.set("replacesDocumentId", input.replacesDocumentId);
    const xhr = new XMLHttpRequest();
    xhr.open("POST", "/api/licence-verification/upload-link");
    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) input.onProgress(Math.round((event.loaded / event.total) * 100));
    };
    xhr.onload = () => {
      const payload = JSON.parse(xhr.responseText || "{}") as { ok?: boolean; error?: string; document?: DocumentRow };
      if (xhr.status >= 200 && xhr.status < 300 && payload.ok && payload.document) resolve(payload.document);
      else reject(new Error(payload.error || "Upload failed."));
    };
    xhr.onerror = () => reject(new Error("Upload failed."));
    xhr.send(body);
  });
}

export function LicenceUploadClient({
  locale,
  token,
  initial,
}: {
  locale: string;
  token: string;
  initial: PublicUploadView;
}) {
  const lang: LicenceLocale = locale === "th" ? "th" : "en";
  const copy = uploadLinkCopy(lang);
  const fields = licenceCopy(lang);
  const open = initial.blocked ? null : initial;
  const [draft, setDraft] = useState<PublicApplicantDraft>(
    open?.applicant ?? emptyDraft(open?.prefill ?? { fullLegalName: "", email: "", phone: "" })
  );
  const [documents, setDocuments] = useState<DocumentRow[]>(open?.documents ?? []);
  const [checklist, setChecklist] = useState(open?.checklist ?? []);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [progress, setProgress] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(open?.submitted ?? false);
  const [result, setResult] = useState<string | null>(null);
  const [extraType, setExtraType] = useState(open?.checklist[0]?.type ?? "passport");

  useEffect(() => {
    if (!initial.blocked) void rememberUploadLinkAction(token);
  }, [initial.blocked, token]);

  function set<K extends keyof PublicApplicantDraft>(key: K, value: PublicApplicantDraft[K]) {
    setDraft((current) => ({ ...current, [key]: value }));
  }

  async function sendFile(file: File, documentType: string, replacesDocumentId?: string) {
    setError(null);
    setProgress(5);
    try {
      const prepared = await shrinkImage(file);
      const document = await uploadFile({
        token,
        file: prepared,
        documentType,
        replacesDocumentId,
        onProgress: setProgress,
      });
      setDocuments((current) => {
        const next = replacesDocumentId ? current.filter((item) => item.id !== replacesDocumentId) : current;
        return [document, ...next.filter((item) => item.id !== document.id)];
      });
      setChecklist((current) => current.map((item) => item.type === documentType ? { ...item, uploaded: true } : item));
      setNotice(null);
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : "Upload failed.");
    } finally {
      setProgress(null);
    }
  }

  async function save() {
    setSaving(true);
    setError(null);
    const saved = await saveLicenceUploadDetailsAction(token, {
      ...draft,
      hasForeignLicence: open?.conversion ? true : draft.hasForeignLicence,
      visaExpiryDate: draft.immigrationStatus === "thai_citizen" ? "" : draft.visaExpiryDate,
    }, lang);
    setSaving(false);
    if (!saved.ok) {
      setError(saved.error);
      return false;
    }
    setNotice(copy.saved);
    return true;
  }

  async function submit() {
    setSubmitting(true);
    setError(null);
    const ready = await save();
    if (!ready) {
      setSubmitting(false);
      return;
    }
    const response = await submitLicenceUploadAction(token);
    setSubmitting(false);
    if (!response.ok) {
      setError(response.error);
      return;
    }
    setSubmitted(true);
    setResult(response.summary || copy.submittedBody);
  }

  if (initial.blocked) {
    return (
      <Shell>
        <h1 className="text-2xl font-bold text-[#2344b0]">{copy.title}</h1>
        <p className="mt-4 rounded-2xl border border-[#ffce2d] bg-[#fff8dc] p-4 text-base text-[#1e293b]">
          {initial.reason === "revoked" ? copy.revoked : copy.expired}
        </p>
        <p className="mt-3 text-sm text-slate-600">{initial.referenceNumber}</p>
        <p className="mt-2 text-sm text-slate-600">{copy.contact}</p>
      </Shell>
    );
  }

  const thai = draft.immigrationStatus === "thai_citizen" || draft.nationality.trim().toLowerCase() === "thai";
  const received = documents.filter((item) => item.active);

  return (
    <Shell>
      <p className="text-sm font-semibold uppercase tracking-wide text-[#2c54c6]">{initial.serviceTitle}</p>
      <h1 className="mt-1 text-2xl font-bold text-[#0f172a]">{copy.title}</h1>
      <p className="mt-2 text-base text-slate-700">{copy.lead}</p>
      <dl className="mt-4 grid grid-cols-2 gap-3 rounded-2xl bg-white p-4 shadow-sm">
        <div>
          <dt className="text-xs text-slate-500">{copy.reference}</dt>
          <dd className="font-semibold text-[#2c54c6]">{initial.referenceNumber}</dd>
        </div>
        <div>
          <dt className="text-xs text-slate-500">{copy.service}</dt>
          <dd className="font-semibold">{initial.serviceTitle}</dd>
        </div>
      </dl>

      {error ? <p className="mt-4 rounded-xl bg-red-50 px-3 py-2 text-sm text-red-800">{error}</p> : null}
      {notice ? <p className="mt-4 rounded-xl bg-emerald-50 px-3 py-2 text-sm text-emerald-900">{notice}</p> : null}
      {progress != null ? (
        <div className="mt-4">
          <p className="text-sm font-medium text-[#2c54c6]">{copy.uploading} {progress}%</p>
          <div className="mt-1 h-2 rounded-full bg-slate-200">
            <div className="h-2 rounded-full bg-[#ffce2d]" style={{ width: `${progress}%` }} />
          </div>
        </div>
      ) : null}

      {submitted ? (
        <section className="mt-4 rounded-2xl border border-[#ffce2d] bg-white p-4">
          <h2 className="text-lg font-bold text-[#2344b0]">{copy.submittedTitle}</h2>
          <p className="mt-2 text-sm text-slate-700">{result || copy.submittedBody}</p>
          <p className="mt-3 text-sm text-slate-600">{fields.disclaimer}</p>
        </section>
      ) : null}

      <section className="mt-6">
        <h2 className="text-lg font-bold">{copy.checklist}</h2>
        <ul className="mt-3 space-y-3">
          {checklist.map((item) => (
            <li key={item.type} className="rounded-2xl bg-white p-4 shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-semibold">{item.label}</p>
                  <p className="text-sm text-slate-500">{item.uploaded ? copy.received : copy.stillNeeded}</p>
                </div>
                <label className="min-h-11 shrink-0 rounded-xl bg-[#2c54c6] px-3 py-2 text-sm font-semibold text-white">
                  {copy.capture}
                  <input
                    className="sr-only"
                    type="file"
                    accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png"
                    capture="environment"
                    onChange={(event) => {
                      const file = event.target.files?.[0];
                      event.target.value = "";
                      if (file) void sendFile(file, item.type);
                    }}
                  />
                </label>
              </div>
            </li>
          ))}
        </ul>
      </section>

      {received.length > 0 ? (
        <section className="mt-6">
          <h2 className="text-lg font-bold">{copy.received}</h2>
          <ul className="mt-3 space-y-2">
            {received.map((doc) => (
              <li key={doc.id} className="flex items-center justify-between gap-3 rounded-2xl bg-white px-4 py-3 shadow-sm">
                <div>
                  <p className="text-sm font-semibold">{documentLabel(doc.documentType, lang)}</p>
                  <p className="text-xs text-slate-500">{doc.originalName}</p>
                </div>
                <label className="min-h-11 rounded-xl border border-[#2c54c6] px-3 py-2 text-sm font-semibold text-[#2c54c6]">
                  {copy.replace}
                  <input
                    className="sr-only"
                    type="file"
                    accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png"
                    capture="environment"
                    onChange={(event) => {
                      const file = event.target.files?.[0];
                      event.target.value = "";
                      if (file) void sendFile(file, doc.documentType, doc.id);
                    }}
                  />
                </label>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section className="mt-6 rounded-2xl bg-white p-4 shadow-sm">
        <h2 className="font-bold">{copy.addFiles}</h2>
        <p className="mt-1 text-xs text-slate-500">{copy.fileTypes}</p>
        <label className="mt-3 block text-sm">
          {copy.chooseType}
          <select className="mt-1 min-h-11 w-full rounded-xl border px-3" value={extraType} onChange={(event) => setExtraType(event.target.value)}>
            {LICENCE_DOCUMENT_TYPES.map((type) => (
              <option key={type} value={type}>{documentLabel(type, lang)}</option>
            ))}
          </select>
        </label>
        <label className="mt-3 flex min-h-11 items-center justify-center rounded-xl bg-[#ffce2d] px-3 py-3 text-sm font-bold text-[#2344b0]">
          {copy.capture}
          <input
            className="sr-only"
            type="file"
            multiple
            accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png"
            capture="environment"
            onChange={(event) => {
              const files = [...(event.target.files ?? [])];
              event.target.value = "";
              void (async () => {
                for (const file of files) await sendFile(file, extraType);
              })();
            }}
          />
        </label>
      </section>

      <form
        className="mt-6 space-y-3 rounded-2xl bg-white p-4 shadow-sm"
        onSubmit={(event) => {
          event.preventDefault();
          void submit();
        }}
      >
        <h2 className="text-lg font-bold">{copy.details}</h2>
        <Field label={fields.name} value={draft.fullLegalName} onChange={(value) => set("fullLegalName", value)} />
        <Field label={fields.nationality} value={draft.nationality} onChange={(value) => set("nationality", value)} />
        <Field label={fields.dob} type="date" value={draft.dateOfBirth} onChange={(value) => set("dateOfBirth", value)} />
        <Field label={fields.passport} value={draft.passportNumber} onChange={(value) => set("passportNumber", value)} autoComplete="off" />
        <Field label={fields.residenceCountry} value={draft.countryOfResidence} onChange={(value) => set("countryOfResidence", value)} />
        <label className="block text-sm">
          {fields.immigration}
          <select className="mt-1 min-h-11 w-full rounded-xl border px-3" value={draft.immigrationStatus} onChange={(event) => set("immigrationStatus", event.target.value)}>
            {IMMIGRATION.map(([value, en, th]) => (
              <option key={value} value={value}>{lang === "th" ? th : en}</option>
            ))}
          </select>
        </label>
        {thai ? null : <Field label={fields.visaExpiry} type="date" value={draft.visaExpiryDate} onChange={(value) => set("visaExpiryDate", value)} />}
        <label className="block text-sm">
          {fields.address}
          <textarea className="mt-1 min-h-24 w-full rounded-xl border px-3 py-2" value={draft.thaiAddress} onChange={(event) => set("thaiAddress", event.target.value)} />
        </label>
        <Field label={fields.email} type="email" value={draft.email} onChange={(value) => set("email", value)} />
        <Field label={fields.phone} value={draft.phone} onChange={(value) => set("phone", value)} />
        <YesNo label={fields.residenceCert} value={draft.hasResidenceCertificate} onChange={(value) => set("hasResidenceCertificate", value)} yes={fields.yes} no={fields.no} />
        <YesNo label={fields.workPermit} value={draft.hasWorkPermit} onChange={(value) => set("hasWorkPermit", value)} yes={fields.yes} no={fields.no} />
        {open?.renewalNeeded ? (
          <label className="block text-sm">
            {fields.vehicle}
            <select className="mt-1 min-h-11 w-full rounded-xl border px-3" value={draft.renewalVehicle} onChange={(event) => set("renewalVehicle", event.target.value as PublicApplicantDraft["renewalVehicle"])}>
              <option value="car">{fields.car}</option>
              <option value="bike">{fields.motorcycle}</option>
              <option value="both">{fields.both}</option>
            </select>
          </label>
        ) : null}
        {open?.conversion || draft.hasForeignLicence ? (
          <div className="space-y-3 rounded-xl bg-slate-50 p-3">
            <YesNo label={fields.foreignLicence} value={draft.hasForeignLicence || Boolean(open?.conversion)} onChange={(value) => set("hasForeignLicence", value)} yes={fields.yes} no={fields.no} />
            <Field label={fields.country} value={draft.foreignLicenceCountry} onChange={(value) => set("foreignLicenceCountry", value)} />
            <Field label={fields.categories} value={draft.foreignLicenceCategories} onChange={(value) => set("foreignLicenceCategories", value)} />
            <Field label={fields.issued} type="date" value={draft.foreignLicenceIssueDate} onChange={(value) => set("foreignLicenceIssueDate", value)} />
            <Field label={fields.expires} type="date" value={draft.foreignLicenceExpiryDate} onChange={(value) => set("foreignLicenceExpiryDate", value)} />
            <label className="block text-sm">
              {fields.format}
              <select className="mt-1 min-h-11 w-full rounded-xl border px-3" value={draft.foreignLicenceFormat} onChange={(event) => set("foreignLicenceFormat", event.target.value as "physical" | "digital")}>
                <option value="physical">{fields.physical}</option>
                <option value="digital">{fields.digital}</option>
              </select>
            </label>
            <label className="block text-sm">
              {fields.language}
              <select className="mt-1 min-h-11 w-full rounded-xl border px-3" value={draft.foreignLicenceLanguage} onChange={(event) => set("foreignLicenceLanguage", event.target.value as "english" | "other")}>
                <option value="english">{fields.english}</option>
                <option value="other">{fields.otherLanguage}</option>
              </select>
            </label>
          </div>
        ) : (
          <YesNo label={fields.foreignLicence} value={draft.hasForeignLicence} onChange={(value) => set("hasForeignLicence", value)} yes={fields.yes} no={fields.no} />
        )}
        <YesNo label={fields.heldThai} value={draft.previouslyHeldThaiLicence} onChange={(value) => set("previouslyHeldThaiLicence", value)} yes={fields.yes} no={fields.no} />
        <YesNo label={fields.attempted} value={draft.failedOrAttemptedBefore} onChange={(value) => set("failedOrAttemptedBefore", value)} yes={fields.yes} no={fields.no} />
        <div className="flex flex-col gap-2 pt-2">
          <button type="button" disabled={saving || submitting} onClick={() => void save()} className="min-h-12 rounded-xl border border-[#2c54c6] px-4 font-semibold text-[#2c54c6] disabled:opacity-50">
            {copy.save}
          </button>
          <button type="submit" disabled={saving || submitting} className="min-h-12 rounded-xl bg-[#2c54c6] px-4 font-bold text-white disabled:opacity-50">
            {submitting ? copy.submitting : copy.submit}
          </button>
        </div>
        <p className="text-xs text-slate-500">{fields.disclaimer}</p>
      </form>
    </Shell>
  );
}

function Shell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-[#eef2fb] text-[#0f172a]">
      <header className="bg-[#2c54c6] text-white">
        <div className="mx-auto flex max-w-lg items-center justify-between px-4 py-4">
          <p className="text-lg font-bold tracking-tight">SiamEZ</p>
          <span className="rounded-full bg-[#ffce2d] px-3 py-1 text-xs font-bold text-[#2344b0]">Driving licence</span>
        </div>
      </header>
      <main className="mx-auto max-w-lg px-4 py-6">{children}</main>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  type = "text",
  autoComplete,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  autoComplete?: string;
}) {
  return (
    <label className="block text-sm">
      {label}
      <input
        className="mt-1 min-h-11 w-full rounded-xl border px-3 text-base"
        type={type}
        value={value}
        autoComplete={autoComplete}
        onChange={(event) => onChange(event.target.value)}
      />
    </label>
  );
}

function YesNo({
  label,
  value,
  onChange,
  yes,
  no,
}: {
  label: string;
  value: boolean;
  onChange: (value: boolean) => void;
  yes: string;
  no: string;
}) {
  return (
    <fieldset>
      <legend className="text-sm">{label}</legend>
      <div className="mt-1 grid grid-cols-2 gap-2">
        <button type="button" className={`min-h-11 rounded-xl border font-semibold ${value ? "border-[#2c54c6] bg-[#2c54c6] text-white" : ""}`} onClick={() => onChange(true)}>{yes}</button>
        <button type="button" className={`min-h-11 rounded-xl border font-semibold ${!value ? "border-[#2c54c6] bg-[#2c54c6] text-white" : ""}`} onClick={() => onChange(false)}>{no}</button>
      </div>
    </fieldset>
  );
}
