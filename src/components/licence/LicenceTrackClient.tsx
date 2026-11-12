"use client";

import { useEffect, useState } from "react";
import { useRouter } from "@/i18n/navigation";
import { acceptLicenceQuotationAction, assessLicenceByTokenAction, rememberLicenceAccessAction } from "@/actions/licence-verification";
import { licenceCopy, serviceTitle, type LicenceLocale } from "@/lib/licence-verification/copy";
import { DOCUMENT_LABELS, LICENCE_DOCUMENT_TYPES, type LicenceServiceKind } from "@/lib/licence-verification/types";

type Finding = {
  id: string;
  documentType: string | null;
  status: string;
  message: string;
  recommendedAction: string;
};

type DocumentRow = {
  id: string;
  documentType: string;
  originalName: string;
  mimeType: string;
  active: boolean;
};

export type TrackApplication = {
  referenceNumber: string;
  serviceKind: LicenceServiceKind;
  status: string;
  email: string;
  applicant: { fullLegalName: string } | null;
  documents: DocumentRow[];
  assessment: {
    outcome: string;
    confidence: number;
    summary: string;
    nextSteps: string;
    disclaimer: string;
    findings: Finding[];
  } | null;
  quote: { quoteNumber: string | null; amount: number; currency: string; requiresHumanReview: boolean } | null;
  booking: { caseNumber: string } | null;
  appointment: {
    appointmentDate: string | null;
    appointmentTime: string | null;
    confirmationNumber: string | null;
    specialInstructions: string;
    office: { nameEn: string; nameTh: string; province: string; address: string; phone: string; specialRequirements: string } | null;
  } | null;
};

const STEPS = [
  "Application submitted",
  "Documents received",
  "AI verification",
  "Corrections",
  "SiamEZ staff review",
  "Approved for quotation",
  "Quotation sent",
  "Booking confirmed",
];

const TONE: Record<string, string> = {
  ACCEPTABLE: "border-emerald-200 bg-emerald-50 text-emerald-900",
  CLARIFICATION: "border-amber-200 bg-amber-50 text-amber-950",
  UNSUITABLE: "border-red-200 bg-red-50 text-red-900",
  MISSING: "border-red-200 bg-red-50 text-red-900",
  MANUAL: "border-sky-200 bg-sky-50 text-sky-950",
};

function currentStep(status: string, hasDocuments: boolean, hasAssessment: boolean): number {
  if (status === "BOOKING_CONFIRMED") return 7;
  if (status === "QUOTATION_SENT") return 6;
  if (status === "APPROVED_FOR_QUOTATION") return 5;
  if (status === "CORRECTIONS_REQUIRED") return 3;
  if (status === "MANUAL_REVIEW" || status === "READY_FOR_STAFF_REVIEW") return 4;
  if (status === "AI_IN_PROGRESS" || hasAssessment) return 2;
  if (hasDocuments) return 1;
  return 0;
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
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.82));
  if (!blob) return file;
  return new File([blob], file.name.replace(/\.\w+$/, "") + ".jpg", { type: "image/jpeg" });
}

export function LicenceTrackClient({
  locale,
  token,
  application,
}: {
  locale: string;
  token: string;
  application: TrackApplication;
}) {
  const lang: LicenceLocale = locale === "th" ? "th" : "en";
  const copy = licenceCopy(lang);
  const router = useRouter();
  useEffect(() => {
    void rememberLicenceAccessAction(token);
  }, [token]);
  const [documentType, setDocumentType] = useState("passport");
  const [message, setMessage] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const step = currentStep(application.status, application.documents.length > 0, Boolean(application.assessment));
  const canUpload = ["AWAITING_DOCUMENTS", "CORRECTIONS_REQUIRED", "MANUAL_REVIEW", "READY_FOR_STAFF_REVIEW", "DRAFT"].includes(application.status);
  const canCheck = application.status === "AWAITING_DOCUMENTS" || application.status === "CORRECTIONS_REQUIRED";
  const canAccept = application.status === "QUOTATION_SENT" && application.quote && !application.quote.requiresHumanReview;

  async function upload(file: File, replacesDocumentId?: string) {
    setPending(true);
    setMessage(null);
    const prepared = await shrinkImage(file);
    const body = new FormData();
    body.set("token", token);
    body.set("documentType", documentType);
    if (replacesDocumentId) body.set("replacesDocumentId", replacesDocumentId);
    body.set("file", prepared);
    const response = await fetch("/api/licence-verification/upload", { method: "POST", body });
    const payload = (await response.json()) as { ok: boolean; error?: string };
    setPending(false);
    if (!payload.ok) {
      setMessage(payload.error ?? "Upload failed.");
      return;
    }
    router.refresh();
  }

  async function assess() {
    setPending(true);
    setMessage(null);
    const result = await assessLicenceByTokenAction(token);
    setPending(false);
    if (!result.ok) setMessage(result.error);
    router.refresh();
  }

  async function accept() {
    setPending(true);
    const result = await acceptLicenceQuotationAction(token, locale);
    setPending(false);
    if (!result.ok) {
      setMessage(result.error);
      return;
    }
    window.location.href = result.checkoutPath;
  }

  return (
    <div className="mx-auto max-w-xl px-4 py-8">
      <p className="text-sm font-semibold text-siam-blue">{application.referenceNumber}</p>
      <h1 className="mt-1 text-2xl font-bold text-gray-900 dark:text-white">{application.applicant?.fullLegalName}</h1>
      <p className="mt-1 text-gray-600 dark:text-gray-300">{serviceTitle(application.serviceKind, lang)}</p>
      {application.status === "REJECTED" ? (
        <p className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900">This application was not accepted. Check your email for the reason.</p>
      ) : (
        <ol className="mt-6 space-y-2">
          {STEPS.map((label, index) => (
            <li key={label} className="flex items-center gap-3 text-sm">
              <span className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold ${index < step ? "bg-emerald-600 text-white" : index === step ? "bg-siam-yellow text-gray-900" : "bg-gray-200 text-gray-600"}`}>{index + 1}</span>
              <span className={index === step ? "font-semibold" : ""}>{label}</span>
            </li>
          ))}
        </ol>
      )}

      {application.assessment ? (
        <section className="mt-8 rounded-2xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-900">
          <h2 className="font-semibold">Screening result: {application.assessment.outcome.replaceAll("_", " ")}</h2>
          <p className="mt-2 text-sm leading-relaxed">{application.assessment.summary}</p>
          <p className="mt-2 text-sm text-gray-500">Confidence {Math.round(application.assessment.confidence * 100)}%</p>
          <ul className="mt-4 space-y-3">
            {application.assessment.findings.map((finding) => (
              <li key={finding.id} className={`rounded-xl border px-3 py-3 text-sm ${TONE[finding.status] ?? TONE.MANUAL}`}>
                <p className="font-semibold">{finding.documentType ? DOCUMENT_LABELS[finding.documentType] ?? finding.documentType : "Application"}</p>
                <p className="mt-1">{finding.message}</p>
                <p className="mt-1">{finding.recommendedAction}</p>
              </li>
            ))}
          </ul>
          <p className="mt-4 text-xs leading-relaxed text-gray-500">{application.assessment.disclaimer}</p>
        </section>
      ) : null}

      {message ? <p className="mt-4 rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-950" role="status">{message}</p> : null}

      {canUpload ? (
        <section className="mt-8 space-y-4">
          <h2 className="font-semibold">{copy.upload}</h2>
          <label className="block text-sm font-medium">
            Document
            <select className="mt-1 w-full rounded-xl border px-3 py-3" value={documentType} onChange={(event) => setDocumentType(event.target.value)}>
              {LICENCE_DOCUMENT_TYPES.map((type) => <option key={type} value={type}>{DOCUMENT_LABELS[type]}</option>)}
            </select>
          </label>
          <label className="flex cursor-pointer flex-col items-center rounded-2xl border-2 border-dashed border-siam-blue/40 bg-siam-blue/5 px-4 py-8 text-center">
            <span className="font-semibold text-siam-blue">{copy.upload}</span>
            <span className="mt-1 text-xs text-gray-500">PDF, JPG, or PNG. Photos are reduced on your phone before upload.</span>
            <input className="sr-only" type="file" accept="image/*,application/pdf" capture="environment" onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) void upload(file);
            }} />
          </label>
          <ul className="space-y-2">
            {application.documents.filter((doc) => doc.active).map((doc) => (
              <li key={doc.id} className="rounded-xl border border-gray-200 p-3 text-sm">
                <p className="font-medium">{DOCUMENT_LABELS[doc.documentType] ?? doc.documentType}</p>
                <p className="text-gray-500">{doc.originalName}</p>
                {doc.mimeType.startsWith("image/") ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img alt="" src={`/api/licence-verification/documents/${doc.id}`} className="mt-2 max-h-48 rounded-lg" />
                ) : (
                  <a className="mt-2 inline-block text-siam-blue underline" href={`/api/licence-verification/documents/${doc.id}`}>Open file</a>
                )}
                <label className="mt-2 block text-siam-blue">
                  {copy.replace}
                  <input className="sr-only" type="file" accept="image/*,application/pdf" capture="environment" onChange={(event) => {
                    const file = event.target.files?.[0];
                    if (file) {
                      setDocumentType(doc.documentType);
                      void upload(file, doc.id);
                    }
                  }} />
                </label>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {canCheck ? (
        <button type="button" disabled={pending || application.documents.length === 0} className="mt-6 w-full rounded-xl bg-siam-blue px-4 py-3 font-semibold text-white disabled:opacity-60" onClick={() => void assess()}>
          {pending ? "…" : copy.check}
        </button>
      ) : null}

      {application.quote ? (
        <section className="mt-8 rounded-2xl border border-siam-yellow bg-amber-50 p-4">
          <h2 className="font-semibold">Quotation {application.quote.quoteNumber}</h2>
          <p className="mt-1 text-2xl font-bold">{(application.quote.amount / 100).toLocaleString(lang === "th" ? "th-TH" : "en-US")} {application.quote.currency}</p>
          <p className="mt-2 text-sm">Accepting creates the booking and the invoice. Nothing is charged on this screen.</p>
          {canAccept ? (
            <button type="button" disabled={pending} className="mt-4 w-full rounded-xl bg-gray-900 px-4 py-3 font-semibold text-white" onClick={() => void accept()}>{copy.accept}</button>
          ) : null}
        </section>
      ) : null}

      {application.booking ? <p className="mt-6 text-sm">Booking {application.booking.caseNumber} is confirmed.</p> : null}
      {application.appointment ? (
        <section className="mt-6 rounded-2xl border p-4">
          <h2 className="font-semibold">{lang === "th" ? "นัดหมายกรมการขนส่งทางบก" : "DLT appointment"}</h2>
          <p className="mt-2 text-sm">{application.appointment.appointmentDate} {application.appointment.appointmentTime}</p>
          <p className="mt-1 text-sm">
            {lang === "th" ? application.appointment.office?.nameTh : application.appointment.office?.nameEn}
            {application.appointment.office ? ` · ${application.appointment.office.province}` : ""}
          </p>
          {application.appointment.office?.address ? <p className="mt-1 text-sm">{application.appointment.office.address}</p> : null}
          {application.appointment.office?.phone ? <p className="mt-1 text-sm">{application.appointment.office.phone}</p> : null}
          {application.appointment.confirmationNumber ? <p className="mt-1 text-sm">{lang === "th" ? "เลขยืนยัน" : "Confirmation"} {application.appointment.confirmationNumber}</p> : null}
          <p className="mt-2 text-sm">{lang === "th" ? "นำต้นฉบับเอกสารตามรายการที่ SiamEZ แจ้งไปด้วย" : "Bring the original documents SiamEZ listed for this appointment."}</p>
          {application.appointment.specialInstructions ? <p className="mt-2 text-sm">{application.appointment.specialInstructions}</p> : null}
          {application.appointment.office?.specialRequirements ? <p className="mt-2 text-sm">{application.appointment.office.specialRequirements}</p> : null}
          <p className="mt-2 text-sm">inquiries@siam-ez.com · +66 64 343 8768</p>
        </section>
      ) : null}
      <p className="mt-8 text-xs leading-relaxed text-gray-500">{copy.disclaimer}</p>
    </div>
  );
}
