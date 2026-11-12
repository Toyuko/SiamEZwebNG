import { randomBytes } from "crypto";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import type { BackofficeActor } from "@/lib/backoffice/types";
import { getAppBaseUrl } from "@/lib/email/config";
import { ctaButton, emailLayout, heading, paragraph } from "@/lib/email/layout";
import { sendEmail } from "@/lib/email/send";
import { accessTokensMatch } from "@/lib/licence-verification/access";
import { documentLabel as customerDocumentLabel, serviceTitle, type LicenceLocale } from "@/lib/licence-verification/copy";
import { ensureLicenceRequirements, assignLicenceStaff, approveLicenceQuotation, runLicenceAssessment, uploadLicenceDocument } from "@/lib/licence-verification/service";
import { sendPushNotification } from "@/lib/sendPushNotification";
import { checkRateLimit } from "@/lib/security/rate-limit";
import { nextCaseNumber } from "@/lib/utils";
import { DRIVER_LICENSE_SERVICE_SLUG } from "@/lib/licence-verification/catalog";
import type { ApplicantProfile, LicenceServiceKind, ScreeningRule, VehicleChoice } from "@/lib/licence-verification/types";
import { profileFromInput, validateApplicant } from "@/lib/licence-verification/validation";
import {
  applicationAcceptsCustomerUpload,
  applicationIsTerminal,
  assertServiceKind,
  buildUploadCustomerMessage,
  checklistForRequest,
  documentLabel,
  isRoutableEmail,
  mergeChecklist,
  outstandingDocuments,
  parseChecklist,
  parseExpiry,
  planFollowUp,
  previewApplicant,
  quotationEligible,
  renewalVehicleFor,
  stripSecrets,
  uploadLinkDecision,
  type LicenceChatCard,
  type PublicApplicantDraft,
  type PublicUploadView,
  type ServiceVehicle,
  type UploadLinkStatus,
} from "@/lib/licence-verification/upload-link";

export class UploadLinkError extends Error {
  constructor(message: string, readonly status: number) {
    super(message);
    this.name = "UploadLinkError";
  }
}

type Viewer = { id: string; role: string } | null;

const linkInclude = {
  application: {
    include: {
      applicant: true,
      documents: { orderBy: { createdAt: "desc" as const } },
      assessments: { orderBy: { createdAt: "desc" as const }, take: 1, include: { findings: true } },
      invoice: { select: { id: true, status: true } },
    },
  },
  events: { orderBy: { createdAt: "asc" as const }, take: 80 },
} satisfies Prisma.LicenceUploadRequestInclude;

type LoadedLink = Prisma.LicenceUploadRequestGetPayload<{ include: typeof linkInclude }>;

function localeOf(value: string | null | undefined): LicenceLocale {
  return value === "th" ? "th" : "en";
}

function uploadUrl(locale: string, token: string): string {
  const base = getAppBaseUrl().replace(/\/$/, "");
  return `${base}/${localeOf(locale)}/licence-upload/${token}`;
}

function asStatus(value: string): UploadLinkStatus {
  if (value === "OPENED" || value === "SUBMITTED" || value === "EXPIRED" || value === "REVOKED") return value;
  return "ACTIVE";
}

function isoDate(value: Date | null | undefined): string {
  if (!value) return "";
  return value.toISOString().slice(0, 10);
}

function asDate(iso: string | null | undefined): Date | null {
  if (!iso) return null;
  return new Date(`${iso.slice(0, 10)}T00:00:00.000Z`);
}

function vehicleOf(value: string | null | undefined): VehicleChoice | null {
  if (value === "car" || value === "bike" || value === "both") return value;
  return null;
}

function profileFromApplicant(row: LoadedLink["application"]["applicant"], kind: LicenceServiceKind): ApplicantProfile | undefined {
  if (!row) return undefined;
  const format = row.foreignLicenceFormat === "physical" || row.foreignLicenceFormat === "digital" ? row.foreignLicenceFormat : null;
  const language = row.foreignLicenceLanguage === "english" || row.foreignLicenceLanguage === "other" ? row.foreignLicenceLanguage : null;
  return {
    fullLegalName: row.fullLegalName,
    nationality: row.nationality,
    dateOfBirth: isoDate(row.dateOfBirth),
    passportNumber: row.passportNumber,
    countryOfResidence: row.countryOfResidence,
    immigrationStatus: row.immigrationStatus,
    visaExpiryDate: isoDate(row.visaExpiryDate) || null,
    thaiAddress: row.thaiAddress,
    hasResidenceCertificate: row.hasResidenceCertificate,
    hasWorkPermit: row.hasWorkPermit,
    hasForeignLicence: row.hasForeignLicence,
    foreignLicenceCountry: row.foreignLicenceCountry,
    foreignLicenceCategories: row.foreignLicenceCategories,
    foreignLicenceIssueDate: isoDate(row.foreignLicenceIssueDate) || null,
    foreignLicenceExpiryDate: isoDate(row.foreignLicenceExpiryDate) || null,
    foreignLicenceFormat: format,
    foreignLicenceLanguage: language,
    previouslyHeldThaiLicence: row.previouslyHeldThaiLicence,
    failedOrAttemptedBefore: row.failedOrAttemptedBefore,
    attemptNotes: row.attemptNotes,
    renewalVehicle: vehicleOf(row.renewalVehicle) ?? previewApplicant(kind).renewalVehicle,
  };
}

function applicantData(profile: ApplicantProfile) {
  return {
    fullLegalName: profile.fullLegalName,
    nationality: profile.nationality,
    dateOfBirth: asDate(profile.dateOfBirth) ?? new Date("1990-01-01T00:00:00.000Z"),
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

function draftFromApplicant(row: NonNullable<LoadedLink["application"]["applicant"]>, fallback: { name: string; email: string; phone: string }): PublicApplicantDraft {
  const format = row.foreignLicenceFormat === "digital" ? "digital" : "physical";
  const language = row.foreignLicenceLanguage === "other" ? "other" : "english";
  const vehicle = vehicleOf(row.renewalVehicle) ?? "car";
  return {
    fullLegalName: row.fullLegalName,
    nationality: row.nationality,
    dateOfBirth: isoDate(row.dateOfBirth),
    passportNumber: row.passportNumber,
    countryOfResidence: row.countryOfResidence,
    immigrationStatus: row.immigrationStatus,
    visaExpiryDate: isoDate(row.visaExpiryDate),
    thaiAddress: row.thaiAddress,
    email: isRoutableEmail(fallback.email) ? fallback.email : "",
    phone: fallback.phone,
    hasResidenceCertificate: row.hasResidenceCertificate,
    hasWorkPermit: row.hasWorkPermit,
    hasForeignLicence: row.hasForeignLicence,
    foreignLicenceCountry: row.foreignLicenceCountry ?? "",
    foreignLicenceCategories: row.foreignLicenceCategories ?? "",
    foreignLicenceIssueDate: isoDate(row.foreignLicenceIssueDate),
    foreignLicenceExpiryDate: isoDate(row.foreignLicenceExpiryDate),
    foreignLicenceFormat: format,
    foreignLicenceLanguage: language,
    previouslyHeldThaiLicence: row.previouslyHeldThaiLicence,
    failedOrAttemptedBefore: row.failedOrAttemptedBefore,
    attemptNotes: row.attemptNotes ?? "",
    renewalVehicle: vehicle,
  };
}

async function activeRules(): Promise<ScreeningRule[]> {
  await ensureLicenceRequirements();
  const rows = await prisma.licenceRequirement.findMany({ where: { active: true } });
  return rows.map((row) => ({
    ruleKey: row.ruleKey,
    name: row.name,
    description: row.description,
    serviceKinds: row.serviceKinds,
    customerCategories: row.customerCategories,
    level: row.level,
    source: row.source,
    lastVerifiedOn: row.lastVerifiedOn.toISOString().slice(0, 10),
    active: row.active,
    evaluatorKey: row.evaluatorKey,
  }));
}

async function addEvent(input: {
  requestId: string;
  applicationId: string;
  actorId?: string | null;
  event: string;
  detail: string;
  passportNumber?: string | null;
}) {
  await prisma.licenceUploadEvent.create({
    data: {
      requestId: input.requestId,
      applicationId: input.applicationId,
      actorId: input.actorId || null,
      event: input.event,
      detail: stripSecrets(input.detail, [input.passportNumber]).slice(0, 2000),
    },
  });
}

async function addHistory(input: {
  applicationId: string;
  actorId?: string | null;
  event: string;
  fromStatus?: string | null;
  toStatus?: string | null;
  detail: string;
  passportNumber?: string | null;
}) {
  await prisma.licenceApplicationHistory.create({
    data: {
      applicationId: input.applicationId,
      actorId: input.actorId || null,
      event: input.event,
      fromStatus: input.fromStatus ?? null,
      toStatus: input.toStatus ?? null,
      detail: stripSecrets(input.detail, [input.passportNumber]).slice(0, 2000),
    },
  });
}

function crossCustomer(applicationUserId: string | null, viewer: Viewer): boolean {
  if (!viewer || !applicationUserId) return false;
  if (viewer.role === "admin" || viewer.role === "staff") return false;
  return viewer.id !== applicationUserId;
}

async function findLink(token: string): Promise<LoadedLink | null> {
  if (!/^[a-f0-9]{64}$/.test(token)) return null;
  const request = await prisma.licenceUploadRequest.findUnique({ where: { token }, include: linkInclude });
  if (!request || !accessTokensMatch(request.token, token)) return null;
  return request;
}

async function syncExpiry(request: LoadedLink) {
  const decision = uploadLinkDecision({
    status: asStatus(request.status),
    expiresAt: request.expiresAt,
    now: new Date(),
  });
  if (decision.reason === "expired" && request.status !== "EXPIRED") {
    await prisma.licenceUploadRequest.update({ where: { id: request.id }, data: { status: "EXPIRED" } });
    await addEvent({
      requestId: request.id,
      applicationId: request.applicationId,
      event: "expired",
      detail: "The upload link passed its expiry.",
      passportNumber: request.application.applicant?.passportNumber,
    });
    request.status = "EXPIRED";
  }
  return decision;
}

function canUseConversation(actor: BackofficeActor, staffId: string | null): boolean {
  if (actor.role === "admin" || !actor.id) return true;
  return !staffId || staffId === actor.id;
}

async function assertConversation(actor: BackofficeActor, conversationId: string) {
  const conversation = await prisma.backofficeConversation.findUnique({ where: { id: conversationId } });
  if (!conversation) throw new UploadLinkError("That conversation was not found.", 404);
  if (!canUseConversation(actor, conversation.staffId)) {
    throw new UploadLinkError("That conversation belongs to another staff member.", 403);
  }
  return conversation;
}

async function customerById(id: string | null | undefined) {
  if (!id) return null;
  const user = await prisma.user.findUnique({
    where: { id },
    select: { id: true, name: true, email: true, phone: true, role: true },
  });
  return user?.role === "customer" ? user : null;
}

async function customerByEmail(email: string | null | undefined) {
  if (!isRoutableEmail(email)) return null;
  const user = await prisma.user.findUnique({
    where: { email: email!.trim().toLowerCase() },
    select: { id: true, name: true, email: true, phone: true, role: true },
  });
  return user?.role === "customer" ? user : null;
}

export async function searchUploadCustomers(query: string) {
  const q = query.trim();
  if (q.length < 2) return [];
  return prisma.user.findMany({
    where: {
      role: "customer",
      active: true,
      OR: [
        { email: { contains: q, mode: "insensitive" } },
        { name: { contains: q, mode: "insensitive" } },
        { phone: { contains: q } },
      ],
    },
    select: { id: true, name: true, email: true, phone: true },
    take: 8,
    orderBy: { name: "asc" },
  });
}

async function unionChecklist(applicationId: string): Promise<string[]> {
  const rows = await prisma.licenceUploadRequest.findMany({
    where: { applicationId },
    select: { checklist: true },
  });
  return mergeChecklist([], rows.flatMap((row) => parseChecklist(row.checklist)));
}

export async function createUploadRequest(actor: BackofficeActor, raw: {
  conversationId?: string | null;
  applicationId?: string | null;
  userId?: string | null;
  customerName?: string | null;
  email?: string | null;
  phone?: string | null;
  serviceKind: string;
  vehicle?: ServiceVehicle | null;
  message?: string | null;
  expiresAt?: string | null;
  extraDocuments?: string[];
  locale?: string | null;
}) {
  const limit = checkRateLimit(`licence-upload-request:${actor.id ?? actor.email}`, 30, 60 * 60 * 1000);
  if (!limit.allowed) throw new UploadLinkError("Too many upload links were created. Wait a little and try again.", 429);

  const requestedKind = assertServiceKind(raw.serviceKind);
  const expiresAt = parseExpiry(raw.expiresAt, new Date());
  const locale = localeOf(raw.locale);
  const namedCustomer = await customerById(raw.userId);
  const emailCustomer = namedCustomer ? null : await customerByEmail(raw.email);
  const customer = namedCustomer ?? emailCustomer;
  const email = (raw.email ?? customer?.email ?? "").trim().toLowerCase();
  const phone = (raw.phone ?? customer?.phone ?? "").trim();
  const customerName = (raw.customerName ?? customer?.name ?? "").trim();
  if (customerName.length < 2) throw new UploadLinkError("Enter the customer's name.", 400);
  if (!isRoutableEmail(email) && phone.replace(/\D/g, "").length < 6) {
    throw new UploadLinkError("Enter an email address or a phone number.", 400);
  }

  let conversation = raw.conversationId ? await assertConversation(actor, raw.conversationId) : null;
  if (!conversation) {
    conversation = await prisma.backofficeConversation.create({
      data: { staffId: actor.id, title: `Driving licence — ${customerName}`.slice(0, 80) },
    });
  }

  const terminal = ["REJECTED", "BOOKING_CONFIRMED"] as const;
  let application = raw.applicationId
    ? await prisma.licenceApplication.findUnique({ where: { id: raw.applicationId }, include: { applicant: true } })
    : null;
  if (raw.applicationId && !application) throw new UploadLinkError("Application not found.", 404);
  if (application && customer && application.userId && application.userId !== customer.id) {
    throw new UploadLinkError("That application belongs to another customer.", 409);
  }
  if (!application && customer) {
    application = await prisma.licenceApplication.findFirst({
      where: { userId: customer.id, status: { notIn: [...terminal] } },
      orderBy: { createdAt: "desc" },
      include: { applicant: true },
    });
  }
  if (!application && isRoutableEmail(email)) {
    application = await prisma.licenceApplication.findFirst({
      where: { email, status: { notIn: [...terminal] } },
      orderBy: { createdAt: "desc" },
      include: { applicant: true },
    });
  }
  if (!application && phone.replace(/\D/g, "").length >= 6) {
    const prior = await prisma.licenceUploadRequest.findFirst({
      where: {
        phone,
        customerName: { equals: customerName, mode: "insensitive" },
        application: { status: { notIn: [...terminal] } },
      },
      orderBy: { createdAt: "desc" },
      select: { applicationId: true },
    });
    if (prior) {
      application = await prisma.licenceApplication.findUnique({
        where: { id: prior.applicationId },
        include: { applicant: true },
      });
    }
  }

  const reused = Boolean(application);
  if (application && applicationIsTerminal(application.status)) {
    throw new UploadLinkError("This application is already closed.", 409);
  }

  const rules = await activeRules();
  const profile = application ? profileFromApplicant(application.applicant, application.serviceKind) : undefined;
  let serviceKind = requestedKind;
  if (application) {
    const early = application.status === "DRAFT" || application.status === "AWAITING_DOCUMENTS";
    if (early && application.serviceKind !== requestedKind) {
      await prisma.licenceApplication.update({
        where: { id: application.id },
        data: { serviceKind: requestedKind },
      });
      application.serviceKind = requestedKind;
    }
    serviceKind = application.serviceKind;
    if (!applicationAcceptsCustomerUpload(application.status)) {
      const from = application.status;
      await prisma.licenceApplication.update({
        where: { id: application.id },
        data: { status: "CORRECTIONS_REQUIRED" },
      });
      await addHistory({
        applicationId: application.id,
        actorId: actor.id,
        event: "CORRECTION_REQUESTED",
        fromStatus: from,
        toStatus: "CORRECTIONS_REQUIRED",
        detail: "Sales asked for more documents on the same application.",
      });
      application.status = "CORRECTIONS_REQUIRED";
    }
  } else {
    const service = await prisma.service.findUnique({
      where: { slug: DRIVER_LICENSE_SERVICE_SLUG },
      select: { id: true },
    });
    const accessToken = randomBytes(32).toString("hex");
    const created = await prisma.licenceApplication.create({
      data: {
        referenceNumber: nextCaseNumber("DLV"),
        accessToken,
        userId: customer?.id ?? null,
        serviceId: service?.id,
        assignedStaffId: actor.id,
        serviceKind: requestedKind,
        status: "AWAITING_DOCUMENTS",
        email: isRoutableEmail(email) ? email : `pending-${accessToken.slice(0, 12)}@upload.siamez.invalid`,
        phone: phone || null,
        locale,
      },
      include: { applicant: true },
    });
    application = created;
    await addHistory({
      applicationId: created.id,
      actorId: actor.id,
      event: "UPLOAD_REQUEST_CREATED",
      toStatus: "AWAITING_DOCUMENTS",
      detail: "Sales created a document upload link.",
    });
    if (actor.id) await assignLicenceStaff(created.id, actor.id, actor.id);
  }

  const prior = await unionChecklist(application.id);
  const base = checklistForRequest(serviceKind, [], rules, profile);
  const checklist = planFollowUp({
    applicationId: application.id,
    existingChecklist: mergeChecklist(prior, base),
    extraDocuments: raw.extraDocuments ?? [],
  }).checklist;
  const renewalVehicle = renewalVehicleFor(serviceKind, raw.vehicle ?? vehicleOf(application.applicant?.renewalVehicle));
  const note = stripSecrets(raw.message?.trim() ?? "", [application.applicant?.passportNumber]);
  const token = randomBytes(32).toString("hex");
  const request = await prisma.licenceUploadRequest.create({
    data: {
      applicationId: application.id,
      conversationId: conversation.id,
      salesRepId: actor.id,
      customerUserId: customer?.id ?? application.userId,
      customerName,
      email: isRoutableEmail(email) ? email : null,
      phone: phone || null,
      serviceKind,
      renewalVehicle,
      message: note || null,
      checklist,
      token,
      status: "ACTIVE",
      expiresAt,
    },
  });
  await addEvent({
    requestId: request.id,
    applicationId: application.id,
    actorId: actor.id,
    event: reused ? "follow_up" : "created",
    detail: reused ? "Asked for more documents on the same application." : "Created a driving licence upload link.",
    passportNumber: application.applicant?.passportNumber,
  });
  if (reused) {
    await addHistory({
      applicationId: application.id,
      actorId: actor.id,
      event: "FOLLOW_UP_REQUESTED",
      detail: "Sales added another upload request on the same application.",
    });
  }

  const contextBase =
    conversation.context && typeof conversation.context === "object" && !Array.isArray(conversation.context)
      ? { ...(conversation.context as Record<string, unknown>) }
      : {};
  await prisma.backofficeConversation.update({
    where: { id: conversation.id },
    data: {
      title: conversation.title ?? `Driving licence — ${customerName}`.slice(0, 80),
      context: {
        ...contextBase,
        lastCustomerId: customer?.id ?? application.userId,
        lastCustomerName: customerName,
      } as Prisma.InputJsonValue,
    },
  });

  const link = uploadUrl(locale, token);
  const message = buildUploadCustomerMessage({
    link,
    note,
    passportNumber: application.applicant?.passportNumber,
  });
  return {
    requestId: request.id,
    applicationId: application.id,
    referenceNumber: application.referenceNumber,
    conversationId: conversation.id,
    link,
    message,
    reusedApplication: reused,
    emailAvailable: isRoutableEmail(email),
    channels: {
      chat: "copy_only" as const,
      email: "copy_only" as const,
      push: "unavailable" as const,
      line: "copy_only" as const,
      whatsapp: "copy_only" as const,
      copy: "available" as const,
    },
  };
}

export async function deliverUploadRequest(actor: BackofficeActor, input: {
  requestId: string;
  message: string;
  chat: boolean;
  email: boolean;
}) {
  const request = await prisma.licenceUploadRequest.findUnique({
    where: { id: input.requestId },
    include: linkInclude,
  });
  if (!request) throw new UploadLinkError("Application not found.", 404);
  if (request.conversationId) await assertConversation(actor, request.conversationId);
  else if (actor.role !== "admin" && request.salesRepId && actor.id && request.salesRepId !== actor.id) {
    throw new UploadLinkError("That request belongs to another staff member.", 403);
  }
  const decision = await syncExpiry(request);
  if (!decision.acceptUploads) {
    throw new UploadLinkError(
      decision.reason === "revoked" ? "This link has been revoked." : "This link has expired.",
      410
    );
  }

  const locale = localeOf(request.application.locale);
  const link = uploadUrl(locale, request.token);
  const passportNumber = request.application.applicant?.passportNumber ?? null;
  let message = stripSecrets(input.message.trim(), [passportNumber]).slice(0, 4000);
  if (!message) message = buildUploadCustomerMessage({ link, passportNumber });
  if (!message.includes(request.token)) message = `${message}\n\n${link}`;

  const channels = {
    chat: "copy_only" as "posted" | "copy_only",
    email: "copy_only" as "sent" | "skipped" | "failed" | "copy_only",
    push: "unavailable" as "sent" | "failed" | "unavailable",
    line: "copy_only" as const,
    whatsapp: "copy_only" as const,
    copy: "available" as const,
  };

  let conversationId = request.conversationId;
  if (input.chat) {
    if (!conversationId) {
      const created = await prisma.backofficeConversation.create({
        data: { staffId: actor.id, title: `Driving licence — ${request.customerName}`.slice(0, 80) },
      });
      conversationId = created.id;
      await prisma.licenceUploadRequest.update({
        where: { id: request.id },
        data: { conversationId },
      });
    }
    await prisma.backofficeMessage.create({
      data: { conversationId, role: "user", content: message },
    });
    await prisma.backofficeAuditLog.create({
      data: {
        conversationId,
        staffId: actor.id,
        actorEmail: actor.email,
        actorRole: actor.role,
        action: "licence_upload_link",
        status: "success",
        summary: `Posted a driving licence upload link for ${request.application.referenceNumber}.`,
        entityType: "licence_application",
        entityId: request.applicationId,
      },
    });
    await addEvent({
      requestId: request.id,
      applicationId: request.applicationId,
      actorId: actor.id,
      event: "sent_chat",
      detail: "Posted the upload link in the sales chat.",
      passportNumber,
    });
    channels.chat = "posted";
  }

  const to = isRoutableEmail(request.email) ? request.email! : isRoutableEmail(request.application.email) ? request.application.email : null;
  if (input.email && to) {
    const subject = locale === "th" ? "ลิงก์ส่งเอกสารใบขับขี่จาก SiamEZ" : "Your SiamEZ driving licence document link";
    const html = emailLayout({
      title: subject,
      preheader: request.application.referenceNumber,
      bodyHtml: [
        heading(subject),
        ...message.split("\n").filter((line) => line.trim()).map((line) => paragraph(line)),
        paragraph(locale === "th"
          ? "นี่เป็นการตรวจเอกสารเบื้องต้นของ SiamEZ ไม่ใช่การอนุมัติจากกรมการขนส่งทางบก"
          : "This is SiamEZ’s initial document check. It is not approval from the Department of Land Transport."),
        ctaButton(link, locale === "th" ? "เปิดแบบฟอร์ม" : "Open the form"),
      ].join(""),
    });
    const result = await sendEmail({
      to,
      subject: `[${request.application.referenceNumber}] ${subject}`,
      html,
      text: message,
    });
    await prisma.licenceCustomerNotification.create({
      data: {
        applicationId: request.applicationId,
        channel: "email",
        templateKey: "upload_link",
        toAddress: to,
        subject,
        bodySummary: stripSecrets(message, [passportNumber]).slice(0, 500),
        status: result.ok ? "SENT" : result.skipped ? "SKIPPED" : "FAILED",
        error: result.ok ? null : result.error,
      },
    });
    channels.email = result.ok ? "sent" : result.skipped ? "skipped" : "failed";
    await addEvent({
      requestId: request.id,
      applicationId: request.applicationId,
      actorId: actor.id,
      event: "sent_email",
      detail: result.ok ? "Emailed the upload link." : "The upload link email was not sent. Copy the message instead.",
      passportNumber,
    });
    await addHistory({
      applicationId: request.applicationId,
      actorId: actor.id,
      event: "UPLOAD_LINK_SENT",
      detail: result.ok ? "Emailed the document upload link." : "Tried to email the upload link.",
    });
  }

  const pushUserId = request.customerUserId ?? request.application.userId;
  if ((input.chat || input.email) && pushUserId) {
    const pushed = await sendPushNotification(
      pushUserId,
      locale === "th" ? "SiamEZ ส่งลิงก์เอกสารใบขับขี่" : "SiamEZ sent a driving licence document link",
      `SiamEZ sent a secure driving licence form: ${link}`,
      { reference: request.application.referenceNumber }
    );
    if (pushed) {
      channels.push = "sent";
      await addEvent({
        requestId: request.id,
        applicationId: request.applicationId,
        actorId: actor.id,
        event: "sent_push",
        detail: "Sent a push notification where the customer has the app.",
        passportNumber,
      });
    }
  }

  return {
    requestId: request.id,
    conversationId,
    link,
    message,
    referenceNumber: request.application.referenceNumber,
    channels,
  };
}

function toCard(request: LoadedLink, locale: LicenceLocale): LicenceChatCard {
  const passportNumber = request.application.applicant?.passportNumber ?? null;
  const activeTypes = request.application.documents.filter((doc) => doc.active).map((doc) => doc.documentType);
  const checklist = parseChecklist(request.checklist);
  const outcome = request.application.assessments[0]?.outcome ?? null;
  const summary = request.application.assessments[0]?.summary ?? null;
  return {
    requestId: request.id,
    applicationId: request.applicationId,
    referenceNumber: request.application.referenceNumber,
    serviceKind: request.application.serviceKind,
    serviceLabel: serviceTitle(request.application.serviceKind, locale),
    customerName: request.application.applicant?.fullLegalName || request.customerName,
    email: isRoutableEmail(request.email) ? request.email : isRoutableEmail(request.application.email) ? request.application.email : null,
    phone: request.phone ?? request.application.phone,
    linkStatus: asStatus(request.status),
    expiresAt: request.expiresAt?.toISOString() ?? null,
    applicationStatus: request.application.status,
    quotationEligible: quotationEligible(request.application.status, request.application.referenceNumber),
    aiOutcome: outcome,
    aiSummary: summary ? stripSecrets(summary, [passportNumber]) : null,
    documents: request.application.documents.map((doc) => ({
      id: doc.id,
      documentType: doc.documentType,
      label: documentLabel(doc.documentType),
      originalName: doc.originalName,
      active: doc.active,
      replacesDocumentId: doc.replacesDocumentId,
    })),
    outstanding: outstandingDocuments(checklist, activeTypes),
    checklist,
    timeline: request.events.map((event) => ({
      id: event.id,
      event: event.event,
      detail: stripSecrets(event.detail, [passportNumber]),
      createdAt: event.createdAt.toISOString(),
    })),
    link: uploadUrl(request.application.locale, request.token),
    adminHref: `/admin/licence-verification/${request.applicationId}`,
    createdAt: request.createdAt.toISOString(),
  };
}

export async function loadLicenceChatPanel(actor: BackofficeActor, conversationId: string | null) {
  if (!conversationId) return { customer: null as { id: string; name: string | null; email: string; phone: string | null } | null, requests: [] as LicenceChatCard[] };
  const conversation = await assertConversation(actor, conversationId);
  const context = conversation.context && typeof conversation.context === "object" && !Array.isArray(conversation.context)
    ? (conversation.context as Record<string, unknown>)
    : {};
  const customerId = typeof context.lastCustomerId === "string" ? context.lastCustomerId : null;
  const customer = await customerById(customerId);
  const requests = await prisma.licenceUploadRequest.findMany({
    where: { conversationId },
    orderBy: { createdAt: "desc" },
    take: 8,
    include: linkInclude,
  });
  return {
    customer: customer ? { id: customer.id, name: customer.name, email: customer.email, phone: customer.phone } : null,
    requests: requests.map((request) => toCard(request, "en")),
  };
}

export async function revokeUploadRequest(actor: BackofficeActor, requestId: string) {
  const request = await prisma.licenceUploadRequest.findUnique({ where: { id: requestId }, include: linkInclude });
  if (!request) throw new UploadLinkError("Application not found.", 404);
  if (request.conversationId) await assertConversation(actor, request.conversationId);
  if (request.status === "REVOKED") return { ok: true as const };
  await prisma.licenceUploadRequest.update({
    where: { id: request.id },
    data: { status: "REVOKED", revokedAt: new Date() },
  });
  await addEvent({
    requestId: request.id,
    applicationId: request.applicationId,
    actorId: actor.id,
    event: "revoked",
    detail: "Staff revoked the upload link.",
    passportNumber: request.application.applicant?.passportNumber,
  });
  await addHistory({
    applicationId: request.applicationId,
    actorId: actor.id,
    event: "UPLOAD_LINK_REVOKED",
    detail: "Staff revoked the upload link.",
  });
  await prisma.backofficeAuditLog.create({
    data: {
      conversationId: request.conversationId,
      staffId: actor.id,
      actorEmail: actor.email,
      actorRole: actor.role,
      action: "licence_upload_revoke",
      status: "success",
      summary: `Revoked the upload link for ${request.application.referenceNumber}.`,
      entityType: "licence_application",
      entityId: request.applicationId,
    },
  });
  return { ok: true as const };
}

export async function approveUploadQuotation(actor: BackofficeActor, requestId: string, overrideReason?: string | null) {
  const request = await prisma.licenceUploadRequest.findUnique({ where: { id: requestId }, select: { id: true, applicationId: true, conversationId: true } });
  if (!request) throw new UploadLinkError("Application not found.", 404);
  if (request.conversationId) await assertConversation(actor, request.conversationId);
  await approveLicenceQuotation({ applicationId: request.applicationId, staffId: actor.id, overrideReason });
  await addEvent({
    requestId: request.id,
    applicationId: request.applicationId,
    actorId: actor.id,
    event: "quotation_approved",
    detail: "Staff approved the application for quotation.",
  });
  return { ok: true as const };
}

export async function rerunUploadAssessment(actor: BackofficeActor, requestId: string) {
  const request = await prisma.licenceUploadRequest.findUnique({
    where: { id: requestId },
    include: { application: { select: { id: true, applicant: { select: { passportNumber: true } } } } },
  });
  if (!request) throw new UploadLinkError("Application not found.", 404);
  await addEvent({
    requestId: request.id,
    applicationId: request.applicationId,
    actorId: actor.id,
    event: "ai_started",
    detail: "Staff started document screening.",
    passportNumber: request.application.applicant?.passportNumber,
  });
  const result = await runLicenceAssessment({ applicationId: request.applicationId, actorId: actor.id, customer: false });
  await addEvent({
    requestId: request.id,
    applicationId: request.applicationId,
    actorId: actor.id,
    event: "ai_findings",
    detail: `Screening finished with ${result.outcome}. A pass is not Department of Land Transport approval and does not create an invoice.`,
    passportNumber: request.application.applicant?.passportNumber,
  });
  return result;
}

export async function loadPublicUploadLink(token: string, viewer: Viewer, locale: string): Promise<PublicUploadView | null> {
  const request = await findLink(token);
  if (!request || crossCustomer(request.application.userId, viewer)) return null;
  const decision = await syncExpiry(request);
  const lang = localeOf(locale);
  if (!decision.acceptUploads) {
    return {
      blocked: true,
      reason: decision.reason === "revoked" ? "revoked" : "expired",
      referenceNumber: request.application.referenceNumber,
      serviceTitle: serviceTitle(request.application.serviceKind, lang),
    };
  }
  if (!request.openedAt) {
    await prisma.licenceUploadRequest.update({
      where: { id: request.id },
      data: {
        openedAt: new Date(),
        status: request.status === "ACTIVE" ? "OPENED" : request.status,
      },
    });
    await addEvent({
      requestId: request.id,
      applicationId: request.applicationId,
      event: "opened",
      detail: "The customer opened the upload link.",
      passportNumber: request.application.applicant?.passportNumber,
    });
    await addHistory({
      applicationId: request.applicationId,
      event: "UPLOAD_LINK_OPENED",
      detail: "The customer opened the upload link.",
    });
  }
  const expected = await unionChecklist(request.applicationId);
  const active = request.application.documents.filter((doc) => doc.active);
  const uploaded = new Set(active.map((doc) => doc.documentType));
  const contactEmail = isRoutableEmail(request.email) ? request.email! : isRoutableEmail(request.application.email) ? request.application.email : "";
  const contactPhone = request.phone ?? request.application.phone ?? "";
  return {
    blocked: false,
    referenceNumber: request.application.referenceNumber,
    serviceKind: request.application.serviceKind,
    serviceTitle: serviceTitle(request.application.serviceKind, lang),
    checklist: expected.map((type) => ({
      type,
      label: customerDocumentLabel(type, lang),
      uploaded: uploaded.has(type),
    })),
    documents: active.map((doc) => ({
      id: doc.id,
      documentType: doc.documentType,
      originalName: doc.originalName,
      active: doc.active,
    })),
    applicant: request.application.applicant
      ? draftFromApplicant(request.application.applicant, { name: request.customerName, email: contactEmail, phone: contactPhone })
      : null,
    prefill: { fullLegalName: request.customerName, email: contactEmail, phone: contactPhone },
    submitted: request.status === "SUBMITTED" || Boolean(request.submittedAt),
    renewalNeeded: request.application.serviceKind === "RENEWAL" || request.application.serviceKind === "LOST_REPLACEMENT",
    conversion: request.application.serviceKind.startsWith("CONVERSION_"),
  };
}

export async function grantUploadLinkCookieToken(token: string, viewer: Viewer): Promise<string | null> {
  const request = await findLink(token);
  if (!request || crossCustomer(request.application.userId, viewer)) return null;
  const decision = uploadLinkDecision({ status: asStatus(request.status), expiresAt: request.expiresAt, now: new Date() });
  if (!decision.acceptUploads) return null;
  return request.application.accessToken;
}

async function requireOpenLink(token: string, viewer: Viewer) {
  const request = await findLink(token);
  if (!request || crossCustomer(request.application.userId, viewer)) {
    throw new UploadLinkError("Application not found.", 404);
  }
  const decision = await syncExpiry(request);
  if (!decision.acceptUploads) {
    throw new UploadLinkError(
      decision.reason === "revoked" ? "This link has been revoked." : "This link has expired.",
      410
    );
  }
  return request;
}

export async function saveUploadLinkDetails(token: string, viewer: Viewer, raw: unknown, locale: string) {
  const limit = checkRateLimit(`licence-upload-save:${token}`, 20, 60 * 60 * 1000);
  if (!limit.allowed) throw new UploadLinkError("Too many saves. Wait a little and try again.", 429);
  const request = await requireOpenLink(token, viewer);
  const parsed = validateApplicant({
    ...(raw && typeof raw === "object" ? raw : {}),
    serviceKind: request.application.serviceKind,
    locale: localeOf(locale),
  });
  if (!parsed.ok) throw new UploadLinkError(parsed.error, 400);
  const shaped = profileFromInput(parsed.data);
  const data = applicantData(shaped.profile);
  await prisma.licenceApplicantDetails.upsert({
    where: { applicationId: request.applicationId },
    create: { applicationId: request.applicationId, ...data },
    update: data,
  });
  let userId = request.application.userId;
  if (!userId) {
    const match = await customerByEmail(shaped.email);
    if (match) userId = match.id;
  }
  await prisma.licenceApplication.update({
    where: { id: request.applicationId },
    data: { email: shaped.email, phone: shaped.phone, locale: shaped.locale, userId },
  });
  await prisma.licenceUploadRequest.update({
    where: { id: request.id },
    data: {
      customerName: shaped.profile.fullLegalName,
      email: shaped.email,
      phone: shaped.phone,
      customerUserId: userId,
      renewalVehicle: shaped.profile.renewalVehicle,
    },
  });
  const rules = await activeRules();
  const checklist = mergeChecklist(
    parseChecklist(request.checklist),
    checklistForRequest(request.application.serviceKind, [], rules, shaped.profile)
  );
  await prisma.licenceUploadRequest.update({
    where: { id: request.id },
    data: { checklist },
  });
  await addEvent({
    requestId: request.id,
    applicationId: request.applicationId,
    actorId: viewer?.id ?? null,
    event: "details_saved",
    detail: "The customer confirmed personal details.",
    passportNumber: shaped.profile.passportNumber,
  });
  await addHistory({
    applicationId: request.applicationId,
    actorId: viewer?.id ?? null,
    event: "CUSTOMER_DETAILS",
    detail: "The customer confirmed personal details.",
    passportNumber: shaped.profile.passportNumber,
  });
  return { ok: true as const, checklist };
}

export async function submitUploadLink(token: string, viewer: Viewer) {
  const limit = checkRateLimit(`licence-upload-submit:${token}`, 8, 60 * 60 * 1000);
  if (!limit.allowed) throw new UploadLinkError("This link was submitted too many times. Try again later.", 429);
  const request = await requireOpenLink(token, viewer);
  if (!request.application.applicant) {
    throw new UploadLinkError("Confirm your details before submitting.", 400);
  }
  const passportNumber = request.application.applicant.passportNumber;
  if (request.status !== "SUBMITTED") {
    await prisma.licenceUploadRequest.update({
      where: { id: request.id },
      data: { status: "SUBMITTED", submittedAt: new Date() },
    });
  }
  await addEvent({
    requestId: request.id,
    applicationId: request.applicationId,
    event: "submitted",
    detail: "The customer submitted the documents.",
    passportNumber,
  });
  await addHistory({
    applicationId: request.applicationId,
    event: "UPLOAD_SUBMITTED",
    detail: "The customer submitted documents from the upload link.",
    passportNumber,
  });
  await notifyStaffOfSubmission(request);

  if (
    request.application.status === "APPROVED_FOR_QUOTATION" ||
    request.application.status === "QUOTATION_SENT" ||
    request.application.status === "BOOKING_CONFIRMED"
  ) {
    return {
      ok: true as const,
      outcome: null,
      status: request.application.status,
      summary: "Documents received. Screening was not run again because this application is already approved for quotation.",
      disclaimer: "",
    };
  }

  await addEvent({
    requestId: request.id,
    applicationId: request.applicationId,
    event: "ai_started",
    detail: "Document screening started.",
    passportNumber,
  });
  try {
    const result = await runLicenceAssessment({
      applicationId: request.applicationId,
      actorId: null,
      customer: false,
    });
    const saved = await prisma.licenceAssessmentResult.findUnique({
      where: { id: result.assessmentId },
      select: { summary: true, disclaimer: true, outcome: true },
    });
    await addEvent({
      requestId: request.id,
      applicationId: request.applicationId,
      event: "ai_findings",
      detail: `Screening finished with ${result.outcome}. A pass is not Department of Land Transport approval and does not create an invoice.`,
      passportNumber,
    });
    return {
      ok: true as const,
      outcome: result.outcome,
      status: result.status,
      summary: stripSecrets(saved?.summary ?? "", [passportNumber]),
      disclaimer: saved?.disclaimer ?? "",
    };
  } catch (error) {
    await addEvent({
      requestId: request.id,
      applicationId: request.applicationId,
      event: "ai_findings",
      detail: "Screening did not finish. Staff can run it again from the sales chat.",
      passportNumber,
    });
    const message = error instanceof Error ? error.message : "Screening did not finish.";
    return { ok: true as const, outcome: null, status: "SUBMITTED", summary: message, disclaimer: "" };
  }
}

async function notifyStaffOfSubmission(request: LoadedLink) {
  const ids = [request.salesRepId, request.application.assignedStaffId].filter((id): id is string => Boolean(id));
  const people = ids.length
    ? await prisma.user.findMany({
        where: { id: { in: ids } },
        select: { id: true, email: true, expoPushToken: true },
      })
    : [];
  const reference = request.application.referenceNumber;
  const summary = `Documents were submitted for ${reference}. Review them in the licence centre. This note does not include document contents.`;
  const seen = new Set<string>();
  for (const person of people) {
    if (!isRoutableEmail(person.email) || seen.has(person.email.toLowerCase())) continue;
    seen.add(person.email.toLowerCase());
    const result = await sendEmail({
      to: person.email,
      subject: `[${reference}] Driving licence documents submitted`,
      html: emailLayout({
        title: "Documents submitted",
        preheader: reference,
        bodyHtml: [heading("Documents submitted"), paragraph(summary)].join(""),
      }),
      text: summary,
    });
    await prisma.licenceCustomerNotification.create({
      data: {
        applicationId: request.applicationId,
        channel: "staff_email",
        templateKey: "upload_submitted",
        toAddress: person.email,
        subject: "Documents submitted",
        bodySummary: summary,
        status: result.ok ? "SENT" : result.skipped ? "SKIPPED" : "FAILED",
        error: result.ok ? null : result.error,
      },
    });
    if (person.expoPushToken) {
      try {
        await sendPushNotification(person.id, "Driving licence documents submitted", summary, { reference });
      } catch {
        // Push is optional. The sales chat and email record remain.
      }
    }
  }
  if (request.conversationId) {
    await prisma.backofficeMessage.create({
      data: { conversationId: request.conversationId, role: "assistant", content: summary },
    });
    await prisma.backofficeAuditLog.create({
      data: {
        conversationId: request.conversationId,
        staffId: request.salesRepId,
        actorEmail: "customer-upload@siamez.invalid",
        actorRole: "staff",
        action: "licence_upload_submitted",
        status: "success",
        summary,
        entityType: "licence_application",
        entityId: request.applicationId,
      },
    });
  }
}

export async function uploadForRequestToken(input: {
  token: string;
  viewer: Viewer;
  documentType: string;
  fileName: string;
  bytes: Buffer;
  declaredType?: string | null;
  replacesDocumentId?: string | null;
}) {
  const request = await requireOpenLink(input.token, input.viewer);
  const document = await uploadLicenceDocument({
    token: request.application.accessToken,
    documentType: input.documentType,
    fileName: input.fileName,
    bytes: input.bytes,
    declaredType: input.declaredType,
    replacesDocumentId: input.replacesDocumentId,
    userId: input.viewer && request.application.userId && input.viewer.id === request.application.userId ? input.viewer.id : null,
  });
  await addEvent({
    requestId: request.id,
    applicationId: request.applicationId,
    actorId: input.viewer?.id ?? null,
    event: input.replacesDocumentId ? "replaced" : "uploaded",
    detail: input.replacesDocumentId ? `Replaced ${input.documentType}.` : `Uploaded ${input.documentType}.`,
    passportNumber: request.application.applicant?.passportNumber,
  });
  return document;
}

const QUOTATION_STATUSES = new Set(["APPROVED_FOR_QUOTATION", "QUOTATION_SENT", "BOOKING_CONFIRMED"]);

export async function licenceUploadSalesReport(filters: { salesRepId?: string; from?: string; to?: string }) {
  const createdAt: Prisma.DateTimeFilter = {};
  if (filters.from) {
    const from = new Date(filters.from);
    if (!Number.isNaN(from.getTime())) createdAt.gte = from;
  }
  if (filters.to) {
    const to = new Date(filters.to);
    if (!Number.isNaN(to.getTime())) {
      to.setUTCHours(23, 59, 59, 999);
      createdAt.lte = to;
    }
  }
  const requests = await prisma.licenceUploadRequest.findMany({
    where: {
      salesRepId: filters.salesRepId || undefined,
      createdAt: createdAt.gte || createdAt.lte ? createdAt : undefined,
    },
    orderBy: { createdAt: "desc" },
    take: 1000,
    include: {
      salesRep: { select: { id: true, name: true, email: true } },
      application: {
        select: {
          id: true,
          referenceNumber: true,
          status: true,
          serviceKind: true,
          invoice: { select: { status: true } },
          assessments: { orderBy: { createdAt: "desc" }, take: 1, select: { outcome: true } },
        },
      },
    },
  });
  const apps = new Map<string, (typeof requests)[number]["application"]>();
  for (const request of requests) apps.set(request.applicationId, request.application);
  const applications = [...apps.values()];
  const reps = await prisma.user.findMany({
    where: { role: { in: ["admin", "staff"] }, active: true },
    select: { id: true, name: true, email: true },
    orderBy: { name: "asc" },
    take: 100,
  });
  return {
    requestsSent: requests.length,
    linksOpened: requests.filter((request) => request.openedAt || request.status === "OPENED" || request.status === "SUBMITTED").length,
    submitted: requests.filter((request) => request.submittedAt || request.status === "SUBMITTED").length,
    aiPass: applications.filter((app) => app.assessments[0]?.outcome === "PASS").length,
    corrections: applications.filter((app) => app.status === "CORRECTIONS_REQUIRED" || app.assessments[0]?.outcome === "ACTION_REQUIRED").length,
    approvedForQuotation: applications.filter((app) => QUOTATION_STATUSES.has(app.status)).length,
    convertedPaid: applications.filter((app) => app.status === "BOOKING_CONFIRMED" || app.invoice?.status === "paid").length,
    reps,
    rows: requests.slice(0, 200).map((request) => ({
      id: request.id,
      createdAt: request.createdAt.toISOString(),
      customerName: request.customerName,
      referenceNumber: request.application.referenceNumber,
      serviceKind: request.application.serviceKind,
      linkStatus: request.status,
      applicationStatus: request.application.status,
      outcome: request.application.assessments[0]?.outcome ?? null,
      salesRep: request.salesRep?.name || request.salesRep?.email || "Unassigned",
      paid: request.application.status === "BOOKING_CONFIRMED" || request.application.invoice?.status === "paid",
      applicationId: request.applicationId,
    })),
  };
}
