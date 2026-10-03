"use server";

import type { CaseStatus } from "@prisma/client";
import { headers } from "next/headers";
import { getSession } from "@/lib/auth";
import {
  createConfirmedJob,
  getConfirmedJob,
  listJobs,
  lookupJobCustomer,
  regenerateJobInvoice,
  updateConfirmedJob,
} from "@/data-access/job-intake";
import {
  assertJobIntakeAccess,
  CustomerChoiceRequiredError,
  JobIntakeValidationError,
  type JobIntakeInput,
  type ScheduleWindow,
} from "@/lib/jobs/intake";
import { intakeInvoicePdfPath } from "@/lib/jobs/invoice-access";
import { checkRateLimit } from "@/lib/security/rate-limit";

export type JobIntakeActionResult<T> =
  | { ok: true; data: T }
  | {
      ok: false;
      error: string;
      fieldErrors?: Record<string, string>;
      candidates?: { id: string; name: string | null; email: string; phone: string | null }[];
    };

async function staffActor() {
  const session = await getSession();
  assertJobIntakeAccess(session?.user.role);
  return session!.user;
}

function fail(error: unknown, fallback: string): JobIntakeActionResult<never> {
  if (error instanceof JobIntakeValidationError) {
    return { ok: false, error: error.message, fieldErrors: error.fieldErrors };
  }
  if (error instanceof CustomerChoiceRequiredError) {
    return {
      ok: false,
      error: error.message,
      candidates: error.candidates,
    };
  }
  if (error instanceof Error && (error.message === "Unauthorized" || error.message === "Job not found")) {
    return { ok: false, error: error.message === "Unauthorized" ? "Unauthorized" : error.message };
  }
  if (error instanceof Error && error.message.startsWith("Invalid status transition")) {
    return { ok: false, error: "That status change is not allowed." };
  }
  console.error(fallback, error);
  return { ok: false, error: fallback };
}

async function publicIntakeAllowed(bucket: string, limit: number) {
  const h = await headers();
  const ip = h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip") || "unknown";
  return checkRateLimit(`job-intake:${bucket}:${ip}`, limit, 10 * 60 * 1000);
}

export async function lookupPublicJobCustomerAction(email: string, phone?: string | null) {
  const limit = await publicIntakeAllowed("lookup", 40);
  if (!limit.allowed) {
    return { ok: false as const, error: "Too many lookups. Wait a minute and try again." };
  }
  try {
    const data = await lookupJobCustomer(email, phone);
    return { ok: true as const, data };
  } catch (error) {
    return fail(error, "Unable to look up the customer.");
  }
}

export async function createPublicJobAction(
  raw: JobIntakeInput
): Promise<
  JobIntakeActionResult<Awaited<ReturnType<typeof createConfirmedJob>> & { invoicePdfPath: string | null }>
> {
  const limit = await publicIntakeAllowed("create", 20);
  if (!limit.allowed) {
    return { ok: false, error: "Too many jobs just now. Wait a minute and try again." };
  }
  try {
    const data = await createConfirmedJob(null, raw);
    return { ok: true, data: { ...data, invoicePdfPath: intakeInvoicePdfPath(data.invoiceId) } };
  } catch (error) {
    return fail(error, "Unable to create job. Please try again.");
  }
}

export async function lookupJobCustomerAction(email: string, phone?: string | null) {
  try {
    await staffActor();
    const data = await lookupJobCustomer(email, phone);
    return { ok: true as const, data };
  } catch (error) {
    return fail(error, "Unable to look up the customer.");
  }
}

export async function createConfirmedJobAction(
  raw: JobIntakeInput
): Promise<JobIntakeActionResult<Awaited<ReturnType<typeof createConfirmedJob>>>> {
  try {
    const actor = await staffActor();
    const data = await createConfirmedJob(actor, raw);
    return { ok: true, data };
  } catch (error) {
    return fail(error, "Unable to create job. Please try again.");
  }
}

export async function updateConfirmedJobAction(
  caseId: string,
  raw: JobIntakeInput & { status?: CaseStatus }
): Promise<JobIntakeActionResult<Awaited<ReturnType<typeof updateConfirmedJob>>>> {
  try {
    const actor = await staffActor();
    const data = await updateConfirmedJob(actor, caseId, raw);
    return { ok: true, data };
  } catch (error) {
    return fail(error, "Unable to update job. Please try again.");
  }
}

export async function regenerateJobInvoiceAction(caseId: string) {
  try {
    const actor = await staffActor();
    const data = await regenerateJobInvoice(actor, caseId);
    return { ok: true as const, data };
  } catch (error) {
    return fail(error, "Unable to regenerate the invoice. Please try again.");
  }
}

export async function getConfirmedJobAction(id: string) {
  await staffActor();
  return getConfirmedJob(id);
}

export async function listJobsAction(filters: {
  search?: string;
  window?: ScheduleWindow;
  staffId?: string;
  closedById?: string;
  serviceId?: string;
  status?: string;
  paymentStatus?: "unpaid" | "partial" | "paid" | "all";
  source?: string;
  page?: number;
}) {
  await staffActor();
  return listJobs(filters);
}
