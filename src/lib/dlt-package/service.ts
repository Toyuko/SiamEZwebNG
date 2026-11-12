import type { Prisma } from "@prisma/client";
import { ruleApplies } from "@/lib/licence-verification/assess";
import { serviceTitle } from "@/lib/licence-verification/copy";
import { validateUpload } from "@/lib/licence-verification/files";
import { notifyLicenceCustomer } from "@/lib/licence-verification/notify";
import { ensureLicenceRequirements, profileFromRow } from "@/lib/licence-verification/service";
import { readLicenceFile, storeLicenceFile } from "@/lib/licence-verification/storage";
import { DOCUMENT_LABELS, QUOTATION_ALLOWED_STATUSES, type LicenceServiceKind } from "@/lib/licence-verification/types";
import { prisma } from "@/lib/db";
import { appointmentUpdateError, OFFICIAL_DLT_BOOKING_URL } from "@/lib/dlt-package/appointments";
import { buildDltPackagePdf } from "@/lib/dlt-package/compose";
import { isReadableUpload } from "@/lib/dlt-package/exif";
import { missingTable } from "@/lib/dlt-package/lessons";
import { COPY_GUIDANCE, markDuplicates, sha256, sortForPackage } from "@/lib/dlt-package/order";
import { OFFICE_ADDRESS_NOTE, STARTER_DLT_OFFICES } from "@/lib/dlt-package/offices-data";
import { validateDltPackage } from "@/lib/dlt-package/validate";

const EVALUATOR_DOCUMENT: Record<string, string> = {
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

const PACKAGE_STATUSES = new Set<string>(QUOTATION_ALLOWED_STATUSES);

export function todayInBangkok(now = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Bangkok" }).format(now);
}

function categoryLabel(kind: string): string {
  if (kind.startsWith("NEW_")) return "New";
  if (kind.startsWith("CONVERSION_")) return "Conversion";
  if (kind === "RENEWAL") return "Renewal";
  if (kind === "LOST_REPLACEMENT") return "Replacement";
  if (kind === "IDP") return "International driving permit";
  return kind;
}

function findingKey(code: string, documentType: string | null): string {
  return `${code}:${documentType ?? ""}`;
}

async function history(applicationId: string, actorId: string | null, event: string, detail: string) {
  await prisma.licenceApplicationHistory.create({
    data: { applicationId, actorId, event, detail },
  });
}

export async function ensureDltOffices(): Promise<void> {
  const existing = await prisma.dltOffice.findMany({ select: { slug: true } });
  const have = new Set(existing.map((office) => office.slug));
  const missing = STARTER_DLT_OFFICES.filter((office) => !have.has(office.slug));
  if (missing.length === 0) return;
  await prisma.dltOffice.createMany({
    data: missing.map((office) => ({
      slug: office.slug,
      nameEn: office.nameEn,
      nameTh: office.nameTh,
      province: office.province,
      address: "",
      supportedServiceKinds: [...office.supportedServiceKinds],
      bookingInstructions: `Book in DLT Smart Queue, then record the confirmation number here. ${OFFICIAL_DLT_BOOKING_URL}`,
      specialRequirements: OFFICE_ADDRESS_NOTE,
      bookingUrl: OFFICIAL_DLT_BOOKING_URL,
    })),
  });
}

export async function listDltOffices() {
  await ensureDltOffices();
  return prisma.dltOffice.findMany({ orderBy: [{ province: "asc" }, { nameEn: "asc" }] });
}

export async function saveDltOffice(input: {
  id?: string;
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
  staffId: string | null;
}) {
  if (!input.nameEn.trim() || !input.province.trim()) throw new Error("Enter the office name and province.");
  const data = {
    nameEn: input.nameEn.trim(),
    nameTh: input.nameTh.trim() || input.nameEn.trim(),
    province: input.province.trim(),
    address: input.address.trim(),
    phone: input.phone.trim(),
    email: input.email.trim(),
    supportedServiceKinds: input.supportedServiceKinds,
    openingHours: input.openingHours.trim(),
    bookingInstructions: input.bookingInstructions.trim(),
    specialRequirements: input.specialRequirements.trim(),
    active: input.active,
    bookingUrl: OFFICIAL_DLT_BOOKING_URL,
  };
  if (input.id) {
    return prisma.dltOffice.update({ where: { id: input.id }, data });
  }
  const slug = data.nameEn.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 60) || "dlt-office";
  return prisma.dltOffice.create({ data: { ...data, slug: `${slug}-${Date.now().toString(36)}` } });
}

async function loadFile(applicationId: string) {
  return prisma.licenceApplication.findUnique({
    where: { id: applicationId },
    include: {
      applicant: true,
      assignedStaff: { select: { id: true, name: true, email: true } },
      documents: { where: { active: true }, orderBy: { createdAt: "asc" } },
      packages: { orderBy: { version: "desc" }, take: 1, include: { prints: { orderBy: { createdAt: "desc" }, take: 8 } } },
      appointments: { orderBy: { createdAt: "desc" }, take: 1, include: { office: true, assignedStaff: { select: { name: true } } } },
      visits: { orderBy: { createdAt: "desc" }, take: 8 },
      findingAcks: true,
      assessments: { orderBy: { createdAt: "desc" }, take: 1, include: { findings: true } },
    },
  });
}

export async function getDltFile(applicationId: string) {
  try {
    await ensureDltOffices();
    const [application, offices, staff] = await Promise.all([
      loadFile(applicationId),
      listDltOffices(),
      prisma.user.findMany({
        where: { role: { in: ["admin", "staff"] }, active: true },
        select: { id: true, name: true, email: true },
        orderBy: { name: "asc" },
        take: 100,
      }),
    ]);
    return { application, offices, staff };
  } catch (error) {
    if (missingTable(error)) return { application: null, offices: [], staff: [] };
    throw error;
  }
}

export async function generateDltPackage(applicationId: string, staffId: string | null) {
  const application = await loadFile(applicationId);
  if (!application?.applicant) throw new Error("Application not found.");
  if (!PACKAGE_STATUSES.has(application.status)) {
    throw new Error("Approve the application before preparing the DLT package.");
  }
  await ensureLicenceRequirements();
  const rules = await prisma.licenceRequirement.findMany({ where: { active: true } });
  const profile = profileFromRow(application.applicant);
  const requiredDocuments = rules
    .filter((rule) => rule.level === "REQUIRED" && ruleApplies({
      ruleKey: rule.ruleKey,
      name: rule.name,
      description: rule.description,
      serviceKinds: rule.serviceKinds,
      customerCategories: rule.customerCategories,
      level: rule.level,
      source: rule.source,
      lastVerifiedOn: rule.lastVerifiedOn.toISOString().slice(0, 10),
      active: rule.active,
      evaluatorKey: rule.evaluatorKey,
    }, application.serviceKind, profile))
    .map((rule) => EVALUATOR_DOCUMENT[rule.evaluatorKey])
    .filter((type): type is string => Boolean(type))
    .filter((type, index, all) => all.indexOf(type) === index)
    .map((documentType) => ({ documentType, label: DOCUMENT_LABELS[documentType] ?? documentType }));

  const prepared = [];
  for (const document of application.documents) {
    const bytes = (await readLicenceFile(document.storageKey)) ?? Buffer.alloc(0);
    prepared.push({
      id: document.id,
      applicationId: application.id,
      documentType: document.documentType,
      fileName: document.originalName,
      mimeType: document.mimeType,
      bytes: new Uint8Array(bytes),
      sha256: sha256(bytes),
      createdAt: document.createdAt.toISOString(),
      readable: isReadableUpload({ mimeType: document.mimeType, bytes }),
    });
  }
  const ordered = sortForPackage(markDuplicates(prepared));
  const latestFindings = application.assessments[0]?.findings ?? [];
  const findings = latestFindings.map((finding) => ({
    key: findingKey(finding.code, finding.documentType),
    status: finding.status,
  }));
  const acknowledgedKeys = application.findingAcks.map((ack) => ack.findingKey);
  const validation = validateDltPackage({
    applicationId: application.id,
    serviceKind: application.serviceKind,
    invoiceIssued: Boolean(application.invoiceId),
    requiredDocuments,
    documents: ordered,
    findings,
    acknowledgedKeys,
  });

  const appointment = application.appointments[0];
  const officeName = appointment?.office ? `${appointment.office.nameEn}, ${appointment.office.province}` : "Not selected";
  const checklist = requiredDocuments.map((required) => {
    const uploaded = ordered.find((document) => document.documentType === required.documentType && !document.duplicateOfId);
    const guidance = COPY_GUIDANCE[required.documentType] ?? { form: "copy" as const, copies: 1 };
    return {
      name: required.label,
      level: "Required",
      form: guidance.form.replaceAll("_", " "),
      copies: guidance.copies,
      verified: uploaded ? (uploaded.readable ? "Present" : "Unreadable") : "Missing",
    };
  });
  for (const document of ordered) {
    if (checklist.some((row) => row.name === (DOCUMENT_LABELS[document.documentType] ?? document.documentType))) continue;
    const guidance = COPY_GUIDANCE[document.documentType] ?? { form: "copy" as const, copies: 1 };
    checklist.push({
      name: DOCUMENT_LABELS[document.documentType] ?? document.documentType,
      level: "Optional",
      form: guidance.form.replaceAll("_", " "),
      copies: guidance.copies,
      verified: document.duplicateOfId ? "Duplicate" : document.readable ? "Present" : "Unreadable",
    });
  }

  const manifest = {
    referenceNumber: application.referenceNumber,
    customerName: application.applicant.fullLegalName,
    nationality: application.applicant.nationality,
    passportNumber: application.applicant.passportNumber,
    dateOfBirth: profile.dateOfBirth,
    serviceTitle: serviceTitle(application.serviceKind, "en"),
    category: categoryLabel(application.serviceKind),
    officeName,
    contact: [application.email, application.phone, application.applicant.thaiAddress].filter(Boolean).join(" · "),
    checklist,
    documents: ordered.map((document) => ({
      id: document.id,
      label: DOCUMENT_LABELS[document.documentType] ?? document.documentType,
      fileName: document.fileName,
      mimeType: document.mimeType,
      duplicate: Boolean(document.duplicateOfId),
    })),
    staffName: application.assignedStaff?.name || application.assignedStaff?.email || "Unassigned",
    appointment: appointment?.appointmentDate
      ? `${appointment.appointmentDate} ${appointment.appointmentTime ?? ""} (${appointment.status})`.trim()
      : "Not booked",
    outstanding: validation.issues.map((issue) => issue.message),
    instructions: [appointment?.office?.specialRequirements, appointment?.specialInstructions].filter(Boolean).join("\n") || OFFICE_ADDRESS_NOTE,
  };

  const pdf = await buildDltPackagePdf({
    kind: "complete",
    ...manifest,
    documents: ordered.map((document) => ({
      label: DOCUMENT_LABELS[document.documentType] ?? document.documentType,
      fileName: document.fileName,
      mimeType: document.mimeType,
      bytes: document.bytes,
      duplicate: Boolean(document.duplicateOfId),
    })),
  });
  const stored = await storeLicenceFile({
    applicationId: application.id,
    fileName: `${application.referenceNumber}-dlt-package.pdf`,
    bytes: Buffer.from(pdf),
    mimeType: "application/pdf",
  });
  if (stored.exposure === "unconfigured") {
    throw new Error("Document storage is not configured, so the package was not saved.");
  }
  const version = (application.packages[0]?.version ?? 0) + 1;
  const created = await prisma.licenceDocumentPackage.create({
    data: {
      applicationId: application.id,
      version,
      status: validation.ok ? "READY_TO_PRINT" : "BLOCKED",
      storageKey: stored.storageKey,
      manifest: manifest as unknown as Prisma.InputJsonValue,
      issues: validation.issues as unknown as Prisma.InputJsonValue,
      generatedById: staffId,
    },
  });
  await history(
    application.id,
    staffId,
    "DLT_PACKAGE_GENERATED",
    `Version ${version} is ${validation.ok ? "ready to print" : "blocked"} (${validation.issues.length} issue(s)). Original uploads were not changed.`
  );
  return { id: created.id, version, status: created.status, issues: validation.issues };
}

export async function overrideDltPackage(packageId: string, reason: string, staffId: string | null) {
  if (reason.trim().length < 8) throw new Error("Enter an override reason of at least 8 characters.");
  const existing = await prisma.licenceDocumentPackage.findUnique({ where: { id: packageId } });
  if (!existing) throw new Error("Package not found.");
  await prisma.licenceDocumentPackage.update({
    where: { id: packageId },
    data: { status: "READY_TO_PRINT", overrideReason: reason.trim() },
  });
  await history(existing.applicationId, staffId, "DLT_PACKAGE_OVERRIDE", reason.trim());
}

export async function acknowledgeFinding(input: {
  applicationId: string;
  findingKey: string;
  note: string;
  staffId: string | null;
}) {
  if (!input.findingKey.trim()) throw new Error("Choose a finding to acknowledge.");
  await prisma.licenceFindingAcknowledgement.upsert({
    where: { applicationId_findingKey: { applicationId: input.applicationId, findingKey: input.findingKey } },
    update: { note: input.note.trim(), staffId: input.staffId },
    create: {
      applicationId: input.applicationId,
      findingKey: input.findingKey,
      note: input.note.trim(),
      staffId: input.staffId,
    },
  });
  await history(input.applicationId, input.staffId, "FINDING_ACKNOWLEDGED", `${input.findingKey} ${input.note}`.trim());
}

export async function saveDltAppointment(input: {
  applicationId: string;
  officeId: string;
  appointmentDate: string;
  appointmentTime: string;
  confirmationNumber: string;
  bookingMethod: string;
  status: string;
  specialInstructions: string;
  assignedStaffId: string;
  staffId: string | null;
}) {
  const application = await prisma.licenceApplication.findUnique({
    where: { id: input.applicationId },
    select: { id: true, status: true, serviceKind: true, email: true, phone: true, locale: true, userId: true, referenceNumber: true, accessToken: true, applicant: { select: { fullLegalName: true } } },
  });
  if (!application) throw new Error("Application not found.");
  if (!PACKAGE_STATUSES.has(application.status)) throw new Error("Approve the application before booking a DLT appointment.");
  const office = input.officeId ? await prisma.dltOffice.findUnique({ where: { id: input.officeId } }) : null;
  const error = appointmentUpdateError({
    status: input.status,
    confirmationNumber: input.confirmationNumber,
    officeActive: office?.active ?? false,
    officeConfigured: Boolean(office),
    officeSupportsService: Boolean(office?.supportedServiceKinds.includes(application.serviceKind)),
    appointmentDate: input.appointmentDate,
  });
  if (error) throw new Error(error);
  const previous = await prisma.dltAppointment.findFirst({
    where: { applicationId: application.id },
    orderBy: { createdAt: "desc" },
  });
  const data = {
    officeId: office?.id,
    appointmentDate: input.appointmentDate || null,
    appointmentTime: input.appointmentTime || null,
    confirmationNumber: input.confirmationNumber.trim() || null,
    bookingMethod: input.bookingMethod || "smart_queue_web",
    status: input.status as "NOT_BOOKED",
    specialInstructions: input.specialInstructions.trim(),
    assignedStaffId: input.assignedStaffId || null,
    confirmedAt: input.status === "CONFIRMED" || input.status === "RESCHEDULED" ? new Date() : null,
  };
  const saved = previous
    ? await prisma.dltAppointment.update({ where: { id: previous.id }, data })
    : await prisma.dltAppointment.create({ data: { ...data, applicationId: application.id } });
  await history(application.id, input.staffId, "DLT_APPOINTMENT_UPDATED", `${saved.status} ${saved.confirmationNumber ?? "no confirmation number"}`.trim());
  const becameConfirmed = (saved.status === "CONFIRMED" || saved.status === "RESCHEDULED") && previous?.status !== saved.status;
  if (becameConfirmed && office) {
    await notifyLicenceCustomer({
      applicationId: application.id,
      template: "appointment_confirmed",
      summary: appointmentSummary(application.applicant?.fullLegalName ?? "Customer", saved.appointmentDate, saved.appointmentTime, office, saved.specialInstructions),
      token: application.accessToken,
      locale: application.locale,
      email: application.email,
      userId: application.userId,
      referenceNumber: application.referenceNumber,
    });
  }
  return saved;
}

function appointmentSummary(
  name: string,
  date: string | null,
  time: string | null,
  office: { nameEn: string; address: string; province: string; specialRequirements: string },
  instructions: string
): string {
  return [
    `${name}, your DLT appointment is recorded for ${date ?? "the date on your confirmation"} ${time ?? ""}.`.trim(),
    `Office: ${office.nameEn}, ${office.province}. ${office.address || OFFICE_ADDRESS_NOTE}`,
    "Bring the original documents SiamEZ listed, plus the copies in your checklist.",
    instructions || office.specialRequirements,
    "SiamEZ: inquiries@siam-ez.com · +66 64 343 8768",
  ].filter(Boolean).join(" ");
}

export async function recordDltVisit(input: {
  applicationId: string;
  outcome: string;
  feedback: string;
  additionalRequirements: string;
  nextAppointmentDate: string;
  notes: string;
  staffId: string | null;
}) {
  const allowed = new Set([
    "SUCCESSFULLY_COMPLETED",
    "LICENCE_ISSUED",
    "ADDITIONAL_DOCUMENTS",
    "ANOTHER_APPOINTMENT",
    "FAILED_EXAMINATION",
    "REJECTED",
    "POSTPONED",
  ]);
  if (!allowed.has(input.outcome)) throw new Error("Choose a visit result.");
  const application = await prisma.licenceApplication.findUnique({
    where: { id: input.applicationId },
    select: { id: true, email: true, userId: true, serviceKind: true },
  });
  if (!application) throw new Error("Application not found.");
  const appointment = await prisma.dltAppointment.findFirst({
    where: { applicationId: application.id },
    orderBy: { createdAt: "desc" },
  });
  const visit = await prisma.licenceVisitResult.create({
    data: {
      applicationId: application.id,
      appointmentId: appointment?.id,
      outcome: input.outcome as "REJECTED",
      feedback: input.feedback.trim(),
      additionalRequirements: input.additionalRequirements.trim(),
      nextAppointmentDate: input.nextAppointmentDate || null,
      notes: input.notes.trim(),
      recordedById: input.staffId,
    },
  });
  const note = [input.feedback, input.additionalRequirements, input.notes].filter(Boolean).join(" ") || "No extra note.";
  await prisma.licenceScreeningLesson.create({
    data: {
      applicationId: application.id,
      serviceKind: application.serviceKind,
      email: application.email,
      userId: application.userId,
      outcome: input.outcome,
      note: note.slice(0, 1000),
    },
  });
  if (appointment && (input.outcome === "LICENCE_ISSUED" || input.outcome === "SUCCESSFULLY_COMPLETED")) {
    await prisma.dltAppointment.update({ where: { id: appointment.id }, data: { status: "COMPLETED" } });
  }
  await history(application.id, input.staffId, "DLT_VISIT_RECORDED", `${input.outcome}. ${note}`.slice(0, 1000));
  return visit;
}

export async function attachVisitDocument(input: {
  applicationId: string;
  staffId: string | null;
  fileName: string;
  bytes: Buffer;
  declaredType?: string | null;
}) {
  const checked = validateUpload({
    bytes: input.bytes,
    declaredType: input.declaredType,
    size: input.bytes.byteLength,
  });
  if (!checked.ok) throw new Error(checked.error);
  const application = await prisma.licenceApplication.findUnique({
    where: { id: input.applicationId },
    select: { id: true },
  });
  if (!application) throw new Error("Application not found.");
  const stored = await storeLicenceFile({
    applicationId: application.id,
    fileName: input.fileName,
    bytes: input.bytes,
    mimeType: checked.mimeType,
  });
  if (stored.exposure === "unconfigured") {
    throw new Error("Document storage is not configured.");
  }
  const document = await prisma.licenceDocument.create({
    data: {
      applicationId: application.id,
      documentType: "other",
      originalName: input.fileName.slice(0, 180),
      storageKey: stored.storageKey,
      mimeType: checked.mimeType,
      size: input.bytes.byteLength,
      uploadedById: input.staffId,
    },
    select: { id: true, originalName: true },
  });
  await history(application.id, input.staffId, "VISIT_DOCUMENT", document.originalName);
  return document;
}

export async function dltCentreOverview() {
  try {
    await ensureDltOffices();
    const approved = await prisma.licenceApplication.findMany({
      where: { status: { in: ["APPROVED_FOR_QUOTATION", "QUOTATION_SENT", "BOOKING_CONFIRMED"] } },
      select: {
        id: true,
        referenceNumber: true,
        email: true,
        serviceKind: true,
        applicant: { select: { fullLegalName: true, nationality: true } },
        packages: { orderBy: { version: "desc" }, take: 1, select: { id: true, status: true, version: true } },
        appointments: { orderBy: { createdAt: "desc" }, take: 1, select: { status: true, appointmentDate: true } },
      },
      orderBy: { updatedAt: "desc" },
      take: 100,
    });
    const today = todayInBangkok();
    const outcomes = await prisma.licenceVisitResult.groupBy({ by: ["outcome"], _count: { _all: true } });
    const countOutcome = (names: string[]) =>
      outcomes.filter((row) => names.includes(row.outcome)).reduce((sum, row) => sum + row._count._all, 0);
    return {
      ready: true,
      applications: approved,
      stats: {
        awaitingGeneration: approved.filter((row) => row.packages.length === 0).length,
        readyToPrint: approved.filter((row) => row.packages[0]?.status === "READY_TO_PRINT").length,
        needsCorrections: approved.filter((row) => row.packages[0]?.status === "BLOCKED").length,
        awaitingBooking: approved.filter((row) => {
          const status = row.appointments[0]?.status;
          return !status || status === "NOT_BOOKED" || status === "BOOKING_IN_PROGRESS" || status === "AWAITING_CONFIRMATION";
        }).length,
        confirmed: approved.filter((row) => row.appointments[0]?.status === "CONFIRMED" || row.appointments[0]?.status === "RESCHEDULED").length,
        today: approved.filter((row) => row.appointments[0]?.appointmentDate === today && row.appointments[0]?.status !== "CANCELLED").length,
        completed: countOutcome(["SUCCESSFULLY_COMPLETED", "LICENCE_ISSUED"]),
        failed: countOutcome(["FAILED_EXAMINATION", "REJECTED", "POSTPONED", "ADDITIONAL_DOCUMENTS", "ANOTHER_APPOINTMENT"]),
      },
    };
  } catch (error) {
    if (missingTable(error)) {
      return {
        ready: false,
        applications: [],
        stats: { awaitingGeneration: 0, readyToPrint: 0, needsCorrections: 0, awaitingBooking: 0, confirmed: 0, today: 0, completed: 0, failed: 0 },
      };
    }
    throw error;
  }
}

export async function dltSchedule(filters: { date?: string; province?: string; officeId?: string; staffId?: string }) {
  await ensureDltOffices();
  const where: Prisma.DltAppointmentWhereInput = {};
  if (filters.date) where.appointmentDate = filters.date;
  if (filters.officeId) where.officeId = filters.officeId;
  if (filters.staffId) where.assignedStaffId = filters.staffId;
  if (filters.province) where.office = { province: filters.province };
  const [rows, offices, staff] = await Promise.all([
    prisma.dltAppointment.findMany({
      where,
      include: {
        office: true,
        assignedStaff: { select: { name: true, email: true } },
        application: {
          select: {
            id: true,
            referenceNumber: true,
            applicant: { select: { fullLegalName: true } },
            packages: { orderBy: { version: "desc" }, take: 1, select: { status: true, version: true } },
          },
        },
      },
      orderBy: [{ appointmentDate: "asc" }, { appointmentTime: "asc" }],
      take: 200,
    }),
    listDltOffices(),
    prisma.user.findMany({
      where: { role: { in: ["admin", "staff"] }, active: true },
      select: { id: true, name: true, email: true },
      orderBy: { name: "asc" },
      take: 100,
    }),
  ]);
  return { rows, offices, staff, today: todayInBangkok() };
}

export async function sendDueDltReminders(now = new Date()): Promise<number> {
  const today = todayInBangkok(now);
  const tomorrowDate = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  const tomorrow = todayInBangkok(tomorrowDate);
  const due = await prisma.dltAppointment.findMany({
    where: {
      status: { in: ["CONFIRMED", "RESCHEDULED"] },
      reminderSentAt: null,
      appointmentDate: { in: [today, tomorrow] },
      confirmationNumber: { not: null },
    },
    include: { office: true, application: { include: { applicant: { select: { fullLegalName: true } } } } },
  });
  let sent = 0;
  for (const appointment of due) {
    if (!appointment.office || !appointment.confirmationNumber) continue;
    await notifyLicenceCustomer({
      applicationId: appointment.applicationId,
      template: "appointment_reminder",
      summary: appointmentSummary(
        appointment.application.applicant?.fullLegalName ?? "Customer",
        appointment.appointmentDate,
        appointment.appointmentTime,
        appointment.office,
        appointment.specialInstructions
      ),
      token: appointment.application.accessToken,
      locale: appointment.application.locale,
      email: appointment.application.email,
      userId: appointment.application.userId,
      referenceNumber: appointment.application.referenceNumber,
    });
    await prisma.dltAppointment.update({ where: { id: appointment.id }, data: { reminderSentAt: now } });
    sent += 1;
  }
  return sent;
}

type Manifest = {
  referenceNumber: string;
  customerName: string;
  nationality: string;
  passportNumber: string;
  dateOfBirth: string;
  serviceTitle: string;
  category: string;
  officeName: string;
  contact: string;
  checklist: Array<{ name: string; level: string; form: string; copies: number; verified: string }>;
  documents: Array<{ id: string; label: string; fileName: string; mimeType?: string; duplicate: boolean }>;
  staffName: string;
  appointment: string;
  outstanding: string[];
  instructions: string;
};

export async function openDltDownload(input: {
  packageId: string;
  kind: "complete" | "cover" | "individual";
  documentId?: string;
  staffId: string | null;
}): Promise<{ bytes: Buffer; fileName: string; mimeType: string } | null> {
  const pack = await prisma.licenceDocumentPackage.findUnique({ where: { id: input.packageId } });
  if (!pack) return null;
  const manifest = pack.manifest as Manifest;
  let bytes: Buffer | null = null;
  let fileName = `${manifest.referenceNumber}-dlt-package.pdf`;
  let mimeType = "application/pdf";
  if (input.kind === "complete") {
    bytes = await readLicenceFile(pack.storageKey);
  } else if (input.kind === "cover") {
    const pdf = await buildDltPackagePdf({
      kind: "cover",
      ...manifest,
      documents: manifest.documents.map((document) => ({
        label: document.label,
        fileName: document.fileName,
        mimeType: "application/pdf",
        bytes: new Uint8Array(),
        duplicate: document.duplicate,
      })),
    });
    bytes = Buffer.from(pdf);
    fileName = `${manifest.referenceNumber}-cover-sheet.pdf`;
  } else if (input.documentId) {
    const listed = manifest.documents.find((document) => document.id === input.documentId);
    if (!listed) return null;
    const document = await prisma.licenceDocument.findFirst({
      where: { id: input.documentId, applicationId: pack.applicationId },
    });
    if (!document) return null;
    bytes = await readLicenceFile(document.storageKey);
    fileName = document.originalName;
    mimeType = document.mimeType;
  }
  if (!bytes) return null;
  await prisma.licencePackagePrint.create({
    data: { packageId: pack.id, kind: input.kind, documentId: input.documentId ?? null, printedById: input.staffId },
  });
  if (pack.status === "READY_TO_PRINT" && input.kind === "complete") {
    await prisma.licenceDocumentPackage.update({ where: { id: pack.id }, data: { status: "PRINTED" } });
  }
  await history(pack.applicationId, input.staffId, "DLT_PACKAGE_PRINTED", `Version ${pack.version} ${input.kind} downloaded.`);
  return { bytes, fileName, mimeType };
}

export type { LicenceServiceKind };
