"use server";

import { Prisma, type GovOfficeVerificationStatus } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { toSlug } from "@/lib/slug";
import {
  DIRECTORY_CSV_MAX_CHARS,
  DIRECTORY_CSV_MAX_ROWS,
  DIRECTORY_REMINDER_SETTING_KEY,
  clampReminderDays,
  isVerificationStatus,
} from "@/lib/directory/constants";
import { previewDirectoryCsv, toCsv, csvTemplate, parseCsv, type CsvPreview } from "@/lib/directory/csv";
import { readHoursFromForm, type HoursJson } from "@/lib/directory/hours";
import {
  composeSearchDocument,
  correctionInputSchema,
  formString,
  newOfficeSubmissionSchema,
  officeInputFromForm,
  officeInputSchema,
  reportInputSchema,
  splitList,
  triState,
  type OfficeInput,
} from "@/lib/directory/office-input";
import { getProvince, resolveProvinceCode } from "@/lib/directory/provinces";
import type { DirectoryQuery } from "@/lib/directory/search";
import {
  requireDirectoryAdmin,
  requireDirectoryReader,
  searchDirectoryOfficesForAdmin,
} from "@/data-access/directory";

export type DirectoryActionState = {
  ok: boolean;
  message?: string;
  fieldErrors?: Record<string, string>;
} | null;

function fieldErrors(error: z.ZodError): Record<string, string> {
  const errors: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = String(issue.path[0] ?? "form");
    if (!errors[key]) errors[key] = issue.message;
  }
  return errors;
}

function revalidateDirectory(slug?: string | null, id?: string | null) {
  for (const locale of ["en", "th"]) {
    revalidatePath(`/${locale}/directory`);
    revalidatePath(`/${locale}/directory/favorites`);
    revalidatePath(`/${locale}/admin/directory`);
    if (slug) revalidatePath(`/${locale}/directory/${slug}`);
    if (id && id !== slug) revalidatePath(`/${locale}/directory/${id}`);
  }
}

function officeSlug(explicit: string | null, nameEn: string | null, nameTh: string | null): string {
  const chosen = toSlug(explicit || "") || toSlug(nameEn || "");
  if (chosen) return chosen;
  const fallback = (nameTh || "office").replace(/\s+/g, "-").slice(0, 24);
  return `office-${fallback || Date.now().toString(36)}`.replace(/[^\w-]+/g, "").slice(0, 80);
}

async function uniqueSlug(base: string, currentId?: string): Promise<string> {
  let slug = base.slice(0, 80);
  let n = 2;
  while (n < 50) {
    const found = await prisma.govOffice.findUnique({ where: { slug }, select: { id: true } });
    if (!found || found.id === currentId) return slug;
    slug = `${base.slice(0, 70)}-${n}`;
    n += 1;
  }
  return `${base.slice(0, 60)}-${Date.now().toString(36)}`;
}

async function writeAudit(input: {
  officeId?: string | null;
  actorId: string | null;
  action: string;
  summary: string;
  changes?: Prisma.InputJsonValue;
}) {
  await prisma.govOfficeAuditLog.create({
    data: {
      officeId: input.officeId ?? null,
      actorId: input.actorId,
      action: input.action,
      summary: input.summary,
      changes: input.changes,
    },
  });
}

function officeData(
  input: OfficeInput,
  extras: {
    categoryId: string;
    provinceCode: string;
    searchText: string;
    hours: HoursJson | null;
    actorId: string | null;
    slug: string;
  }
) {
  const verifiedAt = input.lastVerifiedAt ? new Date(input.lastVerifiedAt) : null;
  const status = input.verificationStatus as GovOfficeVerificationStatus;
  return {
    slug: extras.slug,
    nameEn: input.nameEn,
    nameTh: input.nameTh,
    categoryId: extras.categoryId,
    parentOrganizationEn: input.parentOrganizationEn,
    parentOrganizationTh: input.parentOrganizationTh,
    branchNameEn: input.branchNameEn,
    branchNameTh: input.branchNameTh,
    keywords: input.keywords,
    provinceCode: extras.provinceCode,
    district: input.district,
    subdistrict: input.subdistrict,
    addressEn: input.addressEn,
    addressTh: input.addressTh,
    postalCode: input.postalCode,
    latitude: input.latitude ?? null,
    longitude: input.longitude ?? null,
    googleMapsUrl: input.googleMapsUrl,
    extraMapUrls: input.extraMapUrls,
    phonePrimary: input.phonePrimary,
    phones: input.phones,
    email: input.email,
    website: input.website,
    facebookUrl: input.facebookUrl,
    contactNotes: input.contactNotes,
    openingHoursText: input.openingHoursText,
    hoursJson: extras.hours === null ? Prisma.JsonNull : extras.hours,
    operatingDays: input.operatingDays,
    lunchBreak: input.lunchBreak,
    holidayNotes: input.holidayNotes,
    appointmentRequired: input.appointmentRequired ?? null,
    walkInsAccepted: input.walkInsAccepted ?? null,
    appointmentNotes: input.appointmentNotes,
    serviceNotes: input.serviceNotes,
    documentsRequired: input.documentsRequired,
    bookingInfo: input.bookingInfo,
    governmentLinks: input.governmentLinks,
    internalNotes: input.internalNotes,
    proceduralNotes: input.proceduralNotes,
    staffTips: input.staffTips,
    parkingNotes: input.parkingNotes,
    counterNotes: input.counterNotes,
    verificationStatus: status,
    sourceUrl: input.sourceUrl,
    sourceNotes: input.sourceNotes,
    lastVerifiedAt: status === "verified" ? verifiedAt ?? new Date() : verifiedAt,
    lastVerificationMethod:
      input.lastVerificationMethod ?? (status === "verified" ? "Staff review" : null),
    lastVerifiedById: status === "verified" ? extras.actorId : null,
    reliabilityNotes: input.reliabilityNotes,
    searchText: extras.searchText,
    updatedById: extras.actorId,
  };
}

export async function saveOffice(
  _prev: DirectoryActionState,
  form: FormData
): Promise<DirectoryActionState> {
  const admin = await requireDirectoryAdmin();
  const hours = readHoursFromForm(form);
  if (hours.error) return { ok: false, fieldErrors: { openingHoursText: hours.error } };
  const parsed = officeInputSchema.safeParse(officeInputFromForm(form));
  if (!parsed.success) return { ok: false, fieldErrors: fieldErrors(parsed.error) };
  const input = parsed.data;
  if (input.lastVerifiedAt && Number.isNaN(Date.parse(input.lastVerifiedAt))) {
    return { ok: false, fieldErrors: { lastVerifiedAt: "Use a valid date" } };
  }
  const provinceCode = resolveProvinceCode(input.provinceCode);
  if (!provinceCode) return { ok: false, fieldErrors: { provinceCode: "Choose a Thai province" } };
  const category = await prisma.govOfficeCategory.findFirst({
    where: { slug: input.categorySlug, active: true },
  });
  if (!category) return { ok: false, fieldErrors: { categorySlug: "Unknown category" } };
  const services = input.serviceSlugs.length
    ? await prisma.govOfficeService.findMany({ where: { slug: { in: input.serviceSlugs }, active: true } })
    : [];
  if (services.length !== new Set(input.serviceSlugs).size) {
    return { ok: false, fieldErrors: { serviceSlugs: "One or more services are unknown" } };
  }
  const province = getProvince(provinceCode);
  const searchText = composeSearchDocument({
    office: { ...input, provinceCode },
    categoryNameEn: category.nameEn,
    categoryNameTh: category.nameTh,
    serviceNames: services.flatMap((service) => [service.nameEn, service.nameTh]),
    provinceNameEn: province?.nameEn,
    provinceNameTh: province?.nameTh,
  });
  const id = formString(form, "id");
  const slug = await uniqueSlug(officeSlug(input.slug, input.nameEn, input.nameTh), id || undefined);
  const data = officeData(input, {
    categoryId: category.id,
    provinceCode,
    searchText,
    hours: hours.hours,
    actorId: admin.userId,
    slug,
  });

  const office = await prisma.$transaction(async (tx) => {
    const saved = id
      ? await tx.govOffice.update({ where: { id }, data })
      : await tx.govOffice.create({ data: { ...data, createdById: admin.userId } });
    await tx.govOfficeServiceLink.deleteMany({ where: { officeId: saved.id } });
    if (services.length) {
      await tx.govOfficeServiceLink.createMany({
        data: services.map((service) => ({ officeId: saved.id, serviceId: service.id })),
      });
    }
    await tx.govOfficeAuditLog.create({
      data: {
        officeId: saved.id,
        actorId: admin.userId,
        action: id ? "update" : "create",
        summary: id ? "Updated office" : "Created office",
        changes: { fields: Object.keys(data) },
      },
    });
    return saved;
  });

  revalidateDirectory(office.slug, office.id);
  return { ok: true, message: "Saved" };
}

export async function archiveOffice(form: FormData) {
  const admin = await requireDirectoryAdmin();
  const id = formString(form, "id");
  const office = await prisma.govOffice.update({
    where: { id },
    data: { archivedAt: new Date(), updatedById: admin.userId },
  });
  await writeAudit({
    officeId: office.id,
    actorId: admin.userId,
    action: "archive",
    summary: "Archived office",
  });
  revalidateDirectory(office.slug, office.id);
}

export async function restoreOffice(form: FormData) {
  const admin = await requireDirectoryAdmin();
  const id = formString(form, "id");
  const office = await prisma.govOffice.update({
    where: { id },
    data: { archivedAt: null, updatedById: admin.userId },
  });
  await writeAudit({
    officeId: office.id,
    actorId: admin.userId,
    action: "restore",
    summary: "Restored office",
  });
  revalidateDirectory(office.slug, office.id);
}

export async function toggleFavorite(form: FormData) {
  const session = await getSession();
  if (!session?.user.id) throw new Error("Unauthorized");
  const officeId = formString(form, "officeId");
  const office = await prisma.govOffice.findFirst({
    where: { id: officeId, archivedAt: null },
    select: { id: true, slug: true },
  });
  if (!office) throw new Error("Not found");
  const existing = await prisma.govOfficeFavorite.findUnique({
    where: { userId_officeId: { userId: session.user.id, officeId: office.id } },
  });
  if (existing) {
    await prisma.govOfficeFavorite.delete({
      where: { userId_officeId: { userId: session.user.id, officeId: office.id } },
    });
  } else {
    await prisma.govOfficeFavorite.create({
      data: { userId: session.user.id, officeId: office.id },
    });
  }
  revalidateDirectory(office.slug, office.id);
}

export async function submitReport(
  _prev: DirectoryActionState,
  form: FormData
): Promise<DirectoryActionState> {
  const access = await requireDirectoryReader();
  if (!access.canContribute) return { ok: false, message: "You cannot submit reports." };
  const parsed = reportInputSchema.safeParse({
    officeId: formString(form, "officeId"),
    field: formString(form, "field"),
    explanation: formString(form, "explanation"),
  });
  if (!parsed.success) return { ok: false, fieldErrors: fieldErrors(parsed.error) };
  const office = await prisma.govOffice.findFirst({
    where: { id: parsed.data.officeId, archivedAt: null },
    select: { id: true },
  });
  if (!office) return { ok: false, message: "Office not found." };
  await prisma.govOfficeReport.create({
    data: {
      officeId: office.id,
      reporterId: access.userId,
      field: parsed.data.field,
      explanation: parsed.data.explanation,
    },
  });
  revalidatePath("/en/admin/directory/reports");
  revalidatePath("/th/admin/directory/reports");
  return { ok: true, message: "Report sent for review. The office record was not changed." };
}

export async function submitCorrection(
  _prev: DirectoryActionState,
  form: FormData
): Promise<DirectoryActionState> {
  const access = await requireDirectoryReader();
  if (!access.canContribute) return { ok: false, message: "You cannot submit corrections." };
  const parsed = correctionInputSchema.safeParse({
    officeId: formString(form, "officeId"),
    field: formString(form, "field"),
    suggestedValue: formString(form, "suggestedValue"),
    explanation: formString(form, "explanation"),
  });
  if (!parsed.success) return { ok: false, fieldErrors: fieldErrors(parsed.error) };
  const office = await prisma.govOffice.findFirst({
    where: { id: parsed.data.officeId, archivedAt: null },
    select: { id: true },
  });
  if (!office) return { ok: false, message: "Office not found." };
  await prisma.govOfficeSubmission.create({
    data: {
      kind: "correction",
      officeId: office.id,
      submitterId: access.userId,
      payload: parsed.data,
    },
  });
  return { ok: true, message: "Correction submitted for an administrator to review." };
}

export async function submitNewOffice(
  _prev: DirectoryActionState,
  form: FormData
): Promise<DirectoryActionState> {
  const access = await requireDirectoryReader();
  if (!access.canContribute) return { ok: false, message: "You cannot suggest offices." };
  const parsed = newOfficeSubmissionSchema.safeParse({
    nameEn: formString(form, "nameEn") || null,
    nameTh: formString(form, "nameTh") || null,
    categorySlug: formString(form, "categorySlug"),
    provinceCode: formString(form, "provinceCode"),
    district: formString(form, "district") || null,
    phonePrimary: formString(form, "phonePrimary") || null,
    addressEn: formString(form, "addressEn") || null,
    addressTh: formString(form, "addressTh") || null,
    website: formString(form, "website") || null,
    notes: formString(form, "notes") || null,
  });
  if (!parsed.success) return { ok: false, fieldErrors: fieldErrors(parsed.error) };
  const provinceCode = resolveProvinceCode(parsed.data.provinceCode);
  if (!provinceCode) return { ok: false, fieldErrors: { provinceCode: "Choose a Thai province" } };
  await prisma.govOfficeSubmission.create({
    data: {
      kind: "new_office",
      submitterId: access.userId,
      payload: { ...parsed.data, provinceCode },
    },
  });
  return { ok: true, message: "Suggestion submitted. An administrator will review it before it appears in the directory." };
}

export async function reviewReport(form: FormData) {
  const admin = await requireDirectoryAdmin();
  const id = formString(form, "id");
  const status = formString(form, "status");
  if (status !== "in_review" && status !== "resolved" && status !== "dismissed") {
    throw new Error("Invalid status");
  }
  await prisma.govOfficeReport.update({
    where: { id },
    data: {
      status,
      resolutionNotes: formString(form, "resolutionNotes") || null,
      reviewedById: admin.userId,
      reviewedAt: new Date(),
    },
  });
  revalidatePath("/en/admin/directory/reports");
  revalidatePath("/th/admin/directory/reports");
}

const CORRECTION_COLUMNS = new Set([
  "phonePrimary",
  "addressEn",
  "addressTh",
  "openingHoursText",
  "operatingDays",
  "lunchBreak",
  "holidayNotes",
  "documentsRequired",
  "serviceNotes",
  "appointmentNotes",
  "website",
  "email",
  "facebookUrl",
  "district",
  "subdistrict",
]);

export async function reviewSubmission(form: FormData) {
  const admin = await requireDirectoryAdmin();
  const id = formString(form, "id");
  const decision = formString(form, "decision");
  const reviewNotes = formString(form, "reviewNotes") || null;
  const submission = await prisma.govOfficeSubmission.findUnique({ where: { id } });
  if (!submission || submission.status !== "pending") throw new Error("Submission is not pending");

  if (decision === "reject") {
    await prisma.govOfficeSubmission.update({
      where: { id },
      data: { status: "rejected", reviewNotes, reviewerId: admin.userId, reviewedAt: new Date() },
    });
    await writeAudit({
      officeId: submission.officeId,
      actorId: admin.userId,
      action: "submission.reject",
      summary: "Rejected a directory submission",
    });
    revalidateDirectory();
    return;
  }
  if (decision !== "approve") throw new Error("Invalid decision");

  if (submission.kind === "correction") {
    const payload = submission.payload as {
      field?: string;
      suggestedValue?: string;
    };
    const field = payload.field ?? "";
    const value = formString(form, "approvedValue") || payload.suggestedValue || "";
    if (!submission.officeId) throw new Error("Missing office");
    const data: Prisma.GovOfficeUncheckedUpdateInput = {
      verificationStatus: "needs_verification",
      updatedById: admin.userId,
      reliabilityNotes: reviewNotes
        ? `Correction approved: ${reviewNotes}`
        : undefined,
    };
    if (field === "phones") {
      data.phones = splitList(value);
    } else if (CORRECTION_COLUMNS.has(field)) {
      (data as Record<string, unknown>)[field] = value;
    } else if (field === "other") {
      data.reliabilityNotes = value;
    }
    const office = await prisma.govOffice.update({ where: { id: submission.officeId }, data });
    await prisma.govOfficeSubmission.update({
      where: { id },
      data: { status: "approved", reviewNotes, reviewerId: admin.userId, reviewedAt: new Date() },
    });
    await writeAudit({
      officeId: office.id,
      actorId: admin.userId,
      action: "submission.approve",
      summary: `Approved a correction for ${field || "the office"}`,
      changes: { field, applied: true },
    });
    revalidateDirectory(office.slug, office.id);
    return;
  }

  const approved = officeInputSchema.safeParse({
    ...officeDraftFromLoose(form),
    verificationStatus: "unverified",
    serviceSlugs: form.getAll("serviceSlugs").map((value) => String(value)),
  });
  if (!approved.success) throw new Error(approved.error.issues[0]?.message ?? "Invalid office");
  const provinceCode = resolveProvinceCode(approved.data.provinceCode);
  const category = await prisma.govOfficeCategory.findFirst({
    where: { slug: approved.data.categorySlug, active: true },
  });
  if (!provinceCode || !category) throw new Error("Choose a valid category and province");
  const province = getProvince(provinceCode);
  const slug = await uniqueSlug(officeSlug(null, approved.data.nameEn, approved.data.nameTh));
  const searchText = composeSearchDocument({
    office: { ...approved.data, provinceCode },
    categoryNameEn: category.nameEn,
    categoryNameTh: category.nameTh,
    provinceNameEn: province?.nameEn,
    provinceNameTh: province?.nameTh,
  });
  const created = await prisma.govOffice.create({
    data: {
      ...officeData(
        { ...approved.data, verificationStatus: "unverified", lastVerifiedAt: null },
        {
          categoryId: category.id,
          provinceCode,
          searchText,
          hours: null,
          actorId: admin.userId,
          slug,
        }
      ),
      createdById: admin.userId,
      sourceNotes: approved.data.sourceNotes ?? "Created from an approved staff suggestion. Not verified.",
    },
  });
  await prisma.govOfficeSubmission.update({
    where: { id },
    data: {
      status: "approved",
      officeId: created.id,
      reviewNotes,
      reviewerId: admin.userId,
      reviewedAt: new Date(),
    },
  });
  await writeAudit({
    officeId: created.id,
    actorId: admin.userId,
    action: "submission.approve",
    summary: "Approved a new office suggestion",
  });
  revalidateDirectory(created.slug, created.id);
}

function officeDraftFromLoose(form: FormData) {
  return {
    nameEn: formString(form, "nameEn") || null,
    nameTh: formString(form, "nameTh") || null,
    categorySlug: formString(form, "categorySlug"),
    provinceCode: formString(form, "provinceCode"),
    district: formString(form, "district") || null,
    phonePrimary: formString(form, "phonePrimary") || null,
    addressEn: formString(form, "addressEn") || null,
    addressTh: formString(form, "addressTh") || null,
    website: formString(form, "website") || null,
    sourceNotes: formString(form, "notes") || null,
    keywords: [],
    extraMapUrls: [],
    phones: [],
    serviceSlugs: [],
  };
}

export async function saveCategory(
  _prev: DirectoryActionState,
  form: FormData
): Promise<DirectoryActionState> {
  const admin = await requireDirectoryAdmin();
  const id = formString(form, "id");
  const nameEn = formString(form, "nameEn");
  const nameTh = formString(form, "nameTh");
  const slugInput = formString(form, "slug");
  if (!nameEn || !nameTh) return { ok: false, message: "Enter English and Thai names." };
  const slug = toSlug(slugInput || nameEn);
  if (!slug) return { ok: false, message: "Enter a slug using letters or numbers." };
  const data = {
    slug,
    nameEn,
    nameTh,
    descriptionEn: formString(form, "descriptionEn") || null,
    descriptionTh: formString(form, "descriptionTh") || null,
    sortOrder: Number(formString(form, "sortOrder") || "0") || 0,
    active: form.get("active") === "on",
  };
  if (id) await prisma.govOfficeCategory.update({ where: { id }, data });
  else await prisma.govOfficeCategory.create({ data });
  await writeAudit({
    actorId: admin.userId,
    action: id ? "category.update" : "category.create",
    summary: `${id ? "Updated" : "Created"} category ${slug}`,
  });
  revalidateDirectory();
  return { ok: true, message: "Category saved" };
}

export async function retireCategory(form: FormData) {
  const admin = await requireDirectoryAdmin();
  const id = formString(form, "id");
  const count = await prisma.govOffice.count({ where: { categoryId: id, archivedAt: null } });
  if (count > 0) {
    await prisma.govOfficeCategory.update({ where: { id }, data: { active: false } });
  } else {
    await prisma.govOfficeCategory.delete({ where: { id } });
  }
  await writeAudit({
    actorId: admin.userId,
    action: "category.retire",
    summary: count > 0 ? "Deactivated a category that still has offices" : "Deleted an unused category",
  });
  revalidateDirectory();
}

export async function saveService(
  _prev: DirectoryActionState,
  form: FormData
): Promise<DirectoryActionState> {
  await requireDirectoryAdmin();
  const id = formString(form, "id");
  const nameEn = formString(form, "nameEn");
  const nameTh = formString(form, "nameTh");
  if (!nameEn || !nameTh) return { ok: false, message: "Enter English and Thai names." };
  const slug = toSlug(formString(form, "slug") || nameEn);
  if (!slug) return { ok: false, message: "Enter a slug using letters or numbers." };
  const data = {
    slug,
    nameEn,
    nameTh,
    sortOrder: Number(formString(form, "sortOrder") || "0") || 0,
    active: form.get("active") === "on",
  };
  if (id) await prisma.govOfficeService.update({ where: { id }, data });
  else await prisma.govOfficeService.create({ data });
  revalidateDirectory();
  return { ok: true, message: "Service saved" };
}

export async function retireService(form: FormData) {
  await requireDirectoryAdmin();
  const id = formString(form, "id");
  const count = await prisma.govOfficeServiceLink.count({ where: { serviceId: id } });
  if (count > 0) await prisma.govOfficeService.update({ where: { id }, data: { active: false } });
  else await prisma.govOfficeService.delete({ where: { id } });
  revalidateDirectory();
}

export async function setDirectoryAccess(form: FormData): Promise<void> {
  const admin = await requireDirectoryAdmin();
  const userId = formString(form, "userId");
  const enabled = formString(form, "enabled") === "true";
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { freelancerProfile: { select: { verificationStatus: true } } },
  });
  if (!user || user.role !== "freelancer") throw new Error("Only freelancer accounts can be granted directory access");
  if (enabled) {
    if (!user.active) throw new Error("Activate the account before granting access");
    if (user.freelancerProfile?.verificationStatus !== "verified") {
      throw new Error("Verify the freelancer before granting directory access");
    }
  }
  await prisma.user.update({ where: { id: userId }, data: { directoryAccess: enabled } });
  await writeAudit({
    actorId: admin.userId,
    action: enabled ? "access.grant" : "access.revoke",
    summary: `${enabled ? "Granted" : "Revoked"} directory access for ${user.email}`,
  });
}

export async function setReminderDays(
  _prev: DirectoryActionState,
  form: FormData
): Promise<DirectoryActionState> {
  await requireDirectoryAdmin();
  const days = clampReminderDays(Number(formString(form, "days")));
  await prisma.appSetting.upsert({
    where: { key: DIRECTORY_REMINDER_SETTING_KEY },
    create: { key: DIRECTORY_REMINDER_SETTING_KEY, value: { days } },
    update: { value: { days } },
  });
  revalidateDirectory();
  return { ok: true, message: `Records older than ${days} days will be flagged.` };
}

export async function previewDirectoryImport(csv: string): Promise<CsvPreview & { error?: string }> {
  await requireDirectoryAdmin();
  if (csv.length > DIRECTORY_CSV_MAX_CHARS) {
    return {
      error: "File is too large.",
      headerErrors: ["File is too large."],
      rows: [],
      summary: { total: 0, ready: 0, updates: 0, skipped: 0, rejected: 0 },
    };
  }
  const table = parseCsv(csv);
  if (table.length > DIRECTORY_CSV_MAX_ROWS + 1) {
    return {
      error: `Limit is ${DIRECTORY_CSV_MAX_ROWS} offices per import.`,
      headerErrors: [`Limit is ${DIRECTORY_CSV_MAX_ROWS} offices per import.`],
      rows: [],
      summary: { total: 0, ready: 0, updates: 0, skipped: 0, rejected: 0 },
    };
  }
  const [categories, services, existing] = await Promise.all([
    prisma.govOfficeCategory.findMany({ where: { active: true }, select: { slug: true } }),
    prisma.govOfficeService.findMany({ where: { active: true }, select: { slug: true } }),
    prisma.govOffice.findMany({
      select: { id: true, slug: true, nameEn: true, provinceCode: true, phonePrimary: true },
    }),
  ]);
  return previewDirectoryCsv({
    csv,
    knownCategorySlugs: categories.map((category) => category.slug),
    knownServiceSlugs: services.map((service) => service.slug),
    existing: existing.map((office) => ({
      ...office,
      nameEn: office.nameEn ?? "",
    })),
  });
}

export async function commitDirectoryImport(input: {
  rows: Array<Record<string, string>>;
  updateExisting: boolean;
}): Promise<{ imported: number; updated: number; skipped: number; rejected: number; errors: string[] }> {
  const admin = await requireDirectoryAdmin();
  const csv = toCsv(input.rows);
  const preview = await previewDirectoryImport(csv);
  if (preview.error) {
    return { imported: 0, updated: 0, skipped: 0, rejected: 0, errors: [preview.error] };
  }
  const decided = previewDirectoryCsv({
    csv,
    knownCategorySlugs: (
      await prisma.govOfficeCategory.findMany({ where: { active: true }, select: { slug: true } })
    ).map((category) => category.slug),
    knownServiceSlugs: (
      await prisma.govOfficeService.findMany({ where: { active: true }, select: { slug: true } })
    ).map((service) => service.slug),
    existing: (
      await prisma.govOffice.findMany({
        select: { id: true, slug: true, nameEn: true, provinceCode: true, phonePrimary: true },
      })
    ).map((office) => ({ ...office, nameEn: office.nameEn ?? "" })),
    updateExisting: input.updateExisting,
  });

  let imported = 0;
  let updated = 0;
  const errors: string[] = [];
  for (const row of decided.rows) {
    if (row.action !== "import" && row.action !== "update") continue;
    try {
      await persistCsvRow(row.values, admin.userId, row.action === "update");
      if (row.action === "update") updated += 1;
      else imported += 1;
    } catch (error) {
      errors.push(`Row ${row.rowNumber}: ${error instanceof Error ? error.message : "Could not save"}`);
    }
  }
  revalidateDirectory();
  return {
    imported,
    updated,
    skipped: decided.summary.skipped,
    rejected: decided.summary.rejected + errors.length,
    errors,
  };
}

async function persistCsvRow(values: Record<string, string>, actorId: string | null, updateExisting: boolean) {
  const draft = {
    slug: values.slug || null,
    nameEn: values.name_en || null,
    nameTh: values.name_th || null,
    categorySlug: values.category_slug,
    parentOrganizationEn: values.parent_organization_en || null,
    parentOrganizationTh: values.parent_organization_th || null,
    branchNameEn: values.branch_name_en || null,
    branchNameTh: values.branch_name_th || null,
    keywords: splitList(values.keywords?.replace(/\|/g, ",")),
    provinceCode: values.province_code,
    district: values.district || null,
    subdistrict: values.subdistrict || null,
    addressEn: values.address_en || null,
    addressTh: values.address_th || null,
    postalCode: values.postal_code || null,
    latitude: values.latitude ? Number(values.latitude) : null,
    longitude: values.longitude ? Number(values.longitude) : null,
    googleMapsUrl: values.google_maps_url || null,
    extraMapUrls: splitList(values.extra_map_urls?.replace(/\|/g, ",")),
    phonePrimary: values.phone_primary || null,
    phones: splitList(values.phones?.replace(/\|/g, ",")),
    email: values.email || null,
    website: values.website || null,
    facebookUrl: values.facebook_url || null,
    contactNotes: values.contact_notes || null,
    openingHoursText: values.opening_hours || null,
    operatingDays: values.operating_days || null,
    lunchBreak: values.lunch_break || null,
    holidayNotes: values.holiday_notes || null,
    appointmentRequired: triState(values.appointment_required),
    walkInsAccepted: triState(values.walk_ins_accepted),
    appointmentNotes: values.appointment_notes || null,
    serviceNotes: values.service_notes || null,
    documentsRequired: values.documents_required || null,
    bookingInfo: values.booking_info || null,
    governmentLinks: values.government_links || null,
    internalNotes: values.internal_notes || null,
    proceduralNotes: values.procedural_notes || null,
    staffTips: values.staff_tips || null,
    parkingNotes: values.parking_notes || null,
    counterNotes: values.counter_notes || null,
    verificationStatus: isVerificationStatus(values.verification_status)
      ? values.verification_status === "verified"
        ? "needs_verification"
        : values.verification_status
      : "unverified",
    sourceUrl: values.source_url || null,
    sourceNotes: values.source_notes || null,
    lastVerifiedAt: values.last_verified_at || null,
    lastVerificationMethod: values.last_verification_method || null,
    reliabilityNotes: values.reliability_notes || null,
    serviceSlugs: splitList(values.service_slugs?.replace(/\|/g, ",")),
  };
  const parsed = officeInputSchema.parse(draft);
  const provinceCode = resolveProvinceCode(parsed.provinceCode)!;
  const category = await prisma.govOfficeCategory.findFirst({
    where: { slug: parsed.categorySlug, active: true },
  });
  if (!category) throw new Error("Unknown category");
  const services = parsed.serviceSlugs.length
    ? await prisma.govOfficeService.findMany({ where: { slug: { in: parsed.serviceSlugs } } })
    : [];
  const province = getProvince(provinceCode);
  const existing = parsed.slug
    ? await prisma.govOffice.findUnique({ where: { slug: parsed.slug } })
    : null;
  if (existing && !updateExisting) return;
  const slug = await uniqueSlug(
    officeSlug(parsed.slug, parsed.nameEn, parsed.nameTh),
    existing?.id
  );
  const searchText = composeSearchDocument({
    office: { ...parsed, provinceCode },
    categoryNameEn: category.nameEn,
    categoryNameTh: category.nameTh,
    serviceNames: services.flatMap((service) => [service.nameEn, service.nameTh]),
    provinceNameEn: province?.nameEn,
    provinceNameTh: province?.nameTh,
  });
  const data = officeData({ ...parsed, provinceCode }, {
    categoryId: category.id,
    provinceCode,
    searchText,
    hours: null,
    actorId: actorId,
    slug,
  });
  const saved = existing
    ? await prisma.govOffice.update({
        where: { id: existing.id },
        data: withoutEmptyOverwrites(data, valuesPresent(draft)),
      })
    : await prisma.govOffice.create({ data: { ...data, createdById: actorId } });
  if (!existing || parsed.serviceSlugs.length) {
    await prisma.govOfficeServiceLink.deleteMany({ where: { officeId: saved.id } });
    if (services.length) {
      await prisma.govOfficeServiceLink.createMany({
        data: services.map((service) => ({ officeId: saved.id, serviceId: service.id })),
      });
    }
  }
  await writeAudit({
    officeId: saved.id,
    actorId,
    action: existing ? "import.update" : "import.create",
    summary: existing ? "Updated office from CSV" : "Imported office from CSV",
  });
}

function valuesPresent(draft: Record<string, unknown>): Set<string> {
  const present = new Set<string>();
  for (const [key, value] of Object.entries(draft)) {
    if (value == null) continue;
    if (typeof value === "string" && value.trim() === "") continue;
    if (Array.isArray(value) && value.length === 0) continue;
    present.add(key);
  }
  return present;
}

function withoutEmptyOverwrites<T extends Record<string, unknown>>(data: T, present: Set<string>): T {
  const next = { ...data };
  if (!present.has("keywords")) delete next.keywords;
  if (!present.has("phones")) delete next.phones;
  if (!present.has("extraMapUrls")) delete next.extraMapUrls;
  delete next.hoursJson;
  const optional = [
    "parentOrganizationEn",
    "parentOrganizationTh",
    "branchNameEn",
    "branchNameTh",
    "district",
    "subdistrict",
    "addressEn",
    "addressTh",
    "postalCode",
    "phonePrimary",
    "email",
    "website",
    "facebookUrl",
    "contactNotes",
    "openingHoursText",
    "operatingDays",
    "lunchBreak",
    "holidayNotes",
    "appointmentNotes",
    "serviceNotes",
    "documentsRequired",
    "bookingInfo",
    "governmentLinks",
    "internalNotes",
    "proceduralNotes",
    "staffTips",
    "parkingNotes",
    "counterNotes",
    "sourceUrl",
    "sourceNotes",
    "reliabilityNotes",
  ] as const;
  for (const key of optional) {
    if (!present.has(key)) delete next[key];
  }
  return next;
}

export async function exportDirectoryCsv(query: DirectoryQuery): Promise<string> {
  await requireDirectoryAdmin();
  const result = await searchDirectoryOfficesForAdmin({ ...query, page: 1 });
  const pageCount = result.pageCount;
  const offices = [...result.offices];
  for (let page = 2; page <= pageCount && offices.length < DIRECTORY_CSV_MAX_ROWS; page += 1) {
    const next = await searchDirectoryOfficesForAdmin({ ...query, page });
    offices.push(...next.offices);
  }
  const rows = offices.slice(0, DIRECTORY_CSV_MAX_ROWS).map((office) => ({
    slug: office.slug,
    name_en: office.nameEn ?? "",
    name_th: office.nameTh ?? "",
    category_slug: office.category.slug,
    parent_organization_en: office.parentOrganizationEn ?? "",
    parent_organization_th: office.parentOrganizationTh ?? "",
    branch_name_en: office.branchNameEn ?? "",
    branch_name_th: office.branchNameTh ?? "",
    keywords: office.keywords.join("|"),
    province_code: office.provinceCode,
    district: office.district ?? "",
    subdistrict: office.subdistrict ?? "",
    address_en: office.addressEn ?? "",
    address_th: office.addressTh ?? "",
    postal_code: office.postalCode ?? "",
    latitude: office.latitude == null ? "" : String(office.latitude),
    longitude: office.longitude == null ? "" : String(office.longitude),
    google_maps_url: office.googleMapsUrl ?? "",
    extra_map_urls: office.extraMapUrls.join("|"),
    phone_primary: office.phonePrimary ?? "",
    phones: office.phones.join("|"),
    email: office.email ?? "",
    website: office.website ?? "",
    facebook_url: office.facebookUrl ?? "",
    contact_notes: office.contactNotes ?? "",
    opening_hours: office.openingHoursText ?? "",
    operating_days: office.operatingDays ?? "",
    lunch_break: office.lunchBreak ?? "",
    holiday_notes: office.holidayNotes ?? "",
    appointment_required:
      office.appointmentRequired == null ? "" : office.appointmentRequired ? "yes" : "no",
    walk_ins_accepted: office.walkInsAccepted == null ? "" : office.walkInsAccepted ? "yes" : "no",
    appointment_notes: office.appointmentNotes ?? "",
    service_slugs: office.services.map((link) => link.service.slug).join("|"),
    service_notes: office.serviceNotes ?? "",
    documents_required: office.documentsRequired ?? "",
    booking_info: office.bookingInfo ?? "",
    government_links: office.governmentLinks ?? "",
    internal_notes: office.internalNotes ?? "",
    procedural_notes: office.proceduralNotes ?? "",
    staff_tips: office.staffTips ?? "",
    parking_notes: office.parkingNotes ?? "",
    counter_notes: office.counterNotes ?? "",
    verification_status: office.verificationStatus,
    source_url: office.sourceUrl ?? "",
    source_notes: office.sourceNotes ?? "",
    last_verified_at: office.lastVerifiedAt ? office.lastVerifiedAt.toISOString().slice(0, 10) : "",
    last_verification_method: office.lastVerificationMethod ?? "",
    reliability_notes: office.reliabilityNotes ?? "",
  }));
  return toCsv(rows);
}

export async function downloadDirectoryTemplate(): Promise<string> {
  await requireDirectoryAdmin();
  return csvTemplate();
}

export async function loadStarterRecords(): Promise<void> {
  const { loadMissingStarterOffices } = await import("@/data-access/directory");
  await loadMissingStarterOffices();
}
