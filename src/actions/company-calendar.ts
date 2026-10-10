"use server";

import type { CaseStatus } from "@prisma/client";
import { getSession } from "@/lib/auth";
import {
  assignCalendarProvince,
  assignCalendarStaff,
  deleteManualCalendarEvent,
  loadCalendarHealth,
  rescheduleJob,
  saveManualCalendarEvent,
  setCalendarJobStatus,
  syncExistingJobsToCalendar,
} from "@/data-access/company-calendar";
import { actingStaffUser } from "@/data-access/job-intake";
import { isAdminAuthBypassEnabled } from "@/lib/auth/admin-bypass";
import { assertJobIntakeAccess, JobIntakeValidationError } from "@/lib/jobs/intake";
import type { ManualEventDraft, ScheduleWarning } from "@/lib/calendar/schedule";

export type CalendarActionResult =
  | { ok: true; warnings?: ScheduleWarning[]; report?: { scanned: number; already: number; added: number; unscheduled: number; errors: number } }
  | { ok: false; error: string; confirm?: ScheduleWarning[] };

async function actor() {
  const session = await getSession();
  return actingStaffUser(session?.user);
}

async function allowStaff() {
  if (isAdminAuthBypassEnabled()) return;
  const session = await getSession();
  assertJobIntakeAccess(session?.user.role);
}

async function allowAdmin() {
  if (isAdminAuthBypassEnabled()) return;
  const session = await getSession();
  if (session?.user.role !== "admin") throw new Error("Unauthorized");
}

function fail(error: unknown, fallback: string): CalendarActionResult {
  if (error instanceof JobIntakeValidationError) return { ok: false, error: error.message };
  if (error instanceof Error && error.message === "Unauthorized") return { ok: false, error: "Unauthorized" };
  if (error instanceof Error && error.message === "Job not found") return { ok: false, error: "Job not found" };
  if (error instanceof Error && error.message === "Event not found") return { ok: false, error: "Event not found" };
  if (error instanceof Error && error.message.startsWith("Invalid status transition")) {
    return { ok: false, error: "That status change is not allowed." };
  }
  console.error(fallback, error);
  return { ok: false, error: fallback };
}

export async function rescheduleJobAction(
  caseId: string,
  input: { date: string; time: string | null; timeTbd: boolean; acknowledge?: boolean }
): Promise<CalendarActionResult> {
  try {
    const user = await actor();
    const result = await rescheduleJob(user, caseId, { ...input, acknowledge: input.acknowledge === true });
    if (result.warnings.length > 0) {
      return { ok: false, error: "Scheduling conflict", confirm: result.warnings };
    }
    return { ok: true };
  } catch (error) {
    return fail(error, "Unable to reschedule job.");
  }
}

export async function assignCalendarStaffAction(caseId: string, staffId: string | null): Promise<CalendarActionResult> {
  try {
    const user = await actor();
    await assignCalendarStaff(user, caseId, staffId);
    return { ok: true };
  } catch (error) {
    return fail(error, "Unable to change staff.");
  }
}

export async function assignCalendarProvinceAction(caseId: string, province: string | null): Promise<CalendarActionResult> {
  try {
    const user = await actor();
    await assignCalendarProvince(user, caseId, province);
    return { ok: true };
  } catch (error) {
    return fail(error, "Unable to update the province.");
  }
}

export async function setCalendarJobStatusAction(caseId: string, status: CaseStatus): Promise<CalendarActionResult> {
  try {
    const user = await actor();
    await setCalendarJobStatus(user, caseId, status);
    return { ok: true };
  } catch (error) {
    return fail(error, "Unable to update the job.");
  }
}

export async function saveManualEventAction(input: ManualEventDraft): Promise<CalendarActionResult> {
  try {
    await allowStaff();
    await saveManualCalendarEvent(input);
    return { ok: true };
  } catch (error) {
    return fail(error, "Unable to save the event.");
  }
}

export async function deleteManualEventAction(id: string): Promise<CalendarActionResult> {
  try {
    await allowStaff();
    await deleteManualCalendarEvent(id);
    return { ok: true };
  } catch (error) {
    if (error instanceof Error && error.message === "Event not found") return { ok: false, error: "Event not found" };
    return fail(error, "Unable to delete the event.");
  }
}

export async function calendarHealthAction(): Promise<
  | { ok: true; health: Awaited<ReturnType<typeof loadCalendarHealth>> }
  | { ok: false; error: string }
> {
  try {
    await allowAdmin();
    return { ok: true, health: await loadCalendarHealth() };
  } catch (error) {
    const result = fail(error, "Unable to load calendar health.");
    return { ok: false, error: result.ok ? "Unable to load calendar health." : result.error };
  }
}

export async function syncCalendarAction(): Promise<CalendarActionResult> {
  try {
    await allowAdmin();
    const user = await actor();
    const report = await syncExistingJobsToCalendar(user);
    return { ok: true, report };
  } catch (error) {
    return fail(error, "Unable to sync the calendar.");
  }
}
