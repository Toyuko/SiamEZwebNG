import { Prisma, type CaseStatus, type EventType } from "@prisma/client";
import { prisma } from "@/lib/db";
import { assertCaseStatusTransition } from "@/lib/domain/case-status";
import { normalizeProvince } from "@/lib/calendar/provinces";
import {
  calendarSummary,
  eventWindow,
  filterCalendarJobs,
  isUnscheduledJob,
  MANUAL_EVENT_COLORS,
  MANUAL_EVENT_TYPES,
  manualEventWindow,
  planBackfill,
  schedulingWarnings,
  toPublicSlot,
  type CalendarFilters,
  type CalendarJobRecord,
  type ManualCalendarEvent,
  type ScheduleWarning,
} from "@/lib/calendar/schedule";
import {
  JOB_INTAKE_DEPOSIT_SOURCE,
  JobIntakeValidationError,
  caseServiceName,
  bangkokDateTime,
  displayInvoiceNumber,
  formatBangkokDate,
  formatBangkokTime,
  parseDocumentsRequired,
  staffDisplayName,
} from "@/lib/jobs/intake";
import { resolveStaffActor, syncScheduleFromCase } from "@/data-access/job-intake";

const calendarInclude = {
  user: { select: { id: true, name: true, email: true, phone: true } },
  service: { select: { id: true, name: true } },
  salesPerson: { select: { id: true, name: true, email: true } },
  staffAssignments: {
    include: { user: { select: { id: true, name: true, email: true } } },
  },
  invoices: {
    orderBy: { createdAt: "desc" as const },
    include: { payments: { select: { amount: true, status: true, metadata: true, receiptNumber: true } } },
  },
  events: { select: { id: true, primaryForCaseId: true, description: true } },
} satisfies Prisma.CaseInclude;

type CalendarRow = Prisma.CaseGetPayload<{ include: typeof calendarInclude }>;

function toRecord(row: CalendarRow): CalendarJobRecord {
  const invoice = row.invoices[0] ?? null;
  const approved = row.invoices.flatMap((item) => item.payments).filter((payment) => payment.status === "approved");
  const paid = approved.reduce((sum, payment) => sum + payment.amount, 0);
  const depositFromIntake = approved
    .filter((payment) => (payment.metadata as { source?: string } | null)?.source === JOB_INTAKE_DEPOSIT_SOURCE)
    .reduce((sum, payment) => sum + payment.amount, 0);
  const totalSatang = invoice?.amount ?? row.dealValue ?? 0;
  const depositSatang = depositFromIntake || Math.min(paid, invoice?.depositAmount ?? paid);
  const assigned = row.staffAssignments[0]?.user ?? null;
  return {
    caseId: row.id,
    caseNumber: row.caseNumber,
    customerName: row.user?.name ?? row.guestName ?? "Customer",
    customerPhone: row.user?.phone ?? row.guestPhone,
    customerEmail: row.user?.email ?? row.guestEmail,
    serviceId: row.serviceId,
    serviceName: caseServiceName(row),
    staffId: assigned?.id ?? null,
    staffName: assigned ? staffDisplayName(assigned) : "TBD",
    closedByName: row.salesPerson ? staffDisplayName(row.salesPerson) : null,
    start: row.scheduledAt?.toISOString() ?? null,
    allDay: row.scheduleTimeTbd,
    province: row.province,
    location: row.location,
    status: row.status,
    invoiceId: invoice?.id ?? null,
    invoiceNumber: invoice ? displayInvoiceNumber(invoice) : null,
    totalSatang,
    depositSatang,
    outstandingSatang: Math.max(0, totalSatang - paid),
    documents: parseDocumentsRequired(row.documentsRequired),
    description: row.jobDescription,
  };
}

const ACTIVE_UNSCHEDULED: CaseStatus[] = ["awaiting_payment", "confirmed", "in_progress", "pending_docs"];

function manualEventWhere(start: Date, end: Date, filters: CalendarFilters, searching: boolean, q: string): Prisma.EventWhereInput {
  const jobScoped = filters.provinces.length > 0 || Boolean(filters.serviceId) || (filters.status !== "" && filters.status !== "all");
  if (jobScoped) return { id: { in: [] } };
  const where: Prisma.EventWhereInput = { primaryForCaseId: null };
  if (searching) {
    where.OR = [
      { title: { contains: q, mode: "insensitive" } },
      { description: { contains: q, mode: "insensitive" } },
    ];
  } else {
    where.start = { lt: end };
    where.end = { gt: start };
  }
  if (filters.staffId === "tbd") where.staffId = null;
  else if (filters.staffId) where.staffId = filters.staffId;
  return where;
}

function toManualEvent(event: {
  id: string;
  title: string;
  description: string | null;
  start: Date;
  end: Date;
  allDay: boolean;
  type: EventType;
  color: string | null;
  staffId: string | null;
  staff: { name: string | null; email: string } | null;
}): ManualCalendarEvent {
  return {
    id: event.id,
    title: event.title,
    description: event.description,
    start: event.start.toISOString(),
    end: event.end.toISOString(),
    allDay: event.allDay,
    type: event.type,
    color: event.color,
    staffId: event.staffId,
    staffName: event.staff ? staffDisplayName(event.staff) : null,
  };
}

function rangeWhere(start: Date, end: Date, filters: CalendarFilters, searching: boolean): Prisma.CaseWhereInput {
  const where: Prisma.CaseWhereInput = searching ? { scheduledAt: { not: null } } : { scheduledAt: { gte: start, lt: end } };
  if (filters.provinces.length > 0) where.province = { in: filters.provinces };
  if (filters.staffId === "tbd") where.staffAssignments = { none: {} };
  else if (filters.staffId) where.staffAssignments = { some: { userId: filters.staffId } };
  if (filters.serviceId) where.serviceId = filters.serviceId;
  if (filters.status === "confirmed" || filters.status === "completed" || filters.status === "cancelled") {
    where.status = filters.status;
  }
  if (filters.status === "tbd") where.scheduleTimeTbd = true;
  if (filters.status === "scheduled") {
    where.scheduleTimeTbd = false;
    where.status = { notIn: ["cancelled", "completed"] };
  }
  return where;
}

export async function loadCompanyCalendar(input: {
  start: Date;
  end: Date;
  filters: CalendarFilters;
  includeHealth: boolean;
}) {
  const q = input.filters.q.trim();
  const searching = q.length >= 2;
  const where = rangeWhere(input.start, input.end, input.filters, searching);
  if (searching) {
    where.OR = [
      { guestName: { contains: q, mode: "insensitive" } },
      { guestEmail: { contains: q, mode: "insensitive" } },
      { guestPhone: { contains: q, mode: "insensitive" } },
      { id: { contains: q, mode: "insensitive" } },
      { caseNumber: { contains: q, mode: "insensitive" } },
      { location: { contains: q, mode: "insensitive" } },
      { otherServiceName: { contains: q, mode: "insensitive" } },
      { province: { contains: q, mode: "insensitive" } },
      { user: { is: { name: { contains: q, mode: "insensitive" } } } },
      { user: { is: { email: { contains: q, mode: "insensitive" } } } },
      { user: { is: { phone: { contains: q, mode: "insensitive" } } } },
      { service: { is: { name: { contains: q, mode: "insensitive" } } } },
      { invoices: { some: { invoiceNumber: { contains: q, mode: "insensitive" } } } },
    ];
  }

  const [rows, unscheduledRows, otherEvents, health] = await Promise.all([
    prisma.case.findMany({
      where,
      include: calendarInclude,
      orderBy: { scheduledAt: "asc" },
      take: searching ? 80 : 400,
    }),
    prisma.case.findMany({
      where: { scheduledAt: null, status: { in: ACTIVE_UNSCHEDULED } },
      include: calendarInclude,
      orderBy: { updatedAt: "desc" },
      take: 40,
    }),
    prisma.event.findMany({
      where: manualEventWhere(input.start, input.end, input.filters, searching, q),
      select: {
        id: true,
        title: true,
        description: true,
        start: true,
        end: true,
        allDay: true,
        type: true,
        color: true,
        staffId: true,
        staff: { select: { name: true, email: true } },
      },
      orderBy: { start: "asc" },
      take: searching ? 40 : 200,
    }),
    input.includeHealth ? calendarHealth() : Promise.resolve(null),
  ]);

  const jobs = filterCalendarJobs(rows.map(toRecord), input.filters);
  const unscheduled = unscheduledRows.map(toRecord).filter((job) => isUnscheduledJob({ scheduledAt: null, status: job.status }));
  return {
    jobs,
    unscheduled,
    events: otherEvents.map(toManualEvent),
    summary: calendarSummary(jobs),
    health,
    truncated: rows.length >= (searching ? 80 : 400),
  };
}

export async function listPublicAvailability(start: Date, end: Date) {
  const rows = await prisma.case.findMany({
    where: {
      scheduledAt: { gte: start, lt: end },
      status: { notIn: ["cancelled", "refunded", "refund_pending"] },
    },
    select: {
      scheduledAt: true,
      scheduleTimeTbd: true,
      province: true,
      status: true,
      otherServiceName: true,
      service: { select: { name: true } },
    },
    orderBy: { scheduledAt: "asc" },
    take: 500,
  });
  return rows.flatMap((row) => {
    if (!row.scheduledAt) return [];
    const slot = toPublicSlot({
      start: row.scheduledAt,
      allDay: row.scheduleTimeTbd,
      province: row.province,
      serviceName: row.service?.name ?? row.otherServiceName ?? "Service",
      status: row.status,
    });
    return slot ? [slot] : [];
  });
}

async function calendarHealth() {
  const [scheduled, linked, missing, unscheduled, duplicateGroups] = await Promise.all([
    prisma.case.count({ where: { scheduledAt: { not: null } } }),
    prisma.event.count({ where: { primaryForCaseId: { not: null } } }),
    prisma.case.count({
      where: { scheduledAt: { not: null }, events: { none: { primaryForCaseId: { not: null } } } },
    }),
    prisma.case.count({ where: { scheduledAt: null, status: { in: ACTIVE_UNSCHEDULED } } }),
    prisma.$queryRaw<Array<{ count: number }>>`
      SELECT COUNT(*)::int AS count FROM (
        SELECT case_id FROM events
        WHERE case_id IS NOT NULL AND description LIKE '%[job-intake]%'
        GROUP BY case_id
        HAVING COUNT(*) > 1
      ) duplicates
    `,
  ]);
  return {
    scheduled,
    linked,
    missing,
    duplicates: Number(duplicateGroups[0]?.count ?? 0),
    unscheduled,
  };
}

export async function syncExistingJobsToCalendar(actor: { id: string; email: string }) {
  await resolveStaffActor(actor);
  const rows = await prisma.case.findMany({
    where: {
      OR: [{ scheduledAt: { not: null } }, { scheduledAt: null, status: { in: ACTIVE_UNSCHEDULED } }],
    },
    select: {
      id: true,
      scheduledAt: true,
      events: { select: { primaryForCaseId: true, description: true } },
    },
  });
  const plan = planBackfill(
    rows.map((row) => ({
      caseId: row.id,
      scheduledAt: row.scheduledAt,
      primaryEventId:
        row.events.find((event) => event.primaryForCaseId === row.id)?.primaryForCaseId ??
        (row.events.some((event) => event.description?.includes("[job-intake]")) ? "marker" : null),
    }))
  );
  let errors = 0;
  for (const row of rows) {
    if (!row.scheduledAt) continue;
    try {
      await prisma.$transaction((tx) => syncScheduleFromCase(tx, row.id));
    } catch (error) {
      errors += 1;
      console.error("Calendar sync failed", row.id, error);
    }
  }
  return { ...plan, errors };
}

async function warningsFor(
  caseId: string,
  staffId: string | null,
  staffName: string,
  start: Date,
  allDay: boolean,
  province: string | null
): Promise<ScheduleWarning[]> {
  if (!staffId) return [];
  const windowStart = new Date(start.getTime() - 4 * 60 * 60 * 1000);
  const windowEnd = new Date(start.getTime() + 4 * 60 * 60 * 1000);
  const others = await prisma.case.findMany({
    where: {
      id: { not: caseId },
      scheduledAt: { gte: windowStart, lt: windowEnd },
      staffAssignments: { some: { userId: staffId } },
    },
    select: {
      id: true,
      guestName: true,
      province: true,
      scheduledAt: true,
      scheduleTimeTbd: true,
      status: true,
      user: { select: { name: true } },
      staffAssignments: { select: { userId: true, user: { select: { name: true } } } },
    },
  });
  const candidateWindow = eventWindow(start, allDay);
  return schedulingWarnings(
    { caseId, staffId, staffName, province, ...candidateWindow },
    others.flatMap((row) => {
      if (!row.scheduledAt) return [];
      const assigned = row.staffAssignments[0];
      const span = eventWindow(row.scheduledAt, row.scheduleTimeTbd);
      return [
        {
          caseId: row.id,
          staffId: assigned?.userId ?? null,
          staffName: assigned?.user.name ?? staffName,
          customerName: row.user?.name ?? row.guestName ?? "Customer",
          province: row.province,
          status: row.status,
          ...span,
        },
      ];
    })
  );
}

export async function rescheduleJob(
  actor: { id: string; email: string },
  caseId: string,
  input: { date: string; time: string | null; timeTbd: boolean; acknowledge: boolean }
): Promise<{ warnings: ScheduleWarning[] }> {
  const actorId = await resolveStaffActor(actor);
  const existing = await prisma.case.findUnique({
    where: { id: caseId },
    include: { staffAssignments: { include: { user: { select: { id: true, name: true, email: true } } } } },
  });
  if (!existing) throw new Error("Job not found");
  const clock = input.timeTbd ? "00:00" : input.time?.trim() || "";
  const scheduledAt = clock ? bangkokDateTime(input.date, clock) : null;
  if (!scheduledAt) {
    throw new JobIntakeValidationError("Check the highlighted fields.", { scheduledDate: "Enter a valid date and time." });
  }
  const assigned = existing.staffAssignments[0]?.user ?? null;
  if (!input.acknowledge) {
    const warnings = await warningsFor(
      caseId,
      assigned?.id ?? null,
      assigned ? staffDisplayName(assigned) : "TBD",
      scheduledAt,
      input.timeTbd,
      existing.province
    );
    if (warnings.length > 0) return { warnings };
  }
  const when = input.timeTbd ? `${formatBangkokDate(scheduledAt)}, time TBD` : `${formatBangkokDate(scheduledAt)} ${formatBangkokTime(scheduledAt)}`;
  await prisma.$transaction(async (tx) => {
    await tx.case.update({
      where: { id: caseId },
      data: { scheduledAt, scheduleTimeTbd: input.timeTbd, updatedById: actorId },
    });
    await tx.caseNote.create({
      data: { caseId, userId: actorId, content: `Rescheduled to ${when}.`, isInternal: true },
    });
    await syncScheduleFromCase(tx, caseId);
  });
  return { warnings: [] };
}

export async function assignCalendarStaff(
  actor: { id: string; email: string },
  caseId: string,
  staffId: string | null
) {
  const actorId = await resolveStaffActor(actor);
  const existing = await prisma.case.findUnique({ where: { id: caseId }, select: { id: true } });
  if (!existing) throw new Error("Job not found");
  let staffName = "TBD";
  if (staffId) {
    const staff = await prisma.user.findFirst({
      where: { id: staffId, active: true, role: { in: ["admin", "staff"] } },
      select: { id: true, name: true, email: true },
    });
    if (!staff) throw new Error("Job not found");
    staffName = staffDisplayName(staff);
  }
  await prisma.$transaction(async (tx) => {
    await tx.staffAssignment.deleteMany({ where: { caseId } });
    if (staffId) {
      await tx.staffAssignment.create({ data: { caseId, userId: staffId, role: "primary" } });
    }
    await tx.case.update({ where: { id: caseId }, data: { updatedById: actorId } });
    await tx.caseNote.create({
      data: { caseId, userId: actorId, content: `Assigned staff changed to ${staffName}.`, isInternal: true },
    });
    await syncScheduleFromCase(tx, caseId);
  });
}

export async function assignCalendarProvince(
  actor: { id: string; email: string },
  caseId: string,
  provinceRaw: string | null
) {
  const actorId = await resolveStaffActor(actor);
  const province = normalizeProvince(provinceRaw);
  if (provinceRaw?.trim() && !province) {
    throw new JobIntakeValidationError("Check the highlighted fields.", { province: "Choose a province from the list." });
  }
  const existing = await prisma.case.findUnique({ where: { id: caseId }, select: { id: true } });
  if (!existing) throw new Error("Job not found");
  await prisma.$transaction(async (tx) => {
    await tx.case.update({ where: { id: caseId }, data: { province, updatedById: actorId } });
    await tx.caseNote.create({
      data: {
        caseId,
        userId: actorId,
        content: province ? `Province set to ${province}.` : "Province cleared.",
        isInternal: true,
      },
    });
    await syncScheduleFromCase(tx, caseId);
  });
}

export async function saveManualCalendarEvent(input: {
  id?: string | null;
  title: string;
  description: string;
  date: string;
  time: string;
  endDate: string;
  endTime: string;
  allDay: boolean;
  type: string;
  color: string;
  staffId: string | null;
}) {
  const title = input.title.trim();
  if (!title) throw new JobIntakeValidationError("Enter a title.", { title: "Enter a title." });
  if (title.length > 200) throw new JobIntakeValidationError("Title is too long.", { title: "Use 200 characters or fewer." });
  if (!MANUAL_EVENT_TYPES.includes(input.type as (typeof MANUAL_EVENT_TYPES)[number])) {
    throw new JobIntakeValidationError("Choose an event type.", { type: "Choose an event type." });
  }
  const color = input.color.trim();
  if (color && !MANUAL_EVENT_COLORS.includes(color as (typeof MANUAL_EVENT_COLORS)[number])) {
    throw new JobIntakeValidationError("Choose a colour from the list.", { color: "Choose a colour from the list." });
  }
  const window = manualEventWindow({
    date: input.date,
    time: input.time,
    endDate: input.endDate,
    endTime: input.endTime,
    allDay: input.allDay,
  });
  if (!window) throw new JobIntakeValidationError("End must be after the start.", { end: "End must be after the start." });
  const description = input.description.trim();
  if (description.length > 2000) {
    throw new JobIntakeValidationError("Notes are too long.", { description: "Use 2000 characters or fewer." });
  }
  let staffId: string | null = null;
  if (input.staffId) {
    const person = await prisma.user.findFirst({
      where: { id: input.staffId, role: { in: ["admin", "staff"] }, active: true },
      select: { id: true },
    });
    if (!person) throw new JobIntakeValidationError("Choose a staff member.", { staffId: "Choose a staff member." });
    staffId = person.id;
  }
  const data = {
    title,
    description: description || null,
    start: window.start,
    end: window.end,
    allDay: input.allDay,
    type: input.type as EventType,
    color: color || null,
    staffId,
    caseId: null,
    userId: null,
  };
  if (input.id) {
    const existing = await prisma.event.findUnique({
      where: { id: input.id },
      select: { id: true, primaryForCaseId: true },
    });
    if (!existing) throw new Error("Event not found");
    if (existing.primaryForCaseId) {
      throw new JobIntakeValidationError("This time belongs to a job. Edit the job instead.", {});
    }
    return prisma.event.update({ where: { id: existing.id }, data });
  }
  return prisma.event.create({ data });
}

export async function deleteManualCalendarEvent(id: string) {
  const existing = await prisma.event.findUnique({
    where: { id },
    select: { id: true, primaryForCaseId: true },
  });
  if (!existing) throw new Error("Event not found");
  if (existing.primaryForCaseId) {
    throw new JobIntakeValidationError("This time belongs to a job. Edit the job instead.", {});
  }
  await prisma.event.delete({ where: { id: existing.id } });
}

export async function setCalendarJobStatus(
  actor: { id: string; email: string },
  caseId: string,
  status: CaseStatus
) {
  const actorId = await resolveStaffActor(actor);
  const existing = await prisma.case.findUnique({ where: { id: caseId }, select: { id: true, status: true } });
  if (!existing) throw new Error("Job not found");
  assertCaseStatusTransition(existing.status, status);
  await prisma.$transaction(async (tx) => {
    await tx.case.update({
      where: { id: caseId },
      data: {
        status,
        completedAt: status === "completed" ? new Date() : undefined,
        updatedById: actorId,
      },
    });
    await tx.caseNote.create({
      data: { caseId, userId: actorId, content: `Status changed to ${status}.`, isInternal: true },
    });
    await syncScheduleFromCase(tx, caseId);
  });
}
