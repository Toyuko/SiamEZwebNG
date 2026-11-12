"use server";

import { getSession, requireStaff } from "@/lib/auth";
import { isAdminAuthBypassEnabled } from "@/lib/auth/admin-bypass";
import {
  acknowledgeFinding,
  attachVisitDocument,
  generateDltPackage,
  overrideDltPackage,
  recordDltVisit,
  saveDltAppointment,
  saveDltOffice,
} from "@/lib/dlt-package/service";

async function actorId(): Promise<string | null> {
  if (isAdminAuthBypassEnabled()) {
    const session = await getSession();
    return session?.user.id ?? null;
  }
  const session = await requireStaff();
  return session.user.id;
}

function failed(error: unknown) {
  const message = error instanceof Error ? error.message : "Something went wrong.";
  console.error("[dlt-centre]", error);
  return { ok: false as const, error: message };
}

export async function generateDltPackageAction(applicationId: string) {
  try {
    const staffId = await actorId();
    const result = await generateDltPackage(applicationId, staffId);
    return { ok: true as const, ...result };
  } catch (error) {
    return failed(error);
  }
}

export async function overrideDltPackageAction(packageId: string, reason: string) {
  try {
    const staffId = await actorId();
    await overrideDltPackage(packageId, reason, staffId);
    return { ok: true as const };
  } catch (error) {
    return failed(error);
  }
}

export async function acknowledgeFindingAction(applicationId: string, findingKey: string, note: string) {
  try {
    const staffId = await actorId();
    await acknowledgeFinding({ applicationId, findingKey, note, staffId });
    return { ok: true as const };
  } catch (error) {
    return failed(error);
  }
}

export async function saveDltAppointmentAction(input: {
  applicationId: string;
  officeId: string;
  appointmentDate: string;
  appointmentTime: string;
  confirmationNumber: string;
  bookingMethod: string;
  status: string;
  specialInstructions: string;
  assignedStaffId: string;
}) {
  try {
    const staffId = await actorId();
    await saveDltAppointment({ ...input, staffId });
    return { ok: true as const };
  } catch (error) {
    return failed(error);
  }
}

export async function recordDltVisitAction(input: {
  applicationId: string;
  outcome: string;
  feedback: string;
  additionalRequirements: string;
  nextAppointmentDate: string;
  notes: string;
}) {
  try {
    const staffId = await actorId();
    await recordDltVisit({ ...input, staffId });
    return { ok: true as const };
  } catch (error) {
    return failed(error);
  }
}

export async function saveDltOfficeAction(input: {
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
}) {
  try {
    const staffId = await actorId();
    await saveDltOffice({ ...input, staffId });
    return { ok: true as const };
  } catch (error) {
    return failed(error);
  }
}

export async function uploadVisitDocumentAction(formData: FormData) {
  try {
    const staffId = await actorId();
    const file = formData.get("file");
    const applicationId = String(formData.get("applicationId") ?? "");
    if (!(file instanceof File) || file.size === 0) return { ok: false as const, error: "Choose a PDF or image." };
    const document = await attachVisitDocument({
      applicationId,
      staffId,
      fileName: file.name || "visit-document",
      bytes: Buffer.from(await file.arrayBuffer()),
      declaredType: file.type,
    });
    return { ok: true as const, documentId: document.id };
  } catch (error) {
    return failed(error);
  }
}
