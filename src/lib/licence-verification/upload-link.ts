import { buildChecklist, statusForOutcome } from "@/lib/licence-verification/assess";
import { quotationGateDecision } from "@/lib/licence-verification/gate";
import { DEFAULT_LICENCE_RULES } from "@/lib/licence-verification/rules-data";
import {
  DOCUMENT_LABELS,
  isLicenceDocumentType,
  isLicenceServiceKind,
  type ApplicantProfile,
  type AssessmentOutcome,
  type LicenceServiceKind,
  type ScreeningRule,
} from "@/lib/licence-verification/types";

export const UPLOAD_LINK_STATUSES = ["ACTIVE", "OPENED", "SUBMITTED", "EXPIRED", "REVOKED"] as const;
export type UploadLinkStatus = (typeof UPLOAD_LINK_STATUSES)[number];

export const DEFAULT_UPLOAD_MESSAGE_TEMPLATE = `Thank you for contacting SiamEZ!

To help us check your Thai driving licence application and confirm which documents you need, please complete the secure application form using the link below.

[UPLOAD LINK]

Once submitted, our team will review your documents and let you know if anything else is required before preparing your quotation.`;

const DOCUMENT_EVALUATOR: Record<string, string> = {
  document_passport: "passport",
  document_visa: "visa_or_entry",
  document_residence: "residence_certificate",
  document_work_permit: "work_permit",
  document_foreign_front: "foreign_licence_front",
  document_foreign_back: "foreign_licence_back",
  document_idp: "international_driving_permit",
  document_medical: "medical_certificate",
  document_previous_thai: "previous_thai_licence",
};

const TERMINAL_APPLICATION_STATUSES = new Set(["REJECTED", "BOOKING_CONFIRMED"]);
const CUSTOMER_UPLOAD_STATUSES = new Set([
  "DRAFT",
  "AWAITING_DOCUMENTS",
  "CORRECTIONS_REQUIRED",
  "MANUAL_REVIEW",
  "READY_FOR_STAFF_REVIEW",
]);

export type ServicePath = "new" | "conversion" | "renewal" | "lost" | "idp";
export type ServiceVehicle = "car" | "motorcycle" | "both";

export function serviceKindFromSelection(path: ServicePath, vehicle: ServiceVehicle): LicenceServiceKind {
  if (path === "renewal") return "RENEWAL";
  if (path === "lost") return "LOST_REPLACEMENT";
  if (path === "idp") return "IDP";
  const suffix = vehicle === "motorcycle" ? "MOTORCYCLE" : vehicle === "both" ? "BOTH" : "CAR";
  return path === "new" ? (`NEW_${suffix}` as LicenceServiceKind) : (`CONVERSION_${suffix}` as LicenceServiceKind);
}

export function renewalVehicleFor(
  kind: LicenceServiceKind,
  vehicle: ServiceVehicle | "car" | "bike" | "both" | null | undefined
): "car" | "bike" | "both" | null {
  if (kind === "IDP") return null;
  if (vehicle === "motorcycle" || vehicle === "bike") return "bike";
  if (vehicle === "both") return "both";
  if (vehicle === "car") return "car";
  if (kind.endsWith("_MOTORCYCLE")) return "bike";
  if (kind.endsWith("_BOTH")) return "both";
  if (kind.endsWith("_CAR")) return "car";
  return null;
}

/** Typical foreign customer used to preview the checklist before the questionnaire exists. */
export function previewApplicant(kind: LicenceServiceKind): ApplicantProfile {
  const conversion = kind.startsWith("CONVERSION_");
  const held = kind === "RENEWAL" || kind === "LOST_REPLACEMENT" || kind === "IDP";
  return {
    fullLegalName: "Preview Customer",
    nationality: "British",
    dateOfBirth: "1990-01-01",
    passportNumber: "",
    countryOfResidence: "United Kingdom",
    immigrationStatus: "non_immigrant",
    visaExpiryDate: "2027-01-01",
    thaiAddress: "Bangkok",
    hasResidenceCertificate: true,
    hasWorkPermit: false,
    hasForeignLicence: conversion,
    foreignLicenceCountry: conversion ? "United Kingdom" : null,
    foreignLicenceCategories: conversion ? "B" : null,
    foreignLicenceIssueDate: conversion ? "2020-01-01" : null,
    foreignLicenceExpiryDate: conversion ? "2030-01-01" : null,
    foreignLicenceFormat: conversion ? "physical" : null,
    foreignLicenceLanguage: conversion ? "english" : null,
    previouslyHeldThaiLicence: held,
    failedOrAttemptedBefore: false,
    attemptNotes: null,
    renewalVehicle: held && kind !== "IDP" ? "car" : null,
  };
}

export function requiredChecklist(
  kind: LicenceServiceKind,
  rules: ScreeningRule[] = DEFAULT_LICENCE_RULES,
  applicant?: ApplicantProfile
): string[] {
  const rows = buildChecklist({
    serviceKind: kind,
    applicant: applicant ?? previewApplicant(kind),
    documents: [],
    rules,
    findings: [],
  });
  const required = rows.filter((row) => row.required).map((row) => row.documentType);
  if (required.length > 0) return required;
  return Object.values(DOCUMENT_EVALUATOR).filter((type) => type === "passport");
}

export function parseChecklist(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  const items: string[] = [];
  for (const item of value) {
    if (typeof item === "string" && isLicenceDocumentType(item) && !items.includes(item)) items.push(item);
  }
  return items;
}

export function mergeChecklist(existing: string[], extra: string[]): string[] {
  return parseChecklist([...existing, ...extra]);
}

export function checklistForRequest(
  kind: LicenceServiceKind,
  extra: string[] = [],
  rules: ScreeningRule[] = DEFAULT_LICENCE_RULES,
  applicant?: ApplicantProfile
): string[] {
  return mergeChecklist(requiredChecklist(kind, rules, applicant), extra);
}

export function planFollowUp(input: {
  applicationId: string;
  existingChecklist: string[];
  extraDocuments: string[];
}): { applicationId: string; checklist: string[]; createsNewApplication: false } {
  return {
    applicationId: input.applicationId,
    checklist: mergeChecklist(input.existingChecklist, input.extraDocuments),
    createsNewApplication: false,
  };
}

export function outstandingDocuments(checklist: string[], uploadedTypes: string[]): string[] {
  const have = new Set(uploadedTypes);
  return parseChecklist(checklist).filter((item) => !have.has(item));
}

export function uploadLinkDecision(input: {
  status: UploadLinkStatus;
  expiresAt: Date | string | null;
  now: Date;
}): { acceptUploads: boolean; effectiveStatus: UploadLinkStatus; reason: "ok" | "expired" | "revoked" } {
  if (input.status === "REVOKED") {
    return { acceptUploads: false, effectiveStatus: "REVOKED", reason: "revoked" };
  }
  const expires = input.expiresAt ? new Date(input.expiresAt) : null;
  const expired = input.status === "EXPIRED" || (expires != null && !Number.isNaN(expires.getTime()) && expires.getTime() <= input.now.getTime());
  if (expired) return { acceptUploads: false, effectiveStatus: "EXPIRED", reason: "expired" };
  return { acceptUploads: true, effectiveStatus: input.status, reason: "ok" };
}

export function parseExpiry(value: string | null | undefined, now: Date): Date | null {
  if (!value?.trim()) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) throw new Error("Enter a valid expiry date.");
  if (date.getTime() <= now.getTime()) throw new Error("The link expiry must be in the future.");
  if (date.getTime() - now.getTime() > 180 * 24 * 60 * 60 * 1000) {
    throw new Error("A link can stay open for 180 days at most.");
  }
  return date;
}

export function isRoutableEmail(value: string | null | undefined): boolean {
  if (!value) return false;
  const email = value.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return false;
  if (email.endsWith(".invalid")) return false;
  return true;
}

export function stripSecrets(text: string, secrets: Array<string | null | undefined>): string {
  let out = text;
  for (const secret of secrets) {
    const value = secret?.trim();
    if (!value || value.length < 5) continue;
    out = out.split(value).join("[redacted]");
  }
  return out.replace(/passport(?:\s+number)?\s*[:#-]?\s*[A-Za-z0-9]{5,12}/gi, "passport [redacted]");
}

export function buildUploadCustomerMessage(input: {
  link: string;
  note?: string | null;
  passportNumber?: string | null;
}): string {
  const link = input.link.trim();
  const body = DEFAULT_UPLOAD_MESSAGE_TEMPLATE.replace("[UPLOAD LINK]", link);
  const note = stripSecrets(input.note?.trim() ?? "", [input.passportNumber]);
  const combined = note ? `${body}\n\n${note}` : body;
  return stripSecrets(combined, [input.passportNumber]).trim();
}

export function channelPlan(input: { email: string | null | undefined; canPostChat: boolean }): {
  chat: "post" | "copy_only";
  email: "send" | "copy_only";
  push: "if_registered";
  line: "copy_only";
  whatsapp: "copy_only";
  copy: "available";
} {
  return {
    chat: input.canPostChat ? "post" : "copy_only",
    email: isRoutableEmail(input.email) ? "send" : "copy_only",
    push: "if_registered",
    line: "copy_only",
    whatsapp: "copy_only",
    copy: "available",
  };
}

export function applicationAcceptsCustomerUpload(status: string): boolean {
  return CUSTOMER_UPLOAD_STATUSES.has(status);
}

export function applicationIsTerminal(status: string): boolean {
  return TERMINAL_APPLICATION_STATUSES.has(status);
}

/** An AI outcome never unlocks a quotation or an invoice. Staff approval does. */
export function assessmentAllowsInvoice(outcome: AssessmentOutcome): boolean {
  return quotationGateDecision({
    status: statusForOutcome(outcome),
    referenceNumber: "DLV-SCREEN",
  }).allowed;
}

export function quotationEligible(status: string, referenceNumber: string): boolean {
  return quotationGateDecision({ status, referenceNumber }).allowed;
}

export function assertServiceKind(value: string): LicenceServiceKind {
  if (!isLicenceServiceKind(value)) throw new Error("Choose a driving licence service.");
  return value;
}

export function documentLabel(type: string): string {
  return DOCUMENT_LABELS[type] ?? type;
}

export type PublicApplicantDraft = {
  fullLegalName: string;
  nationality: string;
  dateOfBirth: string;
  passportNumber: string;
  countryOfResidence: string;
  immigrationStatus: string;
  visaExpiryDate: string;
  thaiAddress: string;
  email: string;
  phone: string;
  hasResidenceCertificate: boolean;
  hasWorkPermit: boolean;
  hasForeignLicence: boolean;
  foreignLicenceCountry: string;
  foreignLicenceCategories: string;
  foreignLicenceIssueDate: string;
  foreignLicenceExpiryDate: string;
  foreignLicenceFormat: "physical" | "digital";
  foreignLicenceLanguage: "english" | "other";
  previouslyHeldThaiLicence: boolean;
  failedOrAttemptedBefore: boolean;
  attemptNotes: string;
  renewalVehicle: "car" | "bike" | "both";
};

export type PublicUploadView =
  | {
      blocked: true;
      reason: "expired" | "revoked";
      referenceNumber: string;
      serviceTitle: string;
    }
  | {
      blocked: false;
      referenceNumber: string;
      serviceKind: LicenceServiceKind;
      serviceTitle: string;
      checklist: { type: string; label: string; uploaded: boolean }[];
      documents: { id: string; documentType: string; originalName: string; active: boolean }[];
      applicant: PublicApplicantDraft | null;
      prefill: { fullLegalName: string; email: string; phone: string };
      submitted: boolean;
      renewalNeeded: boolean;
      conversion: boolean;
    };

export type LicenceChatCard = {
  requestId: string;
  applicationId: string;
  referenceNumber: string;
  serviceKind: LicenceServiceKind;
  serviceLabel: string;
  customerName: string;
  email: string | null;
  phone: string | null;
  linkStatus: UploadLinkStatus;
  expiresAt: string | null;
  applicationStatus: string;
  quotationEligible: boolean;
  aiOutcome: string | null;
  aiSummary: string | null;
  documents: {
    id: string;
    documentType: string;
    label: string;
    originalName: string;
    active: boolean;
    replacesDocumentId: string | null;
  }[];
  outstanding: string[];
  checklist: string[];
  timeline: { id: string; event: string; detail: string; createdAt: string }[];
  link: string;
  adminHref: string;
  createdAt: string;
};
