"use server";

import { cookies } from "next/headers";
import { getSession, requireStaff } from "@/lib/auth";
import { isAdminAuthBypassEnabled } from "@/lib/auth/admin-bypass";
import { accessTokensMatch } from "@/lib/licence-verification/access";
import {
  acceptLicenceQuotation,
  addLicenceNote,
  approveLicenceQuotation,
  assignLicenceStaff,
  correctExtraction,
  createLicenceApplication,
  listAssignableStaff,
  listLicenceApplications,
  listLicenceRequirements,
  messageLicenceCustomer,
  overrideLicenceOutcome,
  reassessFromCorrections,
  rejectLicenceApplication,
  requestLicenceCorrection,
  runLicenceAssessment,
  saveLicenceRequirement,
} from "@/lib/licence-verification/service";
import { validateApplicant } from "@/lib/licence-verification/validation";
import { prisma } from "@/lib/db";

async function actorId(): Promise<string | null> {
  if (isAdminAuthBypassEnabled()) {
    const session = await getSession();
    return session?.user.id ?? null;
  }
  const session = await requireStaff();
  return session.user.id;
}

async function rememberAccessCookie(token: string) {
  const jar = await cookies();
  jar.set("siamez_licence_access", token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 12,
  });
}

export async function rememberLicenceAccessAction(token: string) {
  if (!/^[a-f0-9]{64}$/.test(token)) return;
  const application = await prisma.licenceApplication.findUnique({
    where: { accessToken: token },
    select: { id: true },
  });
  if (!application) return;
  await rememberAccessCookie(token);
}

function failed(error: unknown) {
  const message = error instanceof Error ? error.message : "Something went wrong.";
  const safe = /prisma|undefined|invocation|ECONN|timeout/i.test(message)
    ? "We could not save that just now. Please try again in a moment."
    : message;
  console.error("[licence-verification]", error);
  return { ok: false as const, error: safe };
}

export async function startLicenceApplicationAction(raw: unknown) {
  try {
    const parsed = validateApplicant(raw);
    if (!parsed.ok) return { ok: false as const, error: parsed.error };
    const session = await getSession();
    const created = await createLicenceApplication(
      parsed.data,
      session?.user.role === "customer" ? session.user.id : null
    );
    await rememberAccessCookie(created.token);
    return { ok: true as const, ...created };
  } catch (error) {
    return failed(error);
  }
}

export async function assessLicenceByTokenAction(token: string) {
  try {
    const application = await prisma.licenceApplication.findUnique({
      where: { accessToken: token },
      select: { id: true, accessToken: true, userId: true },
    });
    if (!application || !accessTokensMatch(application.accessToken, token)) {
      return { ok: false as const, error: "Application not found." };
    }
    const session = await getSession();
    if (application.userId && session?.user.id && session.user.id !== application.userId && session.user.role === "customer") {
      return { ok: false as const, error: "You cannot check this application." };
    }
    const result = await runLicenceAssessment({
      applicationId: application.id,
      actorId: session?.user.id ?? null,
      customer: true,
    });
    return { ok: true as const, ...result };
  } catch (error) {
    return failed(error);
  }
}

export async function acceptLicenceQuotationAction(token: string, locale: string) {
  try {
    const result = await acceptLicenceQuotation(token, locale === "th" ? "th" : "en");
    return { ok: true as const, ...result };
  } catch (error) {
    return failed(error);
  }
}

export async function loadLicenceDashboardAction(filters: {
  status?: string;
  serviceKind?: string;
  nationality?: string;
  outcome?: string;
  staffId?: string;
  from?: string;
  to?: string;
}) {
  try {
    await actorId();
    const data = await listLicenceApplications(filters);
    const staff = await listAssignableStaff();
    return { ok: true as const, ...data, staff };
  } catch (error) {
    return failed(error);
  }
}

export async function rerunLicenceAssessmentAction(applicationId: string) {
  try {
    const id = await actorId();
    const result = await runLicenceAssessment({ applicationId, actorId: id, customer: false });
    return { ok: true as const, ...result };
  } catch (error) {
    return failed(error);
  }
}

export async function correctLicenceExtractionAction(input: {
  extractionId: string;
  holderName: string;
  documentNumber: string;
  issueDate: string;
  expiryDate: string;
  categories: string;
  notes: string;
}) {
  try {
    const id = await actorId();
    await correctExtraction({ ...input, staffId: id });
    return { ok: true as const };
  } catch (error) {
    return failed(error);
  }
}

export async function reassessLicenceRulesAction(applicationId: string) {
  try {
    const id = await actorId();
    await reassessFromCorrections(applicationId, id);
    return { ok: true as const };
  } catch (error) {
    return failed(error);
  }
}

export async function assignLicenceAction(applicationId: string, staffId: string) {
  try {
    const id = await actorId();
    await assignLicenceStaff(applicationId, staffId, id);
    return { ok: true as const };
  } catch (error) {
    return failed(error);
  }
}

export async function addLicenceNoteAction(applicationId: string, body: string) {
  try {
    const id = await actorId();
    await addLicenceNote(applicationId, id, body);
    return { ok: true as const };
  } catch (error) {
    return failed(error);
  }
}

export async function requestLicenceDocsAction(applicationId: string, message: string) {
  try {
    const id = await actorId();
    await requestLicenceCorrection(applicationId, id, message);
    return { ok: true as const };
  } catch (error) {
    return failed(error);
  }
}

export async function messageLicenceCustomerAction(applicationId: string, message: string) {
  try {
    await actorId();
    await messageLicenceCustomer(applicationId, message);
    return { ok: true as const };
  } catch (error) {
    return failed(error);
  }
}

export async function overrideLicenceOutcomeAction(input: {
  applicationId: string;
  outcome: "PASS" | "ACTION_REQUIRED" | "MANUAL_REVIEW";
  reason: string;
}) {
  try {
    const id = await actorId();
    await overrideLicenceOutcome({ ...input, staffId: id });
    return { ok: true as const };
  } catch (error) {
    return failed(error);
  }
}

export async function approveLicenceAction(applicationId: string, overrideReason?: string) {
  try {
    const id = await actorId();
    await approveLicenceQuotation({ applicationId, staffId: id, overrideReason });
    return { ok: true as const };
  } catch (error) {
    return failed(error);
  }
}

export async function rejectLicenceAction(applicationId: string, reason: string) {
  try {
    const id = await actorId();
    await rejectLicenceApplication(applicationId, id, reason);
    return { ok: true as const };
  } catch (error) {
    return failed(error);
  }
}

export async function loadLicenceRequirementsAction() {
  try {
    await actorId();
    const rules = await listLicenceRequirements();
    return { ok: true as const, rules };
  } catch (error) {
    return failed(error);
  }
}

export async function saveLicenceRequirementAction(input: {
  id?: string;
  ruleKey: string;
  name: string;
  description: string;
  serviceKinds: string;
  customerCategories: string;
  level: "REQUIRED" | "OPTIONAL";
  source: string;
  lastVerifiedOn: string;
  active: boolean;
  evaluatorKey: string;
}) {
  try {
    await actorId();
    await saveLicenceRequirement({
      ...input,
      serviceKinds: input.serviceKinds.split(",").map((item) => item.trim()).filter(Boolean),
      customerCategories: input.customerCategories.split(",").map((item) => item.trim()).filter(Boolean),
    });
    return { ok: true as const };
  } catch (error) {
    return failed(error);
  }
}
