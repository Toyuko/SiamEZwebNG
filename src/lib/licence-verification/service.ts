import { randomBytes } from "crypto";
import type { Prisma } from "@prisma/client";
import { getServicePricingConfig } from "@/config/pricing";
import { createQuote } from "@/data-access/quote";
import { prisma } from "@/lib/db";
import { createBookingCase } from "@/lib/domain/cases";
import { calculateQuote, computeQuoteExpiry } from "@/lib/pricing/engine";
import { resolveServicePaymentConfig } from "@/lib/payments/service-config";
import { buildPricingSnapshot, buildQuotePaymentPlan } from "@/lib/payments/quote-plan";
import { checkRateLimit } from "@/lib/security/rate-limit";
import { nextCaseNumber } from "@/lib/utils";
import { priorVisitNotes as loadPriorVisitNotes } from "@/lib/dlt-package/lessons";
import { assessApplication, statusForOutcome } from "@/lib/licence-verification/assess";
import { inspectLicenceDocuments } from "@/lib/licence-verification/ai-provider";
import {
  DRIVER_LICENSE_SERVICE_SLUG,
  toDriverLicenseRequirements,
} from "@/lib/licence-verification/catalog";
import { DEFAULT_LICENCE_RULES } from "@/lib/licence-verification/rules-data";
import { notifyLicenceCustomer, type LicenceNoticeTemplate } from "@/lib/licence-verification/notify";
import { readLicenceFile, storeLicenceFile } from "@/lib/licence-verification/storage";
import {
  SCREENING_DISCLAIMER,
  type ApplicantProfile,
  type LicenceServiceKind,
  type ScreeningRule,
  type VehicleChoice,
} from "@/lib/licence-verification/types";
import { profileFromInput, type ApplicantInput } from "@/lib/licence-verification/validation";
import { isLicenceDocumentType } from "@/lib/licence-verification/types";
import { validateUpload } from "@/lib/licence-verification/files";

const OPEN_UPLOAD = new Set([
  "DRAFT",
  "AWAITING_DOCUMENTS",
  "CORRECTIONS_REQUIRED",
  "MANUAL_REVIEW",
  "READY_FOR_STAFF_REVIEW",
]);

export function todayInBangkok(now = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Bangkok" }).format(now);
}

function asDate(iso: string | null | undefined): Date | null {
  if (!iso) return null;
  return new Date(`${iso.slice(0, 10)}T00:00:00.000Z`);
}

function iso(value: Date | null | undefined): string | null {
  if (!value) return null;
  return value.toISOString().slice(0, 10);
}

export function profileFromRow(row: {
  fullLegalName: string;
  nationality: string;
  dateOfBirth: Date;
  passportNumber: string;
  countryOfResidence: string;
  immigrationStatus: string;
  visaExpiryDate: Date | null;
  thaiAddress: string;
  hasResidenceCertificate: boolean;
  hasWorkPermit: boolean;
  hasForeignLicence: boolean;
  foreignLicenceCountry: string | null;
  foreignLicenceCategories: string | null;
  foreignLicenceIssueDate: Date | null;
  foreignLicenceExpiryDate: Date | null;
  foreignLicenceFormat: string | null;
  foreignLicenceLanguage: string | null;
  previouslyHeldThaiLicence: boolean;
  failedOrAttemptedBefore: boolean;
  attemptNotes: string | null;
  renewalVehicle: string | null;
}): ApplicantProfile {
  const vehicle = row.renewalVehicle === "car" || row.renewalVehicle === "bike" || row.renewalVehicle === "both"
    ? row.renewalVehicle
    : null;
  const format = row.foreignLicenceFormat === "physical" || row.foreignLicenceFormat === "digital"
    ? row.foreignLicenceFormat
    : null;
  const language = row.foreignLicenceLanguage === "english" || row.foreignLicenceLanguage === "other"
    ? row.foreignLicenceLanguage
    : null;
  return {
    fullLegalName: row.fullLegalName,
    nationality: row.nationality,
    dateOfBirth: iso(row.dateOfBirth) ?? "",
    passportNumber: row.passportNumber,
    countryOfResidence: row.countryOfResidence,
    immigrationStatus: row.immigrationStatus,
    visaExpiryDate: iso(row.visaExpiryDate),
    thaiAddress: row.thaiAddress,
    hasResidenceCertificate: row.hasResidenceCertificate,
    hasWorkPermit: row.hasWorkPermit,
    hasForeignLicence: row.hasForeignLicence,
    foreignLicenceCountry: row.foreignLicenceCountry,
    foreignLicenceCategories: row.foreignLicenceCategories,
    foreignLicenceIssueDate: iso(row.foreignLicenceIssueDate),
    foreignLicenceExpiryDate: iso(row.foreignLicenceExpiryDate),
    foreignLicenceFormat: format,
    foreignLicenceLanguage: language,
    previouslyHeldThaiLicence: row.previouslyHeldThaiLicence,
    failedOrAttemptedBefore: row.failedOrAttemptedBefore,
    attemptNotes: row.attemptNotes,
    renewalVehicle: vehicle,
  };
}

function applicantCreate(profile: ApplicantProfile) {
  return {
    fullLegalName: profile.fullLegalName,
    nationality: profile.nationality,
    dateOfBirth: asDate(profile.dateOfBirth) ?? new Date(),
    passportNumber: profile.passportNumber,
    countryOfResidence: profile.countryOfResidence,
    immigrationStatus: profile.immigrationStatus,
    visaExpiryDate: asDate(profile.visaExpiryDate),
    thaiAddress: profile.thaiAddress,
    hasResidenceCertificate: profile.hasResidenceCertificate,
    hasWorkPermit: profile.hasWorkPermit,
    hasForeignLicence: profile.hasForeignLicence,
    foreignLicenceCountry: profile.foreignLicenceCountry,
    foreignLicenceCategories: profile.foreignLicenceCategories,
    foreignLicenceIssueDate: asDate(profile.foreignLicenceIssueDate),
    foreignLicenceExpiryDate: asDate(profile.foreignLicenceExpiryDate),
    foreignLicenceFormat: profile.foreignLicenceFormat,
    foreignLicenceLanguage: profile.foreignLicenceLanguage,
    previouslyHeldThaiLicence: profile.previouslyHeldThaiLicence,
    failedOrAttemptedBefore: profile.failedOrAttemptedBefore,
    attemptNotes: profile.attemptNotes,
    renewalVehicle: profile.renewalVehicle,
  };
}

async function history(input: {
  applicationId: string;
  actorId?: string | null;
  event: string;
  fromStatus?: string | null;
  toStatus?: string | null;
  detail: string;
}) {
  await prisma.licenceApplicationHistory.create({
    data: {
      applicationId: input.applicationId,
      actorId: input.actorId || null,
      event: input.event,
      fromStatus: input.fromStatus ?? null,
      toStatus: input.toStatus ?? null,
      detail: input.detail,
    },
  });
}

export async function ensureLicenceRequirements(): Promise<void> {
  const existing = await prisma.licenceRequirement.findMany({ select: { ruleKey: true } });
  const have = new Set(existing.map((row) => row.ruleKey));
  const missing = DEFAULT_LICENCE_RULES.filter((rule) => !have.has(rule.ruleKey));
  if (missing.length === 0) return;
  await prisma.licenceRequirement.createMany({
    data: missing.map((rule) => ({
      ruleKey: rule.ruleKey,
      name: rule.name,
      description: rule.description,
      serviceKinds: rule.serviceKinds,
      customerCategories: rule.customerCategories,
      level: rule.level,
      source: rule.source,
      lastVerifiedOn: asDate(rule.lastVerifiedOn) ?? new Date(),
      active: rule.active,
      evaluatorKey: rule.evaluatorKey,
    })),
  });
}

function toRule(row: {
  ruleKey: string;
  name: string;
  description: string;
  serviceKinds: string[];
  customerCategories: string[];
  level: "REQUIRED" | "OPTIONAL";
  source: string;
  lastVerifiedOn: Date;
  active: boolean;
  evaluatorKey: string;
}): ScreeningRule {
  return {
    ruleKey: row.ruleKey,
    name: row.name,
    description: row.description,
    serviceKinds: row.serviceKinds,
    customerCategories: row.customerCategories,
    level: row.level,
    source: row.source,
    lastVerifiedOn: iso(row.lastVerifiedOn) ?? "",
    active: row.active,
    evaluatorKey: row.evaluatorKey,
  };
}

const applicationInclude = {
  applicant: true,
  documents: { where: { active: true }, orderBy: { createdAt: "asc" as const } },
  assessments: {
    orderBy: { createdAt: "desc" as const },
    take: 1,
    include: { findings: true },
  },
  quote: { select: { id: true, quoteNumber: true, amount: true, currency: true, status: true, requiresHumanReview: true } },
  case: { select: { id: true, caseNumber: true, status: true } },
} satisfies Prisma.LicenceApplicationInclude;

export async function createLicenceApplication(raw: ApplicantInput, userId?: string | null) {
  const { serviceKind, email, phone, locale, profile } = profileFromInput(raw);
  const service = await prisma.service.findUnique({
    where: { slug: DRIVER_LICENSE_SERVICE_SLUG },
    select: { id: true },
  });
  const token = randomBytes(32).toString("hex");
  const created = await prisma.licenceApplication.create({
    data: {
      referenceNumber: nextCaseNumber("DLV"),
      accessToken: token,
      userId: userId ?? null,
      serviceId: service?.id,
      serviceKind,
      status: "AWAITING_DOCUMENTS",
      email,
      phone,
      locale,
      applicant: { create: applicantCreate(profile) },
    },
  });
  await history({
    applicationId: created.id,
    actorId: userId,
    event: "CREATED",
    toStatus: "AWAITING_DOCUMENTS",
    detail: "Customer submitted the questionnaire.",
  });
  return { id: created.id, token, referenceNumber: created.referenceNumber };
}

export async function uploadLicenceDocument(input: {
  token: string;
  documentType: string;
  fileName: string;
  bytes: Buffer;
  declaredType?: string | null;
  replacesDocumentId?: string | null;
  userId?: string | null;
}) {
  const limit = checkRateLimit(`licence-upload:${input.token}`, 40, 60 * 60 * 1000);
  if (!limit.allowed) throw new Error("Too many uploads. Wait a little and try again.");
  if (!isLicenceDocumentType(input.documentType)) throw new Error("Choose a document type from the list.");
  const checked = validateUpload({
    bytes: input.bytes,
    declaredType: input.declaredType,
    size: input.bytes.byteLength,
  });
  if (!checked.ok) throw new Error(checked.error);

  const application = await prisma.licenceApplication.findUnique({
    where: { accessToken: input.token },
    select: { id: true, status: true },
  });
  if (!application) throw new Error("Application not found.");
  if (!OPEN_UPLOAD.has(application.status)) {
    throw new Error("This application is not accepting documents right now.");
  }
  const activeCount = await prisma.licenceDocument.count({
    where: { applicationId: application.id, active: true },
  });
  if (activeCount >= 20) throw new Error("This application already has 20 documents. Replace one instead of adding another.");

  const stored = await storeLicenceFile({
    applicationId: application.id,
    fileName: input.fileName,
    bytes: input.bytes,
    mimeType: checked.mimeType,
  });
  if (stored.exposure === "unconfigured") {
    throw new Error("Document storage is not configured. Set BLOB_READ_WRITE_TOKEN before accepting customer files.");
  }

  if (input.replacesDocumentId) {
    await prisma.licenceDocument.updateMany({
      where: { id: input.replacesDocumentId, applicationId: application.id, active: true },
      data: { active: false },
    });
  }

  const document = await prisma.licenceDocument.create({
    data: {
      applicationId: application.id,
      documentType: input.documentType,
      originalName: input.fileName.slice(0, 180),
      storageKey: stored.storageKey,
      mimeType: checked.mimeType,
      size: input.bytes.byteLength,
      uploadedById: input.userId ?? null,
      replacesDocumentId: input.replacesDocumentId || null,
    },
    select: { id: true, documentType: true, originalName: true, mimeType: true, size: true, createdAt: true },
  });
  await history({
    applicationId: application.id,
    actorId: input.userId,
    event: input.replacesDocumentId ? "DOCUMENT_REPLACED" : "DOCUMENT_UPLOADED",
    detail: `${input.documentType}: ${document.originalName}`,
  });
  return document;
}

async function loadRunnable(applicationId: string) {
  return prisma.licenceApplication.findUnique({
    where: { id: applicationId },
    include: {
      applicant: true,
      documents: { where: { active: true } },
    },
  });
}

export async function runLicenceAssessment(input: {
  applicationId: string;
  actorId?: string | null;
  customer: boolean;
}) {
  const limit = checkRateLimit(`licence-assess:${input.applicationId}`, 8, 60 * 60 * 1000);
  if (!limit.allowed) throw new Error("This application was checked too many times. Try again later.");

  const application = await loadRunnable(input.applicationId);
  if (!application?.applicant) throw new Error("The questionnaire is incomplete.");
  if (application.status === "REJECTED" || application.status === "BOOKING_CONFIRMED") {
    throw new Error("This application can no longer be rechecked.");
  }
  if (input.customer && application.status !== "AWAITING_DOCUMENTS" && application.status !== "CORRECTIONS_REQUIRED") {
    throw new Error("Submit a replacement document before asking for another check.");
  }
  if (application.status === "AI_IN_PROGRESS" && Date.now() - application.updatedAt.getTime() < 2 * 60 * 1000) {
    throw new Error("An assessment is already running.");
  }

  await ensureLicenceRequirements();
  await prisma.licenceApplication.update({
    where: { id: application.id },
    data: { status: "AI_IN_PROGRESS" },
  });
  await history({
    applicationId: application.id,
    actorId: input.actorId,
    event: "ASSESSMENT_STARTED",
    fromStatus: application.status,
    toStatus: "AI_IN_PROGRESS",
    detail: "Document screening started.",
  });

  const rules = (await prisma.licenceRequirement.findMany({ where: { active: true } })).map(toRule);
  const profile = profileFromRow(application.applicant);
  const today = todayInBangkok();
  const files = [];
  let unreadableStore = 0;
  for (const doc of application.documents) {
    const bytes = await readLicenceFile(doc.storageKey);
    if (!bytes) {
      unreadableStore += 1;
      continue;
    }
    files.push({
      id: doc.id,
      documentType: doc.documentType,
      fileName: doc.originalName,
      mimeType: doc.mimeType,
      bytes,
    });
  }

  const inspection = await inspectLicenceDocuments({
    applicant: profile,
    documents: application.documents.map((doc) => ({
      id: doc.id,
      documentType: doc.documentType,
      fileName: doc.originalName,
      active: true,
    })),
    files,
    today,
  });

  const knownIds = new Set(application.documents.map((doc) => doc.id));
  const extractions = inspection.payload
    ? inspection.payload.documents
        .filter((item) => knownIds.has(item.documentId))
        .map((item) => ({
          documentId: item.documentId,
          detectedType: item.detectedType ?? null,
          holderName: item.holderName ?? null,
          documentNumber: item.documentNumber ?? null,
          issueDate: item.issueDate ?? null,
          expiryDate: item.expiryDate ?? null,
          categories: item.categories ?? [],
          issuingCountry: item.issuingCountry ?? null,
          readable: item.readable,
          complete: item.complete,
          possibleAlteration: item.possibleAlteration,
          translationLikelyNeeded: item.translationLikelyNeeded,
          notes: item.notes ?? "",
          confidence: item.confidence,
        }))
    : [];

  const report = assessApplication({
    serviceKind: application.serviceKind,
    applicant: profile,
    documents: application.documents.map((doc) => ({
      id: doc.id,
      documentType: doc.documentType,
      fileName: doc.originalName,
      active: true,
    })),
    extractions,
    rules,
    today,
    aiAvailable: inspection.available && files.length > 0,
    aiFailed: inspection.available && inspection.failed,
    aiNeedsHumanReview: inspection.payload?.needsHumanReview ?? false,
    aiInconsistencies: [
      ...(inspection.payload?.inconsistencies ?? []),
      ...(unreadableStore > 0
        ? [{ code: "storage_unread", message: `${unreadableStore} file(s) could not be opened for inspection.`, documentIds: [] }]
        : []),
    ],
    priorVisitNotes: await loadPriorVisitNotes({ email: application.email, userId: application.userId }),
  });

  const nextStatus = statusForOutcome(report.outcome);
  const saved = await prisma.licenceAssessmentResult.create({
    data: {
      applicationId: application.id,
      outcome: report.outcome,
      confidence: report.confidence,
      summary: report.summary,
      nextSteps: report.nextSteps,
      model: inspection.available && "model" in inspection ? inspection.model : null,
      aiAvailable: inspection.available,
      aiError: inspection.available && inspection.failed ? inspection.error : !inspection.available ? inspection.reason : null,
      disclaimer: SCREENING_DISCLAIMER,
      findings: {
        create: report.findings.map((item) => ({
          documentId: item.documentId,
          documentType: item.documentType,
          code: item.code,
          status: item.status,
          severity: item.severity,
          message: item.message,
          recommendedAction: item.recommendedAction,
        })),
      },
      extractions: {
        create: extractions.map((item) => ({
          documentId: item.documentId,
          detectedType: item.detectedType,
          holderName: item.holderName,
          documentNumber: item.documentNumber,
          issueDate: item.issueDate,
          expiryDate: item.expiryDate,
          categories: item.categories,
          issuingCountry: item.issuingCountry,
          readable: item.readable,
          complete: item.complete,
          possibleAlteration: item.possibleAlteration,
          translationLikelyNeeded: item.translationLikelyNeeded,
          notes: item.notes,
          confidence: item.confidence,
          raw: item,
        })),
      },
    },
  });

  await prisma.licenceApplication.update({
    where: { id: application.id },
    data: { status: nextStatus },
  });
  await history({
    applicationId: application.id,
    actorId: input.actorId,
    event: "ASSESSMENT_COMPLETED",
    fromStatus: "AI_IN_PROGRESS",
    toStatus: nextStatus,
    detail: `${report.outcome} (${Math.round(report.confidence * 100)}% confidence). ${report.summary}`,
  });

  const template: LicenceNoticeTemplate =
    report.outcome === "PASS" ? "screening_passed" : report.outcome === "ACTION_REQUIRED" ? "corrections" : "manual_review";
  await notifyLicenceCustomer({
    applicationId: application.id,
    template,
    summary: report.summary,
    token: application.accessToken,
    locale: application.locale,
    email: application.email,
    userId: application.userId,
    referenceNumber: application.referenceNumber,
  });

  return { assessmentId: saved.id, outcome: report.outcome, status: nextStatus };
}

export async function getByAccessToken(token: string) {
  const application = await prisma.licenceApplication.findUnique({
    where: { accessToken: token },
    include: {
      ...applicationInclude,
      history: { orderBy: { createdAt: "asc" }, take: 40 },
      notifications: { orderBy: { createdAt: "desc" }, take: 10 },
      appointments: {
        where: { status: { in: ["CONFIRMED", "RESCHEDULED"] }, confirmationNumber: { not: null } },
        orderBy: { updatedAt: "desc" },
        take: 1,
        include: {
          office: {
            select: { nameEn: true, nameTh: true, province: true, address: true, phone: true, specialRequirements: true },
          },
        },
      },
    },
  });
  if (!application) return null;
  return serialize(application, false);
}

export async function getForStaff(id: string) {
  const application = await prisma.licenceApplication.findUnique({
    where: { id },
    include: {
      ...applicationInclude,
      documents: { orderBy: { createdAt: "desc" } },
      assessments: {
        orderBy: { createdAt: "desc" },
        take: 5,
        include: { findings: true, extractions: true },
      },
      history: { orderBy: { createdAt: "desc" }, take: 80, include: { actor: { select: { name: true, email: true } } } },
      notes: { orderBy: { createdAt: "desc" }, include: { author: { select: { name: true, email: true } } } },
      notifications: { orderBy: { createdAt: "desc" }, take: 20 },
      approvals: { orderBy: { createdAt: "desc" }, include: { staff: { select: { name: true, email: true } } } },
      assignments: { where: { active: true }, include: { staff: { select: { id: true, name: true, email: true } } } },
    },
  });
  if (!application) return null;
  return serialize(application, true);
}

function serialize(application: {
  id: string;
  referenceNumber: string;
  accessToken: string;
  serviceKind: LicenceServiceKind;
  status: string;
  email: string;
  phone: string | null;
  locale: string;
  createdAt: Date;
  updatedAt: Date;
  userId: string | null;
  applicant: Parameters<typeof profileFromRow>[0] | null;
  documents: { id: string; documentType: string; originalName: string; mimeType: string; size: number; active: boolean; createdAt: Date; storageKey?: string }[];
  assessments: {
    id: string;
    outcome: string;
    confidence: number;
    summary: string;
    nextSteps: string;
    disclaimer: string;
    model: string | null;
    aiAvailable: boolean;
    aiError: string | null;
    createdAt: Date;
    findings: { id: string; documentId: string | null; documentType: string | null; code: string; status: string; severity: string; message: string; recommendedAction: string }[];
    extractions?: { id: string; documentId: string; holderName: string | null; documentNumber: string | null; issueDate: string | null; expiryDate: string | null; categories: Prisma.JsonValue; readable: boolean; complete: boolean; possibleAlteration: boolean; notes: string; confidence: number; corrected: boolean }[];
  }[];
  quote?: { id: string; quoteNumber: string | null; amount: number; currency: string; status: string; requiresHumanReview: boolean } | null;
  case?: { id: string; caseNumber: string; status: string } | null;
  history?: { id: string; event: string; detail: string; fromStatus: string | null; toStatus: string | null; createdAt: Date; actor?: { name: string | null; email: string } | null }[];
  notes?: { id: string; body: string; createdAt: Date; author?: { name: string | null; email: string } | null }[];
  notifications?: { id: string; channel: string; templateKey: string; status: string; subject: string; bodySummary: string; error: string | null; createdAt: Date }[];
  approvals?: { id: string; decision: string; reason: string; createdAt: Date; staff?: { name: string | null; email: string } | null }[];
  assignments?: { id: string; staff: { id: string; name: string | null; email: string } }[];
  appointments?: {
    status: string;
    appointmentDate: string | null;
    appointmentTime: string | null;
    confirmationNumber: string | null;
    specialInstructions: string;
    office: { nameEn: string; nameTh: string; province: string; address: string; phone: string; specialRequirements: string } | null;
  }[];
}, staff: boolean) {
  const latest = application.assessments[0] ?? null;
  return {
    id: application.id,
    referenceNumber: application.referenceNumber,
    trackPath: staff ? `/driving-licence/track/${application.accessToken}` : undefined,
    serviceKind: application.serviceKind,
    status: application.status,
    email: application.email,
    phone: application.phone,
    locale: application.locale,
    createdAt: application.createdAt.toISOString(),
    updatedAt: application.updatedAt.toISOString(),
    applicant: application.applicant ? profileFromRow(application.applicant) : null,
    documents: application.documents.filter((doc) => staff || doc.active).map((doc) => ({
      id: doc.id,
      documentType: doc.documentType,
      originalName: doc.originalName,
      mimeType: doc.mimeType,
      size: doc.size,
      active: doc.active,
      createdAt: doc.createdAt.toISOString(),
    })),
    assessment: latest
      ? {
          id: latest.id,
          outcome: latest.outcome,
          confidence: latest.confidence,
          summary: latest.summary,
          nextSteps: latest.nextSteps,
          disclaimer: latest.disclaimer,
          model: latest.model,
          aiAvailable: latest.aiAvailable,
          aiError: latest.aiError,
          createdAt: latest.createdAt.toISOString(),
          findings: latest.findings,
          extractions: latest.extractions?.map((item) => ({
            id: item.id,
            documentId: item.documentId,
            holderName: item.holderName,
            documentNumber: item.documentNumber,
            issueDate: item.issueDate,
            expiryDate: item.expiryDate,
            categories: Array.isArray(item.categories) ? item.categories.filter((value): value is string => typeof value === "string") : [],
            readable: item.readable,
            complete: item.complete,
            possibleAlteration: item.possibleAlteration,
            notes: item.notes,
            confidence: item.confidence,
            corrected: item.corrected,
          })) ?? [],
        }
      : null,
    quote: application.quote
      ? {
          id: application.quote.id,
          quoteNumber: application.quote.quoteNumber,
          amount: application.quote.amount,
          currency: application.quote.currency,
          status: application.quote.status,
          requiresHumanReview: application.quote.requiresHumanReview,
        }
      : null,
    booking: application.case ?? null,
    appointment: application.appointments?.[0]
      ? {
          status: application.appointments[0].status,
          appointmentDate: application.appointments[0].appointmentDate,
          appointmentTime: application.appointments[0].appointmentTime,
          confirmationNumber: application.appointments[0].confirmationNumber,
          specialInstructions: application.appointments[0].specialInstructions,
          office: application.appointments[0].office,
        }
      : null,
    history: application.history?.map((item) => ({
      id: item.id,
      event: item.event,
      detail: item.detail,
      fromStatus: item.fromStatus,
      toStatus: item.toStatus,
      createdAt: item.createdAt.toISOString(),
      actor: item.actor?.name || item.actor?.email || null,
    })) ?? [],
    notes: application.notes?.map((item) => ({
      id: item.id,
      body: item.body,
      createdAt: item.createdAt.toISOString(),
      author: item.author?.name || item.author?.email || "Staff",
    })) ?? [],
    notifications: application.notifications?.map((item) => ({
      id: item.id,
      channel: item.channel,
      templateKey: item.templateKey,
      status: item.status,
      subject: item.subject,
      bodySummary: item.bodySummary,
      error: item.error,
      createdAt: item.createdAt.toISOString(),
    })) ?? [],
    approvals: application.approvals?.map((item) => ({
      id: item.id,
      decision: item.decision,
      reason: item.reason,
      createdAt: item.createdAt.toISOString(),
      staff: item.staff?.name || item.staff?.email || null,
    })) ?? [],
    assignees: application.assignments?.map((item) => item.staff) ?? [],
  };
}

export async function listLicenceApplications(filters: {
  status?: string;
  serviceKind?: string;
  nationality?: string;
  outcome?: string;
  staffId?: string;
  from?: string;
  to?: string;
}) {
  const where: Prisma.LicenceApplicationWhereInput = {};
  if (filters.status) where.status = filters.status as Prisma.EnumLicenceApplicationStatusFilter["equals"];
  if (filters.serviceKind) where.serviceKind = filters.serviceKind as LicenceServiceKind;
  if (filters.staffId) where.assignedStaffId = filters.staffId;
  if (filters.nationality) where.applicant = { nationality: { contains: filters.nationality, mode: "insensitive" } };
  if (filters.from || filters.to) {
    where.createdAt = {};
    if (filters.from) where.createdAt.gte = new Date(filters.from);
    if (filters.to) where.createdAt.lte = new Date(`${filters.to}T23:59:59.999Z`);
  }
  if (filters.outcome) {
    where.assessments = { some: { outcome: filters.outcome as "PASS" | "ACTION_REQUIRED" | "MANUAL_REVIEW" } };
  }
  const [rows, grouped] = await Promise.all([
    prisma.licenceApplication.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: 200,
      include: {
        applicant: { select: { fullLegalName: true, nationality: true } },
        assessments: { orderBy: { createdAt: "desc" }, take: 1, select: { outcome: true, confidence: true } },
        assignedStaff: { select: { id: true, name: true, email: true } },
      },
    }),
    prisma.licenceApplication.groupBy({ by: ["status"], _count: { _all: true } }),
  ]);
  return {
    rows: rows.map((row) => ({
      id: row.id,
      referenceNumber: row.referenceNumber,
      serviceKind: row.serviceKind,
      status: row.status,
      email: row.email,
      name: row.applicant?.fullLegalName ?? "",
      nationality: row.applicant?.nationality ?? "",
      outcome: row.assessments[0]?.outcome ?? null,
      confidence: row.assessments[0]?.confidence ?? null,
      assignee: row.assignedStaff?.name || row.assignedStaff?.email || null,
      createdAt: row.createdAt.toISOString(),
    })),
    counts: Object.fromEntries(grouped.map((item) => [item.status, item._count._all])) as Record<string, number>,
  };
}

export async function correctExtraction(input: {
  extractionId: string;
  staffId: string | null;
  holderName: string;
  documentNumber: string;
  issueDate: string;
  expiryDate: string;
  categories: string;
  notes: string;
}) {
  const existing = await prisma.licenceDocumentExtraction.findUnique({
    where: { id: input.extractionId },
    include: { document: { select: { applicationId: true } } },
  });
  if (!existing) throw new Error("Extraction not found.");
  await prisma.licenceDocumentExtraction.update({
    where: { id: existing.id },
    data: {
      holderName: input.holderName || null,
      documentNumber: input.documentNumber || null,
      issueDate: input.issueDate || null,
      expiryDate: input.expiryDate || null,
      categories: input.categories.split(/[,/]/).map((part) => part.trim()).filter(Boolean),
      notes: input.notes,
      corrected: true,
    },
  });
  await history({
    applicationId: existing.document.applicationId,
    actorId: input.staffId,
    event: "EXTRACTION_CORRECTED",
    detail: "Staff corrected an extracted field. The original model output is still stored.",
  });
}

export async function reassessFromCorrections(applicationId: string, staffId: string | null) {
  const application = await loadRunnable(applicationId);
  if (!application?.applicant) throw new Error("Application not found.");
  await ensureLicenceRequirements();
  const rules = (await prisma.licenceRequirement.findMany({ where: { active: true } })).map(toRule);
  const latest = await prisma.licenceDocumentExtraction.findMany({
    where: { document: { applicationId, active: true } },
    orderBy: { createdAt: "desc" },
  });
  const seen = new Set<string>();
  const extractions = [];
  for (const row of latest) {
    if (seen.has(row.documentId)) continue;
    seen.add(row.documentId);
    extractions.push({
      documentId: row.documentId,
      detectedType: row.detectedType,
      holderName: row.holderName,
      documentNumber: row.documentNumber,
      issueDate: row.issueDate,
      expiryDate: row.expiryDate,
      categories: Array.isArray(row.categories) ? row.categories.filter((value): value is string => typeof value === "string") : [],
      issuingCountry: row.issuingCountry,
      readable: row.readable,
      complete: row.complete,
      possibleAlteration: row.possibleAlteration,
      translationLikelyNeeded: row.translationLikelyNeeded,
      notes: row.notes,
      confidence: row.confidence,
    });
  }
  const report = assessApplication({
    serviceKind: application.serviceKind,
    applicant: profileFromRow(application.applicant),
    documents: application.documents.map((doc) => ({
      id: doc.id,
      documentType: doc.documentType,
      fileName: doc.originalName,
      active: true,
    })),
    extractions,
    rules,
    today: todayInBangkok(),
    aiAvailable: extractions.length > 0,
    aiFailed: false,
    aiNeedsHumanReview: false,
    priorVisitNotes: await loadPriorVisitNotes({ email: application.email, userId: application.userId }),
  });
  const nextStatus = statusForOutcome(report.outcome);
  await prisma.licenceAssessmentResult.create({
    data: {
      applicationId,
      outcome: report.outcome,
      confidence: report.confidence,
      summary: report.summary,
      nextSteps: report.nextSteps,
      model: "rules-recheck",
      aiAvailable: extractions.length > 0,
      disclaimer: SCREENING_DISCLAIMER,
      findings: { create: report.findings.map((item) => ({
        documentId: item.documentId,
        documentType: item.documentType,
        code: item.code,
        status: item.status,
        severity: item.severity,
        message: item.message,
        recommendedAction: item.recommendedAction,
      })) },
    },
  });
  await prisma.licenceApplication.update({ where: { id: applicationId }, data: { status: nextStatus } });
  await history({
    applicationId,
    actorId: staffId,
    event: "ASSESSMENT_RECALCULATED",
    fromStatus: application.status,
    toStatus: nextStatus,
    detail: "Rules were recalculated from the corrected extraction fields. No new vision call was made.",
  });
}

export async function assignLicenceStaff(applicationId: string, staffId: string, actorId: string | null) {
  await prisma.licenceStaffAssignment.updateMany({
    where: { applicationId, active: true },
    data: { active: false },
  });
  await prisma.licenceStaffAssignment.create({
    data: { applicationId, staffId, assignedById: actorId },
  });
  await prisma.licenceApplication.update({
    where: { id: applicationId },
    data: { assignedStaffId: staffId },
  });
  await history({
    applicationId,
    actorId,
    event: "ASSIGNED",
    detail: `Assigned to staff ${staffId}.`,
  });
}

export async function addLicenceNote(applicationId: string, authorId: string | null, body: string) {
  const note = body.trim();
  if (note.length < 2) throw new Error("Write a note first.");
  await prisma.licenceInternalNote.create({ data: { applicationId, authorId, body: note } });
  await history({ applicationId, actorId: authorId, event: "NOTE", detail: note });
}

export async function messageLicenceCustomer(applicationId: string, summary: string, template: LicenceNoticeTemplate = "message") {
  const application = await prisma.licenceApplication.findUnique({ where: { id: applicationId } });
  if (!application) throw new Error("Application not found.");
  await notifyLicenceCustomer({
    applicationId,
    template,
    summary: summary.trim(),
    token: application.accessToken,
    locale: application.locale,
    email: application.email,
    userId: application.userId,
    referenceNumber: application.referenceNumber,
  });
  await history({ applicationId, event: "CUSTOMER_MESSAGE", detail: summary.trim() });
}

export async function requestLicenceCorrection(applicationId: string, staffId: string | null, message: string) {
  const application = await prisma.licenceApplication.findUnique({ where: { id: applicationId } });
  if (!application) throw new Error("Application not found.");
  const from = application.status;
  await prisma.licenceApplication.update({
    where: { id: applicationId },
    data: { status: "CORRECTIONS_REQUIRED" },
  });
  await history({
    applicationId,
    actorId: staffId,
    event: "CORRECTION_REQUESTED",
    fromStatus: from,
    toStatus: "CORRECTIONS_REQUIRED",
    detail: message.trim(),
  });
  await messageLicenceCustomer(applicationId, message, "corrections");
}

export async function overrideLicenceOutcome(input: {
  applicationId: string;
  staffId: string | null;
  outcome: "PASS" | "ACTION_REQUIRED" | "MANUAL_REVIEW";
  reason: string;
}) {
  const reason = input.reason.trim();
  if (reason.length < 8) throw new Error("Record why you are changing the assessment.");
  const application = await prisma.licenceApplication.findUnique({ where: { id: input.applicationId } });
  if (!application) throw new Error("Application not found.");
  const nextStatus = statusForOutcome(input.outcome);
  await prisma.licenceAssessmentResult.create({
    data: {
      applicationId: application.id,
      outcome: input.outcome,
      confidence: 0.5,
      summary: `Staff overrode the screening result. ${reason}`,
      nextSteps: reason,
      model: "staff-override",
      aiAvailable: false,
      disclaimer: SCREENING_DISCLAIMER,
      findings: {
        create: [{
          code: "staff_override",
          status: "MANUAL",
          severity: "info",
          message: reason,
          recommendedAction: "This result was set by staff and is recorded in the audit log.",
        }],
      },
    },
  });
  await prisma.licenceApprovalRecord.create({
    data: {
      applicationId: application.id,
      staffId: input.staffId,
      decision: "ASSESSMENT_OVERRIDE",
      reason,
      previousStatus: application.status,
    },
  });
  await prisma.licenceApplication.update({ where: { id: application.id }, data: { status: nextStatus } });
  await history({
    applicationId: application.id,
    actorId: input.staffId,
    event: "ASSESSMENT_OVERRIDE",
    fromStatus: application.status,
    toStatus: nextStatus,
    detail: reason,
  });
}

export async function approveLicenceQuotation(input: {
  applicationId: string;
  staffId: string | null;
  overrideReason?: string | null;
}) {
  const application = await prisma.licenceApplication.findUnique({
    where: { id: input.applicationId },
    include: {
      applicant: true,
      assessments: { orderBy: { createdAt: "desc" }, take: 1 },
      quote: true,
    },
  });
  if (!application?.applicant) throw new Error("Application not found.");
  if (application.status === "REJECTED" || application.status === "BOOKING_CONFIRMED") {
    throw new Error("This application cannot be approved.");
  }
  const latest = application.assessments[0];
  const override = input.overrideReason?.trim() ?? "";
  if (latest?.outcome !== "PASS" && override.length < 8) {
    throw new Error("The latest screening is not a pass. Approve only after a pass, or record an override reason.");
  }
  if (override.length >= 8) {
    await prisma.licenceApprovalRecord.create({
      data: {
        applicationId: application.id,
        staffId: input.staffId,
        decision: "OVERRIDE",
        reason: override,
        previousStatus: application.status,
      },
    });
  }
  if (!application.quoteId) {
    const service = application.serviceId
      ? await prisma.service.findUnique({ where: { id: application.serviceId } })
      : await prisma.service.findUnique({ where: { slug: DRIVER_LICENSE_SERVICE_SLUG } });
    if (!service?.active) throw new Error("The driver licence service is not available in the catalog.");
    const profile = profileFromRow(application.applicant);
    const pricingInput = toDriverLicenseRequirements(application.serviceKind, {
      renewalVehicle: profile.renewalVehicle,
      needsTranslation: profile.foreignLicenceLanguage === "other",
      hasResidenceCertificate: profile.hasResidenceCertificate,
    });
    if (!pricingInput.ok) throw new Error(pricingInput.error);
    const pricing = getServicePricingConfig(service.slug);
    if (!pricing) throw new Error("This service has no pricing configuration.");
    const calculated = calculateQuote({
      config: pricing,
      requirements: pricingInput.requirements,
      dbPriceAmount: service.priceAmount,
      currency: service.priceCurrency ?? "THB",
    });
    const paymentConfig = resolveServicePaymentConfig({
      serviceSlug: service.slug,
      dbPaymentConfig: service.paymentConfig,
    });
    const paymentPlan = buildQuotePaymentPlan({
      pricing: calculated,
      config: paymentConfig,
      serviceSlug: service.slug,
      serviceName: service.name,
      requirements: pricingInput.requirements,
    });
    const snapshot = buildPricingSnapshot({ plan: paymentPlan, pricing: calculated });
    const quote = await createQuote({
      serviceId: service.id,
      userId: application.userId,
      amount: calculated.total,
      currency: calculated.currency,
      status: paymentPlan.requires_human_review ? "custom_quote_required" : "generated",
      quoteType: calculated.quoteType,
      validUntil: computeQuoteExpiry(pricing.validityDays),
      requirements: pricingInput.requirements as Prisma.InputJsonValue,
      pricingBreakdown: {
        lineItems: calculated.lineItems,
        summaryLabel: calculated.summaryLabel,
      } as unknown as Prisma.InputJsonValue,
      subtotal: calculated.subtotal,
      governmentFees: calculated.governmentFees,
      addOnsTotal: calculated.addOnsTotal,
      discount: calculated.discount,
      originalAmount: calculated.total,
      paymentPlan: paymentPlan as unknown as Prisma.InputJsonValue,
      pricingSnapshot: snapshot as unknown as Prisma.InputJsonValue,
      pricingVersion: snapshot.pricing_version,
      requiresHumanReview: paymentPlan.requires_human_review,
      paymentReason: paymentPlan.reason,
      initialPercentage: paymentPlan.initial_percentage,
      initialPaymentTotal: paymentPlan.initial_payment_total,
      remainingBalance: paymentPlan.remaining_balance,
    });
    if (paymentPlan.milestones.length > 0) {
      await prisma.paymentMilestone.createMany({
        data: paymentPlan.milestones.map((milestone, index) => ({
          quoteId: quote.id,
          name: milestone.name,
          description: milestone.description ?? null,
          amount: milestone.amount,
          percentage: milestone.percentage,
          status: index === 0 ? "due" : "pending",
          dueCondition: milestone.dueCondition ?? null,
          sortOrder: index,
        })),
      });
    }
    await prisma.licenceApplication.update({
      where: { id: application.id },
      data: { quoteId: quote.id, serviceId: service.id, status: "APPROVED_FOR_QUOTATION" },
    });
  } else {
    await prisma.licenceApplication.update({
      where: { id: application.id },
      data: { status: "APPROVED_FOR_QUOTATION" },
    });
  }

  await prisma.licenceApprovalRecord.create({
    data: {
      applicationId: application.id,
      staffId: input.staffId,
      decision: "APPROVED",
      reason: override || "Staff approved the file for quotation after screening.",
      previousStatus: application.status,
    },
  });
  const saved = await prisma.licenceApplication.findUnique({
    where: { id: application.id },
    include: { quote: true },
  });
  const amount = saved?.quote ? `${(saved.quote.amount / 100).toLocaleString("en-US")} ${saved.quote.currency}` : "";
  await notifyLicenceCustomer({
    applicationId: application.id,
    template: "quotation_ready",
    summary: saved?.quote?.requiresHumanReview
      ? "SiamEZ approved your file for a quotation. Staff will confirm the final amount before you are asked to pay."
      : `SiamEZ approved your documents for a quotation${amount ? ` of ${amount}` : ""}. Open your application to accept it. No invoice is issued until you accept.`,
    token: application.accessToken,
    locale: application.locale,
    email: application.email,
    userId: application.userId,
    referenceNumber: application.referenceNumber,
  });
  await prisma.licenceApplication.update({
    where: { id: application.id },
    data: { status: "QUOTATION_SENT" },
  });
  await history({
    applicationId: application.id,
    actorId: input.staffId,
    event: "QUOTE_ISSUED",
    fromStatus: application.status,
    toStatus: "QUOTATION_SENT",
    detail: override || "Approved for quotation. No invoice was created.",
  });
}

export async function rejectLicenceApplication(applicationId: string, staffId: string | null, reason: string) {
  const note = reason.trim();
  if (note.length < 8) throw new Error("Record why the application is rejected.");
  const application = await prisma.licenceApplication.findUnique({ where: { id: applicationId } });
  if (!application) throw new Error("Application not found.");
  await prisma.licenceApplication.update({ where: { id: applicationId }, data: { status: "REJECTED" } });
  await prisma.licenceApprovalRecord.create({
    data: {
      applicationId,
      staffId,
      decision: "REJECTED",
      reason: note,
      previousStatus: application.status,
    },
  });
  await history({
    applicationId,
    actorId: staffId,
    event: "REJECTED",
    fromStatus: application.status,
    toStatus: "REJECTED",
    detail: note,
  });
  await notifyLicenceCustomer({
    applicationId,
    template: "rejected",
    summary: note,
    token: application.accessToken,
    locale: application.locale,
    email: application.email,
    userId: application.userId,
    referenceNumber: application.referenceNumber,
  });
}

export async function acceptLicenceQuotation(token: string, locale: string) {
  const application = await prisma.licenceApplication.findUnique({
    where: { accessToken: token },
    include: { applicant: true, quote: true, service: true },
  });
  if (!application?.quote || !application.serviceId) throw new Error("There is no quotation to accept yet.");
  if (application.status !== "QUOTATION_SENT" && application.status !== "APPROVED_FOR_QUOTATION") {
    throw new Error("This quotation is not ready to accept.");
  }
  if (application.quote.requiresHumanReview || application.quote.status === "custom_quote_required") {
    throw new Error("SiamEZ still needs to confirm the price before you can pay.");
  }
  const booking = await createBookingCase({
    serviceId: application.serviceId,
    isGuest: !application.userId,
    userId: application.userId ?? undefined,
    guestEmail: application.email,
    guestName: application.applicant?.fullLegalName,
    guestPhone: application.phone ?? undefined,
    quoteId: application.quote.id,
    paymentChoice: "initial",
    formData: { licenceApplicationId: application.id, source: "licence-preapproval" },
  });
  const checkoutPath = booking.guestCheckoutToken
    ? `/${locale}/checkout/${booking.caseId}?token=${booking.guestCheckoutToken}`
    : `/${locale}/portal/invoices`;
  return { caseId: booking.caseId, caseNumber: booking.caseNumber, checkoutPath };
}

export async function listAssignableStaff() {
  return prisma.user.findMany({
    where: { role: { in: ["admin", "staff"] }, active: true },
    select: { id: true, name: true, email: true },
    orderBy: { name: "asc" },
    take: 100,
  });
}

export async function listLicenceRequirements() {
  await ensureLicenceRequirements();
  const rows = await prisma.licenceRequirement.findMany({ orderBy: { name: "asc" } });
  return rows.map((row) => ({ ...toRule(row), id: row.id }));
}

export async function saveLicenceRequirement(input: {
  id?: string;
  ruleKey: string;
  name: string;
  description: string;
  serviceKinds: string[];
  customerCategories: string[];
  level: "REQUIRED" | "OPTIONAL";
  source: string;
  lastVerifiedOn: string;
  active: boolean;
  evaluatorKey: string;
}) {
  const data = {
    name: input.name.trim(),
    description: input.description.trim(),
    serviceKinds: input.serviceKinds,
    customerCategories: input.customerCategories,
    level: input.level,
    source: input.source.trim(),
    lastVerifiedOn: asDate(input.lastVerifiedOn) ?? new Date(),
    active: input.active,
    evaluatorKey: input.evaluatorKey.trim(),
  };
  if (!data.name || !data.description || !data.evaluatorKey) throw new Error("Name, description, and evaluator are required.");
  if (input.id) {
    await prisma.licenceRequirement.update({ where: { id: input.id }, data });
    return;
  }
  await prisma.licenceRequirement.create({ data: { ...data, ruleKey: input.ruleKey.trim() } });
}

export type { VehicleChoice };
